'use client';
import { useState, useEffect, useRef, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import { useRecorder } from '@/hooks/useRecorder';
import { useTTS } from '@/hooks/useTTS';
import styles from './page.module.css';

interface MessageItem {
  role: 'interviewer' | 'candidate';
  content: string;
}

/** Detect whether a message contains a fenced code block or looks like code */
function containsCode(text: string): boolean {
  if (/```/.test(text)) return true;
  // Heuristic: multiple lines with leading whitespace that look like code
  const lines = text.split('\n');
  if (lines.length >= 3) {
    const indented = lines.filter((l) => /^[ \t]{2,}/.test(l));
    if (indented.length >= 2) return true;
  }
  return false;
}

/** Render message content, formatting code blocks with syntax highlighting */
function renderContent(text: string) {
  // Split on fenced code blocks (```...```)
  const parts = text.split(/(```[\s\S]*?```)/g);
  if (parts.length === 1 && !text.startsWith('```')) {
    // No fenced blocks — check if the whole thing looks like code
    if (containsCode(text)) {
      return <pre className={styles.codeBlock}><code>{text}</code></pre>;
    }
    return <span style={{ whiteSpace: 'pre-wrap' }}>{text}</span>;
  }

  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('```') && part.endsWith('```')) {
          // Extract language hint and code body
          const inner = part.slice(3, -3);
          const newlineIdx = inner.indexOf('\n');
          const code = newlineIdx >= 0 ? inner.slice(newlineIdx + 1) : inner;
          return (
            <pre key={i} className={styles.codeBlock}>
              <code>{code}</code>
            </pre>
          );
        }
        if (!part.trim()) return null;
        return <span key={i} style={{ whiteSpace: 'pre-wrap' }}>{part}</span>;
      })}
    </>
  );
}

