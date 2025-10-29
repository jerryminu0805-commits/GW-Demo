import { clamp, pickRandom, randomInt } from './utils.js';

let unitCounter = 1;

export class Unit {
  constructor(game, config) {
    this.game = game;
    this.id = `unit-${unitCounter++}`;
    this.name = config.name;
    this.shortName = config.shortName;
    this.side = config.side;
    this.level = config.level;
    this.position = { ...config.position };
    this.size = config.size || { width: 1, height: 1 };
    this.maxHp = config.hp;
    this.hp = config.hp;
    this.maxSp = config.sp;
    this.sp = config.sp;
    this.spRecoveryRatio = config.spRecoveryRatio || 0.5;
    this.stepAdvantage = config.stepAdvantage || 0;
    this.maxSteps = config.maxSteps || 10;
    this.remainingSteps = 0;
    this.turnEnded = false;
    this.skills = config.skills;
    this.passiveHandlers = config.passives || {};
    this.type = config.type || 'normal';
    this.stunThreshold = config.stunThreshold || 1;
    this.stunLayers = 0;
    this.stunnedTurns = 0;
    this.fearStacks = 0;
    this.stepBonusNext = 0;
    this.chickenBlood = 0;
    this.reliance = 0;
    this.recoveryStacks = 0;
    this.bleeds = [];
    this.hazBleeds = [];
    this.dread = 0;
    this.spDamageBonus = 0;
    this.comboCounter = 0;
    this.cooldowns = new Map();
    this.flags = {
      usedDeepBreath: false,
      oppression: false,
    };
    this.extra = config.extra || {};
    this.stealth = false;
    this.weapon = {
      hasGun: config.hasGun || false,
    };
    this.isDead = false;
    this.baseDamageMultiplier = 1;
    this.damageBonusFlat = 0;
    this.damageTakenMultiplier = 1;
    this.spDamageTakenMultiplier = 1;
    this.spDamageDealtMultiplier = 1;
    this.onKill = config.onKill || (() => {});
    if (config.init) {
      config.init(this);
    }
  }

  getFrontDirection() {
    return this.side === 'allies' ? { x: 1, y: 0 } : { x: -1, y: 0 };
  }

  canAct() {
    return !this.isDead && this.stunnedTurns <= 0;
  }

  prepareSideTurn(game) {
    if (this.isDead) return;
    if (this.passiveHandlers.onSideTurnStart) {
      this.passiveHandlers.onSideTurnStart(this, game);
    }
  }

  beginTurn(game) {
    if (this.isDead) return;
    this.turnEnded = false;
    this.remainingSteps = Math.min(this.maxSteps, 3 + (game.sideRounds[this.side] - 1));
    this.remainingSteps += this.stepAdvantage;
    if (this.side === 'enemies' && game.sideRounds.enemies > game.sideRounds.allies) {
      this.remainingSteps += 1;
    }
    if (this.fearStacks > 0) {
      this.remainingSteps = Math.max(0, this.remainingSteps - this.fearStacks);
      this.fearStacks = 0;
    }
    if (this.stepBonusNext) {
      this.remainingSteps += this.stepBonusNext;
      this.stepBonusNext = 0;
      if (this.flags) {
        this.flags.futureStep = false;
      }
    }
    this.remainingSteps = Math.min(this.remainingSteps, this.maxSteps);
    if (this.passiveHandlers.onTurnStart) {
      this.passiveHandlers.onTurnStart(this, game);
    }
    this.applyRecurringEffects(game);
  }

  applyRecurringEffects(game) {
    this.applyRecovery(game);
    this.applyBleeds(game);
    this.applyHazBleeds(game);
  }

  applyRecovery(game) {
    if (this.recoveryStacks > 0) {
      this.heal(5, '恢复Buff');
      this.recoveryStacks = Math.max(0, this.recoveryStacks - 1);
      game.writeLog(`${this.name} 的“恢复”Buff 生效，回复 5 点 HP。`);
    }
  }

  applyBleeds(game) {
    if (!this.bleeds.length) return;
    const totalDamage = this.bleeds.reduce((acc, bleed) => acc + this.maxHp * bleed.percent, 0);
    this.takeDamage(totalDamage, { source: '流血' });
    this.bleeds = this.bleeds
      .map((bleed) => ({ ...bleed, turns: bleed.turns - 1 }))
      .filter((bleed) => bleed.turns > 0);
  }

