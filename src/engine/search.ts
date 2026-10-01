/**
 * Hybrid Alpha-Beta Search Engine
 * Combines neural policy priors with classical Alpha-Beta pruning, Quiescence search,
 * Transposition Tables, Iterative Deepening, and strict time budgeting.
 */

import { Chess, Move } from 'chess.js';
import { evaluatePosition, MATERIAL_VALUES } from './evaluator';
import { predictPolicyPriors, PolicyPrediction, GLOBAL_POLICY_CACHE } from './policy';
import { computeZobristHash, TranspositionTable, TTFlag, TTEntry } from './transposition';
import { getOpeningBookMove } from './openingBook';
import { EngineConfig, SearchTelemetry, MoveOption } from '../types';

export class ChessSearchEngine {
  private tt = new TranspositionTable(150000);
  private startTime = 0;
  private timeLimitMs = 1000;
  private maxDepth = 6;
  private timeAborted = false;

  // Search Telemetry metrics
  private nodesSearched = 0;
  private leafNodesSearched = 0;
  private quiescenceNodesSearched = 0;
  private policyEvaluationsCount = 0;

  constructor() {}

  /**
   * Main entry point to find the best move for a given FEN position.
   */
  public findBestMove(
    fen: string,
    config: EngineConfig
  ): SearchTelemetry {
    this.maxDepth = config.maxDepth;
    this.timeLimitMs = config.timeLimitMs;
    this.startTime = Date.now();
    this.timeAborted = false;

    this.nodesSearched = 0;
    this.leafNodesSearched = 0;
    this.quiescenceNodesSearched = 0;

    const initialStats = GLOBAL_POLICY_CACHE.getStats();

    const rootChess = new Chess(fen);
    const legalMoves = rootChess.moves({ verbose: true }) as Move[];

    if (legalMoves.length === 0) {
      return {
        bestMove: null,
        evalScore: 0,
        isMate: rootChess.isCheckmate(),
        nodesSearched: 0,
        leafNodesSearched: 0,
        quiescenceNodesSearched: 0,
        policyEvaluations: 0,
        policyCacheHits: 0,
        policyCacheHitRate: 0,
        ttHits: 0,
        maxDepthReached: 0,
        durationMs: 0,
        nodesPerSecond: 0,
        principalVariation: [],
      };
    }

    // Check Opening Book first if in ply < 12
    if (rootChess.history().length < 12) {
      const bookMove = getOpeningBookMove(rootChess);
      if (bookMove) {
        const matchingLegal = legalMoves.find(m => m.san === bookMove.san);
        if (matchingLegal) {
          return {
            bestMove: {
              from: matchingLegal.from,
              to: matchingLegal.to,
              promotion: matchingLegal.promotion,
              san: matchingLegal.san,
              score: 25,
            },
            evalScore: evaluatePosition(rootChess),
            isMate: false,
            nodesSearched: 1,
            leafNodesSearched: 1,
            quiescenceNodesSearched: 0,
            policyEvaluations: 0,
            policyCacheHits: 0,
            policyCacheHitRate: 0,
            ttHits: 0,
            maxDepthReached: 1,
            durationMs: 2,
            nodesPerSecond: 500,
            principalVariation: [matchingLegal.san, `[Book: ${bookMove.name} ${bookMove.eco}]`],
          };
        }
      }
    }

    if (legalMoves.length === 1) {
      // Forced move
      const m = legalMoves[0];
      return {
        bestMove: { from: m.from, to: m.to, promotion: m.promotion, san: m.san },
        evalScore: evaluatePosition(rootChess),
        isMate: false,
        nodesSearched: 1,
        leafNodesSearched: 1,
        quiescenceNodesSearched: 0,
        policyEvaluations: 0,
        policyCacheHits: 0,
        policyCacheHitRate: 0,
        ttHits: 0,
        maxDepthReached: 1,
        durationMs: 1,
        nodesPerSecond: 1000,
        principalVariation: [m.san],
      };
    }

    let bestMoveSoFar: Move | null = legalMoves[0];
    let bestScoreSoFar = -Infinity;
    let maxCompletedDepth = 0;
    let pvLine: string[] = [];

    const isWhiteTurn = rootChess.turn() === 'w';

    // Iterative Deepening Loop
    for (let currentDepth = 1; currentDepth <= this.maxDepth; currentDepth++) {
      if (this.isTimeExpired()) break;

      const alpha = -Infinity;
      const beta = Infinity;

      const result = this.searchRoot(rootChess, currentDepth, alpha, beta, config);

      if (!this.timeAborted && result.bestMove) {
        bestMoveSoFar = result.bestMove;
        bestScoreSoFar = result.score;
        maxCompletedDepth = currentDepth;
        pvLine = result.pv;
      }

      // If mate found in current depth, stop deepening
      if (Math.abs(bestScoreSoFar) > 90000) {
        break;
      }
    }

    const durationMs = Math.max(1, Date.now() - this.startTime);
    const totalNodes = this.nodesSearched + this.quiescenceNodesSearched;
    const nps = Math.round((totalNodes / durationMs) * 1000);

    const endingStats = GLOBAL_POLICY_CACHE.getStats();
    const sessionEvaluations = endingStats.evaluations - initialStats.evaluations;
    const sessionHits = endingStats.hits - initialStats.hits;
    const sessionTotal = sessionEvaluations + sessionHits;
    const hitRate = sessionTotal > 0 ? parseFloat(((sessionHits / sessionTotal) * 100).toFixed(2)) : 0;

    const formattedBestMove: MoveOption | null = bestMoveSoFar
      ? {
          from: bestMoveSoFar.from,
          to: bestMoveSoFar.to,
          promotion: bestMoveSoFar.promotion,
          san: bestMoveSoFar.san,
          score: bestScoreSoFar,
        }
      : null;

    return {
      bestMove: formattedBestMove,
      evalScore: isWhiteTurn ? bestScoreSoFar : -bestScoreSoFar, // Convert to perspective of current player
      isMate: Math.abs(bestScoreSoFar) > 90000,
      mateInInMoves: Math.abs(bestScoreSoFar) > 90000 ? Math.ceil((100000 - Math.abs(bestScoreSoFar)) / 2) : undefined,
      nodesSearched: this.nodesSearched,
      leafNodesSearched: this.leafNodesSearched,
      quiescenceNodesSearched: this.quiescenceNodesSearched,
      policyEvaluations: sessionEvaluations,
      policyCacheHits: sessionHits,
      policyCacheHitRate: hitRate,
      ttHits: this.tt.getHits(),
      maxDepthReached: maxCompletedDepth,
      durationMs,
      nodesPerSecond: nps,
      principalVariation: pvLine,
    };
  }

