import { useCallback, useEffect, useState } from 'react';
import { HEROES, HERO_LIST } from './game/heroes';
import { TOWER_FLOORS } from './game/tower';
import { loadSaveData, persistSaveData } from './game/storage';
import { loadGameAssets } from './game/renderer';
import type { LoadedAssets } from './game/renderer';
import type { BattleResult, SaveData, TeamMemberConfig } from './game/types';
import { TeamBuilder } from './components/TeamBuilder';
import { BattleView } from './components/BattleView';
import { MonteCarloLab } from './components/MonteCarloLab';

type Tab = 'hub' | 'tower' | 'team' | 'training' | 'montecarlo';

interface ActiveBattle {
  mode: 'tower' | 'training';
  floorIndex?: number;
  title: string;
  subtitle?: string;
  enemyTeam: TeamMemberConfig[];
  enemyStatScale: number;
}

export function App() {
  const [save, setSave] = useState<SaveData>(() => loadSaveData());
  const [tab, setTab] = useState<Tab>('hub');
  const [trainingSide, setTrainingSide] = useState<'player' | 'enemy'>('player');
  const [selectedFloorIdx, setSelectedFloorIdx] = useState<number>(() =>
    Math.min(TOWER_FLOORS.length - 1, loadSaveData().highestFloorCleared)
  );
  const [assets, setAssets] = useState<LoadedAssets>({ arenaBg: null, sprites: {} });
  const [activeBattle, setActiveBattle] = useState<ActiveBattle | null>(null);

  useEffect(() => {
    loadGameAssets().then(setAssets);
  }, []);

  useEffect(() => {
    persistSaveData(save);
  }, [save]);

  const nextTowerIdx = Math.min(TOWER_FLOORS.length - 1, save.highestFloorCleared);
  const currentFloor = TOWER_FLOORS[selectedFloorIdx];
  const nextFloor = TOWER_FLOORS[nextTowerIdx];

  const startTowerBattle = (floorIdx: number) => {
    const fl = TOWER_FLOORS[floorIdx];
    setSelectedFloorIdx(floorIdx);
    setActiveBattle({
      mode: 'tower',
      floorIndex: floorIdx,
      title: fl.name,
      subtitle: fl.subtitle,
      enemyTeam: fl.enemyTeam,
      enemyStatScale: fl.statScale,
    });
  };

  const startTrainingBattle = () => {
    setActiveBattle({
      mode: 'training',
      title: 'Modo Treino — Arena Livre 3v3',
      subtitle: 'Simulação livre para testar composições, formações e movesets.',
      enemyTeam: save.trainingEnemyTeam,
      enemyStatScale: 1.0,
    });
  };

  const handleBattleFinished = useCallback(
    (res: BattleResult) => {
      setSave((prev) => {
        const won = res.winner === 'player';
        let highest = prev.highestFloorCleared;
        if (won && activeBattle?.mode === 'tower' && activeBattle.floorIndex !== undefined) {
          highest = Math.max(highest, activeBattle.floorIndex + 1);
        }
        return {
          ...prev,
          highestFloorCleared: highest,
          totalBattles: prev.totalBattles + 1,
          totalWins: prev.totalWins + (won ? 1 : 0),
        };
      });
    },
    [activeBattle]
  );

  const winRate =
    save.totalBattles > 0 ? Math.round((save.totalWins / save.totalBattles) * 100) : 0;

  return (
    <div className="app-shell">
      <header className="top-nav">
        <button
          type="button"
          className="brand-btn"
          onClick={() => {
            setActiveBattle(null);
            setTab('hub');
          }}
        >
          <span className="brand-badge">3v3 PIXEL AUTO-BATTLER</span>
          <h1>KIZUNA ARENA</h1>
        </button>

        <nav className="nav-tabs">
          <button
            type="button"
            className={`nav-tab ${tab === 'hub' && !activeBattle ? 'active' : ''}`}
            onClick={() => {
              setActiveBattle(null);
              setTab('hub');
            }}
          >
            🏠 HUB
          </button>
          <button
            type="button"
            className={`nav-tab ${tab === 'tower' && !activeBattle ? 'active' : ''}`}
            onClick={() => {
              setActiveBattle(null);
              setTab('tower');
            }}
          >
            🗼 Torre
          </button>
          <button
            type="button"
            className={`nav-tab ${tab === 'team' && !activeBattle ? 'active' : ''}`}
            onClick={() => {
              setActiveBattle(null);
              setTab('team');
            }}
          >
            🛡 Meu Time
          </button>
          <button
            type="button"
            className={`nav-tab ${tab === 'training' && !activeBattle ? 'active' : ''}`}
            onClick={() => {
              setActiveBattle(null);
              setTab('training');
            }}
          >
            ⚔ Treino
          </button>
          <button
            type="button"
            className={`nav-tab ${tab === 'montecarlo' && !activeBattle ? 'active' : ''}`}
            onClick={() => {
              setActiveBattle(null);
              setTab('montecarlo');
            }}
          >
            🧪 Monte Carlo
          </button>
        </nav>

        <div className="profile-pill">
          <span>🗼 {save.highestFloorCleared}/{TOWER_FLOORS.length}</span>
          <span>🏆 {save.totalWins}V</span>
          <span>📊 {winRate}%</span>
        </div>
      </header>

      <main className="main-content">
        {activeBattle ? (
          <BattleView
            title={activeBattle.title}
            subtitle={activeBattle.subtitle}
            playerTeam={save.playerTeam}
            enemyTeam={activeBattle.enemyTeam}
            enemyStatScale={activeBattle.enemyStatScale}
            assets={assets}
            hasNextFloor={
              activeBattle.mode === 'tower' &&
              activeBattle.floorIndex !== undefined &&
              activeBattle.floorIndex + 1 < TOWER_FLOORS.length
            }
            onBattleFinished={handleBattleFinished}
            onNextFloor={() => {
              if (activeBattle.floorIndex !== undefined) {
                startTowerBattle(activeBattle.floorIndex + 1);
              }
            }}
            onExit={() => setActiveBattle(null)}
          />
        ) : tab === 'hub' ? (
          <div className="hub-layout">
            {/* Hero Showcase Stage */}
            <section className="hub-hero-stage">
              <div className="hub-stage-top">
                <div>
                  <span className="hub-eyebrow">SEU ESQUADRÃO ATIVO</span>
                  <h2>Prontos para o Coliseu</h2>
                </div>
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => setTab('team')}
                >
                  ⚙ Editar Time & Golpes
                </button>
              </div>

              <div className="hub-pedestal-row">
                {save.playerTeam.map((member, idx) => {
                  const def = HEROES[member.heroId];
                  const ult =
                    def.ultimates.find((u) => u.id === member.ultimateId) ??
                    def.ultimates[0];
                  return (
                    <div
                      key={idx}
                      className="hub-hero-card"
                      style={{ borderColor: def.color }}
                    >
                      <div className="hub-pos-pill">
                        {member.slot.col === 'front'
                          ? 'Frente'
                          : member.slot.col === 'mid'
                          ? 'Meio'
                          : 'Retaguarda'}
                      </div>
                      <img
                        src={def.spritePath}
                        alt={def.name}
                        className="pixel-sprite hub-showcase-sprite"
                      />
                      <strong>{def.name}</strong>
                      <span className="hub-role-txt" style={{ color: def.color }}>
                        {def.role}
                      </span>
                      <div className="hub-ult-pill">★ {ult.name}</div>
                    </div>
                  );
                })}
              </div>

              <div className="hub-mode-cards">
                <button
                  type="button"
                  className="mode-card blue"
                  onClick={() => setTab('tower')}
                >
                  <span className="mode-icon">🗼</span>
                  <div>
                    <strong>Torre de Batalha</strong>
                    <span>
                      {TOWER_FLOORS.length} andares progressivos com chefes
                    </span>
                  </div>
                </button>
                <button
                  type="button"
                  className="mode-card gold"
                  onClick={() => setTab('team')}
                >
                  <span className="mode-icon">🛡</span>
                  <div>
                    <strong>Elenco ({HERO_LIST.length} Heróis)</strong>
                    <span>Formação 3×3 e movesets customizáveis</span>
                  </div>
                </button>
                <button
                  type="button"
                  className="mode-card red"
                  onClick={() => setTab('training')}
                >
                  <span className="mode-icon">⚔</span>
                  <div>
                    <strong>Arena Treino</strong>
                    <span>Monte os dois times e simule confrontos</span>
                  </div>
                </button>
              </div>
            </section>

            {/* Quick Play Next Tower Challenge */}
            <aside className="hub-play-panel">
              <span className="hub-eyebrow">PRÓXIMO DESAFIO DA TORRE</span>
              <h3>{nextFloor.name}</h3>
              <p className="hub-play-sub">{nextFloor.subtitle}</p>

              <div className="enemy-preview-row">
                {nextFloor.enemyTeam.map((em, i) => {
                  const def = HEROES[em.heroId];
                  return (
                    <div key={i} className="enemy-mini-card">
                      <img
                        src={def.spritePath}
                        alt={def.name}
                        className="pixel-sprite small"
                      />
                      <strong>{def.name}</strong>
                      <span style={{ color: def.color }}>{def.role}</span>
                    </div>
                  );
                })}
              </div>

              <button
                type="button"
                className="primary-btn play-cta full-width"
                onClick={() => startTowerBattle(nextTowerIdx)}
              >
                ⚔ JOGAR AGORA — ANDAR {nextFloor.floor}
              </button>

              <div className="hub-mini-stats">
                <div>
                  <span>Andares Concluídos</span>
                  <strong>
                    {save.highestFloorCleared} / {TOWER_FLOORS.length}
                  </strong>
                </div>
                <div>
                  <span>Total de Batalhas</span>
                  <strong>{save.totalBattles}</strong>
                </div>
                <div>
                  <span>Taxa de Vitória</span>
                  <strong>{winRate}%</strong>
                </div>
              </div>
            </aside>
          </div>
        ) : tab === 'tower' ? (
          <div className="tower-focused-layout">
            <section className="tower-panel">
              <div className="panel-title-row">
                <h2>Torre de Batalha</h2>
                <span className="progress-chip">
                  Progresso: {save.highestFloorCleared} / {TOWER_FLOORS.length}
                </span>
              </div>

              <div className="floor-list tall">
                {TOWER_FLOORS.map((fl, idx) => {
                  const unlocked = idx <= save.highestFloorCleared;
                  const cleared = idx < save.highestFloorCleared;
                  const selected = idx === selectedFloorIdx;
                  return (
                    <button
                      key={fl.floor}
                      type="button"
                      disabled={!unlocked}
                      className={`floor-item ${selected ? 'selected' : ''} ${
                        cleared ? 'cleared' : ''
                      } ${fl.isBoss ? 'boss' : ''}`}
                      onClick={() => setSelectedFloorIdx(idx)}
                    >
                      <div className="floor-num">
                        {cleared ? '✓' : unlocked ? fl.floor : '🔒'}
                      </div>
                      <div className="floor-meta">
                        <strong>{fl.name}</strong>
                        <span>{fl.subtitle}</span>
                      </div>
                      {fl.isBoss && <span className="boss-badge">CHEFE</span>}
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="tower-detail-panel">
              <div className="panel-title-row">
                <h2>{currentFloor.name}</h2>
                {currentFloor.isBoss && <span className="boss-badge">CHEFE</span>}
              </div>
              <p className="hub-play-sub">{currentFloor.subtitle}</p>

              <div className="vs-preview-split">
                <div className="vs-box blue">
                  <div className="tb-label">Seu Time</div>
                  <div className="enemy-preview-row">
                    {save.playerTeam.map((m, i) => {
                      const def = HEROES[m.heroId];
                      return (
                        <div key={i} className="enemy-mini-card">
                          <img
                            src={def.spritePath}
                            alt={def.name}
                            className="pixel-sprite small"
                          />
                          <strong>{def.name}</strong>
                          <span style={{ color: def.color }}>{def.role}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="vs-badge-big">VS</div>

                <div className="vs-box red">
                  <div className="tb-label">Inimigos do Andar {currentFloor.floor}</div>
                  <div className="enemy-preview-row">
                    {currentFloor.enemyTeam.map((em, i) => {
                      const def = HEROES[em.heroId];
                      return (
                        <div key={i} className="enemy-mini-card">
                          <img
                            src={def.spritePath}
                            alt={def.name}
                            className="pixel-sprite small"
                          />
                          <strong>{def.name}</strong>
                          <span style={{ color: def.color }}>{def.role}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="tower-cta-row">
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => setTab('team')}
                >
                  🛡 Ajustar Meu Time
                </button>
                <button
                  type="button"
                  className="primary-btn play-cta"
                  onClick={() => startTowerBattle(selectedFloorIdx)}
                >
                  ⚔ INICIAR BATALHA — ANDAR {currentFloor.floor}
                </button>
              </div>
            </section>
          </div>
        ) : tab === 'team' ? (
          <div className="team-studio-wrap">
            <TeamBuilder
              title="Estúdio de Time — Escolha seus 3 Heróis, Formação 3×3 e Moveset"
              accent="blue"
              team={save.playerTeam}
              onChange={(next) => setSave((prev) => ({ ...prev, playerTeam: next }))}
            />
          </div>
        ) : tab === 'montecarlo' ? (
          <MonteCarloLab
            playerTeam={save.playerTeam}
            trainingEnemyTeam={save.trainingEnemyTeam}
            onWatchMatchup={(title, enemyTeam, enemyStatScale) =>
              setActiveBattle({
                mode: 'training',
                title: `Ao Vivo: ${title}`,
                subtitle: 'Batalha iniciada a partir do Laboratório Monte Carlo.',
                enemyTeam,
                enemyStatScale,
              })
            }
          />
        ) : (
          <div className="training-layout">
            <div className="training-launch-bar">
              <div className="training-side-tabs">
                <button
                  type="button"
                  className={`nav-tab ${trainingSide === 'player' ? 'active' : ''}`}
                  onClick={() => setTrainingSide('player')}
                >
                  🔵 Editar Seu Time
                </button>
                <button
                  type="button"
                  className={`nav-tab ${trainingSide === 'enemy' ? 'active' : ''}`}
                  onClick={() => setTrainingSide('enemy')}
                >
                  🔴 Editar Time Adversário
                </button>
              </div>
              <button
                type="button"
                className="primary-btn play-cta"
                onClick={startTrainingBattle}
              >
                ⚔ INICIAR SIMULAÇÃO 3v3
              </button>
            </div>

            {trainingSide === 'player' ? (
              <TeamBuilder
                title="Seu Time (Azul)"
                accent="blue"
                team={save.playerTeam}
                onChange={(next) => setSave((prev) => ({ ...prev, playerTeam: next }))}
              />
            ) : (
              <TeamBuilder
                title="Time Adversário (Vermelho)"
                accent="red"
                team={save.trainingEnemyTeam}
                onChange={(next) =>
                  setSave((prev) => ({ ...prev, trainingEnemyTeam: next }))
                }
              />
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
