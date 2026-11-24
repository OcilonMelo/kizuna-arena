import React, { useEffect, useRef, useState } from 'react';
import { BattleEngine } from '../game/engine';
import { HEROES, HERO_LIST } from '../game/heroes';
import { TOWER_FLOORS } from '../game/tower';
import { sound } from '../game/sound';
import type {
  FormationCol,
  FormationRow,
  HeroId,
  TeamMemberConfig,
} from '../game/types';

interface MonteCarloLabProps {
  playerTeam: TeamMemberConfig[];
  trainingEnemyTeam: TeamMemberConfig[];
  onWatchMatchup: (
    title: string,
    enemyTeam: TeamMemberConfig[],
    enemyStatScale: number
  ) => void;
}

type SimMode = 'matchup' | 'global';

interface HeroAccum {
  games: number;
  wins: number;
  dmg: number;
  heal: number;
  kills: number;
  survived: number;
}

interface MatchupSummary {
  completed: number;
  total: number;
  playerWins: number;
  enemyWins: number;
  draws: number;
  totalDuration: number;
  perHero: Record<string, { heroId: HeroId; side: 'player' | 'enemy'; dmg: number; heal: number; kills: number; survived: number; games: number }>;
}

const COLS: FormationCol[] = ['front', 'mid', 'back'];
const ROWS: FormationRow[] = ['top', 'center', 'bottom'];

function buildDisjointTeams(): [TeamMemberConfig[], TeamMemberConfig[]] {
  const pool = [...HERO_LIST].sort(() => Math.random() - 0.5);
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
  return [makeSide(pool.slice(0, 3)), makeSide(pool.slice(3, 6))];
}

function runHeadlessBattle(
  playerTeam: TeamMemberConfig[],
  enemyTeam: TeamMemberConfig[],
  scale = 1.0
) {
  const prevMuted = sound.muted;
  sound.muted = true;
  try {
    const engine = new BattleEngine(playerTeam, enemyTeam, scale);
    const dt = 1 / 30;
    while (!engine.finished) {
      engine.step(dt);
    }
    return engine.result!;
  } finally {
    sound.muted = prevMuted;
  }
}

