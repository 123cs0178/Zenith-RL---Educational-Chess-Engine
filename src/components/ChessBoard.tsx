import React, { useState } from 'react';
import { Chess, Square, PieceSymbol, Color } from 'chess.js';
import { PieceIcon } from './PieceIcon';

interface ChessBoardProps {
  chess: Chess;
  onMove: (from: string, to: string, promotion?: string) => boolean;
  orientation?: 'w' | 'b';
  disabled?: boolean;
  lastMove?: { from: string; to: string } | null;
}

// Vector SVG Piece rendering powered by PieceIcon component

export const ChessBoard: React.FC<ChessBoardProps> = ({
  chess,
  onMove,
  orientation = 'w',
  disabled = false,
  lastMove = null,
}) => {
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [legalDestinations, setLegalDestinations] = useState<string[]>([]);
  const [promotionDialog, setPromotionDialog] = useState<{ from: Square; to: Square } | null>(null);

  const board = chess.board();
  const isCheck = chess.inCheck();

  const handleSquareClick = (square: Square) => {
    if (disabled) return;

    // If clicking a square with a promotion choice open
    if (promotionDialog) return;

    // If square is already selected, unselect
    if (selectedSquare === square) {
      setSelectedSquare(null);
      setLegalDestinations([]);
      return;
    }

    // If a square was already selected and user clicks a legal destination square
    if (selectedSquare && legalDestinations.includes(square)) {
      const piece = chess.get(selectedSquare);
      
      // Check if move is pawn promotion
      const isPawn = piece?.type === 'p';
      const isPromotionRank = (piece?.color === 'w' && square[1] === '8') || (piece?.color === 'b' && square[1] === '1');

      if (isPawn && isPromotionRank) {
        setPromotionDialog({ from: selectedSquare, to: square });
        return;
      }

      // Execute normal move
      const success = onMove(selectedSquare, square);
      setSelectedSquare(null);
      setLegalDestinations([]);
      return;
    }

    // Select piece on clicked square
    const piece = chess.get(square);
    if (piece && piece.color === chess.turn()) {
      setSelectedSquare(square);
      const moves = chess.moves({ square, verbose: true });
      setLegalDestinations(moves.map(m => m.to));
    } else {
      setSelectedSquare(null);
      setLegalDestinations([]);
    }
  };

  const handlePromotionSelect = (promoPiece: 'q' | 'r' | 'b' | 'n') => {
    if (promotionDialog) {
      onMove(promotionDialog.from, promotionDialog.to, promoPiece);
      setPromotionDialog(null);
      setSelectedSquare(null);
      setLegalDestinations([]);
    }
  };

  const ranks = orientation === 'w' ? [0, 1, 2, 3, 4, 5, 6, 7] : [7, 6, 5, 4, 3, 2, 1, 0];
  const files = orientation === 'w' ? [0, 1, 2, 3, 4, 5, 6, 7] : [7, 6, 5, 4, 3, 2, 1, 0];

  const getSquareName = (r: number, f: number): Square => {
    const fileChar = String.fromCharCode('a'.charCodeAt(0) + f);
    const rankNum = 8 - r;
    return `${fileChar}${rankNum}` as Square;
  };

  return (
    <div className="relative w-full max-w-[560px] aspect-square rounded-2xl overflow-hidden shadow-2xl border border-slate-800 bg-slate-900 select-none">
      {/* 8x8 Chess Grid */}
      <div className="grid grid-cols-8 grid-rows-8 w-full h-full">
        {ranks.map(r =>
          files.map(f => {
            const sqName = getSquareName(r, f);
            const isLight = (r + f) % 2 === 0;
            const piece = board[r][f];
            const isSelected = selectedSquare === sqName;
            const isDestination = legalDestinations.includes(sqName);
            const isLastMoveSquare = lastMove && (lastMove.from === sqName || lastMove.to === sqName);
            
            // Check highlight for King
            const isKingInCheck = isCheck && piece?.type === 'k' && piece?.color === chess.turn();

            return (
              <div
                key={sqName}
                id={`square-${sqName}`}
                onClick={() => handleSquareClick(sqName)}
                className={`relative flex items-center justify-center cursor-pointer transition-colors duration-150 ${
                  isLight ? 'bg-[#eeeed2]' : 'bg-[#769656]'
                } ${isSelected ? '!bg-amber-300' : ''} ${
                  isLastMoveSquare ? '!bg-yellow-200/80' : ''
                } ${isKingInCheck ? '!bg-red-500/90 animate-pulse' : ''}`}
              >
                {/* Square File & Rank Coordinates */}
                {f === (orientation === 'w' ? 0 : 7) && (
                  <span
                    className={`absolute top-0.5 left-1 text-[10px] font-bold ${
                      isLight ? 'text-[#769656]' : 'text-[#eeeed2]'
                    }`}
                  >
                    {8 - r}
                  </span>
                )}
                {r === (orientation === 'w' ? 7 : 0) && (
                  <span
                    className={`absolute bottom-0.5 right-1 text-[10px] font-bold ${
                      isLight ? 'text-[#769656]' : 'text-[#eeeed2]'
                    }`}
                  >
                    {String.fromCharCode('a'.charCodeAt(0) + f)}
                  </span>
                )}

                {/* Move Destination Dot / Capture Ring */}
                {isDestination && (
                  <div
                    className={`absolute z-10 rounded-full ${
                      piece
                        ? 'w-11/12 h-11/12 border-4 border-black/20 bg-black/5'
                        : 'w-4 h-4 bg-black/20'
                    }`}
                  />
                )}

                {/* SVG Piece Renderer */}
                {piece && (
                  <div
                    className={`w-10/12 h-10/12 flex items-center justify-center z-20 pointer-events-none transition-transform duration-100 ${
                      isSelected ? 'scale-110' : ''
                    }`}
                  >
                    <PieceIcon
                      color={piece.color}
                      type={piece.type}
                      className="w-full h-full"
                    />
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Pawn Promotion Selection Dialog Modal */}
      {promotionDialog && (
        <div className="absolute inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl max-w-sm w-full text-center">
            <h3 className="text-lg font-bold text-slate-100 mb-2">Pawn Promotion</h3>
            <p className="text-xs text-slate-400 mb-4">Select piece to promote your pawn to:</p>
            <div className="grid grid-cols-4 gap-3">
              {(['q', 'r', 'b', 'n'] as const).map(pType => (
                <button
                  key={pType}
                  onClick={() => handlePromotionSelect(pType)}
                  className="p-3 bg-slate-800 hover:bg-indigo-600 rounded-xl transition border border-slate-700 flex flex-col items-center justify-center gap-1 group"
                >
                  <PieceIcon
                    color={chess.turn()}
                    type={pType}
                    className="w-10 h-10 group-hover:scale-110 transition-transform"
                  />
                  <span className="text-[10px] uppercase font-bold text-slate-300 group-hover:text-white">
                    {pType === 'q' ? 'Queen' : pType === 'r' ? 'Rook' : pType === 'b' ? 'Bishop' : 'Knight'}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
