import { Unit } from './unit.js';
import { chance, pickRandom } from './utils.js';

function applyBasicSkill(unit, game, skill) {
  if (unit.remainingSteps < skill.cost) {
    return `${unit.name} 步数不足，无法施放 ${skill.name}。`;
  }
  if (skill.spCost && unit.sp < skill.spCost) {
    return `${unit.name} SP 不足，无法施放 ${skill.name}。`;
  }
  if (skill.spCost) {
    unit.sp -= skill.spCost;
    if (unit.sp < 0) {
      unit.sp = 0;
      unit.onSpBreak({ source: skill.name });
    }
  }
  const log = skill.execute(unit, game) || `${unit.name} 使用了 ${skill.name}。`;
  unit.spendSteps(skill.cost);
  return log;
}

function buildSkillPool(unit, game) {
  const pool = [];
  unit.skills.forEach((skill) => {
    if (skill.condition && !skill.condition(unit, game)) return;
    const probability = typeof skill.probability === 'function' ? skill.probability(unit, game) : skill.probability;
    if (chance(probability)) {
      pool.push(skill);
    }
  });
  if (!pool.length) {
    pool.push({
      name: '普通攻击',
      cost: 1,
      execute: (self, g) => self.basicAttack(self.findNearestEnemy(), 1, { damage: 10, spDamage: 5 }),
    });
  }
  return pool.slice(0, 10);
}

function pickSkill(unit, game) {
  const pool = buildSkillPool(unit, game);
  if (pool.length === 0) return null;
  return pickRandom(pool);
}

