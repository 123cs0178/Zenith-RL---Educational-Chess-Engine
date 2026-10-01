import React from 'react';
import { History, RotateCcw, Play, ArrowLeft } from 'lucide-react';

interface MoveHistoryTableProps {
  history: string[]; // SAN array e.g. ['e4', 'e5', 'Nf3', 'Nc6']
  onUndo: () => void;
  onReset: () => void;
  turn: 'w' | 'b';
  isEngineTurn: boolean;
}

export const MoveHistoryTable: React.FC<MoveHistoryTableProps> = ({
  history,
  onUndo,
  onReset,
  turn,
  isEngineTurn,
}) => {
  // Pair moves into White & Black turns
  const pairs: { moveNum: number; white: string; black?: string }[] = [];
  for (let i = 0; i < history.length; i += 2) {
    pairs.push({
      moveNum: Math.floor(i / 2) + 1,
      white: history[i],
      black: history[i + 1],
    });
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col gap-4 text-slate-100 h-full">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-indigo-400" />
          <h2 className="text-base font-bold text-slate-100">Move Log</h2>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400">Turn:</span>
          <span
            className={`px-2.5 py-1 rounded-full font-bold uppercase ${
              turn === 'w' ? 'bg-slate-100 text-slate-900' : 'bg-slate-800 text-slate-100 border border-slate-700'
            }`}
          >
            {turn === 'w' ? 'White' : 'Black'}
          </span>
        </div>
      </div>

      {/* Move Pair Table Container */}
      <div className="flex-1 min-h-[180px] max-h-[280px] overflow-y-auto bg-slate-950/80 rounded-xl border border-slate-800/80 p-2 text-xs font-mono">
        {pairs.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-500 italic py-8">
            Game started. Make a move on the board!
          </div>
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="text-slate-500 border-b border-slate-800/60 font-sans text-[11px]">
                <th className="py-1 px-2 w-12">#</th>
                <th className="py-1 px-2">White</th>
                <th className="py-1 px-2">Black</th>
              </tr>
            </thead>
            <tbody>
              {pairs.map(p => (
                <tr key={p.moveNum} className="border-b border-slate-900/50 hover:bg-slate-900/60 transition">
                  <td className="py-1.5 px-2 text-slate-500 font-bold">{p.moveNum}.</td>
                  <td className="py-1.5 px-2 text-slate-200 font-medium">{p.white}</td>
                  <td className="py-1.5 px-2 text-slate-300 font-medium">{p.black || ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Controls: Undo & Reset */}
      <div className="flex gap-3 border-t border-slate-800 pt-3">
        <button
          onClick={onUndo}
          disabled={history.length === 0 || isEngineTurn}
          className="flex-1 py-2 px-3 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl text-xs font-bold text-slate-200 flex items-center justify-center gap-1.5 transition border border-slate-700"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Undo Move
        </button>
        <button
          onClick={onReset}
          disabled={isEngineTurn}
          className="py-2 px-3 bg-rose-950/60 hover:bg-rose-900/80 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl text-xs font-bold text-rose-300 flex items-center justify-center gap-1.5 transition border border-rose-800/60"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          New Game
        </button>
      </div>
    </div>
  );
};
