import type {
  AmbientPetal,
  ArenaHazard,
  ArenaOrb,
  BattleResult,
  FloatingText,
  FormationSlot,
  HeroId,
  HeroRuntime,
  Particle,
  Projectile,
  ProjectileStyle,
  SkillDef,
  TeamMemberConfig,
  TeamSide,
  UltimateCallout,
  VfxEffect,
} from './types';
import { HEROES } from './heroes';
import { sound } from './sound';

export const ARENA_WIDTH = 1280;
export const ARENA_HEIGHT = 720;
export const FLOOR_MIN_X = 76;
export const FLOOR_MAX_X = 1204;
export const FLOOR_MIN_Y = 250;
export const FLOOR_MAX_Y = 664;

let nextUid = 1;
function uid(prefix: string): string {
  return `${prefix}_${nextUid++}`;
}

export function slotToCoords(slot: FormationSlot, side: TeamSide): { x: number; y: number } {
  const colMapPlayer = { back: 165, mid: 305, front: 445 };
  const colMapEnemy = { back: 1115, mid: 975, front: 835 };
  const rowMap = { top: 305, center: 455, bottom: 605 };
  return {
    x: side === 'player' ? colMapPlayer[slot.col] : colMapEnemy[slot.col],
    y: rowMap[slot.row],
  };
}

function resolveProjectileStyle(heroId: HeroId, skill?: SkillDef): ProjectileStyle {
  if (skill?.projectileStyle) return skill.projectileStyle;
  if (skill?.id === 'kage_shuriken') return 'shuriken';
  if (skill?.id === 'ren_wind_wave' || skill?.id === 'ren_ult_tempest') return 'blade_wave';
  if (skill?.id === 'drake_fire_breath') return 'fireball';
  if (skill?.id === 'ryuji_shock_palm') return 'blade_wave';
  if (skill?.id === 'kael_soul_orb') return 'soul_flame';
  switch (heroId) {
    case 'sora':
      return 'arrow';
    case 'nova':
      return 'laser';
    case 'yuki':
      return 'ice_lance';
    case 'kage':
      return 'shuriken';
    case 'kael':
      return 'soul_flame';
    case 'ren':
    case 'drake':
      return 'blade_wave';
    default:
      return 'orb';
  }
}

export interface HudHeroSnapshot {
  uid: string;
  heroId: HeroId;
  name: string;
  role: string;
  color: string;
  spritePath: string;
  side: TeamSide;
  hp: number;
  maxHp: number;
  shield: number;
  energy: number;
  alive: boolean;
  awakened: boolean;
  statuses: Array<'burn' | 'stun' | 'slow' | 'atkBuff' | 'taunt'>;
}

export interface HudSnapshot {
  elapsed: number;
  overdrive: boolean;
  playerHpPct: number;
  enemyHpPct: number;
  playerHeroes: HudHeroSnapshot[];
  enemyHeroes: HudHeroSnapshot[];
}

export class BattleEngine {
  heroes: HeroRuntime[] = [];
  projectiles: Projectile[] = [];
  vfx: VfxEffect[] = [];
  particles: Particle[] = [];
  floatingTexts: FloatingText[] = [];
  orbs: ArenaOrb[] = [];
  hazards: ArenaHazard[] = [];
  petals: AmbientPetal[] = [];
  callout: UltimateCallout | null = null;
  eventBanner: { text: string; color: string; age: number; duration: number } | null = null;

  elapsed = 0;
  maxDuration = 95;
  overdrive = false;
  nextEventTimer = 6.5;
  hitstop = 0;
  screenShake = 0;
  screenFlash = 0;
  screenFlashColor = '#ffffff';
  cameraZoom = 1.0;
  finished = false;
  result: BattleResult | null = null;

  constructor(
    playerTeam: TeamMemberConfig[],
    enemyTeam: TeamMemberConfig[],
    enemyStatScale = 1.0
  ) {
    this.spawnTeam(playerTeam, 'player', 1.0);
    this.spawnTeam(enemyTeam, 'enemy', enemyStatScale);
    this.initAmbientPetals();
  }

  private initAmbientPetals(): void {
    for (let i = 0; i < 24; i++) {
      this.petals.push({
        x: Math.random() * ARENA_WIDTH,
        y: Math.random() * ARENA_HEIGHT,
        vx: -18 - Math.random() * 24,
        vy: 14 + Math.random() * 22,
        size: 3 + Math.floor(Math.random() * 3),
        phase: Math.random() * Math.PI * 2,
        color: Math.random() > 0.4 ? '#f472b6' : '#fbcfe8',
      });
    }
  }

  private spawnTeam(team: TeamMemberConfig[], side: TeamSide, statScale: number): void {
    team.forEach((member, idx) => {
      const def = HEROES[member.heroId];
      const pos = slotToCoords(member.slot, side);
      const activeSkills: SkillDef[] = member.activeSkillIds.map(
        (id) => def.activeSkills.find((s) => s.id === id) ?? def.activeSkills[0]
      );
      const ultimate =
        def.ultimates.find((u) => u.id === member.ultimateId) ?? def.ultimates[0];

      const maxHp = Math.round(def.baseStats.maxHp * statScale);
      const atk = Math.round(def.baseStats.atk * statScale);
      const defStat = Math.round(def.baseStats.def * (0.85 + 0.15 * statScale));

      this.heroes.push({
        uid: `${side}_${member.heroId}_${idx}`,
        heroId: member.heroId,
        def,
        side,
        x: pos.x,
        y: pos.y,
        vx: 0,
        vy: 0,
        facing: side === 'player' ? 1 : -1,
        hp: maxHp,
        maxHp,
        shield: 0,
        shieldTimer: 0,
        energy: 18,
        atk,
        defStat,
        moveSpeed: def.baseStats.moveSpeed * 1.18,
        alive: true,
        activeSkills,
        ultimate,
        skillCooldowns: activeSkills.map((_s, i) => 1.3 + i * 1.1 + Math.random() * 0.45),
        basicCooldown: 0.35 + Math.random() * 0.25,
        statuses: [],
        animTime: Math.random() * 6,
        walkPhase: 0,
        attackAnim: 0,
        hitFlash: 0,
        hurtKnockX: 0,
        ultimateAura: 0,
        deathAlpha: 1,
        awakened: false,
        dodgeCooldown: 2.0 + Math.random() * 1.5,
        damageDealt: 0,
        damageTaken: 0,
        healingDone: 0,
        kills: 0,
      });
    });
  }

