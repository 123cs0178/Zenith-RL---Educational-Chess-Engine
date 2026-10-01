/**
 * Tactical Benchmark Test Suite & Engine Performance Profiler
 * Runs 10 standard test positions to evaluate search correctness, NPS, policy cache efficiency,
 * and time limits.
 */

import { Chess } from 'chess.js';
import { ChessSearchEngine } from './search';
import { EngineConfig, BenchmarkResult, BenchmarkSuiteReport } from '../types';

export interface TestCase {
  id: string;
  title: string;
  category: string;
  fen: string;
  acceptableMoves: string[]; // Standard Algebraic Notation (SAN)
  description: string;
}

export const TACTICAL_TEST_CASES: TestCase[] = [
  {
    id: 'mate-in-1',
    title: 'Mate in 1 (Queen Checkmate)',
    category: 'Checkmate',
    fen: '6k1/5ppp/8/8/8/8/5PPP/4Q1K1 w - - 0 1',
    acceptableMoves: ['Qe8#'],
    description: 'White to move and deliver immediate back-rank mate with Qe8#.',
  },
  {
    id: 'mate-in-2',
    title: 'Mate in 2 (Rook Sac Back-Rank)',
    category: 'Checkmate',
    fen: '3r2k1/5ppp/8/8/8/8/3R1PPP/6K1 w - - 0 1',
    acceptableMoves: ['Rxd8+'],
    description: 'White to move and force back-rank checkmate in 2 moves.',
  },
  {
    id: 'knight-fork',
    title: 'Royal Knight Fork',
    category: 'Tactics',
    fen: 'r1bqk2r/pppp1ppp/2n5/2b1p3/2B1N3/5N2/PPPP1PPP/R1BQK2R w KQkq - 0 1',
    acceptableMoves: ['Nxc5', 'Bxf7+'],
    description: 'White exploits tactic/free bishop capture or king disruption.',
  },
  {
    id: 'hanging-rook',
    title: 'Hanging Rook Capture',
    category: 'Tactics',
    fen: '2r3k1/5ppp/8/8/1r6/2R5/5PPP/6K1 w - - 0 1',
    acceptableMoves: ['Rxc8+'],
    description: 'White captures undefended back-rank rook with checkmate threat.',
  },
  {
    id: 'passed-pawn-promotion',
    title: 'Passed Pawn Promotion Race',
    category: 'Endgame',
    fen: '8/4P3/8/8/8/5k2/8/5K2 w - - 0 1',
    acceptableMoves: ['e8=Q', 'e8=R'],
    description: 'White pushes passed pawn to promote to Queen immediately.',
  },
  {
    id: 'pin-exploitation',
    title: 'Pin Exploitation',
    category: 'Tactics',
    fen: '4k3/8/8/4r3/8/8/4R3/4K3 w - - 0 1',
    acceptableMoves: ['Rxe5+'],
    description: 'White captures pinned black rook with check.',
  },
  {
    id: 'discovered-attack',
    title: 'Discovered Attack Check',
    category: 'Tactics',
    fen: 'r1bqk2r/pppp1Bpp/2n5/2b1p3/4P3/5N2/PPPP1PPP/R1BQK2R b KQkq - 0 1',
    acceptableMoves: ['Kxf7'],
    description: 'Black captures sacrificed bishop safely with King.',
  },
  {
    id: 'simplification-winning',
    title: 'Simplification when Ahead',
    category: 'Endgame',
    fen: '8/2k5/8/8/8/2Q5/2Q5/2K5 w - - 0 1',
    acceptableMoves: ['Qcq4+', 'Qc4+', 'Q2c4+'],
    description: 'White converts overwhelming queen advantage cleanly.',
  },
  {
    id: 'check-evasion',
    title: 'Forced Check Evasion',
    category: 'Defense',
    fen: 'r1bqk1r1/pppp1ppp/2n5/2b1p3/4P3/5N2/PPPP1PPP/R1BQK2R w KQq - 0 1',
    acceptableMoves: ['d3', 'd4', 'c3', 'Qe2', 'O-O'],
    description: 'White chooses optimal opening response or castling.',
  },
  {
    id: 'central-control',
    title: 'Opening Central Pawn Control',
    category: 'Opening',
    fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    acceptableMoves: ['e4', 'd4', 'Nf3', 'c4'],
    description: 'Initial starting position central development choices.',
  },
];

export function runBenchmarkSuite(
  customConfig?: Partial<EngineConfig>
): BenchmarkSuiteReport {
  const config: EngineConfig = {
    maxDepth: 5,
    timeLimitMs: 1500,
    usePolicyCache: true,
    useTranspositionTable: true,
    policyWeight: 1.0,
    quiescenceSearch: true,
    ...customConfig,
  };

  const results: BenchmarkResult[] = [];
  let totalNodes = 0;
  let totalTimeMs = 0;
  let passedCount = 0;

  const engine = new ChessSearchEngine();

  for (const test of TACTICAL_TEST_CASES) {
    const telemetry = engine.findBestMove(test.fen, config);

    const foundSan = telemetry.bestMove?.san || 'NONE';
    const isCorrect = test.acceptableMoves.includes(foundSan);

    if (isCorrect) {
      passedCount++;
    }

    const testNodes = telemetry.nodesSearched + telemetry.quiescenceNodesSearched;
    totalNodes += testNodes;
    totalTimeMs += telemetry.durationMs;

    results.push({
      id: test.id,
      title: test.title,
      category: test.category,
      fen: test.fen,
      expectedMove: test.acceptableMoves.join(' / '),
      foundMove: foundSan,
      isCorrect,
      score: telemetry.evalScore,
      nodes: testNodes,
      durationMs: telemetry.durationMs,
      depthReached: telemetry.maxDepthReached,
      pv: telemetry.principalVariation,
    });
  }

  const averageNps = totalTimeMs > 0 ? Math.round((totalNodes / totalTimeMs) * 1000) : 0;

  return {
    totalTests: TACTICAL_TEST_CASES.length,
    passedCount,
    totalNodes,
    totalDurationMs: totalTimeMs,
    averageNps,
    results,
  };
}