function createAdora(game) {
  const unit = new Unit(game, {
    name: 'Adora',
    shortName: 'Ad',
    side: 'allies',
    level: 20,
    position: { x: 7, y: 2 },
    hp: 100,
    sp: 100,
    spRecoveryRatio: 0.5,
    type: 'normal',
    hasGun: true,
    skills: [],
    passives: {
      onTurnStart(self, g) {
        if (self.sp < 10) {
          self.baseDamageMultiplier = 1.5;
        } else {
          self.baseDamageMultiplier = 1;
        }
        if (self.extra.skipTurnRecovery) {
          self.sp = Math.min(self.maxSp, self.sp + 10);
          self.extra.skipTurnRecovery = false;
          g.writeLog('Adora 通过冷静分析恢复 10 点 SP。');
        }
      },
      onTurnEnd(self, g) {
        if (self.extra.didNothing) {
          self.extra.skipTurnRecovery = true;
        }
        self.extra.didNothing = false;
      },
      takeAction(self, g) {
        const skill = pickSkill(self, g);
        if (!skill) {
          self.turnEnded = true;
          self.extra.didNothing = true;
          return `${self.name} 未找到可用技能。`;
        }
        const enemy = self.findNearestEnemy();
        if (!enemy) {
          self.turnEnded = true;
          self.extra.didNothing = true;
          return `${self.name} 周围没有敌人。`;
        }
        self.extra.didNothing = false;
        return applyBasicSkill(self, g, skill);
      },
    },
  });

  unit.extra.didNothing = false;
  unit.extra.skipTurnRecovery = false;

  function frontEnemy(unit, distance = 1) {
    const dir = unit.getFrontDirection();
    const targetPos = { x: unit.position.x + dir.x * distance, y: unit.position.y + dir.y * distance };
    const tile = game.map.getTile(targetPos.x, targetPos.y);
    if (!tile || !tile.unitId) return null;
    return game.getUnit(tile.unitId);
  }

  function areaEnemies(center, width, height) {
    const enemies = [];
    for (const enemy of unit.getEnemies()) {
      if (
        enemy.position.x >= center.x - Math.floor(width / 2) &&
        enemy.position.x <= center.x + Math.floor(width / 2) &&
        enemy.position.y >= center.y - Math.floor(height / 2) &&
        enemy.position.y <= center.y + Math.floor(height / 2)
      ) {
        enemies.push(enemy);
      }
    }
    return enemies;
  }

  unit.skills = [
    {
      id: 'adora_dagger',
      name: '短匕轻挥！',
      cost: 1,
      probability: 0.8,
      execute(self, g) {
        const target = frontEnemy(self, 1) || self.findNearestEnemy();
        if (!target) {
          self.extra.didNothing = true;
          return `${self.name} 面前没有敌人。`;
        }
        let damage = 10 * self.baseDamageMultiplier;
        const spDamage = 5;
        target.takeDamage(damage, { source: '短匕轻挥' });
        target.takeSpDamage(spDamage, { source: '短匕轻挥' });
        if (chance(0.25)) {
          target.addBleed(1, 0.05, 2);
          g.writeLog(`${target.name} 因短匕轻挥流血。`);
        }
        return `${self.name} 用短匕攻击 ${target.name}，造成 ${damage.toFixed(1)} 点伤害并造成 5 点 SP 伤害。`;
      },
    },
    {
      id: 'adora_shot',
      name: '枪击',
      cost: 1,
      probability: 0.65,
      condition(self) {
        return self.weapon.hasGun;
      },
      execute(self, g) {
        const dir = self.getFrontDirection();
        let hits = 0;
        let log = `${self.name} 展开枪击。`;
        for (let i = 1; i <= 6; i++) {
          const targetPos = { x: self.position.x + dir.x * i, y: self.position.y + dir.y * i };
          const tile = g.map.getTile(targetPos.x, targetPos.y);
          if (tile && tile.unitId) {
            const target = g.getUnit(tile.unitId);
            if (target && target.side !== self.side) {
              target.takeDamage(10, { source: '枪击' });
              target.takeSpDamage(5, { source: '枪击' });
              hits += 1;
            }
          }
        }
        return `${log} 命中 ${hits} 个目标。`;
      },
    },
    {
      id: 'adora_escape',
      name: '呀！你不要靠近我呀！！',
      cost: 2,
      probability: 0.4,
      execute(self, g) {
        const enemy = self.findNearestEnemy();
        if (!enemy) return `${self.name} 没有目标需要躲避。`;
        const dx = self.position.x - enemy.position.x;
        const dy = self.position.y - enemy.position.y;
        const options = [
          { x: self.position.x + Math.sign(dx), y: self.position.y },
          { x: self.position.x, y: self.position.y + Math.sign(dy) },
          { x: self.position.x + Math.sign(dx), y: self.position.y + Math.sign(dy) },
        ];
        for (const option of options) {
          if (g.map.canMove(self, option.x, option.y)) {
            g.map.moveUnit(self, option.x, option.y);
            break;
          }
        }
        let log = `${self.name} 迅速后退。`;
        if (enemy.hp / enemy.maxHp < 0.5) {
          enemy.takeDamage(10, { source: '短匕追击' });
          enemy.takeSpDamage(5, { source: '短匕追击' });
          log += `并追击造成额外伤害。`;
        }
        return log;
      },
    },
    {
      id: 'adora_stun',
      name: '自制粉色迷你电击装置！',
      cost: 3,
      probability: 0.3,
      execute(self, g) {
        const enemies = areaEnemies(self.position, 3, 3);
        if (!enemies.length) return `${self.name} 没有捕捉到目标。`;
        let total = 0;
        enemies.forEach((enemy) => {
          enemy.takeDamage(10, { source: '迷你电击' });
          enemy.takeSpDamage(15, { source: '迷你电击' });
          enemy.addFear(1);
          total += 1;
        });
        return `${self.name} 使用电击装置命中 ${total} 个目标。`;
      },
    },
    {
      id: 'adora_heal',
      name: '略懂的医术！',
      cost: 2,
      probability: 0.3,
      condition(self) {
        return self.level >= 25;
      },
      execute(self, g) {
        const allies = g.getAliveUnits('allies');
        if (!allies.length) return `${self.name} 没有友方可以治疗。`;
        const target = pickRandom(allies);
        target.heal(20, '略懂的医术');
        target.sp = Math.min(target.maxSp, target.sp + 15);
        target.addRecovery(1);
        return `${self.name} 治疗 ${target.name}，恢复 20 HP 与 15 SP。`;
      },
    },
    {
      id: 'adora_cheer',
      name: '加油哇！',
      cost: 4,
      probability: 0.2,
      condition(self) {
        return self.level >= 25;
      },
      execute(self, g) {
        const allies = g.getAliveUnits('allies');
        const target = pickRandom(allies.filter((ally) => ally !== self));
        if (!target) return `${self.name} 没有友方可以鼓舞。`;
        target.addChickenBlood();
        return `${self.name} 给 ${target.name} 注入鸡血。`;
      },
    },
    {
      id: 'adora_reliance',
      name: '只能靠你了。。',
      cost: 4,
      probability: 0.15,
      condition(self) {
        return self.level >= 35;
      },
      execute(self, g) {
        const allies = g.getAliveUnits('allies').filter((ally) => ally !== self);
        if (!allies.length) return `${self.name} 没有可以托付的目标。`;
        const target = pickRandom(allies);
        self.takeDamage(25, { source: '只能靠你了' });
        target.addReliance();
        return `${self.name} 牺牲自己体力，为 ${target.name} 施加依赖。`;
      },
    },
  ];

  return unit;
}