  step(rawDt: number): void {
    if (this.finished) return;
    const dt = Math.min(rawDt, 0.05);

    if (this.screenShake > 0) this.screenShake = Math.max(0, this.screenShake - dt * 30);
    if (this.screenFlash > 0) this.screenFlash = Math.max(0, this.screenFlash - dt * 2.8);
    this.cameraZoom += (1.0 - this.cameraZoom) * Math.min(1, dt * 6);

    if (this.callout) {
      this.callout.age += dt;
      if (this.callout.age >= this.callout.duration) this.callout = null;
    }
    if (this.eventBanner) {
      this.eventBanner.age += dt;
      if (this.eventBanner.age >= this.eventBanner.duration) this.eventBanner = null;
    }

    // No hitstop freeze — continuous fluid 60fps anime action!
    this.hitstop = 0;
    this.elapsed += dt;

    // Activate Overdrive at 30s for dramatic late-game comebacks!
    if (!this.overdrive && this.elapsed >= 30) {
      this.overdrive = true;
      this.eventBanner = {
        text: '🔥 OVERDRIVE DA ARENA! VELOCIDADE & ENERGIA NO MÁXIMO!',
        color: '#f43f5e',
        age: 0,
        duration: 2.4,
      };
      this.screenShake = Math.max(this.screenShake, 7);
      this.screenFlash = 0.35;
      this.screenFlashColor = '#f43f5e';
      sound.playAwaken();
    }

    // Dynamic Unpredictable Arena Events
    this.nextEventTimer -= dt;
    if (this.nextEventTimer <= 0) {
      this.triggerRandomArenaEvent();
      this.nextEventTimer = 8.5 + Math.random() * 4.5;
    }

    this.updateOrbs(dt);
    this.updateHazards(dt);

    for (const h of this.heroes) {
      this.updateHero(h, dt);
    }

    this.applySeparation(dt);
    this.updateProjectiles(dt);
    this.updateVisualsOnly(dt);
    this.checkVictory();
  }

  private triggerRandomArenaEvent(): void {
    const roll = Math.random();
    if (roll < 0.55) {
      // Spawn a Kizuna Power Orb in the middle region
      const kinds: Array<ArenaOrb['kind']> = ['energy', 'heal', 'frenzy'];
      const kind = kinds[Math.floor(Math.random() * kinds.length)];
      const ox = 360 + Math.random() * 560;
      const oy = FLOOR_MIN_Y + 60 + Math.random() * (FLOOR_MAX_Y - FLOOR_MIN_Y - 120);
      this.orbs.push({
        id: uid('orb'),
        x: ox,
        y: oy,
        kind,
        age: 0,
        maxAge: 14,
      });
      this.vfx.push({
        id: uid('vfx'),
        type: 'ring',
        x: ox,
        y: oy,
        radius: 58,
        color: kind === 'energy' ? '#38bdf8' : kind === 'heal' ? '#4ade80' : '#f59e0b',
        age: 0,
        duration: 0.5,
      });
      this.eventBanner = {
        text:
          kind === 'energy'
            ? '✦ ORBE DE ENERGIA SURGIU NA ARENA!'
            : kind === 'heal'
            ? '✚ ORBE DE CURA SURGIU NA ARENA!'
            : '⚡ ORBE DE FRENESI SURGIU NA ARENA!',
        color: kind === 'energy' ? '#38bdf8' : kind === 'heal' ? '#4ade80' : '#f59e0b',
        age: 0,
        duration: 2.0,
      };
      sound.playHazardWarning();
    } else {
      // Spawn 3 telegraphed Lightning/Meteor strikes across the battlefield
      for (let i = 0; i < 3; i++) {
        const hx = 220 + Math.random() * 840;
        const hy = FLOOR_MIN_Y + 45 + Math.random() * (FLOOR_MAX_Y - FLOOR_MIN_Y - 90);
        this.hazards.push({
          id: uid('haz'),
          x: hx,
          y: hy,
          radius: 78,
          delay: 1.55 + i * 0.22,
          age: 0,
          detonated: false,
          color: '#f43f5e',
        });
      }
      this.eventBanner = {
        text: '⚡ TEMPESTADE DE RAIOS DO COLISEU! CUIDADO COM O CHÃO!',
        color: '#facc15',
        age: 0,
        duration: 2.0,
      };
      sound.playHazardWarning();
    }
  }

  private updateOrbs(dt: number): void {
    const alive = this.heroes.filter((h) => h.alive);
    for (const orb of this.orbs) {
      orb.age += dt;
      for (const h of alive) {
        if (Math.hypot(h.x - orb.x, h.y - orb.y) <= 44) {
          orb.age = orb.maxAge;
          sound.playOrbPickup();
          if (orb.kind === 'energy') {
            h.energy = Math.min(100, h.energy + 55);
            this.spawnFloatingText(h.x, h.y - 62, '+55 ENERGIA!', '#38bdf8', 1.25);
            this.spawnParticles(h.x, h.y - 24, '#38bdf8', 18, 170);
          } else if (orb.kind === 'heal') {
            const amt = Math.round(h.maxHp * 0.25);
            this.applyHeal(h, h, amt);
            this.spawnFloatingText(h.x, h.y - 62, 'CURA KIZUNA!', '#4ade80', 1.2);
          } else {
            this.applyStatus(h, h, { type: 'atkBuff', duration: 6, value: 0.35 });
            this.grantShield(h, Math.round(h.maxHp * 0.1), 4.5);
            this.spawnFloatingText(h.x, h.y - 62, 'FRENESI +35%!', '#f59e0b', 1.25);
            this.spawnParticles(h.x, h.y - 24, '#f59e0b', 18, 170);
          }
          break;
        }
      }
    }
    this.orbs = this.orbs.filter((o) => o.age < o.maxAge);
  }

  private updateHazards(dt: number): void {
    const alive = this.heroes.filter((h) => h.alive);
    for (const hz of this.hazards) {
      hz.age += dt;
      if (!hz.detonated && hz.age >= hz.delay) {
        hz.detonated = true;
        sound.playExplosion();
        this.screenShake = Math.max(this.screenShake, 6);
        this.vfx.push({
          id: uid('vfx'),
          type: 'lightning',
          x: hz.x,
          y: hz.y,
          radius: hz.radius,
          color: '#facc15',
          secondaryColor: '#ffffff',
          age: 0,
          duration: 0.4,
        });
        this.vfx.push({
          id: uid('vfx'),
          type: 'explosion',
          x: hz.x,
          y: hz.y,
          radius: hz.radius,
          color: '#f59e0b',
          secondaryColor: '#fef08a',
          age: 0,
          duration: 0.42,
        });
        this.spawnParticles(hz.x, hz.y - 12, '#facc15', 22, 220);

        for (const h of alive) {
          if (Math.hypot(h.x - hz.x, h.y - hz.y) <= hz.radius + 10) {
            this.applyDamage(null, h, 145, false, '#facc15', false);
          }
        }
      }
    }
    this.hazards = this.hazards.filter((hz) => !hz.detonated);
  }

