import React, { useState, useEffect } from 'react';
import { ZENITH_RL, RLWeights, TrainingEpisode } from '../engine/rlEngine';
import { ChessSearchEngine } from '../engine/search';
import { Chess } from 'chess.js';
import { Brain, Play, RefreshCw, Download, Upload, Zap, Sparkles, CheckCircle2, Sliders, TrendingUp } from 'lucide-react';

interface RLTrainingPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onWeightsUpdated?: () => void;
}

export const RLTrainingPanel: React.FC<RLTrainingPanelProps> = ({
  isOpen,
  onClose,
  onWeightsUpdated,
}) => {
  const [weights, setWeights] = useState<RLWeights>(ZENITH_RL.getWeights());
  const [episodes, setEpisodes] = useState<TrainingEpisode[]>(ZENITH_RL.getEpisodes());
  const [learningRate, setLearningRate] = useState<number>(ZENITH_RL.getLearningRate());

  // Autonomous Self-Play Simulation State
  const [isSimulating, setIsSimulating] = useState(false);
  const [simTargetGames, setSimTargetGames] = useState<number>(5);
  const [simCompletedGames, setSimCompletedGames] = useState<number>(0);
  const [simCurrentMoves, setSimCurrentMoves] = useState<number>(0);
  const [simStatusMsg, setSimStatusMsg] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      refreshData();
    }
  }, [isOpen]);

  const refreshData = () => {
    setWeights(ZENITH_RL.getWeights());
    setEpisodes(ZENITH_RL.getEpisodes());
    setLearningRate(ZENITH_RL.getLearningRate());
    if (onWeightsUpdated) onWeightsUpdated();
  };

  const handleLearningRateChange = (lr: number) => {
    setLearningRate(lr);
    ZENITH_RL.setLearningRate(lr);
  };

  const handleResetWeights = () => {
    if (window.confirm('Reset Zenith-RL learned weights back to baseline defaults?')) {
      ZENITH_RL.resetWeights();
      refreshData();
    }
  };

  const handleExportWeights = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(weights, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `zenith_rl_weights_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImportWeights = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target?.result as string);
        if (typeof imported.materialWeight === 'number') {
          localStorage.setItem('zenith_rl_weights_v1', JSON.stringify(imported));
          refreshData();
          alert('Successfully loaded imported RL neural weights!');
        }
      } catch {
        alert('Invalid RL weights JSON file format.');
      }
    };
    reader.readAsText(file);
  };

  // Run Autonomous High-Speed Self-Play
  const startSelfPlaySimulation = async () => {
    setIsSimulating(true);
    setSimCompletedGames(0);
    setSimStatusMsg('Initializing self-play engine agents...');

    const engineW = new ChessSearchEngine();
    const engineB = new ChessSearchEngine();

    for (let gameIdx = 0; gameIdx < simTargetGames; gameIdx++) {
      setSimStatusMsg(`Playing Game ${gameIdx + 1} of ${simTargetGames}...`);
      const game = new Chess();
      ZENITH_RL.clearTrajectory();

      let moveCount = 0;
      const maxMoves = 100; // Limit self-play games to max 100 moves to keep fast

      while (!game.isGameOver() && moveCount < maxMoves) {
        setSimCurrentMoves(moveCount + 1);

        const currentTurn = game.turn();
        const searchEngine = currentTurn === 'w' ? engineW : engineB;

        const res = searchEngine.findBestMove(game.fen(), {
          maxDepth: 3, // Fast depth for high-throughput self-play training
          timeLimitMs: 250,
          useTranspositionTable: true,
          usePolicyCache: true,
          policyWeight: 1.0,
          quiescenceSearch: true,
        });

        if (!res.bestMove) break;

        // Record step in RL experience trajectory
        ZENITH_RL.recordMove(game.fen(), res.evalScore, res.bestMove.san, currentTurn);

        game.move({
          from: res.bestMove.from,
          to: res.bestMove.to,
          promotion: res.bestMove.promotion,
        });

        moveCount++;

        // Yield to browser UI briefly every 5 moves
        if (moveCount % 5 === 0) {
          await new Promise((r) => setTimeout(r, 20));
        }
      }

      // Determine outcome
      let outcome: 'white_win' | 'black_win' | 'draw' = 'draw';
      if (game.isCheckmate()) {
        outcome = game.turn() === 'w' ? 'black_win' : 'white_win';
      }

      // Finalize TD-Learning update for this episode
      ZENITH_RL.finalizeGame(outcome, 'self_play');
      setSimCompletedGames(gameIdx + 1);
      refreshData();
    }

    setIsSimulating(false);
    setSimStatusMsg(`Completed ${simTargetGames} self-play episodes! Weights updated.`);
  };

  if (!isOpen) return null;

  const totalGames = episodes.length;
  const avgLoss = episodes.length > 0
    ? (episodes.reduce((acc, ep) => acc + ep.tdErrorAvg, 0) / episodes.length).toFixed(4)
    : '0.0000';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-indigo-500/30 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <Brain className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Zenith-RL Neural Reinforcement Lab
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono">
                  Active On-Policy
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Temporal Difference TD(λ) learning and experience replay weights updated live from games
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
          >
            Close
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-200">
          {/* Top Metrics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800/80 flex flex-col gap-1">
              <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Total Episodes</span>
              <span className="text-xl font-black text-indigo-400 font-mono">{totalGames}</span>
            </div>
            <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800/80 flex flex-col gap-1">
              <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Avg TD-Loss Error</span>
              <span className="text-xl font-black text-amber-400 font-mono">{avgLoss}</span>
            </div>
            <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800/80 flex flex-col gap-1">
              <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Learning Rate (η)</span>
              <span className="text-xl font-black text-cyan-400 font-mono">{learningRate}</span>
            </div>
            <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800/80 flex flex-col gap-1">
              <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Storage Status</span>
              <span className="text-xs font-bold text-emerald-400 flex items-center gap-1 mt-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Persisted
              </span>
            </div>
          </div>

          {/* Learned Feature Weights Controls (Read-Only Telemetry) */}
          <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-indigo-400" />
                Learned Evaluation Feature Weights
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/30">
                  Read-Only Telemetry
                </span>
                <button
                  onClick={handleExportWeights}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 font-medium flex items-center gap-1.5 transition"
                >
                  <Download className="w-3.5 h-3.5" /> Export
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="space-y-2">
                <div className="flex justify-between text-slate-300">
                  <span>Material Balance Weight (w_mat)</span>
                  <span className="font-mono text-indigo-400 font-bold">{weights.materialWeight.toFixed(3)}</span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div className="bg-indigo-500 h-full transition-all" style={{ width: `${(weights.materialWeight / 2) * 100}%` }} />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-slate-300">
                  <span>Positional Piece-Square (w_pos)</span>
                  <span className="font-mono text-cyan-400 font-bold">{weights.positionalWeight.toFixed(3)}</span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div className="bg-cyan-500 h-full transition-all" style={{ width: `${(weights.positionalWeight / 2) * 100}%` }} />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-slate-300">
                  <span>Center Control Weight (w_center)</span>
                  <span className="font-mono text-emerald-400 font-bold">{weights.centerControlWeight.toFixed(3)}</span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full transition-all" style={{ width: `${(weights.centerControlWeight / 2) * 100}%` }} />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-slate-300">
                  <span>King Safety Weight (w_king)</span>
                  <span className="font-mono text-amber-400 font-bold">{weights.kingSafetyWeight.toFixed(3)}</span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div className="bg-amber-500 h-full transition-all" style={{ width: `${(weights.kingSafetyWeight / 2) * 100}%` }} />
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <span>Learning Rate (η):</span>
                <span className="font-mono text-indigo-300 font-bold">{learningRate}</span>
              </div>
              <span className="text-[11px] text-slate-500 italic">
                Weights automatically adapt on game completion via TD(λ) backpropagation
              </span>
            </div>
          </div>

          {/* Self-Play Autonomous Simulation Section */}
          <div className="bg-slate-950/60 p-4 rounded-xl border border-indigo-500/20 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  Autonomous High-Speed Self-Play Training
                </h3>
                <p className="text-xs text-slate-400">
                  Runs self-play games between internal AI instances to automatically generate training trajectories and update weights
                </p>
              </div>

              {!isSimulating ? (
                <div className="flex items-center gap-2">
                  <select
                    value={simTargetGames}
                    onChange={(e) => setSimTargetGames(parseInt(e.target.value))}
                    className="bg-slate-800 text-slate-200 text-xs px-2.5 py-1.5 rounded-lg border border-slate-700"
                  >
                    <option value={3}>3 Games</option>
                    <option value={5}>5 Games</option>
                    <option value={10}>10 Games</option>
                  </select>
                  <button
                    onClick={startSelfPlaySimulation}
                    className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-indigo-600/30 transition"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" /> Start Training
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-xs text-amber-400 font-bold animate-pulse">
                  <Zap className="w-4 h-4 fill-current" /> Simulating...
                </div>
              )}
            </div>

            {isSimulating && (
              <div className="space-y-2 bg-slate-900/90 p-3 rounded-lg border border-indigo-500/30">
                <div className="flex justify-between text-xs text-slate-300 font-mono">
                  <span>{simStatusMsg}</span>
                  <span>
                    Game {simCompletedGames + 1} / {simTargetGames} (Move {simCurrentMoves})
                  </span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-indigo-500 to-amber-500 h-full transition-all duration-150"
                    style={{ width: `${(simCompletedGames / simTargetGames) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Episode Training Log Table */}
          <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80 space-y-3">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-cyan-400" />
              Recent Training Episode History
            </h3>

            {episodes.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500 italic bg-slate-900/40 rounded-lg">
                No games played yet. Play a game vs Zenith-RL or run an Autonomous Self-Play simulation to see episode learning logs.
              </div>
            ) : (
              <div className="overflow-x-auto max-h-48 overflow-y-auto rounded-lg border border-slate-800">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] sticky top-0">
                    <tr>
                      <th className="p-2">Episode</th>
                      <th className="p-2">Outcome</th>
                      <th className="p-2">Type</th>
                      <th className="p-2">Moves</th>
                      <th className="p-2">Avg TD Error</th>
                      <th className="p-2">Mat Wt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {episodes.slice().reverse().map((ep) => (
                      <tr key={ep.id} className="hover:bg-slate-900/50">
                        <td className="p-2 text-slate-400 text-[11px]">{new Date(ep.timestamp).toLocaleTimeString()}</td>
                        <td className="p-2 font-bold">
                          {ep.outcome === 'white_win' && <span className="text-emerald-400">White Win (+1.0)</span>}
                          {ep.outcome === 'black_win' && <span className="text-rose-400">Black Win (-1.0)</span>}
                          {ep.outcome === 'draw' && <span className="text-amber-400">Draw (0.0)</span>}
                        </td>
                        <td className="p-2 text-slate-300 text-[11px]">{ep.gameType}</td>
                        <td className="p-2 text-slate-300">{ep.moveCount}</td>
                        <td className="p-2 text-amber-300">{ep.tdErrorAvg}</td>
                        <td className="p-2 text-indigo-300">{ep.weightsAfter.materialWeight.toFixed(3)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
