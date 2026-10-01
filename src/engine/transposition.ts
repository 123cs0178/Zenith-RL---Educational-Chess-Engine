/**
 * Zobrist Hashing & Transposition Table Implementation
 * Provides O(1) position hashing and tree lookup for search optimization.
 */

export enum TTFlag {
  EXACT = 0,
  LOWERBOUND = 1, // Beta cutoff (fail-high)
  UPPERBOUND = 2  // Alpha bound (fail-low)
}

export interface TTEntry {
  hashKey: bigint;
  depth: number;
  score: number;
  flag: TTFlag;
  bestMoveSan?: string;
  bestMoveFromTo?: { from: string; to: string; promotion?: string };
}

// Pseudorandom 64-bit number generator for deterministic Zobrist keys
function randomBigInt64(): bigint {
  const high = BigInt(Math.floor(Math.random() * 0xFFFFFFFF));
  const low = BigInt(Math.floor(Math.random() * 0xFFFFFFFF));
  return (high << 32n) | low;
}

// Zobrist Random Tables
class ZobristKeys {
  // [12 pieces][64 squares]
  public pieceKeys: bigint[][] = [];
  // Active color (1 key for Black to move)
  public blackToMoveKey: bigint;
  // Castling rights (16 combinations: 0-15)
  public castlingKeys: bigint[] = [];
  // En passant file (8 files)
  public enPassantFileKeys: bigint[] = [];

  constructor() {
    // Initialize deterministic PRNG seed for reproducible hashes
    let seed = 123456789n;
    const nextRandom = () => {
      seed = (seed * 6364136223846793005n + 1442695040888963407n) & 0xFFFFFFFFFFFFFFFFn;
      return seed;
    };

    for (let p = 0; p < 12; p++) {
      const squareList: bigint[] = [];
      for (let sq = 0; sq < 64; sq++) {
        squareList.push(nextRandom());
      }
      this.pieceKeys.push(squareList);
    }

    this.blackToMoveKey = nextRandom();

    for (let c = 0; c < 16; c++) {
      this.castlingKeys.push(nextRandom());
    }

    for (let f = 0; f < 8; f++) {
      this.enPassantFileKeys.push(nextRandom());
    }
  }
}

export const ZOBRIST_KEYS = new ZobristKeys();

const PIECE_CHAR_TO_INDEX: Record<string, number> = {
  'P': 0, 'N': 1, 'B': 2, 'R': 3, 'Q': 4, 'K': 5,
  'p': 6, 'n': 7, 'b': 8, 'r': 9, 'q': 10, 'k': 11,
};

/**
 * Computes Zobrist Hash for a given FEN string
 */
export function computeZobristHash(fen: string): bigint {
  const parts = fen.split(' ');
  const piecePlacement = parts[0];
  const activeColor = parts[1] || 'w';
  const castlingStr = parts[2] || '-';
  const enPassantStr = parts[3] || '-';

  let hash = 0n;

  // 1. Piece positions
  const rows = piecePlacement.split('/');
  for (let r = 0; r < 8; r++) {
    const actualRank = 7 - r;
    let file = 0;
    for (let c = 0; c < rows[r].length; c++) {
      const char = rows[r][c];
      if (char >= '1' && char <= '8') {
        file += parseInt(char, 10);
      } else {
        const pIdx = PIECE_CHAR_TO_INDEX[char];
        if (pIdx !== undefined && file < 8) {
          const sq = actualRank * 8 + file;
          hash ^= ZOBRIST_KEYS.pieceKeys[pIdx][sq];
        }
        file++;
      }
    }
  }

  // 2. Active side
  if (activeColor === 'b') {
    hash ^= ZOBRIST_KEYS.blackToMoveKey;
  }

  // 3. Castling rights
  let castleMask = 0;
  if (castlingStr.includes('K')) castleMask |= 1;
  if (castlingStr.includes('Q')) castleMask |= 2;
  if (castlingStr.includes('k')) castleMask |= 4;
  if (castlingStr.includes('q')) castleMask |= 8;
  hash ^= ZOBRIST_KEYS.castlingKeys[castleMask];

  // 4. En Passant file
  if (enPassantStr !== '-') {
    const fileChar = enPassantStr[0];
    const fileIdx = fileChar.charCodeAt(0) - 'a'.charCodeAt(0);
    if (fileIdx >= 0 && fileIdx < 8) {
      hash ^= ZOBRIST_KEYS.enPassantFileKeys[fileIdx];
    }
  }

  return hash;
}

export class TranspositionTable {
  private table = new Map<bigint, TTEntry>();
  private hits = 0;
  private maxEntries: number;

  constructor(maxEntries = 100000) {
    this.maxEntries = maxEntries;
  }

  public get(hashKey: bigint): TTEntry | undefined {
    const entry = this.table.get(hashKey);
    if (entry) {
      this.hits++;
    }
    return entry;
  }

  public store(entry: TTEntry): void {
    // Replacement policy: overwrite if deeper or key not present
    const existing = this.table.get(entry.hashKey);
    if (!existing || entry.depth >= existing.depth) {
      if (this.table.size >= this.maxEntries && !existing) {
        // Evict LRU or map iterator first key
        const firstKey = this.table.keys().next().value;
        if (firstKey !== undefined) {
          this.table.delete(firstKey);
        }
      }
      this.table.set(entry.hashKey, entry);
    }
  }

  public getHits(): number {
    return this.hits;
  }

  public clear(): void {
    this.table.clear();
    this.hits = 0;
  }

  public size(): number {
    return this.table.size;
  }
}
