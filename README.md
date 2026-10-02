# Zenith RL Educational Chess Engine

Zenith RL is an educational chess engine and interactive web application. Play against the engine, inspect its search telemetry, run tactical benchmarks, and explore reinforcement-learning concepts through an integrated technical guide.

## Live Demo

[Open the live application](https://zenith-rl-educational-chess-engine-541623660720.asia-south2.run.app)

## Features

- Play chess against the engine as White or Black.
- Configure search depth, time budget, policy weighting, transposition-table use, policy caching, and quiescence search.
- View engine telemetry including evaluation, principal variation, nodes searched, search depth, nodes per second, and cache statistics.
- Use opening-book recommendations, policy priors, alpha-beta search, quiescence search, and Zobrist-based transposition tables.
- Run a 10-position tactical benchmark suite with pass rate, node counts, execution time, and principal variations.
- Experiment with Zenith-RL weights, learning rate, and browser-based self-play episodes.
- Export and import RL weights locally.
- Review move history, captured material, evaluation, audio cues, and PGN clipboard export.
- Browse interview-preparation content covering machine learning, game search, optimization, and engine architecture.

## Technology Stack

- React 19 and TypeScript
- Vite
- Node.js and Express
- `chess.js`
- Tailwind CSS
- `lucide-react` and Motion
- esbuild for the production server bundle

## Run Locally

### Prerequisites

- Node.js
- npm

### Install dependencies

```bash
npm install
```

### Start the development server

```bash
npm run dev
```

The development server uses Vite middleware and listens on port `8080` by default.

### Build for production

```bash
npm run build
```

This builds the Vite frontend and bundles the Express server into `dist/server.cjs`.

### Start the production server

```bash
npm start
```

The production server serves the built frontend and listens on `process.env.PORT`, falling back to port `8080`. To use another local port:

```bash
PORT=3000 npm start
```

### Type-check

```bash
npm run lint
```

## Server API

The Express server exposes these application endpoints:

- `GET /api/health`
- `POST /api/engine/select-move`
- `POST /api/engine/policy-priors`
- `POST /api/engine/benchmark`
- `GET /api/engine/stats`
- `POST /api/engine/clear-cache`

## License

This project includes source-file licensing metadata under the Apache License 2.0.
