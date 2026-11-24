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
    name: 'Andar 2 — Dojo do Trovão',
    subtitle: 'Ryuji lidera investidas rápidas com apoio de Hana.',
    statScale: 0.86,
    enemyTeam: [
      createDefaultMember('ryuji', 'front', 'center'),
      createDefaultMember('sora', 'back', 'top'),
      createDefaultMember('hana', 'back', 'bottom'),
    ],
  },
  {
    floor: 3,
    name: 'Andar 3 — Corte Congelante',
    subtitle: 'Yuki congela o campo enquanto Kage ataca sua retaguarda.',
    statScale: 0.92,
    enemyTeam: [
      createDefaultMember('tetsu', 'front', 'center'),
      {
        heroId: 'kage',
        slot: { col: 'mid', row: 'top' },
        activeSkillIds: ['kage_shadow_step', 'kage_venom_slash'],
        ultimateId: 'kage_ult_eclipse',
      },
      {
        heroId: 'yuki',
        slot: { col: 'back', row: 'bottom' },
        activeSkillIds: ['yuki_ice_fan', 'yuki_glacial_pillar'],
        ultimateId: 'yuki_ult_blizzard_queen',
      },
    ],
  },
  {
    floor: 4,
    name: 'Andar 4 — Muralha Arcana',
    subtitle: 'Escudos táticos e chuva de magias em área.',
    statScale: 0.98,
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
    name: 'Andar 5 — CHEFE: Chama do Dragão',
    subtitle: 'Drake e Ren combinam fogo incessante e pressão corpo a corpo.',
    isBoss: true,
    statScale: 1.08,
    enemyTeam: [
      {
        heroId: 'drake',
        slot: { col: 'front', row: 'top' },
        activeSkillIds: ['drake_sweep', 'drake_sky_dive'],
        ultimateId: 'drake_ult_cataclysm_dive',
      },
      {
        heroId: 'ren',
        slot: { col: 'mid', row: 'bottom' },
        activeSkillIds: ['ren_flame_arc', 'ren_battle_cry'],
        ultimateId: 'ren_ult_inferno',
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
    name: 'Andar 6 — Cúpula Cibernética',
    subtitle: 'Nova dispara raios perfurantes protegida pelo Colosso de Jade.',
    statScale: 1.14,
    enemyTeam: [
      {
        heroId: 'tetsu',
        slot: { col: 'front', row: 'center' },
        activeSkillIds: ['tetsu_oni_slam', 'tetsu_jade_roar'],
        ultimateId: 'tetsu_ult_earthshaker',
      },
      {
        heroId: 'nova',
        slot: { col: 'back', row: 'top' },
        activeSkillIds: ['nova_railgun', 'nova_emp_blast'],
        ultimateId: 'nova_ult_orbital',
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
    name: 'Andar 7 — Colheita das Sombras',
    subtitle: 'Dois assassinos letais — Kael e Kage — caçando sua retaguarda.',
    statScale: 1.2,
    enemyTeam: [
      {
        heroId: 'kael',
        slot: { col: 'front', row: 'top' },
        activeSkillIds: ['kael_reap', 'kael_abyss_blink'],
        ultimateId: 'kael_ult_harvest',
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
    name: 'Andar 8 — Fúria Elemental',
    subtitle: 'Ryuji, Yuki e Lyra: trovão, gelo e meteoros sem pausa.',
    statScale: 1.25,
    enemyTeam: [
      {
        heroId: 'ryuji',
        slot: { col: 'front', row: 'center' },
        activeSkillIds: ['ryuji_thunder_upper', 'ryuji_overcharge'],
        ultimateId: 'ryuji_ult_storm_breaker',
      },
      {
        heroId: 'yuki',
        slot: { col: 'mid', row: 'top' },
        activeSkillIds: ['yuki_frost_ring', 'yuki_glacial_pillar'],
        ultimateId: 'yuki_ult_blizzard_queen',
      },
      {
        heroId: 'lyra',
        slot: { col: 'back', row: 'bottom' },
        activeSkillIds: ['lyra_frost_nova', 'lyra_arcane_bolts'],
        ultimateId: 'lyra_ult_meteor',
      },
    ],
  },
  {
    floor: 9,
    name: 'Andar 9 — Artilharia Imperial',
    subtitle: 'Fogo cruzado de Sora e Nova atrás da muralha de Bram.',
    statScale: 1.3,
    enemyTeam: [
      {
        heroId: 'bram',
        slot: { col: 'front', row: 'center' },
        activeSkillIds: ['bram_quake', 'bram_vanguard'],
        ultimateId: 'bram_ult_cataclysm',
      },
      {
        heroId: 'nova',
        slot: { col: 'back', row: 'top' },
        activeSkillIds: ['nova_scatter_laser', 'nova_overclock'],
        ultimateId: 'nova_ult_barrage',
      },
      {
        heroId: 'sora',
        slot: { col: 'back', row: 'bottom' },
        activeSkillIds: ['sora_arrow_rain', 'sora_pierce'],
        ultimateId: 'sora_ult_tempest',
      },
    ],
  },
  {
    floor: 10,
    name: 'Andar 10 — CHEFE: Colosso e Abismo',
    subtitle: 'Tetsu segura a linha enquanto Drake e Kael destroem o campo.',
    isBoss: true,
    statScale: 1.36,
    enemyTeam: [
      {
        heroId: 'tetsu',
        slot: { col: 'front', row: 'center' },
        activeSkillIds: ['tetsu_oni_slam', 'tetsu_spirit_pillar'],
        ultimateId: 'tetsu_ult_earthshaker',
      },
      {
        heroId: 'drake',
        slot: { col: 'mid', row: 'top' },
        activeSkillIds: ['drake_sweep', 'drake_fire_breath'],
        ultimateId: 'drake_ult_cataclysm_dive',
      },
      {
        heroId: 'kael',
        slot: { col: 'mid', row: 'bottom' },
        activeSkillIds: ['kael_abyss_blink', 'kael_reap'],
        ultimateId: 'kael_ult_harvest',
      },
    ],
  },
  {
    floor: 11,
    name: 'Andar 11 — Guarda do Crepúsculo',
    subtitle: 'Combinação de alto controle com Yuki, Ryuji e Nova.',
    statScale: 1.42,
    enemyTeam: [
      {
        heroId: 'ryuji',
        slot: { col: 'front', row: 'top' },
        activeSkillIds: ['ryuji_volt_dash', 'ryuji_thunder_upper'],
        ultimateId: 'ryuji_ult_meteor_fist',
      },
      {
        heroId: 'yuki',
        slot: { col: 'mid', row: 'bottom' },
        activeSkillIds: ['yuki_ice_fan', 'yuki_ice_veil'],
        ultimateId: 'yuki_ult_diamond_dust',
      },
      {
        heroId: 'nova',
        slot: { col: 'back', row: 'center' },
        activeSkillIds: ['nova_railgun', 'nova_emp_blast'],
        ultimateId: 'nova_ult_orbital',
      },
    ],
  },
  {
    floor: 12,
    name: 'Andar 12 — CHEFE SUPREMO: Panteão Kizuna',
    subtitle: 'O desafio final da Torre. Só uma formação perfeita vence!',
    isBoss: true,
    statScale: 1.5,
    enemyTeam: [
      {
        heroId: 'tetsu',
        slot: { col: 'front', row: 'center' },
        activeSkillIds: ['tetsu_oni_slam', 'tetsu_jade_roar'],
        ultimateId: 'tetsu_ult_jade_fortress',
      },
      {
        heroId: 'kael',
        slot: { col: 'mid', row: 'top' },
        activeSkillIds: ['kael_abyss_blink', 'kael_reap'],
        ultimateId: 'kael_ult_harvest',
      },
      {
        heroId: 'nova',
        slot: { col: 'back', row: 'bottom' },
        activeSkillIds: ['nova_railgun', 'nova_emp_blast'],
        ultimateId: 'nova_ult_orbital',
      },
    ],
  },
];
