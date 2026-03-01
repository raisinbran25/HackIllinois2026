import { SessionConfig, SkillScore, Message, FocusPlan } from './types';

export function classificationPrompt(role: string, company: string | undefined, jd: string): string {
  return `You are an expert interview classifier. Given the following job information, determine:
1. The interview type (one of: swe, consulting, product, behavioral, generic)
2. The difficulty level (easy, medium, hard) based on the seniority implied

Job Role: ${role}
${company ? `Company: ${company}` : ''}
Job Description:
${jd}

Respond in JSON with exactly this schema:
{
  "interviewType": "swe" | "consulting" | "product" | "behavioral" | "generic",
  "difficulty": "easy" | "medium" | "hard",
  "reasoning": "one sentence explaining your classification"
}

Rules:
- "swe" for software engineering, developer, programmer roles
- "consulting" for management consulting, strategy roles
- "product" for product manager, product owner roles
- "behavioral" if the JD primarily emphasizes soft skills or leadership
- "generic" if it doesn't clearly fit the above
- Difficulty: intern/junior = easy, mid-level = medium, senior/staff/lead = hard`;
}

export function questionGenerationPrompt(
  config: SessionConfig,
  phase: string,
  conversationHistory: string,
  focusPlan?: FocusPlan,
  previousAnswer?: string
): string {
  const focusInstructions = focusPlan
    ? `\nADAPTATION INSTRUCTIONS:
Focus 60% of your questions on these weak areas: ${focusPlan.weaknesses.join(', ')}.
Reinforce these strengths occasionally: ${focusPlan.strengths.join(', ')}.
Difficulty level: ${focusPlan.difficulty}. ${
        focusPlan.difficulty === 'hard'
          ? 'Ask probing follow-ups, expect depth.'
          : focusPlan.difficulty === 'easy'
          ? 'Be encouraging, give hints if needed.'
          : 'Standard difficulty.'
      }`
    : '';

  const pastInsightsBlock = config.pastInsights && config.pastInsights.length > 0
    ? `\nPAST INTERVIEW INSIGHTS (areas the candidate previously struggled with):
${config.pastInsights.map((i) => `- ${i}`).join('\n')}
Use these insights to ask more targeted follow-up questions when relevant to the current phase. Do not mention these insights directly to the candidate.`
    : '';

  return `You are a professional ${config.interviewType} interviewer conducting a mock interview.

Role being interviewed for: ${config.role}
${config.company ? `Company: ${config.company}` : ''}
Interview type: ${config.interviewType}
Current phase: ${phase}
Difficulty: ${config.difficulty}
${focusInstructions}${pastInsightsBlock}

Conversation so far:
${conversationHistory || '(none yet)'}

${previousAnswer ? `The candidate just answered: "${previousAnswer}"` : 'This is the first question.'}

Generate the next interviewer question or follow-up. Rules:
- Stay in character as a professional interviewer
- Match the current phase: ${phase}
- If this is a follow-up, probe deeper on the candidate's previous answer
- Be concise (1-3 sentences for the question)
- For SWE coding phases, present a real algorithmic problem
- For behavioral phases, ask about specific past experiences
- Do NOT evaluate the answer here, just ask the next question

Respond with ONLY the interviewer's next statement/question, no JSON, no labels.`;
}

export function evaluationPrompt(
  config: SessionConfig,
  phase: string,
  question: string,
  answer: string,
  relevantSkills: string[]
): string {
  return `You are an expert interview evaluator. Score the candidate's answer.

Interview type: ${config.interviewType}
Role: ${config.role}
Phase: ${phase}
Difficulty: ${config.difficulty}

Question asked: "${question}"
Candidate's answer: "${answer}"

Score ONLY these skills (1-10 scale, where 1=terrible, 5=acceptable, 7=good, 10=exceptional):
${relevantSkills.map((s) => `- ${s}`).join('\n')}

For each skill, provide a score and a brief 1-sentence evidence note.
If a skill is not demonstrated in this answer, score it null.

Respond in JSON:
{
  "scores": [
    { "skill": "skill_name", "score": 7, "evidence": "reason" }
  ],
  "shouldFollowUp": true,
  "followUpReason": "optional reason to probe deeper"
}

Scoring guidelines:
- 1-3: Major gaps, incorrect, or missing
- 4-5: Partial, surface-level
- 6-7: Solid, demonstrates competence
- 8-9: Strong, with depth and nuance
- 10: Exceptional, exceeds expectations`;
}

export function reportPrompt(
  config: SessionConfig,
  messages: Message[],
  allScores: SkillScore[]
): string {
  const transcript = messages
    .map((m) => `${m.role}: ${m.content}`)
    .join('\n');

  const scoresSummary = allScores
    .map((s) => `${s.skill}: ${s.score}/10 - ${s.evidence}`)
    .join('\n');

  return `You are an interview performance analyst. Generate a comprehensive session report.

Interview type: ${config.interviewType}
Role: ${config.role}
Difficulty: ${config.difficulty}

Full transcript:
${transcript}

Individual scores collected:
${scoresSummary}

Generate a report in JSON:
{
  "overallScore": <number 1-10>,
  "skillScores": [
    { "skill": "name", "score": <averaged number>, "evidence": "aggregated note" }
  ],
  "strengths": ["strength1", "strength2", "strength3"],
  "weaknesses": ["weakness1", "weakness2", "weakness3"],
  "drills": [
    {
      "title": "Descriptive drill title",
      "problemStatement": "Clear description of the problem to solve",
      "functionSignature": "function name(param: Type): ReturnType",
      "exampleInput": "example input value",
      "exampleOutput": "expected output value",
      "starterCode": "function name(param) {\n  // Your code here\n  \n}",
      "hints": ["hint 1", "hint 2"],
      "targetSkill": "skill_name"
    }
  ],
  "summary": "2-3 sentence overall assessment"
}

Rules for drills:
- Make drills specific and actionable
- Target identified weaknesses
- Each coding drill MUST include: title, clear problemStatement, functionSignature, exampleInput, exampleOutput, and starterCode with meaningful variable names and inline comments
- For behavioral drills, include title, problemStatement (a scenario prompt), targetSkill, and hints. Omit functionSignature/starterCode/exampleInput/exampleOutput
- Include at least one behavioral drill if behavioral skills were weak
- Include at least 3 drills total`;
}
