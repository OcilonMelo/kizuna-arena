import React, { useEffect, useRef, useState } from 'react';
import { ARENA_HEIGHT, ARENA_WIDTH, BattleEngine } from '../game/engine';
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

export const BattleView: React.FC<BattleViewProps> = ({
  title,
  subtitle,
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

  const [speed, setSpeed] = useState<1 | 2>(1);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(sound.muted);
  const [elapsed, setElapsed] = useState(0);
  const [result, setResult] = useState<BattleResult | null>(null);
  const [runNonce, setRunNonce] = useState(0);

  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    const engine = new BattleEngine(playerTeam, enemyTeam, enemyStatScale);
    engineRef.current = engine;
    setResult(null);
    setElapsed(0);
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
        if (ctx) renderBattle(ctx, engine, assets);
      }

      uiTimer += rawDt;
      if (uiTimer >= 0.12) {
        uiTimer = 0;
        setElapsed(engine.elapsed);
      }

      if (engine.finished && engine.result && !notified) {
        notified = true;
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
      {/* Spectator Top Bar */}
      <div className="battle-topbar">
        <div>
          <h2 className="battle-title">{title}</h2>
          {subtitle && <p className="battle-sub">{subtitle}</p>}
        </div>

        <div className="battle-controls">
          <span className="timer-badge">⏱ {elapsed.toFixed(1)}s</span>
          <button
            type="button"
            className={`ctrl-btn ${!muted ? 'active' : ''}`}
            onClick={() => {
              const next = !muted;
              sound.muted = next;
              setMuted(next);
            }}
          >
            {muted ? '🔇 Som Off' : '🔊 Som On'}
          </button>
          <button
            type="button"
            className={`ctrl-btn ${speed === 2 ? 'active' : ''}`}
            onClick={() => setSpeed((s) => (s === 1 ? 2 : 1))}
          >
            {speed === 1 ? '1x Vel' : '2x Vel ⚡'}
          </button>
          <button
            type="button"
            className={`ctrl-btn ${paused ? 'active' : ''}`}
            onClick={() => setPaused((p) => !p)}
          >
            {paused ? '▶ Retomar' : '⏸ Pausar'}
          </button>
          <button
            type="button"
            className="ctrl-btn"
            onClick={() => setRunNonce((n) => n + 1)}
          >
            ↻ Revanche
          </button>
          <button type="button" className="ctrl-btn danger" onClick={onExit}>
            ← Voltar
          </button>
        </div>
      </div>

      {/* Arena Canvas */}
      <div className="canvas-frame">
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
                  Ajustar Time / Formação
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
