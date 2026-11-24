import { ARENA_HEIGHT, ARENA_WIDTH, BattleEngine } from './engine';
import type { HeroId, HeroRuntime, Projectile } from './types';
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
  assets: LoadedAssets,
  showOverheadBars = true
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

  if (engine.overdrive) {
    const pulse = 0.06 + Math.sin(engine.elapsed * 6) * 0.04;
    ctx.fillStyle = `rgba(244, 63, 94, ${pulse})`;
    ctx.fillRect(0, 0, ARENA_WIDTH, ARENA_HEIGHT);
  }

  // 2. Telegraphed Arena Hazards
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
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(orb.x, orb.y + 8, 20, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(orb.x, orb.y - 16 + bob, 18 + Math.sin(orb.age * 7) * 3, 0, Math.PI * 2);
    ctx.stroke();

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

  // 4. Ground VFX (rings, heals, dash ghosts, sprite afterimages, spinning rune circles, ground cracks)
  for (const v of engine.vfx) {
    if (
      v.type === 'ring' ||
      v.type === 'heal' ||
      v.type === 'dash_ghost' ||
      v.type === 'sprite_ghost' ||
      v.type === 'rune_circle' ||
      v.type === 'ground_crack'
    ) {
      const t = v.age / v.duration;
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - t);
      if (v.type === 'sprite_ghost' && v.heroId) {
        const sp = assets.sprites[v.heroId];
        if (sp) {
          const drawSize = 118;
          ctx.globalAlpha = (1 - t) * 0.52;
          ctx.translate(Math.round(v.x), Math.round(v.y - (v.z ?? 0)));
          ctx.scale(v.facing ?? 1, 1);
          ctx.drawImage(sp, -drawSize / 2, -drawSize + 14, drawSize, drawSize);
          // Colored speed aura outline
          ctx.strokeStyle = v.color;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.ellipse(0, -34, 34 * (1 - t * 0.2), 42 * (1 - t * 0.2), 0, 0, Math.PI * 2);
          ctx.stroke();
        }
      } else if (v.type === 'ground_crack') {
        // Radiating floor impact cracks + dust shockwave!
        ctx.translate(v.x, v.y);
        ctx.strokeStyle = '#09090b';
        ctx.lineWidth = 4;
        for (let k = 0; k < 7; k++) {
          const a = (k / 7) * Math.PI * 2 + 0.3;
          const r1 = v.radius * 0.35;
          const r2 = v.radius * (0.75 + (k % 2) * 0.25);
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(Math.cos(a) * r1, Math.sin(a) * r1 * 0.5);
          ctx.lineTo(Math.cos(a + 0.14) * r2, Math.sin(a + 0.14) * r2 * 0.5);
          ctx.stroke();
        }
        ctx.strokeStyle = v.color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(0, 0, v.radius * (0.3 + t * 0.8), v.radius * 0.45 * (0.3 + t * 0.8), 0, 0, Math.PI * 2);
        ctx.stroke();
      } else if (v.type === 'dash_ghost') {
        ctx.fillStyle = v.color;
        ctx.beginPath();
        ctx.ellipse(v.x, v.y - 24, 20 * (1 - t * 0.4), 30 * (1 - t * 0.3), 0, 0, Math.PI * 2);
        ctx.fill();
      } else if (v.type === 'rune_circle') {
        ctx.translate(v.x, v.y);
        ctx.scale(1, 0.5);
        ctx.rotate(v.age * 4);
        ctx.strokeStyle = v.color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, v.radius * (0.6 + t * 0.5), 0, Math.PI * 2);
        ctx.stroke();
        const r = v.radius * (0.55 + t * 0.45);
        ctx.strokeStyle = v.secondaryColor ?? '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(r, 0);
        ctx.lineTo(0, r);
        ctx.lineTo(-r, 0);
        ctx.lineTo(0, -r);
        ctx.closePath();
        ctx.stroke();
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
          // Rising healing '+' crosses!
          ctx.globalAlpha = 1 - t;
          ctx.font = 'bold 16px sans-serif';
          ctx.fillStyle = '#4ade80';
          ctx.fillText('✚', v.x - 16, v.y - 10 - t * 38);
          ctx.fillText('✚', v.x + 14, v.y - 24 - t * 44);
        }
      }
      ctx.restore();
    }
  }

  // 5. Y-sorted Heroes
  const sortedHeroes = [...engine.heroes].sort((a, b) => a.y - b.y);
  for (const h of sortedHeroes) {
    if (h.deathAlpha <= 0.02) continue;
    drawHero(ctx, h, assets, showOverheadBars);
  }

  // 6. Real Animated Weapon & Spell Projectiles
  for (const p of engine.projectiles) {
    drawProjectile(ctx, p);
  }

  // 7. Foreground VFX (slashes, cross_slash, explosions, clashes, lightning, muzzle)
  for (const v of engine.vfx) {
    const t = v.age / v.duration;
    if (v.type === 'slash' || v.type === 'cross_slash') {
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - t);
      ctx.translate(v.x, v.y);
      ctx.rotate(v.angle ?? 0);

      const drawArc = (rotOffset: number, radScale: number) => {
        ctx.save();
        ctx.rotate(rotOffset);
        ctx.strokeStyle = v.color;
        ctx.lineWidth = 12 * (1 - t * 0.5);
        ctx.beginPath();
        ctx.arc(0, 0, v.radius * radScale * (0.75 + t * 0.35), -1.15, 1.15);
        ctx.stroke();

        ctx.strokeStyle = v.secondaryColor ?? '#ffffff';
        ctx.lineWidth = 5 * (1 - t * 0.5);
        ctx.beginPath();
        ctx.arc(0, 0, v.radius * radScale * (0.78 + t * 0.35), -0.9, 0.9);
        ctx.stroke();
        ctx.restore();
      };

      drawArc(0, 1);
      if (v.type === 'cross_slash') {
        drawArc(Math.PI * 0.42, 0.88);
      }
      ctx.restore();
    } else if (v.type === 'muzzle') {
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - t);
      ctx.translate(v.x, v.y);
      ctx.rotate(v.angle ?? 0);
      const r = v.radius * (0.5 + t * 0.8);
      ctx.fillStyle = v.color;
      ctx.beginPath();
      ctx.moveTo(r * 1.4, 0);
      ctx.lineTo(0, -r * 0.55);
      ctx.lineTo(-r * 0.3, 0);
      ctx.lineTo(0, r * 0.55);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(r * 0.25, 0, r * 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else if (v.type === 'explosion') {
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - t);
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
      ctx.restore();
    } else if (v.type === 'clash') {
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - t);
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
      ctx.restore();
    } else if (v.type === 'lightning') {
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - t);
      ctx.strokeStyle = v.color;
      ctx.lineWidth = 9 * (1 - t * 0.6);
      ctx.beginPath();
      ctx.moveTo(v.x, 0);
      const segs = 8;
      for (let s = 1; s <= segs; s++) {
        const py = (v.y * s) / segs;
        const jitter = s === segs ? 0 : Math.sin(s * 12 + v.age * 40) * 24;
        ctx.lineTo(v.x + jitter, py);
      }
      ctx.stroke();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.restore();
    } else if (v.type === 'teleport_line' && v.targetX !== undefined && v.targetY !== undefined) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - t);
      ctx.strokeStyle = v.color;
      ctx.lineWidth = 10 * (1 - t * 0.7);
      ctx.beginPath();
      ctx.moveTo(v.x, v.y);
      ctx.lineTo(v.targetX, v.targetY);
      ctx.stroke();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3 * (1 - t * 0.5);
      ctx.stroke();
      ctx.restore();
    } else if (v.type === 'heal_beam' && v.targetX !== undefined && v.targetY !== undefined) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - t);
      ctx.strokeStyle = v.color;
      ctx.lineWidth = 9 * (1 - t * 0.5);
      ctx.beginPath();
      ctx.moveTo(v.x, v.y);
      const midX = (v.x + v.targetX) / 2;
      const midY = (v.y + v.targetY) / 2 - 42;
      ctx.quadraticCurveTo(midX, midY, v.targetX, v.targetY);
      ctx.stroke();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.restore();
    } else if (v.type === 'meteor_drop') {
      // Falling flaming meteor streaking diagonally into the impact point!
      ctx.save();
      const drop = Math.min(1, t * 2.2);
      const mx = v.x - (1 - drop) * 140;
      const my = v.y - (1 - drop) * 260;
      ctx.globalAlpha = Math.max(0, 1 - t * 0.85);
      // Flame trail
      ctx.strokeStyle = v.color;
      ctx.lineWidth = 22 * (1 - t * 0.4);
      ctx.beginPath();
      ctx.moveTo(mx - 60, my - 110);
      ctx.lineTo(mx, my);
      ctx.stroke();
      // Glowing meteor core
      ctx.fillStyle = v.secondaryColor ?? '#fde047';
      ctx.beginPath();
      ctx.arc(mx, my, 20 * (1 - t * 0.3), 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(mx, my, 10 * (1 - t * 0.3), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else if (v.type === 'ice_spikes') {
      // 5 Jagged Ice Spears erupting upward from the arena floor!
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - t);
      const grow = Math.min(1, t * 3.5);
      for (let i = -2; i <= 2; i++) {
        const sx = v.x + i * (v.radius * 0.36);
        const sy = v.y + (Math.abs(i) % 2) * 10;
        const h = (54 - Math.abs(i) * 8) * grow;
        ctx.fillStyle = v.color;
        ctx.beginPath();
        ctx.moveTo(sx - 10, sy);
        ctx.lineTo(sx, sy - h);
        ctx.lineTo(sx + 10, sy);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(sx - 4, sy);
        ctx.lineTo(sx, sy - h * 0.85);
        ctx.lineTo(sx + 2, sy);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    } else if (v.type === 'buff_rise') {
      // Rising golden power-up arrows around buffed hero
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - t);
      ctx.font = '900 18px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = v.color;
      ctx.fillText('▲', v.x - 22, v.y - t * 52);
      ctx.fillText('▲', v.x, v.y - 16 - t * 62);
      ctx.fillText('▲', v.x + 22, v.y - t * 52);
      ctx.restore();
    } else if (v.type === 'impact_star') {
      // Razor-sharp 6-point anime crit impact star!
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - t);
      ctx.translate(v.x, v.y);
      ctx.rotate(t * 1.6);
      const r = v.radius * (0.6 + t * 0.6);
      ctx.fillStyle = v.color;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI) / 3;
        ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        ctx.lineTo(Math.cos(a + Math.PI / 6) * (r * 0.25), Math.sin(a + Math.PI / 6) * (r * 0.25));
      }
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.25, 0, Math.PI * 2);
      ctx.fill();
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
    ctx.globalAlpha = engine.screenFlash * 0.42;
    ctx.fillStyle = engine.screenFlashColor;
    ctx.fillRect(0, 0, ARENA_WIDTH, ARENA_HEIGHT);
    ctx.restore();
  }

  // 12. Anime Speedlines + Ultimate Cut-in Banner
  if (engine.callout) {
    const c = engine.callout;
    const t = c.age / c.duration;
    const slide = t < 0.14 ? t / 0.14 : t > 0.8 ? (1 - t) / 0.2 : 1;

    ctx.save();
    ctx.globalAlpha = slide * 0.42;
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

    const bannerY = 92;
    ctx.save();
    ctx.globalAlpha = Math.min(1, slide * 1.1);
    ctx.fillStyle = 'rgba(9, 11, 24, 0.9)';
    ctx.fillRect(0, bannerY, ARENA_WIDTH, 60);
    ctx.fillStyle = c.color;
    ctx.fillRect(0, bannerY, ARENA_WIDTH, 4);
    ctx.fillRect(0, bannerY + 56, ARENA_WIDTH, 4);

    ctx.textAlign = 'center';
    ctx.font = 'bold 13px "Courier New", monospace';
    ctx.fillStyle = c.side === 'player' ? '#38bdf8' : '#fb7185';
    ctx.fillText(
      `${c.side === 'player' ? '★ ULTIMATE ALIADO' : '⚡ ULTIMATE INIMIGO'} — ${c.heroName.toUpperCase()}`,
      ARENA_WIDTH / 2,
      bannerY + 22
    );
    ctx.font = '900 24px "Courier New", monospace';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(c.skillName.toUpperCase(), ARENA_WIDTH / 2, bannerY + 48);
    ctx.restore();
  }

  // 13. Arena Event Banner
  if (engine.eventBanner && !engine.callout) {
    const eb = engine.eventBanner;
    const t = eb.age / eb.duration;
    const alpha = t < 0.15 ? t / 0.15 : t > 0.8 ? (1 - t) / 0.2 : 1;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = 'rgba(9, 11, 24, 0.84)';
    ctx.fillRect(ARENA_WIDTH / 2 - 320, 74, 640, 34);
    ctx.strokeStyle = eb.color;
    ctx.lineWidth = 2;
    ctx.strokeRect(ARENA_WIDTH / 2 - 320, 74, 640, 34);
    ctx.font = '900 14px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = eb.color;
    ctx.fillText(eb.text, ARENA_WIDTH / 2, 96);
    ctx.restore();
  }

  ctx.restore();
}

