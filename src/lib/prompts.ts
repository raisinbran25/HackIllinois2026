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
- Difficulty: Default to "easy" unless the JD clearly indicates senior/staff/lead level. intern/junior/mid-level = easy, senior = medium, staff/lead/principal = hard`;
}

export function questionGenerationPrompt(
  config: SessionConfig,
  phase: string,
  conversationHistory: string,
  focusPlan?: FocusPlan,
  previousAnswer?: string,
  technicalQuestionAsked?: boolean
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

  const technicalQuestionBlock = technicalQuestionAsked
    ? '\nTECHNICAL QUESTION CONSTRAINT: A technical question has already been asked in this interview. Do NOT ask another technical/coding question. Focus on behavioral, follow-up, or other non-technical questions.'
    : '\nTECHNICAL QUESTION CONSTRAINT: Exactly one technical question must be asked during this interview. If no technical question has been asked yet, this should be a technical question (e.g., a coding problem, system design, or technical problem-solving question).';

  const pastQuestionsBlock = config.pastQuestions && config.pastQuestions.length > 0
    ? `\nQUESTION REPETITION GUARD — The following questions have been asked in previous interviews. You MUST NOT repeat any of them exactly. You may ask about similar topics but must use a different question:
${config.pastQuestions.map((q) => `- "${q}"`).join('\n')}`
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
${focusInstructions}${pastInsightsBlock}${pastQuestionsBlock}${technicalQuestionBlock}

Conversation so far:
${conversationHistory || '(none yet)'}

${previousAnswer ? `The candidate just answered: "${previousAnswer}"` : 'This is the first question.'}

Generate the next interviewer question or follow-up. Rules:
- Stay in character as a professional interviewer
- Match the current phase: ${phase}
- If this is a follow-up, probe deeper on the candidate's previous answer
- Be concise (1-3 sentences for the question)
- Default to beginner/early-intermediate difficulty. Avoid overly complex edge cases unless the user is consistently scoring high. For SWE, prefer straightforward problems (simple arrays, strings, basic data structures) over tricky algorithm puzzles.
- For SWE coding phases, present a real but approachable algorithmic problem
- For behavioral phases, ask about specific past experiences
- Do NOT evaluate the answer here, just ask the next question
- STRICT RULE: If the candidate asks for help, hints, guidance, or how to approach the problem, you must NOT provide any help, hints, or guidance. You may acknowledge the request neutrally (e.g., "I understand, but I'd like to see your independent approach.") and restate the question if needed. Never reveal the answer or solution approach.
- PARTIAL CREDIT FEEDBACK: If the candidate's answer is partially correct, you may briefly acknowledge which parts are correct and which parts need improvement. However, do NOT provide hints, guidance, or steer the candidate toward the correct answer. Your feedback must be descriptive (e.g., "Your approach to X was solid, but Y still needs work."), NOT instructional (e.g., do NOT say "Try thinking about..." or "Consider using...").
- MESSAGE LIMIT: The candidate has a maximum of 5 messages for this interview. For consulting/case interviews, provide sufficient context and information in each question/response so the candidate can complete the interview within this limit.

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
  "followUpReason": "optional reason to probe deeper",
  "nearPerfect": false
}

Set "nearPerfect" to true ONLY if the candidate's answer is exceptional across all evaluated skills (all scores 9 or 10). This signals the interview may end early.

Scoring guidelines (be generous — treat 7.5 as satisfactory, give partial credit liberally):
- 1-3: Completely wrong or no attempt
- 4-5: Weak attempt with major gaps
- 6-7: Reasonable attempt, shows understanding even if incomplete
- 7.5: Satisfactory — this is the target for a passing answer
- 8-9: Strong, well-structured answer
- 10: Exceptional, exceeds expectations
Do NOT penalize minor mistakes harshly. Award partial credit generously for showing the right approach even if details are wrong.

CLARIFICATION QUESTION SCORING: If the candidate asks clarifying questions rather than providing an answer, use context-aware scoring:
- For consulting/case interviews: Asking clarifying questions is expected and should NOT reduce scores. It may even improve scores if the questions demonstrate structured thinking.
- For SWE/coding interviews (LeetCode-style): Asking clarifying questions may slightly reduce the score, as candidates are expected to work through ambiguity independently.
- For behavioral interviews: Asking for clarification is neutral.
- For product interviews: Asking clarifying questions is positive and expected.
Your scoring decision must be career-specific and reflected only in the evaluation scores, not in any live feedback to the candidate.`;
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
