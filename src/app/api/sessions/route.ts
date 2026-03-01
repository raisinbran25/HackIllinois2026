import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { classifyInterview } from '@/lib/classifier';
import { generateQuestion } from '@/lib/interviewer';
import { getWeaknessProfile, buildFocusPlan, getPastInterviewInsights, getPastQuestions, selectNextCategory } from '@/lib/adaptation';
import { store } from '@/lib/store';
import { Session } from '@/lib/types';
import { INTERVIEW_PHASES, MAX_QUESTIONS, TECHNICAL_PHASES } from '@/lib/constants';

export async function POST(req: NextRequest) {
  try {
    const { userName, role, company, jobDescription } = await req.json();

    if (!userName || !role || !jobDescription) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 1. Classify interview type
    const classification = await classifyInterview(role, company, jobDescription);

    // 2. Retrieve weakness profile, build focus plan, fetch past insights + past questions
    const [profile, pastInsights, pastQuestions] = await Promise.all([
      getWeaknessProfile(userName),
      getPastInterviewInsights(userName),
      getPastQuestions(userName),
    ]);
    const focusPlan = buildFocusPlan(profile);

    // 2b. Use LOCAL category history for adaptive category selection (not Supermemory)
    const categoryHistory = store.getCategoryHistory(userName);
    const questionCategory = selectNextCategory(classification.interviewType, categoryHistory);

    // Determine if this is a retry (same category, failed last time) — make it easier
    const isRetry = categoryHistory.length > 0 &&
      categoryHistory[categoryHistory.length - 1].score < 7.5 &&
      categoryHistory[categoryHistory.length - 1].category === questionCategory;

    // Override difficulty if adaptation has data
    const difficulty = focusPlan.weaknesses.length > 0 ? focusPlan.difficulty : classification.difficulty;

    // 3. Build session
    const phases = INTERVIEW_PHASES[classification.interviewType];
    const session: Session = {
      id: uuidv4(),
      config: {
        userName,
        role,
        company,
        jobDescription,
        interviewType: classification.interviewType,
        difficulty,
        focusPlan: focusPlan.weaknesses.length > 0 ? focusPlan : undefined,
        pastInsights: pastInsights.length > 0 ? pastInsights : undefined,
        pastQuestions: pastQuestions.length > 0 ? pastQuestions : undefined,
        questionCategory,
        categoryHistory: categoryHistory.length > 0 ? categoryHistory : undefined,
        isRetry,
      },
      messages: [],
      questionCount: 0,
      maxQuestions: MAX_QUESTIONS,
      phase: phases[0],
      phases,
      phaseIndex: 0,
      status: 'active',
      createdAt: Date.now(),
      technicalQuestionAsked: false,
      candidateMessageCount: 0,
    };

    // 4. Generate first question
    const firstQuestion = await generateQuestion(session);
    session.messages.push({
      role: 'interviewer',
      content: firstQuestion,
      timestamp: Date.now(),
    });
    session.questionCount = 1;
    // Mark technical question as asked if the first phase is technical
    if (TECHNICAL_PHASES.has(phases[0])) {
      session.technicalQuestionAsked = true;
    }

    // 5. Store
    store.setSession(session.id, session);

    return NextResponse.json({
      sessionId: session.id,
      interviewType: classification.interviewType,
      difficulty: classification.difficulty,
      reasoning: classification.reasoning,
      firstQuestion,
    });
  } catch (err) {
    console.error('Session creation failed:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: `Failed to create session: ${message}` }, { status: 500 });
  }
}
