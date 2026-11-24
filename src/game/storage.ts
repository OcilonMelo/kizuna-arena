import type { FormationCol, FormationRow, SaveData, TeamMemberConfig } from './types';
import { DEFAULT_PLAYER_TEAM, DEFAULT_TRAINING_ENEMY_TEAM, HERO_LIST, createDefaultMember } from './heroes';

const STORAGE_KEY = 'kizuna_arena_save_v1';
const COLS: FormationCol[] = ['front', 'mid', 'back'];
const ROWS: FormationRow[] = ['top', 'center', 'bottom'];

function ensureFiveMembers(
  team: TeamMemberConfig[] | undefined,
  fallback: TeamMemberConfig[]
): TeamMemberConfig[] {
  if (!Array.isArray(team) || team.length === 0) return structuredClone(fallback);
  const next = team.slice(0, 5);
  const usedHeroes = new Set(next.map((m) => m.heroId));
  const usedSlots = new Set(next.map((m) => `${m.slot.col}_${m.slot.row}`));

  while (next.length < 5) {
    const candidate =
      fallback.find((f) => !usedHeroes.has(f.heroId)) ??
      createDefaultMember(
        HERO_LIST.find((h) => !usedHeroes.has(h.id))!.id,
        'mid',
        'center'
      );
    let col = candidate.slot.col;
    let row = candidate.slot.row;
    if (usedSlots.has(`${col}_${row}`)) {
      outer: for (const c of COLS) {
        for (const r of ROWS) {
          if (!usedSlots.has(`${c}_${r}`)) {
            col = c;
            row = r;
            break outer;
          }
        }
      }
    }
    usedHeroes.add(candidate.heroId);
    usedSlots.add(`${col}_${row}`);
    next.push({ ...structuredClone(candidate), slot: { col, row } });
  }
  return next;
}

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
      playerTeam: ensureFiveMembers(parsed.playerTeam, DEFAULT_PLAYER_TEAM),
      trainingEnemyTeam: ensureFiveMembers(
        parsed.trainingEnemyTeam,
        DEFAULT_TRAINING_ENEMY_TEAM
      ),
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
