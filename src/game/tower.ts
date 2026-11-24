import type { TowerFloor } from './types';
import { createDefaultMember } from './heroes';

export const TOWER_FLOORS: TowerFloor[] = [
  {
    floor: 1,
    name: 'Andar 1 — Pátio dos Iniciantes',
    subtitle: 'Um trio equilibrado para testar sua formação.',
    statScale: 0.78,
    enemyTeam: [
      createDefaultMember('bram', 'front', 'center'),
      createDefaultMember('ren', 'mid', 'top'),
      createDefaultMember('sora', 'back', 'bottom'),
    ],
  },
  {
    floor: 2,
    name: 'Andar 2 — Vento e Lâmina',
    subtitle: 'Ataques rápidos à distância com suporte curativo.',
    statScale: 0.86,
    enemyTeam: [
      createDefaultMember('ren', 'front', 'center'),
      createDefaultMember('sora', 'back', 'top'),
      createDefaultMember('hana', 'back', 'bottom'),
    ],
  },
  {
    floor: 3,
    name: 'Andar 3 — Emboscada das Sombras',
    subtitle: 'Cuidado com a retaguarda: Kage salta direto nos frágeis.',
    statScale: 0.93,
    enemyTeam: [
      createDefaultMember('bram', 'front', 'center'),
      {
        heroId: 'kage',
        slot: { col: 'mid', row: 'top' },
        activeSkillIds: ['kage_shadow_step', 'kage_venom_slash'],
        ultimateId: 'kage_ult_eclipse',
      },
      {
        heroId: 'lyra',
        slot: { col: 'back', row: 'bottom' },
        activeSkillIds: ['lyra_frost_nova', 'lyra_thunder_strike'],
        ultimateId: 'lyra_ult_blizzard',
      },
    ],
  },
  {
    floor: 4,
    name: 'Andar 4 — Muralha Arcana',
    subtitle: 'Escudos constantes e chuva de magias em área.',
    statScale: 1.0,
    enemyTeam: [
      {
        heroId: 'bram',
        slot: { col: 'front', row: 'center' },
        activeSkillIds: ['bram_aegis', 'bram_vanguard'],
        ultimateId: 'bram_ult_bastion',
      },
      {
        heroId: 'lyra',
        slot: { col: 'back', row: 'top' },
        activeSkillIds: ['lyra_frost_nova', 'lyra_arcane_bolts'],
        ultimateId: 'lyra_ult_meteor',
      },
      {
        heroId: 'hana',
        slot: { col: 'back', row: 'bottom' },
        activeSkillIds: ['hana_sanctuary', 'hana_holy_ward'],
        ultimateId: 'hana_ult_miracle',
      },
    ],
  },
  {
    floor: 5,
    name: 'Andar 5 — CHEFE: Tríade Carmesim',
    subtitle: 'Pressão ofensiva máxima com buffs de equipe.',
    isBoss: true,
    statScale: 1.1,
    enemyTeam: [
      {
        heroId: 'ren',
        slot: { col: 'front', row: 'top' },
        activeSkillIds: ['ren_flame_arc', 'ren_battle_cry'],
        ultimateId: 'ren_ult_inferno',
      },
      {
        heroId: 'kage',
        slot: { col: 'mid', row: 'bottom' },
        activeSkillIds: ['kage_shadow_step', 'kage_smoke_veil'],
        ultimateId: 'kage_ult_eclipse',
      },
      {
        heroId: 'hana',
        slot: { col: 'back', row: 'center' },
        activeSkillIds: ['hana_bloom_heal', 'hana_holy_ward'],
        ultimateId: 'hana_ult_radiance',
      },
    ],
  },
  {
    floor: 6,
    name: 'Andar 6 — Tempestade Esmeralda',
    subtitle: 'Controle de grupo e rajadas perfurantes.',
    statScale: 1.16,
    enemyTeam: [
      {
        heroId: 'bram',
        slot: { col: 'front', row: 'center' },
        activeSkillIds: ['bram_quake', 'bram_shield_bash'],
        ultimateId: 'bram_ult_cataclysm',
      },
      {
        heroId: 'sora',
        slot: { col: 'back', row: 'top' },
        activeSkillIds: ['sora_volley', 'sora_pierce'],
        ultimateId: 'sora_ult_tempest',
      },
      {
        heroId: 'lyra',
        slot: { col: 'back', row: 'bottom' },
        activeSkillIds: ['lyra_thunder_strike', 'lyra_mana_barrier'],
        ultimateId: 'lyra_ult_blizzard',
      },
    ],
  },
  {
    floor: 7,
    name: 'Andar 7 — Lâminas Fantasmas',
    subtitle: 'Dois lutadores velozes apoiados por bênçãos solares.',
    statScale: 1.22,
    enemyTeam: [
      {
        heroId: 'ren',
        slot: { col: 'front', row: 'top' },
        activeSkillIds: ['ren_flash_dash', 'ren_wind_wave'],
        ultimateId: 'ren_ult_tempest',
      },
      {
        heroId: 'kage',
        slot: { col: 'front', row: 'bottom' },
        activeSkillIds: ['kage_shadow_step', 'kage_shuriken'],
        ultimateId: 'kage_ult_phantom',
      },
      {
        heroId: 'hana',
        slot: { col: 'back', row: 'center' },
        activeSkillIds: ['hana_sanctuary', 'hana_star_orb'],
        ultimateId: 'hana_ult_miracle',
      },
    ],
  },
  {
    floor: 8,
    name: 'Andar 8 — Bastião Imortal',
    subtitle: 'Defesa impenetrável e dano explosivo prolongado.',
    statScale: 1.28,
    enemyTeam: [
      {
        heroId: 'bram',
        slot: { col: 'front', row: 'center' },
        activeSkillIds: ['bram_aegis', 'bram_vanguard'],
        ultimateId: 'bram_ult_bastion',
      },
      {
        heroId: 'hana',
        slot: { col: 'mid', row: 'top' },
        activeSkillIds: ['hana_bloom_heal', 'hana_sanctuary'],
        ultimateId: 'hana_ult_miracle',
      },
      {
        heroId: 'lyra',
        slot: { col: 'back', row: 'bottom' },
        activeSkillIds: ['lyra_frost_nova', 'lyra_mana_barrier'],
        ultimateId: 'lyra_ult_meteor',
      },
    ],
  },
  {
    floor: 9,
    name: 'Andar 9 — Guarda Imperial',
    subtitle: 'Sinergia de alto nível entre linha de frente e atiradores.',
    statScale: 1.35,
    enemyTeam: [
      {
        heroId: 'bram',
        slot: { col: 'front', row: 'top' },
        activeSkillIds: ['bram_quake', 'bram_vanguard'],
        ultimateId: 'bram_ult_cataclysm',
      },
      {
        heroId: 'ren',
        slot: { col: 'mid', row: 'bottom' },
        activeSkillIds: ['ren_flame_arc', 'ren_flash_dash'],
        ultimateId: 'ren_ult_inferno',
      },
      {
        heroId: 'sora',
        slot: { col: 'back', row: 'center' },
        activeSkillIds: ['sora_arrow_rain', 'sora_tailwind'],
        ultimateId: 'sora_ult_starfall',
      },
    ],
  },
  {
    floor: 10,
    name: 'Andar 10 — CHEFE FINAL: Lendas de Kizuna',
    subtitle: 'O ápice da Torre. Ajuste sua formação e movesets ao limite!',
    isBoss: true,
    statScale: 1.45,
    enemyTeam: [
      {
        heroId: 'bram',
        slot: { col: 'front', row: 'center' },
        activeSkillIds: ['bram_aegis', 'bram_quake'],
        ultimateId: 'bram_ult_bastion',
      },
      {
        heroId: 'kage',
        slot: { col: 'mid', row: 'top' },
        activeSkillIds: ['kage_shadow_step', 'kage_venom_slash'],
        ultimateId: 'kage_ult_eclipse',
      },
      {
        heroId: 'lyra',
        slot: { col: 'back', row: 'bottom' },
        activeSkillIds: ['lyra_thunder_strike', 'lyra_frost_nova'],
        ultimateId: 'lyra_ult_meteor',
      },
    ],
  },
];
