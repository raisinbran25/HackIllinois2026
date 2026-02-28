import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/store';
import { getWeaknessProfile } from '@/lib/adaptation';
import { ProgressData } from '@/lib/types';

export async function GET(req: NextRequest) {
  const userName = req.nextUrl.searchParams.get('user');
  if (!userName) return NextResponse.json({ error: 'Missing user' }, { status: 400 });

  const reports = store.getReportsByUser(userName);
  const profile = await getWeaknessProfile(userName);

  const data: ProgressData = {
    userName,
    sessions: reports.map((r) => ({
      sessionId: r.sessionId,
      role: r.role,
      interviewType: r.interviewType,
      overallScore: r.overallScore,
      date: r.createdAt,
    })),
    skillTrends: profile?.historicalScores || {},
  };

  return NextResponse.json(data);
}
