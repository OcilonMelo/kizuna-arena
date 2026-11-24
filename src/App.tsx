import { useCallback, useEffect, useState } from 'react';
import { HEROES } from './game/heroes';
import { TOWER_FLOORS } from './game/tower';
import { loadSaveData, persistSaveData } from './game/storage';
import { loadGameAssets } from './game/renderer';
import type { LoadedAssets } from './game/renderer';
import type { BattleResult, SaveData, TeamMemberConfig } from './game/types';
import { TeamBuilder } from './components/TeamBuilder';
import { BattleView } from './components/BattleView';

type Mode = 'tower' | 'training';

interface ActiveBattle {
  mode: Mode;
  floorIndex?: number;
  title: string;
  subtitle?: string;
  enemyTeam: TeamMemberConfig[];
  enemyStatScale: number;
}

export function App() {
  const [save, setSave] = useState<SaveData>(() => loadSaveData());
  const [mode, setMode] = useState<Mode>('tower');
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

  const currentFloor = TOWER_FLOORS[selectedFloorIdx];

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

  return (
    <div className="app-shell">
      <header className="top-nav">
        <div className="brand">
          <span className="brand-badge">3v3 PIXEL AUTO-BATTLER</span>
          <h1>KIZUNA ARENA</h1>
        </div>

        <nav className="nav-tabs">
          <button
            type="button"
            className={`nav-tab ${mode === 'tower' && !activeBattle ? 'active' : ''}`}
            onClick={() => {
              setActiveBattle(null);
              setMode('tower');
            }}
          >
            🗼 Torre de Batalha
          </button>
          <button
            type="button"
            className={`nav-tab ${mode === 'training' && !activeBattle ? 'active' : ''}`}
            onClick={() => {
              setActiveBattle(null);
              setMode('training');
            }}
          >
            ⚔ Modo Treino
          </button>
        </nav>

        <div className="profile-pill">
          <span>Torre: {save.highestFloorCleared}/{TOWER_FLOORS.length}</span>
          <span>Vitórias: {save.totalWins}</span>
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
        ) : mode === 'tower' ? (
          <div className="tower-layout">
            {/* Left: Tower Floors & Enemy Preview */}
            <section className="tower-panel">
              <div className="panel-title-row">
                <h2>Torre de Batalha</h2>
                <span className="progress-chip">
                  Andar Máximo: {save.highestFloorCleared} / {TOWER_FLOORS.length}
                </span>
              </div>

              <div className="floor-list">
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

              <div className="enemy-preview-box">
                <div className="tb-label">Time Inimigo — {currentFloor.name}</div>
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
                <button
                  type="button"
                  className="primary-btn full-width"
                  onClick={() => startTowerBattle(selectedFloorIdx)}
                >
                  ⚔ INICIAR BATALHA — ANDAR {currentFloor.floor}
                </button>
              </div>
            </section>

            {/* Right: Player Team Customizer */}
            <section>
              <TeamBuilder
                title="Seu Time (Formação e Moveset)"
                accent="blue"
                team={save.playerTeam}
                onChange={(next) => setSave((prev) => ({ ...prev, playerTeam: next }))}
              />
            </section>
          </div>
        ) : (
          <div className="training-layout">
            <div className="training-launch-bar">
              <div>
                <h2>Modo Treino — Arena Sandbox 3v3</h2>
                <p>Configure os dois times, teste sinergias, posições e habilidades sem limites.</p>
              </div>
              <button type="button" className="primary-btn" onClick={startTrainingBattle}>
                ⚔ INICIAR SIMULAÇÃO 3v3
              </button>
            </div>

            <div className="training-grid">
              <TeamBuilder
                title="Seu Time (Azul)"
                accent="blue"
                team={save.playerTeam}
                onChange={(next) => setSave((prev) => ({ ...prev, playerTeam: next }))}
              />
              <TeamBuilder
                title="Time Adversário (Vermelho)"
                accent="red"
                team={save.trainingEnemyTeam}
                onChange={(next) =>
                  setSave((prev) => ({ ...prev, trainingEnemyTeam: next }))
                }
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
