// ---- Enums / Unions ----
export type InterviewType = 'swe' | 'consulting' | 'product' | 'behavioral' | 'generic';
export type Difficulty = 'easy' | 'medium' | 'hard';
export type MessageRole = 'interviewer' | 'candidate';

// ---- Skill Categories ----
export type TechnicalSkill =
  | 'problem_solving'
  | 'tradeoff_reasoning'
  | 'system_design'
  | 'edge_case_handling'
  | 'time_complexity'
  | 'communication_clarity';

export type BehavioralSkill =
  | 'star_structure'
  | 'specificity'
  | 'ownership'
  | 'reflection'
  | 'quantification';

export type Skill = TechnicalSkill | BehavioralSkill;

// ---- Core Data ----
export interface SkillScore {
  skill: Skill;
  score: number;        // 1-10
  evidence: string;     // brief justification
}

export interface Message {
  role: MessageRole;
  content: string;
  timestamp: number;
  skillScores?: SkillScore[];
}

export interface FocusPlan {
  weaknesses: Skill[];
  strengths: Skill[];
  neutral: Skill[];
  difficulty: Difficulty;
}

export interface SessionConfig {
  userName: string;
  role: string;
  company?: string;
  jobDescription: string;
  interviewType: InterviewType;
  difficulty: Difficulty;
  focusPlan?: FocusPlan;
}

export interface Session {
  id: string;
  config: SessionConfig;
  messages: Message[];
  questionCount: number;
  maxQuestions: number;
  phase: string;
  phases: string[];
  phaseIndex: number;
  status: 'active' | 'completed';
  createdAt: number;
}

export interface SessionReport {
  sessionId: string;
  userName: string;
  role: string;
  interviewType: InterviewType;
  overallScore: number;
  skillScores: SkillScore[];
  strengths: string[];
  weaknesses: string[];
  drills: string[];
  summary: string;
  createdAt: number;
}

export interface SkillAggregate {
  weightedScore: number;   // current Bayesian-weighted estimate
  confidence: number;      // 0-1, grows with more observations
  observationCount: number;
  recentScores: number[];  // last 5 scores for trend detection
}

export interface WeaknessProfile {
  userName: string;
  aggregates: Partial<Record<Skill, SkillAggregate>>;
  weakest: Skill[];
  strongest: Skill[];
  sessionCount: number;
  lastUpdated: number;
}

export interface ProgressData {
  userName: string;
  sessions: {
    sessionId: string;
    role: string;
    interviewType: InterviewType;
    overallScore: number;
    date: number;
  }[];
  skillAggregates: Partial<Record<Skill, SkillAggregate>>;
}