function createKarma(game) {
  const unit = new Unit(game, {
    name: 'Karma',
    shortName: 'Ka',
    side: 'allies',
    level: 20,
    position: { x: 3, y: 2 },
    hp: 200,
    sp: 50,
    spRecoveryRatio: 0.5,
    type: 'normal',
    hasGun: true,
    skills: [],
    passives: {
      onTurnStart(self) {
        const missingRatio = (self.maxHp - self.hp) / self.maxHp;
        self.baseDamageMultiplier = 1 + missingRatio * 0.5;
      },
      onDamaged(self, amount) {
        self.extra.nextAttackBonus = (self.extra.nextAttackBonus || 0) + 5;
      },
      takeAction(self, g) {
        const skill = pickSkill(self, g);
        if (!skill) {
          self.turnEnded = true;
          return `${self.name} 没有可用技能。`;
        }
        return applyBasicSkill(self, g, skill);
      },
    },
  });

  unit.extra.combo = 0;
  unit.extra.nextAttackBonus = 0;

  unit.skills = [
    {
      id: 'karma_punch',
      name: '沙包大的拳头',
      cost: 1,
      probability: 0.8,
      execute(self, g) {
        const enemy = self.findNearestEnemy();
        if (!enemy) return `${self.name} 没有目标。`;
        let damage = 15 * self.baseDamageMultiplier + (self.extra.nextAttackBonus || 0);
        if (self.chickenBlood) {
          damage *= 2;
          self.chickenBlood = 0;
        }
        enemy.takeDamage(damage, { source: '沙包大的拳头' });
        self.extra.combo = (self.extra.combo || 0) + 1;
        if (self.extra.combo >= 3) {
          enemy.takeDamage(15, { source: '沙包大的拳头追击' });
          self.extra.combo += 1;
        }
        return `${self.name} 猛击 ${enemy.name} 造成 ${damage.toFixed(1)} 点伤害。`;
      },
    },
    {
      id: 'karma_shot',
      name: '枪击',
      cost: 1,
      probability: 0.65,
      condition(self) {
        return self.weapon.hasGun;
      },
      execute(self, g) {
        const dir = self.getFrontDirection();
        let hits = 0;
        for (let i = 1; i <= 6; i++) {
          const tile = g.map.getTile(self.position.x + dir.x * i, self.position.y + dir.y * i);
          if (tile && tile.unitId) {
            const enemy = g.getUnit(tile.unitId);
            if (enemy && enemy.side !== self.side) {
              enemy.takeDamage(10, { source: '枪击' });
              enemy.takeSpDamage(5, { source: '枪击' });
              hits += 1;
            }
          }
        }
        return `${self.name} 开火命中 ${hits} 个目标。`;
      },
    },
    {
      id: 'karma_move',
      name: '都听你的',
      cost: 2,
      probability: 0.4,
      execute(self, g) {
        const enemy = self.findNearestEnemy();
        if (!enemy) return `${self.name} 无目标。`;
        self.moveTowards(enemy, false);
        self.moveTowards(enemy, false);
        self.sp = Math.min(self.maxSp, self.sp + 5);
        return `${self.name} 拉近距离并恢复 5 点 SP。`;
      },
    },
    {
      id: 'karma_execute',
      name: '嗜血之握',
      cost: 3,
      probability: 0.3,
      execute(self, g) {
        const enemy = self.findNearestEnemy();
        if (!enemy) return `${self.name} 没有目标。`;
        enemy.takeDamage(75, { source: '嗜血之握' });
        enemy.takeSpDamage(20, { source: '嗜血之握' });
        return `${self.name} 对 ${enemy.name} 使用嗜血之握。`;
      },
    },
    {
      id: 'karma_breath',
      name: '深呼吸',
      cost: 2,
      probability: 0.2,
      condition(self) {
        return self.level >= 25 && !self.flags.usedDeepBreath;
      },
      execute(self, g) {
        self.sp = self.maxSp;
        self.heal(10, '深呼吸');
        self.flags.usedDeepBreath = true;
        return `${self.name} 深呼吸恢复全部 SP 并治疗自身。`;
      },
    },
  ];

  return unit;
}