  applyHazBleeds(game) {
    if (!this.hazBleeds.length) return;
    const total = this.hazBleeds.reduce((acc, entry) => acc + this.maxHp * entry.percent, 0);
    this.takeDamage(total, { source: 'Haz流血' });
    this.hazBleeds = this.hazBleeds
      .map((entry) => ({ ...entry, turns: entry.turns - 1 }))
      .filter((entry) => entry.turns > 0);
  }

  takeDamage(amount, context = {}) {
    if (this.isDead) return 0;
    context.attacker = context.attacker || this.game.activeUnit || null;
    const finalAmount = Math.max(0, amount * this.damageTakenMultiplier);
    this.hp = clamp(this.hp - finalAmount, 0, this.maxHp);
    if (this.passiveHandlers.onDamaged) {
      this.passiveHandlers.onDamaged(this, finalAmount, context);
    }
    if (this.hp <= 0 && !this.isDead) {
      this.isDead = true;
      this.game.writeLog(`${this.name} 阵亡。`);
      this.game.removeUnit(this);
    }
    return finalAmount;
  }

  heal(amount, source = '') {
    const before = this.hp;
    this.hp = clamp(this.hp + amount, 0, this.maxHp);
    return this.hp - before;
  }

  takeSpDamage(amount, context = {}) {
    if (this.isDead || amount <= 0) return 0;
    context.attacker = context.attacker || this.game.activeUnit || null;
    const finalAmount = amount * this.spDamageTakenMultiplier;
    this.sp = clamp(this.sp - finalAmount, 0, this.maxSp);
    if (this.passiveHandlers.onSpDamaged) {
      this.passiveHandlers.onSpDamaged(this, finalAmount, context);
    }
    if (this.sp <= 0) {
      this.onSpBreak(context);
    }
    return finalAmount;
  }

  onSpBreak(context = {}) {
    this.stunLayers += 1;
    this.fearStacks += 1;
    this.remainingSteps = Math.max(0, this.remainingSteps - 1);
    this.game.writeLog(`${this.name} 因 SP 耗尽进入混乱状态（眩晕层数 ${this.stunLayers}）。`);
    this.restoreSpAfterChaos();
    this.checkStunThreshold();
  }

  restoreSpAfterChaos() {
    const restored = Math.round(this.maxSp * this.spRecoveryRatio);
    this.sp = clamp(restored, 0, this.maxSp);
  }

  checkStunThreshold() {
    if (this.stunLayers >= this.stunThreshold) {
      this.stunLayers -= this.stunThreshold;
      this.stunnedTurns = 1;
      this.game.writeLog(`${this.name} 积累足够的眩晕层数，陷入 1 回合眩晕。`);
    }
  }

  consumeStunTurn(game) {
    if (this.stunnedTurns > 0) {
      this.stunnedTurns -= 1;
      this.game.writeLog(`${this.name} 无法行动（眩晕剩余 ${this.stunnedTurns}）。`);
    }
  }

  addBleed(stacks = 1, percent = 0.05, turns = 2) {
    for (let i = 0; i < stacks; i++) {
      this.bleeds.push({ percent, turns });
    }
  }

  addHazBleed(percent = 0.03, turns = 2) {
    this.hazBleeds.push({ percent, turns });
  }

  addFear(stacks = 1) {
    this.fearStacks += stacks;
  }

  addChickenBlood() {
    this.chickenBlood = 1;
  }

  addReliance() {
    this.reliance = 1;
  }

  addRecovery(stack = 1) {
    this.recoveryStacks += stack;
  }

  spendSteps(cost) {
    this.remainingSteps = Math.max(0, this.remainingSteps - cost);
    if (this.remainingSteps <= 0) {
      this.turnEnded = true;
    }
  }

