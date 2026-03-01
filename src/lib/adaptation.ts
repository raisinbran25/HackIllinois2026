import { getSupermemory } from './supermemory';
import { WeaknessProfile, FocusPlan, Skill, Difficulty, SkillAggregate, CategoryRecord, QuestionCategory, InterviewType } from './types';
import { ALL_SKILLS, CATEGORIES_BY_TYPE } from './constants';

/**
 * Score Aggregation: Bayesian Shrinkage with Recency Weighting
 *
 * Why this approach:
 * - Early sessions have high variance. A single bad score shouldn't define
 *   a skill permanently. We shrink early estimates toward a neutral prior (5.0)
 *   proportional to how few observations we have.
 * - As sessions accumulate, confidence grows and the prior's influence fades,
 *   letting the empirical data dominate.
 * - Recent scores are weighted more heavily via exponential decay (lambda=0.7),
 *   so genuine improvement is visible quickly, while a single outlier can't
 *   cause extreme volatility since older observations still contribute.
 * - Confidence is modeled as c = n / (n + k) where k=3, giving meaningful
 *   confidence growth: 1 session = 25%, 3 sessions = 50%, 6 sessions = 67%.
 *
 * Formula:
 *   weighted_mean = sum(score_i * w_i) / sum(w_i)
 *     where w_i = lambda^(n - i - 1)   (most recent has weight 1.0)
 *   confidence = n / (n + k)
 *   final_score = confidence * weighted_mean + (1 - confidence) * prior
 */

const PRIOR_SCORE = 5.0;
const CONFIDENCE_K = 3;
const DECAY_LAMBDA = 0.7;
const MAX_RECENT_SCORES = 10;

function computeAggregate(existing: SkillAggregate | undefined, newScore: number): SkillAggregate {
  const prev = existing || { weightedScore: PRIOR_SCORE, confidence: 0, observationCount: 0, recentScores: [] };

  const recentScores = [...prev.recentScores, newScore].slice(-MAX_RECENT_SCORES);
  const n = prev.observationCount + 1;

  // Exponentially weighted mean across recent scores
  let weightSum = 0;
  let valueSum = 0;
  for (let i = 0; i < recentScores.length; i++) {
    const age = recentScores.length - 1 - i;
    const weight = Math.pow(DECAY_LAMBDA, age);
    weightSum += weight;
    valueSum += recentScores[i] * weight;
  }
  const weightedMean = valueSum / weightSum;

  // Confidence: c = n / (n + k)
  const confidence = n / (n + CONFIDENCE_K);

  // Bayesian shrinkage: blend weighted mean with prior
  const weightedScore = Math.round((confidence * weightedMean + (1 - confidence) * PRIOR_SCORE) * 10) / 10;

  return { weightedScore, confidence: Math.round(confidence * 100) / 100, observationCount: n, recentScores };
}

export async function getWeaknessProfile(userName: string): Promise<WeaknessProfile | null> {
  try {
    const client = getSupermemory();
    const results = await client.search.execute({
      q: 'weakness profile',
      containerTags: [`user_${userName}`],
      filters: {
        AND: [{ key: 'type', value: 'weakness_profile' }],
      },
    });

    if (results.results && results.results.length > 0) {
      const content = results.results[0].content;
      if (content) return JSON.parse(content) as WeaknessProfile;
    }
    return null;
  } catch (err) {
    console.error('Failed to get weakness profile from Supermemory:', err);
    return null;
  }
}

export async function storeWeaknessProfile(userName: string, profile: WeaknessProfile): Promise<void> {
  try {
    const client = getSupermemory();
    await client.add({
      content: JSON.stringify(profile),
      containerTags: [`user_${userName}`],
      metadata: {
        type: 'weakness_profile',
        userName,
        updatedAt: String(Date.now()),
      },
    });
  } catch (err) {
    console.error('Failed to store weakness profile in Supermemory:', err);
  }
}

