import React from 'react';
import { SearchTelemetry, EngineConfig } from '../types';
import { Zap, Cpu, Database, Gauge, Timer, Layers, Settings, ShieldCheck } from 'lucide-react';

interface EngineTelemetryPanelProps {
  telemetry: SearchTelemetry | null;
  config: EngineConfig;
  onConfigChange: (newConfig: EngineConfig) => void;
  isSearching: boolean;
}

export const EngineTelemetryPanel: React.FC<EngineTelemetryPanelProps> = ({
  telemetry,
  config,
  onConfigChange,
  isSearching,
}) => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col gap-5 text-slate-100">
      {/* Title Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Cpu className="w-5 h-5 text-indigo-400" />
          <h2 className="text-base font-bold text-slate-100">Engine Neural Telemetry</h2>
        </div>
        {isSearching && (
          <div className="flex items-center gap-2 text-xs text-amber-400 font-semibold animate-pulse">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            Searching Tree...
          </div>
        )}
      </div>

      {/* Telemetry Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Nodes & NPS */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Total Nodes</span>
            <Gauge className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <div className="text-lg font-black text-slate-100">
            {telemetry ? (telemetry.nodesSearched + telemetry.quiescenceNodesSearched).toLocaleString() : '0'}
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-0.5">
            {telemetry ? `${telemetry.nodesPerSecond.toLocaleString()} NPS` : '0 NPS'}
          </div>
        </div>

        {/* Policy Cache Hit Rate */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Policy Cache Hit %</span>
            <Zap className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-lg font-black text-amber-400">
            {telemetry ? `${telemetry.policyCacheHitRate}%` : '0.0%'}
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-0.5">
            {telemetry ? `${telemetry.policyCacheHits} hits` : '0 hits'}
          </div>
        </div>

        {/* Transposition Table Hits */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>TT Table Hits</span>
            <Database className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-lg font-black text-emerald-400">
            {telemetry ? telemetry.ttHits.toLocaleString() : '0'}
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-0.5">Zobrist 64-bit</div>
        </div>

        {/* Depth & Duration */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Search Depth</span>
            <Timer className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="text-lg font-black text-cyan-400">
            {telemetry ? `d = ${telemetry.maxDepthReached}` : 'd = 0'}
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-0.5">
            {telemetry ? `${telemetry.durationMs} ms` : '0 ms'}
          </div>
        </div>
      </div>

      {/* Principal Variation (PV Line) */}
      <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3">
        <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1.5 font-medium">
          <Layers className="w-3.5 h-3.5 text-indigo-400" />
          <span>Principal Variation (PV Move Tree)</span>
        </div>
        <div className="font-mono text-xs text-emerald-300 bg-slate-900 px-3 py-2 rounded-lg border border-slate-800/60 overflow-x-auto whitespace-nowrap min-h-[34px] flex items-center">
          {telemetry && telemetry.principalVariation.length > 0
            ? telemetry.principalVariation.join(' → ')
            : 'No active PV search line'}
        </div>
      </div>

      {/* Engine Controls & Sliders */}
      <div className="border-t border-slate-800 pt-4 flex flex-col gap-4">
        <div className="flex items-center justify-between text-xs text-slate-300 font-semibold">
          <div className="flex items-center gap-1.5">
            <Settings className="w-4 h-4 text-slate-400" />
            <span>Search & Policy Configuration</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          {/* Max Depth Slider */}
          <div className="flex flex-col gap-1.5 bg-slate-950/50 p-3 rounded-xl border border-slate-800">
            <div className="flex justify-between text-slate-300">
              <span>Max Depth</span>
              <span className="font-bold text-indigo-400">{config.maxDepth} plies</span>
            </div>
            <input
              type="range"
              min="1"
              max="8"
              value={config.maxDepth}
              onChange={e => onConfigChange({ ...config, maxDepth: parseInt(e.target.value, 10) })}
              className="accent-indigo-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
            />
          </div>

          {/* Time Budget Slider */}
          <div className="flex flex-col gap-1.5 bg-slate-950/50 p-3 rounded-xl border border-slate-800">
            <div className="flex justify-between text-slate-300">
              <span>Time Budget</span>
              <span className="font-bold text-indigo-400">{config.timeLimitMs} ms</span>
            </div>
            <input
              type="range"
              min="200"
              max="3000"
              step="100"
              value={config.timeLimitMs}
              onChange={e => onConfigChange({ ...config, timeLimitMs: parseInt(e.target.value, 10) })}
              className="accent-indigo-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
            />
          </div>
        </div>

        {/* Feature Toggles */}
        <div className="flex flex-wrap gap-3 text-xs">
          <label className="flex items-center gap-2 cursor-pointer bg-slate-950 px-3 py-2 rounded-xl border border-slate-800 hover:border-slate-700 transition">
            <input
              type="checkbox"
              checked={config.usePolicyCache}
              onChange={e => onConfigChange({ ...config, usePolicyCache: e.target.checked })}
              className="accent-amber-500 rounded cursor-pointer"
            />
            <span className="text-slate-300">Policy Cache</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer bg-slate-950 px-3 py-2 rounded-xl border border-slate-800 hover:border-slate-700 transition">
            <input
              type="checkbox"
              checked={config.useTranspositionTable}
              onChange={e => onConfigChange({ ...config, useTranspositionTable: e.target.checked })}
              className="accent-emerald-500 rounded cursor-pointer"
            />
            <span className="text-slate-300">Transposition Table (Zobrist)</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer bg-slate-950 px-3 py-2 rounded-xl border border-slate-800 hover:border-slate-700 transition">
            <input
              type="checkbox"
              checked={config.quiescenceSearch}
              onChange={e => onConfigChange({ ...config, quiescenceSearch: e.target.checked })}
              className="accent-cyan-500 rounded cursor-pointer"
            />
            <span className="text-slate-300">Quiescence Search</span>
          </label>
        </div>
      </div>
    </div>
  );
};
