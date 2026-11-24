import type { SaveData } from './types';
import { DEFAULT_PLAYER_TEAM, DEFAULT_TRAINING_ENEMY_TEAM } from './heroes';

const STORAGE_KEY = 'kizuna_arena_save_v1';

export function getDefaultSave(): SaveData {
  return {
    highestFloorCleared: 0,
    playerTeam: structuredClone(DEFAULT_PLAYER_TEAM),
    trainingEnemyTeam: structuredClone(DEFAULT_TRAINING_ENEMY_TEAM),
    totalWins: 0,
    totalBattles: 0,
  };
}

export function loadSaveData(): SaveData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaultSave();
    const parsed = JSON.parse(raw) as Partial<SaveData>;
    return {
      highestFloorCleared: parsed.highestFloorCleared ?? 0,
      playerTeam:
        Array.isArray(parsed.playerTeam) && parsed.playerTeam.length === 3
          ? parsed.playerTeam
          : structuredClone(DEFAULT_PLAYER_TEAM),
      trainingEnemyTeam:
        Array.isArray(parsed.trainingEnemyTeam) && parsed.trainingEnemyTeam.length === 3
          ? parsed.trainingEnemyTeam
          : structuredClone(DEFAULT_TRAINING_ENEMY_TEAM),
      totalWins: parsed.totalWins ?? 0,
      totalBattles: parsed.totalBattles ?? 0,
    };
  } catch {
    return getDefaultSave();
  }
}

export function persistSaveData(data: SaveData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // ignore storage quota errors
  }
}
