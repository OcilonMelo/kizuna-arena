import { BattleEngine } from '../src/game/engine.ts';
import { HERO_LIST, createDefaultMember } from '../src/game/heroes.ts';
import { TOWER_FLOORS } from '../src/game/tower.ts';
import type { FormationCol, FormationRow, HeroId, TeamMemberConfig } from '../src/game/types.ts';

const COLS: FormationCol[] = ['front', 'mid', 'back'];
const ROWS: FormationRow[] = ['top', 'center', 'bottom'];

function randomTeam(): TeamMemberConfig[] {
  const pool = [...HERO_LIST].sort(() => Math.random() - 0.5).slice(0, 3);
  const usedSlots = new Set<string>();
  return pool.map((h) => {
    // Place tanks/melee preferentially in front/mid, ranged in mid/back
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
    while (usedSlots.has(`${col}_${row}`)) {
      col = COLS[Math.floor(Math.random() * COLS.length)];
      row = ROWS[Math.floor(Math.random() * ROWS.length)];
    }
    usedSlots.add(`${col}_${row}`);

    // Pick random valid moveset (2 actives + 1 ult)
    const shuffledActives = [...h.activeSkills].sort(() => Math.random() - 0.5);
    const ult = h.ultimates[Math.floor(Math.random() * h.ultimates.length)];

    return {
      heroId: h.id,
      slot: { col, row },
      activeSkillIds: [shuffledActives[0].id, shuffledActives[1].id],
      ultimateId: ult.id,
    };
  });
}

function runSingleBattle(
  playerTeam: TeamMemberConfig[],
  enemyTeam: TeamMemberConfig[],
  scale = 1.0
) {
  const engine = new BattleEngine(playerTeam, enemyTeam, scale);
  const dt = 1 / 30;
  while (!engine.finished) {
    engine.step(dt);
  }
  return engine.result!;
}

const MATCHES = 3000;
const heroStats: Record<
  HeroId,
  {
    games: number;
    wins: number;
    dmg: number;
    heal: number;
    taken: number;
    kills: number;
    survived: number;
  }
> = {} as never;

for (const h of HERO_LIST) {
  heroStats[h.id] = { games: 0, wins: 0, dmg: 0, heal: 0, taken: 0, kills: 0, survived: 0 };
}

let totalDuration = 0;
let timeouts = 0;
let playerWins = 0;

for (let i = 0; i < MATCHES; i++) {
  const t1 = randomTeam();
  const t2 = randomTeam();
  const res = runSingleBattle(t1, t2, 1.0);
  totalDuration += res.duration;
  if (res.duration >= 94.5) timeouts++;
  if (res.winner === 'player') playerWins++;

  for (const st of res.stats) {
    const rec = heroStats[st.heroId];
    rec.games++;
    if (res.winner === st.side) rec.wins++;
    rec.dmg += st.damageDealt;
    rec.heal += st.healingDone;
    rec.taken += st.damageTaken;
    rec.kills += st.kills;
    if (st.alive) rec.survived++;
  }
}

console.log(`\n=== MONTE CARLO 3v3 BALANCE REPORT (${MATCHES} matches) ===`);
console.log(
  `Avg Duration: ${(totalDuration / MATCHES).toFixed(1)}s | Timeouts: ${timeouts} | Side Bias (P1 WR): ${((playerWins / MATCHES) * 100).toFixed(1)}%\n`
);
console.log(
  'Hero'.padEnd(10),
  'Role'.padEnd(12),
  'Games'.padEnd(7),
  'WinRate'.padEnd(9),
  'AvgDmg'.padEnd(8),
  'AvgHeal'.padEnd(8),
  'AvgKills'.padEnd(9),
  'Surv%'
);
console.log('-'.repeat(76));

const sorted = [...HERO_LIST].sort(
  (a, b) =>
    heroStats[b.id].wins / heroStats[b.id].games -
    heroStats[a.id].wins / heroStats[a.id].games
);

for (const h of sorted) {
  const s = heroStats[h.id];
  const wr = ((s.wins / s.games) * 100).toFixed(1) + '%';
  const dmg = Math.round(s.dmg / s.games).toString();
  const heal = Math.round(s.heal / s.games).toString();
  const kills = (s.kills / s.games).toFixed(2);
  const surv = ((s.survived / s.games) * 100).toFixed(0) + '%';
  console.log(
    h.name.padEnd(10),
    h.role.padEnd(12),
    String(s.games).padEnd(7),
    wr.padEnd(9),
    dmg.padEnd(8),
    heal.padEnd(8),
    kills.padEnd(9),
    surv
  );
}

// Tower Progression Test with a solid balanced player team
console.log('\n=== TOWER PROGRESSION TEST (20 runs/floor, Balanced Team: Bram + Ren + Lyra) ===');
const testTeam = [
  createDefaultMember('bram', 'front', 'center'),
  createDefaultMember('ren', 'mid', 'top'),
  createDefaultMember('lyra', 'back', 'bottom'),
];

for (const fl of TOWER_FLOORS) {
  let w = 0;
  let avgDur = 0;
  for (let i = 0; i < 20; i++) {
    const r = runSingleBattle(testTeam, fl.enemyTeam, fl.statScale);
    if (r.winner === 'player') w++;
    avgDur += r.duration;
  }
  console.log(
    `Floor ${String(fl.floor).padStart(2)} (scale ${fl.statScale.toFixed(2)}): ${String(
      Math.round((w / 20) * 100)
    ).padStart(3)}% WR | avg ${(avgDur / 20).toFixed(1)}s | ${fl.name}`
  );
}
