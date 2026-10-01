export type PieceType = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';
export type PieceColor = 'w' | 'b';

export interface Piece {
  type: PieceType;
  color: PieceColor;
}

export interface EngineConfig {
  maxDepth: number;
  timeLimitMs: number;
  usePolicyCache: boolean;
  useTranspositionTable: boolean;
  policyWeight: number; // 0.0 = pure evaluation, 1.0 = heavy policy influence
  quiescenceSearch: boolean;
}

export interface MoveOption {
  from: string;
  to: string;
  promotion?: string;
  san: string;
  score?: number;
  policyScore?: number;
}

export interface SearchTelemetry {
  bestMove: MoveOption | null;
  evalScore: number; // In centipawns (positive = white advantage)
  isMate: boolean;
  mateInInMoves?: number;
  nodesSearched: number;
  leafNodesSearched: number;
  quiescenceNodesSearched: number;
  policyEvaluations: number;
  policyCacheHits: number;
  policyCacheHitRate: number;
  ttHits: number;
  maxDepthReached: number;
  durationMs: number;
  nodesPerSecond: number;
  principalVariation: string[];
}

export interface BenchmarkResult {
  id: string;
  title: string;
  category: string;
  fen: string;
  expectedMove: string;
  foundMove: string;
  isCorrect: boolean;
  score: number;
  nodes: number;
  durationMs: number;
  depthReached: number;
  pv: string[];
}

export interface BenchmarkSuiteReport {
  totalTests: number;
  passedCount: number;
  totalNodes: number;
  totalDurationMs: number;
  averageNps: number;
  results: BenchmarkResult[];
}

export interface InterviewTopic {
  id: string;
  title: string;
  category: 'ML & Deep Learning' | 'Game Theory & Search' | 'Systems & Optimization' | 'Engine Architecture';
  summary: string;
  keyConcepts: string[];
  codeHighlightSnippet?: string;
  interviewQuestions: {
    question: string;
    answer: string;
    keyTakeaway: string;
  }[];
}
