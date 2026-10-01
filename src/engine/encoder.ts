/**
 * FEN to Tensor Encoder
 * Converts standard FEN position string into a 12x8x8 board tensor representation
 * as used by policy CNNs.
 * 
 * Channel mapping:
 * 0: White Pawn   (P)
 * 1: White Knight (N)
 * 2: White Bishop (B)
 * 3: White Rook   (R)
 * 4: White Queen  (Q)
 * 5: White King   (K)
 * 6: Black Pawn   (p)
 * 7: Black Knight (n)
 * 8: Black Bishop (b)
 * 9: Black Rook   (r)
 * 10: Black Queen (q)
 * 11: Black King  (k)
 */

export interface BoardTensor {
  // 12 planes of 8x8 flattened to 1D array of length 12 * 8 * 8 = 768
  tensor: Float32Array;
  activeColor: 'w' | 'b';
  castlingRights: {
    wK: boolean;
    wQ: boolean;
    bK: boolean;
    bQ: boolean;
  };
  enPassantSquare: string | null;
  halfmoveClock: number;
  fullmoveNumber: number;
}

const PIECE_CHANNEL_MAP: Record<string, number> = {
  'P': 0,
  'N': 1,
  'B': 2,
  'R': 3,
  'Q': 4,
  'K': 5,
  'p': 6,
  'n': 7,
  'b': 8,
  'r': 9,
  'q': 10,
  'k': 11
};

export function fenToTensor(fen: string): BoardTensor {
  const parts = fen.split(' ');
  const piecePlacement = parts[0];
  const activeColor = (parts[1] || 'w') as 'w' | 'b';
  const castlingStr = parts[2] || '-';
  const enPassantSquare = parts[3] !== '-' ? parts[3] : null;
  const halfmoveClock = parseInt(parts[4] || '0', 10);
  const fullmoveNumber = parseInt(parts[5] || '1', 10);

  // 12 channels * 8 rows * 8 cols
  const tensor = new Float32Array(12 * 8 * 8);

  const rows = piecePlacement.split('/');
  for (let rankIndex = 0; rankIndex < 8; rankIndex++) {
    const rowStr = rows[rankIndex];
    let fileIndex = 0;
    
    // Rank 0 is rank 8 in FEN, Rank 7 is rank 1
    const actualRank = 7 - rankIndex;

    for (let charIdx = 0; charIdx < rowStr.length; charIdx++) {
      const char = rowStr[charIdx];
      if (char >= '1' && char <= '8') {
        fileIndex += parseInt(char, 10);
      } else {
        const channel = PIECE_CHANNEL_MAP[char];
        if (channel !== undefined && fileIndex < 8) {
          // Flatten index: channel * 64 + rank * 8 + file
          const flatIndex = channel * 64 + actualRank * 8 + fileIndex;
          tensor[flatIndex] = 1.0;
        }
        fileIndex++;
      }
    }
  }

  return {
    tensor,
    activeColor,
    castlingRights: {
      wK: castlingStr.includes('K'),
      wQ: castlingStr.includes('Q'),
      bK: castlingStr.includes('k'),
      bQ: castlingStr.includes('q'),
    },
    enPassantSquare,
    halfmoveClock,
    fullmoveNumber,
  };
}

/**
 * Returns a fast compact string hash of the board tensor for LRU caching.
 */
export function getTensorCacheKey(fen: string): string {
  // Use first 4 parts of FEN (piece positions, active color, castling, en-passant)
  const parts = fen.split(' ');
  return parts.slice(0, 4).join(' ');
}
