import React, { useEffect, useRef, useState } from 'react';
import { ARENA_HEIGHT, ARENA_WIDTH, BattleEngine } from '../game/engine';
import type { HudHeroSnapshot, HudSnapshot } from '../game/engine';
import { renderBattle } from '../game/renderer';
import type { LoadedAssets } from '../game/renderer';
import type { BattleResult, TeamMemberConfig } from '../game/types';
import { HEROES } from '../game/heroes';
import { sound } from '../game/sound';

interface BattleViewProps {
  title: string;
  subtitle?: string;
  playerTeam: TeamMemberConfig[];
  enemyTeam: TeamMemberConfig[];
  enemyStatScale: number;
  assets: LoadedAssets;
  hasNextFloor?: boolean;
  onBattleFinished: (result: BattleResult) => void;
  onNextFloor?: () => void;
  onExit: () => void;
}

const STATUS_ICON: Record<string, string> = {
  stun: '⚡',
  burn: '🔥',
  slow: '❄️',
  atkBuff: '▲',
  taunt: '!',
};

const PortraitCard: React.FC<{ hero: HudHeroSnapshot; mirror?: boolean }> = ({
  hero,
  mirror,
}) => {
  const hpPct = Math.max(0, Math.round((hero.hp / hero.maxHp) * 100));
  const shieldPct = Math.min(100, Math.round((hero.shield / hero.maxHp) * 100));
  const enPct = Math.min(100, Math.round(hero.energy));
  const lowHp = hero.alive && hpPct <= 25;
  const ultReady = hero.alive && enPct >= 92;

  return (
    <div
      className={`hud-portrait-card ${!hero.alive ? 'dead' : ''} ${
        lowHp ? 'low-hp' : ''
      } ${ultReady ? 'ult-ready' : ''} ${mirror ? 'mirror' : ''}`}
      style={{ borderColor: hero.alive ? hero.color : '#334155' }}
    >
      <div className="hud-avatar-wrap">
        <img src={hero.spritePath} alt={hero.name} className="pixel-sprite hud-avatar" />
        {!hero.alive && <span className="ko-stamp">K.O.</span>}
        {hero.alive && hero.statuses.length > 0 && (
          <div className="hud-status-row">
            {hero.statuses.map((st) => (
              <span key={st} className="hud-status-badge">
                {STATUS_ICON[st]}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="hud-bars">
        <div className="hud-name-line">
          <strong style={{ color: hero.awakened ? '#fde047' : '#f8fafc' }}>
            {hero.name}
          </strong>
          <span className="hud-hp-num">{hero.alive ? `${hpPct}%` : '0%'}</span>
        </div>

        <div className="hud-hp-track">
          <div
            className={`hud-hp-fill ${hero.side}`}
            style={{ width: `${hpPct}%` }}
          />
          {shieldPct > 0 && (
            <div className="hud-shield-fill" style={{ width: `${shieldPct}%` }} />
          )}
        </div>

        <div className="hud-en-track">
          <div
            className={`hud-en-fill ${ultReady ? 'full' : ''}`}
            style={{ width: `${enPct}%` }}
          />
        </div>
      </div>
    </div>
  );
};

export const BattleView: React.FC<BattleViewProps> = ({
  title,
  playerTeam,
  enemyTeam,
  enemyStatScale,
  assets,
  hasNextFloor,
  onBattleFinished,
  onNextFloor,
  onExit,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<BattleEngine | null>(null);
  const speedRef = useRef<1 | 2>(1);
  const pausedRef = useRef<boolean>(false);
  const overheadRef = useRef<boolean>(true);

  const [speed, setSpeed] = useState<1 | 2>(1);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(sound.muted);
  const [showOverhead, setShowOverhead] = useState(true);
  const [hud, setHud] = useState<HudSnapshot | null>(null);
  const [result, setResult] = useState<BattleResult | null>(null);
  const [runNonce, setRunNonce] = useState(0);

  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    overheadRef.current = showOverhead;
  }, [showOverhead]);

  useEffect(() => {
    const engine = new BattleEngine(playerTeam, enemyTeam, enemyStatScale);
    engineRef.current = engine;
    setResult(null);
    setHud(engine.getHudSnapshot());
    setPaused(false);
    pausedRef.current = false;

    let rafId = 0;
    let lastTs = performance.now();
    let uiTimer = 0;
    let notified = false;

    const loop = (now: number) => {
      const rawDt = Math.min(0.05, (now - lastTs) / 1000);
      lastTs = now;

      if (!pausedRef.current && !engine.finished) {
        const steps = speedRef.current;
        for (let i = 0; i < steps; i++) {
          engine.step(rawDt);
        }
      }

      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) renderBattle(ctx, engine, assets, overheadRef.current);
      }

      uiTimer += rawDt;
      if (uiTimer >= 0.08) {
        uiTimer = 0;
        setHud(engine.getHudSnapshot());
      }

      if (engine.finished && engine.result && !notified) {
        notified = true;
        setHud(engine.getHudSnapshot());
        setResult(engine.result);
        onBattleFinished(engine.result);
      }

      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [playerTeam, enemyTeam, enemyStatScale, assets, runNonce, onBattleFinished]);

  const maxDamage = result
    ? Math.max(1, ...result.stats.map((s) => s.damageDealt))
    : 1;

  return (
    <div className="battle-view">
      {/* Arena Canvas + Floating Symmetrical Top HUD */}
      <div className="canvas-frame">
        {hud && (
          <div className="battle-top-overlay">
            <div className="team-agg left">
              <div className="team-agg-label">
                <span>SEU TIME</span>
                <strong>{hud.playerHpPct}%</strong>
              </div>
              <div className="team-agg-track">
                <div
                  className="team-agg-fill player"
                  style={{ width: `${hud.playerHpPct}%` }}
                />
              </div>
            </div>

            <div className="battle-center-pill">
              <span className="battle-stage-name">{title}</span>
              <div className="battle-timer-row">
                <span>⏱ {hud.elapsed.toFixed(1)}s</span>
                {hud.overdrive && <span className="overdrive-tag">🔥 OVERDRIVE</span>}
              </div>
            </div>

            <div className="team-agg right">
              <div className="team-agg-label">
                <strong>{hud.enemyHpPct}%</strong>
                <span>ADVERSÁRIO</span>
              </div>
              <div className="team-agg-track">
                <div
                  className="team-agg-fill enemy"
                  style={{ width: `${hud.enemyHpPct}%` }}
                />
              </div>
            </div>
          </div>
        )}

        <canvas
          ref={canvasRef}
          width={ARENA_WIDTH}
          height={ARENA_HEIGHT}
          className="arena-canvas"
        />

        {/* Post-Battle Report Overlay */}
        {result && (
          <div className="result-overlay">
            <div className="result-modal">
              <div className={`result-banner ${result.winner}`}>
                {result.winner === 'player'
                  ? '🏆 VITÓRIA!'
                  : result.winner === 'enemy'
                  ? '💀 DERROTA'
                  : '⚖ EMPATE'}
                <span className="result-time">Duração: {result.duration.toFixed(1)}s</span>
              </div>

              <div className="report-grid">
                {(['player', 'enemy'] as const).map((side) => (
                  <div key={side} className="report-col">
                    <h4 className={side === 'player' ? 'blue-txt' : 'red-txt'}>
                      {side === 'player' ? 'Seu Time' : 'Time Adversário'}
                    </h4>
                    {result.stats
                      .filter((s) => s.side === side)
                      .map((st) => {
                        const def = HEROES[st.heroId];
                        const pct = Math.round((st.damageDealt / maxDamage) * 100);
                        return (
                          <div key={st.uid} className="report-row">
                            <img
                              src={def.spritePath}
                              alt={st.name}
                              className="pixel-sprite tiny"
                            />
                            <div className="report-meta">
                              <div className="report-name-line">
                                <strong>{st.name}</strong>
                                <span className="report-ko">
                                  {st.alive ? `${st.hp}/${st.maxHp} HP` : 'K.O.'}
                                </span>
                              </div>
                              <div className="dmg-bar-bg">
                                <div
                                  className="dmg-bar-fill"
                                  style={{
                                    width: `${pct}%`,
                                    backgroundColor: st.color,
                                  }}
                                />
                              </div>
                              <div className="report-nums">
                                <span>⚔ {st.damageDealt} dano</span>
                                {st.healingDone > 0 && (
                                  <span className="heal-txt">✚ {st.healingDone} cura</span>
                                )}
                                <span>★ {st.kills} K.O.</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                ))}
              </div>

              <div className="result-actions">
                {result.winner === 'player' && hasNextFloor && onNextFloor && (
                  <button type="button" className="primary-btn" onClick={onNextFloor}>
                    Próximo Andar →
                  </button>
                )}
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => setRunNonce((n) => n + 1)}
                >
                  ↻ Lutar Novamente
                </button>
                <button type="button" className="secondary-btn" onClick={onExit}>
                  Ajustar Time / Voltar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Anchored Team Portrait Dock + Controls (AFK Arena / Battlegrounds Style) */}
      {hud && (
        <div className="battle-bottom-dock">
          <div className="dock-team left">
            {hud.playerHeroes.map((h) => (
              <PortraitCard key={h.uid} hero={h} />
            ))}
          </div>

          <div className="dock-controls">
            <button
              type="button"
              className={`ctrl-btn ${speed === 2 ? 'active' : ''}`}
              onClick={() => setSpeed((s) => (s === 1 ? 2 : 1))}
              title="Velocidade da luta"
            >
              {speed === 1 ? '1x' : '2x ⚡'}
            </button>
            <button
              type="button"
              className={`ctrl-btn ${paused ? 'active' : ''}`}
              onClick={() => setPaused((p) => !p)}
              title="Pausar / Retomar"
            >
              {paused ? '▶' : '⏸'}
            </button>
            <button
              type="button"
              className={`ctrl-btn ${!muted ? 'active' : ''}`}
              onClick={() => {
                const next = !muted;
                sound.muted = next;
                setMuted(next);
              }}
              title="Ligar / Mutar som"
            >
              {muted ? '🔇' : '🔊'}
            </button>
            <button
              type="button"
              className={`ctrl-btn ${showOverhead ? 'active' : ''}`}
              onClick={() => setShowOverhead((v) => !v)}
              title="Mostrar/ocultar barras sobre os heróis"
            >
              HP
            </button>
            <button
              type="button"
              className="ctrl-btn"
              onClick={() => setRunNonce((n) => n + 1)}
              title="Reiniciar luta"
            >
              ↻
            </button>
            <button
              type="button"
              className="ctrl-btn danger"
              onClick={onExit}
              title="Voltar ao HUB"
            >
              ✕
            </button>
          </div>

          <div className="dock-team right">
            {hud.enemyHeroes.map((h) => (
              <PortraitCard key={h.uid} hero={h} mirror />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