function createDario(game) {
  const unit = new Unit(game, {
    name: 'Dario',
    shortName: 'Da',
    side: 'allies',
    level: 20,
    position: { x: 5, y: 2 },
    hp: 150,
    sp: 100,
    spRecoveryRatio: 0.75,
    type: 'normal',
    hasGun: true,
    skills: [],
    passives: {
      onTurnStart(self, g) {
        if ((g.round - 1) % 5 === 0) {
          g.getAliveUnits('allies').forEach((ally) => {
            ally.sp = Math.min(ally.maxSp, ally.sp + 15);
          });
          g.writeLog('Dario 激励士气，为全队恢复 15 SP。');
        }
      },
      takeAction(self, g) {
        const skill = pickSkill(self, g);
        if (!skill) {
          self.turnEnded = true;
          return `${self.name} 未能找到技能。`;
        }
        return applyBasicSkill(self, g, skill);
      },
      onDamaged(self, amount, context) {
        if (chance(0.5) && context.source !== '反击') {
          const attacker = context.attacker;
          if (attacker) {
            attacker.takeDamage(15, { source: '机械爪反击', attacker: self });
          }
        }
      },
    },
  });

  unit.skills = [
    {
      id: 'dario_claw',
      name: '机械爪击',
      cost: 1,
      probability: 0.8,
      execute(self, g) {
        const enemy = self.findNearestEnemy();
        if (!enemy) return `${self.name} 没有敌人。`;
        enemy.takeDamage(15, { source: '机械爪击', attacker: self });
        if (chance(0.15)) {
          enemy.stunLayers += 1;
          enemy.checkStunThreshold();
        }
        return `${self.name} 机械爪击命中 ${enemy.name}。`;
      },
    },
    {
      id: 'dario_shot',
      name: '枪击',
      cost: 1,
      probability: 0.65,
      condition(self) {
        return self.weapon.hasGun;
      },
      execute(self, g) {
        const dir = self.getFrontDirection();
        let hits = 0;
        for (let i = 1; i <= 6; i++) {
          const tile = g.map.getTile(self.position.x + dir.x * i, self.position.y + dir.y * i);
          if (tile && tile.unitId) {
            const enemy = g.getUnit(tile.unitId);
            if (enemy && enemy.side !== self.side) {
              enemy.takeDamage(10, { source: '枪击' });
              enemy.takeSpDamage(5, { source: '枪击' });
              hits += 1;
            }
          }
        }
        return `${self.name} 枪击命中 ${hits} 个目标。`;
      },
    },
    {
      id: 'dario_speed',
      name: '迅捷步伐',
      cost: 2,
      probability: 0.4,
      execute(self, g) {
        const enemy = self.findNearestEnemy();
        if (!enemy) return `${self.name} 无敌可近。`;
        self.moveTowards(enemy, false);
        self.moveTowards(enemy, false);
        enemy.takeSpDamage(5, { source: '迅捷步伐' });
        return `${self.name} 迅速逼近 ${enemy.name} 并减少其 5 点 SP。`;
      },
    },
    {
      id: 'dario_pull',
      name: '拿来吧你！',
      cost: 3,
      probability: 0.3,
      execute(self, g) {
        const enemy = self.findNearestEnemy();
        if (!enemy) return `${self.name} 无目标。`;
        enemy.takeDamage(20, { source: '拿来吧你', attacker: self });
        enemy.takeSpDamage(15, { source: '拿来吧你', attacker: self });
        enemy.stunLayers += 1;
        enemy.checkStunThreshold();
        const dest = { x: self.position.x + 1, y: self.position.y };
        if (g.map.canMove(enemy, dest.x, dest.y)) {
          g.map.moveUnit(enemy, dest.x, dest.y);
        }
        return `${self.name} 将 ${enemy.name} 拖拽到面前并眩晕。`;
      },
    },
    {
      id: 'dario_future',
      name: '先苦后甜',
      cost: 4,
      probability: 0.15,
      condition(self) {
        return self.level >= 25 && !self.flags.futureStep;
      },
      execute(self, g) {
        self.flags.futureStep = true;
        self.stepBonusNext += 4;
        return `${self.name} 预留步数，下一回合将增加 4 步。`;
      },
    },
  ];

  return unit;
}

