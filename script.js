const WIDTH = 22;
const HEIGHT = 18;
const MAX_STEPS = 10;

const coverFull = [];
for (let x = 2; x <= 4; x++) {
  for (let y = 3; y <= 5; y++) {
    coverFull.push(`${x},${y}`);
  }
}

const coverRange = [];
for (let x = 2; x <= 5; x++) {
  for (let y = 12; y <= 14; y++) {
    coverRange.push(`${x},${y}`);
  }
}
for (let x = 10; x <= 12; x++) {
  for (let y = 11; y <= 13; y++) {
    coverRange.push(`${x},${y}`);
  }
}

const voidCells = new Set();
for (let x = 14; x < 22; x++) {
  for (let y = 0; y < 10; y++) {
    voidCells.add(`${x},${y}`);
  }
}

const DAMAGE_TYPES = {
  PHYSICAL: 'physical',
  TRUE: 'true'
};

const TEAMS = {
  PLAYER: 'player',
  ENEMY: 'enemy'
};

function distance(a, b) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function distanceLine(a, b) {
  if (a.x === b.x) return Math.abs(a.y - b.y);
  if (a.y === b.y) return Math.abs(a.x - b.x);
  return Infinity;
}

function chooseTargetClosest(unit, targets) {
  if (!targets || targets.length === 0) return null;
  return targets.reduce((best, cur) => {
    if (!best) return cur;
    const dCur = distance(unit.position, cur.position);
    const dBest = distance(unit.position, best.position);
    if (dCur < dBest) return cur;
    if (dCur === dBest && cur.hp < best.hp) return cur;
    return best;
  }, null);
}

function chooseLowestHp(targets) {
  if (!targets || targets.length === 0) return null;
  return targets.reduce((best, cur) => (cur.hp < best.hp ? cur : best));
}

function chooseHighestDamage(targets) {
  if (!targets || targets.length === 0) return null;
  return targets.reduce((best, cur) => ((cur.maxHp - cur.hp) > (best.maxHp - best.hp) ? cur : best));
}

function adjacentTo(targetPos, currentPos) {
  const options = [
    { x: targetPos.x + 1, y: targetPos.y },
    { x: targetPos.x - 1, y: targetPos.y },
    { x: targetPos.x, y: targetPos.y + 1 },
    { x: targetPos.x, y: targetPos.y - 1 }
  ];
  return options.find((pos) =>
    pos.x >= 0 &&
    pos.x < WIDTH &&
    pos.y >= 0 &&
    pos.y < HEIGHT &&
    !voidCells.has(`${pos.x},${pos.y}`) &&
    !coverFull.includes(`${pos.x},${pos.y}`)
  ) || currentPos;
}

function isBackstab(attacker, target) {
  return attacker.position.x > target.position.x;
}

function applyHazMark(game, haz, target) {
  haz.passiveFlags.huntTargets = haz.passiveFlags.huntTargets || new Set();
  haz.passiveFlags.huntTargets.add(target);
  target.passiveFlags = target.passiveFlags || {};
  target.passiveFlags.huntTarget = true;
  game.log(`${target.displayName} 被标记为猎杀目标，队员对其造成的伤害提高。`);
}

function applyHazHatred(game, source, target) {
  if (source.name !== 'Haz') return;
  if (Math.random() < 0.4) {
    target.reduceSp(5, game, '难以抑制的仇恨');
    target.status.fear += 1;
    game.log(`${target.displayName} 陷入恐惧，下一回合步数减少。`);
  }
}

class Unit {
  constructor(config) {
    Object.assign(this, config);
    this.maxHp = config.hp;
    this.maxSp = config.sp;
    this.reset();
  }

  reset() {
    this.hp = this.maxHp;
    this.sp = this.maxSp;
    this.position = { ...this.startPosition };
    this.turnSteps = 0;
    this.status = {
      bleed: [],
      hazBleed: [],
      fear: 0,
      chickenBlood: false,
      reliance: false,
      recovery: 0,
      stunStacks: 0,
      stunDebuff: 0,
      stunned: 0,
      stepBonusNext: 0,
      stepPenaltyNext: 0,
      paralysis: 0
    };
    this.consecutiveHits = 0;
    this.tookAction = false;
    this.hasCaptainOppression = false;
    this.passiveFlags = this.passiveFlags || {};
  }

  isAlive() {
    return this.hp > 0;
  }

  get displayName() {
    return this.alias || this.name;
  }

  applyRecovery(game) {
    if (this.status.recovery > 0) {
      const healValue = Math.round(this.maxHp * 0.05);
      this.heal(healValue, game, '恢复 Buff');
      this.status.recovery -= 1;
    }
  }

  startTurn(game) {
    if (!this.isAlive()) return;
    this.applyRecovery(game);
    let baseSteps = Math.min(MAX_STEPS, 3 + Math.max(0, game.round - 1));
    if (game.levelAdvantage[this.team]) baseSteps = Math.min(MAX_STEPS, baseSteps + 2);
    if (this.status.stepBonusNext > 0) {
      baseSteps = Math.min(MAX_STEPS, baseSteps + this.status.stepBonusNext);
      this.status.stepBonusNext = 0;
    }
    if (this.status.stepPenaltyNext > 0) {
      baseSteps = Math.max(0, baseSteps - this.status.stepPenaltyNext);
      this.status.stepPenaltyNext = 0;
    }
    if (this.status.paralysis > 0) {
      baseSteps = Math.max(0, baseSteps - 1);
      this.status.paralysis -= 1;
    }
    if (this.status.fear > 0) {
      baseSteps = Math.max(0, baseSteps - this.status.fear);
      this.status.fear = 0;
    }
    this.turnSteps = baseSteps;
    this.tookAction = false;

    if (this.status.stunned > 0) {
      this.status.stunned -= 1;
      game.log(`${this.displayName} 被眩晕，无法行动。`);
      this.turnSteps = 0;
      return;
    }

    if (this.team === TEAMS.ENEMY && game.round >= 20 && !this.hasCaptainOppression) {
      this.hasCaptainOppression = true;
      game.log(`${this.displayName} 受到“队长的压迫”影响，改用禁忌技能。`);
    }

    if (this.name === 'Adora' && this.sp <= 10) {
      this.passiveFlags.lowSpBoost = true;
    } else {
      this.passiveFlags.lowSpBoost = false;
    }

    if (this.name === 'Katz') {
      const hazAlive = game.units.some((u) => u.name === 'Haz' && u.isAlive());
      this.passiveFlags.damageBonus = hazAlive ? 0.2 : 0;
      if (hazAlive) this.restoreSp(5, game, '隐秘迷恋');
    }

    if (this.name === 'Neyla') {
      this.passiveFlags.turnCounter = (this.passiveFlags.turnCounter || 0) + 1;
      if (this.passiveFlags.turnCounter % 3 === 0) {
        this.restoreSp(10, game, '神速装填');
      }
      this.passiveFlags.aimBoost = true;
    }

    if (this.name === 'Kyn') {
      this.restoreSp(5, game, '迅捷如风');
    }

    if (this.name === 'Dario' && game.round % 5 === 0) {
      for (const ally of game.units.filter((u) => u.team === this.team && u.isAlive())) {
        ally.restoreSp(15, game, '士气鼓舞');
      }
    }

    if (this.name === 'Haz' && game.aliveUnits(TEAMS.ENEMY).length === 1) {
      this.passiveFlags.lastStand = true;
    }

    if (this.name === 'Haz' && this.hp <= this.maxHp * 0.5) {
      this.passiveFlags.damageBonus = Math.max(this.passiveFlags.damageBonus || 0, 0.3);
    }

    if (this.name === 'Haz' && game.round % 2 === 0) {
      this.restoreSp(10, game, '队员们听令');
      for (const ally of game.units.filter((u) => u.team === TEAMS.ENEMY && u !== this && u.isAlive())) {
        ally.restoreSp(5, game, '队员们听令');
      }
    }

    if (this.team === TEAMS.ENEMY && game.round <= 15) {
      this.passiveFlags.critBonus = true;
    } else {
      this.passiveFlags.critBonus = false;
    }
  }