  private isTimeExpired(): boolean {
    if (this.timeAborted) return true;
    if (Date.now() - this.startTime >= this.timeLimitMs) {
      this.timeAborted = true;
      return true;
    }
    return false;
  }

  /**
   * Searches the root node and returns best move and PV line
   */
  private searchRoot(
    chess: Chess,
    depth: number,
    alpha: number,
    beta: number,
    config: EngineConfig
  ): { bestMove: Move | null; score: number; pv: string[] } {
    this.nodesSearched++;

    const moves = this.getOrderedMoves(chess, config);
    if (moves.length === 0) {
      return { bestMove: null, score: evaluatePosition(chess), pv: [] };
    }

    let bestMove: Move | null = moves[0].move;
    let bestScore = -Infinity;
    let bestPv: string[] = [moves[0].move.san];

    for (const item of moves) {
      if (this.isTimeExpired()) break;

      chess.move(item.move);
      const score = -this.alphaBeta(chess, depth - 1, -beta, -alpha, config, 1);
      chess.undo();

      if (score > bestScore) {
        bestScore = score;
        bestMove = item.move;
        bestPv = [item.move.san];
        if (score > alpha) {
          alpha = score;
        }
      }
    }

    return { bestMove, score: bestScore, pv: bestPv };
  }

  /**
   * Negamax Alpha-Beta with Transposition Table and Policy priors
   */
  private alphaBeta(
    chess: Chess,
    depth: number,
    alpha: number,
    beta: number,
    config: EngineConfig,
    plyFromRoot: number
  ): number {
    if (this.isTimeExpired()) return 0;
    this.nodesSearched++;

    const isWhite = chess.turn() === 'w';
    const originalAlpha = alpha;

    // Zobrist Transposition Table Lookup
    let hashKey = 0n;
    if (config.useTranspositionTable) {
      hashKey = computeZobristHash(chess.fen());
      const ttEntry = this.tt.get(hashKey);
      if (ttEntry && ttEntry.depth >= depth) {
        if (ttEntry.flag === TTFlag.EXACT) {
          return ttEntry.score;
        } else if (ttEntry.flag === TTFlag.LOWERBOUND) {
          alpha = Math.max(alpha, ttEntry.score);
        } else if (ttEntry.flag === TTFlag.UPPERBOUND) {
          beta = Math.min(beta, ttEntry.score);
        }
        if (alpha >= beta) {
          return ttEntry.score;
        }
      }
    }

    // Terminal or Leaf node reach
    if (depth <= 0) {
      this.leafNodesSearched++;
      if (config.quiescenceSearch) {
        return this.quiescenceSearch(chess, alpha, beta, 4);
      } else {
        const rawEval = evaluatePosition(chess);
        return isWhite ? rawEval : -rawEval;
      }
    }

    if (chess.isGameOver()) {
      const rawEval = evaluatePosition(chess);
      return isWhite ? rawEval : -rawEval;
    }

    const moves = this.getOrderedMoves(chess, config);
    if (moves.length === 0) {
      const rawEval = evaluatePosition(chess);
      return isWhite ? rawEval : -rawEval;
    }

    let bestScore = -Infinity;
    let bestMove: Move | null = null;

    for (const item of moves) {
      if (this.isTimeExpired()) break;

      chess.move(item.move);
      const score = -this.alphaBeta(chess, depth - 1, -beta, -alpha, config, plyFromRoot + 1);
      chess.undo();

      if (score > bestScore) {
        bestScore = score;
        bestMove = item.move;
      }

      if (score > alpha) {
        alpha = score;
      }

      // Alpha-Beta Cutoff (Fail-High)
      if (alpha >= beta) {
        break;
      }
    }

    // Store in Transposition Table
    if (config.useTranspositionTable && !this.timeAborted) {
      let flag = TTFlag.EXACT;
      if (bestScore <= originalAlpha) {
        flag = TTFlag.UPPERBOUND;
      } else if (bestScore >= beta) {
        flag = TTFlag.LOWERBOUND;
      }

      this.tt.store({
        hashKey,
        depth,
        score: bestScore,
        flag,
        bestMoveSan: bestMove?.san,
      });
    }

    return bestScore;
  }

