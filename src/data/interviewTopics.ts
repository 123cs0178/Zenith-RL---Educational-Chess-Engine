import { InterviewTopic } from '../types';

export const INTERVIEW_TOPICS: InterviewTopic[] = [
  {
    id: 'ml-pipeline',
    title: '1. Machine Learning Pipeline & Policy Network',
    category: 'ML & Deep Learning',
    summary: 'How chess positions are converted to 12x8x8 tensors, passed to CNN policy networks, mapped to 8192 move logits, and trained using Cross-Entropy Loss.',
    keyConcepts: [
      'FEN Board Encoding into [12, 8, 8] Tensor',
      'Move Vocabulary Mapping (8192 output logits)',
      'Top-1 vs Top-5 Accuracy in Human Prediction (16.92% vs 37.92%)',
      'Policy Networks as Move Order Priors vs Direct Evaluators',
      'CrossEntropyLoss & Adam Optimizer'
    ],
    codeHighlightSnippet: `// 12 Board Planes: 6 White Piece Types + 6 Black Piece Types
// Flattened shape: [batch, 12, 8, 8]
const tensor = new Float32Array(12 * 8 * 8);

// Channel mapping: P=0, N=1, B=2, R=3, Q=4, K=5, p=6, n=7, b=8, r=9, q=10, k=11
const flatIndex = channel * 64 + rank * 8 + file;
tensor[flatIndex] = 1.0;`,
    interviewQuestions: [
      {
        question: 'Why is a 16.92% Top-1 accuracy considered strong for a chess policy network?',
        answer: 'Chess is an open game where a single position often has 30+ legal moves, with 3-5 equally sound positional or tactical alternatives. Human grandmasters differ in style, so predicting the exact move played in a dataset of 288k games is inherently multi-modal. Achieving ~38% Top-5 accuracy means the model reliably includes the human grandmaster move in its top candidate list, which makes it an exceptional move order prior for search pruning.',
        keyTakeaway: 'In move selection, policy networks serve as probability distributions over move spaces, not absolute single-move output classifiers.'
      },
      {
        question: 'How does board encoding affect CNN feature learning in chess?',
        answer: 'Using a 12-channel 8x8 spatial tensor preserves 2D geometric locality. 3x3 convolution kernels naturally learn spatial tactical motifs like knight forks, bishop diagonals, pawn chains, and king battery attacks across neighboring squares without needing manual feature extraction.',
        keyTakeaway: '2D Spatial convolutions map directly to the 8x8 physical geometry of the chessboard.'
      }
    ]
  },
  {
    id: 'alpha-beta-search',
    title: '2. Alpha-Beta Pruning, Minimax & Quiescence',
    category: 'Game Theory & Search',
    summary: 'Minimax decision tree search optimized via Alpha-Beta cutoffs, Iterative Deepening, and Quiescence Search to eliminate the Horizon Effect.',
    keyConcepts: [
      'Minimax Game Tree Search & Negamax Formulation',
      'Alpha-Beta Fail-High Cutoffs & Move Ordering Impact',
      'The Horizon Effect & Quiescence Search (Captures search)',
      'Iterative Deepening & Hard Time Limits',
      'MVV-LVA (Most Valuable Victim - Least Valuable Attacker)'
    ],
    codeHighlightSnippet: `// Negamax with Alpha-Beta Pruning & Fail-High Cutoff
for (const item of moves) {
  chess.makeMove(item.move);
  const score = -this.alphaBeta(chess, depth - 1, -beta, -alpha, config, ply + 1);
  chess.undo();

  if (score > bestScore) bestScore = score;
  if (score > alpha) alpha = score;
  if (alpha >= beta) break; // Beta Cutoff (Fail-High)
}`,
    interviewQuestions: [
      {
        question: 'What is the Horizon Effect, and how does Quiescence Search solve it?',
        answer: 'The Horizon Effect occurs when depth-limited search stops at a fixed depth $D$, right before a major tactical event (e.g. evaluating a position after a Queen captures a Rook, but before the opponent recaptures the Queen). Quiescence Search resolves this by extending search strictly for capture/tactic moves until the position becomes "quiet", ensuring static evaluation is never called mid-tactical trade.',
        keyTakeaway: 'Quiescence search ensures tactical stability before invoking static position evaluation.'
      },
      {
        question: 'How does move ordering reduce the effective branching factor of search?',
        answer: 'Standard minimax searches $O(B^D)$ nodes, where $B$ is branching factor (~35 in chess) and $D$ is depth. With optimal move ordering (evaluating the best move first), Alpha-Beta reduces the search space to $O(B^{D/2}) = O(\\sqrt{N})$, effectively doubling the reachable search depth for the exact same node budget.',
        keyTakeaway: 'Optimal move ordering cuts search depth complexity in half.'
      }
    ]
  },
  {
    id: 'zobrist-transposition',
    title: '3. Zobrist Hashing & Transposition Tables',
    category: 'Engine Architecture',
    summary: 'Using 64-bit Zobrist pseudo-random XOR keys to uniquely identify positions and prevent duplicate sub-tree searches across move transpositions.',
    keyConcepts: [
      'Zobrist Bitwise XOR Hashing',
      'Transposition Table Flags (EXACT, LOWERBOUND, UPPERBOUND)',
      'Tree Transpositions (e.g. 1. e4 e5 2. Nf3 vs 1. Nf3 e5 2. e4)',
      'LRU Eviction & Replacement Strategies'
    ],
    codeHighlightSnippet: `// 64-bit Zobrist Hash via Bitwise XOR
let hash = 0n;
hash ^= ZOBRIST_KEYS.pieceKeys[pieceIndex][squareIndex];
if (activeColor === 'b') hash ^= ZOBRIST_KEYS.blackToMoveKey;
hash ^= ZOBRIST_KEYS.castlingKeys[castleMask];`,
    interviewQuestions: [
      {
        question: 'How does Zobrist Hashing enable O(1) incremental board updates during search?',
        answer: 'Zobrist assign a 64-bit random integer to each (piece, square) pair, turn, castling right, and en-passant file. Because XOR operations are self-inverting ($A \\oplus A = 0$), making or undoing a move only requires XORing out the moving piece from its source square and XORing it into the target square. This maintains a 64-bit hash in $O(1)$ constant time without re-scanning the board.',
        keyTakeaway: 'Zobrist XOR property allows constant-time hash updating on move execution.'
      },
      {
        question: 'What are the three flags stored in a Transposition Table entry and why are they required?',
        answer: '1. EXACT: Position was fully searched with exact minimax value. 2. LOWERBOUND (Fail-High): A move caused a beta cutoff, meaning the true score is at least this value. 3. UPPERBOUND (Fail-Low): No move improved alpha, meaning the true score is at most this value. These bounds allow subsequent branches reaching the same position to prune safely without losing mathematical minimax guarantees.',
        keyTakeaway: 'Transposition entries preserve exact values or directional bounds for safe pruning.'
      }
    ]
  },
  {
    id: 'policy-caching-bottleneck',
    title: '4. Neural Inference Bottlenecks & Policy Caching',
    category: 'Systems & Optimization',
    summary: 'Eliminating the bottleneck of repeated neural network inference during search using LRU in-memory policy caching.',
    keyConcepts: [
      'Neural Network Forward Pass Latency vs Search Tree Throughput',
      'In-Process Memory Caching vs Redis Latency Trade-offs',
      'Hit Rate Tracking & Cache Eviction Policies',
      'Combining Neural Priors with Piece-Square Static Evaluators'
    ],
    codeHighlightSnippet: `// LRU In-Process Policy Cache Lookup
export function predictPolicyPriors(chess: Chess, useCache = true) {
  const fen = chess.fen();
  if (useCache) {
    const cached = GLOBAL_POLICY_CACHE.get(fen);
    if (cached) return cached; // Prevents 5ms NN pass per node!
  }
  // ... compute & set cache
}`,
    interviewQuestions: [
      {
        question: 'Why is in-process memory caching preferred over Redis for single-process search engines?',
        answer: 'Network or IPC calls to Redis incur a ~0.5ms - 2ms round-trip latency. In a chess engine evaluating 50,000+ nodes per second, IPC latency would completely bottleneck the search. An in-process Map/LRU cache operates in ~5 nanoseconds (100,000x faster than Redis), allowing millions of cache lookups per second with zero serialization overhead.',
        keyTakeaway: 'Engine search trees require sub-microsecond in-process lookup speed.'
      },
      {
        question: 'How does policy weighting combine human priors with tactical search?',
        answer: 'The search orders moves using a combined score: $S = S_{\\text{TT}} + S_{\\text{Tactics}} + w \\cdot P(\\text{human move})$. The policy prior acts as a heuristic move ordering guide. If two moves are evaluated as tactically equal (+0.25 pawns), the move with higher policy probability $P$ is chosen, creating human-like, practical chess without risking blunders.',
        keyTakeaway: 'Neural priors guide move ordering; classical search guarantees tactical soundness.'
      }
    ]
  }
];