  endTurn(game) {
    if (!this.isAlive()) return;
    if (!this.tookAction && this.name === 'Adora') {
      this.restoreSp(10, game, '冷静分析');
    }
    let totalBleed = 0;
    this.status.bleed = this.status.bleed
      .map((stack) => {
        totalBleed += stack.amount;
        return { ...stack, turns: stack.turns - 1 };
      })
      .filter((stack) => stack.turns > 0);
    if (totalBleed > 0) {
      this.receiveDamage(totalBleed, DAMAGE_TYPES.PHYSICAL, null, game, { label: '流血' });
    }
    let totalHazBleed = 0;
    this.status.hazBleed = this.status.hazBleed
      .map((stack) => {
        totalHazBleed += Math.round(this.maxHp * stack.amount);
        return { ...stack, turns: stack.turns - 1 };
      })
      .filter((stack) => stack.turns > 0);
    if (totalHazBleed > 0) {
      this.receiveDamage(totalHazBleed, DAMAGE_TYPES.PHYSICAL, null, game, { label: 'Haz流血' });
    }

    if (this.status.stunDebuff > 0) {
      this.status.stunDebuff -= 1;
      if (this.status.stunDebuff === 0) {
        const ratio = this.passiveFlags.spRecoveryRatio || 0.5;
        const recovered = Math.round(this.maxSp * ratio);
        this.restoreSp(recovered, game, '混乱恢复');
      }
    }

    if (this.name === 'Haz') {
      for (const ally of game.units.filter((u) => u.team === TEAMS.ENEMY && u !== this && u.isAlive())) {
        const dist = distance(this.position, ally.position);
        if (dist <= 3) {
          ally.restoreSp(5, game, '队长号令');
        }
      }
    }

    if (this.name === 'Kyn' && this.passiveFlags.pendingTeleport) {
      const haz = game.units.find((u) => u.name === 'Haz' && u.isAlive());
      if (haz) {
        this.position = adjacentTo(haz.position, this.position);
        game.log('Kyn 触发“打道回府”，回到 Haz 身边。');
      }
      this.passiveFlags.pendingTeleport = false;
    }
  }

  receiveDamage(amount, type, source, game, options = {}) {
    if (!this.isAlive()) return 0;
    let final = amount;
    if (type !== DAMAGE_TYPES.TRUE) {
      if (this.name === 'Karma') final = Math.round(final * 0.75);
      if (this.name === 'Tusk') final = Math.round(final * 0.7);
      if (this.passiveFlags.shielded) final = Math.round(final * 0.6);
      if (this.passiveFlags.lastStand) final = Math.round(final * 0.9);
      if (this.passiveFlags.damageReduction && this.passiveFlags.damageReduction !== 1) {
        final = Math.round(final * this.passiveFlags.damageReduction);
      }
    }
    if (source && source.passiveFlags && source.passiveFlags.damageBonus) {
      final = Math.round(final * (1 + source.passiveFlags.damageBonus));
    }
    if (source && source.team === TEAMS.ENEMY && this.passiveFlags && this.passiveFlags.huntTarget) {
      final = Math.round(final * 1.15);
    }
    if (source && source.passiveFlags && source.passiveFlags.critBonus && Math.random() < 0.3) {
      final = Math.round(final * 1.5);
      game.log('暴击！');
    }
    if (source && source.status && source.status.chickenBlood) {
      final *= 2;
      source.status.chickenBlood = false;
    }
    if (this.team === TEAMS.ENEMY && game.debuffs.campaignAftermath) {
      final = Math.round(final * 0.75);
    }
    if (final < 0) final = 0;
    this.hp -= final;
    if (this.hp < 0) this.hp = 0;
    if (options.label) {
      game.log(`${this.displayName} 受到 ${options.label} ${final} 点伤害。`);
    }
    if (this.hp === 0) {
      game.log(`${this.displayName} 被击倒。`);
      if (source && source.name === 'Kyn') {
        source.passiveFlags.pendingTeleport = true;
      }
    }
    return final;
  }

  heal(amount, game, label) {
    const before = this.hp;
    this.hp = Math.min(this.maxHp, this.hp + amount);
    if (label) {
      game.log(`${this.displayName} ${label} 回复 ${this.hp - before} HP。`);
    }
  }

  restoreSp(amount, game, label) {
    const before = this.sp;
    this.sp = Math.min(this.maxSp, this.sp + amount);
    if (label) {
      game.log(`${this.displayName} ${label} 回复 ${this.sp - before} SP。`);
    }
  }

  reduceSp(amount, game, label) {
    const before = this.sp;
    this.sp = Math.max(0, this.sp - amount);
    if (label) {
      game.log(`${this.displayName} ${label} 减少 ${before - this.sp} SP。`);
    }
    if (this.sp === 0 && this.status.stunDebuff === 0) {
      this.status.stunDebuff = 1;
      this.status.stunned = Math.max(this.status.stunned, 1);
      this.status.stepPenaltyNext += 1;
      game.log(`${this.displayName} SP 归零，陷入混乱。`);
    }
  }

  addBleed(stacks, turns, game) {
    for (let i = 0; i < stacks; i++) {
      this.status.bleed.push({ amount: Math.round(this.maxHp * 0.05), turns });
    }
    game.log(`${this.displayName} 获得流血 ×${stacks}。`);
  }

  addHazBleed(game) {
    this.status.hazBleed.push({ amount: 0.03, turns: 2 });
    game.log(`${this.displayName} 获得 Haz 流血。`);
  }
}

class Game {
  constructor() {
    this.units = [];
    this.boardElement = document.getElementById('board');
    this.logElement = document.getElementById('log');
    this.playerStatusEl = document.getElementById('playerStatus');
    this.enemyStatusEl = document.getElementById('enemyStatus');
    this.autoTimer = null;
    this.round = 1;
    this.turnIndex = 0;
    this.currentUnit = null;
    this.levelAdvantage = {
      [TEAMS.PLAYER]: false,
      [TEAMS.ENEMY]: false
    };
    this.debuffs = {
      campaignAftermath: true
    };
    this.initBoard();
    this.setupUnits();
    this.bindUI();
    this.render();
    this.log('战斗准备完成，点击“开始模拟”。');
  }

