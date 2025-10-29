const GRID_WIDTH = 22;
const GRID_HEIGHT = 18;
const MAX_STEPS = 10;
const PLAYER_TEAM = "player";
const ENEMY_TEAM = "enemy";

function buildRectangle(x1, y1, x2, y2) {
  const coords = [];
  for (let x = x1; x <= x2; x += 1) {
    for (let y = y1; y <= y2; y += 1) {
      coords.push(`${x},${y}`);
    }
  }
  return coords;
}

const coverZones = [
  { type: "hard", cells: buildRectangle(2, 3, 4, 5) },
  { type: "soft", cells: buildRectangle(2, 12, 5, 14) },
  { type: "soft", cells: buildRectangle(10, 11, 12, 13) }
];

const battlefieldVoid = buildRectangle(14, 0, 21, 7);

const unitDefinitions = [];

const teams = {
  [PLAYER_TEAM]: { name: "七海先锋队", color: "#22c55e" },
  [ENEMY_TEAM]: { name: "七海作战队", color: "#f87171" }
};

const autoPlayState = { interval: null, delay: 800 };

function manhattan(a, b) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function weightedRandom(options) {
  const total = options.reduce((sum, option) => sum + option.weight, 0);
  let roll = Math.random() * total;
  for (const option of options) {
    roll -= option.weight;
    if (roll <= 0) return option;
  }
  return options[options.length - 1];
}

class Game {
  constructor() {
    this.units = [];
    this.round = 1;
    this.turnIndex = 0;
    this.started = false;
    this.onlyHazRemains = false;
    this.hasOppression = false;
    this.huntMarkTarget = null;

    this.gridElement = document.getElementById("grid");
    this.unitListElement = document.getElementById("unit-list");
    this.logElement = document.getElementById("log");

    this.createGrid();
    this.reset();
  }

  createGrid() {
    this.gridElement.innerHTML = "";
    for (let y = GRID_HEIGHT - 1; y >= 0; y -= 1) {
      for (let x = 0; x < GRID_WIDTH; x += 1) {
        const cell = document.createElement("div");
        cell.className = "grid-cell";
        const key = `${x},${y}`;
        if (battlefieldVoid.includes(key)) {
          cell.style.opacity = "0.2";
        }
        if (coverZones.some((zone) => zone.cells.includes(key))) {
          const zone = coverZones.find((z) => z.cells.includes(key));
          cell.classList.add(zone.type === "hard" ? "cover-hard" : "cover-soft");
        }
        this.gridElement.appendChild(cell);
      }
    }
  }

  reset() {
    if (autoPlayState.interval) {
      clearInterval(autoPlayState.interval);
      autoPlayState.interval = null;
    }
    this.units = createUnits(this);
    this.applyCombatAftermath();
    this.round = 1;
    this.turnIndex = 0;
    this.started = false;
    this.onlyHazRemains = false;
    this.hasOppression = false;
    this.huntMarkTarget = null;
    this.logElement.innerHTML = "";
    this.log("战场初始化完毕。");
    this.updateTokens();
    this.renderUnitCards();
  }

  log(message, type) {
    const entry = document.createElement("div");
    entry.className = "log-entry" + (type ? ` ${type}` : "");
    entry.textContent = message;
    this.logElement.appendChild(entry);
    this.logElement.scrollTop = this.logElement.scrollHeight;
  }

  start() {
    if (this.started) return;
    this.started = true;
    this.round = 1;
    this.turnIndex = 0;
    this.log(`—— 第 ${this.round} 回合 ——`, "round");
  }

  nextAction() {
    if (!this.started) this.start();

    const living = this.units.filter((u) => !u.isDefeated());
    if (living.length === 0) {
      this.log("战斗结束。", "ko");
      return;
    }

    let acted = false;
    let attempts = 0;
    let actingUnit = null;
    while (!acted && attempts < this.units.length) {
      const unit = this.units[this.turnIndex % this.units.length];
      this.turnIndex += 1;
      attempts += 1;
      if (unit.isDefeated()) continue;
      const result = unit.takeTurn();
      if (result !== "skipped") {
        acted = true;
        actingUnit = unit;
      }
    }

    if (actingUnit && this.turnIndex % this.units.length === 0) {
      this.advanceRound();
      this.handleRoundPassives();
    }

    this.updateHazSoloState();

    this.updateTokens();
    this.renderUnitCards();
    this.checkVictory();
  }

  updateTokens() {
    this.gridElement.querySelectorAll(".unit-token").forEach((token) => token.remove());
    const cellWidth = this.gridElement.clientWidth / GRID_WIDTH;
    const cellHeight = this.gridElement.clientHeight / GRID_HEIGHT;
    this.units.forEach((unit) => {
      if (unit.isDefeated()) return;
      const token = document.createElement("div");
      token.className = `unit-token ${unit.team}`;
      token.textContent = unit.name;
      token.style.width = `${cellWidth * unit.size - 4}px`;
      token.style.height = `${cellHeight - 4}px`;
      token.style.transform = `translate(${unit.position.x * cellWidth + 2}px, ${(GRID_HEIGHT - unit.position.y - 1) * cellHeight + 2}px)`;
      this.gridElement.appendChild(token);
    });
  }



  updateHazSoloState() {
    const haz = this.getUnit("haz");
    if (!haz || haz.isDefeated()) {
      this.onlyHazRemains = false;
      return;
    }
    const allies = this.units.filter((unit) => unit.team === ENEMY_TEAM && unit.id !== "haz" && !unit.isDefeated());
    this.onlyHazRemains = allies.length === 0;
  }

  applyCombatAftermath() {
    this.units
      .filter((unit) => unit.team === PLAYER_TEAM)
      .forEach((unit) => {
        const lost = unit.maxHP * 0.25;
        unit.receiveDamage(lost, { trueDamage: true, source: "作战余波" });
        unit.damagePenalty = (unit.damagePenalty || 0) + 5;
        this.log(`${unit.name} 受到作战余波影响，初始 HP -25%，伤害 -5。`, "debuff");
      });
  }

  handleRoundPassives() {
    if (this.round > 20 && !this.hasOppression) {
      this.hasOppression = true;
      this.log("队长的压迫降临，队员们开始使用禁忌技能！", "debuff");
      this.units
        .filter((unit) => unit.team === ENEMY_TEAM && unit.id !== "haz")
        .forEach((unit) => (unit.status.oppression = true));
    }
    if (this.round % 2 === 0) {
      const haz = this.getUnit("haz");
      if (haz && !haz.isDefeated()) {
        haz.gainSp(10, "队员们听令！");
      }
      this.units
        .filter((unit) => unit.team === ENEMY_TEAM && unit.id !== "haz" && !unit.isDefeated())
        .forEach((unit) => unit.gainSp(5, "队员们听令！"));
    }
  }

