/**
 * Practical Chess Evaluator
 * Evaluates positions using material balance, piece-square tables, pawn structure,
 * king safety, mobility, and endgame advancement.
 */

import { Chess, Square, PieceSymbol, Color } from 'chess.js';
import { ZENITH_RL } from './rlEngine';

export const MATERIAL_VALUES: Record<PieceSymbol, number> = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 20000,
};

// Piece-Square Tables (PST) from White's perspective (A1 to H8 mapped to 0..63)
// Index = (7 - rank) * 8 + file
const PAWN_TABLE = [
   0,  0,  0,  0,  0,  0,  0,  0,
  50, 50, 50, 50, 50, 50, 50, 50,
  10, 10, 20, 30, 30, 20, 10, 10,
   5,  5, 10, 27, 27, 10,  5,  5,
   0,  0,  0, 22, 22,  0,  0,  0,
   5, -5,-10,  0,  0,-10, -5,  5,
   5, 10, 10,-20,-20, 10, 10,  5,
   0,  0,  0,  0,  0,  0,  0,  0
];

const KNIGHT_TABLE = [
  -50,-40,-30,-30,-30,-30,-40,-50,
  -40,-20,  0,  0,  0,  0,-20,-40,
  -30,  0, 10, 15, 15, 10,  0,-30,
  -30,  5, 15, 20, 20, 15,  5,-30,
  -30,  0, 15, 20, 20, 15,  0,-30,
  -30,  5, 10, 15, 15, 10,  5,-30,
  -40,-20,  0,  5,  5,  0,-20,-40,
  -50,-40,-30,-30,-30,-30,-40,-50
];

const BISHOP_TABLE = [
  -20,-10,-10,-10,-10,-10,-10,-20,
  -10,  0,  0,  0,  0,  0,  0,-10,
  -10,  0,  5, 10, 10,  5,  0,-10,
  -10,  5,  5, 10, 10,  5,  5,-10,
  -10,  0, 10, 10, 10, 10,  0,-10,
  -10, 10, 10, 10, 10, 10, 10,-10,
  -10,  5,  0,  0,  0,  0,  5,-10,
  -20,-10,-10,-10,-10,-10,-10,-20
];

const ROOK_TABLE = [
    0,  0,  0,  0,  0,  0,  0,  0,
    5, 10, 10, 10, 10, 10, 10,  5,
   -5,  0,  0,  0,  0,  0,  0, -5,
   -5,  0,  0,  0,  0,  0,  0, -5,
   -5,  0,  0,  0,  0,  0,  0, -5,
   -5,  0,  0,  0,  0,  0,  0, -5,
   -5,  0,  0,  0,  0,  0,  0, -5,
    0,  0,  0,  5,  5,  0,  0,  0
];

const QUEEN_TABLE = [
  -20,-10,-10, -5, -5,-10,-10,-20,
  -10,  0,  0,  0,  0,  0,  0,-10,
  -10,  0,  5,  5,  5,  5,  0,-10,
   -5,  0,  5,  5,  5,  5,  0, -5,
    0,  0,  5,  5,  5,  5,  0, -5,
  -10,  5,  5,  5,  5,  5,  0,-10,
  -10,  0,  5,  0,  0,  0,  0,-10,
  -20,-10,-10, -5, -5,-10,-10,-20
];

const KING_MIDGAME_TABLE = [
  -30,-40,-40,-50,-50,-40,-40,-30,
  -30,-40,-40,-50,-50,-40,-40,-30,
  -30,-40,-40,-50,-50,-40,-40,-30,
  -30,-40,-40,-50,-50,-40,-40,-30,
  -20,-30,-30,-40,-40,-30,-30,-20,
  -10,-20,-20,-20,-20,-20,-20,-10,
   20, 20,  0,  0,  0,  0, 20, 20,
   20, 30, 10,  0,  0, 10, 30, 20
];

const KING_ENDGAME_TABLE = [
  -50,-40,-30,-20,-20,-30,-40,-50,
  -30,-20,-10,  0,  0,-10,-20,-30,
  -30,-10, 20, 30, 30, 20,-10,-30,
  -30,-10, 30, 40, 40, 30,-10,-30,
  -30,-10, 30, 40, 40, 30,-10,-30,
  -30,-10, 20, 30, 30, 20,-10,-30,
  -30,-30,  0,  0,  0,  0,-30,-30,
  -50,-30,-30,-30,-30,-30,-30,-50
];

