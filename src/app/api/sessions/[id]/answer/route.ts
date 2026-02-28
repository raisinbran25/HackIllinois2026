import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/store';
import { evaluateAnswer, generateQuestion } from '@/lib/interviewer';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = store.getSession(id);
    if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    if (session.status !== 'active') return NextResponse.json({ error: 'Session ended' }, { status: 400 });

    const { text } = await req.json();
    if (!text) return NextResponse.json({ error: 'No answer text' }, { status: 400 });

    // 1. Record candidate message
    session.messages.push({
      role: 'candidate',
      content: text,
      timestamp: Date.now(),
    });

    // 2. Get last interviewer question
    const lastQuestion = [...session.messages]
      .reverse()
      .find((m) => m.role === 'interviewer')?.content || '';

    // 3. Evaluate silently (scores are never shown during the interview)
    const { scores, shouldFollowUp } = await evaluateAnswer(session, lastQuestion, text);
    session.messages[session.messages.length - 1].skillScores = scores;

    // 4. Decide next action
    let isComplete = false;
    if (session.questionCount >= session.maxQuestions) {
      // Interview is over — add a clear closing statement
      const closingMessage = 'Thank you. That concludes the interview.';
      session.messages.push({
        role: 'interviewer',
        content: closingMessage,
        timestamp: Date.now(),
      });
      isComplete = true;
    } else {
      // Advance phase if not following up
      if (!shouldFollowUp && session.phaseIndex < session.phases.length - 1) {
        session.phaseIndex++;
        session.phase = session.phases[session.phaseIndex];
      }

      // Generate next question
      const nextQuestion = await generateQuestion(session);
      session.messages.push({
        role: 'interviewer',
        content: nextQuestion,
        timestamp: Date.now(),
      });
      session.questionCount++;
    }

    store.setSession(session.id, session);

    // Return the latest interviewer message; never expose scores mid-interview
    return NextResponse.json({
      nextQuestion: session.messages[session.messages.length - 1].content,
      isComplete,
      phase: session.phase,
      questionNumber: session.questionCount,
      maxQuestions: session.maxQuestions,
    });
  } catch (err) {
    console.error('Answer processing failed:', err);
    return NextResponse.json({ error: 'Failed to process answer' }, { status: 500 });
  }
}