export const MonteCarloLab: React.FC<MonteCarloLabProps> = ({
  playerTeam,
  trainingEnemyTeam,
  onWatchMatchup,
}) => {
  const [simMode, setSimMode] = useState<SimMode>('matchup');
  const [targetType, setTargetType] = useState<'training' | number>(0); // 0..11 floor idx or 'training'
  const [matchCount, setMatchCount] = useState<number>(100);
  const [running, setRunning] = useState(false);

  const [matchupRes, setMatchupRes] = useState<MatchupSummary | null>(null);
  const [globalDone, setGlobalDone] = useState(0);
  const [globalTotal, setGlobalTotal] = useState(0);
  const [globalDurationSum, setGlobalDurationSum] = useState(0);
  const [globalStats, setGlobalStats] = useState<Record<HeroId, HeroAccum> | null>(null);

  const cancelRef = useRef(false);

  useEffect(() => {
    return () => {
      cancelRef.current = true;
    };
  }, []);

  const getSelectedOpponent = () => {
    if (targetType === 'training') {
      return {
        title: 'Time do Modo Treino',
        team: trainingEnemyTeam,
        scale: 1.0,
      };
    }
    const fl = TOWER_FLOORS[targetType] ?? TOWER_FLOORS[0];
    return {
      title: fl.name,
      team: fl.enemyTeam,
      scale: fl.statScale,
    };
  };

  const stopSim = () => {
    cancelRef.current = true;
    setRunning(false);
  };

  const startSimulation = () => {
    cancelRef.current = false;
    setRunning(true);

    if (simMode === 'matchup') {
      const opp = getSelectedOpponent();
      const summary: MatchupSummary = {
        completed: 0,
        total: matchCount,
        playerWins: 0,
        enemyWins: 0,
        draws: 0,
        totalDuration: 0,
        perHero: {},
      };
      setMatchupRes({ ...summary });

      const stepChunk = () => {
        if (cancelRef.current) return;
        const chunk = Math.min(8, summary.total - summary.completed);
        for (let i = 0; i < chunk; i++) {
          const res = runHeadlessBattle(playerTeam, opp.team, opp.scale);
          summary.completed++;
          summary.totalDuration += res.duration;
          if (res.winner === 'player') summary.playerWins++;
          else if (res.winner === 'enemy') summary.enemyWins++;
          else summary.draws++;

          for (const st of res.stats) {
            const key = `${st.side}_${st.heroId}`;
            if (!summary.perHero[key]) {
              summary.perHero[key] = {
                heroId: st.heroId,
                side: st.side,
                dmg: 0,
                heal: 0,
                kills: 0,
                survived: 0,
                games: 0,
              };
            }
            const rec = summary.perHero[key];
            rec.games++;
            rec.dmg += st.damageDealt;
            rec.heal += st.healingDone;
            rec.kills += st.kills;
            if (st.alive) rec.survived++;
          }
        }

        setMatchupRes({
          ...summary,
          perHero: { ...summary.perHero },
        });

        if (summary.completed < summary.total) {
          requestAnimationFrame(stepChunk);
        } else {
          setRunning(false);
        }
      };

      requestAnimationFrame(stepChunk);
    } else {
      const accum = {} as Record<HeroId, HeroAccum>;
      for (const h of HERO_LIST) {
        accum[h.id] = { games: 0, wins: 0, dmg: 0, heal: 0, kills: 0, survived: 0 };
      }
      let done = 0;
      let durSum = 0;
      const total = matchCount;
      setGlobalTotal(total);
      setGlobalDone(0);
      setGlobalDurationSum(0);
      setGlobalStats({ ...accum });

      const stepChunk = () => {
        if (cancelRef.current) return;
        const chunk = Math.min(16, total - done);
        for (let i = 0; i < chunk; i++) {
          const [t1, t2] = buildDisjointTeams();
          const res = runHeadlessBattle(t1, t2, 1.0);
          done++;
          durSum += res.duration;
          for (const st of res.stats) {
            const rec = accum[st.heroId];
            rec.games++;
            if (res.winner === st.side) rec.wins++;
            rec.dmg += st.damageDealt;
            rec.heal += st.healingDone;
            rec.kills += st.kills;
            if (st.alive) rec.survived++;
          }
        }

        setGlobalDone(done);
        setGlobalDurationSum(durSum);
        setGlobalStats({ ...accum });

        if (done < total) {
          requestAnimationFrame(stepChunk);
        } else {
          setRunning(false);
        }
      };

      requestAnimationFrame(stepChunk);
    }
  };

  const opp = getSelectedOpponent();
  const sortedGlobal = globalStats
    ? [...HERO_LIST].sort((a, b) => {
        const ga = globalStats[a.id];
        const gb = globalStats[b.id];
        const wra = ga.games > 0 ? ga.wins / ga.games : 0;
        const wrb = gb.games > 0 ? gb.wins / gb.games : 0;
        return wrb - wra;
      })
    : [];

  return (
    <div className="mc-lab">
      <div className="mc-header-card">
        <div>
          <span className="hub-eyebrow">SIMULAÇÃO REAL NO MOTOR DO JOGO</span>
          <h2>🧪 Laboratório Monte Carlo</h2>
          <p className="hub-play-sub">
            Roda centenas de batalhas reais sem interface gráfica para medir probabilidades exatas de vitória e equilíbrio entre os {HERO_LIST.length} lutadores.
          </p>
        </div>

        <div className="mc-mode-tabs">
          <button
            type="button"
            disabled={running}
            className={`nav-tab ${simMode === 'matchup' ? 'active' : ''}`}
            onClick={() => setSimMode('matchup')}
          >
            🎯 Testar Meu Time
          </button>
          <button
            type="button"
            disabled={running}
            className={`nav-tab ${simMode === 'global' ? 'active' : ''}`}
            onClick={() => setSimMode('global')}
          >
            📊 Ranking ({HERO_LIST.length} Lutadores)
          </button>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="mc-controls-bar">
        {simMode === 'matchup' && (
          <label className="mc-select-group">
            <span>Adversário:</span>
            <select
              disabled={running}
              value={targetType}
              onChange={(e) => {
                const v = e.target.value;
                setTargetType(v === 'training' ? 'training' : Number(v));
              }}
            >
              <option value="training">Time do Modo Treino (1.00x)</option>
              {TOWER_FLOORS.map((fl, idx) => (
                <option key={fl.floor} value={idx}>
                  {fl.name} ({fl.statScale.toFixed(2)}x)
                </option>
              ))}
            </select>
          </label>
        )}

        <div className="mc-count-group">
          <span>Batalhas:</span>
          {(simMode === 'matchup' ? [50, 100, 300] : [200, 500, 1000]).map((n) => (
            <button
              key={n}
              type="button"
              disabled={running}
              className={`ctrl-btn ${matchCount === n ? 'active' : ''}`}
              onClick={() => setMatchCount(n)}
            >
              {n}x
            </button>
          ))}
        </div>

        <div className="mc-action-btns">
          {running ? (
            <button type="button" className="ctrl-btn danger" onClick={stopSim}>
              ⏹ Parar Simulação
            </button>
          ) : (
            <button type="button" className="primary-btn" onClick={startSimulation}>
              ▶ Rodar {matchCount} Batalhas
            </button>
          )}
          {simMode === 'matchup' && (
            <button
              type="button"
              className="secondary-btn"
              onClick={() => onWatchMatchup(opp.title, opp.team, opp.scale)}
            >
              ⚔ Assistir 1 Luta ao Vivo
            </button>
          )}
        </div>
      </div>

      {/* Matchup Mode Output */}
      {simMode === 'matchup' && (
        <div className="mc-body-card">
          <div className="mc-matchup-preview">
            <div className="mc-mini-squad">
              <span className="blue-txt">SEU TIME</span>
              <div className="mc-mini-icons">
                {playerTeam.map((m, i) => (
                  <img
                    key={i}
                    src={HEROES[m.heroId].spritePath}
                    alt={HEROES[m.heroId].name}
                    className="pixel-sprite tiny"
                    title={HEROES[m.heroId].name}
                  />
                ))}
              </div>
            </div>
            <strong className="vs-badge-big">VS</strong>
            <div className="mc-mini-squad">
              <span className="red-txt">{opp.title.toUpperCase()}</span>
              <div className="mc-mini-icons">
                {opp.team.map((m, i) => (
                  <img
                    key={i}
                    src={HEROES[m.heroId].spritePath}
                    alt={HEROES[m.heroId].name}
                    className="pixel-sprite tiny"
                    title={HEROES[m.heroId].name}
                  />
                ))}
              </div>
            </div>
          </div>

          {matchupRes ? (
            <>
              <div className="mc-progress-row">
                <span>
                  Progresso: <strong>{matchupRes.completed}</strong> / {matchupRes.total} batalhas
                </span>
                <span>
                  Duração média:{' '}
                  <strong>
                    {matchupRes.completed > 0
                      ? (matchupRes.totalDuration / matchupRes.completed).toFixed(1)
                      : '0.0'}
                    s
                  </strong>
                </span>
              </div>
              <div className="mc-progress-track">
                <div
                  className="mc-progress-fill"
                  style={{
                    width: `${Math.round((matchupRes.completed / matchupRes.total) * 100)}%`,
                  }}
                />
              </div>

              {/* Big Win Probability Tug-of-War Bar */}
              {(() => {
                const pPct =
                  matchupRes.completed > 0
                    ? Math.round((matchupRes.playerWins / matchupRes.completed) * 100)
                    : 50;
                const ePct = 100 - pPct;
                return (
                  <div className="mc-win-bar-wrap">
                    <div className="mc-win-labels">
                      <span className="blue-txt">
                        🏆 SEU TIME: <strong>{pPct}%</strong> ({matchupRes.playerWins}V)
                      </span>
                      <span className="red-txt">
                        ({matchupRes.enemyWins}V) <strong>{ePct}%</strong> :ADVERSÁRIO 💀
                      </span>
                    </div>
                    <div className="mc-tug-track">
                      <div className="mc-tug-player" style={{ width: `${pPct}%` }} />
                      <div className="mc-tug-enemy" style={{ width: `${ePct}%` }} />
                    </div>
                  </div>
                );
              })()}

              {/* Per-hero averages */}
              <div className="report-grid">
                {(['player', 'enemy'] as const).map((side) => (
                  <div key={side} className="report-col">
                    <h4 className={side === 'player' ? 'blue-txt' : 'red-txt'}>
                      Médias por Batalha — {side === 'player' ? 'Seu Time' : 'Adversário'}
                    </h4>
                    {Object.values(matchupRes.perHero)
                      .filter((r) => r.side === side)
                      .map((r) => {
                        const def = HEROES[r.heroId];
                        const avgDmg = Math.round(r.dmg / Math.max(1, r.games));
                        const avgHeal = Math.round(r.heal / Math.max(1, r.games));
                        const surv = Math.round((r.survived / Math.max(1, r.games)) * 100);
                        return (
                          <div key={`${r.side}_${r.heroId}`} className="report-row">
                            <img
                              src={def.spritePath}
                              alt={def.name}
                              className="pixel-sprite tiny"
                            />
                            <div className="report-meta">
                              <div className="report-name-line">
                                <strong>{def.name}</strong>
                                <span className="report-ko">Sobrevive: {surv}%</span>
                              </div>
                              <div className="report-nums">
                                <span>⚔ {avgDmg} dano/luta</span>
                                {avgHeal > 20 && (
                                  <span className="heal-txt">✚ {avgHeal} cura/luta</span>
                                )}
                                <span>★ {(r.kills / Math.max(1, r.games)).toFixed(2)} K.O.</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="mc-empty">
              Clique em <strong>▶ Rodar {matchCount} Batalhas</strong> para simular esse confronto em tempo real!
            </div>
          )}
        </div>
      )}

      {/* Global 12-Hero Balance Tournament Output */}
      {simMode === 'global' && (
        <div className="mc-body-card">
          {globalStats ? (
            <>
              <div className="mc-progress-row">
                <span>
                  Batalhas 3v3 aleatórias: <strong>{globalDone}</strong> / {globalTotal}
                </span>
                <span>
                  Duração média:{' '}
                  <strong>
                    {globalDone > 0 ? (globalDurationSum / globalDone).toFixed(1) : '0.0'}s
                  </strong>
                </span>
              </div>
              <div className="mc-progress-track">
                <div
                  className="mc-progress-fill"
                  style={{
                    width: `${Math.round((globalDone / Math.max(1, globalTotal)) * 100)}%`,
                  }}
                />
              </div>

              <div className="mc-table">
                <div className="mc-table-head">
                  <span>Herói</span>
                  <span>Classe</span>
                  <span>Win Rate</span>
                  <span>Dano Médio</span>
                  <span>Cura Média</span>
                  <span>Sobrev.</span>
                </div>
                {sortedGlobal.map((h) => {
                  const s = globalStats[h.id];
                  const wr = s.games > 0 ? (s.wins / s.games) * 100 : 0;
                  const wrClass =
                    wr >= 45 && wr <= 55
                      ? 'wr-good'
                      : wr > 55
                      ? 'wr-high'
                      : 'wr-low';
                  return (
                    <div key={h.id} className="mc-table-row">
                      <div className="mc-hero-cell">
                        <img
                          src={h.spritePath}
                          alt={h.name}
                          className="pixel-sprite tiny"
                        />
                        <strong>{h.name}</strong>
                      </div>
                      <span style={{ color: h.color, fontWeight: 700, fontSize: '0.8rem' }}>
                        {h.role}
                      </span>
                      <div className="mc-wr-cell">
                        <span className={`wr-pill ${wrClass}`}>{wr.toFixed(1)}%</span>
                        <div className="mc-wr-bar">
                          <div
                            className="mc-wr-bar-fill"
                            style={{
                              width: `${Math.min(100, wr)}%`,
                              backgroundColor: h.color,
                            }}
                          />
                        </div>
                      </div>
                      <span>{s.games > 0 ? Math.round(s.dmg / s.games) : 0}</span>
                      <span className="heal-txt">
                        {s.games > 0 ? Math.round(s.heal / s.games) : 0}
                      </span>
                      <span>
                        {s.games > 0 ? Math.round((s.survived / s.games) * 100) : 0}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="mc-empty">
              Clique em <strong>▶ Rodar {matchCount} Batalhas</strong> para simular um torneio aleatório entre todos os 12 heróis ao vivo!
            </div>
          )}
        </div>
      )}
    </div>
  );
};
