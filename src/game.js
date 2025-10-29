import { createMap } from './map.js';
import { UNIT_DEFINITIONS } from './units.js';

export class Game {
  constructor() {
    this.map = createMap();
    this.units = [];
    this.unitIndex = new Map();
    this.round = 1;
    this.turnSide = 'allies';
    this.activeSideLabel = '守方';
    this.pendingUnits = [];
    this.activeUnit = null;
    this.sideRounds = { allies: 1, enemies: 1 };
    this.log = [];
    this.isFinished = false;
  }

  init() {
    UNIT_DEFINITIONS.forEach((def) => {
      const unit = def.factory(this);
      this.units.push(unit);
      this.unitIndex.set(unit.id, unit);
      this.map.placeUnit(unit);
    });
    this.sortUnits();
    this.writeLog('战斗开始！');
  }

  sortUnits() {
    this.units.sort((a, b) => {
      if (a.side === b.side) {
        return b.level - a.level;
      }
      return a.side === 'allies' ? -1 : 1;
    });
  }

  getUnit(id) {
    return this.unitIndex.get(id) || null;
  }

  getAliveUnits(side) {
    return this.units.filter((u) => u.side === side && !u.isDead);
  }

  step() {
    if (this.isFinished) return;

    if (!this.activeUnit) {
      if (this.pendingUnits.length === 0) {
        if (!this.startSideTurn(this.turnSide)) {
          return;
        }
      }
      this.activeUnit = this.pendingUnits.shift() || null;
      if (!this.activeUnit) return;
      if (this.activeUnit.isDead || this.activeUnit.stunnedTurns > 0) {
        const unit = this.activeUnit;
        if (!unit.isDead) {
          unit.consumeStunTurn(this);
        }
        this.endUnitTurn();
        return this.step();
      }
      this.activeUnit.beginTurn(this);
      this.writeLog(`<strong>${this.activeUnit.name}</strong> 开始行动（剩余步数 ${this.activeUnit.remainingSteps}）。`);
    }

    if (!this.activeUnit) return;

    const result = this.activeUnit.takeAction(this);
    if (result) {
      this.writeLog(result);
    }

    if (this.activeUnit.remainingSteps <= 0 || this.activeUnit.turnEnded) {
      this.activeUnit.finishTurn(this);
      this.endUnitTurn();
    }

    this.checkWinCondition();
  }

  startSideTurn(side) {
    const living = this.getAliveUnits(side);
    if (living.length === 0) {
      this.writeLog(`${side === 'allies' ? '守方' : '七海作战队'} 无人可战。`);
      this.finishSideTurn();
      this.checkWinCondition();
      return false;
    }
    this.activeSideLabel = side === 'allies' ? '守方' : '七海作战队';
    this.pendingUnits = living.slice();
    this.pendingUnits.forEach((unit) => unit.prepareSideTurn(this));
    return true;
  }

  finishSideTurn() {
    const finishedSide = this.turnSide;
    this.turnSide = finishedSide === 'allies' ? 'enemies' : 'allies';
    this.pendingUnits = [];
    this.activeUnit = null;
    this.sideRounds[finishedSide] += 1;
    if (finishedSide === 'enemies') {
      this.round += 1;
      this.onNewRound();
    }
  }

  endUnitTurn() {
    if (!this.activeUnit) return;
    this.writeLog(`<strong>${this.activeUnit.name}</strong> 结束行动。`);
    this.activeUnit = null;
    if (this.pendingUnits.length === 0) {
      this.finishSideTurn();
    }
  }

  onNewRound() {
    this.writeLog(`进入第 ${this.round} 回合。`);
    this.units.forEach((unit) => unit.onRoundStart(this));
  }

  removeUnit(unit) {
    this.map.removeUnit(unit);
  }

  writeLog(message) {
    this.log.push(message);
  }

  checkWinCondition() {
    const alliesAlive = this.getAliveUnits('allies');
    const enemiesAlive = this.getAliveUnits('enemies');
    if (alliesAlive.length === 0 || enemiesAlive.length === 0) {
      this.isFinished = true;
      if (alliesAlive.length === 0 && enemiesAlive.length === 0) {
        this.writeLog('双方同归于尽，战斗以平局结束。');
      } else if (alliesAlive.length === 0) {
        this.writeLog('<strong>七海作战队</strong> 获得胜利。');
      } else {
        this.writeLog('<strong>守方</strong> 获得胜利。');
      }
    }
  }
}