  renderUnitCards() {
    const template = document.getElementById("unit-card-template");
    this.unitListElement.innerHTML = "";
    this.units.forEach((unit) => {
      const fragment = template.content.cloneNode(true);
      fragment.querySelector(".unit-name").textContent = unit.name;
      fragment.querySelector(".unit-role").textContent = unit.role;
      fragment.querySelector(".unit-coords").textContent = `坐标 (${unit.position.x}, ${unit.position.y})`;
      fragment.querySelector(".hp-bar span").style.transform = `scaleX(${unit.hp / unit.maxHP})`;
      fragment.querySelector(".sp-bar span").style.transform = `scaleX(${unit.sp / unit.maxSP})`;
      fragment.querySelector(".unit-steps").textContent = `步数：${unit.steps}`;
      fragment.querySelector(".unit-status").textContent = unit.describeStatuses();
      this.unitListElement.appendChild(fragment);
    });
  }

  averageLevel(team) {
    const members = this.units.filter((u) => u.team === team && !u.isDefeated());
    if (members.length === 0) return 0;
    return members.reduce((sum, unit) => sum + unit.level, 0) / members.length;
  }

  teamStepBonus(team) {
    const opponent = team === PLAYER_TEAM ? ENEMY_TEAM : PLAYER_TEAM;
    const teamAvg = this.averageLevel(team);
    const opponentAvg = this.averageLevel(opponent);
    return teamAvg > opponentAvg ? 2 : 0;
  }

  getUnit(id) {
    return this.units.find((unit) => unit.id === id);
  }

  advanceRound() {
    this.round += 1;
    this.log(`—— 第 ${this.round} 回合 ——`, "round");
  }
  checkVictory() {
    const playersAlive = this.units.some((u) => u.team === PLAYER_TEAM && !u.isDefeated());
    const enemiesAlive = this.units.some((u) => u.team === ENEMY_TEAM && !u.isDefeated());
    if (!playersAlive || !enemiesAlive) {
      this.log(`${playersAlive ? teams[PLAYER_TEAM].name : teams[ENEMY_TEAM].name} 取得胜利！`, "ko");
      if (autoPlayState.interval) {
        clearInterval(autoPlayState.interval);
        autoPlayState.interval = null;
        if (typeof autoBtn !== "undefined") {
          autoBtn.textContent = "自动播放";
        }
      }
    }
  }
}

function createUnits(game) {
  return [
    new Unit(
      {
        id: "adora",
        name: "Adora",
        role: "支援/刺客",
        team: PLAYER_TEAM,
        level: 20,
        maxHP: 100,
        maxSP: 100,
        size: 1,
        position: { x: 1, y: 2 },
        spRecoveryOnBreak: 0.5,
        passives: ["背刺", "冷静分析", "啊啊啊你们没事吧？！", "对战斗的恐惧"],
        skillBuilder: buildAdoraSkills
      },
      game
    ),
    new Unit(
      {
        id: "karma",
        name: "Karma",
        role: "斗士",
        team: PLAYER_TEAM,
        level: 20,
        maxHP: 200,
        maxSP: 50,
        size: 1,
        position: { x: 3, y: 2 },
        spRecoveryOnBreak: 0.5,
        passives: ["暴力瘾", "强悍的肉体", "自尊心"],
        skillBuilder: buildKarmaSkills
      },
      game
    ),
    new Unit(
      {
        id: "dario",
        name: "Dario",
        role: "战术家",
        team: PLAYER_TEAM,
        level: 20,
        maxHP: 150,
        maxSP: 100,
        size: 1,
        position: { x: 5, y: 2 },
        spRecoveryOnBreak: 0.75,
        passives: ["快速调整", "反击", "士气鼓舞"],
        skillBuilder: buildDarioSkills
      },
      game
    ),
    new Unit(
      {
        id: "haz",
        name: "Haz",
        role: "Boss",
        team: ENEMY_TEAM,
        level: 55,
        maxHP: 750,
        maxSP: 100,
        size: 1,
        position: { x: 20, y: 3 },
        rank: "boss",
        spRecoveryOnBreak: 1,
        passives: ["弑神执念", "难以抑制的仇恨", "队员们听令！", "一切牺牲都是值得的……", "他们不是主菜！", "把他们追杀到天涯海角！", "力挽狂澜"],
        skillBuilder: buildHazSkills
      },
      game
    ),
    new Unit(
      {
        id: "katz",
        name: "Katz",
        role: "小Boss",
        team: ENEMY_TEAM,
        level: 53,
        maxHP: 500,
        maxSP: 75,
        size: 1,
        position: { x: 18, y: 3 },
        rank: "smallBoss",
        spRecoveryOnBreak: 1,
        passives: ["隐秘迷恋", "恐怖执行力", "女强人"],
        skillBuilder: buildKatzSkills
      },
      game
    ),
    new Unit(
      {
        id: "tusk",
        name: "Tusk",
        role: "小Boss",
        team: ENEMY_TEAM,
        level: 54,
        maxHP: 1000,
        maxSP: 60,
        size: 2,
        position: { x: 18, y: 5 },
        rank: "smallBoss",
        spRecoveryOnBreak: 1,
        passives: ["家人的守护", "铁壁如山", "猛牛之力"],
        skillBuilder: buildTuskSkills
      },
      game
    ),
    new Unit(
      {
        id: "neyla",
        name: "Neyla",
        role: "精英狙击手",
        team: ENEMY_TEAM,
        level: 52,
        maxHP: 350,
        maxSP: 80,
        size: 1,
        position: { x: 14, y: 1 },
        rank: "elite",
        spRecoveryOnBreak: 1,
        passives: ["精确瞄准", "冷血执行者", "神速装填"],
        skillBuilder: buildNeylaSkills
      },
      game
    ),
    new Unit(
      {
        id: "kyn",
        name: "Kyn",
        role: "精英刺客",
        team: ENEMY_TEAM,
        level: 51,
        maxHP: 250,
        maxSP: 70,
        size: 1,
        position: { x: 14, y: 6 },
        rank: "elite",
        spRecoveryOnBreak: 1,
        passives: ["打道回府", "无情暗杀", "迅捷如风"],
        skillBuilder: buildKynSkills
      },
      game
    )
  ];
}

