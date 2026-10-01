import React, { useState } from 'react';
import { BenchmarkSuiteReport, EngineConfig } from '../types';
import { Play, CheckCircle2, XCircle, Gauge, Cpu, Timer, RefreshCw, Layers } from 'lucide-react';

interface BenchmarkSuiteModalProps {
  config: EngineConfig;
}

export const BenchmarkSuiteModal: React.FC<BenchmarkSuiteModalProps> = ({ config }) => {
  const [isRunning, setIsRunning] = useState(false);
  const [report, setReport] = useState<BenchmarkSuiteReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRunBenchmark = async () => {
    setIsRunning(true);
    setError(null);
    try {
      const response = await fetch('/api/engine/benchmark', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to run benchmark`);
      }

      const data: BenchmarkSuiteReport = await response.json();
      setReport(data);
    } catch (err: any) {
      setError(err.message || 'Benchmark execution error');
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl text-slate-100 max-w-5xl mx-auto flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Cpu className="w-6 h-6 text-indigo-400" />
            <h2 className="text-xl font-extrabold">Tactical Benchmark & Engine Profiler</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Evaluates engine tactical precision, search speed, and policy caching across 10 tactical test scenarios.
          </p>
        </div>

        <button
          onClick={handleRunBenchmark}
          disabled={isRunning}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition shadow-lg shadow-indigo-500/20"
        >
          {isRunning ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Running Suite...</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              <span>Run Tactical Test Suite</span>
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="p-4 bg-rose-950/80 border border-rose-800 rounded-xl text-rose-200 text-xs font-mono">
          {error}
        </div>
      )}

      {/* Summary Metrics (if report available) */}
      {report && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
            <div className="text-xs text-slate-400 mb-1">Accuracy Score</div>
            <div className="text-2xl font-black text-indigo-400">
              {report.passedCount} / {report.totalTests}
            </div>
            <div className="text-[10px] text-slate-500 mt-1">
              {Math.round((report.passedCount / report.totalTests) * 100)}% Pass Rate
            </div>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
            <div className="text-xs text-slate-400 mb-1">Total Nodes Searched</div>
            <div className="text-2xl font-black text-amber-400">
              {report.totalNodes.toLocaleString()}
            </div>
            <div className="text-[10px] text-slate-500 mt-1">Across all 10 tests</div>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
            <div className="text-xs text-slate-400 mb-1">Average NPS</div>
            <div className="text-2xl font-black text-emerald-400">
              {report.averageNps.toLocaleString()}
            </div>
            <div className="text-[10px] text-slate-500 mt-1">Nodes per second</div>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
            <div className="text-xs text-slate-400 mb-1">Total Time</div>
            <div className="text-2xl font-black text-cyan-400">
              {report.totalDurationMs} ms
            </div>
            <div className="text-[10px] text-slate-500 mt-1">Suite execution time</div>
          </div>
        </div>
      )}

      {/* Results Table */}
      {report ? (
        <div className="overflow-x-auto bg-slate-950 rounded-xl border border-slate-800">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="bg-slate-900 text-slate-400 border-b border-slate-800 font-sans text-xs">
                <th className="p-3">Status</th>
                <th className="p-3">Test Scenario</th>
                <th className="p-3">Expected Move</th>
                <th className="p-3">Engine Found</th>
                <th className="p-3 text-right">Nodes</th>
                <th className="p-3 text-right">Time</th>
                <th className="p-3">PV Line</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {report.results.map(res => (
                <tr key={res.id} className="hover:bg-slate-900/50 transition">
                  <td className="p-3">
                    {res.isCorrect ? (
                      <span className="inline-flex items-center gap-1 text-emerald-400 font-bold bg-emerald-950/60 border border-emerald-800 px-2 py-0.5 rounded-md">
                        <CheckCircle2 className="w-3.5 h-3.5" /> PASS
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-rose-400 font-bold bg-rose-950/60 border border-rose-800 px-2 py-0.5 rounded-md">
                        <XCircle className="w-3.5 h-3.5" /> FAIL
                      </span>
                    )}
                  </td>
                  <td className="p-3 font-semibold font-sans text-slate-200">
                    {res.title}
                    <div className="text-[10px] text-slate-500">{res.category}</div>
                  </td>
                  <td className="p-3 text-emerald-300">{res.expectedMove}</td>
                  <td
                    className={`p-3 font-bold ${
                      res.isCorrect ? 'text-indigo-400' : 'text-rose-400'
                    }`}
                  >
                    {res.foundMove}
                  </td>
                  <td className="p-3 text-right text-slate-300">{res.nodes.toLocaleString()}</td>
                  <td className="p-3 text-right text-cyan-400">{res.durationMs} ms</td>
                  <td className="p-3 text-slate-400 max-w-[200px] truncate">
                    {res.pv.join(' ')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-slate-950 rounded-xl border border-slate-800 p-12 text-center text-slate-500 text-xs">
          Click "Run Tactical Test Suite" above to benchmark the search engine's performance.
        </div>
      )}
    </div>
  );
};