function createHaz(game) {
  const unit = new Unit(game, {
    name: 'Haz',
    shortName: 'Hz',
    side: 'enemies',
    level: 55,
    position: { x: 20, y: 14 },
    hp: 750,
    sp: 100,
    spRecoveryRatio: 1,
    type: 'boss',
    stunThreshold: 4,
    stepAdvantage: 2,
    skills: [],
    passives: {
      onTurnStart(self) {
        if (self.hp / self.maxHp < 0.5) {
          self.baseDamageMultiplier = 1.3;
        } else {
          self.baseDamageMultiplier = 1;
        }
        if (self.extra.guardTurns) {
          self.extra.guardTurns -= 1;
          if (self.extra.guardTurns <= 0) {
            self.damageTakenMultiplier = 1;
          }
        }
      },
      onRoundStart(self, g) {
        if (g.round % 2 === 0) {
          self.sp = Math.min(self.maxSp, self.sp + 10);
          g.getAliveUnits('enemies').forEach((unit) => {
            if (unit !== self) unit.sp = Math.min(unit.maxSp, unit.sp + 5);
          });
          g.writeLog('Haz 发号施令，为队伍恢复 SP。');
        }
        if (g.round > 20 && !self.flags.oppression) {
          self.flags.oppression = true;
          g.units
            .filter((u) => u.side === 'enemies' && u !== self)
            .forEach((u) => {
              u.flags.oppression = true;
            });
          g.writeLog('Haz 的队长压迫降临，队员将动用禁忌技能！');
        }
        if (g.round <= 15) {
          self.extra.critWindow = true;
        } else {
          self.extra.critWindow = false;
        }
      },
      takeAction(self, g) {
        const skill = pickSkill(self, g);
        if (!skill) {
          self.turnEnded = true;
          return `${self.name} 暂无合适技能。`;
        }
        return applyBasicSkill(self, g, skill);
      },
    },
  });

  unit.stepAdvantage = 2;
  unit.extra = { critWindow: true };

  function huntTarget(self) {
    const target = self.findNearestEnemy();
    if (target) {
      target.extra = target.extra || {};
      target.extra.hunted = true;
    }
    return target;
  }

  unit.skills = [
    {
      id: 'haz_spear',
      name: '鱼叉穿刺',
      cost: 1,
      probability: 0.7,
      execute(self, g) {
        const enemy = self.findNearestEnemy();
        if (!enemy) return `${self.name} 找不到目标。`;
        const damage = 20 * self.baseDamageMultiplier;
        enemy.takeDamage(damage, { source: '鱼叉穿刺' });
        self.sp = Math.min(self.maxSp, self.sp + 10);
        huntTarget(self);
        return `${self.name} 刺击 ${enemy.name} 造成 ${damage.toFixed(1)} 点伤害并恢复 10 SP。`;
      },
    },
    {
      id: 'haz_chain',
      name: '深海猎杀',
      cost: 2,
      probability: 0.6,
      execute(self, g) {
        const enemy = self.findNearestEnemy();
        if (!enemy) return `${self.name} 无目标。`;
        const damage = 25 * self.baseDamageMultiplier;
        enemy.takeDamage(damage, { source: '深海猎杀', attacker: self });
        enemy.takeSpDamage(10, { source: '深海猎杀', attacker: self });
        const dest = { x: self.position.x - 1, y: self.position.y };
        if (g.map.canMove(enemy, dest.x, dest.y)) {
          g.map.moveUnit(enemy, dest.x, dest.y);
        }
        huntTarget(self);
        return `${self.name} 将 ${enemy.name} 拉至身前造成 ${damage.toFixed(1)} 点伤害。`;
      },
    },
    {
      id: 'haz_divine',
      name: '猎神之叉',
      cost: 2,
      probability: 0.65,
      execute(self, g) {
        const enemy = self.findNearestEnemy();
        if (!enemy) return `${self.name} 暂无目标。`;
        const damage = 20 * self.baseDamageMultiplier;
        enemy.takeDamage(damage, { source: '猎神之叉' });
        if (chance(0.5)) {
          enemy.takeDamage(damage, { source: '猎神之叉暴击' });
        }
        enemy.takeSpDamage(15, { source: '猎神之叉' });
        enemy.addBleed(1, 0.05, 2);
        huntTarget(self);
        return `${self.name} 猎杀 ${enemy.name}，造成巨额伤害。`;
      },
    },
    {
      id: 'haz_shield',
      name: '锁链缠绕',
      cost: 2,
      probability: 0.5,
      execute(self, g) {
        self.damageTakenMultiplier = 0.6;
        self.extra.guardTurns = 2;
        g.getAliveUnits('enemies').forEach((ally) => {
          if (ally !== self) ally.sp = Math.min(ally.maxSp, ally.sp + 5);
        });
        return `${self.name} 架起锁链护盾，2 回合内减免 40% 伤害。`;
      },
    },
    {
      id: 'haz_crash',
      name: '鲸落',
      cost: 4,
      probability: 0.3,
      execute(self, g) {
        const enemies = self.getEnemies();
        let hits = 0;
        enemies.forEach((enemy) => {
          const dist = Math.abs(enemy.position.x - self.position.x) + Math.abs(enemy.position.y - self.position.y);
          if (dist <= 2) {
            enemy.takeDamage(50, { source: '鲸落' });
            enemy.takeSpDamage(20, { source: '鲸落' });
            enemy.addFear(1);
            hits += 1;
          }
        });
        return `${self.name} 施展鲸落，波及 ${hits} 个目标。`;
      },
    },
    {
      id: 'haz_grudge',
      name: '怨念滋生',
      cost: 1,
      probability(self) {
        return self.flags.oppression ? 0.33 : 0;
      },
      execute(self, g) {
        let hits = 0;
        self.getEnemies().forEach((enemy) => {
          if (enemy.extra && enemy.extra.hunted) {
            enemy.addBleed(1, 0.05, 2);
            enemy.addFear(1);
            hits += 1;
          }
        });
        return `${self.name} 的怨念席卷 ${hits} 名目标。`;
      },
    },
    {
      id: 'haz_price',
      name: '付出代价',
      cost: 2,
      probability(self) {
        return self.flags.oppression ? 0.33 : 0;
      },
      execute(self, g) {
        const enemy = self.findNearestEnemy();
        if (!enemy) return `${self.name} 没有目标。`;
        enemy.takeDamage(45, { source: '付出代价' });
        enemy.takeSpDamage(5, { source: '付出代价' });
        return `${self.name} 让 ${enemy.name} 付出代价。`;
      },
    },
    {
      id: 'haz_hate',
      name: '仇恨之叉',
      cost: 2,
      probability(self) {
        return self.flags.oppression ? 0.33 : 0;
      },
      execute(self, g) {
        const enemies = self.getEnemies();
        let hits = 0;
        enemies.forEach((enemy) => {
          const dist = Math.abs(enemy.position.x - self.position.x) + Math.abs(enemy.position.y - self.position.y);
          if (dist <= 2) {
            enemy.takeDamage(35, { source: '仇恨之叉' });
            enemy.takeSpDamage(10, { source: '仇恨之叉' });
            enemy.addHazBleed(0.03, 2);
            hits += 1;
          }
        });
        return `${self.name} 扫荡 ${hits} 名目标并施加 Haz 流血。`;
      },
    },
  ];

  return unit;
}

