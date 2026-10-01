import React from 'react';
import { Chess, PieceSymbol } from 'chess.js';
import { PieceIcon } from './PieceIcon';

interface MaterialAdvantageDisplayProps {
  chess: Chess;
  orientation?: 'w' | 'b';
}

const INITIAL_COUNTS: Record<PieceSymbol, number> = {
  p: 8,
  n: 2,
  b: 2,
  r: 2,
  q: 1,
  k: 1,
};

const PIECE_VALUES: Record<PieceSymbol, number> = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9,
  k: 0,
};

// Order for displaying captured pieces
const PIECE_ORDER: PieceSymbol[] = ['p', 'n', 'b', 'r', 'q'];

export const MaterialAdvantageDisplay: React.FC<MaterialAdvantageDisplayProps> = ({
  chess,
  orientation = 'w',
}) => {
  const board = chess.board();

  // Count active pieces on the board
  const activeWhite: Record<PieceSymbol, number> = { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 };
  const activeBlack: Record<PieceSymbol, number> = { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 };

  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const piece = board[r][f];
      if (piece) {
        if (piece.color === 'w') {
          activeWhite[piece.type]++;
        } else {
          activeBlack[piece.type]++;
        }
      }
    }
  }

  // Calculate captured pieces
  // Captured Black pieces (taken by White)
  const capturedBlack: { type: PieceSymbol; count: number }[] = [];
  let whiteMaterialVal = 0;

  // Captured White pieces (taken by Black)
  const capturedWhite: { type: PieceSymbol; count: number }[] = [];
  let blackMaterialVal = 0;

  PIECE_ORDER.forEach(type => {
    const missingBlack = Math.max(0, INITIAL_COUNTS[type] - activeBlack[type]);
    if (missingBlack > 0) {
      capturedBlack.push({ type, count: missingBlack });
      whiteMaterialVal += missingBlack * PIECE_VALUES[type];
    }

    const missingWhite = Math.max(0, INITIAL_COUNTS[type] - activeWhite[type]);
    if (missingWhite > 0) {
      capturedWhite.push({ type, count: missingWhite });
      blackMaterialVal += missingWhite * PIECE_VALUES[type];
    }
  });

  const diff = whiteMaterialVal - blackMaterialVal;

  // Render captured pieces row
  const renderCapturedGroup = (
    color: 'w' | 'b',
    capturedList: { type: PieceSymbol; count: number }[],
    netAdvantage: number
  ) => {
    const isPlayerWhite = color === 'w';

    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center -space-x-1 overflow-x-auto py-0.5">
          {capturedList.length === 0 ? (
            <span className="text-[10px] text-slate-500 italic">No captures</span>
          ) : (
            capturedList.map(item => (
              <div key={item.type} className="flex items-center">
                {Array.from({ length: item.count }).map((_, i) => (
                  <PieceIcon
                    key={`${item.type}-${i}`}
                    color={color === 'w' ? 'b' : 'w'} // White has captured Black pieces (rendered in black style)
                    type={item.type}
                    className="w-5 h-5 shrink-0"
                  />
                ))}
              </div>
            ))
          )}
        </div>

        {netAdvantage > 0 && (
          <span className="text-xs font-black px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-400 border border-amber-500/40 shrink-0">
            +{netAdvantage}
          </span>
        )}
      </div>
    );
  };

  // Top player vs Bottom player based on board orientation
  const topColor: 'w' | 'b' = orientation === 'w' ? 'b' : 'w';
  const bottomColor: 'w' | 'b' = orientation === 'w' ? 'w' : 'b';

  return (
    <div className="w-full max-w-[560px] bg-slate-900/90 border border-slate-800 rounded-2xl p-3 shadow-xl flex flex-col gap-2">
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-2 text-xs font-bold text-slate-300">
        <span className="flex items-center gap-1.5 text-slate-200">
          <span className="w-2 h-2 rounded-full bg-indigo-500" />
          Material Advantage & Captured Pieces
        </span>
        {diff === 0 ? (
          <span className="text-[11px] font-mono text-slate-400">Equal Material</span>
        ) : (
          <span className="text-[11px] font-mono font-bold text-amber-400">
            {diff > 0 ? `White +${diff}` : `Black +${Math.abs(diff)}`}
          </span>
        )}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        {/* Top Player (e.g. Black if orientation is White) */}
        <div className="flex flex-col gap-1 flex-1 bg-slate-950/60 p-2 rounded-xl border border-slate-800/60">
          <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold">
            <span>{topColor === 'b' ? 'Black (Captured White)' : 'White (Captured Black)'}</span>
          </div>
          {topColor === 'b'
            ? renderCapturedGroup('b', capturedWhite, -diff)
            : renderCapturedGroup('w', capturedBlack, diff)}
        </div>

        {/* Bottom Player (e.g. White if orientation is White) */}
        <div className="flex flex-col gap-1 flex-1 bg-slate-950/60 p-2 rounded-xl border border-slate-800/60">
          <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold">
            <span>{bottomColor === 'w' ? 'White (Captured Black)' : 'Black (Captured White)'}</span>
          </div>
          {bottomColor === 'w'
            ? renderCapturedGroup('w', capturedBlack, diff)
            : renderCapturedGroup('b', capturedWhite, -diff)}
        </div>
      </div>
    </div>
  );
};