  initBoard() {
    this.boardElement.innerHTML = '';
    for (let y = HEIGHT - 1; y >= 0; y--) {
      for (let x = 0; x < WIDTH; x++) {
        const cell = document.createElement('div');
        cell.className = 'cell';
        if (voidCells.has(`${x},${y}`)) cell.classList.add('void');
        if (coverFull.includes(`${x},${y}`)) cell.classList.add('cover');
        else if (coverRange.includes(`${x},${y}`)) cell.classList.add('cover-range');
        cell.dataset.x = x;
        cell.dataset.y = y;
        this.boardElement.appendChild(cell);
      }
    }
  }

  setupUnits() {
    this.units = [
      new Unit({
        name: 'Adora',
        team: TEAMS.PLAYER,
        hp: 100,
        sp: 100,
        level: 20,
        startPosition: { x: 1, y: 2 },
        hasPistol: true,
        passiveFlags: {
          spRecoveryRatio: 0.5
        }
      }),
      new Unit({
        name: 'Karma',
        team: TEAMS.PLAYER,
        hp: 200,
        sp: 50,
        level: 20,
        startPosition: { x: 3, y: 2 },
        hasPistol: true,
        passiveFlags: {
          spRecoveryRatio: 0.5
        }
      }),
      new Unit({
        name: 'Dario',
        team: TEAMS.PLAYER,
        hp: 150,
        sp: 100,
        level: 20,
        startPosition: { x: 5, y: 2 },
        hasPistol: true,
        passiveFlags: {
          spRecoveryRatio: 0.75
        }
      }),
      new Unit({
        name: 'Haz',
        team: TEAMS.ENEMY,
        hp: 750,
        sp: 100,
        level: 55,
        startPosition: { x: 20, y: 14 },
        passiveFlags: {
          damageReduction: 1,
          spRecoveryRatio: 1
        }
      }),
      new Unit({
        name: 'Katz',
        team: TEAMS.ENEMY,
        hp: 500,
        sp: 75,
        level: 53,
        startPosition: { x: 18, y: 15 },
        passiveFlags: {
          damageReduction: 1
        }
      }),
      new Unit({
        name: 'Tusk',
        team: TEAMS.ENEMY,
        hp: 1000,
        sp: 60,
        level: 54,
        startPosition: { x: 18, y: 12 },
        passiveFlags: {
          damageReduction: 0.7
        }
      }),
      new Unit({
        name: 'Neyla',
        team: TEAMS.ENEMY,
        hp: 350,
        sp: 80,
        level: 52,
        startPosition: { x: 14, y: 16 },
        passiveFlags: {
          damageReduction: 1
        }
      }),
      new Unit({
        name: 'Kyn',
        team: TEAMS.ENEMY,
        hp: 250,
        sp: 70,
        level: 51,
        startPosition: { x: 14, y: 11 },
        passiveFlags: {
          damageReduction: 1
        }
      })
    ];

    for (const unit of this.units) {
      unit.reset();
      if (unit.team === TEAMS.ENEMY) {
        unit.hp = Math.round(unit.hp * 0.75);
        unit.maxHp = unit.hp;
        unit.passiveFlags.damagePenalty = 5;
      }
    }

    this.calculateLevelAdvantage();
  }

  calculateLevelAdvantage() {
    const playerUnits = this.units.filter((u) => u.team === TEAMS.PLAYER);
    const enemyUnits = this.units.filter((u) => u.team === TEAMS.ENEMY);
    const playerAvg = playerUnits.reduce((sum, u) => sum + u.level, 0) / playerUnits.length;
    const enemyAvg = enemyUnits.reduce((sum, u) => sum + u.level, 0) / enemyUnits.length;
    if (playerAvg > enemyAvg) this.levelAdvantage[TEAMS.PLAYER] = true;
    else if (enemyAvg > playerAvg) this.levelAdvantage[TEAMS.ENEMY] = true;
  }

  bindUI() {
    document.getElementById('startBtn').addEventListener('click', () => this.start());
    document.getElementById('nextBtn').addEventListener('click', () => this.nextAction());
    document.getElementById('resetBtn').addEventListener('click', () => this.reset());
    document.getElementById('autoBtn').addEventListener('click', () => this.toggleAuto());
  }

  start() {
    this.reset(false);
    this.log('战斗开始！');
    const order = this.turnOrder();
    this.currentUnit = order[0];
    this.currentUnit.startTurn(this);
    this.render();
  }

  reset(logMessage = true) {
    if (this.autoTimer) {
      clearInterval(this.autoTimer);
      this.autoTimer = null;
      document.getElementById('autoBtn').textContent = '自动播放';
    }
    this.round = 1;
    this.turnIndex = 0;
    this.currentUnit = null;
    this.debuffs.campaignAftermath = true;
    for (const unit of this.units) unit.reset();
    for (const unit of this.units) {
      if (unit.team === TEAMS.ENEMY) {
        unit.hp = Math.round(unit.maxHp * 0.75);
      }
    }
    this.render();
    if (logMessage) {
      this.logElement.innerHTML = '';
      this.log('战斗准备完成，点击“开始模拟”。');
    }
  }

  toggleAuto() {
    if (this.autoTimer) {
      clearInterval(this.autoTimer);
      this.autoTimer = null;
      document.getElementById('autoBtn').textContent = '自动播放';
      return;
    }
    const delay = parseInt(document.getElementById('delayInput').value, 10) || 800;
    this.autoTimer = setInterval(() => {
      const cont = this.nextAction();
      if (!cont) {
        clearInterval(this.autoTimer);
        this.autoTimer = null;
        document.getElementById('autoBtn').textContent = '自动播放';
      }
    }, delay);
    document.getElementById('autoBtn').textContent = '停止自动';
  }

  log(message) {
    const entry = document.createElement('div');
    entry.className = 'log-entry';
    entry.textContent = `[第${this.round}回合] ${message}`;
    this.logElement.appendChild(entry);
    this.logElement.scrollTop = this.logElement.scrollHeight;
  }

  render() {
    const cells = this.boardElement.children;
    for (const cell of cells) {
      cell.classList.remove('player', 'enemy');
      cell.innerHTML = '';
    }
    for (const unit of this.units) {
      if (!unit.isAlive()) continue;
      const index = (HEIGHT - 1 - unit.position.y) * WIDTH + unit.position.x;
      const cell = cells[index];
      if (!cell) continue;
      cell.classList.add(unit.team === TEAMS.PLAYER ? 'player' : 'enemy');
      const label = document.createElement('span');
      label.className = 'label';
      label.textContent = unit.name[0];
      cell.appendChild(label);
    }
    this.renderStatus();
  }