function createKatz(game) {
  const unit = new Unit(game, {
    name: 'Katz',
    shortName: 'Kz',
    side: 'enemies',
    level: 53,
    position: { x: 18, y: 15 },
    hp: 500,
    sp: 75,
    type: 'miniBoss',
    stunThreshold: 3,
    stepAdvantage: 2,
    skills: [],
    passives: {
      onTurnStart(self, g) {
        if (g.round <= 15) {
          self.baseDamageMultiplier = 1.3;
        } else {
          self.baseDamageMultiplier = 1;
        }
        if (self.flags.oppression) {
          self.baseDamageMultiplier = 1.2;
        }
        if (g.units.some((u) => u.name === 'Haz' && !u.isDead)) {
          self.baseDamageMultiplier *= 1.2;
          self.sp = Math.min(self.maxSp, self.sp + 5);
        }
      },
      takeAction(self, g) {
        const skill = pickSkill(self, g);
        if (!skill) {
          self.turnEnded = true;
          return `${self.name} 没有技能可用。`;
        }
        return applyBasicSkill(self, g, skill);
      },
    },
  });

  unit.skills = [
    {
      id: 'katz_stab',
      name: '矛刺',
      cost: 1,
      probability(self) {
        return self.flags.oppression ? 0 : 0.7;
      },
      execute(self, g) {
        const enemy = self.findNearestEnemy();
        if (!enemy) return `${self.name} 找不到目标。`;
        enemy.takeDamage(20 * self.baseDamageMultiplier, { source: '矛刺' });
        self.sp = Math.min(self.maxSp, self.sp + 5);
        return `${self.name} 对 ${enemy.name} 矛刺造成伤害。`;
      },
    },
    {
      id: 'katz_chain',
      name: '链式鞭击',
      cost: 2,
      probability(self) {
        return self.flags.oppression ? 0 : 0.6;
      },
      execute(self, g) {
        const enemy = self.findNearestEnemy();
        if (!enemy) return `${self.name} 无目标。`;
        enemy.takeDamage(25 * self.baseDamageMultiplier, { source: '链式鞭击' });
        enemy.addFear(1);
        return `${self.name} 鞭击 ${enemy.name} 降低其步数。`;
      },
    },
    {
      id: 'katz_whip',
      name: '反复鞭尸',
      cost: 3,
      probability(self) {
        return self.flags.oppression ? 0 : 0.5;
      },
      execute(self, g) {
        const enemies = self.getEnemies();
        let hits = 0;
        enemies.forEach((enemy) => {
          enemy.takeDamage(25 * self.baseDamageMultiplier, { source: '反复鞭尸' });
          hits += 1;
        });
        self.sp = Math.min(self.maxSp, self.sp + 5);
        return `${self.name} 鞭击全场 ${hits} 名敌人。`;
      },
    },
    {
      id: 'katz_bomb',
      name: '终焉礼炮',
      cost: 4,
      probability(self) {
        return self.flags.oppression ? 0 : 0.3;
      },
      execute(self, g) {
        const enemy = self.findNearestEnemy();
        if (!enemy) return `${self.name} 无目标。`;
        enemy.takeDamage(60, { source: '终焉礼炮' });
        enemy.takeSpDamage(15, { source: '终焉礼炮' });
        self.fearStacks += 1;
        return `${self.name} 投射炸弹重创 ${enemy.name}。`;
      },
    },
    {
      id: 'katz_execution',
      name: '必须抹杀一切。。。',
      cost: 2,
      probability(self) {
        return self.flags.oppression ? 0.7 : 0;
      },
      execute(self, g) {
        const enemies = self.getEnemies();
        let hits = 0;
        enemies.forEach((enemy) => {
          enemy.takeDamage(50 * self.baseDamageMultiplier, { source: '必须抹杀一切' });
          hits += 1;
        });
        self.sp = Math.min(self.maxSp, self.sp + 5);
        self.takeDamage(10, { source: '反噬' });
        return `${self.name} 付出生命鞭击 ${hits} 名敌人。`;
      },
    },
  ];

  return unit;
}

