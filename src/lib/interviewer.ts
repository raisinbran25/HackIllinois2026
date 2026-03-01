import { getOpenAI } from './openai';
import { questionGenerationPrompt, evaluationPrompt } from './prompts';
import { Session, SkillScore } from './types';
import { SKILLS_BY_TYPE } from './constants';

export async function generateQuestion(session: Session): Promise<string> {
  const openai = getOpenAI();
  const conversationHistory = session.messages
    .map((m) => `${m.role}: ${m.content}`)
    .join('\n');

  const lastCandidateMsg = session.messages
    .filter((m) => m.role === 'candidate')
    .pop();

  const response = await openai.chat.completions.create({
    model: 'gpt-5.2',
    messages: [
      {
        role: 'system',
        content: 'You are a professional interviewer. Be concise and professional.',
      },
      {
        role: 'user',
        content: questionGenerationPrompt(
          session.config,
          session.phases[session.phaseIndex],
          conversationHistory,
          session.config.focusPlan,
          lastCandidateMsg?.content,
          session.technicalQuestionAsked
        ),
      },
    ],
    temperature: 0.7,
    max_completion_tokens: 500,
  });

  return response.choices[0].message.content!;
}

export async function evaluateAnswer(
  session: Session,
  question: string,
  answer: string
): Promise<{ scores: SkillScore[]; shouldFollowUp: boolean; nearPerfect: boolean }> {
  const openai = getOpenAI();
  const relevantSkills = SKILLS_BY_TYPE[session.config.interviewType];
  const phase = session.phases[session.phaseIndex];

  const response = await openai.chat.completions.create({
    model: 'gpt-5.2',
    messages: [
      {
        role: 'user',
        content: evaluationPrompt(
          session.config,
          phase,
          question,
          answer,
          relevantSkills
        ),
      },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.3,
    max_completion_tokens: 800,
  });

  const parsed = JSON.parse(response.choices[0].message.content!);
  const scores: SkillScore[] = (parsed.scores || [])
    .filter((s: { score: number | null }) => s.score !== null)
    .map((s: { skill: string; score: number; evidence: string }) => ({
      skill: s.skill,
      score: s.score,
      evidence: s.evidence,
    }));

  return {
    scores,
    shouldFollowUp: parsed.shouldFollowUp ?? false,
    nearPerfect: parsed.nearPerfect ?? false,
  };
}