class Unit {
  constructor(config, game) {
    Object.assign(this, config);
    this.game = game;
    this.maxHP = config.maxHP;
    this.maxSP = config.maxSP;
    this.hp = this.maxHP;
    this.sp = this.maxSP;
    this.steps = 3;
    this.status = {
      stunDuration: 0,
      stunStacks: 0,
      fear: 0,
      bleed: 0,
      bleedDuration: 0,
      recovery: 0,
      recoveryDuration: 0,
      hazBleed: 0,
      hazBleedDuration: 0
    };
    this.stepModifierNextTurn = 0;
    this.pendingSpRestore = null;
    this.skipForBreak = false;
    this.comboCounter = 0;
    this.huntMark = false;
    this.chickenBlood = false;
    this.dependence = false;
    this.deepBreathActive = false;
    this.bastion = { active: false, reduction: 0, duration: 0 };
    this.retaliation = { active: false, reflect: 0, duration: 0 };
    this.consecutiveMeleeHits = 0;
    this.didMoveThisTurn = false;
    this.skillPool = config.skillBuilder(this);
    this.damagePenalty = 0;
    this.damageBonus = 0;
    this.hasHandgun = true;
    this.rank = config.rank || "normal";
    this.dead = false;
  }

  isDefeated() {
    return this.dead || this.hp <= 0;
  }

  describeStatuses() {
    const text = [];
    if (this.status.stunDuration > 0) text.push(`眩晕${this.status.stunDuration}`);
    if (this.status.stunStacks > 0) text.push(`眩晕层数${this.status.stunStacks}`);
    if (this.status.fear > 0) text.push(`恐惧${this.status.fear}`);
    if (this.status.bleed > 0) text.push(`流血×${this.status.bleed}`);
    if (this.status.recovery > 0) text.push(`恢复×${this.status.recovery}`);
    if (this.chickenBlood) text.push("鸡血");
    if (this.dependence) text.push("依赖");
    if (this.deepBreathActive) text.push("深呼吸增伤");
    if (this.bastion.active) text.push(`堡垒${this.bastion.duration}`);
    if (this.retaliation.active) text.push(`反伤${this.retaliation.duration}`);
    if (this.status.hazBleed > 0) text.push(`Haz流血`);
    if (this.status.oppression) text.push("队长的压迫");
    return text.join("，");
  }

  takeTurn() {
    if (this.isDefeated()) return "skipped";
    if (!this.game.started) this.game.start();

    if (this.status.stunDuration > 0) {
      this.status.stunDuration -= 1;
      this.game.log(`${this.name} 被眩晕，无法行动。`, "debuff");
      if (this.status.stunDuration === 0 && this.pendingSpRestore) {
        this.restoreSpAfterBreak();
      }
      return "skipped";
    }

    if (this.skipForBreak) {
      this.game.log(`${this.name} 因 SP 崩溃而跳过回合。`, "debuff");
      this.skipForBreak = false;
      this.restoreSpAfterBreak();
      return "skipped";
    }

    this.prepareTurn();

    const available = this.selectableSkills();
    if (available.length === 0) {
      this.game.log(`${this.name} 没有可执行的动作。`);
      if (this.id === "adora") this.gainSp(10, "冷静分析");
      return "skipped";
    }

    const skill = weightedRandom(available);
    this.game.log(`${this.name} 施放「${skill.name}」。`);
    this.steps -= skill.cost;
    skill.action(new ActionContext(this, skill));
    this.finishTurn();
  }

  prepareTurn() {
    this.didMoveThisTurn = false;
    let stepGain = 1;
    const teamBonus = this.game.averageLevel ? this.game.teamStepBonus(this.team) : 0;
    stepGain += teamBonus;
    this.steps = Math.min(MAX_STEPS, this.steps + stepGain);
    if (this.stepModifierNextTurn !== 0) {
      this.steps = Math.max(0, Math.min(MAX_STEPS, this.steps + this.stepModifierNextTurn));
      this.stepModifierNextTurn = 0;
    }
    if (this.status.fear > 0) {
      this.steps = Math.max(0, this.steps - this.status.fear);
      this.game.log(`${this.name} 恐惧效果触发，步数 -${this.status.fear}。`, "debuff");
      this.status.fear = 0;
    }
    this.resolveOverTimeEffects();
    this.applyPassiveTriggers();
  }

  resolveOverTimeEffects() {
    if (this.status.bleed > 0) {
      const damage = this.maxHP * 0.05 * this.status.bleed;
      this.receiveDamage(damage, { trueDamage: true, source: "流血" });
      this.status.bleedDuration -= 1;
      if (this.status.bleedDuration <= 0) {
        this.status.bleed = 0;
      }
    }
    if (this.status.recovery > 0) {
      this.heal(this.maxHP * 0.05, "恢复Buff");
      this.status.recovery -= 1;
    }
    if (this.status.hazBleed > 0) {
      const damage = this.maxHP * 0.03;
      this.receiveDamage(damage, { trueDamage: true, source: "Haz流血" });
      this.status.hazBleedDuration -= 1;
      if (this.status.hazBleedDuration <= 0) {
        this.status.hazBleed = 0;
      }
    }
    if (this.bastion.active) {
      this.bastion.duration -= 1;
      if (this.bastion.duration <= 0) this.bastion.active = false;
    }
    if (this.retaliation.active) {
      this.retaliation.duration -= 1;
      if (this.retaliation.duration <= 0) this.retaliation.active = false;
    }
  }

  applyPassiveTriggers() {
    if (this.id === "adora") {
      const allies = this.game.units.filter((u) => u.team === PLAYER_TEAM && u !== this && !u.isDefeated());
      if (allies.some((ally) => Math.abs(ally.position.x - this.position.x) <= 3 && Math.abs(ally.position.y - this.position.y) <= 3)) {
        this.heal(this.maxHP * 0.05, "啊啊啊你们没事吧？！");
        this.gainSp(5, "啊啊啊你们没事吧？！");
      }
    }
    if (this.id === "katz") {
      const haz = this.game.getUnit("haz");
      if (haz && !haz.isDefeated()) {
        this.gainSp(5, "隐秘迷恋");
      }
    }
    if (this.id === "neyla") {
      this.didMoveThisTurn = false;
    }
    if (this.passives.includes("神速装填") && this.game.round % 3 === 0) {
      this.gainSp(10, "神速装填");
    }
    if (this.passives.includes("士气鼓舞") && this.game.round % 5 === 0) {
      this.game.units
        .filter((u) => u.team === this.team && !u.isDefeated())
        .forEach((ally) => ally.gainSp(15, "士气鼓舞"));
    }
  }