export async function storeSessionReport(userName: string, reportJson: string): Promise<void> {
  try {
    const client = getSupermemory();
    await client.add({
      content: reportJson,
      containerTags: [`user_${userName}`],
      metadata: {
        type: 'session_report',
        userName,
        createdAt: String(Date.now()),
      },
    });
  } catch (err) {
    console.error('Failed to store session report in Supermemory:', err);
  }
}

export function buildFocusPlan(profile: WeaknessProfile | null): FocusPlan {
  const defaultPlan: FocusPlan = {
    weaknesses: [],
    strengths: [],
    neutral: ALL_SKILLS,
    difficulty: 'easy',
  };

  if (!profile || profile.sessionCount === 0) return defaultPlan;

  const sorted = Object.entries(profile.aggregates)
    .filter(([, agg]) => agg !== undefined)
    .sort(([, a], [, b]) => (a as SkillAggregate).weightedScore - (b as SkillAggregate).weightedScore);

  const weaknesses = sorted.slice(0, 2).map(([skill]) => skill as Skill);
  const strengths = sorted.slice(-2).map(([skill]) => skill as Skill);
  const weakAndStrongSet = new Set([...weaknesses, ...strengths]);
  const neutral = ALL_SKILLS.filter((s) => !weakAndStrongSet.has(s));

  const allAggregates = Object.values(profile.aggregates).filter((v) => v !== undefined) as SkillAggregate[];
  const overallAvg = allAggregates.length > 0
    ? allAggregates.reduce((sum, a) => sum + a.weightedScore, 0) / allAggregates.length
    : 5;

  let difficulty: Difficulty = 'easy';
  if (overallAvg > 8) difficulty = 'hard';
  else if (overallAvg > 7) difficulty = 'medium';

  return { weaknesses, strengths, neutral, difficulty };
}

/**
 * Retrieve past interview insights from Supermemory.
 * Searches stored session reports to identify areas where the candidate
 * struggled in previous interviews. This data is used augmentatively
 * to ask more targeted follow-up questions in future interviews.
 */
export async function getPastInterviewInsights(userName: string): Promise<string[]> {
  try {
    const client = getSupermemory();
    const results = await client.search.execute({
      q: 'interview weaknesses struggles areas for improvement',
      containerTags: [`user_${userName}`],
      filters: {
        AND: [{ key: 'type', value: 'session_report' }],
      },
    });

    const insights: string[] = [];
    if (results.results) {
      for (const result of results.results.slice(0, 5)) {
        try {
          const report = JSON.parse(result.content ?? '');
          if (report.weaknesses && Array.isArray(report.weaknesses)) {
            insights.push(...report.weaknesses);
          }
        } catch {
          // Skip unparseable results
        }
      }
    }
    return insights;
  } catch (err) {
    console.error('Failed to retrieve past interview insights:', err);
    return [];
  }
}

/**
 * Upload audio recording to Supermemory via the multimodal extractor.
 * Supermemory will automatically transcribe and extract insights from the
 * audio, making them available for future semantic search.
 * No raw transcript is stored — only the extracted structured insights.
 */
export async function uploadInterviewAudio(
  userName: string,
  audioBlob: Blob,
  sessionId: string
): Promise<void> {
  try {
    const client = getSupermemory();
    const file = new File([audioBlob], `interview_${sessionId}.webm`, { type: audioBlob.type });
    await client.documents.uploadFile({
      file,
      containerTags: `user_${userName}`,
      mimeType: audioBlob.type || 'audio/webm',
    });
  } catch (err) {
    console.error('Failed to upload interview audio to Supermemory:', err);
  }
}

/**
 * Retrieve past interview questions from stored session reports.
 * Used to prevent exact question repetition across interviews.
 */
export async function getPastQuestions(userName: string): Promise<string[]> {
  try {
    const client = getSupermemory();
    const results = await client.search.execute({
      q: 'interview questions asked',
      containerTags: [`user_${userName}`],
      filters: {
        AND: [{ key: 'type', value: 'session_report' }],
      },
    });

    const questions: string[] = [];
    if (results.results) {
      for (const result of results.results.slice(0, 10)) {
        try {
          const report = JSON.parse(result.content ?? '');
          // Extract interviewer questions from the stored report content
          if (report.questions && Array.isArray(report.questions)) {
            questions.push(...report.questions);
          }
        } catch {
          // Skip unparseable results
        }
      }
    }
    return questions;
  } catch (err) {
    console.error('Failed to retrieve past questions:', err);
    return [];
  }
}