  renderStatus() {
    this.playerStatusEl.innerHTML = '<h2>我方单位</h2>';
    this.enemyStatusEl.innerHTML = '<h2>七海作战队</h2>';
    for (const unit of this.units.filter((u) => u.team === TEAMS.PLAYER)) {
      this.playerStatusEl.appendChild(this.createUnitCard(unit));
    }
    for (const unit of this.units.filter((u) => u.team === TEAMS.ENEMY)) {
      this.enemyStatusEl.appendChild(this.createUnitCard(unit, true));
    }
  }

  createUnitCard(unit, enemy = false) {
    const card = document.createElement('div');
    card.className = 'unit-card' + (enemy ? ' enemy' : '');
    const hpPercent = Math.round((unit.hp / unit.maxHp) * 100);
    const spPercent = Math.round((unit.sp / unit.maxSp) * 100);
    card.innerHTML = `
      <div class="title">${unit.displayName} Lv.${unit.level} ${unit.isAlive() ? '' : '(阵亡)'}</div>
      <div class="bar"><div class="bar-inner" style="width:${hpPercent}%"></div></div>
      <div class="bar"><div class="bar-inner sp" style="width:${spPercent}%"></div></div>
      <div class="stats">HP: ${unit.hp}/${unit.maxHp} | SP: ${unit.sp}/${unit.maxSp} | 步数: ${unit.turnSteps}</div>
      <div class="buff-list">${this.describeStatus(unit)}</div>
    `;
    return card;
  }

  describeStatus(unit) {
    const list = [];
    if (unit.status.bleed.length > 0) list.push(`流血×${unit.status.bleed.length}`);
    if (unit.status.hazBleed.length > 0) list.push(`Haz流血×${unit.status.hazBleed.length}`);
    if (unit.status.fear > 0) list.push(`恐惧-${unit.status.fear}`);
    if (unit.status.chickenBlood) list.push('鸡血');
    if (unit.status.reliance) list.push('依赖');
    if (unit.status.recovery > 0) list.push(`恢复×${unit.status.recovery}`);
    if (unit.status.stunned > 0) list.push(`眩晕${unit.status.stunned}`);
    if (unit.status.paralysis > 0) list.push(`麻痹-${unit.status.paralysis}`);
    if (unit.hasCaptainOppression) list.push('队长的压迫');
    if (unit.passiveFlags.huntTarget) list.push('猎杀标记');
    return list.length > 0 ? `状态：${list.join('，')}` : '状态：正常';
  }

  turnOrder() {
    const alive = this.units.filter((u) => u.isAlive());
    const players = alive.filter((u) => u.team === TEAMS.PLAYER);
    const enemies = alive.filter((u) => u.team === TEAMS.ENEMY);
    return [...players, ...enemies];
  }

  aliveUnits(team) {
    return this.units.filter((u) => u.team === team && u.isAlive());
  }

  nextAction() {
    if (this.checkVictory()) return false;
    if (!this.currentUnit) {
      const order = this.turnOrder();
      if (order.length === 0) return false;
      this.currentUnit = order[0];
      this.currentUnit.startTurn(this);
      this.render();
      return true;
    }
    if (!this.currentUnit.isAlive() || this.currentUnit.turnSteps <= 0) {
      this.currentUnit.endTurn(this);
      this.toNextUnit();
      return true;
    }
    const action = this.chooseAction(this.currentUnit);
    if (!action) {
      this.log(`${this.currentUnit.displayName} 无动作可执行，结束回合。`);
      this.currentUnit.turnSteps = 0;
      return true;
    }
    this.executeAction(this.currentUnit, action);
    this.render();
    return !this.checkVictory();
  }

  toNextUnit() {
    const order = this.turnOrder();
    if (order.length === 0) return;
    const currentIndex = order.indexOf(this.currentUnit);
    let nextIndex = currentIndex + 1;
    if (nextIndex >= order.length) {
      nextIndex = 0;
      this.round += 1;
      this.log('新回合开始。');
    }
    this.currentUnit = order[nextIndex];
    this.currentUnit.startTurn(this);
    this.render();
  }

  chooseAction(unit) {
    const enemies = this.aliveUnits(unit.team === TEAMS.PLAYER ? TEAMS.ENEMY : TEAMS.PLAYER);
    if (enemies.length === 0) return null;
    const skills = this.availableSkills(unit, enemies);
    if (skills.length === 0) {
      const move = this.findMoveTarget(unit, enemies);
      if (move) return { type: 'move', target: move };
      return null;
    }
    const total = skills.reduce((sum, skill) => sum + skill.probability, 0);
    let roll = Math.random() * total;
    for (const skill of skills) {
      roll -= skill.probability;
      if (roll <= 0) return { type: 'skill', skill };
    }
    return { type: 'skill', skill: skills[skills.length - 1] };
  }

  availableSkills(unit, enemies) {
    const pool = SKILL_LIBRARY[unit.name] || [];
    const list = [];
    for (const skill of pool) {
      if (unit.level < skill.minLevel) continue;
      if (skill.requiresOppression && !unit.hasCaptainOppression) continue;
      if (skill.excludeAfterOppression && unit.hasCaptainOppression) continue;
      if (skill.requiresPistol && !unit.hasPistol) continue;
      if (skill.oncePerPool && unit.passiveFlags[`used_${skill.name}`]) continue;
      if (skill.condition && !skill.condition(unit, this)) continue;
      if (skill.cost > unit.turnSteps) continue;
      const targets = skill.targets ? skill.targets(unit, enemies, this) : [true];
      if (!targets || targets.length === 0) continue;
      list.push({ ...skill, cachedTargets: targets });
    }
    return list;
  }

  executeAction(unit, action) {
    if (action.type === 'move') {
      unit.turnSteps -= 1;
      unit.position = action.target;
      unit.tookAction = true;
      if (unit.name === 'Neyla') {
        unit.passiveFlags.aimBoost = false;
      }
      this.log(`${unit.displayName} 移动到 (${unit.position.x}, ${unit.position.y})。`);
      return;
    }
    if (action.type === 'skill') {
      const skill = action.skill;
      unit.turnSteps -= skill.cost;
      unit.tookAction = true;
      const targets = skill.cachedTargets || (skill.targets ? skill.targets(unit, this.aliveUnits(unit.team === TEAMS.PLAYER ? TEAMS.ENEMY : TEAMS.PLAYER), this) : []);
      this.log(`${unit.displayName} 使用技能「${skill.name}」。`);
      skill.execute(this, unit, targets);
      if (skill.oncePerPool) unit.passiveFlags[`used_${skill.name}`] = true;
    }
  }

  findMoveTarget(unit, enemies) {
    const dirs = [
      { x: 1, y: 0 },
      { x: -1, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: -1 }
    ];
    let best = null;
    let bestDist = Infinity;
    for (const dir of dirs) {
      const nx = unit.position.x + dir.x;
      const ny = unit.position.y + dir.y;
      if (nx < 0 || nx >= WIDTH || ny < 0 || ny >= HEIGHT) continue;
      if (voidCells.has(`${nx},${ny}`)) continue;
      if (coverFull.includes(`${nx},${ny}`)) continue;
      if (this.units.some((u) => u.isAlive() && u.position.x === nx && u.position.y === ny)) continue;
      const dist = enemies.reduce((sum, enemy) => sum + distance({ x: nx, y: ny }, enemy.position), 0);
      if (dist < bestDist) {
        bestDist = dist;
        best = { x: nx, y: ny };
      }
    }
    return best;
  }