  selectableSkills() {
    const oppressionBan = new Set([
      "矛刺",
      "链式鞭击",
      "反复鞭尸",
      "终焉礼炮",
      "骨盾猛击",
      "来自深海的咆哮",
      "牛鲨冲撞",
      "战争堡垒",
      "迅捷射击",
      "穿刺狙击",
      "双钩牵制",
      "终末之影",
      "迅影突刺",
      "割喉飞刃",
      "影杀之舞",
      "死亡宣告"
    ]);
    return this.skillPool.filter((skill) => {
      if (skill.minLevel && this.level < skill.minLevel) return false;
      if (skill.requiresHandgun && !this.hasHandgun) return false;
      if (skill.cost > this.steps) return false;
      if (this.status.oppression && oppressionBan.has(skill.name) && !skill.forceWhenOppression) return false;
      if (skill.condition && !skill.condition(this, this.game)) return false;
      return true;
    });
  }

  finishTurn() {
    this.consecutiveMeleeHits = 0;
    if (this.deepBreathActive) {
      this.deepBreathActive = false;
    }
  }

  gainSp(amount, reason) {
    const before = this.sp;
    this.sp = Math.min(this.maxSP, this.sp + amount);
    if (reason) this.game.log(`${this.name} ${reason}，SP +${(this.sp - before).toFixed(1)}。`, "sp");
  }

  reduceSp(amount, reason) {
    const before = this.sp;
    this.sp = Math.max(0, this.sp - amount);
    if (reason) this.game.log(`${this.name} ${reason}，SP -${(before - this.sp).toFixed(1)}。`, "sp");
    if (this.sp === 0) {
      this.onSpBreak();
    }
  }

  onSpBreak() {
    this.game.log(`${this.name} SP 枯竭！`, "debuff");
    this.status.stunDuration = Math.max(this.status.stunDuration, 1);
    this.stepModifierNextTurn -= 1;
    this.skipForBreak = true;
    this.pendingSpRestore = this.maxSP * (this.spRecoveryOnBreak || 0.5);
    if (this.id === "karma") {
      this.receiveDamage(20, { trueDamage: true, source: "SP崩溃" });
    }
  }

  restoreSpAfterBreak() {
    if (!this.pendingSpRestore) return;
    if (this.id === "haz") {
      this.sp = this.maxSP;
      this.heal(this.maxHP * 0.05, "SP恢复");
    } else {
      this.sp = Math.min(this.maxSP, this.pendingSpRestore);
    }
    this.pendingSpRestore = null;
    this.game.log(`${this.name} 恢复 SP。`, "sp");
  }

  heal(amount, reason) {
    const before = this.hp;
    this.hp = Math.min(this.maxHP, this.hp + amount);
    if (reason) this.game.log(`${this.name} ${reason}，回复 ${(this.hp - before).toFixed(1)} HP。`, "heal");
  }

  receiveDamage(amount, options = {}) {
    if (this.isDefeated()) return 0;
    let final = amount;
    if (!options.trueDamage) {
      if (this.passives.includes("强悍的肉体")) final *= 0.75;
      if (this.passives.includes("铁壁如山")) final *= 0.7;
      if (this.bastion.active) final *= 0.5;
      if (this.retaliation.active) final *= 0.75;
      if (this.game.onlyHazRemains && this.id === "haz") final *= 0.9;
    }
    if (this.id === "haz") {
      const tusk = this.game.getUnit("tusk");
      if (tusk && !tusk.isDefeated() && tusk.passives.includes("家人的守护")) {
        this.game.log("Tusk 挡下了对 Haz 的伤害。", "buff");
        tusk.receiveDamage(final * 0.5, { attacker: options.attacker, source: "家人的守护" });
        return 0;
      }
    }
    this.hp -= final;
    const text = `${this.name} 受到 ${final.toFixed(1)} 点${options.trueDamage ? "真实" : ""}伤害${options.source ? `（${options.source}）` : ""}。`;
    this.game.log(text, "damage");
    if (this.passives.includes("猛牛之力")) {
      this.damageBonus = (this.damageBonus || 0) + 5;
    }
    if (this.hp <= 0) {
      this.dead = true;
      this.hp = 0;
      this.game.log(`${this.name} 被击倒。`, "ko");
    }
    if (this.retaliation.active && options.attacker) {
      const reflected = final * this.retaliation.reflect;
      options.attacker.receiveDamage(reflected, { trueDamage: true, source: "反伤反击" });
    }
    return final;
  }

  applyBleed(stacks, duration) {
    this.status.bleed += stacks;
    this.status.bleedDuration = Math.max(this.status.bleedDuration, duration);
    this.game.log(`${this.name} 获得流血（${this.status.bleed} 层）。`, "debuff");
  }

  applyFear(stacks) {
    this.status.fear += stacks;
    this.game.log(`${this.name} 恐惧 +${stacks}。`, "debuff");
  }

  applyStunStacks(amount) {
    const threshold = this.rank === "boss" ? 4 : this.rank === "smallBoss" ? 3 : this.rank === "elite" ? 2 : 1;
    this.status.stunStacks += amount;
    this.game.log(`${this.name} 获得 ${amount} 层眩晕层数。`, "debuff");
    if (this.status.stunStacks >= threshold) {
      this.status.stunStacks -= threshold;
      this.status.stunDuration = Math.max(this.status.stunDuration, 1);
      this.game.log(`${this.name} 眩晕触发，跳过行动。`, "debuff");
    }
  }

  moveTowards(target, steps = 1) {
    const dx = Math.sign(target.position.x - this.position.x);
    const dy = Math.sign(target.position.y - this.position.y);
    this.position.x = Math.max(0, Math.min(GRID_WIDTH - 1, this.position.x + dx * steps));
    this.position.y = Math.max(0, Math.min(GRID_HEIGHT - 1, this.position.y + dy * steps));
    this.didMoveThisTurn = true;
  }

  moveAway(target, steps = 1) {
    const dx = Math.sign(this.position.x - target.position.x);
    const dy = Math.sign(this.position.y - target.position.y);
    this.position.x = Math.max(0, Math.min(GRID_WIDTH - 1, this.position.x + dx * steps));
    this.position.y = Math.max(0, Math.min(GRID_HEIGHT - 1, this.position.y + dy * steps));
    this.didMoveThisTurn = true;
  }

  nearestEnemy(maxRange = Infinity) {
    const enemies = this.game.units.filter((u) => u.team !== this.team && !u.isDefeated());
    let nearest = null;
    let best = Infinity;
    for (const enemy of enemies) {
      const dist = manhattan(this.position, enemy.position);
      if (dist < best && dist <= maxRange) {
        nearest = enemy;
        best = dist;
      }
    }
    return nearest;
  }