/**
 * Retrieve category history for a user from Supermemory.
 */
export async function getCategoryHistory(userName: string): Promise<CategoryRecord[]> {
  try {
    const client = getSupermemory();
    const results = await client.search.execute({
      q: 'category score interview performance',
      containerTags: [`user_${userName}`],
      filters: {
        AND: [{ key: 'type', value: 'category_record' }],
      },
    });

    const records: CategoryRecord[] = [];
    if (results.results) {
      for (const result of results.results.slice(0, 50)) {
        try {
          const record = JSON.parse(result.content ?? '');
          if (record.category) records.push(record);
        } catch {
          // Skip unparseable
        }
      }
    }
    return records.sort((a, b) => a.timestamp - b.timestamp);
  } catch (err) {
    console.error('Failed to get category history:', err);
    return [];
  }
}

/**
 * Store a category record in Supermemory.
 */
export async function storeCategoryRecord(userName: string, record: CategoryRecord): Promise<void> {
  try {
    const client = getSupermemory();
    await client.add({
      content: JSON.stringify(record),
      containerTags: [`user_${userName}`],
      metadata: {
        type: 'category_record',
        userName,
        category: record.category,
        createdAt: String(Date.now()),
      },
    });
  } catch (err) {
    console.error('Failed to store category record:', err);
  }
}

/**
 * Select the next question category using adaptive logic:
 * - First interview: random category
 * - If previous score >= 7.5: mark completed, pick new category
 * - If previous score < 7.5: retry same category
 */
export function selectNextCategory(
  interviewType: InterviewType,
  categoryHistory: CategoryRecord[]
): QuestionCategory {
  const availableCategories = CATEGORIES_BY_TYPE[interviewType] || [];
  if (availableCategories.length === 0) return 'general';

  // No history — pick random
  if (categoryHistory.length === 0) {
    return availableCategories[Math.floor(Math.random() * availableCategories.length)];
  }

  // Find the most recent record
  const lastRecord = categoryHistory[categoryHistory.length - 1];

  // If last score < 7.5, retry same category
  if (lastRecord.score < 7.5) {
    return lastRecord.category;
  }

  // Last score >= 7.5 — mark as completed, pick a different uncompleted category
  const completedCategories = new Set(
    categoryHistory.filter((r) => r.completed).map((r) => r.category)
  );
  // Also mark the last one as completed
  completedCategories.add(lastRecord.category);

  const uncompleted = availableCategories.filter((c) => !completedCategories.has(c));
  if (uncompleted.length > 0) {
    return uncompleted[Math.floor(Math.random() * uncompleted.length)];
  }

  // All completed — pick random for continued practice
  return availableCategories[Math.floor(Math.random() * availableCategories.length)];
}

export function updateWeaknessProfile(
  existing: WeaknessProfile | null,
  userName: string,
  newScores: Record<string, number>
): WeaknessProfile {
  const profile: WeaknessProfile = existing || {
    userName,
    aggregates: {},
    weakest: [],
    strongest: [],
    sessionCount: 0,
    lastUpdated: Date.now(),
  };

  for (const [skill, score] of Object.entries(newScores)) {
    const s = skill as Skill;
    profile.aggregates[s] = computeAggregate(profile.aggregates[s], score);
  }

  const sorted = Object.entries(profile.aggregates)
    .filter(([, v]) => v !== undefined)
    .sort(([, a], [, b]) => (a as SkillAggregate).weightedScore - (b as SkillAggregate).weightedScore);
  profile.weakest = sorted.slice(0, 3).map(([s]) => s as Skill);
  profile.strongest = sorted.slice(-3).map(([s]) => s as Skill);
  profile.sessionCount += 1;
  profile.lastUpdated = Date.now();

  return profile;
}