  private updateVisualsOnly(dt: number): void {
    for (const v of this.vfx) v.age += dt;
    this.vfx = this.vfx.filter((v) => v.age < v.duration);

    for (const p of this.particles) {
      p.age += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.gravity) p.vy += p.gravity * dt;
    }
    this.particles = this.particles.filter((p) => p.age < p.duration);

    for (const ft of this.floatingTexts) {
      ft.age += dt;
      ft.y += ft.vy * dt;
      ft.vy *= 0.94;
    }
    this.floatingTexts = this.floatingTexts.filter((ft) => ft.age < ft.duration);

    for (const pt of this.petals) {
      pt.phase += dt * 2.2;
      pt.x += (pt.vx + Math.sin(pt.phase) * 14) * dt;
      pt.y += pt.vy * dt;
      if (pt.x < -10) pt.x = ARENA_WIDTH + 10;
      if (pt.y > ARENA_HEIGHT + 10) {
        pt.y = -10;
        pt.x = Math.random() * ARENA_WIDTH;
      }
    }
  }

  private getEffectiveAtk(h: HeroRuntime): number {
    let mult = 1;
    for (const st of h.statuses) {
      if (st.type === 'atkBuff') mult += st.value;
    }
    if (h.awakened) mult += 0.15;
    if (this.overdrive) mult += 0.15;
    return h.atk * mult;
  }

  private getEffectiveMoveSpeed(h: HeroRuntime): number {
    let mult = 1;
    for (const st of h.statuses) {
      if (st.type === 'slow') mult *= Math.max(0.42, 1 - st.value);
    }
    if (h.awakened) mult += 0.18;
    if (this.overdrive) mult += 0.15;
    return h.moveSpeed * mult;
  }

  private isStunned(h: HeroRuntime): boolean {
    return h.statuses.some((s) => s.type === 'stun');
  }

  private tryDodge(h: HeroRuntime, threatX: number, threatY: number): boolean {
    if (!h.alive || this.isStunned(h) || h.dodgeCooldown > 0) return false;
    const baseChance =
      h.def.role === 'Assassino'
        ? 0.28
        : h.def.role === 'Lutador' || h.def.role === 'Espadachim' || h.def.role === 'Atirador'
        ? 0.21
        : 0.1;
    const chance = baseChance + (h.awakened ? 0.08 : 0);
    if (Math.random() > chance) return false;

    h.dodgeCooldown = 3.8;
    const angle = Math.atan2(h.y - threatY, h.x - threatX) + (Math.random() > 0.5 ? 1.2 : -1.2);
    const dashDist = 78;
    const startX = h.x;
    const startY = h.y;
    h.x = Math.max(FLOOR_MIN_X, Math.min(FLOOR_MAX_X, h.x + Math.cos(angle) * dashDist));
    h.y = Math.max(FLOOR_MIN_Y, Math.min(FLOOR_MAX_Y, h.y + Math.sin(angle) * dashDist * 0.75));

    for (let g = 1; g <= 3; g++) {
      this.vfx.push({
        id: uid('vfx'),
        type: 'dash_ghost',
        x: startX + ((h.x - startX) * g) / 4,
        y: startY + ((h.y - startY) * g) / 4,
        radius: 26,
        color: '#38bdf8',
        age: 0,
        duration: 0.28,
      });
    }
    sound.playDodge();
    this.spawnFloatingText(h.x, h.y - 54, 'ESQUIVA!', '#38bdf8', 1.1);
    return true;
  }

  private updateHero(h: HeroRuntime, dt: number): void {
    h.animTime += dt;
    if (h.hitFlash > 0) h.hitFlash = Math.max(0, h.hitFlash - dt);
    if (h.attackAnim > 0) h.attackAnim = Math.max(0, h.attackAnim - dt);
    if (h.ultimateAura > 0) h.ultimateAura = Math.max(0, h.ultimateAura - dt);
    if (h.dodgeCooldown > 0) h.dodgeCooldown = Math.max(0, h.dodgeCooldown - dt);
    if (h.shield > 0) {
      h.shieldTimer -= dt;
      if (h.shieldTimer <= 0) {
        h.shield = 0;
        h.shieldTimer = 0;
      }
    }

    if (Math.abs(h.hurtKnockX) > 0.1) {
      h.x = Math.max(FLOOR_MIN_X, Math.min(FLOOR_MAX_X, h.x + h.hurtKnockX * dt));
      h.hurtKnockX *= Math.pow(0.05, dt);
    }

    if (!h.alive) {
      h.deathAlpha = Math.max(0, h.deathAlpha - dt * 1.4);
      return;
    }

    // Status effects tick
    for (const st of h.statuses) {
      st.remaining -= dt;
      if (st.type === 'burn') {
        st.tickTimer = (st.tickTimer ?? 0) + dt;
        if (st.tickTimer >= 0.65) {
          st.tickTimer = 0;
          const src = this.heroes.find((x) => x.uid === st.sourceId);
          this.applyDamage(src ?? null, h, st.value, false, '#fb923c', true);
          this.spawnParticles(h.x, h.y - 24, '#f97316', 5, 70);
        }
      }
    }
    h.statuses = h.statuses.filter((s) => s.remaining > 0);

    // Passive energy regen (boosted in Overdrive)
    h.energy = Math.min(100, h.energy + dt * (this.overdrive ? 8.2 : 5.2));

    if (this.isStunned(h)) {
      h.vx = 0;
      h.vy = 0;
      return;
    }

    const cdSpeed = this.overdrive ? 1.3 : 1.0;
    h.basicCooldown = Math.max(0, h.basicCooldown - dt * cdSpeed);
    for (let i = 0; i < h.skillCooldowns.length; i++) {
      h.skillCooldowns[i] = Math.max(0, h.skillCooldowns[i] - dt * cdSpeed);
    }

    const enemies = this.heroes.filter((o) => o.alive && o.side !== h.side);
    const allies = this.heroes.filter((o) => o.alive && o.side === h.side);
    if (enemies.length === 0) return;

    const speed = this.getEffectiveMoveSpeed(h);

    // 0) Step out of telegraphed arena hazards if standing inside one!
    const danger = this.hazards.find(
      (hz) => !hz.detonated && Math.hypot(h.x - hz.x, h.y - hz.y) < hz.radius + 12
    );
    if (danger) {
      const dx = h.x - danger.x || 1;
      const dy = h.y - danger.y || 1;
      const len = Math.hypot(dx, dy) || 1;
      h.vx = (dx / len) * speed * 1.15;
      h.vy = (dy / len) * speed * 1.05;
      this.moveHero(h, dt);
      return;
    }

    // 0.5) Contest nearby Kizuna Power Orbs!
    const nearOrb = this.orbs.find((o) => Math.hypot(o.x - h.x, o.y - h.y) < 230);
    if (nearOrb) {
      const dx = nearOrb.x - h.x;
      const dy = nearOrb.y - h.y;
      const len = Math.hypot(dx, dy) || 1;
      h.facing = dx >= 0 ? 1 : -1;
      h.vx = (dx / len) * speed * 1.15;
      h.vy = (dy / len) * speed * 1.0;
      this.moveHero(h, dt);
      return;
    }

    const target = this.pickTarget(h, enemies);
    if (!target) return;

    const dist = Math.hypot(target.x - h.x, target.y - h.y);
    h.facing = target.x >= h.x ? 1 : -1;

    // 1) Try Ultimate if 100 energy
    if (h.energy >= 100 && this.canCastSkill(h, h.ultimate, target, allies, dist)) {
      h.energy = 0;
      h.ultimateAura = 1.4;
      this.callout = {
        heroName: h.def.name,
        skillName: h.ultimate.name,
        color: h.def.color,
        side: h.side,
        age: 0,
        duration: 1.55,
      };
      this.hitstop = 0.065;
      this.screenShake = Math.max(this.screenShake, 9);
      this.screenFlash = 0.35;
      this.screenFlashColor = h.def.color;
      this.cameraZoom = 1.06;
      sound.playUltimate();
      this.executeSkill(h, h.ultimate, target, enemies, allies);
      h.basicCooldown = Math.max(h.basicCooldown, 0.5);
      return;
    }

    // 2) Try Active Skills
    for (let i = 0; i < h.activeSkills.length; i++) {
      if (h.skillCooldowns[i] <= 0) {
        const sk = h.activeSkills[i];
        if (this.canCastSkill(h, sk, target, allies, dist)) {
          h.skillCooldowns[i] = sk.cooldown;
          h.energy = Math.min(100, h.energy + 18);
          this.executeSkill(h, sk, target, enemies, allies);
          h.basicCooldown = Math.max(h.basicCooldown, 0.38);
          return;
        }
      }
    }

    // 3) Dynamic Movement & Basic Attack AI
    const desiredRange = h.def.baseStats.attackRange * 1.15;
    const isRanged = h.def.basicAttackIsRanged;

    if (isRanged && dist < 145 && h.basicCooldown > 0.2) {
      const dx = h.x - target.x;
      const dy = h.y - target.y;
      const len = Math.hypot(dx, dy) || 1;
      h.vx = (dx / len) * speed * 0.92;
      h.vy = (dy / len) * speed * 0.78;
      this.moveHero(h, dt);
      return;
    }

    if (dist > desiredRange) {
      const dx = target.x - h.x;
      const dy = target.y - h.y;
      const len = Math.hypot(dx, dy) || 1;
      // Subtle strafing wobble for more dynamic anime movement
      const strafe = Math.sin(h.animTime * 2.4 + (h.side === 'player' ? 0 : 2)) * 0.25;
      h.vx = ((dx / len) - (dy / len) * strafe) * speed;
      h.vy = ((dy / len) + (dx / len) * strafe) * speed * 0.84;
      this.moveHero(h, dt);
    } else {
      h.vx = 0;
      h.vy = 0;
      if (h.basicCooldown <= 0) {
        this.performBasicAttack(h, target);
        h.basicCooldown = h.def.baseStats.attackCooldown;
      }
    }
  }

  private moveHero(h: HeroRuntime, dt: number): void {
    h.x = Math.max(FLOOR_MIN_X, Math.min(FLOOR_MAX_X, h.x + h.vx * dt));
    h.y = Math.max(FLOOR_MIN_Y, Math.min(FLOOR_MAX_Y, h.y + h.vy * dt));
    h.walkPhase += dt * 12;
    if (Math.random() < dt * 9) {
      this.particles.push({
        x: h.x + (Math.random() - 0.5) * 16,
        y: h.y + 4,
        vx: -h.vx * 0.16,
        vy: -14 - Math.random() * 14,
        size: 3,
        color: 'rgba(203, 213, 225, 0.45)',
        age: 0,
        duration: 0.35,
      });
    }
  }

  private pickTarget(h: HeroRuntime, enemies: HeroRuntime[]): HeroRuntime | null {
    if (enemies.length === 0) return null;
    const taunt = h.statuses.find((s) => s.type === 'taunt');
    if (taunt?.sourceId) {
      const taunter = enemies.find((e) => e.uid === taunt.sourceId);
      if (taunter) return taunter;
    }
    if (h.def.role === 'Assassino') {
      return [...enemies].sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
    }
    return [...enemies].sort(
      (a, b) => Math.hypot(a.x - h.x, a.y - h.y) - Math.hypot(b.x - h.x, b.y - h.y)
    )[0];
  }

  private canCastSkill(
    h: HeroRuntime,
    skill: SkillDef,
    _target: HeroRuntime,
    allies: HeroRuntime[],
    dist: number
  ): boolean {
    if (skill.kind === 'heal_ally' || skill.kind === 'heal_aoe') {
      const injured = allies.some((a) => a.hp < a.maxHp * 0.88);
      return injured || skill.isUltimate;
    }
    if (skill.kind === 'shield_self' || skill.kind === 'shield_team' || skill.kind === 'buff_team') {
      return true;
    }
    if (skill.kind === 'blink_backline') {
      return dist <= skill.range * 1.25;
    }
    if (skill.kind === 'aoe_self') {
      return this.heroes.some(
        (e) =>
          e.alive &&
          e.side !== h.side &&
          Math.hypot(e.x - h.x, e.y - h.y) <= (skill.radius ?? 125) + 25
      );
    }
    return dist <= skill.range * 1.2 + 24;
  }

  private rollCrit(h: HeroRuntime): boolean {
    return Math.random() < h.def.baseStats.critChance + (h.awakened ? 0.12 : 0);
  }

  private performBasicAttack(h: HeroRuntime, target: HeroRuntime): void {
    h.attackAnim = 0.24;
    h.energy = Math.min(100, h.energy + 13);
    const crit = this.rollCrit(h);
    const raw = this.getEffectiveAtk(h) * (crit ? 1.55 : 1.0);

    if (h.def.basicAttackIsRanged) {
      sound.playShoot();
      const angle = Math.atan2(target.y - h.y, target.x - h.x);
      const speed = (h.def.basicProjectileSpeed ?? 420) * 1.15;
      const sx = h.x + h.facing * 26;
      const sy = h.y - 30;
      this.vfx.push({
        id: uid('vfx'),
        type: 'muzzle',
        x: sx,
        y: sy,
        angle,
        radius: 22,
        color: h.def.basicAttackColor,
        secondaryColor: '#ffffff',
        age: 0,
        duration: 0.16,
      });
      this.projectiles.push({
        id: uid('proj'),
        side: h.side,
        sourceUid: h.uid,
        style: resolveProjectileStyle(h.heroId),
        x: sx,
        y: sy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 11,
        color: h.def.basicAttackColor,
        secondaryColor: '#ffffff',
        damage: raw,
        crit,
        pierce: false,
        hitUids: new Set(),
        life: 0,
        maxLife: 1.8,
        trail: [],
      });
    } else {
      sound.playSlash();
      const angle = Math.atan2(target.y - h.y, target.x - h.x);
      this.vfx.push({
        id: uid('vfx'),
        type: crit ? 'cross_slash' : 'slash',
        x: h.x + Math.cos(angle) * 32,
        y: h.y - 28 + Math.sin(angle) * 18,
        angle,
        radius: crit ? 52 : 46,
        color: h.def.basicAttackColor,
        secondaryColor: '#ffffff',
        age: 0,
        duration: 0.24,
      });
      if (!this.tryDodge(target, h.x, h.y)) {
        this.applyDamage(h, target, raw, crit, h.def.basicAttackColor);
      }
    }
  }

  private executeSkill(
    h: HeroRuntime,
    skill: SkillDef,
    target: HeroRuntime,
    enemies: HeroRuntime[],
    allies: HeroRuntime[]
  ): void {
    h.attackAnim = 0.36;
    const atk = this.getEffectiveAtk(h);

    switch (skill.kind) {
      case 'melee_arc': {
        sound.playSlash();
        const angle = Math.atan2(target.y - h.y, target.x - h.x);
        const radius = (skill.radius ?? 85) * 1.15;
        this.vfx.push({
          id: uid('vfx'),
          type: 'slash',
          x: h.x + Math.cos(angle) * 32,
          y: h.y - 26 + Math.sin(angle) * 18,
          angle,
          radius: radius * 0.8,
          color: skill.color,
          secondaryColor: skill.secondaryColor,
          age: 0,
          duration: 0.34,
        });
        for (const e of enemies) {
          if (Math.hypot(e.x - h.x, e.y - h.y) <= radius + 20) {
            if (!skill.isUltimate && this.tryDodge(e, h.x, h.y)) continue;
            const crit = this.rollCrit(h);
            this.applyDamage(h, e, atk * skill.power * (crit ? 1.55 : 1), crit, skill.color);
            this.applyStatus(h, e, skill.statusEffect);
          }
        }
        this.screenShake = Math.max(this.screenShake, skill.isUltimate ? 10 : 4);
        break;
      }

      case 'dash_strike': {
        sound.playDash();
        const startX = h.x;
        const startY = h.y;
        const dx = target.x - h.x;
        const dy = target.y - h.y;
        const dist = Math.hypot(dx, dy) || 1;
        const stepDist = Math.max(0, dist - 36);
        const nx = Math.max(FLOOR_MIN_X, Math.min(FLOOR_MAX_X, h.x + (dx / dist) * stepDist));
        const ny = Math.max(FLOOR_MIN_Y, Math.min(FLOOR_MAX_Y, h.y + (dy / dist) * stepDist));

        for (let g = 1; g <= 4; g++) {
          this.vfx.push({
            id: uid('vfx'),
            type: 'dash_ghost',
            x: startX + ((nx - startX) * g) / 5,
            y: startY + ((ny - startY) * g) / 5,
            radius: 28,
            color: skill.color,
            age: 0,
            duration: 0.28 + g * 0.04,
          });
        }
        h.x = nx;
        h.y = ny;

        const radius = (skill.radius ?? 85) * 1.15;
        sound.playExplosion();
        this.vfx.push({
          id: uid('vfx'),
          type: 'explosion',
          x: target.x,
          y: target.y - 24,
          radius,
          color: skill.color,
          secondaryColor: skill.secondaryColor,
          age: 0,
          duration: 0.4,
        });
        for (const e of enemies) {
          if (Math.hypot(e.x - target.x, e.y - target.y) <= radius) {
            const crit = this.rollCrit(h);
            this.applyDamage(h, e, atk * skill.power * (crit ? 1.55 : 1), crit, skill.color);
            this.applyStatus(h, e, skill.statusEffect);
          }
        }
        this.spawnParticles(target.x, target.y - 20, skill.color, skill.isUltimate ? 32 : 16, 220);
        this.screenShake = Math.max(this.screenShake, skill.isUltimate ? 12 : 5.5);
        break;
      }

      case 'blink_backline': {
        sound.playDash();
        const blinkTarget =
          [...enemies].sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0] ?? target;
        this.vfx.push({
          id: uid('vfx'),
          type: 'ring',
          x: h.x,
          y: h.y - 20,
          radius: 48,
          color: skill.color,
          age: 0,
          duration: 0.32,
        });
        const behindOffset = blinkTarget.facing * -40;
        h.x = Math.max(FLOOR_MIN_X, Math.min(FLOOR_MAX_X, blinkTarget.x + behindOffset));
        h.y = Math.max(
          FLOOR_MIN_Y,
          Math.min(FLOOR_MAX_Y, blinkTarget.y + (Math.random() - 0.5) * 24)
        );
        h.facing = blinkTarget.x >= h.x ? 1 : -1;

        sound.playSlash();
        this.vfx.push({
          id: uid('vfx'),
          type: 'slash',
          x: blinkTarget.x,
          y: blinkTarget.y - 26,
          angle: Math.atan2(blinkTarget.y - h.y, blinkTarget.x - h.x),
          radius: skill.isUltimate ? 82 : 58,
          color: skill.color,
          secondaryColor: skill.secondaryColor,
          age: 0,
          duration: 0.34,
        });
        const crit = skill.isUltimate ? true : this.rollCrit(h);
        this.applyDamage(h, blinkTarget, atk * skill.power * (crit ? 1.45 : 1), crit, skill.color);
        this.applyStatus(h, blinkTarget, skill.statusEffect);
        this.spawnParticles(blinkTarget.x, blinkTarget.y - 22, skill.color, skill.isUltimate ? 28 : 14, 220);
        this.screenShake = Math.max(this.screenShake, skill.isUltimate ? 10 : 4.5);
        break;
      }

      case 'projectile':
      case 'multi_projectile': {
        sound.playShoot();
        const count = skill.kind === 'multi_projectile' ? (skill.projectileCount ?? 3) : 1;
        const baseAngle = Math.atan2(target.y - h.y, target.x - h.x);
        const spread = count === 5 ? 0.16 : 0.21;
        const speed = (skill.projectileSpeed ?? 460) * 1.15;
        const style = resolveProjectileStyle(h.heroId, skill);
        const sx = h.x + h.facing * 26;
        const sy = h.y - 30;
        this.vfx.push({
          id: uid('vfx'),
          type: 'muzzle',
          x: sx,
          y: sy,
          angle: baseAngle,
          radius: skill.isUltimate ? 34 : 26,
          color: skill.color,
          secondaryColor: skill.secondaryColor ?? '#ffffff',
          age: 0,
          duration: 0.2,
        });
        for (let i = 0; i < count; i++) {
          const offset = (i - (count - 1) / 2) * spread;
          const a = baseAngle + offset;
          const crit = this.rollCrit(h);
          this.projectiles.push({
            id: uid('proj'),
            side: h.side,
            sourceUid: h.uid,
            style,
            x: sx,
            y: sy,
            vx: Math.cos(a) * speed,
            vy: Math.sin(a) * speed,
            radius: skill.isUltimate ? 16 : 12,
            color: skill.color,
            secondaryColor: skill.secondaryColor ?? '#ffffff',
            damage: atk * skill.power * (crit ? 1.45 : 1),
            crit,
            pierce: skill.isUltimate || skill.id === 'sora_pierce' || skill.id === 'nova_railgun',
            hitUids: new Set(),
            life: 0,
            maxLife: 2.1,
            statusEffect: skill.statusEffect,
            trail: [],
          });
        }
        break;
      }

      case 'aoe_target':
      case 'aoe_self': {
        sound.playExplosion();
        const cx = skill.kind === 'aoe_self' ? h.x : target.x;
        const cy = skill.kind === 'aoe_self' ? h.y : target.y;
        const radius = (skill.radius ?? 105) * 1.15;
        this.vfx.push({
          id: uid('vfx'),
          type: 'rune_circle',
          x: h.x,
          y: h.y + 4,
          radius: 44,
          color: skill.color,
          secondaryColor: skill.secondaryColor,
          age: 0,
          duration: 0.45,
        });
        if (skill.id === 'lyra_thunder_strike' || skill.id === 'sora_ult_starfall') {
          this.vfx.push({
            id: uid('vfx'),
            type: 'lightning',
            x: cx,
            y: cy,
            radius,
            color: skill.color,
            secondaryColor: skill.secondaryColor,
            age: 0,
            duration: 0.42,
          });
        }
        this.vfx.push({
          id: uid('vfx'),
          type: 'explosion',
          x: cx,
          y: cy - 12,
          radius,
          color: skill.color,
          secondaryColor: skill.secondaryColor,
          age: 0,
          duration: skill.isUltimate ? 0.58 : 0.44,
        });
        for (const e of enemies) {
          if (Math.hypot(e.x - cx, e.y - cy) <= radius + 16) {
            const crit = this.rollCrit(h);
            this.applyDamage(h, e, atk * skill.power * (crit ? 1.45 : 1), crit, skill.color);
            this.applyStatus(h, e, skill.statusEffect);
          }
        }
        this.spawnParticles(cx, cy - 16, skill.color, skill.isUltimate ? 34 : 18, 210);
        this.screenShake = Math.max(this.screenShake, skill.isUltimate ? 11 : 5);
        break;
      }

      case 'heal_ally': {
        sound.playHeal();
        const lowest = [...allies].sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0] ?? h;
        const healAmt = Math.round(atk * skill.power);
        this.applyHeal(h, lowest, healAmt);
        this.vfx.push({
          id: uid('vfx'),
          type: 'heal',
          x: lowest.x,
          y: lowest.y - 16,
          radius: 48,
          color: skill.color,
          secondaryColor: skill.secondaryColor,
          age: 0,
          duration: 0.5,
        });
        break;
      }

      case 'heal_aoe': {
        sound.playHeal();
        const healAmt = Math.round(atk * skill.power);
        for (const a of allies) {
          this.applyHeal(h, a, healAmt);
          if (skill.shieldRatio) {
            this.grantShield(a, Math.round(a.maxHp * skill.shieldRatio), 4.5);
          }
          this.applyStatus(h, a, skill.statusEffect);
          this.vfx.push({
            id: uid('vfx'),
            type: 'heal',
            x: a.x,
            y: a.y - 16,
            radius: 52,
            color: skill.color,
            secondaryColor: skill.secondaryColor,
            age: 0,
            duration: 0.56,
          });
        }
        break;
      }

      case 'shield_self': {
        sound.playShield();
        if (skill.shieldRatio) {
          const amt = Math.round(h.maxHp * skill.shieldRatio);
          const applied = this.grantShield(h, amt, 4.5);
          this.spawnFloatingText(h.x, h.y - 56, `ESCUDO ${applied}`, '#60a5fa', 1.05);
        }
        this.vfx.push({
          id: uid('vfx'),
          type: 'ring',
          x: h.x,
          y: h.y - 20,
          radius: skill.radius ?? 62,
          color: skill.color,
          age: 0,
          duration: 0.45,
        });
        if (skill.statusEffect?.type === 'taunt') {
          for (const e of enemies) {
            if (Math.hypot(e.x - h.x, e.y - h.y) <= (skill.radius ?? 160) + 60) {
              this.applyStatus(h, e, skill.statusEffect);
            }
          }
        } else if (skill.statusEffect) {
          this.applyStatus(h, h, skill.statusEffect);
        }
        break;
      }

      case 'shield_team':
      case 'buff_team': {
        sound.playShield();
        for (const a of allies) {
          if (skill.shieldRatio) {
            const amt = Math.round(a.maxHp * skill.shieldRatio);
            const applied = this.grantShield(a, amt, 4.5);
            this.spawnFloatingText(a.x, a.y - 54, `ESCUDO ${applied}`, '#60a5fa', 0.98);
          }
          if (skill.statusEffect) {
            this.applyStatus(h, a, skill.statusEffect);
            if (skill.statusEffect.type === 'atkBuff') {
              this.spawnFloatingText(a.x, a.y - 70, 'ATK UP!', '#facc15', 1.05);
            }
          }
          this.vfx.push({
            id: uid('vfx'),
            type: 'ring',
            x: a.x,
            y: a.y - 18,
            radius: 48,
            color: skill.color,
            age: 0,
            duration: 0.48,
          });
        }
        break;
      }
    }
  }

  private applyStatus(
    source: HeroRuntime,
    target: HeroRuntime,
    effect?: SkillDef['statusEffect']
  ): void {
    if (!effect || !target.alive) return;
    const existing = target.statuses.find((s) => s.type === effect.type);
    if (existing) {
      existing.remaining = Math.max(existing.remaining, effect.duration);
      existing.value = effect.value ?? existing.value;
      existing.sourceId = source.uid;
    } else {
      target.statuses.push({
        type: effect.type,
        remaining: effect.duration,
        value: effect.value ?? 0,
        sourceId: source.uid,
      });
    }
    if (effect.type === 'stun') {
      this.spawnFloatingText(target.x, target.y - 64, 'ATORDOADO!', '#facc15', 1.05);
    } else if (effect.type === 'taunt') {
      this.spawnFloatingText(target.x, target.y - 64, 'PROVOCADO!', '#fb923c', 1.0);
    }
  }

  private grantShield(target: HeroRuntime, amount: number, duration = 4.5): number {
    if (!target.alive || amount <= 0) return 0;
    const cap = Math.round(target.maxHp * 0.3);
    const next = Math.min(cap, Math.max(target.shield, amount));
    target.shield = next;
    target.shieldTimer = Math.max(target.shieldTimer, duration);
    return next;
  }

  private applyHeal(source: HeroRuntime, target: HeroRuntime, amount: number): void {
    if (!target.alive) return;
    const actual = Math.min(target.maxHp - target.hp, amount);
    target.hp += actual;
    source.healingDone += actual;
    if (actual > 0) {
      this.spawnFloatingText(target.x, target.y - 48, `+${actual}`, '#4ade80', 1.1);
      this.spawnParticles(target.x, target.y - 26, '#4ade80', 8, 80);
    }
  }

  private applyDamage(
    source: HeroRuntime | null,
    target: HeroRuntime,
    rawDamage: number,
    crit: boolean,
    color: string,
    isDot = false
  ): void {
    if (!target.alive) return;
    const reduction = 100 / (100 + target.defStat * 1.45);
    let dmg = Math.max(8, Math.round(rawDamage * reduction));

    if (target.shield > 0) {
      const prevShield = target.shield;
      const absorbed = Math.min(target.shield, dmg);
      target.shield -= absorbed;
      dmg -= absorbed;
      if (prevShield > 0 && target.shield === 0) {
        target.shieldTimer = 0;
        this.spawnParticles(target.x, target.y - 26, '#60a5fa', 12, 160);
        this.spawnFloatingText(target.x, target.y - 64, 'ESCUDO QUEBRADO!', '#93c5fd', 0.95);
      }
    }

    target.hp = Math.max(0, target.hp - dmg);
    target.hitFlash = isDot ? 0.08 : 0.15;
    target.energy = Math.min(100, target.energy + (isDot ? 2 : 10));
    target.damageTaken += dmg;
    if (source) {
      source.damageDealt += dmg;
      if (!isDot) {
        const pushDir = target.x >= source.x ? 1 : -1;
        target.hurtKnockX = pushDir * (crit ? 165 : 85);
      }
    }

    if (!isDot) {
      sound.playHit(crit);
    }

    if (crit && !isDot) {
      this.hitstop = Math.max(this.hitstop, 0.036);
      this.screenShake = Math.max(this.screenShake, 3.8);
    }

    this.spawnFloatingText(
      target.x + (Math.random() - 0.5) * 18,
      target.y - 50,
      crit ? `${dmg}!` : `${dmg}`,
      crit ? '#fde047' : isDot ? '#fb923c' : '#ffffff',
      crit ? 1.38 : 1.05
    );

    if (!isDot) {
      this.spawnParticles(target.x, target.y - 26, color, crit ? 14 : 7, crit ? 195 : 125);
    }

    // Despertar (Anime Awakening Comeback below 25% HP!)
    if (target.hp > 0 && !target.awakened && target.hp <= target.maxHp * 0.25) {
      target.awakened = true;
      target.energy = Math.min(100, target.energy + 30);
      this.grantShield(target, Math.round(target.maxHp * 0.08), 3.5);
      target.ultimateAura = 1.2;
      sound.playAwaken();
      this.spawnFloatingText(target.x, target.y - 72, '⚡ DESPERTAR!', '#fde047', 1.3);
      this.vfx.push({
        id: uid('vfx'),
        type: 'ring',
        x: target.x,
        y: target.y - 18,
        radius: 68,
        color: '#fde047',
        age: 0,
        duration: 0.5,
      });
      this.spawnParticles(target.x, target.y - 26, '#fde047', 20, 190);
    }

    if (target.hp <= 0) {
      target.alive = false;
      if (source) source.kills += 1;
      sound.playKo();
      this.hitstop = Math.max(this.hitstop, 0.075);
      this.screenShake = Math.max(this.screenShake, 8.5);
      this.screenFlash = 0.28;
      this.screenFlashColor = '#ffffff';
      this.cameraZoom = 1.05;
      this.spawnParticles(target.x, target.y - 24, target.def.color, 30, 240);
      this.spawnFloatingText(target.x, target.y - 68, 'K.O.!', '#f43f5e', 1.55);
    }
  }

  private updateProjectiles(dt: number): void {
    // 1. Move projectiles
    for (const p of this.projectiles) {
      p.life += dt;
      p.trail.push({ x: p.x, y: p.y });
      if (p.trail.length > 9) p.trail.shift();
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }

    // 2. ANIME PROJECTILE CLASH! Opposing projectiles colliding mid-air explode!
    for (let i = 0; i < this.projectiles.length; i++) {
      const a = this.projectiles[i];
      if (a.life >= a.maxLife) continue;
      for (let j = i + 1; j < this.projectiles.length; j++) {
        const b = this.projectiles[j];
        if (b.life >= b.maxLife || a.side === b.side) continue;
        if (Math.hypot(a.x - b.x, a.y - b.y) <= a.radius + b.radius + 6) {
          const cx = (a.x + b.x) / 2;
          const cy = (a.y + b.y) / 2;
          if (!a.pierce) a.life = a.maxLife;
          if (!b.pierce) b.life = b.maxLife;
          sound.playClash();
          this.hitstop = Math.max(this.hitstop, 0.035);
          this.screenShake = Math.max(this.screenShake, 5);
          this.vfx.push({
            id: uid('vfx'),
            type: 'clash',
            x: cx,
            y: cy,
            radius: 56,
            color: '#fde047',
            secondaryColor: '#38bdf8',
            age: 0,
            duration: 0.36,
          });
          this.spawnParticles(cx, cy, '#fde047', 16, 210);
          this.spawnFloatingText(cx, cy - 20, 'CLASH!', '#fde047', 1.25);
        }
      }
    }

    // 3. Hit heroes (with sidestep dodge chance!)
    for (const p of this.projectiles) {
      if (p.life >= p.maxLife) continue;
      const enemies = this.heroes.filter((h) => h.alive && h.side !== p.side);
      const source = this.heroes.find((h) => h.uid === p.sourceUid) ?? null;

      for (const e of enemies) {
        if (p.hitUids.has(e.uid)) continue;
        const d = Math.hypot(e.x - p.x, e.y - 26 - p.y);
        if (d <= p.radius + 24) {
          if (!p.pierce && this.tryDodge(e, p.x, p.y)) {
            p.hitUids.add(e.uid);
            continue;
          }
          p.hitUids.add(e.uid);
          this.applyDamage(source, e, p.damage, p.crit, p.color);
          if (source && p.statusEffect) {
            this.applyStatus(source, e, p.statusEffect);
          }
          if (!p.pierce) {
            p.life = p.maxLife;
            break;
          }
        }
      }
    }

    this.projectiles = this.projectiles.filter(
      (p) =>
        p.life < p.maxLife &&
        p.x > -50 &&
        p.x < ARENA_WIDTH + 50 &&
        p.y > 40 &&
        p.y < ARENA_HEIGHT + 50
    );
  }

  private applySeparation(dt: number): void {
    const alive = this.heroes.filter((h) => h.alive);
    for (let i = 0; i < alive.length; i++) {
      for (let j = i + 1; j < alive.length; j++) {
        const a = alive[i];
        const b = alive[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.hypot(dx, dy) || 0.01;
        const minDist = 48;
        if (dist < minDist) {
          const push = ((minDist - dist) / minDist) * 125 * dt;
          const nx = dx / dist;
          const ny = dy / dist;
          a.x = Math.max(FLOOR_MIN_X, Math.min(FLOOR_MAX_X, a.x - nx * push));
          a.y = Math.max(FLOOR_MIN_Y, Math.min(FLOOR_MAX_Y, a.y - ny * push));
          b.x = Math.max(FLOOR_MIN_X, Math.min(FLOOR_MAX_X, b.x + nx * push));
          b.y = Math.max(FLOOR_MIN_Y, Math.min(FLOOR_MAX_Y, b.y + ny * push));
        }
      }
    }
  }

  private spawnParticles(
    x: number,
    y: number,
    color: string,
    count: number,
    speed: number
  ): void {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const spd = (0.3 + Math.random() * 0.7) * speed;
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd - 24,
        size: 3 + Math.floor(Math.random() * 5),
        color,
        age: 0,
        duration: 0.28 + Math.random() * 0.34,
        gravity: 230,
      });
    }
  }

  private spawnFloatingText(
    x: number,
    y: number,
    text: string,
    color: string,
    scale: number
  ): void {
    this.floatingTexts.push({
      id: uid('ft'),
      x,
      y,
      vy: -62,
      text,
      color,
      scale,
      age: 0,
      duration: 0.9,
    });
  }

  getHudSnapshot(): HudSnapshot {
    const mapHero = (h: HeroRuntime): HudHeroSnapshot => ({
      uid: h.uid,
      heroId: h.heroId,
      name: h.def.name,
      role: h.def.role,
      color: h.def.color,
      spritePath: h.def.spritePath,
      side: h.side,
      hp: h.hp,
      maxHp: h.maxHp,
      shield: h.shield,
      energy: h.energy,
      alive: h.alive,
      awakened: h.awakened,
      statuses: Array.from(new Set(h.statuses.map((s) => s.type))),
    });

    const playerHeroes = this.heroes.filter((h) => h.side === 'player').map(mapHero);
    const enemyHeroes = this.heroes.filter((h) => h.side === 'enemy').map(mapHero);

    const pCur = playerHeroes.reduce((a, h) => a + h.hp, 0);
    const pMax = Math.max(1, playerHeroes.reduce((a, h) => a + h.maxHp, 0));
    const eCur = enemyHeroes.reduce((a, h) => a + h.hp, 0);
    const eMax = Math.max(1, enemyHeroes.reduce((a, h) => a + h.maxHp, 0));

    return {
      elapsed: this.elapsed,
      overdrive: this.overdrive,
      playerHpPct: Math.round((pCur / pMax) * 100),
      enemyHpPct: Math.round((eCur / eMax) * 100),
      playerHeroes,
      enemyHeroes,
    };
  }

  private checkVictory(): void {
    const playerAlive = this.heroes.some((h) => h.side === 'player' && h.alive);
    const enemyAlive = this.heroes.some((h) => h.side === 'enemy' && h.alive);

    if (!playerAlive || !enemyAlive || this.elapsed >= this.maxDuration) {
      this.finished = true;
      let winner: TeamSide | 'draw' = 'draw';
      if (playerAlive && !enemyAlive) winner = 'player';
      else if (enemyAlive && !playerAlive) winner = 'enemy';
      else {
        const pHp = this.heroes
          .filter((h) => h.side === 'player')
          .reduce((acc, h) => acc + h.hp, 0);
        const eHp = this.heroes
          .filter((h) => h.side === 'enemy')
          .reduce((acc, h) => acc + h.hp, 0);
        if (pHp > eHp) winner = 'player';
        else if (eHp > pHp) winner = 'enemy';
      }

      if (winner === 'player') sound.playVictory();
      else sound.playDefeat();

      this.result = {
        winner,
        duration: this.elapsed,
        stats: this.heroes.map((h) => ({
          uid: h.uid,
          heroId: h.heroId,
          name: h.def.name,
          role: h.def.role,
          side: h.side,
          color: h.def.color,
          alive: h.alive,
          hp: h.hp,
          maxHp: h.maxHp,
          damageDealt: Math.round(h.damageDealt),
          damageTaken: Math.round(h.damageTaken),
          healingDone: Math.round(h.healingDone),
          kills: h.kills,
        })),
      };
    }
  }
}