export default function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const [reportReady, setReportReady] = useState(false);
  const [sessionMeta, setSessionMeta] = useState<{
    interviewType: string;
    difficulty: string;
    role: string;
    questionCount: number;
    maxQuestions: number;
  } | null>(null);
  const [initError, setInitError] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const { isRecording, startRecording, stopRecording, error: micError } = useRecorder();
  const { enabled: ttsEnabled, isSpeaking, toggle: toggleTTS, speak } = useTTS();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevMsgCountRef = useRef(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Fetch session on mount
  useEffect(() => {
    async function fetchSession() {
      try {
        const res = await fetch(`/api/sessions/${id}`);
        if (!res.ok) throw new Error('Session not found');
        const data = await res.json();
        setMessages(data.messages.map((m: MessageItem) => ({ role: m.role, content: m.content })));
        setSessionMeta({
          interviewType: data.interviewType,
          difficulty: data.difficulty,
          role: data.role,
          questionCount: data.questionCount,
          maxQuestions: data.maxQuestions,
        });
        if (data.status === 'completed') {
          setIsComplete(true);
          // Check if report is already generated
          fetch(`/api/sessions/${id}/report`)
            .then((r) => { if (r.ok) setReportReady(true); })
            .catch(() => {});
        }
      } catch {
        setInitError('Session not found. It may have expired.');
      }
    }
    fetchSession();
  }, [id]);

  // Speak new interviewer messages via TTS
  useEffect(() => {
    if (messages.length > prevMsgCountRef.current) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg.role === 'interviewer') {
        speak(lastMsg.content, `msg-${messages.length - 1}`);
      }
    }
    prevMsgCountRef.current = messages.length;
  }, [messages, speak]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
    }
  }, [input]);

  const submitAnswer = useCallback(async (text: string) => {
    if (!text.trim() || isLoading || isComplete || isEnding) return;
    setIsLoading(true);
    setMessages((prev) => [...prev, { role: 'candidate', content: text }]);
    setInput('');

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch(`/api/sessions/${id}/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
        signal: controller.signal,
      });
      const data = await res.json();

      if (controller.signal.aborted) return;

      if (data.isComplete) {
        // Show closing message from interviewer
        if (data.nextQuestion) {
          setMessages((prev) => [...prev, { role: 'interviewer', content: data.nextQuestion }]);
        }
        setIsComplete(true);
        // Trigger report generation — mark reportReady when done
        fetch(`/api/sessions/${id}/end`, { method: 'POST' })
          .then((r) => { if (r.ok) setReportReady(true); })
          .catch(() => {});
      } else if (data.nextQuestion) {
        setMessages((prev) => [...prev, { role: 'interviewer', content: data.nextQuestion }]);
      }

      if (sessionMeta) {
        setSessionMeta({ ...sessionMeta, questionCount: data.questionNumber || sessionMeta.questionCount });
      }
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setMessages((prev) => [
        ...prev,
        { role: 'interviewer', content: 'Sorry, something went wrong. Could you repeat that?' },
      ]);
    }
    abortRef.current = null;
    setIsLoading(false);
  }, [id, isLoading, isComplete, isEnding, sessionMeta]);

  const handleVoice = async () => {
    if (isRecording) {
      setIsTranscribing(true);
      try {
        const blob = await stopRecording();
        const formData = new FormData();
        formData.append('audio', blob, 'recording.webm');
        // Pass session context for Supermemory multimodal extractor upload
        const userName = typeof window !== 'undefined' ? localStorage.getItem('userName') : null;
        if (userName) formData.append('userName', userName);
        formData.append('sessionId', id);

        const res = await fetch('/api/transcribe', { method: 'POST', body: formData });
        const { text } = await res.json();
        setIsTranscribing(false);

        // Append transcribed voice text to existing input — do NOT auto-submit.
        // The user must explicitly press Send to submit all input together.
        if (text) {
          setInput((prev) => (prev ? prev + '\n' + text : text));
        }
      } catch {
        setIsTranscribing(false);
      }
    } else {
      await startRecording();
    }
  };

  const handleEndEarly = async () => {
    // Immediately abort any in-flight AI request
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }

    setIsEnding(true);
    setIsLoading(false);

    try {
      const res = await fetch(`/api/sessions/${id}/end`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ earlyExit: true }),
      });
      const data = await res.json();
      setIsComplete(true);
      // Redirect to report if available, otherwise dashboard
      if (data.report) {
        router.push(`/report/${id}`);
      } else {
        router.push('/new');
      }
    } catch {
      // On failure, redirect to dashboard
      router.push('/new');
    }
    setIsEnding(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Cmd/Ctrl + Enter → submit
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      submitAnswer(input);
      return;
    }
    // Tab → insert 2-space indentation instead of changing focus
    if (e.key === 'Tab') {
      e.preventDefault();
      const ta = e.currentTarget;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const newValue = input.substring(0, start) + '  ' + input.substring(end);
      setInput(newValue);
      // Restore cursor position after state update
      requestAnimationFrame(() => {
        ta.selectionStart = ta.selectionEnd = start + 2;
      });
      return;
    }
    // Plain Enter → newline (default textarea behavior, no preventDefault needed)
  };

  if (initError) {
    return (
      <div className={styles.loading}>
        <div>
          <p>{initError}</p>
          <button className={styles.sendButton} onClick={() => router.push('/new')} style={{ marginTop: '1rem' }}>
            Start New Session
          </button>
        </div>
      </div>
    );
  }

  if (!sessionMeta) {
    return <div className={styles.loading}>Loading session...</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerInfo}>
          <h2>Mock Interview</h2>
          <div className={styles.headerMeta}>
            <span className={styles.tag}>{sessionMeta.interviewType.toUpperCase()}</span>
            <span className={styles.tag}>{sessionMeta.difficulty}</span>
            <span className={styles.tag}>{sessionMeta.role}</span>
            <span>Q {sessionMeta.questionCount}/{sessionMeta.maxQuestions}</span>
          </div>
        </div>
        <div className={styles.headerActions}>
          {!isComplete && (
            <button
              className={`${styles.ttsToggle} ${ttsEnabled ? styles.ttsOn : ''}`}
              onClick={toggleTTS}
              title={ttsEnabled ? 'Disable voice' : 'Enable voice'}
            >
              {ttsEnabled ? '🔊' : '🔇'}
            </button>
          )}
          {!isComplete && (
            <button className={styles.endButton} onClick={handleEndEarly} disabled={isEnding}>
              {isEnding ? 'Ending...' : 'End Interview'}
            </button>
          )}
        </div>
      </div>

      <div className={styles.messages}>
        {messages.map((msg, i) => (
          <div key={i} className={`${styles.message} ${styles[msg.role]}`}>
            {renderContent(msg.content)}
          </div>
        ))}
        {/* Only show thinking indicator while interview is active */}
        {!isComplete && !isEnding && (isLoading || isTranscribing) && (
          <div className={`${styles.message} ${styles.thinking}`}>
            {isTranscribing ? 'Transcribing...' : 'Thinking...'}
          </div>
        )}
        {isSpeaking && (
          <div className={`${styles.message} ${styles.speaking}`}>
            Speaking...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {isComplete ? (
        <div className={styles.completeBanner}>
          <p>Interview complete!</p>
          {reportReady ? (
            <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <a href={`/report/${id}`} className={styles.reportLink}>
                View Report
              </a>
              <a href="/progress" className={styles.reportLink} style={{ background: 'var(--bg-card)', color: 'var(--text)', border: '1px solid var(--border)' }}>
                Progress
              </a>
              <a href="/new?reset=1" className={styles.reportLink} style={{ background: 'var(--bg-card)', color: 'var(--text)', border: '1px solid var(--border)' }}>
                New Session
              </a>
            </div>
          ) : (
            <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>
              Generating report...
            </p>
          )}
        </div>
      ) : (
        <div className={styles.inputArea}>
          <button
            className={`${styles.micButton} ${isRecording ? styles.micRecording : ''}`}
            onClick={handleVoice}
            disabled={isLoading || isTranscribing || isEnding || isSpeaking}
            title={isRecording ? 'Stop recording' : 'Start recording'}
          >
            {isRecording ? '⏹' : '🎤'}
          </button>
          <textarea
            ref={textareaRef}
            className={styles.textArea}
            placeholder={micError || 'Type your answer... (Cmd+Enter to send)'}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading || isRecording || isTranscribing || isEnding || isSpeaking}
            rows={1}
          />
          <button
            className={styles.sendButton}
            onClick={() => submitAnswer(input)}
            disabled={isLoading || isRecording || isTranscribing || isEnding || isSpeaking || !input.trim()}
          >
            Send
          </button>
        </div>
      )}
    </div>
  );
}