export function evaluatePosition(chess: Chess): number {
  if (chess.isCheckmate()) {
    // If it's black's turn to move and white delivered mate, score +100000
    // If it's white's turn to move and black delivered mate, score -100000
    return chess.turn() === 'w' ? -100000 : 100000;
  }

  if (chess.isDraw() || chess.isStalemate() || chess.isThreefoldRepetition()) {
    return 0;
  }

  let whiteMaterial = 0;
  let blackMaterial = 0;
  let whitePst = 0;
  let blackPst = 0;

  let totalNonPawnMaterial = 0;

  const board = chess.board();

  // Helper for PST square lookup from white's perspective
  // rank 0 = 8th rank, rank 7 = 1st rank in chess.js board array
  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const piece = board[r][f];
      if (!piece) continue;

      const pType = piece.type;
      const val = MATERIAL_VALUES[pType];

      // Index in PST table (0..63)
      // Top row in array is rank 8 (r=0), bottom row is rank 1 (r=7)
      const whiteSquareIdx = r * 8 + f;
      // Flip square for black
      const blackSquareIdx = (7 - r) * 8 + f;

      if (pType !== 'p' && pType !== 'k') {
        totalNonPawnMaterial += val;
      }

      let pstVal = 0;
      switch (pType) {
        case 'p':
          pstVal = PAWN_TABLE[piece.color === 'w' ? whiteSquareIdx : blackSquareIdx];
          break;
        case 'n':
          pstVal = KNIGHT_TABLE[piece.color === 'w' ? whiteSquareIdx : blackSquareIdx];
          break;
        case 'b':
          pstVal = BISHOP_TABLE[piece.color === 'w' ? whiteSquareIdx : blackSquareIdx];
          break;
        case 'r':
          pstVal = ROOK_TABLE[piece.color === 'w' ? whiteSquareIdx : blackSquareIdx];
          break;
        case 'q':
          pstVal = QUEEN_TABLE[piece.color === 'w' ? whiteSquareIdx : blackSquareIdx];
          break;
        case 'k':
          // Transition to endgame table if non-pawn material is low (< 1400 centipawns)
          const isEndgame = totalNonPawnMaterial < 1400;
          const kTable = isEndgame ? KING_ENDGAME_TABLE : KING_MIDGAME_TABLE;
          pstVal = kTable[piece.color === 'w' ? whiteSquareIdx : blackSquareIdx];
          break;
      }

      if (piece.color === 'w') {
        whiteMaterial += val;
        whitePst += pstVal;
      } else {
        blackMaterial += val;
        blackPst += pstVal;
      }
    }
  }

  // Pawn structure & mobility evaluation
  let whitePawnBonus = 0;
  let blackPawnBonus = 0;

  // Simple passed pawn advancement bonus
  for (let f = 0; f < 8; f++) {
    let whitePawnsInFile = 0;
    let blackPawnsInFile = 0;

    for (let r = 0; r < 8; r++) {
      const piece = board[r][f];
      if (piece?.type === 'p') {
        if (piece.color === 'w') {
          whitePawnsInFile++;
          const rankFromBase = 7 - r; // 1..6
          whitePawnBonus += rankFromBase * 8; // Bonus for advanced pawns
        } else {
          blackPawnsInFile++;
          const rankFromBase = r; // 1..6
          blackPawnBonus += rankFromBase * 8;
        }
      }
    }

    // Penalty for doubled pawns
    if (whitePawnsInFile > 1) whitePawnBonus -= 20;
    if (blackPawnsInFile > 1) blackPawnBonus -= 20;
  }

  // Retrieve current RL learned feature weights
  const rlWeights = ZENITH_RL.getWeights();

  const scaledWhiteMat = whiteMaterial * rlWeights.materialWeight;
  const scaledBlackMat = blackMaterial * rlWeights.materialWeight;

  const scaledWhitePst = whitePst * rlWeights.positionalWeight;
  const scaledBlackPst = blackPst * rlWeights.positionalWeight;

  const scaledWhitePawn = whitePawnBonus * rlWeights.pawnStructureWeight;
  const scaledBlackPawn = blackPawnBonus * rlWeights.pawnStructureWeight;

  const evalWhite = scaledWhiteMat + scaledWhitePst + scaledWhitePawn;
  const evalBlack = scaledBlackMat + scaledBlackPst + scaledBlackPawn;

  const rawScore = evalWhite - evalBlack;

  // Return perspective relative to White (positive = White leads, negative = Black leads)
  return rawScore;
}
