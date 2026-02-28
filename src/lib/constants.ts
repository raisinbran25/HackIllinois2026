import { TechnicalSkill, BehavioralSkill, InterviewType, Skill } from './types';

export const TECHNICAL_SKILLS: TechnicalSkill[] = [
  'problem_solving', 'tradeoff_reasoning', 'system_design',
  'edge_case_handling', 'time_complexity', 'communication_clarity',
];

export const BEHAVIORAL_SKILLS: BehavioralSkill[] = [
  'star_structure', 'specificity', 'ownership', 'reflection', 'quantification',
];

export const ALL_SKILLS: Skill[] = [...TECHNICAL_SKILLS, ...BEHAVIORAL_SKILLS];

export const SKILL_LABELS: Record<string, string> = {
  problem_solving: 'Problem Solving',
  tradeoff_reasoning: 'Tradeoff Reasoning',
  system_design: 'System Design',
  edge_case_handling: 'Edge Case Handling',
  time_complexity: 'Time Complexity Analysis',
  communication_clarity: 'Communication Clarity',
  star_structure: 'STAR Structure',
  specificity: 'Specificity',
  ownership: 'Ownership & Agency',
  reflection: 'Reflection & Learning',
  quantification: 'Quantification',
};

export const INTERVIEW_PHASES: Record<InterviewType, string[]> = {
  swe: ['coding_problem', 'clarifications', 'optimization', 'complexity_analysis', 'edge_cases', 'behavioral'],
  consulting: ['case_prompt', 'framework', 'challenge_assumptions', 'quant_drill', 'recommendation'],
  product: ['product_sense', 'metrics', 'tradeoffs', 'prioritization', 'behavioral'],
  behavioral: ['intro', 'leadership', 'conflict', 'failure', 'teamwork', 'growth'],
  generic: ['intro', 'skill_probe_1', 'skill_probe_2', 'scenario', 'depth', 'behavioral'],
};

export const SKILLS_BY_TYPE: Record<InterviewType, Skill[]> = {
  swe: ['problem_solving', 'tradeoff_reasoning', 'system_design', 'edge_case_handling', 'time_complexity', 'communication_clarity'],
  consulting: ['problem_solving', 'tradeoff_reasoning', 'communication_clarity', 'specificity', 'quantification'],
  product: ['problem_solving', 'tradeoff_reasoning', 'communication_clarity', 'specificity', 'quantification', 'ownership'],
  behavioral: ['star_structure', 'specificity', 'ownership', 'reflection', 'quantification', 'communication_clarity'],
  generic: ['problem_solving', 'communication_clarity', 'star_structure', 'specificity', 'ownership'],
};

export const MAX_QUESTIONS = 7;
