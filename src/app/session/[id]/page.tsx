'use client';
import { useState, useEffect, useRef, use } from 'react';
import { useRouter } from 'next/navigation';
import { useRecorder } from '@/hooks/useRecorder';
import styles from './page.module.css';

interface MessageItem {
  role: 'interviewer' | 'candidate';
  content: string;
}

export default function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
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
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
        if (data.status === 'completed') setIsComplete(true);
      } catch {
        setInitError('Session not found. It may have expired.');
      }
    }
    fetchSession();
  }, [id]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const submitAnswer = async (text: string) => {
    if (!text.trim() || isLoading || isComplete) return;
    setIsLoading(true);
    setMessages((prev) => [...prev, { role: 'candidate', content: text.trim() }]);
    setInput('');

    try {
      const res = await fetch(`/api/sessions/${id}/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.trim() }),
      });
      const data = await res.json();

      if (data.isComplete) {
        setIsComplete(true);
        // Auto-end session to generate report
        await fetch(`/api/sessions/${id}/end`, { method: 'POST' });
      } else if (data.nextQuestion) {
        setMessages((prev) => [...prev, { role: 'interviewer', content: data.nextQuestion }]);
      }

      if (sessionMeta) {
        setSessionMeta({ ...sessionMeta, questionCount: data.questionNumber || sessionMeta.questionCount });
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'interviewer', content: 'Sorry, something went wrong. Could you repeat that?' },
      ]);
    }
    setIsLoading(false);
  };

  const handleVoice = async () => {
    if (isRecording) {
      // Stop recording and transcribe
      setIsTranscribing(true);
      try {
        const blob = await stopRecording();
        const formData = new FormData();
        formData.append('audio', blob, 'recording.webm');

        const res = await fetch('/api/transcribe', { method: 'POST', body: formData });
        const { text } = await res.json();
        setIsTranscribing(false);

        if (text) await submitAnswer(text);
      } catch {
        setIsTranscribing(false);
      }
    } else {
      await startRecording();
    }
  };

  const handleEndEarly = async () => {
    setIsLoading(true);
    try {
      await fetch(`/api/sessions/${id}/end`, { method: 'POST' });
      setIsComplete(true);
    } catch {
      // ignore
    }
    setIsLoading(false);
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
        {!isComplete && (
          <button className={styles.endButton} onClick={handleEndEarly} disabled={isLoading}>
            End Interview
          </button>
        )}
      </div>

      <div className={styles.messages}>
        {messages.map((msg, i) => (
          <div key={i} className={`${styles.message} ${styles[msg.role]}`}>
            {msg.content}
          </div>
        ))}
        {(isLoading || isTranscribing) && (
          <div className={`${styles.message} ${styles.thinking}`}>
            {isTranscribing ? 'Transcribing...' : 'Thinking...'}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {isComplete ? (
        <div className={styles.completeBanner}>
          <p>Interview complete!</p>
          <a href={`/report/${id}`} className={styles.reportLink}>
            View Report
          </a>
        </div>
      ) : (
        <div className={styles.inputArea}>
          <button
            className={`${styles.micButton} ${isRecording ? styles.micRecording : ''}`}
            onClick={handleVoice}
            disabled={isLoading || isTranscribing}
            title={isRecording ? 'Stop recording' : 'Start recording'}
          >
            {isRecording ? '⏹' : '🎤'}
          </button>
          <input
            className={styles.textInput}
            type="text"
            placeholder={micError || 'Type your answer...'}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submitAnswer(input)}
            disabled={isLoading || isRecording || isTranscribing}
          />
          <button
            className={styles.sendButton}
            onClick={() => submitAnswer(input)}
            disabled={isLoading || isRecording || isTranscribing || !input.trim()}
          >
            Send
          </button>
        </div>
      )}
    </div>
  );
}
