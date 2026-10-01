/**
 * Canonical Chess Opening Book Database
 * Provides master-level opening recommendations to accelerate early game decision making
 * and maintain position quality.
 */

import { Chess } from 'chess.js';

export interface OpeningMove {
  san: string;
  name: string;
  eco: string; // ECO code e.g. C50, B30, E60
}

// Map of normalized FEN prefix (board position without fullmove clock) to recommended master moves
const OPENING_BOOK_DATABASE: Record<string, OpeningMove[]> = {
  // Initial position: rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -
  'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -': [
    { san: 'e4', name: 'King\'s Pawn Opening', eco: 'C20' },
    { san: 'd4', name: 'Queen\'s Pawn Opening', eco: 'D00' },
    { san: 'Nf3', name: 'Zukertort Opening', eco: 'A04' },
    { san: 'c4', name: 'English Opening', eco: 'A10' },
  ],

  // 1. e4
  'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq -': [
    { san: 'e5', name: 'Open Game', eco: 'C20' },
    { san: 'c5', name: 'Sicilian Defense', eco: 'B20' },
    { san: 'e6', name: 'French Defense', eco: 'C00' },
    { san: 'c6', name: 'Caro-Kann Defense', eco: 'B10' },
  ],

  // 1. e4 e5
  'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq -': [
    { san: 'Nf3', name: 'King\'s Knight Opening', eco: 'C40' },
    { san: 'Nc3', name: 'Vienna Game', eco: 'C23' },
    { san: 'f4', name: 'King\'s Gambit', eco: 'C30' },
  ],

  // 1. e4 e5 2. Nf3
  'rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq -': [
    { san: 'Nc6', name: 'Normal Move', eco: 'C44' },
    { san: 'Nf6', name: 'Petrov Defense', eco: 'C42' },
  ],

  // 1. e4 e5 2. Nf3 Nc6
  'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq -': [
    { san: 'Bb5', name: 'Ruy Lopez', eco: 'C60' },
    { san: 'Bc4', name: 'Italian Game', eco: 'C50' },
    { san: 'd4', name: 'Scotch Game', eco: 'C44' },
    { san: 'Nc3', name: 'Four Knights Game', eco: 'C47' },
  ],

  // 1. e4 c5 (Sicilian Defense)
  'rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq -': [
    { san: 'Nf3', name: 'Open Sicilian Prep', eco: 'B27' },
    { san: 'Nc3', name: 'Closed Sicilian', eco: 'B23' },
    { san: 'c3', name: 'Alapin Sicilian', eco: 'B22' },
  ],

  // 1. d4
  'rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq -': [
    { san: 'Nf6', name: 'Indian Defense', eco: 'A45' },
    { san: 'd5', name: 'Closed Game', eco: 'D00' },
    { san: 'f5', name: 'Dutch Defense', eco: 'A80' },
    { san: 'e6', name: 'Horwitz Defense', eco: 'A40' },
  ],

  // 1. d4 d5
  'rnbqkbnr/ppp1pppp/8/3p4/3P4/8/PPP1PPPP/RNBQKBNR w KQkq -': [
    { san: 'c4', name: 'Queen\'s Gambit', eco: 'D06' },
    { san: 'Nf3', name: 'Zukertort Variation', eco: 'D02' },
    { san: 'Bf4', name: 'London System', eco: 'D00' },
  ],

  // 1. d4 Nf6
  'rnbqkb1r/pppppppp/5n2/8/3P4/8/PPP1PPPP/RNBQKBNR w KQkq -': [
    { san: 'c4', name: 'Main Line Indian', eco: 'E60' },
    { san: 'Nf3', name: 'Flexible Indian', eco: 'A46' },
    { san: 'Bg5', name: 'Trompowsky Attack', eco: 'A45' },
  ],
};

export function getOpeningBookMove(chess: Chess): OpeningMove | null {
  const fen = chess.fen();
  // Strip halfmove and fullmove count for matching
  const fenParts = fen.split(' ');
  const normalizedFen = `${fenParts[0]} ${fenParts[1]} ${fenParts[2]} ${fenParts[3]}`;

  const candidates = OPENING_BOOK_DATABASE[normalizedFen];
  if (!candidates || candidates.length === 0) {
    return null;
  }

  // Random weighted choice from master book options
  const chosenIndex = Math.floor(Math.random() * candidates.length);
  return candidates[chosenIndex];
}
