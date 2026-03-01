// ---- Enums / Unions ----
export type InterviewType = 'swe' | 'consulting' | 'product' | 'behavioral' | 'generic';
export type Difficulty = 'easy' | 'medium' | 'hard';
export type MessageRole = 'interviewer' | 'candidate';

// ---- Question Categories ----
export type SweCategory =
  | 'arrays_strings'
  | 'hash_maps'
  | 'linked_lists'
  | 'stacks_queues'
  | 'trees'
  | 'graphs'
  | 'dynamic_programming'
  | 'recursion_backtracking'
  | 'heaps_priority_queues';

export type ConsultingCategory =
  | 'revenue_problems'
  | 'cost_problems'
  | 'strategic_decisions'
  | 'investment_decisions'
  | 'operational_bottlenecks';

export type QuestionCategory = SweCategory | ConsultingCategory | string;

export interface CategoryRecord {
  category: QuestionCategory;
  score: number;
  completed: boolean;
  interviewNumber: number;
  mistakes?: string[];
  strengths?: string[];
  weaknesses?: string[];
  timestamp: number;
  improvementDelta?: number;
}

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
  pastInsights?: string[];
  pastQuestions?: string[];
  questionCategory?: QuestionCategory;
  categoryHistory?: CategoryRecord[];
  isRetry?: boolean;
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
  technicalQuestionAsked: boolean;
  candidateMessageCount: number;
}

export interface DrillItem {
  title: string;
  problemStatement: string;
  functionSignature?: string;
  exampleInput?: string;
  exampleOutput?: string;
  starterCode?: string;
  hints?: string[];
  targetSkill?: string;
}

export interface SessionReport {
  sessionId: string;
  userName: string;
  role: string;
  interviewType: InterviewType;
  questionCategory?: QuestionCategory;
  overallScore: number;
  skillScores: SkillScore[];
  strengths: string[];
  weaknesses: string[];
  drills: (string | DrillItem)[];
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
  // historicalScores stores past skill aggregate snapshots used by the
  // progress page to render trends. It mirrors the structure of
  // `aggregates` but may include additional history data over time.
  historicalScores?: Partial<Record<Skill, SkillAggregate>>;
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
  // for backwards compatibility we keep the old `skillAggregates` field,
  // but `skillTrends` is the preferred name used by the client.
  skillTrends: Partial<Record<Skill, SkillAggregate>>;
  skillAggregates?: Partial<Record<Skill, SkillAggregate>>;
}