  checkVictory() {
    const playersAlive = this.aliveUnits(TEAMS.PLAYER).length;
    const enemiesAlive = this.aliveUnits(TEAMS.ENEMY).length;
    if (playersAlive === 0 || enemiesAlive === 0) {
      this.log(playersAlive > 0 ? '战斗胜利！' : '七海作战队取得胜利。');
      if (this.autoTimer) {
        clearInterval(this.autoTimer);
        this.autoTimer = null;
        document.getElementById('autoBtn').textContent = '自动播放';
      }
      return true;
    }
    return false;
  }
}

const SKILL_LIBRARY = {
  Adora: [
    {
      name: '短匕轻挥！',
      minLevel: 20,
      cost: 1,
      probability: 0.8,
      targets: (unit, enemies) => enemies.filter((e) => distance(unit.position, e.position) === 1),
      execute: (game, unit, targets) => {
        const target = chooseTargetClosest(unit, targets);
        if (!target) return;
        let damage = 10;
        if (unit.passiveFlags.lowSpBoost) damage = Math.round(damage * 1.5);
        if (unit.status.chickenBlood) {
          damage *= 2;
          unit.status.chickenBlood = false;
        }
        if (isBackstab(unit, target)) {
          damage = Math.round(damage * 1.5);
        }
        if (unit.status.reliance) {
          target.receiveDamage(damage, DAMAGE_TYPES.TRUE, unit, game, { label: '依赖打击' });
          target.reduceSp(target.sp, game, '依赖打击');
          unit.status.reliance = false;
          unit.sp = 0;
        } else {
          target.receiveDamage(damage, DAMAGE_TYPES.PHYSICAL, unit, game, { label: '短匕轻挥' });
          target.reduceSp(5, game, '短匕轻挥');
        }
      }
    },
    {
      name: '枪击',
      minLevel: 20,
      cost: 1,
      probability: 0.65,
      requiresPistol: true,
      targets: (unit, enemies) => enemies.filter((e) => e.position.x === unit.position.x || e.position.y === unit.position.y),
      execute: (game, unit, targets) => {
        for (const target of targets) {
          target.receiveDamage(10, DAMAGE_TYPES.PHYSICAL, unit, game, { label: '枪击' });
          target.reduceSp(5, game, '枪击');
        }
      }
    },
    {
      name: '呀！你不要靠近我呀！！',
      minLevel: 20,
      cost: 2,
      probability: 0.4,
      targets: (unit, enemies) => enemies.filter((e) => distance(unit.position, e.position) <= 2),
      execute: (game, unit, targets) => {
        const target = chooseTargetClosest(unit, targets);
        if (!target) return;
        target.receiveDamage(12, DAMAGE_TYPES.PHYSICAL, unit, game, { label: '防御反击' });
        if (target.hp / target.maxHp <= 0.5) {
          const basic = SKILL_LIBRARY.Adora[0];
          basic.execute(game, unit, [target]);
        }
      }
    },
    {
      name: '自制粉色迷你电击装置！',
      minLevel: 20,
      cost: 3,
      probability: 0.3,
      targets: (unit, enemies) => enemies.filter((e) => distance(unit.position, e.position) <= 2),
      execute: (game, unit, targets) => {
        const target = chooseTargetClosest(unit, targets);
        if (!target) return;
        target.receiveDamage(10, DAMAGE_TYPES.PHYSICAL, unit, game, { label: '电击装置' });
        target.reduceSp(15, game, '电击装置');
        target.status.paralysis += 1;
      }
    },
    {
      name: '略懂的医术！',
      minLevel: 25,
      cost: 2,
      probability: 0.3,
      targets: (unit, enemies, game) => game.units.filter((u) => u.team === unit.team && u.isAlive() && distance(unit.position, u.position) <= 2),
      execute: (game, unit, targets) => {
        const target = chooseLowestHp(targets);
        if (!target) return;
        target.heal(20, game, '略懂的医术');
        target.restoreSp(15, game, '略懂的医术');
        target.status.recovery += 1;
      }
    },
    {
      name: '加油哇！',
      minLevel: 25,
      cost: 4,
      probability: 0.2,
      targets: (unit, enemies, game) => game.units.filter((u) => u.team === unit.team && u.isAlive() && distance(unit.position, u.position) <= 2 && !u.status.chickenBlood),
      execute: (game, unit, targets) => {
        const target = chooseLowestHp(targets) || unit;
        target.status.chickenBlood = true;
        game.log(`${target.displayName} 获得鸡血效果。`);
      }
    },
    {
      name: '只能靠你了。。',
      minLevel: 35,
      cost: 4,
      probability: 0.15,
      targets: (unit, enemies, game) => game.units.filter((u) => u.team === unit.team && u !== unit && u.isAlive() && distance(unit.position, u.position) <= 2 && !u.status.reliance),
      execute: (game, unit, targets) => {
        const target = chooseLowestHp(targets);
        if (!target) return;
        unit.receiveDamage(25, DAMAGE_TYPES.TRUE, unit, game, { label: '牺牲' });
        target.status.reliance = true;
        game.log(`${target.displayName} 获得依赖效果。`);
      }
    }
  ],
  Karma: [
    {
      name: '沙包大的拳头',
      minLevel: 20,
      cost: 1,
      probability: 0.8,
      targets: (unit, enemies) => enemies.filter((e) => distance(unit.position, e.position) === 1),
      execute: (game, unit, targets) => {
        const target = chooseTargetClosest(unit, targets);
        if (!target) return;
        let damage = 15 + (unit.passiveFlags.stackDamage || 0);
        if (unit.consecutiveHits > 0) damage = Math.round(damage * 1.5);
        target.receiveDamage(damage, DAMAGE_TYPES.PHYSICAL, unit, game, { label: '沙包大的拳头' });
        unit.consecutiveHits += 1;
        unit.passiveFlags.stackDamage = (unit.passiveFlags.stackDamage || 0) + 5;
        if (unit.consecutiveHits >= 3) {
          SKILL_LIBRARY.Karma[0].execute(game, unit, [target]);
        }
      }
    },
    {
      name: '枪击',
      minLevel: 20,
      cost: 1,
      probability: 0.65,
      requiresPistol: true,
      targets: (unit, enemies) => enemies,
      execute: (game, unit, targets) => {
        for (const target of targets) {
          target.receiveDamage(10, DAMAGE_TYPES.PHYSICAL, unit, game, { label: '枪击' });
          target.reduceSp(5, game, '枪击');
        }
      }
    },
    {
      name: '都听你的',
      minLevel: 20,
      cost: 2,
      probability: 0.4,
      targets: () => [true],
      execute: (game, unit) => {
        unit.restoreSp(5, game, '都听你的');
        unit.turnSteps = Math.min(MAX_STEPS, unit.turnSteps + 3);
      }
    },
    {
      name: '嗜血之握',
      minLevel: 20,
      cost: 3,
      probability: 0.3,
      condition: (unit) => unit.consecutiveHits >= 4,
      targets: (unit, enemies) => enemies.filter((e) => distance(unit.position, e.position) <= 2),
      execute: (game, unit, targets) => {
        const target = chooseTargetClosest(unit, targets);
        if (!target) return;
        const damage = target.name === 'Haz' ? 75 : target.name === 'Tusk' ? 80 : 100;
        target.receiveDamage(damage, DAMAGE_TYPES.PHYSICAL, unit, game, { label: '嗜血之握' });
        unit.consecutiveHits = 0;
      }
    },
    {
      name: '深呼吸',
      minLevel: 25,
      cost: 2,
      probability: 0.2,
      oncePerPool: true,
      targets: () => [true],
      execute: (game, unit) => {
        unit.sp = unit.maxSp;
        unit.heal(10, game, '深呼吸');
        unit.passiveFlags.stackDamage = (unit.passiveFlags.stackDamage || 0) + 10;
      }
    }
  ],
  Dario: [
    {
      name: '机械爪击',
      minLevel: 20,
      cost: 1,
      probability: 0.8,
      targets: (unit, enemies) => enemies.filter((e) => distanceLine(unit.position, e.position) <= 2),
      execute: (game, unit, targets) => {
        const target = chooseTargetClosest(unit, targets);
        if (!target) return;
        target.receiveDamage(15, DAMAGE_TYPES.PHYSICAL, unit, game, { label: '机械爪击' });
        if (Math.random() < 0.15) {
          target.status.stunned = Math.max(target.status.stunned, 1);
          game.log(`${target.displayName} 被击晕！`);
        }
      }
    },
    {
      name: '枪击',
      minLevel: 20,
      cost: 1,
      probability: 0.65,
      requiresPistol: true,
      targets: (unit, enemies) => enemies,
      execute: (game, unit, targets) => {
        for (const target of targets) {
          target.receiveDamage(10, DAMAGE_TYPES.PHYSICAL, unit, game, { label: '枪击' });
          target.reduceSp(5, game, '枪击');
        }
      }
    },
    {
      name: '迅捷步伐',
      minLevel: 20,
      cost: 2,
      probability: 0.4,
      targets: () => [true],
      execute: (game, unit) => {
        unit.turnSteps = Math.min(MAX_STEPS, unit.turnSteps + 4);
        const enemy = chooseTargetClosest(unit, game.aliveUnits(TEAMS.ENEMY));
        if (enemy) enemy.reduceSp(5, game, '迅捷步伐');
      }
    },
    {
      name: '拿来吧你！',
      minLevel: 20,
      cost: 3,
      probability: 0.3,
      targets: (unit, enemies) => enemies.filter((e) => e.position.x === unit.position.x || e.position.y === unit.position.y),
      execute: (game, unit, targets) => {
        const target = chooseTargetClosest(unit, targets);
        if (!target) return;
        target.receiveDamage(20, DAMAGE_TYPES.PHYSICAL, unit, game, { label: '拿来吧你' });
        target.status.stunned = Math.max(target.status.stunned, 1);
        target.reduceSp(15, game, '拿来吧你');
      }
    },
    {
      name: '先苦后甜',
      minLevel: 25,
      cost: 4,
      probability: 0.15,
      oncePerPool: true,
      targets: () => [true],
      execute: (game, unit) => {
        unit.status.stepBonusNext += 4;
        game.log('Dario 的先苦后甜让下一回合步数增加。');
      }
    }
  ]
};

