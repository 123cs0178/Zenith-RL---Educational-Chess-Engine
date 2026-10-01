/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Chess, Square } from 'chess.js';
import { ChessBoard } from './components/ChessBoard';
import { MaterialAdvantageDisplay } from './components/MaterialAdvantageDisplay';
import { EvalBar } from './components/EvalBar';
import { EngineTelemetryPanel } from './components/EngineTelemetryPanel';
import { MoveHistoryTable } from './components/MoveHistoryTable';
import { BenchmarkSuiteModal } from './components/BenchmarkSuiteModal';
import { RLTrainingPanel } from './components/RLTrainingPanel';
import { ZENITH_RL } from './engine/rlEngine';
import { SOUND_FX } from './utils/audio';
import { EngineConfig, SearchTelemetry } from './types';
import {
  Gamepad2,
  Gauge,
  Cpu,
  RotateCcw,
  Sparkles,
  Bot,
  User,
  Zap,
  Brain,
  Volume2,
  VolumeX,
  Copy,
  Check,
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'play' | 'benchmark'>('play');
  const [isRLModalOpen, setIsRLModalOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [copiedPgn, setCopiedPgn] = useState(false);

  // Game state
  const chessRef = useRef(new Chess());
  const [fen, setFen] = useState(chessRef.current.fen());
  const [history, setHistory] = useState<string[]>([]);
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);
  const [userColor, setUserColor] = useState<'w' | 'b'>('w');

  // Engine state & configuration
  const [isSearching, setIsSearching] = useState(false);
  const [telemetry, setTelemetry] = useState<SearchTelemetry | null>(null);
  const [config, setConfig] = useState<EngineConfig>({
    maxDepth: 5,
    timeLimitMs: 1200,
    usePolicyCache: true,
    useTranspositionTable: true,
    policyWeight: 1.0,
    quiescenceSearch: true,
  });

  // Game status
  const currentTurn = chessRef.current.turn();
  const isGameOver = chessRef.current.isGameOver();
  const isEngineTurn = currentTurn !== userColor && !isGameOver;

  const toggleSound = () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    SOUND_FX.setEnabled(!newMuted);
  };

  const handleCopyPgn = () => {
    const pgnText = chessRef.current.pgn() || '[Event "Zenith-RL Neural Chess Match"]\n1. e4';
    navigator.clipboard.writeText(pgnText);
    setCopiedPgn(true);
    setTimeout(() => setCopiedPgn(false), 2000);
  };

  // Trigger engine move when it's engine's turn
  useEffect(() => {
    if (isEngineTurn && activeTab === 'play') {
      makeEngineMove();
    }
  }, [fen, userColor, activeTab]);

  const playAudioCue = (isCaptured: boolean) => {
    if (chessRef.current.isGameOver()) {
      SOUND_FX.playGameOver();
    } else if (chessRef.current.inCheck()) {
      SOUND_FX.playCheck();
    } else if (isCaptured) {
      SOUND_FX.playCapture();
    } else {
      SOUND_FX.playMove();
    }
  };

  const checkAndFinalizeRL = () => {
    if (chessRef.current.isGameOver()) {
      let outcome: 'white_win' | 'black_win' | 'draw' = 'draw';
      if (chessRef.current.isCheckmate()) {
        outcome = chessRef.current.turn() === 'w' ? 'black_win' : 'white_win';
      }
      ZENITH_RL.finalizeGame(outcome, 'human_vs_engine');
    }
  };

  const makeEngineMove = async () => {
    setIsSearching(true);
    try {
      const response = await fetch('/api/engine/select-move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fen, config }),
      });

      if (!response.ok) {
        throw new Error('Failed to compute move');
      }

      const data: SearchTelemetry = await response.json();
      setTelemetry(data);

      if (data.bestMove) {
        // Record step in RL trajectory
        ZENITH_RL.recordMove(fen, data.evalScore, data.bestMove.san, currentTurn);

        const moveResult = chessRef.current.move({
          from: data.bestMove.from,
          to: data.bestMove.to,
          promotion: data.bestMove.promotion,
        });

        if (moveResult) {
          setFen(chessRef.current.fen());
          setHistory(chessRef.current.history());
          setLastMove({ from: moveResult.from, to: moveResult.to });
          playAudioCue(!!moveResult.captured);
          checkAndFinalizeRL();
        }
      }
    } catch (err) {
      console.error('Error fetching engine move:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleUserMove = (from: string, to: string, promotion?: string): boolean => {
    if (isEngineTurn || isGameOver) return false;

    try {
      const preFen = chessRef.current.fen();
      const moveResult = chessRef.current.move({ from, to, promotion: promotion || 'q' });
      if (moveResult) {
        // Record move in RL trajectory
        ZENITH_RL.recordMove(preFen, telemetry?.evalScore || 0, moveResult.san, userColor);

        setFen(chessRef.current.fen());
        setHistory(chessRef.current.history());
        setLastMove({ from: moveResult.from, to: moveResult.to });
        playAudioCue(!!moveResult.captured);
        checkAndFinalizeRL();
        return true;
      }
    } catch (e) {
      // Invalid move
      return false;
    }
    return false;
  };

  const handleUndo = () => {
    if (history.length === 0 || isSearching) return;
    
    // Undo 2 moves (User + Engine move)
    chessRef.current.undo();
    if (chessRef.current.turn() !== userColor && chessRef.current.history().length > 0) {
      chessRef.current.undo();
    }

    setFen(chessRef.current.fen());
    setHistory(chessRef.current.history());
    setLastMove(null);
  };

  const handleResetGame = () => {
    chessRef.current = new Chess();
    ZENITH_RL.clearTrajectory();
    setFen(chessRef.current.fen());
    setHistory([]);
    setLastMove(null);
    setTelemetry(null);
  };

  const handlePresetChange = (preset: 'fast' | 'practical' | 'deep') => {
    if (preset === 'fast') {
      setConfig({ ...config, maxDepth: 4, timeLimitMs: 500, policyWeight: 0.8 });
    } else if (preset === 'practical') {
      setConfig({ ...config, maxDepth: 5, timeLimitMs: 1200, policyWeight: 1.0 });
    } else {
      setConfig({ ...config, maxDepth: 7, timeLimitMs: 2500, policyWeight: 1.2 });
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans antialiased selection:bg-indigo-500 selection:text-white">
      {/* Top Navbar */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-50 px-4 py-3">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-amber-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
              <Brain className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h1 className="text-base font-black text-slate-100 tracking-tight flex items-center gap-2">
                Zenith-RL Neural Engine
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                  TD(λ) Reinforcement
                </span>
              </h1>
              <p className="text-[11px] text-slate-400">
                On-Policy Reinforcement Learning • Opening Book • Zobrist TT • Neural Priors
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* RL Neural Lab Button */}
            <button
              onClick={() => setIsRLModalOpen(true)}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/20 border border-indigo-400/30 flex items-center gap-1.5 transition"
            >
              <Brain className="w-4 h-4 text-amber-300" />
              <span>RL Neural Lab</span>
            </button>

            {/* Audio Toggle */}
            <button
              onClick={toggleSound}
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition"
              title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
            </button>

            {/* Tab Navigation */}
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => setActiveTab('play')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  activeTab === 'play'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Gamepad2 className="w-3.5 h-3.5" />
                <span>Play vs Bot</span>
              </button>

              <button
                onClick={() => setActiveTab('benchmark')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  activeTab === 'benchmark'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Gauge className="w-3.5 h-3.5" />
                <span>Benchmarks</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 flex flex-col gap-6">
        {activeTab === 'play' && (
          <div className="flex flex-col lg:flex-row gap-6 items-start">
            {/* Left Column: Evaluation Bar + Chess Board + Opponent Settings */}
            <div className="flex flex-col gap-4 w-full lg:w-auto items-center">
              {/* Game Status Banner */}
              <div className="w-full max-w-[560px] bg-slate-900 border border-slate-800 rounded-2xl p-3 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="flex h-2.5 w-2.5 relative">
                    <span
                      className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                        isSearching ? 'bg-amber-400' : 'bg-emerald-400'
                      }`}
                    />
                    <span
                      className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                        isSearching ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                    />
                  </span>
                  <span className="font-bold text-slate-200">
                    {isGameOver
                      ? 'Game Over'
                      : isEngineTurn
                      ? 'Engine is thinking...'
                      : 'Your Turn to move'}
                  </span>
                </div>

                {/* Color Switcher & Copy PGN */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyPgn}
                    className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-[11px] flex items-center gap-1 transition"
                    title="Copy PGN notation to clipboard"
                  >
                    {copiedPgn ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span className="text-emerald-400">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy PGN</span>
                      </>
                    )}
                  </button>

                  <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-[11px]">
                    <button
                      onClick={() => {
                        setUserColor('w');
                        handleResetGame();
                      }}
                      className={`px-2 py-0.5 rounded font-bold transition ${
                        userColor === 'w' ? 'bg-slate-200 text-slate-950' : 'text-slate-400'
                      }`}
                    >
                      Play White
                    </button>
                    <button
                      onClick={() => {
                        setUserColor('b');
                        handleResetGame();
                      }}
                      className={`px-2 py-0.5 rounded font-bold transition ${
                        userColor === 'b' ? 'bg-slate-800 text-slate-100' : 'text-slate-400'
                      }`}
                    >
                      Play Black
                    </button>
                  </div>
                </div>
              </div>

              {/* Material Advantage & Captured Pieces Display */}
              <MaterialAdvantageDisplay
                chess={chessRef.current}
                orientation={userColor}
              />

              {/* Board + Eval Bar Container */}
              <div className="flex gap-3 w-full justify-center">
                <EvalBar
                  score={telemetry?.evalScore || 0}
                  isMate={telemetry?.isMate}
                  mateInMoves={telemetry?.mateInInMoves}
                />
                <ChessBoard
                  chess={chessRef.current}
                  onMove={handleUserMove}
                  orientation={userColor}
                  disabled={isEngineTurn || isGameOver}
                  lastMove={lastMove}
                />
              </div>

              {/* Bot Difficulty Preset Bar */}
              <div className="w-full max-w-[560px] bg-slate-900 border border-slate-800 rounded-2xl p-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="text-slate-400 font-semibold flex items-center gap-1">
                  <Bot className="w-4 h-4 text-indigo-400" /> Style Preset:
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => handlePresetChange('fast')}
                    className="px-2.5 py-1 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-lg text-slate-300 transition text-[11px]"
                  >
                    Fast Blitz
                  </button>
                  <button
                    onClick={() => handlePresetChange('practical')}
                    className="px-2.5 py-1 bg-indigo-950/80 border border-indigo-800 rounded-lg text-indigo-200 font-bold transition text-[11px]"
                  >
                    Practical GM (Default)
                  </button>
                  <button
                    onClick={() => handlePresetChange('deep')}
                    className="px-2.5 py-1 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-lg text-slate-300 transition text-[11px]"
                  >
                    Deep Master
                  </button>
                </div>
              </div>
            </div>

            {/* Right Column: Engine Telemetry Panel & Move Log */}
            <div className="flex-1 w-full flex flex-col gap-6">
              <EngineTelemetryPanel
                telemetry={telemetry}
                config={config}
                onConfigChange={setConfig}
                isSearching={isSearching}
              />
              <MoveHistoryTable
                history={history}
                onUndo={handleUndo}
                onReset={handleResetGame}
                turn={currentTurn}
                isEngineTurn={isEngineTurn}
              />
            </div>
          </div>
        )}

        {activeTab === 'benchmark' && <BenchmarkSuiteModal config={config} />}
      </main>

      {/* RL Training Panel Modal */}
      <RLTrainingPanel
        isOpen={isRLModalOpen}
        onClose={() => setIsRLModalOpen(false)}
      />
    </div>
  );
}
