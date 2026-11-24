export type HeroId =
  | 'ren'
  | 'lyra'
  | 'bram'
  | 'kage'
  | 'sora'
  | 'hana'
  | 'ryuji'
  | 'yuki'
  | 'drake'
  | 'nova'
  | 'kael'
  | 'tetsu';

export type HeroRole =
  | 'Espadachim'
  | 'Mago'
  | 'Tanque'
  | 'Assassino'
  | 'Atirador'
  | 'Suporte'
  | 'Lutador';

export type TeamSide = 'player' | 'enemy';

export type FormationCol = 'front' | 'mid' | 'back';
export type FormationRow = 'top' | 'center' | 'bottom';

export interface FormationSlot {
  col: FormationCol;
  row: FormationRow;
}

export type SkillKind =
  | 'melee_arc'
  | 'dash_strike'
  | 'projectile'
  | 'multi_projectile'
  | 'aoe_target'
  | 'aoe_self'
  | 'heal_ally'
  | 'heal_aoe'
  | 'shield_self'
  | 'shield_team'
  | 'blink_backline'
  | 'buff_team';

export interface SkillDef {
  id: string;
  name: string;
  description: string;
  isUltimate: boolean;
  kind: SkillKind;
  cooldown: number; // seconds (for non-ultimate)
  power: number; // multiplier of ATK (or heal amount multiplier)
  range: number; // pixels
  radius?: number; // for AoE or arc radius
  projectileSpeed?: number;
  projectileCount?: number;
  color: string;
  secondaryColor?: string;
  statusEffect?: {
    type: 'burn' | 'stun' | 'slow' | 'atkBuff' | 'taunt';
    duration: number;
    value?: number;
  };
  shieldRatio?: number; // % of maxHP
}

export interface HeroDef {
  id: HeroId;
  name: string;
  title: string;
  role: HeroRole;
  color: string;
  accentColor: string;
  spritePath: string;
  lore: string;
  baseStats: {
    maxHp: number;
    atk: number;
    def: number;
    moveSpeed: number; // px/sec
    attackRange: number; // px
    attackCooldown: number; // sec
    critChance: number; // 0..1
  };
  basicAttackColor: string;
  basicAttackIsRanged: boolean;
  basicProjectileSpeed?: number;
  activeSkills: SkillDef[]; // 4 options, player picks 2
  ultimates: SkillDef[]; // 2 options, player picks 1
  defaultActiveIds: [string, string];
  defaultUltimateId: string;
}

export interface TeamMemberConfig {
  heroId: HeroId;
  slot: FormationSlot;
  activeSkillIds: [string, string];
  ultimateId: string;
}

export interface TowerFloor {
  floor: number;
  name: string;
  subtitle: string;
  isBoss?: boolean;
  statScale: number;
  enemyTeam: TeamMemberConfig[];
}

export interface StatusInstance {
  type: 'burn' | 'stun' | 'slow' | 'atkBuff' | 'taunt';
  remaining: number;
  value: number;
  tickTimer?: number;
  sourceId?: string;
}

export interface HeroRuntime {
  uid: string;
  heroId: HeroId;
  def: HeroDef;
  side: TeamSide;
  x: number;
  y: number;
  vx: number;
  vy: number;
  facing: 1 | -1;
  hp: number;
  maxHp: number;
  shield: number;
  shieldTimer: number;
  energy: number; // 0..100
  atk: number;
  defStat: number;
  moveSpeed: number;
  alive: boolean;

  activeSkills: SkillDef[];
  ultimate: SkillDef;
  skillCooldowns: number[];
  basicCooldown: number;

  statuses: StatusInstance[];

  // Animation & game feel state
  animTime: number;
  walkPhase: number;
  attackAnim: number; // >0 while lunging/striking
  hitFlash: number; // >0 white flash
  hurtKnockX: number;
  ultimateAura: number;
  deathAlpha: number;
  awakened: boolean; // Second Wind below 25% HP
  dodgeCooldown: number;

  // Match stats
  damageDealt: number;
  damageTaken: number;
  healingDone: number;
  kills: number;
}

export interface Projectile {
  id: string;
  side: TeamSide;
  sourceUid: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  secondaryColor: string;
  damage: number;
  crit: boolean;
  pierce: boolean;
  hitUids: Set<string>;
  life: number;
  maxLife: number;
  aoeRadius?: number;
  statusEffect?: SkillDef['statusEffect'];
  trail: Array<{ x: number; y: number }>;
}

export interface VfxEffect {
  id: string;
  type: 'slash' | 'ring' | 'explosion' | 'heal' | 'dash_ghost' | 'beam' | 'spark' | 'clash' | 'lightning';
  x: number;
  y: number;
  targetX?: number;
  targetY?: number;
  angle?: number;
  radius: number;
  color: string;
  secondaryColor?: string;
  age: number;
  duration: number;
}

export interface ArenaOrb {
  id: string;
  x: number;
  y: number;
  kind: 'energy' | 'heal' | 'frenzy';
  age: number;
  maxAge: number;
}

export interface ArenaHazard {
  id: string;
  x: number;
  y: number;
  radius: number;
  delay: number;
  age: number;
  detonated: boolean;
  color: string;
}

export interface AmbientPetal {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  phase: number;
  color: string;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  age: number;
  duration: number;
  gravity?: number;
}

export interface FloatingText {
  id: string;
  x: number;
  y: number;
  vy: number;
  text: string;
  color: string;
  scale: number;
  age: number;
  duration: number;
}

export interface UltimateCallout {
  heroName: string;
  skillName: string;
  color: string;
  side: TeamSide;
  age: number;
  duration: number;
}

export interface BattleResult {
  winner: TeamSide | 'draw';
  duration: number;
  stats: Array<{
    uid: string;
    heroId: HeroId;
    name: string;
    role: HeroRole;
    side: TeamSide;
    color: string;
    alive: boolean;
    hp: number;
    maxHp: number;
    damageDealt: number;
    damageTaken: number;
    healingDone: number;
    kills: number;
  }>;
}

export interface SaveData {
  highestFloorCleared: number;
  playerTeam: TeamMemberConfig[];
  trainingEnemyTeam: TeamMemberConfig[];
  totalWins: number;
  totalBattles: number;
}
