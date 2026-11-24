import { BattleEngine } from '../src/game/engine.ts';
import { HEROES, HERO_LIST } from '../src/game/heroes.ts';
import type { FormationCol, FormationRow, HeroId, TeamMemberConfig } from '../src/game/types.ts';

const COLS: FormationCol[] = ['front', 'mid', 'back'];
const ROWS: FormationRow[] = ['top', 'center', 'bottom'];

function buildDisjointTeams(): [TeamMemberConfig[], TeamMemberConfig[]] {
  // Pick 6 distinct heroes (no mirrors!) so every match gives pure, unbiased WR signal
  const shuffled = [...HERO_LIST].sort(() => Math.random() - 0.5);
  const makeSide = (slice: typeof HERO_LIST): TeamMemberConfig[] => {
    const used = new Set<string>();
    return slice.map((h) => {
      const preferredCol: FormationCol =
        h.role === 'Tanque'
          ? 'front'
          : h.role === 'Espadachim' || h.role === 'Lutador' || h.role === 'Assassino'
          ? Math.random() > 0.4
            ? 'front'
            : 'mid'
          : Math.random() > 0.35
          ? 'back'
          : 'mid';
      let col = preferredCol;
      let row = ROWS[Math.floor(Math.random() * ROWS.length)];
      while (used.has(`${col}_${row}`)) {
        col = COLS[Math.floor(Math.random() * COLS.length)];
        row = ROWS[Math.floor(Math.random() * ROWS.length)];
      }
      used.add(`${col}_${row}`);
      const actives = [...h.activeSkills].sort(() => Math.random() - 0.5);
      const ult = h.ultimates[Math.floor(Math.random() * h.ultimates.length)];
      return {
        heroId: h.id,
        slot: { col, row },
        activeSkillIds: [actives[0].id, actives[1].id],
        ultimateId: ult.id,
      };
    });
  };
  return [makeSide(shuffled.slice(0, 3)), makeSide(shuffled.slice(3, 6))];
}

function evalRoster(matches: number): Record<HeroId, { games: number; wins: number; wr: number }> {
  const stats = {} as Record<HeroId, { games: number; wins: number; wr: number }>;
  for (const h of HERO_LIST) stats[h.id] = { games: 0, wins: 0, wr: 0.5 };

  for (let i = 0; i < matches; i++) {
    const [t1, t2] = buildDisjointTeams();
    const engine = new BattleEngine(t1, t2, 1.0);
    while (!engine.finished) engine.step(1 / 25);
    const res = engine.result!;
    for (const st of res.stats) {
      stats[st.heroId].games++;
      if (res.winner === st.side) stats[st.heroId].wins++;
    }
  }
  for (const h of HERO_LIST) {
    stats[h.id].wr = stats[h.id].wins / Math.max(1, stats[h.id].games);
  }
  return stats;
}

const ROUNDS = 7;
for (let r = 1; r <= ROUNDS; r++) {
  const matches = r <= 3 ? 1600 : 2400;
  const res = evalRoster(matches);
  const spread =
    Math.max(...HERO_LIST.map((h) => res[h.id].wr)) -
    Math.min(...HERO_LIST.map((h) => res[h.id].wr));
  console.log(`\n--- Round ${r}/${ROUNDS} (${matches} disjoint matches) | Spread: ${(spread * 100).toFixed(1)}% ---`);

  const gain = r <= 3 ? 0.55 : r <= 5 ? 0.35 : 0.22;
  for (const h of HERO_LIST) {
    const wr = res[h.id].wr;
    const err = 0.5 - wr; // positive if weak, negative if strong
    if (r < ROUNDS) {
      const mult = 1 + err * gain;
      HEROES[h.id].baseStats.maxHp = Math.round(HEROES[h.id].baseStats.maxHp * mult);
      HEROES[h.id].baseStats.atk = Math.round(HEROES[h.id].baseStats.atk * (1 + err * gain * 0.9));
    }
    console.log(
      `${h.name.padEnd(8)} WR=${(wr * 100).toFixed(1).padStart(5)}% | HP=${String(
        HEROES[h.id].baseStats.maxHp
      ).padStart(4)} ATK=${String(HEROES[h.id].baseStats.atk).padStart(3)} DEF=${HEROES[h.id].baseStats.def}`
    );
  }
}

console.log('\n=== FINAL CONVERGED STATS JSON ===');
const out: Record<string, { maxHp: number; atk: number; def: number }> = {};
for (const h of HERO_LIST) {
  out[h.id] = {
    maxHp: HEROES[h.id].baseStats.maxHp,
    atk: HEROES[h.id].baseStats.atk,
    def: HEROES[h.id].baseStats.def,
  };
}
console.log(JSON.stringify(out, null, 2));
