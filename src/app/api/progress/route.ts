import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/store';
import { getWeaknessProfile } from '@/lib/adaptation';

export async function GET(req: NextRequest) {
  const userName = req.nextUrl.searchParams.get('user');
  if (!userName) return NextResponse.json({ error: 'Missing user' }, { status: 400 });

  const reports = store.getReportsByUser(userName);
  const profile = await getWeaknessProfile(userName);

  // Use LOCAL category history (not Supermemory) for live statistics
  const categoryHistory = store.getCategoryHistory(userName);

  // Compute category statistics from local data
  const categoryStats: Record<string, { scores: number[]; completed: boolean; latestScore: number; mistakes: string[]; strengths: string[]; weaknesses: string[] }> = {};
  for (const record of categoryHistory) {
    if (!categoryStats[record.category]) {
      categoryStats[record.category] = { scores: [], completed: false, latestScore: 0, mistakes: [], strengths: [], weaknesses: [] };
    }
    categoryStats[record.category].scores.push(record.score);
    categoryStats[record.category].latestScore = record.score;
    if (record.completed) categoryStats[record.category].completed = true;
    if (record.mistakes) categoryStats[record.category].mistakes.push(...record.mistakes);
    if (record.strengths) categoryStats[record.category].strengths.push(...record.strengths);
    if (record.weaknesses) categoryStats[record.category].weaknesses.push(...record.weaknesses);
  }

  // Compute overall average score from local data
  const allScores = categoryHistory.map((r) => r.score);
  const overallAvg = allScores.length > 0
    ? Math.round((allScores.reduce((a, b) => a + b, 0) / allScores.length) * 10) / 10
    : 0;

  // Find most improved category
  let mostImproved = '';
  let bestDelta = -Infinity;
  for (const [cat, stats] of Object.entries(categoryStats)) {
    if (stats.scores.length >= 2) {
      const delta = stats.scores[stats.scores.length - 1] - stats.scores[0];
      if (delta > bestDelta) {
        bestDelta = delta;
        mostImproved = cat;
      }
    }
  }

  // Count repeated mistakes (appear 2+ times)
  const mistakeCounts: Record<string, number> = {};
  for (const record of categoryHistory) {
    if (record.weaknesses) {
      for (const w of record.weaknesses) {
        mistakeCounts[w] = (mistakeCounts[w] || 0) + 1;
      }
    }
  }
  const repeatedMistakes = Object.entries(mistakeCounts)
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .map(([mistake, count]) => ({ mistake, count }));

  // Completed categories: completed flag is true
  const completedCategories = Object.entries(categoryStats)
    .filter(([, s]) => s.completed)
    .map(([cat]) => cat);

  // In-progress categories: latest score < 7.5 and not yet completed
  const inProgressCategories = Object.entries(categoryStats)
    .filter(([, s]) => !s.completed && s.latestScore < 7.5)
    .map(([cat]) => cat);

  const data = {
    userName,
    sessions: reports.map((r) => ({
      sessionId: r.sessionId,
      role: r.role,
      interviewType: r.interviewType,
      overallScore: r.overallScore,
      date: r.createdAt,
    })),
    skillTrends: profile?.historicalScores || {},
    categoryHistory,
    categoryStats,
    overallAvg,
    mostImproved: mostImproved || null,
    mostImprovedDelta: bestDelta > -Infinity ? bestDelta : null,
    repeatedMistakes,
    totalInterviews: categoryHistory.length,
    completedCategories,
    inProgressCategories,
  };

  return NextResponse.json(data);
}
