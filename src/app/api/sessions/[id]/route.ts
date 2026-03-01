import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/store';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = store.getSession(id);
  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  return NextResponse.json({
    id: session.id,
    interviewType: session.config.interviewType,
    difficulty: session.config.difficulty,
    role: session.config.role,
    company: session.config.company,
    messages: session.messages,
    questionCount: session.candidateMessageCount || 0,
    maxQuestions: session.maxQuestions,
    phase: session.phase,
    status: session.status,
  });
}
