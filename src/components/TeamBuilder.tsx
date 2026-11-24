import React, { useState } from 'react';
import { HEROES, HERO_LIST, createDefaultMember } from '../game/heroes';
import type {
  FormationCol,
  FormationRow,
  HeroId,
  HeroRole,
  TeamMemberConfig,
} from '../game/types';

interface TeamBuilderProps {
  title: string;
  accent: 'blue' | 'red';
  team: TeamMemberConfig[];
  onChange: (next: TeamMemberConfig[]) => void;
}

const COLS: Array<{ id: FormationCol; label: string }> = [
  { id: 'back', label: 'Retaguarda' },
  { id: 'mid', label: 'Meio' },
  { id: 'front', label: 'Frente' },
];

const ROWS: Array<{ id: FormationRow; label: string }> = [
  { id: 'top', label: 'Topo' },
  { id: 'center', label: 'Centro' },
  { id: 'bottom', label: 'Base' },
];

const ROLE_FILTERS: Array<'Todos' | HeroRole> = [
  'Todos',
  'Tanque',
  'Espadachim',
  'Lutador',
  'Assassino',
  'Mago',
  'Atirador',
  'Suporte',
];

export const TeamBuilder: React.FC<TeamBuilderProps> = ({
  title,
  accent,
  team,
  onChange,
}) => {
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [roleFilter, setRoleFilter] = useState<'Todos' | HeroRole>('Todos');
  const activeMember = team[selectedIndex] ?? team[0];
  const activeHero = HEROES[activeMember.heroId];
  const filteredRoster =
    roleFilter === 'Todos'
      ? HERO_LIST
      : HERO_LIST.filter((h) => h.role === roleFilter);

  const handleSelectHero = (heroId: HeroId) => {
    const existingIdx = team.findIndex((m) => m.heroId === heroId);
    if (existingIdx !== -1) {
      setSelectedIndex(existingIdx);
      return;
    }
    const next = [...team];
    const currentSlot = next[selectedIndex].slot;
    next[selectedIndex] = createDefaultMember(heroId, currentSlot.col, currentSlot.row);
    onChange(next);
  };

  const handlePlaceSlot = (col: FormationCol, row: FormationRow) => {
    const occupantIdx = team.findIndex((m) => m.slot.col === col && m.slot.row === row);
    const next = [...team];
    if (occupantIdx === selectedIndex) return;
    if (occupantIdx !== -1) {
      // Swap positions
      const prevSlot = next[selectedIndex].slot;
      next[selectedIndex] = { ...next[selectedIndex], slot: { col, row } };
      next[occupantIdx] = { ...next[occupantIdx], slot: prevSlot };
    } else {
      next[selectedIndex] = { ...next[selectedIndex], slot: { col, row } };
    }
    onChange(next);
  };

  const handleToggleActiveSkill = (skillId: string) => {
    const current = activeMember.activeSkillIds;
    if (current.includes(skillId)) return; // Always keep 2 selected
    const nextSkills: [string, string] = [current[1], skillId];
    const next = [...team];
    next[selectedIndex] = { ...activeMember, activeSkillIds: nextSkills };
    onChange(next);
  };

  const handleSelectUltimate = (ultId: string) => {
    const next = [...team];
    next[selectedIndex] = { ...activeMember, ultimateId: ultId };
    onChange(next);
  };

  const borderClass = accent === 'blue' ? 'panel-blue' : 'panel-red';

  return (
    <div className={`team-builder ${borderClass}`}>
      <div className="tb-header">
        <h3>{title}</h3>
        <span className="tb-hint">Clique em um slot do time para trocar herói, posição e golpes</span>
      </div>

      {/* 3 Active Team Slots */}
      <div className="team-slots-row">
        {team.map((member, idx) => {
          const def = HEROES[member.heroId];
          const isSelected = idx === selectedIndex;
          return (
            <button
              key={idx}
              type="button"
              className={`team-slot-card ${isSelected ? 'selected' : ''}`}
              onClick={() => setSelectedIndex(idx)}
              style={{ borderColor: isSelected ? def.color : undefined }}
            >
              <img src={def.spritePath} alt={def.name} className="pixel-sprite small" />
              <div className="team-slot-info">
                <div className="hero-name">{def.name}</div>
                <div className="hero-role" style={{ color: def.color }}>
                  {def.role}
                </div>
                <div className="slot-pos-tag">
                  {member.slot.col === 'front'
                    ? 'Frente'
                    : member.slot.col === 'mid'
                    ? 'Meio'
                    : 'Retaguarda'}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Roster Picker with Class Filter */}
      <div className="tb-section">
        <div className="tb-label">
          Trocar Lutador do Slot #{selectedIndex + 1} ({HERO_LIST.length} disponíveis)
        </div>
        <div className="role-filter-bar">
          {ROLE_FILTERS.map((rf) => (
            <button
              key={rf}
              type="button"
              className={`role-filter-pill ${roleFilter === rf ? 'active' : ''}`}
              onClick={() => setRoleFilter(rf)}
            >
              {rf}
            </button>
          ))}
        </div>
        <div className="roster-grid">
          {filteredRoster.map((hero) => {
            const inTeamIdx = team.findIndex((m) => m.heroId === hero.id);
            const isCurrent = activeMember.heroId === hero.id;
            return (
              <button
                key={hero.id}
                type="button"
                className={`roster-btn ${isCurrent ? 'current' : ''} ${
                  inTeamIdx !== -1 && !isCurrent ? 'in-team' : ''
                }`}
                onClick={() => handleSelectHero(hero.id)}
              >
                <img src={hero.spritePath} alt={hero.name} className="pixel-sprite tiny" />
                <span className="roster-name">{hero.name}</span>
                <span className="roster-role" style={{ color: hero.color }}>
                  {hero.role}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Formation 3x3 + Hero Stats */}
      <div className="tb-two-col">
        <div className="tb-section">
          <div className="tb-label">Formação na Arena (3×3)</div>
          <div className="formation-grid">
            <div className="formation-headers">
              {COLS.map((c) => (
                <span key={c.id}>{c.label}</span>
              ))}
            </div>
            {ROWS.map((row) => (
              <div key={row.id} className="formation-row">
                {COLS.map((col) => {
                  const occIdx = team.findIndex(
                    (m) => m.slot.col === col.id && m.slot.row === row.id
                  );
                  const occ = occIdx !== -1 ? team[occIdx] : null;
                  const occHero = occ ? HEROES[occ.heroId] : null;
                  return (
                    <button
                      key={col.id}
                      type="button"
                      className={`formation-cell ${occ ? 'occupied' : ''} ${
                        occIdx === selectedIndex ? 'active-cell' : ''
                      }`}
                      onClick={() => handlePlaceSlot(col.id, row.id)}
                      title={`${col.label} - ${row.label}`}
                    >
                      {occHero ? (
                        <>
                          <img
                            src={occHero.spritePath}
                            alt={occHero.name}
                            className="pixel-sprite tiny"
                          />
                          <span className="cell-name">{occHero.name}</span>
                        </>
                      ) : (
                        <span className="cell-empty">+</span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        <div className="tb-section">
          <div className="tb-label">
            Atributos — {activeHero.name} ({activeHero.title})
          </div>
          <p className="hero-lore">{activeHero.lore}</p>
          <div className="stats-mini-grid">
            <div className="stat-pill">
              <span>HP</span>
              <strong>{activeHero.baseStats.maxHp}</strong>
            </div>
            <div className="stat-pill">
              <span>ATK</span>
              <strong>{activeHero.baseStats.atk}</strong>
            </div>
            <div className="stat-pill">
              <span>DEF</span>
              <strong>{activeHero.baseStats.def}</strong>
            </div>
            <div className="stat-pill">
              <span>CRIT</span>
              <strong>{Math.round(activeHero.baseStats.critChance * 100)}%</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Moveset Editor */}
      <div className="tb-section">
        <div className="tb-label">
          Habilidades Ativas de {activeHero.name} (2 equipadas — clique em outra para substituir)
        </div>
        <div className="skills-grid">
          {activeHero.activeSkills.map((skill) => {
            const equipped = activeMember.activeSkillIds.includes(skill.id);
            return (
              <button
                key={skill.id}
                type="button"
                className={`skill-card ${equipped ? 'equipped' : ''}`}
                onClick={() => handleToggleActiveSkill(skill.id)}
              >
                <div className="skill-card-top">
                  <span className="skill-dot" style={{ backgroundColor: skill.color }} />
                  <strong>{skill.name}</strong>
                  <span className="skill-cd">{skill.cooldown}s</span>
                </div>
                <p>{skill.description}</p>
                {equipped && <span className="equipped-tag">EQUIPADA</span>}
              </button>
            );
          })}
        </div>
      </div>

      <div className="tb-section">
        <div className="tb-label">Ultimate de {activeHero.name} (escolha 1)</div>
        <div className="skills-grid ult-grid">
          {activeHero.ultimates.map((ult) => {
            const equipped = activeMember.ultimateId === ult.id;
            return (
              <button
                key={ult.id}
                type="button"
                className={`skill-card ult-card ${equipped ? 'equipped' : ''}`}
                onClick={() => handleSelectUltimate(ult.id)}
              >
                <div className="skill-card-top">
                  <span className="skill-dot" style={{ backgroundColor: ult.color }} />
                  <strong>★ {ult.name}</strong>
                  <span className="skill-cd">100 EN</span>
                </div>
                <p>{ult.description}</p>
                {equipped && <span className="equipped-tag ult-tag">ULTIMATE ATIVO</span>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