  /**
   * Quiescence Search: Continues searching capture sequences until quiet
   * to avoid the Horizon Effect (e.g. evaluating position right before a reciprocal queen recapture).
   */
  private quiescenceSearch(
    chess: Chess,
    alpha: number,
    beta: number,
    maxQDepth: number
  ): number {
    this.quiescenceNodesSearched++;
    const isWhite = chess.turn() === 'w';

    const standPat = isWhite ? evaluatePosition(chess) : -evaluatePosition(chess);

    if (standPat >= beta) {
      return beta;
    }
    if (alpha < standPat) {
      alpha = standPat;
    }

    if (maxQDepth <= 0 || chess.isGameOver()) {
      return standPat;
    }

    // Only search capturing moves in Quiescence
    const legalMoves = chess.moves({ verbose: true }) as Move[];
    const captures = legalMoves.filter(m => m.captured);

    // Sort captures by MVV-LVA (Most Valuable Victim - Least Valuable Attacker)
    captures.sort((a, b) => {
      const victimA = MATERIAL_VALUES[a.captured || 'p'];
      const attackerA = MATERIAL_VALUES[a.piece];
      const scoreA = victimA * 10 - attackerA;

      const victimB = MATERIAL_VALUES[b.captured || 'p'];
      const attackerB = MATERIAL_VALUES[b.piece];
      const scoreB = victimB * 10 - attackerB;

      return scoreB - scoreA;
    });

    for (const capture of captures) {
      if (this.isTimeExpired()) break;

      chess.move(capture);
      const score = -this.quiescenceSearch(chess, -beta, -alpha, maxQDepth - 1);
      chess.undo();

      if (score >= beta) {
        return beta;
      }
      if (score > alpha) {
        alpha = score;
      }
    }

    return alpha;
  }

  /**
   * Move Ordering: Prioritizes TT move > MVV-LVA Captures > Policy priors
   */
  private getOrderedMoves(
    chess: Chess,
    config: EngineConfig
  ): { move: Move; sortScore: number }[] {
    const legalMoves = chess.moves({ verbose: true }) as Move[];
    if (legalMoves.length === 0) return [];

    // Get neural policy predictions (uses LRU policy cache)
    const policyPriors = predictPolicyPriors(chess, config.usePolicyCache);
    const policyMap = new Map<string, number>();
    for (const p of policyPriors) {
      policyMap.set(p.san, p.probability);
    }

    // TT best move lookup
    let ttMoveSan: string | undefined;
    if (config.useTranspositionTable) {
      const hashKey = computeZobristHash(chess.fen());
      const ttEntry = this.tt.get(hashKey);
      ttMoveSan = ttEntry?.bestMoveSan;
    }

    const scoredMoves = legalMoves.map(m => {
      let sortScore = 0;

      // 1. TT move priority (Highest priority)
      if (ttMoveSan && m.san === ttMoveSan) {
        sortScore += 100000;
      }

      // 2. Tactical captures (MVV-LVA)
      if (m.captured) {
        const victimVal = MATERIAL_VALUES[m.captured] || 100;
        const attackerVal = MATERIAL_VALUES[m.piece] || 100;
        sortScore += 10000 + (victimVal * 10 - attackerVal);
      }

      // 3. Promotions & Checks
      if (m.promotion) {
        sortScore += 8000;
      }
      if (m.san.includes('+') || m.san.includes('#')) {
        sortScore += 5000;
      }

      // 4. Policy prior score (Human move probability)
      const policyProb = policyMap.get(m.san) || 0.01;
      sortScore += policyProb * 3000 * config.policyWeight;

      return { move: m, sortScore };
    });

    // Sort descending by sortScore
    scoredMoves.sort((a, b) => b.sortScore - a.sortScore);

    return scoredMoves;
  }
}