function createTusk(game) {
  const unit = new Unit(game, {
    name: 'Tusk',
    shortName: 'Tu',
    side: 'enemies',
    level: 54,
    position: { x: 18, y: 12 },
    hp: 1000,
    sp: 60,
    type: 'miniBoss',
    size: { width: 2, height: 1 },
    stunThreshold: 3,
    stepAdvantage: 2,
    skills: [],
    passives: {
      onTurnStart(self) {
        if (self.extra.fortressTurns) {
          self.extra.fortressTurns -= 1;
          if (self.extra.fortressTurns <= 0) {
            self.damageTakenMultiplier = 1;
          }
        }
        if (self.extra.retaliateTurns) {
          self.extra.retaliateTurns -= 1;
          if (self.extra.retaliateTurns <= 0) {
            self.damageTakenMultiplier = 1;
          }
        }
      },
      onDamaged(self, amount, context) {
        if (context && context.source !== '反伤') {
          self.extra.nextAttackBonus = (self.extra.nextAttackBonus || 0) + 5;
          if (self.extra.retaliateTurns && context.attacker) {
            context.attacker.takeDamage(amount * 0.25, { source: '反伤', attacker: self });
          }
        }
      },
      takeAction(self, g) {
        const skill = pickSkill(self, g);
        if (!skill) {
          self.turnEnded = true;
          return `${self.name} 无技能可用。`;
        }
        return applyBasicSkill(self, g, skill);
      },
    },
  });

  unit.skills = [
    {
      id: 'tusk_shield',
      name: '骨盾猛击',
      cost: 1,
      probability(self) {
        return self.flags.oppression ? 0 : 0.7;
      },
      execute(self, g) {
        const enemy = self.findNearestEnemy();
        if (!enemy) return `${self.name} 没有目标。`;
        const bonus = self.extra.nextAttackBonus || 0;
        enemy.takeDamage(10 + bonus, { source: '骨盾猛击', attacker: self });
        self.extra.nextAttackBonus = 0;
        return `${self.name} 用骨盾击退 ${enemy.name}。`;
      },
    },
    {
      id: 'tusk_roar',
      name: '来自深海的咆哮',
      cost: 2,
      probability(self) {
        return self.flags.oppression ? 0 : 0.6;
      },
      execute(self, g) {
        const enemies = self.getEnemies();
        enemies.forEach((enemy) => enemy.takeSpDamage(20, { source: '深海咆哮' }));
        self.damageTakenMultiplier = 0.5;
        return `${self.name} 咆哮削弱敌人 SP 并强化防御。`;
      },
    },
    {
      id: 'tusk_charge',
      name: '牛鲨冲撞',
      cost: 2,
      probability(self) {
        return self.flags.oppression ? 0 : 0.5;
      },
      execute(self, g) {
        const enemy = self.findNearestEnemy();
        if (!enemy) return `${self.name} 无目标。`;
        const bonus = self.extra.nextAttackBonus || 0;
        enemy.takeDamage(25 + bonus, { source: '牛鲨冲撞', attacker: self });
        enemy.stunLayers += 1;
        enemy.checkStunThreshold();
        self.extra.nextAttackBonus = 0;
        return `${self.name} 冲撞 ${enemy.name} 并造成眩晕层。`;
      },
    },
    {
      id: 'tusk_fortress',
      name: '战争堡垒',
      cost: 3,
      probability(self) {
        return self.flags.oppression ? 0 : 0.3;
      },
      execute(self, g) {
        self.extra.fortressTurns = 3;
        self.damageTakenMultiplier = 0.5;
        const haz = g.units.find((u) => u.name === 'Haz');
        if (haz) haz.baseDamageMultiplier *= 1.15;
        return `${self.name} 进入战争堡垒姿态。`;
      },
    },
    {
      id: 'tusk_guard',
      name: '拼尽全力保卫队长。。。。。',
      cost: 2,
      probability(self) {
        return self.flags.oppression ? 0.3 : 0;
      },
      execute(self, g) {
        self.extra.retaliateTurns = 3;
        self.damageTakenMultiplier = 0.75;
        const haz = g.units.find((u) => u.name === 'Haz');
        if (haz) {
          haz.heal(haz.maxHp * 0.15, '队长援护');
          haz.sp = Math.min(haz.maxSp, haz.sp + 15);
        }
        return `${self.name} 拼死守护队长，获得反伤效果。`;
      },
    },
  ];

  return unit;
}

function createNeyla(game) {
  const unit = new Unit(game, {
    name: 'Neyla',
    shortName: 'Ne',
    side: 'enemies',
    level: 52,
    position: { x: 14, y: 16 },
    hp: 350,
    sp: 80,
    type: 'elite',
    stunThreshold: 2,
    stepAdvantage: 2,
    skills: [],
    passives: {
      onTurnStart(self) {
        if (self.extra.stayStill) {
          self.baseDamageMultiplier = 1.5;
        } else {
          self.baseDamageMultiplier = 1;
        }
      },
      takeAction(self, g) {
        self.extra.stayStill = true;
        const skill = pickSkill(self, g);
        if (!skill) {
          self.turnEnded = true;
          return `${self.name} 找不到技能。`;
        }
        return applyBasicSkill(self, g, skill);
      },
    },
  });

  unit.skills = [
    {
      id: 'neyla_quick',
      name: '迅捷射击',
      cost: 1,
      probability(self) {
        return self.flags.oppression ? 0 : 0.7;
      },
      execute(self, g) {
        const enemy = self.findNearestEnemy();
        if (!enemy) return `${self.name} 无目标。`;
        enemy.takeDamage(15 * self.baseDamageMultiplier, { source: '迅捷射击' });
        enemy.takeSpDamage(5, { source: '迅捷射击' });
        return `${self.name} 迅捷射击命中 ${enemy.name}。`;
      },
    },
    {
      id: 'neyla_pierce',
      name: '穿刺狙击',
      cost: 2,
      probability(self) {
        return self.flags.oppression ? 0 : 0.6;
      },
      execute(self, g) {
        const enemy = self.findNearestEnemy();
        if (!enemy) return `${self.name} 找不到目标。`;
        enemy.takeDamage(30 * self.baseDamageMultiplier, { source: '穿刺狙击' });
        enemy.addBleed(1, 0.05, 2);
        return `${self.name} 穿刺狙击 ${enemy.name} 造成出血。`;
      },
    },
    {
      id: 'neyla_hook',
      name: '双钩牵制',
      cost: 2,
      probability(self) {
        return self.flags.oppression ? 0 : 0.5;
      },
      execute(self, g) {
        const enemy = self.findNearestEnemy();
        if (!enemy) return `${self.name} 无目标。`;
        enemy.takeDamage(15 * self.baseDamageMultiplier, { source: '双钩牵制' });
        enemy.addFear(2);
        return `${self.name} 牵制 ${enemy.name} 减少其步数。`;
      },
    },
    {
      id: 'neyla_shadow',
      name: '终末之影',
      cost: 3,
      probability(self) {
        return self.flags.oppression ? 1 : 0.3;
      },
      execute(self, g) {
        const enemy = self.findNearestEnemy();
        if (!enemy) return `${self.name} 无目标。`;
        enemy.takeDamage(50, { source: '终末之影' });
        enemy.takeSpDamage(20, { source: '终末之影' });
        self.fearStacks += 1;
        return `${self.name} 对 ${enemy.name} 投射终末之影。`;
      },
    },
    {
      id: 'neyla_execute',
      name: '执行。。。。。',
      cost: 2,
      probability(self) {
        return self.flags.oppression ? 0.6 : 0;
      },
      execute(self, g) {
        const enemy = self.findNearestEnemy();
        if (!enemy) return `${self.name} 找不到目标。`;
        enemy.takeDamage(40, { source: '执行' });
        if (enemy.hp / enemy.maxHp < 0.15) {
          enemy.takeDamage(enemy.hp, { source: '执行终结' });
        }
        self.takeDamage(30, { source: '执行反噬' });
        self.takeSpDamage(40, { source: '执行反噬' });
        return `${self.name} 启动执行连射，重创 ${enemy.name}。`;
      },
    },
  ];

  return unit;
}

