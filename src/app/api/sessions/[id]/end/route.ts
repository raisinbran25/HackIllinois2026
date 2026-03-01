import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/store';
import { getOpenAI } from '@/lib/openai';
import { reportPrompt } from '@/lib/prompts';
import { getWeaknessProfile, storeWeaknessProfile, storeSessionReport, updateWeaknessProfile, storeCategoryRecord } from '@/lib/adaptation';
import { SessionReport, SkillScore, CategoryRecord } from '@/lib/types';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = store.getSession(id);
    if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });

    // Don't re-generate if already completed
    const existingReport = store.getReport(id);
    if (existingReport) return NextResponse.json({ report: existingReport });

    // Detect early exit — user clicked End Session before interview concluded naturally
    let earlyExit = false;
    try {
      const body = await req.json();
      earlyExit = body.earlyExit === true;
    } catch {
      // No body or invalid JSON — treat as normal end
    }

    session.status = 'completed';

    // Collect all skill scores from candidate messages
    const allScores: SkillScore[] = session.messages
      .filter((m) => m.skillScores)
      .flatMap((m) => m.skillScores!);

    // Generate report via GPT
    const openai = getOpenAI();
    const response = await openai.chat.completions.create({
      model: 'gpt-5.2',
      messages: [{ role: 'user', content: reportPrompt(session.config, session.messages, allScores, session.config.categoryHistory) }],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    });

    const reportData = JSON.parse(response.choices[0].message.content!);
    const report: SessionReport = {
      sessionId: session.id,
      userName: session.config.userName,
      role: session.config.role,
      interviewType: session.config.interviewType,
      questionCategory: session.config.questionCategory,
      overallScore: reportData.overallScore,
      skillScores: reportData.skillScores || [],
      strengths: reportData.strengths || [],
      weaknesses: reportData.weaknesses || [],
      drills: reportData.drills || [],
      summary: reportData.summary || '',
      createdAt: Date.now(),
    };

    store.setReport(session.id, report);
    store.setSession(session.id, session);

    // Extract interviewer questions for the repetition guard
    const interviewerQuestions = session.messages
      .filter((m) => m.role === 'interviewer')
      .map((m) => m.content);

    // Store in Supermemory (non-blocking, wrapped in try-catch)
    // CRITICAL: If user exited early, do NOT update the weakness profile
    // to prevent partial data from affecting long-term scoring and adaptive question selection
    try {
      // Always store the session report for reference, including questions for repetition guard
      const reportWithQuestions = { ...report, questions: interviewerQuestions };
      await storeSessionReport(session.config.userName, JSON.stringify(reportWithQuestions));

      if (!earlyExit) {
        // Only update weakness profile on natural (complete) interview endings
        const avgScores: Record<string, number> = {};
        for (const s of report.skillScores) {
          avgScores[s.skill] = s.score;
        }
        const existingProfile = await getWeaknessProfile(session.config.userName);
        const updatedProfile = updateWeaknessProfile(existingProfile, session.config.userName, avgScores);
        await storeWeaknessProfile(session.config.userName, updatedProfile);

        // Store category record — LOCAL store is primary source for stats + adaptive logic
        if (session.config.questionCategory) {
          const localHistory = store.getCategoryHistory(session.config.userName);
          const sameCategory = localHistory.filter((r) => r.category === session.config.questionCategory);
          const lastSameCategory = sameCategory.length > 0 ? sameCategory[sameCategory.length - 1] : null;

          const categoryRecord: CategoryRecord = {
            category: session.config.questionCategory,
            score: report.overallScore,
            completed: report.overallScore >= 7.5,
            interviewNumber: localHistory.length + 1,
            mistakes: report.weaknesses,
            strengths: report.strengths,
            weaknesses: report.weaknesses,
            timestamp: Date.now(),
            improvementDelta: lastSameCategory ? report.overallScore - lastSameCategory.score : undefined,
          };
          // Store locally (primary — drives stats + adaptive logic)
          store.addCategoryRecord(session.config.userName, categoryRecord);
          // Also store in Supermemory (for cross-interview feedback in future reports)
          await storeCategoryRecord(session.config.userName, categoryRecord);
        }
      }
    } catch (memErr) {
      console.error('Supermemory storage failed (non-critical):', memErr);
    }

    return NextResponse.json({ report });
  } catch (err) {
    console.error('End session failed:', err);
    return NextResponse.json({ error: 'Failed to end session' }, { status: 500 });
  }
}
