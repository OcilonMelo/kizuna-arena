import { ARENA_HEIGHT, ARENA_WIDTH, BattleEngine } from './engine';
import type { HeroId, HeroRuntime } from './types';
import { HERO_LIST } from './heroes';

export interface LoadedAssets {
  arenaBg: HTMLImageElement | null;
  sprites: Partial<Record<HeroId, HTMLImageElement>>;
}

export async function loadGameAssets(): Promise<LoadedAssets> {
  const loadImage = (src: string): Promise<HTMLImageElement | null> =>
    new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = src;
    });

  const arenaBg = await loadImage('/assets/arena_bg.png');
  const sprites: Partial<Record<HeroId, HTMLImageElement>> = {};
  await Promise.all(
    HERO_LIST.map(async (hero) => {
      const img = await loadImage(hero.spritePath);
      if (img) sprites[hero.id] = img;
    })
  );
  return { arenaBg, sprites };
}

export function renderBattle(
  ctx: CanvasRenderingContext2D,
  engine: BattleEngine,
  assets: LoadedAssets
): void {
  ctx.save();
  ctx.imageSmoothingEnabled = false;

  // Dynamic micro-zoom + screen shake
  if (engine.cameraZoom > 1.001) {
    ctx.translate(ARENA_WIDTH / 2, ARENA_HEIGHT / 2);
    ctx.scale(engine.cameraZoom, engine.cameraZoom);
    ctx.translate(-ARENA_WIDTH / 2, -ARENA_HEIGHT / 2);
  }
  if (engine.screenShake > 0.2) {
    const sx = (Math.random() - 0.5) * engine.screenShake * 2;
    const sy = (Math.random() - 0.5) * engine.screenShake * 2;
    ctx.translate(sx, sy);
  }

  // 1. Arena Background
  if (assets.arenaBg) {
    ctx.drawImage(assets.arenaBg, 0, 0, ARENA_WIDTH, ARENA_HEIGHT);
  } else {
    ctx.fillStyle = '#1e1b4b';
    ctx.fillRect(0, 0, ARENA_WIDTH, ARENA_HEIGHT);
  }

  // Overdrive arena pulse tint
  if (engine.overdrive) {
    const pulse = 0.06 + Math.sin(engine.elapsed * 6) * 0.04;
    ctx.fillStyle = `rgba(244, 63, 94, ${pulse})`;
    ctx.fillRect(0, 0, ARENA_WIDTH, ARENA_HEIGHT);
  }

  // 2. Telegraphed Arena Hazards (Lightning/Meteor warning zones)
  for (const hz of engine.hazards) {
    const progress = Math.min(1, hz.age / hz.delay);
    ctx.save();
    ctx.fillStyle = `rgba(244, 63, 94, ${0.14 + progress * 0.22})`;
    ctx.beginPath();
    ctx.ellipse(hz.x, hz.y, hz.radius, hz.radius * 0.55, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 6]);
    ctx.beginPath();
    ctx.ellipse(hz.x, hz.y, hz.radius, hz.radius * 0.55, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Shrinking impact ring
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(
      hz.x,
      hz.y,
      hz.radius * (1 - progress),
      hz.radius * 0.55 * (1 - progress),
      0,
      0,
      Math.PI * 2
    );
    ctx.stroke();
    ctx.restore();
  }

  // 3. Kizuna Power Orbs
  for (const orb of engine.orbs) {
    const bob = Math.sin(orb.age * 5) * 6;
    const color =
      orb.kind === 'energy' ? '#38bdf8' : orb.kind === 'heal' ? '#4ade80' : '#f59e0b';
    const label = orb.kind === 'energy' ? '⚡' : orb.kind === 'heal' ? '✚' : '🔥';

    ctx.save();
    // Ground glow
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(orb.x, orb.y + 8, 20, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Pulsing outer ring
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(orb.x, orb.y - 16 + bob, 18 + Math.sin(orb.age * 7) * 3, 0, Math.PI * 2);
    ctx.stroke();

    // Orb body
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(orb.x, orb.y - 16 + bob, 13, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(label, orb.x, orb.y - 11 + bob);
    ctx.restore();
  }

  // 4. Ground VFX (rings, heals, dash ghosts)
  for (const v of engine.vfx) {
    if (v.type === 'ring' || v.type === 'heal' || v.type === 'dash_ghost') {
      const t = v.age / v.duration;
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - t);
      if (v.type === 'dash_ghost') {
        ctx.fillStyle = v.color;
        ctx.beginPath();
        ctx.ellipse(v.x, v.y - 24, 20 * (1 - t * 0.4), 30 * (1 - t * 0.3), 0, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.strokeStyle = v.color;
        ctx.lineWidth = v.type === 'heal' ? 5 : 3.5;
        ctx.beginPath();
        ctx.ellipse(
          v.x,
          v.y + 8,
          v.radius * (0.4 + t * 0.75),
          v.radius * 0.48 * (0.4 + t * 0.75),
          0,
          0,
          Math.PI * 2
        );
        ctx.stroke();
        if (v.type === 'heal') {
          ctx.fillStyle = v.secondaryColor ?? '#4ade80';
          ctx.globalAlpha = (1 - t) * 0.25;
          ctx.fill();
        }
      }
      ctx.restore();
    }
  }

  // 5. Y-sorted Heroes
  const sortedHeroes = [...engine.heroes].sort((a, b) => a.y - b.y);
  for (const h of sortedHeroes) {
    if (h.deathAlpha <= 0.02) continue;
    drawHero(ctx, h, assets);
  }

  // 6. Projectiles
  for (const p of engine.projectiles) {
    ctx.save();
    for (let i = 0; i < p.trail.length; i++) {
      const tp = p.trail[i];
      const alpha = ((i + 1) / (p.trail.length + 1)) * 0.6;
      ctx.fillStyle = p.color;
      ctx.globalAlpha = alpha;
      const sz = p.radius * 1.15 * ((i + 1) / p.trail.length);
      ctx.fillRect(
        Math.round(tp.x - sz / 2),
        Math.round(tp.y - sz / 2),
        Math.round(sz),
        Math.round(sz)
      );
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = p.secondaryColor;
    ctx.fillRect(
      Math.round(p.x - p.radius * 0.45),
      Math.round(p.y - p.radius * 0.45),
      Math.round(p.radius * 0.9),
      Math.round(p.radius * 0.9)
    );
    ctx.restore();
  }

  // 7. Foreground VFX (slashes, explosions, clashes, lightning)
  for (const v of engine.vfx) {
    if (
      v.type === 'slash' ||
      v.type === 'explosion' ||
      v.type === 'clash' ||
      v.type === 'lightning'
    ) {
      const t = v.age / v.duration;
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - t);
      if (v.type === 'slash') {
        ctx.translate(v.x, v.y);
        ctx.rotate(v.angle ?? 0);
        ctx.strokeStyle = v.color;
        ctx.lineWidth = 12 * (1 - t * 0.5);
        ctx.beginPath();
        ctx.arc(0, 0, v.radius * (0.75 + t * 0.35), -1.1, 1.1);
        ctx.stroke();

        ctx.strokeStyle = v.secondaryColor ?? '#ffffff';
        ctx.lineWidth = 5 * (1 - t * 0.5);
        ctx.beginPath();
        ctx.arc(0, 0, v.radius * (0.78 + t * 0.35), -0.9, 0.9);
        ctx.stroke();
      } else if (v.type === 'explosion') {
        const r = v.radius * (0.35 + t * 0.78);
        ctx.fillStyle = v.color;
        ctx.globalAlpha = (1 - t) * 0.45;
        ctx.beginPath();
        ctx.arc(v.x, v.y, r, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = 1 - t;
        ctx.strokeStyle = v.secondaryColor ?? '#ffffff';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(v.x, v.y, r, 0, Math.PI * 2);
        ctx.stroke();
      } else if (v.type === 'clash') {
        // 8-point anime star clash burst
        const r = v.radius * (0.4 + t * 0.9);
        ctx.translate(v.x, v.y);
        ctx.rotate(t * 2);
        for (let k = 0; k < 8; k++) {
          ctx.rotate(Math.PI / 4);
          ctx.strokeStyle = k % 2 === 0 ? v.color : v.secondaryColor ?? '#ffffff';
          ctx.lineWidth = 4 * (1 - t);
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(r, 0);
          ctx.stroke();
        }
      } else if (v.type === 'lightning') {
        // Jagged sky-to-ground anime thunderbolt
        ctx.strokeStyle = v.color;
        ctx.lineWidth = 9 * (1 - t * 0.6);
        ctx.beginPath();
        ctx.moveTo(v.x, 0);
        const segs = 8;
        for (let s = 1; s <= segs; s++) {
          const py = (v.y * s) / segs;
          const jitter = s === segs ? 0 : (Math.sin(s * 12 + v.age * 40) * 24);
          ctx.lineTo(v.x + jitter, py);
        }
        ctx.stroke();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  // 8. Ambient Cherry Blossom Petals
  for (const pt of engine.petals) {
    ctx.fillStyle = pt.color;
    ctx.fillRect(Math.round(pt.x), Math.round(pt.y), pt.size, pt.size);
  }

  // 9. Pixel Particles
  for (const p of engine.particles) {
    const t = p.age / p.duration;
    ctx.save();
    ctx.globalAlpha = Math.max(0, 1 - t);
    ctx.fillStyle = p.color;
    ctx.fillRect(Math.round(p.x - p.size / 2), Math.round(p.y - p.size / 2), p.size, p.size);
    ctx.restore();
  }

  // 10. Floating Combat Text
  for (const ft of engine.floatingTexts) {
    const t = ft.age / ft.duration;
    ctx.save();
    ctx.globalAlpha = Math.min(1, (1 - t) * 1.4);
    ctx.font = `900 ${Math.round(18 * ft.scale)}px "Courier New", monospace`;
    ctx.textAlign = 'center';
    ctx.lineWidth = 5;
    ctx.strokeStyle = '#09090b';
    ctx.strokeText(ft.text, Math.round(ft.x), Math.round(ft.y));
    ctx.fillStyle = ft.color;
    ctx.fillText(ft.text, Math.round(ft.x), Math.round(ft.y));
    ctx.restore();
  }

  // 11. Screen Flash
  if (engine.screenFlash > 0.01) {
    ctx.save();
    ctx.globalAlpha = engine.screenFlash * 0.45;
    ctx.fillStyle = engine.screenFlashColor;
    ctx.fillRect(0, 0, ARENA_WIDTH, ARENA_HEIGHT);
    ctx.restore();
  }

  // 12. Anime Speedlines + Ultimate Cut-in Banner
  if (engine.callout) {
    const c = engine.callout;
    const t = c.age / c.duration;
    const slide = t < 0.14 ? t / 0.14 : t > 0.8 ? (1 - t) / 0.2 : 1;

    // Radial anime speedlines along outer edges
    ctx.save();
    ctx.globalAlpha = slide * 0.45;
    ctx.strokeStyle = c.color;
    ctx.lineWidth = 3;
    const cx = ARENA_WIDTH / 2;
    const cy = ARENA_HEIGHT / 2;
    for (let i = 0; i < 28; i++) {
      const a = (i / 28) * Math.PI * 2 + engine.elapsed * 0.6;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * 430, cy + Math.sin(a) * 260);
      ctx.lineTo(cx + Math.cos(a) * 760, cy + Math.sin(a) * 480);
      ctx.stroke();
    }
    ctx.restore();

    const bannerY = 86;
    ctx.save();
    ctx.globalAlpha = Math.min(1, slide * 1.1);
    ctx.fillStyle = 'rgba(9, 11, 24, 0.9)';
    ctx.fillRect(0, bannerY, ARENA_WIDTH, 62);
    ctx.fillStyle = c.color;
    ctx.fillRect(0, bannerY, ARENA_WIDTH, 4);
    ctx.fillRect(0, bannerY + 58, ARENA_WIDTH, 4);

    ctx.textAlign = 'center';
    ctx.font = 'bold 14px "Courier New", monospace';
    ctx.fillStyle = c.side === 'player' ? '#38bdf8' : '#fb7185';
    ctx.fillText(
      `${c.side === 'player' ? '★ ULTIMATE ALIADO' : '⚡ ULTIMATE INIMIGO'} — ${c.heroName.toUpperCase()}`,
      ARENA_WIDTH / 2,
      bannerY + 23
    );
    ctx.font = '900 26px "Courier New", monospace';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(c.skillName.toUpperCase(), ARENA_WIDTH / 2, bannerY + 50);
    ctx.restore();
  }

  // 13. Arena Event Banner (Orbs / Lightning / Overdrive)
  if (engine.eventBanner && !engine.callout) {
    const eb = engine.eventBanner;
    const t = eb.age / eb.duration;
    const alpha = t < 0.15 ? t / 0.15 : t > 0.8 ? (1 - t) / 0.2 : 1;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = 'rgba(9, 11, 24, 0.84)';
    ctx.fillRect(ARENA_WIDTH / 2 - 330, 18, 660, 38);
    ctx.strokeStyle = eb.color;
    ctx.lineWidth = 2;
    ctx.strokeRect(ARENA_WIDTH / 2 - 330, 18, 660, 38);
    ctx.font = '900 15px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = eb.color;
    ctx.fillText(eb.text, ARENA_WIDTH / 2, 42);
    ctx.restore();
  }

  ctx.restore();
}

function drawHero(ctx: CanvasRenderingContext2D, h: HeroRuntime, assets: LoadedAssets): void {
  ctx.save();
  ctx.globalAlpha = h.deathAlpha;

  // Ground shadow + team ring
  ctx.fillStyle = 'rgba(0, 0, 0, 0.44)';
  ctx.beginPath();
  ctx.ellipse(h.x, h.y + 4, 28, 12, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = h.side === 'player' ? '#38bdf8' : '#f43f5e';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.ellipse(h.x, h.y + 4, 28, 12, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Awakened persistent golden aura
  if (h.awakened && h.alive) {
    ctx.save();
    ctx.strokeStyle = '#fde047';
    ctx.lineWidth = 3;
    ctx.globalAlpha = 0.55 + Math.sin(h.animTime * 10) * 0.25;
    ctx.beginPath();
    ctx.ellipse(h.x, h.y - 24, 38, 46, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // Ultimate Aura
  if (h.ultimateAura > 0) {
    ctx.save();
    ctx.strokeStyle = h.def.color;
    ctx.lineWidth = 5;
    ctx.globalAlpha = Math.min(1, h.ultimateAura) * 0.85;
    ctx.beginPath();
    ctx.ellipse(h.x, h.y - 24, 42, 52, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // Procedural Anime Sprite Animation
  const isMoving = Math.hypot(h.vx, h.vy) > 6;
  const bob = isMoving ? Math.abs(Math.sin(h.walkPhase)) * 8 : Math.sin(h.animTime * 4) * 2;
  const lunge = h.attackAnim > 0 ? Math.sin((h.attackAnim / 0.36) * Math.PI) * 18 * h.facing : 0;
  const scaleX = (isMoving ? 1 + Math.sin(h.walkPhase * 2) * 0.05 : 1) * h.facing;
  const scaleY = isMoving
    ? 1 - Math.sin(h.walkPhase * 2) * 0.05
    : 1 + Math.sin(h.animTime * 4) * 0.03;

  const sprite = assets.sprites[h.heroId];
  const drawSize = 102;

  ctx.save();
  ctx.translate(Math.round(h.x + lunge), Math.round(h.y - bob));
  ctx.scale(scaleX, scaleY);

  if (sprite) {
    ctx.drawImage(sprite, -drawSize / 2, -drawSize + 16, drawSize, drawSize);
    if (h.hitFlash > 0) {
      ctx.globalCompositeOperation = 'source-atop';
      ctx.fillStyle = 'rgba(255,255,255,0.78)';
      ctx.fillRect(-drawSize / 2, -drawSize + 16, drawSize, drawSize);
    }
  } else {
    ctx.fillStyle = h.hitFlash > 0 ? '#ffffff' : h.def.color;
    ctx.fillRect(-20, -64, 40, 64);
  }
  ctx.restore();

  // Shield dome visual
  if (h.shield > 0 && h.alive) {
    ctx.save();
    ctx.strokeStyle = 'rgba(96, 165, 250, 0.88)';
    ctx.fillStyle = 'rgba(96, 165, 250, 0.16)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(h.x, h.y - 30, 39, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  // Overhead HP + Shield + Energy Bars
  if (h.alive) {
    const bw = 66;
    const bx = Math.round(h.x - bw / 2);
    const by = Math.round(h.y - 90);

    ctx.font = 'bold 12px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#09090b';
    ctx.fillText(h.def.name, h.x + 1, by - 4);
    ctx.fillStyle = h.awakened ? '#fde047' : h.side === 'player' ? '#e0f2fe' : '#fecdd3';
    ctx.fillText(h.def.name, h.x, by - 5);

    ctx.fillStyle = '#09090b';
    ctx.fillRect(bx - 1, by - 1, bw + 2, 9);
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(bx, by, bw, 7);

    const hpRatio = Math.max(0, h.hp / h.maxHp);
    ctx.fillStyle = h.side === 'player' ? '#22c55e' : '#ef4444';
    ctx.fillRect(bx, by, Math.round(bw * hpRatio), 7);

    if (h.shield > 0) {
      const shRatio = Math.min(1, h.shield / h.maxHp);
      ctx.fillStyle = '#60a5fa';
      ctx.fillRect(bx, by, Math.round(bw * shRatio), 3);
    }

    ctx.fillStyle = '#09090b';
    ctx.fillRect(bx - 1, by + 8, bw + 2, 5);
    ctx.fillStyle = h.energy >= 99 ? '#fde047' : '#38bdf8';
    ctx.fillRect(bx, by + 9, Math.round(bw * (h.energy / 100)), 3);

    const icons: string[] = [];
    for (const st of h.statuses) {
      if (st.type === 'stun') icons.push('⚡');
      else if (st.type === 'burn') icons.push('🔥');
      else if (st.type === 'slow') icons.push('❄️');
      else if (st.type === 'atkBuff') icons.push('▲');
      else if (st.type === 'taunt') icons.push('!');
    }
    if (icons.length > 0) {
      ctx.font = 'bold 12px sans-serif';
      ctx.fillStyle = '#fef08a';
      ctx.fillText(icons.join(' '), h.x, by - 18);
    }
  }

  ctx.restore();
}