SKILL_LIBRARY.Haz = [
  {
    name: '鱼叉穿刺',
    minLevel: 20,
    cost: 1,
    probability: 0.7,
    targets: (unit, enemies) => enemies.filter((e) => distance(unit.position, e.position) === 1),
    execute: (game, unit, targets) => {
      const target = chooseTargetClosest(unit, targets);
      if (!target) return;
      target.receiveDamage(20, DAMAGE_TYPES.PHYSICAL, unit, game, { label: '鱼叉穿刺' });
      unit.restoreSp(10, game, '鱼叉穿刺');
      applyHazMark(game, unit, target);
      applyHazHatred(game, unit, target);
    }
  },
  {
    name: '深海猎杀',
    minLevel: 20,
    cost: 2,
    probability: 0.6,
    targets: (unit, enemies) => enemies.filter((e) => distance(unit.position, e.position) <= 3),
    execute: (game, unit, targets) => {
      const target = chooseTargetClosest(unit, targets);
      if (!target) return;
      target.receiveDamage(25, DAMAGE_TYPES.PHYSICAL, unit, game, { label: '深海猎杀' });
      target.reduceSp(10, game, '深海猎杀');
      target.position = adjacentTo(unit.position, target.position);
      applyHazMark(game, unit, target);
      applyHazHatred(game, unit, target);
    }
  },
  {
    name: '猎神之叉',
    minLevel: 20,
    cost: 2,
    probability: 0.65,
    targets: (unit, enemies) => enemies.filter((e) => distance(unit.position, e.position) <= 5),
    execute: (game, unit, targets) => {
      const target = chooseTargetClosest(unit, targets);
      if (!target) return;
      unit.position = adjacentTo(target.position, unit.position);
      let damage = 20;
      if (Math.random() < 0.5) damage *= 2;
      target.receiveDamage(damage, DAMAGE_TYPES.PHYSICAL, unit, game, { label: '猎神之叉' });
      target.reduceSp(15, game, '猎神之叉');
      target.addBleed(1, 2, game);
      applyHazMark(game, unit, target);
      applyHazHatred(game, unit, target);
    }
  },
  {
    name: '锁链缠绕',
    minLevel: 20,
    cost: 2,
    probability: 0.5,
    targets: () => [true],
    execute: (game, unit) => {
      unit.passiveFlags.shielded = true;
      unit.passiveFlags.damageReduction = 0.6;
      const foes = game.aliveUnits(TEAMS.PLAYER);
      if (foes.length > 0) foes[0].reduceSp(10, game, '锁链缠绕');
      for (const ally of game.aliveUnits(TEAMS.ENEMY)) {
        ally.restoreSp(5, game, '锁链缠绕支援');
      }
    }
  },
  {
    name: '鲸落',
    minLevel: 20,
    cost: 4,
    probability: 0.3,
    targets: (unit, enemies) => enemies.filter((e) => distance(unit.position, e.position) <= 2),
    execute: (game, unit, targets) => {
      for (const target of targets) {
        target.receiveDamage(50, DAMAGE_TYPES.PHYSICAL, unit, game, { label: '鲸落' });
        target.reduceSp(20, game, '鲸落');
        target.status.stepPenaltyNext += 1;
        applyHazHatred(game, unit, target);
      }
    }
  },
  {
    name: '怨念滋生',
    minLevel: 20,
    cost: 1,
    probability: 0.33,
    requiresOppression: true,
    targets: (unit, enemies) => enemies.filter((e) => unit.passiveFlags.huntTargets && unit.passiveFlags.huntTargets.has(e)),
    execute: (game, unit, targets) => {
      for (const target of targets) {
        target.addBleed(1, 2, game);
        target.status.fear += 1;
      }
    }
  },
  {
    name: '付出代价',
    minLevel: 20,
    cost: 2,
    probability: 0.33,
    requiresOppression: true,
    targets: (unit, enemies) => enemies.filter((e) => distance(unit.position, e.position) <= 4),
    execute: (game, unit, targets) => {
      const target = chooseTargetClosest(unit, targets);
      if (!target) return;
      target.receiveDamage(15, DAMAGE_TYPES.PHYSICAL, unit, game, { label: '付出代价·一段' });
      target.receiveDamage(15, DAMAGE_TYPES.PHYSICAL, unit, game, { label: '付出代价·二段' });
      target.reduceSp(5, game, '付出代价');
      target.addHazBleed(game);
      applyHazHatred(game, unit, target);
    }
  },
  {
    name: '仇恨之叉',
    minLevel: 20,
    cost: 2,
    probability: 0.33,
    requiresOppression: true,
    targets: (unit, enemies) => enemies.filter((e) => distance(unit.position, e.position) <= 2),
    execute: (game, unit, targets) => {
      for (const target of targets) {
        target.receiveDamage(15, DAMAGE_TYPES.PHYSICAL, unit, game, { label: '仇恨之叉' });
        target.reduceSp(10, game, '仇恨之叉');
        target.addHazBleed(game);
        applyHazHatred(game, unit, target);
      }
    }
  }
];