  alliesInRange(range) {
    return this.game.units.filter((u) => u.team === this.team && u !== this && !u.isDefeated() && manhattan(u.position, this.position) <= range);
  }
}

class ActionContext {
  constructor(unit, skill) {
    this.unit = unit;
    this.skill = skill;
    this.game = unit.game;
  }

  nearestEnemy(range = Infinity) {
    return this.unit.nearestEnemy(range);
  }

  alliesInRange(range) {
    return this.unit.alliesInRange(range);
  }

  applyDamage(target, amount, options = {}) {
    const { spDamage = 0, bleed, fear, stunStacks, stepDebuff, push, trueDamage = false } = options;
    if (!target || target.isDefeated()) return;
    let base = Math.max(0, amount - (this.unit.damagePenalty || 0));
    if (this.unit.id === "haz" && this.unit.hp < this.unit.maxHP * 0.5) base *= 1.3;
    if (this.unit.id === "haz" && this.game.onlyHazRemains) base *= 1.1;
    if (this.unit.id === "katz" && this.game.getUnit("haz") && !this.game.getUnit("haz").isDefeated()) base *= 1.2;
    if (this.unit.id === "katz" && this.unit.sp > 60) base *= 1.1;
    if (this.unit.id === "neyla" && !this.unit.didMoveThisTurn && this.skill.tags?.includes("ranged")) base *= 1.5;
    if (this.unit.passives.includes("对战斗的恐惧") && this.unit.sp < 10) base *= 1.5;
    if (this.unit.chickenBlood) base *= 2;
    if (this.skill.tags?.includes("melee")) {
      this.unit.consecutiveMeleeHits += 1;
      if (this.unit.passives.includes("暴力瘾")) {
        if (this.unit.consecutiveMeleeHits >= 3) {
          this.game.log(`${this.unit.name} 的『暴力瘾』触发追击！`, "buff");
          this.unit.consecutiveMeleeHits = 0;
          target.receiveDamage(base, { attacker: this.unit, source: this.skill.name });
        }
      }
    }
    if (this.game.round <= 15 && this.unit.team === ENEMY_TEAM && this.game.hasOppression) {
      if (Math.random() < 0.3) {
        base *= 1.5;
        this.game.log(`暴击！${this.unit.name} 造成额外伤害。`, "buff");
      }
    }
    if (this.unit.deepBreathActive) base *= 1.1;
    if (target.huntMark && this.unit.team === ENEMY_TEAM && this.unit.id !== "haz") {
      base *= 1.15;
    }
    if (this.unit.dependence) {
      target.receiveDamage(base, { trueDamage: true, attacker: this.unit, source: `${this.skill.name}（依赖）` });
      this.unit.dependence = false;
      this.unit.sp = 0;
      this.unit.onSpBreak();
    } else {
      target.receiveDamage(base, { attacker: this.unit, source: this.skill.name, trueDamage });
    }
    if (spDamage) target.reduceSp(spDamage, this.skill.name);
    if (bleed) target.applyBleed(bleed.stacks, bleed.duration);
    this.unit.turnHits = (this.unit.turnHits || 0) + 1;
    if (this.unit.id === "katz" && this.unit.turnHits >= 2 && !this.unit.followUpTriggered) {
      this.unit.followUpTriggered = true;
      this.game.log("恐怖执行力触发追加矛刺！", "buff");
      const extraTarget = target.isDefeated() ? this.nearestEnemy(1) : target;
      if (extraTarget) {
        this.applyDamage(extraTarget, 20, { spDamage: 5 });
      }
    }
    if (fear) target.applyFear(fear);
    if (stunStacks) target.applyStunStacks(stunStacks);
    if (stepDebuff) target.stepModifierNextTurn -= stepDebuff;
    if (push) target.moveAway(this.unit, push);
    if (this.unit.passives.includes("难以抑制的仇恨")) {
      if (Math.random() < 0.4) {
        target.reduceSp(5, "难以抑制的仇恨");
        target.applyFear(1);
      }
    }
    if (this.unit.id === "haz" && !target.huntMark) {
      this.game.huntMarkTarget = target;
      target.huntMark = true;
      this.game.log(`${target.name} 被标记为猎杀目标。`, "debuff");
    }
  }

  moveTowards(target, steps = 1) {
    this.unit.moveTowards(target, steps);
  }

  moveAway(target, steps = 1) {
    this.unit.moveAway(target, steps);
  }
}

function buildAdoraSkills(unit) {
  return [
    {
      name: "短匕轻挥！",
      cost: 1,
      weight: 80,
      tags: ["melee"],
      action(ctx) {
        const enemy = ctx.nearestEnemy(1);
        if (!enemy) return;
        ctx.applyDamage(enemy, 10, { spDamage: 5 });
      }
    },
    {
      name: "枪击",
      cost: 1,
      weight: 65,
      requiresHandgun: true,
      tags: ["ranged"],
      action(ctx) {
        const enemies = ctx.unit.game.units.filter((u) => u.team !== ctx.unit.team && !u.isDefeated());
        enemies.forEach((enemy) => {
          if (enemy.position.y === ctx.unit.position.y) {
            ctx.applyDamage(enemy, 10, { spDamage: 5 });
          }
        });
      }
    },
    {
      name: "呀！你不要靠近我呀！！",
      cost: 2,
      weight: 40,
      tags: ["movement"],
      action(ctx) {
        const enemy = ctx.nearestEnemy();
        if (!enemy) return;
        ctx.moveAway(enemy, 2);
        if (enemy.hp / enemy.maxHP <= 0.5) {
          ctx.applyDamage(enemy, 10, { spDamage: 5 });
        }
      }
    },
    {
      name: "自制粉色迷你电击装置！",
      cost: 3,
      weight: 30,
      minLevel: 20,
      tags: ["melee"],
      action(ctx) {
        const enemy = ctx.nearestEnemy(2);
        if (!enemy) return;
        ctx.applyDamage(enemy, 10, { spDamage: 15, stepDebuff: 1 });
      }
    },
    {
      name: "略懂的医术！",
      cost: 2,
      weight: 30,
      minLevel: 25,
      action(ctx) {
        const allies = ctx.alliesInRange(2);
        if (allies.length === 0) return;
        const target = allies.reduce((low, ally) => (ally.hp / ally.maxHP < low.hp / low.maxHP ? ally : low), allies[0]);
        target.heal(20, "略懂的医术");
        target.gainSp(15, "略懂的医术");
        target.status.recovery += 1;
        target.status.recoveryDuration = 1;
      }
    },
    {
      name: "加油哇！",
      cost: 4,
      weight: 20,
      minLevel: 25,
      action(ctx) {
        const allies = ctx.alliesInRange(2);
        if (allies.length === 0) return;
        const target = allies.find((ally) => !ally.chickenBlood) || allies[0];
        target.chickenBlood = true;
        ctx.game.log(`${target.name} 获得鸡血 buff。`, "buff");
      }
    },
    {
      name: "只能靠你了。。",
      cost: 4,
      weight: 15,
      minLevel: 35,
      action(ctx) {
        const allies = ctx.alliesInRange(2);
        if (allies.length === 0) return;
        const target = allies[0];
        ctx.unit.receiveDamage(25, { trueDamage: true, source: "只能靠你了" });
        target.dependence = true;
        ctx.game.log(`${target.name} 获得依赖 buff。`, "buff");
      }
    }
  ];
}

