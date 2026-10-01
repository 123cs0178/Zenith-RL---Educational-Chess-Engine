import React from 'react';

interface EvalBarProps {
  score: number; // centipawns relative to White (positive = White winning)
  isMate?: boolean;
  mateInMoves?: number;
}

export const EvalBar: React.FC<EvalBarProps> = ({ score, isMate, mateInMoves }) => {
  // Convert score (centipawns) to winning percentage (0% to 100% White advantage)
  // Logistic function scale: 50% + 50% * (2 / (1 + exp(-0.0035 * score)) - 1)
  let whiteWinningPct = 50;

  if (isMate) {
    whiteWinningPct = score > 0 ? 100 : 0;
  } else {
    const cp = Math.max(-1500, Math.min(1500, score));
    whiteWinningPct = 50 + 50 * (2 / (1 + Math.exp(-0.0035 * cp)) - 1);
  }

  // Format label text
  let evalText = '0.0';
  if (isMate) {
    evalText = `M${mateInMoves || ''}`;
  } else {
    const valInPawns = (score / 100).toFixed(1);
    evalText = score > 0 ? `+${valInPawns}` : valInPawns;
  }

  return (
    <div className="flex flex-col items-center justify-between h-full w-8 bg-slate-950 rounded-xl overflow-hidden border border-slate-800 shadow-lg relative">
      {/* Black's Portion (Top) */}
      <div
        className="w-full bg-slate-900 transition-all duration-300 flex items-start justify-center pt-2"
        style={{ height: `${100 - whiteWinningPct}%` }}
      >
        {score < 0 && (
          <span className="text-[10px] font-black text-slate-100 z-10 px-0.5 rounded">
            {evalText}
          </span>
        )}
      </div>

      {/* White's Portion (Bottom) */}
      <div
        className="w-full bg-slate-100 transition-all duration-300 flex items-end justify-center pb-2"
        style={{ height: `${whiteWinningPct}%` }}
      >
        {score >= 0 && (
          <span className="text-[10px] font-black text-slate-900 z-10 px-0.5 rounded">
            {evalText}
          </span>
        )}
      </div>
    </div>
  );
};