SKILL_LIBRARY.Katz = [
  {
    name: '矛刺',
    minLevel: 20,
    cost: 1,
    probability: 0.7,
    excludeAfterOppression: true,
    targets: (unit, enemies) => enemies.filter((e) => distance(unit.position, e.position) === 1),
    execute: (game, unit, targets) => {
      const target = chooseTargetClosest(unit, targets);
      if (!target) return;
      target.receiveDamage(20, DAMAGE_TYPES.PHYSICAL, unit, game, { label: '矛刺' });
      unit.restoreSp(5, game, '矛刺');
    }
  },
  {
    name: '链式鞭击',
    minLevel: 20,
    cost: 2,
    probability: 0.6,
    excludeAfterOppression: true,
    targets: (unit, enemies) => enemies.filter((e) => distance(unit.position, e.position) <= 3),
    execute: (game, unit, targets) => {
      const target = chooseTargetClosest(unit, targets);
      if (!target) return;
      target.receiveDamage(25, DAMAGE_TYPES.PHYSICAL, unit, game, { label: '链式鞭击' });
      target.status.stepPenaltyNext += 1;
    }
  },
  {
    name: '反复鞭尸',
    minLevel: 20,
    cost: 3,
    probability: 0.5,
    excludeAfterOppression: true,
    targets: (unit, enemies) => enemies.filter((e) => distance(unit.position, e.position) <= 3),
    execute: (game, unit, targets) => {
      const target = chooseTargetClosest(unit, targets);
      if (!target) return;
      const repeats = Math.min(5, Math.floor(unit.sp / 10));
      for (let i = 0; i < repeats; i++) {
        target.receiveDamage(10 + i * 5, DAMAGE_TYPES.PHYSICAL, unit, game, { label: '反复鞭尸' });
      }
      unit.restoreSp(5, game, '反复鞭尸');
    }
  },
  {
    name: '终焉礼炮',
    minLevel: 20,
    cost: 4,
    probability: 0.3,
    excludeAfterOppression: true,
    targets: (unit, enemies) => enemies.filter((e) => distance(unit.position, e.position) <= 3),
    execute: (game, unit, targets) => {
      for (const target of targets) {
        target.receiveDamage(60, DAMAGE_TYPES.PHYSICAL, unit, game, { label: '终焉礼炮' });
        target.reduceSp(15, game, '终焉礼炮');
      }
      unit.status.stepPenaltyNext += 1;
    }
  },
  {
    name: '必须抹杀一切。。。',
    minLevel: 20,
    cost: 2,
    probability: 0.8,
    requiresOppression: true,
    targets: (unit, enemies) => enemies.filter((e) => distance(unit.position, e.position) <= 3),
    execute: (game, unit, targets) => {
      const target = chooseTargetClosest(unit, targets);
      if (!target) return;
      for (let i = 0; i < 2; i++) {
        target.receiveDamage(20 + i * 10, DAMAGE_TYPES.PHYSICAL, unit, game, { label: '禁忌鞭击' });
        unit.receiveDamage(5, DAMAGE_TYPES.TRUE, unit, game, { label: '自伤' });
      }
    }
  }
];

SKILL_LIBRARY.Tusk = [
  {
    name: '骨盾猛击',
    minLevel: 20,
    cost: 1,
    probability: 0.7,
    excludeAfterOppression: true,
    targets: (unit, enemies) => enemies.filter((e) => distance(unit.position, e.position) === 1),
    execute: (game, unit, targets) => {
      const target = chooseTargetClosest(unit, targets);
      if (!target) return;
      target.receiveDamage(10, DAMAGE_TYPES.PHYSICAL, unit, game, { label: '骨盾猛击' });
      unit.passiveFlags.stackDamage = (unit.passiveFlags.stackDamage || 0) + 5;
    }
  },
  {
    name: '来自深海的咆哮',
    minLevel: 20,
    cost: 2,
    probability: 0.6,
    excludeAfterOppression: true,
    targets: () => [true],
    execute: (game, unit) => {
      for (const enemy of game.aliveUnits(TEAMS.PLAYER)) {
        if (distance(unit.position, enemy.position) <= 1) {
          enemy.reduceSp(20, game, '深海的咆哮');
        }
      }
      unit.passiveFlags.damageReduction = 0.5;
    }
  },
  {
    name: '牛鲨冲撞',
    minLevel: 20,
    cost: 2,
    probability: 0.5,
    excludeAfterOppression: true,
    targets: (unit, enemies) => enemies.filter((e) => distance(unit.position, e.position) <= 2),
    execute: (game, unit, targets) => {
      for (const target of targets) {
        target.receiveDamage(25, DAMAGE_TYPES.PHYSICAL, unit, game, { label: '牛鲨冲撞' });
        target.status.stunned = Math.max(target.status.stunned, 1);
      }
    }
  },
  {
    name: '战争堡垒',
    minLevel: 20,
    cost: 3,
    probability: 0.3,
    excludeAfterOppression: true,
    targets: () => [true],
    execute: (game, unit) => {
      unit.passiveFlags.damageReduction = 0.5;
      unit.restoreSp(10, game, '战争堡垒');
      const haz = game.units.find((u) => u.name === 'Haz');
      if (haz) haz.passiveFlags.damageBonus = (haz.passiveFlags.damageBonus || 0) + 0.15;
    }
  },
  {
    name: '拼尽全力保卫队长。。。。。',
    minLevel: 20,
    cost: 2,
    probability: 0.3,
    requiresOppression: true,
    targets: () => [true],
    execute: (game, unit) => {
      unit.passiveFlags.damageReduction = 0.75;
      const haz = game.units.find((u) => u.name === 'Haz');
      if (haz) {
        haz.heal(Math.round(haz.maxHp * 0.15), game, '守护');
        haz.restoreSp(15, game, '守护');
      }
    }
  }
];