function buildKarmaSkills(unit) {
  return [
    {
      name: "沙包大的拳头",
      cost: 1,
      weight: 80,
      tags: ["melee"],
      action(ctx) {
        const enemy = ctx.nearestEnemy(1);
        if (!enemy) return;
        ctx.applyDamage(enemy, 15);
      }
    },
    {
      name: "枪击",
      cost: 1,
      weight: 65,
      requiresHandgun: true,
      tags: ["ranged"],
      action(ctx) {
        const enemies = ctx.unit.game.units.filter((u) => u.team !== ctx.unit.team && !u.isDefeated());
        enemies.forEach((enemy) => {
          if (enemy.position.y === ctx.unit.position.y) ctx.applyDamage(enemy, 10, { spDamage: 5 });
        });
      }
    },
    {
      name: "都听你的",
      cost: 2,
      weight: 40,
      action(ctx) {
        const enemy = ctx.nearestEnemy();
        if (enemy) ctx.moveTowards(enemy, 2);
        ctx.unit.gainSp(5, "都听你的");
      }
    },
    {
      name: "嗜血之握",
      cost: 3,
      weight: 30,
      action(ctx) {
        const enemy = ctx.nearestEnemy(1);
        if (!enemy) return;
        ctx.applyDamage(enemy, 25, { spDamage: 10 });
        ctx.unit.comboCounter = (ctx.unit.comboCounter || 0) + 1;
        if (ctx.unit.comboCounter >= 4) {
          ctx.unit.comboCounter = 0;
          const killDamage = enemy.rank === "boss" ? 75 : enemy.rank === "smallBoss" ? 80 : enemy.rank === "elite" ? 100 : enemy.maxHP;
          enemy.receiveDamage(killDamage, { attacker: ctx.unit, source: "嗜血之握终结" });
        }
      }
    },
    {
      name: "深呼吸",
      cost: 2,
      weight: 20,
      minLevel: 25,
      action(ctx) {
        ctx.unit.sp = ctx.unit.maxSP;
        ctx.unit.heal(10, "深呼吸");
        ctx.unit.deepBreathActive = true;
      }
    }
  ];
}

function buildDarioSkills(unit) {
  return [
    {
      name: "机械爪击",
      cost: 1,
      weight: 80,
      tags: ["melee"],
      action(ctx) {
        const enemy = ctx.nearestEnemy(2);
        if (!enemy) return;
        ctx.applyDamage(enemy, 15, { stunStacks: Math.random() < 0.15 ? 1 : 0 });
      }
    },
    {
      name: "枪击",
      cost: 1,
      weight: 65,
      requiresHandgun: true,
      tags: ["ranged"],
      action(ctx) {
        const enemies = ctx.unit.game.units.filter((u) => u.team !== ctx.unit.team && !u.isDefeated());
        enemies.forEach((enemy) => {
          if (enemy.position.y === ctx.unit.position.y) ctx.applyDamage(enemy, 10, { spDamage: 5 });
        });
      }
    },
    {
      name: "迅捷步伐",
      cost: 2,
      weight: 40,
      action(ctx) {
        const enemy = ctx.nearestEnemy();
        if (enemy) ctx.moveTowards(enemy, 2);
        if (enemy) enemy.reduceSp(5, "迅捷步伐");
      }
    },
    {
      name: "拿来吧你！",
      cost: 3,
      weight: 30,
      tags: ["melee"],
      action(ctx) {
        const enemy = ctx.nearestEnemy(4);
        if (!enemy) return;
        ctx.applyDamage(enemy, 20, { spDamage: 15, stunStacks: 1 });
        enemy.moveTowards(ctx.unit, manhattan(enemy.position, ctx.unit.position));
      }
    },
    {
      name: "先苦后甜",
      cost: 4,
      weight: 15,
      minLevel: 25,
      action(ctx) {
        ctx.unit.stepModifierNextTurn += 4;
        ctx.game.log(`${ctx.unit.name} 下一回合步数 +4。`, "buff");
      }
    }
  ];
}