  moveTowards(target, spend = true) {
    if (!target) return false;
    const neighbors = [
      { x: target.position.x + 1, y: target.position.y },
      { x: target.position.x - 1, y: target.position.y },
      { x: target.position.x, y: target.position.y + 1 },
      { x: target.position.x, y: target.position.y - 1 },
    ].filter((pos) => this.game.map.canMove(this, pos.x, pos.y));
    if (!neighbors.length) return false;
    const path = this.game.map.findPathToAny(this, neighbors);
    if (!path.length) return false;
    const next = path[0];
    this.game.map.moveUnit(this, next.x, next.y);
    if (spend) {
      this.spendSteps(1);
    }
    this.game.writeLog(`${this.name} 移动到 (${this.position.x}, ${this.position.y})。`);
    return true;
  }

  basicAttack(target, cost, options = {}) {
    if (!target) return '没有目标可以攻击。';
    const baseDamage = options.damage || 10;
    const spDamage = options.spDamage || 0;
    const consumeSteps = options.consumeSteps !== false;
    const actualCost = cost ?? options.cost ?? 1;
    let damage = baseDamage;
    if (this.chickenBlood) {
      damage *= 2;
      this.chickenBlood = 0;
    }
    if (this.reliance) {
      damage = baseDamage;
      this.reliance = 0;
      target.takeDamage(damage, { source: options.name || '依赖真实伤害', trueDamage: true, attacker: this });
      target.takeSpDamage(spDamage, { source: options.name || '依赖真实伤害', attacker: this });
      target.sp = 0;
      target.onSpBreak({ source: '依赖' });
    } else {
      target.takeDamage(damage, { source: options.name || this.name, attacker: this });
      if (spDamage) {
        target.takeSpDamage(spDamage, { source: options.name || this.name, attacker: this });
      }
    }
    if (consumeSteps) {
      this.spendSteps(actualCost);
    }
    return `${this.name} 对 ${target.name} 造成 ${damage.toFixed(1)} 点伤害。`;
  }

  getEnemies() {
    return this.game.units.filter((u) => u.side !== this.side && !u.isDead);
  }

  findNearestEnemy() {
    const enemies = this.getEnemies();
    if (enemies.length === 0) return null;
    let best = null;
    let bestDist = Infinity;
    enemies.forEach((enemy) => {
      const dist = Math.abs(enemy.position.x - this.position.x) + Math.abs(enemy.position.y - this.position.y);
      if (dist < bestDist) {
        best = enemy;
        bestDist = dist;
      }
    });
    return best;
  }

  takeAction(game) {
    if (this.passiveHandlers.takeAction) {
      return this.passiveHandlers.takeAction(this, game);
    }
    if (this.remainingSteps <= 0) {
      this.turnEnded = true;
      return `${this.name} 没有剩余步数。`;
    }
    const enemy = this.findNearestEnemy();
    if (!enemy) {
      this.turnEnded = true;
      return `${this.name} 找不到目标。`;
    }
    if (Math.abs(enemy.position.x - this.position.x) + Math.abs(enemy.position.y - this.position.y) > 1) {
      if (this.remainingSteps > 0) {
        const moved = this.moveTowards(enemy);
        if (moved) return null;
      }
    }
    return this.basicAttack(enemy, { cost: 1, damage: 10, spDamage: 5, name: '普通攻击' });
  }

  finishTurn(game) {
    if (this.passiveHandlers.onTurnEnd) {
      this.passiveHandlers.onTurnEnd(this, game);
    }
    this.turnEnded = true;
    this.comboCounter = 0;
  }

  onRoundStart(game) {
    if (this.passiveHandlers.onRoundStart) {
      this.passiveHandlers.onRoundStart(this, game);
    }
  }

  getBuffTags() {
    const tags = [];
    if (this.chickenBlood) tags.push('鸡血');
    if (this.reliance) tags.push('依赖');
    if (this.recoveryStacks) tags.push(`恢复×${this.recoveryStacks}`);
    if (this.bleeds.length) tags.push(`流血×${this.bleeds.length}`);
    if (this.hazBleeds.length) tags.push(`Haz流血×${this.hazBleeds.length}`);
    if (this.fearStacks) tags.push(`恐惧${this.fearStacks}`);
    if (this.stunLayers) tags.push(`眩晕层${this.stunLayers}`);
    if (this.flags.oppression) tags.push('队长的压迫');
    return tags;
  }
}
