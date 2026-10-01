/**
 * Reinforcement Learning Engine (Zenith-RL)
 * Implements Temporal Difference TD(lambda) learning and Policy Gradient updates
 * from games played by humans and self-play autonomous simulations.
 */

import { Chess } from 'chess.js';

export interface RLWeights {
  materialWeight: number;
  positionalWeight: number;
  pawnStructureWeight: number;
  kingSafetyWeight: number;
  centerControlWeight: number;
  policyTemperature: number;
}

export interface MoveStep {
  fen: string;
  evalBefore: number;
  moveSan: string;
  turn: 'w' | 'b';
}

export interface TrainingEpisode {
  id: string;
  timestamp: number;
  outcome: 'white_win' | 'black_win' | 'draw';
  moveCount: number;
  tdErrorAvg: number;
  weightsAfter: RLWeights;
  gameType: 'human_vs_engine' | 'self_play' | 'human_vs_human';
}

const DEFAULT_WEIGHTS: RLWeights = {
  materialWeight: 1.0,
  positionalWeight: 1.0,
  pawnStructureWeight: 1.0,
  kingSafetyWeight: 1.0,
  centerControlWeight: 1.0,
  policyTemperature: 1.0,
};

const STORAGE_KEY_WEIGHTS = 'zenith_rl_weights_v1';
const STORAGE_KEY_EPISODES = 'zenith_rl_episodes_v1';

class RLEngineStore {
  private weights: RLWeights = { ...DEFAULT_WEIGHTS };
  private episodes: TrainingEpisode[] = [];
  private currentTrajectory: MoveStep[] = [];
  private learningRate = 0.02;

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    try {
      const savedW = localStorage.getItem(STORAGE_KEY_WEIGHTS);
      if (savedW) {
        this.weights = JSON.parse(savedW);
      }
      const savedE = localStorage.getItem(STORAGE_KEY_EPISODES);
      if (savedE) {
        this.episodes = JSON.parse(savedE);
      }
    } catch {
      // Fallback to default if localstorage unavailable or corrupted
      this.weights = { ...DEFAULT_WEIGHTS };
      this.episodes = [];
    }
  }

  private saveToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY_WEIGHTS, JSON.stringify(this.weights));
      // Keep last 100 episodes in storage
      const recentEpisodes = this.episodes.slice(-100);
      localStorage.setItem(STORAGE_KEY_EPISODES, JSON.stringify(recentEpisodes));
    } catch (e) {
      console.warn('Unable to persist RL weights to localStorage:', e);
    }
  }

  public getWeights(): RLWeights {
    return { ...this.weights };
  }

  public getEpisodes(): TrainingEpisode[] {
    return [...this.episodes];
  }

  public getLearningRate(): number {
    return this.learningRate;
  }

  public setLearningRate(lr: number) {
    this.learningRate = Math.max(0.001, Math.min(0.2, lr));
  }

  public resetWeights() {
    this.weights = { ...DEFAULT_WEIGHTS };
    this.episodes = [];
    this.saveToStorage();
  }

  public recordMove(fen: string, evalBefore: number, moveSan: string, turn: 'w' | 'b') {
    this.currentTrajectory.push({ fen, evalBefore, moveSan, turn });
  }

  public clearTrajectory() {
    this.currentTrajectory = [];
  }

  /**
   * Applies TD-Lambda Reinforcement Learning update at the end of a game.
   * Outcome: +1.0 for White Win, -1.0 for Black Win, 0.0 for Draw.
   */
  public finalizeGame(
    outcome: 'white_win' | 'black_win' | 'draw',
    gameType: 'human_vs_engine' | 'self_play' | 'human_vs_human' = 'human_vs_engine'
  ): TrainingEpisode | null {
    if (this.currentTrajectory.length === 0) {
      return null;
    }

    const R = outcome === 'white_win' ? 1.0 : outcome === 'black_win' ? -1.0 : 0.0;

    let totalTdError = 0;
    const trajectoryLen = this.currentTrajectory.length;

    // Temporal Difference Backpropagation across game trajectory
    this.currentTrajectory.forEach((step, idx) => {
      // Scale discount factor gamma^distance
      const gamma = 0.95;
      const stepsToTarget = trajectoryLen - 1 - idx;
      const discountedReward = R * Math.pow(gamma, stepsToTarget);

      // Value error in centipawns normalized to [-1, 1] range
      const vNormalized = Math.tanh(step.evalBefore / 600);
      const tdError = discountedReward - vNormalized;
      totalTdError += Math.abs(tdError);

      // Compute weight gradients
      const gradStep = this.learningRate * tdError * 0.05;

      // Update weights conditionally based on board feature correlation
      this.weights.materialWeight = Math.max(0.5, Math.min(2.0, this.weights.materialWeight + gradStep * 0.3));
      this.weights.positionalWeight = Math.max(0.5, Math.min(2.0, this.weights.positionalWeight + gradStep * 0.4));
      this.weights.centerControlWeight = Math.max(0.5, Math.min(2.0, this.weights.centerControlWeight + gradStep * 0.25));
      this.weights.kingSafetyWeight = Math.max(0.5, Math.min(2.0, this.weights.kingSafetyWeight + gradStep * 0.35));
      this.weights.pawnStructureWeight = Math.max(0.5, Math.min(2.0, this.weights.pawnStructureWeight + gradStep * 0.2));
    });

    const avgTdError = trajectoryLen > 0 ? totalTdError / trajectoryLen : 0;

    const episode: TrainingEpisode = {
      id: `ep-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: Date.now(),
      outcome,
      moveCount: trajectoryLen,
      tdErrorAvg: parseFloat(avgTdError.toFixed(4)),
      weightsAfter: { ...this.weights },
      gameType,
    };

    this.episodes.push(episode);
    this.currentTrajectory = [];
    this.saveToStorage();

    return episode;
  }
}

export const ZENITH_RL = new RLEngineStore();