function buildHazSkills(unit) {
  return [
    {
      name: "鱼叉穿刺",
      cost: 1,
      weight: 70,
      tags: ["melee"],
      action(ctx) {
        const enemy = ctx.nearestEnemy(1);
        if (!enemy) return;
        ctx.applyDamage(enemy, 20);
        ctx.unit.gainSp(10, "鱼叉穿刺");
      }
    },
    {
      name: "深海猎杀",
      cost: 2,
      weight: 60,
      action(ctx) {
        const enemy = ctx.nearestEnemy(3);
        if (!enemy) return;
        ctx.applyDamage(enemy, 25, { spDamage: 10 });
        enemy.moveTowards(ctx.unit, Math.max(0, manhattan(enemy.position, ctx.unit.position) - 1));
      }
    },
    {
      name: "猎神之叉",
      cost: 2,
      weight: 65,
      tags: ["melee"],
      action(ctx) {
        const enemy = ctx.nearestEnemy(5);
        if (!enemy) return;
        ctx.moveTowards(enemy, Math.max(1, manhattan(ctx.unit.position, enemy.position) - 1));
        const crit = Math.random() < 0.5;
        ctx.applyDamage(enemy, crit ? 40 : 20, { spDamage: 15, bleed: { stacks: 1, duration: 2 } });
      }
    },
    {
      name: "锁链缠绕",
      cost: 2,
      weight: 50,
      action(ctx) {
        ctx.unit.bastion = { active: true, reduction: 0.4, duration: 2 };
        ctx.game.log(`Haz 获得 40% 减伤护盾 2 回合。`, "buff");
        ctx.game.units
          .filter((ally) => ally.team === ctx.unit.team)
          .forEach((ally) => ally.gainSp(5, "锁链缠绕"));
      }
    },
    {
      name: "鲸落",
      cost: 4,
      weight: 30,
      tags: ["aoe"],
      action(ctx) {
        const enemies = ctx.unit.game.units.filter((u) => u.team !== ctx.unit.team && !u.isDefeated());
        enemies.forEach((enemy) => {
          if (manhattan(enemy.position, ctx.unit.position) <= 2) {
            ctx.applyDamage(enemy, 50, { spDamage: 20, stepDebuff: 1 });
          }
        });
      }
    },
    {
      name: "怨念滋生",
      cost: 1,
      weight: 33,
      condition: (unit, game) => game.onlyHazRemains,
      action(ctx) {
        const marked = ctx.game.units.filter((u) => u.huntMark && !u.isDefeated());
        marked.forEach((target) => {
          target.applyBleed(1, 2);
          target.applyFear(1);
        });
      }
    },
    {
      name: "付出代价",
      cost: 2,
      weight: 33,
      condition: (unit, game) => game.onlyHazRemains,
      action(ctx) {
        const enemy = ctx.nearestEnemy(4);
        if (!enemy) return;
        ctx.applyDamage(enemy, 15, { spDamage: 5 });
      }
    },
    {
      name: "仇恨之叉",
      cost: 2,
      weight: 33,
      condition: (unit, game) => game.onlyHazRemains,
      action(ctx) {
        const enemies = ctx.unit.game.units.filter((u) => u.team !== ctx.unit.team && !u.isDefeated());
        enemies.forEach((enemy) => {
          if (manhattan(enemy.position, ctx.unit.position) <= 1) {
            ctx.applyDamage(enemy, 20);
            enemy.applyBleed(1, 2);
          }
        });
        ctx.unit.status.hazBleed = 1;
        ctx.unit.status.hazBleedDuration = 2;
      }
    }
  ];
}

function buildKatzSkills(unit) {
  return [
    {
      name: "矛刺",
      cost: 1,
      weight: 70,
      tags: ["melee"],
      action(ctx) {
        const enemy = ctx.nearestEnemy(1);
        if (!enemy) return;
        ctx.applyDamage(enemy, 20, { spDamage: 5 });
      }
    },
    {
      name: "链式鞭击",
      cost: 2,
      weight: 60,
      tags: ["melee"],
      action(ctx) {
        const enemies = ctx.unit.game.units.filter((u) => u.team !== ctx.unit.team && !u.isDefeated());
        enemies.forEach((enemy) => {
          if (Math.abs(enemy.position.y - ctx.unit.position.y) <= 1 && Math.abs(enemy.position.x - ctx.unit.position.x) <= 3) {
            ctx.applyDamage(enemy, 25, { stepDebuff: 1 });
          }
        });
      }
    },
    {
      name: "反复鞭尸",
      cost: 3,
      weight: 50,
      tags: ["melee"],
      action(ctx) {
        let repeats = Math.min(5, Math.floor(ctx.unit.sp / 10));
        for (let i = 0; i < repeats; i += 1) {
          const enemies = ctx.unit.game.units.filter((u) => u.team !== ctx.unit.team && !u.isDefeated());
          enemies.forEach((enemy) => {
            if (Math.abs(enemy.position.x - ctx.unit.position.x) <= 3) {
              const dmg = i === 0 ? 10 : 15;
              ctx.applyDamage(enemy, dmg);
            }
          });
        }
        ctx.unit.gainSp(5, "反复鞭尸");
      }
    },
    {
      name: "终焉礼炮",
      cost: 4,
      weight: 30,
      tags: ["aoe"],
      action(ctx) {
        const enemies = ctx.unit.game.units.filter((u) => u.team !== ctx.unit.team && !u.isDefeated());
        enemies.forEach((enemy) => {
          if (Math.abs(enemy.position.x - ctx.unit.position.x) <= 1 && Math.abs(enemy.position.y - ctx.unit.position.y) <= 1) {
            ctx.applyDamage(enemy, 60, { spDamage: 15 });
          }
        });
        ctx.unit.stepModifierNextTurn -= 1;
      }
    },
    {
      name: "必须抹杀一切。。。",
      cost: 2,
      weight: 50,
      condition: (unit, game) => game.hasOppression,
      tags: ["melee"],
      action(ctx) {
        let repeats = Math.min(5, Math.floor(ctx.unit.sp / 10));
        for (let i = 0; i < repeats; i += 1) {
          const enemies = ctx.unit.game.units.filter((u) => u.team !== ctx.unit.team && !u.isDefeated());
          enemies.forEach((enemy) => {
            if (Math.abs(enemy.position.x - ctx.unit.position.x) <= 3) {
              const dmg = i === 0 ? 20 : 30;
              ctx.applyDamage(enemy, dmg);
              ctx.unit.receiveDamage(5, { trueDamage: true, source: "自伤" });
            }
          });
        }
        ctx.unit.gainSp(5, "必须抹杀一切");
      },
      forceWhenOppression: true
    }
  ];
}

function buildTuskSkills(unit) {
  return [
    {
      name: "骨盾猛击",
      cost: 1,
      weight: 70,
      tags: ["melee"],
      action(ctx) {
        const enemy = ctx.nearestEnemy(1);
        if (!enemy) return;
        ctx.applyDamage(enemy, 10, { push: 1 });
      }
    },
    {
      name: "来自深海的咆哮",
      cost: 2,
      weight: 60,
      action(ctx) {
        const enemies = ctx.unit.game.units.filter((u) => u.team !== ctx.unit.team && !u.isDefeated());
        enemies.forEach((enemy) => {
          if (manhattan(enemy.position, ctx.unit.position) <= 1) {
            enemy.reduceSp(20, "来自深海的咆哮");
          }
        });
        ctx.unit.bastion = { active: true, reduction: 0.2, duration: 2 };
      }
    },
    {
      name: "牛鲨冲撞",
      cost: 2,
      weight: 50,
      tags: ["melee"],
      action(ctx) {
        const enemy = ctx.nearestEnemy(2);
        if (!enemy) return;
        ctx.applyDamage(enemy, 25, { stunStacks: 1 });
        enemy.moveAway(ctx.unit, 1);
      }
    },
    {
      name: "战争堡垒",
      cost: 3,
      weight: 30,
      action(ctx) {
        ctx.unit.bastion = { active: true, reduction: 0.5, duration: 3 };
        ctx.unit.gainSp(10, "战争堡垒");
        const haz = ctx.game.getUnit("haz");
        if (haz) ctx.game.log(`Haz 伤害提高 15%。`, "buff");
      }
    },
    {
      name: "拼尽全力保卫队长。。。",
      cost: 2,
      weight: 30,
      condition: (unit, game) => game.hasOppression,
      action(ctx) {
        ctx.unit.retaliation = { active: true, reflect: 0.25, duration: 3 };
        ctx.unit.bastion = { active: true, reduction: 0.25, duration: 3 };
        const haz = ctx.game.getUnit("haz");
        if (haz) {
          haz.heal(haz.maxHP * 0.15, "拼尽全力保卫队长");
          haz.gainSp(15, "拼尽全力保卫队长");
        }
      },
      forceWhenOppression: true
    }
  ];
}