function drawProjectile(ctx: CanvasRenderingContext2D, p: Projectile): void {
  const angle = Math.atan2(p.vy, p.vx);

  // Motion trail ribbon
  if (p.trail.length > 1) {
    ctx.save();
    for (let i = 1; i < p.trail.length; i++) {
      const a = p.trail[i - 1];
      const b = p.trail[i];
      const ratio = i / p.trail.length;
      ctx.strokeStyle = p.color;
      ctx.globalAlpha = ratio * 0.55;
      ctx.lineWidth = Math.max(2, p.radius * 0.65 * ratio);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
    ctx.restore();
  }

  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(angle);

  switch (p.style) {
    case 'arrow': {
      // Glowing energy arrow: long shaft + sharp triangular arrowhead + twin fletching feathers!
      const len = p.radius * 2.5;
      // Outer glow shaft
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(-len, 0);
      ctx.lineTo(len * 0.6, 0);
      ctx.stroke();
      // White core shaft
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(-len * 0.95, 0);
      ctx.lineTo(len * 0.7, 0);
      ctx.stroke();
      // Arrowhead
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.moveTo(len * 1.15, 0);
      ctx.lineTo(len * 0.3, -8);
      ctx.lineTo(len * 0.45, 0);
      ctx.lineTo(len * 0.3, 8);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(len * 0.95, 0);
      ctx.lineTo(len * 0.45, -3.5);
      ctx.lineTo(len * 0.45, 3.5);
      ctx.closePath();
      ctx.fill();
      // Fletching feathers at tail
      ctx.strokeStyle = p.secondaryColor;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(-len * 0.7, 0);
      ctx.lineTo(-len * 1.15, -6);
      ctx.moveTo(-len * 0.7, 0);
      ctx.lineTo(-len * 1.15, 6);
      ctx.stroke();
      break;
    }

    case 'shuriken': {
      // Rapidly spinning 4-point ninja star!
      ctx.rotate(p.life * 24);
      const r = p.radius * 1.25;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      for (let i = 0; i < 4; i++) {
        const a = (i * Math.PI) / 2;
        ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        ctx.lineTo(Math.cos(a + Math.PI / 4) * (r * 0.35), Math.sin(a + Math.PI / 4) * (r * 0.35));
      }
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = p.secondaryColor;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#090b16';
      ctx.beginPath();
      ctx.arc(0, 0, 3, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'blade_wave': {
      // Anime crescent Getsuga slash wave!
      const r = p.radius * 2.1;
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.arc(-r * 0.35, 0, r, -0.95, 0.95);
      ctx.stroke();
      ctx.strokeStyle = p.secondaryColor;
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.arc(-r * 0.3, 0, r * 0.95, -0.8, 0.8);
      ctx.stroke();
      break;
    }

    case 'laser': {
      // Elongated high-velocity neon plasma rail-beam!
      const len = p.radius * 3.0;
      ctx.fillStyle = p.color;
      ctx.fillRect(-len, -p.radius * 0.45, len * 2, p.radius * 0.9);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-len * 0.9, -p.radius * 0.2, len * 1.8, p.radius * 0.4);
      break;
    }

    case 'ice_lance': {
      // Sharp crystalline ice spear!
      const len = p.radius * 2.3;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.moveTo(len, 0);
      ctx.lineTo(0, -7);
      ctx.lineTo(-len * 0.85, 0);
      ctx.lineTo(0, 7);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(len * 0.8, 0);
      ctx.lineTo(0, -3);
      ctx.lineTo(-len * 0.5, 0);
      ctx.lineTo(0, 3);
      ctx.closePath();
      ctx.fill();
      break;
    }

    case 'fireball': {
      // Blazing comet fireball with flame tail!
      const r = p.radius * 1.1;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.moveTo(-r * 2.4, 0);
      ctx.lineTo(0, -r * 0.95);
      ctx.arc(0, 0, r * 0.95, -Math.PI / 2, Math.PI / 2);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = p.secondaryColor;
      ctx.beginPath();
      ctx.arc(r * 0.1, 0, r * 0.55, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'soul_flame': {
      // Wavy spectral soul flame!
      const r = p.radius * 1.1;
      const wobble = Math.sin(p.life * 22) * 3;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.moveTo(-r * 2.2, wobble);
      ctx.quadraticCurveTo(-r * 0.5, -r * 1.1, r, 0);
      ctx.quadraticCurveTo(-r * 0.5, r * 1.1, -r * 2.2, wobble);
      ctx.fill();
      ctx.fillStyle = p.secondaryColor;
      ctx.beginPath();
      ctx.arc(r * 0.2, 0, r * 0.45, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    default: {
      // Arcane / Celestial Orb with rotating diamond ring
      const r = p.radius;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.rotate(p.life * 10);
      ctx.strokeStyle = p.secondaryColor;
      ctx.lineWidth = 2;
      ctx.strokeRect(-r * 0.8, -r * 0.8, r * 1.6, r * 1.6);
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.4, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
  }

  ctx.restore();
}

function drawHero(
  ctx: CanvasRenderingContext2D,
  h: HeroRuntime,
  assets: LoadedAssets,
  showOverheadBars: boolean
): void {
  ctx.save();
  ctx.globalAlpha = h.deathAlpha;

  // Ground shadow shrinks when leaping high in 2.5D!
  const FLYERS: HeroId[] = ['ignis', 'bahamut', 'sylph', 'golem', 'seraph', 'freya', 'raijin'];
  const hoverZ = FLYERS.includes(h.heroId) ? 14 + Math.sin(h.animTime * 4.5) * 6 : 0;
  const totalZ = h.z + hoverZ;
  const shadowScale = Math.max(0.55, 1 - totalZ / 160);

  ctx.fillStyle = 'rgba(0, 0, 0, 0.44)';
  ctx.beginPath();
  ctx.ellipse(h.x, h.y + 4, 28 * shadowScale, 12 * shadowScale, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = h.side === 'player' ? '#38bdf8' : '#f43f5e';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.ellipse(h.x, h.y + 4, 28 * shadowScale, 12 * shadowScale, 0, 0, Math.PI * 2);
  ctx.stroke();

  if (h.awakened && h.alive) {
    ctx.save();
    ctx.strokeStyle = '#fde047';
    ctx.lineWidth = 3;
    ctx.globalAlpha = 0.55 + Math.sin(h.animTime * 10) * 0.25;
    ctx.beginPath();
    ctx.ellipse(h.x, h.y - 24 - totalZ, 38, 46, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  if (h.ultimateAura > 0) {
    ctx.save();
    ctx.strokeStyle = h.def.color;
    ctx.lineWidth = 5;
    ctx.globalAlpha = Math.min(1, h.ultimateAura) * 0.85;
    ctx.beginPath();
    ctx.ellipse(h.x, h.y - 24 - totalZ, 42, 52, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // Expressive Procedural Anime Animation: breathing + walk hop + 2.5D jump height + attack lunge & swing tilt!
  const isMoving = Math.hypot(h.vx, h.vy) > 6;
  const bob = isMoving ? Math.abs(Math.sin(h.walkPhase)) * 9 : Math.sin(h.animTime * 4) * 2;
  const atkProgress = h.attackAnim > 0 ? Math.sin((h.attackAnim / 0.4) * Math.PI) : 0;
  const lunge = atkProgress * (h.def.basicAttackIsRanged ? -10 : 26) * h.facing;
  const tilt = atkProgress * (h.def.basicAttackIsRanged ? -0.18 : 0.28) * h.facing;
  const scaleX = (isMoving ? 1 + Math.sin(h.walkPhase * 2) * 0.05 : 1 + atkProgress * 0.1) * h.facing;
  const scaleY = isMoving
    ? 1 - Math.sin(h.walkPhase * 2) * 0.05
    : 1 + Math.sin(h.animTime * 4) * 0.03 - atkProgress * 0.07;

  const sprite = assets.sprites[h.heroId];
  const drawSize = 118;

  ctx.save();
  ctx.translate(Math.round(h.x + lunge), Math.round(h.y - bob - totalZ));
  ctx.rotate(tilt);
  ctx.scale(scaleX, scaleY);

  if (sprite) {
    ctx.drawImage(sprite, -drawSize / 2, -drawSize + 14, drawSize, drawSize);
    if (h.hitFlash > 0) {
      ctx.globalCompositeOperation = 'source-atop';
      ctx.fillStyle = 'rgba(255,255,255,0.78)';
      ctx.fillRect(-drawSize / 2, -drawSize + 14, drawSize, drawSize);
    }
  } else {
    ctx.fillStyle = h.hitFlash > 0 ? '#ffffff' : h.def.color;
    ctx.fillRect(-20, -64, 40, 64);
  }
  ctx.restore();

  if (h.shield > 0 && h.alive) {
    ctx.save();
    ctx.strokeStyle = 'rgba(96, 165, 250, 0.88)';
    ctx.fillStyle = 'rgba(96, 165, 250, 0.14)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(h.x, h.y - 30, 39, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  // Sleek Optional Overhead Bars
  if (h.alive && showOverheadBars) {
    const bw = 60;
    const bx = Math.round(h.x - bw / 2);
    const by = Math.round(h.y - 90);

    ctx.fillStyle = '#09090b';
    ctx.fillRect(bx - 1, by - 1, bw + 2, 8);
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(bx, by, bw, 6);

    const hpRatio = Math.max(0, h.hp / h.maxHp);
    ctx.fillStyle = h.side === 'player' ? '#22c55e' : '#ef4444';
    ctx.fillRect(bx, by, Math.round(bw * hpRatio), 6);

    if (h.shield > 0) {
      const shRatio = Math.min(1, h.shield / h.maxHp);
      ctx.fillStyle = '#60a5fa';
      ctx.fillRect(bx, by, Math.round(bw * shRatio), 3);
    }

    ctx.fillStyle = '#09090b';
    ctx.fillRect(bx - 1, by + 7, bw + 2, 4);
    ctx.fillStyle = h.energy >= 99 ? '#fde047' : '#38bdf8';
    ctx.fillRect(bx, by + 8, Math.round(bw * (h.energy / 100)), 2);

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
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fef08a';
      ctx.fillText(icons.join(' '), h.x, by - 6);
    }
  }

  ctx.restore();
}