SKILL_LIBRARY.Neyla = [
  {
    name: '迅捷射击',
    minLevel: 20,
    cost: 1,
    probability: 0.7,
    excludeAfterOppression: true,
    targets: (unit, enemies) => enemies.filter((e) => distance(unit.position, e.position) <= 4),
    execute: (game, unit, targets) => {
      const target = chooseTargetClosest(unit, targets);
      if (!target) return;
      let damage = 15;
      if (unit.passiveFlags.aimBoost && distance(unit.position, target.position) > 0) {
        damage = Math.round(damage * 1.5);
      }
      if (target.hp / target.maxHp <= 0.5) damage *= 2;
      target.receiveDamage(damage, DAMAGE_TYPES.PHYSICAL, unit, game, { label: '迅捷射击' });
      target.reduceSp(5, game, '迅捷射击');
    }
  },
  {
    name: '穿刺狙击',
    minLevel: 20,
    cost: 2,
    probability: 0.6,
    excludeAfterOppression: true,
    targets: (unit, enemies) => enemies.filter((e) => distance(unit.position, e.position) <= 6),
    execute: (game, unit, targets) => {
      const target = chooseTargetClosest(unit, targets);
      if (!target) return;
      let damage = 30;
      if (target.hp / target.maxHp <= 0.5) damage *= 2;
      target.receiveDamage(damage, DAMAGE_TYPES.PHYSICAL, unit, game, { label: '穿刺狙击' });
      target.addBleed(1, 2, game);
    }
  },
  {
    name: '双钩牵制',
    minLevel: 20,
    cost: 2,
    probability: 0.5,
    excludeAfterOppression: true,
    targets: (unit, enemies) => enemies.filter((e) => distance(unit.position, e.position) <= 4),
    execute: (game, unit, targets) => {
      const target = chooseTargetClosest(unit, targets);
      if (!target) return;
      target.receiveDamage(15, DAMAGE_TYPES.PHYSICAL, unit, game, { label: '双钩牵制' });
      target.status.stepPenaltyNext += 2;
    }
  },
  {
    name: '终末之影',
    minLevel: 20,
    cost: 3,
    probability: 0.3,
    targets: (unit, enemies) => enemies,
    execute: (game, unit, targets) => {
      const target = chooseLowestHp(targets);
      if (!target) return;
      target.receiveDamage(50, DAMAGE_TYPES.PHYSICAL, unit, game, { label: '终末之影' });
      target.reduceSp(20, game, '终末之影');
      unit.status.stepPenaltyNext += 1;
    }
  },
  {
    name: '执行。。。。。',
    minLevel: 20,
    cost: 2,
    probability: 1,
    requiresOppression: true,
    targets: (unit, enemies) => enemies,
    execute: (game, unit, targets) => {
      for (const target of targets) {
        target.receiveDamage(20, DAMAGE_TYPES.PHYSICAL, unit, game, { label: '执行·一段' });
        target.receiveDamage(20, DAMAGE_TYPES.PHYSICAL, unit, game, { label: '执行·二段' });
        if (target.hp / target.maxHp <= 0.15) {
          target.receiveDamage(target.hp, DAMAGE_TYPES.TRUE, unit, game, { label: '执行·处决' });
        }
      }
    }
  }
];

SKILL_LIBRARY.Kyn = [
  {
    name: '迅影突刺',
    minLevel: 20,
    cost: 1,
    probability: 0.7,
    excludeAfterOppression: true,
    targets: (unit, enemies) => enemies.filter((e) => distance(unit.position, e.position) <= 5),
    execute: (game, unit, targets) => {
      const target = chooseTargetClosest(unit, targets);
      if (!target) return;
      unit.position = adjacentTo(target.position, unit.position);
      target.receiveDamage(20, DAMAGE_TYPES.PHYSICAL, unit, game, { label: '迅影突刺' });
    }
  },
  {
    name: '割喉飞刃',
    minLevel: 20,
    cost: 2,
    probability: 0.6,
    excludeAfterOppression: true,
    targets: (unit, enemies) => enemies.filter((e) => distance(unit.position, e.position) <= 3),
    execute: (game, unit, targets) => {
      const target = chooseTargetClosest(unit, targets);
      if (!target) return;
      target.receiveDamage(25, DAMAGE_TYPES.PHYSICAL, unit, game, { label: '割喉飞刃' });
      target.reduceSp(5, game, '割喉飞刃');
    }
  },
  {
    name: '影杀之舞',
    minLevel: 20,
    cost: 2,
    probability: 0.5,
    excludeAfterOppression: true,
    targets: (unit, enemies) => enemies.filter((e) => distance(unit.position, e.position) <= 1),
    execute: (game, unit, targets) => {
      for (const target of targets) {
        target.receiveDamage(30, DAMAGE_TYPES.PHYSICAL, unit, game, { label: '影杀之舞' });
      }
      const moves = [
        { x: unit.position.x + 1, y: unit.position.y },
        { x: unit.position.x - 1, y: unit.position.y },
        { x: unit.position.x, y: unit.position.y + 1 },
        { x: unit.position.x, y: unit.position.y - 1 }
      ].filter((pos) =>
        pos.x >= 0 && pos.x < WIDTH && pos.y >= 0 && pos.y < HEIGHT && !voidCells.has(`${pos.x},${pos.y}`) && !coverFull.includes(`${pos.x},${pos.y}`)
      );
      if (moves.length > 0) {
        unit.position = moves[Math.floor(Math.random() * moves.length)];
      }
    }
  },
  {
    name: '死亡宣告',
    minLevel: 20,
    cost: 3,
    probability: 0.3,
    excludeAfterOppression: true,
    targets: (unit, enemies) => enemies.filter((e) => distance(unit.position, e.position) <= 3),
    execute: (game, unit, targets) => {
      const target = chooseLowestHp(targets);
      if (!target) return;
      target.receiveDamage(50, DAMAGE_TYPES.PHYSICAL, unit, game, { label: '死亡宣告' });
      target.reduceSp(30, game, '死亡宣告');
      if (target.hp / target.maxHp <= 0.3) {
        target.receiveDamage(target.hp, DAMAGE_TYPES.TRUE, unit, game, { label: '死亡宣告·处决' });
      }
    }
  },
  {
    name: '自我了断。。。。。',
    minLevel: 20,
    cost: 2,
    probability: 0.8,
    requiresOppression: true,
    targets: (unit, enemies) => enemies.filter((e) => distance(unit.position, e.position) <= 5),
    execute: (game, unit, targets) => {
      const target = chooseLowestHp(targets);
      if (!target) return;
      target.receiveDamage(target.hp, DAMAGE_TYPES.TRUE, unit, game, { label: '自我了断' });
      unit.receiveDamage(unit.hp, DAMAGE_TYPES.TRUE, unit, game, { label: '自杀' });
    }
  }
];

document.addEventListener('DOMContentLoaded', () => {
  window.game = new Game();
});