function buildNeylaSkills(unit) {
  return [
    {
      name: "迅捷射击",
      cost: 1,
      weight: 70,
      tags: ["ranged"],
      action(ctx) {
        const enemy = ctx.nearestEnemy(4);
        if (!enemy) return;
        ctx.applyDamage(enemy, 15, { spDamage: 5 });
      }
    },
    {
      name: "穿刺狙击",
      cost: 2,
      weight: 60,
      tags: ["ranged"],
      action(ctx) {
        const enemy = ctx.nearestEnemy(6);
        if (!enemy) return;
        ctx.applyDamage(enemy, 30, { bleed: { stacks: 1, duration: 2 } });
      }
    },
    {
      name: "双钩牵制",
      cost: 2,
      weight: 50,
      tags: ["ranged"],
      action(ctx) {
        const enemy = ctx.nearestEnemy(4);
        if (!enemy) return;
        ctx.applyDamage(enemy, 15, { stepDebuff: 2 });
      }
    },
    {
      name: "终末之影",
      cost: 3,
      weight: 30,
      tags: ["ranged"],
      action(ctx) {
        const enemy = ctx.nearestEnemy(10);
        if (!enemy) return;
        ctx.applyDamage(enemy, 50, { spDamage: 20 });
        ctx.unit.stepModifierNextTurn -= 1;
      }
    },
    {
      name: "执行。。。。",
      cost: 2,
      weight: 100,
      condition: (unit, game) => game.hasOppression,
      tags: ["ranged"],
      action(ctx) {
        const enemy = ctx.nearestEnemy(6);
        if (!enemy) return;
        ctx.applyDamage(enemy, 20);
        if (enemy.hp / enemy.maxHP <= 0.15) {
          enemy.receiveDamage(enemy.maxHP, { trueDamage: true, source: "执行终结" });
        }
        ctx.unit.receiveDamage(15, { trueDamage: true, source: "反噬" });
        ctx.unit.reduceSp(40, "执行消耗");
      },
      forceWhenOppression: true
    }
  ];
}

function buildKynSkills(unit) {
  return [
    {
      name: "迅影突刺",
      cost: 1,
      weight: 70,
      tags: ["melee"],
      action(ctx) {
        const enemy = ctx.nearestEnemy(3);
        if (!enemy) return;
        ctx.moveTowards(enemy, Math.max(1, manhattan(ctx.unit.position, enemy.position) - 1));
        ctx.applyDamage(enemy, 20);
      }
    },
    {
      name: "割喉飞刃",
      cost: 2,
      weight: 60,
      tags: ["ranged"],
      action(ctx) {
        const enemy = ctx.nearestEnemy(3);
        if (!enemy) return;
        ctx.applyDamage(enemy, 25, { spDamage: 5 });
      }
    },
    {
      name: "影杀之舞",
      cost: 2,
      weight: 50,
      tags: ["melee"],
      action(ctx) {
        const enemies = ctx.unit.game.units.filter((u) => u.team !== ctx.unit.team && !u.isDefeated());
        enemies.forEach((enemy) => {
          if (manhattan(enemy.position, ctx.unit.position) <= 1) {
            ctx.applyDamage(enemy, 30);
          }
        });
        ctx.unit.moveTowards(ctx.nearestEnemy() || ctx.unit, 1);
      }
    },
    {
      name: "死亡宣告",
      cost: 3,
      weight: 30,
      tags: ["melee"],
      action(ctx) {
        const enemy = ctx.nearestEnemy(5);
        if (!enemy) return;
        ctx.applyDamage(enemy, 50, { spDamage: 30 });
        if (enemy.hp / enemy.maxHP <= 0.3) {
          enemy.receiveDamage(enemy.maxHP, { trueDamage: true, source: "死亡宣告" });
        }
      }
    },
    {
      name: "自我了断。。。。",
      cost: 2,
      weight: 100,
      condition: (unit, game) => game.hasOppression,
      tags: ["melee"],
      action(ctx) {
        const enemy = ctx.nearestEnemy(5);
        if (!enemy) return;
        enemy.receiveDamage(enemy.maxHP, { trueDamage: true, source: "自我了断暗杀" });
        ctx.unit.receiveDamage(ctx.unit.hp, { trueDamage: true, source: "自我了断" });
      },
      forceWhenOppression: true
    }
  ];
}

const game = new Game();

const startBtn = document.getElementById("start-btn");
const stepBtn = document.getElementById("step-btn");
const autoBtn = document.getElementById("auto-btn");
const resetBtn = document.getElementById("reset-btn");
const delayInput = document.getElementById("auto-delay");

startBtn.addEventListener("click", () => {
  game.start();
  startBtn.disabled = true;
  stepBtn.disabled = false;
  autoBtn.disabled = false;
});

stepBtn.addEventListener("click", () => {
  game.nextAction();
});

autoBtn.addEventListener("click", () => {
  if (autoPlayState.interval) {
    clearInterval(autoPlayState.interval);
    autoPlayState.interval = null;
    autoBtn.textContent = "自动播放";
    return;
  }
  const delay = Number(delayInput.value) || 800;
  autoPlayState.delay = delay;
  autoBtn.textContent = "停止自动";
  autoPlayState.interval = setInterval(() => {
    game.nextAction();
  }, autoPlayState.delay);
});

resetBtn.addEventListener("click", () => {
  game.reset();
  stepBtn.disabled = true;
  autoBtn.disabled = true;
  startBtn.disabled = false;
  autoBtn.textContent = "自动播放";
});

delayInput.addEventListener("change", () => {
  const delay = Number(delayInput.value) || 800;
  autoPlayState.delay = delay;
  if (autoPlayState.interval) {
    clearInterval(autoPlayState.interval);
    autoPlayState.interval = setInterval(() => game.nextAction(), autoPlayState.delay);
  }
});
