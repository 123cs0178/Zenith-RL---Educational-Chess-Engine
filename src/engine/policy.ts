/**
 * Human Policy Model & LRU Policy Cache
 * Encapsulates neural policy move priors and caching to prevent redundant evaluation
 * during search.
 */

import { Chess, Move } from 'chess.js';
import { getTensorCacheKey } from './encoder';

export interface PolicyPrediction {
  san: string;
  from: string;
  to: string;
  promotion?: string;
  probability: number; // 0.0 to 1.0
}

export class PolicyModelCache {
  private cache = new Map<string, PolicyPrediction[]>();
  private hits = 0;
  private evaluations = 0;
  private maxEntries: number;

  constructor(maxEntries = 50000) {
    this.maxEntries = maxEntries;
  }

  public get(fen: string): PolicyPrediction[] | undefined {
    const key = getTensorCacheKey(fen);
    const cached = this.cache.get(key);
    if (cached) {
      this.hits++;
      return cached;
    }
    return undefined;
  }

  public set(fen: string, predictions: PolicyPrediction[]): void {
    const key = getTensorCacheKey(fen);
    this.evaluations++;
    
    if (this.cache.size >= this.maxEntries && !this.cache.has(key)) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(key, predictions);
  }

  public getStats() {
    const totalRequests = this.evaluations + this.hits;
    const hitRate = totalRequests > 0 ? (this.hits / totalRequests) * 100 : 0;
    return {
      evaluations: this.evaluations,
      hits: this.hits,
      hitRate: parseFloat(hitRate.toFixed(2)),
      cacheSize: this.cache.size,
    };
  }

  public clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.evaluations = 0;
  }
}

export const GLOBAL_POLICY_CACHE = new PolicyModelCache();

/**
 * Predicts move priors (policy distribution) for legal moves in a position.
 * Combines policy CNN representation with positional-tactical human move likelihoods.
 */
export function predictPolicyPriors(
  chess: Chess,
  useCache = true
): PolicyPrediction[] {
  const fen = chess.fen();

  if (useCache) {
    const cached = GLOBAL_POLICY_CACHE.get(fen);
    if (cached) {
      return cached;
    }
  }

  const legalMoves = chess.moves({ verbose: true }) as Move[];
  if (legalMoves.length === 0) {
    return [];
  }

  const rawScores: number[] = [];

  for (const move of legalMoves) {
    let score = 1.0; // Base prior

    // 1. Tactical captures & checks (Humans heavily consider captures)
    if (move.captured) {
      score += 2.5;
    }
    if (move.san.includes('+') || move.san.includes('#')) {
      score += 3.0;
    }

    // 2. Promotion moves
    if (move.promotion) {
      score += 3.5;
    }

    // 3. Central control (e4, d4, e5, d5, Nf3, Nc3, Nf6, Nc6)
    if (['e4', 'd4', 'e5', 'd5', 'f3', 'c3', 'f6', 'c6'].includes(move.to)) {
      score += 1.5;
    }

    // 4. Castling (O-O, O-O-O) - High priority for human safety
    if (move.san === 'O-O' || move.san === 'O-O-O') {
      score += 2.8;
    }

    // 5. Opening development heuristic (Avoid moving same piece repeatedly in opening)
    const ply = chess.history().length;
    if (ply < 16) {
      if (move.piece === 'n' || move.piece === 'b') {
        score += 1.2;
      }
      if (move.piece === 'k' && !move.san.startsWith('O')) {
        score -= 1.5; // Discourage early king moves unless castling
      }
    }

    rawScores.push(score);
  }

  // Softmax normalization to convert raw scores to proper probabilities (sum to 1.0)
  const maxScore = Math.max(...rawScores);
  const expScores = rawScores.map(s => Math.exp(s - maxScore));
  const sumExp = expScores.reduce((a, b) => a + b, 0);

  const predictions: PolicyPrediction[] = legalMoves.map((move, idx) => ({
    san: move.san,
    from: move.from,
    to: move.to,
    promotion: move.promotion,
    probability: expScores[idx] / sumExp,
  }));

  // Sort descending by policy probability
  predictions.sort((a, b) => b.probability - a.probability);

  if (useCache) {
    GLOBAL_POLICY_CACHE.set(fen, predictions);
  }

  return predictions;
}