function createKyn(game) {
  const unit = new Unit(game, {
    name: 'Kyn',
    shortName: 'Ky',
    side: 'enemies',
    level: 51,
    position: { x: 14, y: 11 },
    hp: 250,
    sp: 70,
    type: 'elite',
    stunThreshold: 2,
    stepAdvantage: 2,
    skills: [],
    passives: {
      takeAction(self, g) {
        const skill = pickSkill(self, g);
        if (!skill) {
          self.turnEnded = true;
          return `${self.name} 没有技能。`;
        }
        return applyBasicSkill(self, g, skill);
      },
    },
  });

  unit.skills = [
    {
      id: 'kyn_dash',
      name: '迅影突刺',
      cost: 1,
      probability(self) {
        return self.flags.oppression ? 0 : 0.7;
      },
      execute(self, g) {
        const enemy = self.findNearestEnemy();
        if (!enemy) return `${self.name} 未找到目标。`;
        const dest = { x: enemy.position.x - 1, y: enemy.position.y };
        if (g.map.canMove(self, dest.x, dest.y)) {
          g.map.moveUnit(self, dest.x, dest.y);
        }
        enemy.takeDamage(20, { source: '迅影突刺', attacker: self });
        return `${self.name} 突刺至 ${enemy.name} 身旁。`;
      },
    },
    {
      id: 'kyn_throw',
      name: '割喉飞刃',
      cost: 2,
      probability(self) {
        return self.flags.oppression ? 0 : 0.6;
      },
      execute(self, g) {
        const enemy = self.findNearestEnemy();
        if (!enemy) return `${self.name} 无目标。`;
        enemy.takeDamage(25, { source: '割喉飞刃' });
        enemy.takeSpDamage(5, { source: '割喉飞刃' });
        return `${self.name} 投掷飞刃。`;
      },
    },
    {
      id: 'kyn_dance',
      name: '影杀之舞',
      cost: 2,
      probability(self) {
        return self.flags.oppression ? 0 : 0.5;
      },
      execute(self, g) {
        const enemies = self.getEnemies();
        enemies.forEach((enemy) => {
          const dist = Math.abs(enemy.position.x - self.position.x) + Math.abs(enemy.position.y - self.position.y);
          if (dist <= 1) {
            enemy.takeDamage(30, { source: '影杀之舞' });
          }
        });
        self.remainingSteps += 1;
        return `${self.name} 影杀突袭周围敌人。`;
      },
    },
    {
      id: 'kyn_death',
      name: '死亡宣告',
      cost: 3,
      probability(self) {
        return self.flags.oppression ? 0 : 0.3;
      },
      execute(self, g) {
        const enemy = self.findNearestEnemy();
        if (!enemy) return `${self.name} 无目标。`;
        enemy.takeDamage(50, { source: '死亡宣告' });
        enemy.takeSpDamage(30, { source: '死亡宣告' });
        if (enemy.hp / enemy.maxHp < 0.3) {
          enemy.takeDamage(enemy.hp, { source: '死亡宣告终结' });
        }
        return `${self.name} 对 ${enemy.name} 发出死亡宣告。`;
      },
    },
    {
      id: 'kyn_sacrifice',
      name: '自我了断。。。。',
      cost: 2,
      probability(self) {
        return self.flags.oppression ? 0.5 : 0;
      },
      execute(self, g) {
        const enemy = self.findNearestEnemy();
        if (!enemy) return `${self.name} 没有敌人。`;
        enemy.takeDamage(enemy.hp, { source: '自我了断斩杀' });
        self.takeDamage(self.hp, { source: '自我了断' });
        return `${self.name} 与 ${enemy.name} 同归于尽。`;
      },
    },
  ];

  return unit;
}

export const UNIT_DEFINITIONS = [
  { factory: createAdora },
  { factory: createKarma },
  { factory: createDario },
  { factory: createHaz },
  { factory: createKatz },
  { factory: createTusk },
  { factory: createNeyla },
  { factory: createKyn },
];
