import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { ChessSearchEngine } from './src/engine/search';
import { runBenchmarkSuite } from './src/engine/benchmark';
import { GLOBAL_POLICY_CACHE, predictPolicyPriors } from './src/engine/policy';
import { EngineConfig } from './src/types';
import { Chess } from 'chess.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  
  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Calculate best move for a position
  app.post('/api/engine/select-move', (req, res) => {
    try {
      const { fen, config } = req.body as { fen: string; config?: Partial<EngineConfig> };
      if (!fen) {
        return res.status(400).json({ error: 'Missing fen parameter' });
      }

      const defaultConfig: EngineConfig = {
        maxDepth: config?.maxDepth ?? 5,
        timeLimitMs: config?.timeLimitMs ?? 1000,
        usePolicyCache: config?.usePolicyCache ?? true,
        useTranspositionTable: config?.useTranspositionTable ?? true,
        policyWeight: config?.policyWeight ?? 1.0,
        quiescenceSearch: config?.quiescenceSearch ?? true,
      };

      const engine = new ChessSearchEngine();
      const telemetry = engine.findBestMove(fen, defaultConfig);

      return res.json(telemetry);
    } catch (error: any) {
      console.error('Error in /api/engine/select-move:', error);
      return res.status(500).json({ error: error.message || 'Internal engine error' });
    }
  });

  // Get policy predictions for legal moves
  app.post('/api/engine/policy-priors', (req, res) => {
    try {
      const { fen } = req.body;
      if (!fen) {
        return res.status(400).json({ error: 'Missing fen parameter' });
      }
      const chess = new Chess(fen);
      const priors = predictPolicyPriors(chess, true);
      return res.json({ priors });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  // Run tactical benchmark suite
  app.post('/api/engine/benchmark', (req, res) => {
    try {
      const { config } = req.body;
      const report = runBenchmarkSuite(config);
      return res.json(report);
    } catch (error: any) {
      console.error('Error in /api/engine/benchmark:', error);
      return res.status(500).json({ error: error.message || 'Benchmark error' });
    }
  });

  // Get current cache statistics
  app.get('/api/engine/stats', (req, res) => {
    const stats = GLOBAL_POLICY_CACHE.getStats();
    return res.json(stats);
  });

  // Clear policy cache
  app.post('/api/engine/clear-cache', (req, res) => {
    GLOBAL_POLICY_CACHE.clear();
    return res.json({ message: 'Policy cache cleared', stats: GLOBAL_POLICY_CACHE.getStats() });
  });

  // Vite middleware or Static files serving
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Chess Engine Server running on http://localhost:${PORT}`);
  });
}

startServer();
