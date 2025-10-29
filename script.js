import { Game } from './src/game.js';

const boardEl = document.getElementById('board');
const unitListEl = document.getElementById('unitList');
const logEl = document.getElementById('log');
const roundEl = document.getElementById('roundDisplay');
const sideEl = document.getElementById('activeSide');
const activeUnitEl = document.getElementById('activeUnit');

const startBtn = document.getElementById('startBtn');
const nextBtn = document.getElementById('nextBtn');
const autoBtn = document.getElementById('autoBtn');
const resetBtn = document.getElementById('resetBtn');
const autoDelayInput = document.getElementById('autoDelay');

let game = null;
let autoTimer = null;

function renderBoard(game) {
  boardEl.innerHTML = '';
  const { width, height } = game.map;
  for (let row = height - 1; row >= 0; row--) {
    for (let col = 0; col < width; col++) {
      const cell = document.createElement('div');
      const tile = game.map.getTile(col, row);
      cell.className = `cell ${tile.type}`;
      if (tile.unitId) {
        const unit = game.getUnit(tile.unitId);
        if (unit) {
          const chip = document.createElement('div');
          chip.className = `unit-chip ${unit.side}`;
          chip.textContent = unit.shortName;
          cell.appendChild(chip);
        }
      }
      boardEl.appendChild(cell);
    }
  }
}

function renderUnits(game) {
  unitListEl.innerHTML = '';
  const template = document.getElementById('unitCardTemplate');
  game.units.forEach((unit) => {
    const clone = template.content.firstElementChild.cloneNode(true);
    clone.querySelector('.unit-name').textContent = `${unit.name}（Lv.${unit.level}）`;
    clone.querySelector('.unit-pos').textContent = `(${unit.position.x}, ${unit.position.y})`;

    const hpPercent = (unit.hp / unit.maxHp) * 100;
    const spPercent = (unit.sp / unit.maxSp) * 100;
    clone.querySelector('.bar.hp .value').style.width = `${Math.max(0, Math.min(100, hpPercent))}%`;
    clone.querySelector('.bar.sp .value').style.width = `${Math.max(0, Math.min(100, spPercent))}%`;

    const stats = clone.querySelector('.unit-stats');
    stats.innerHTML = `
      <li><strong>HP：</strong>${unit.hp.toFixed(1)} / ${unit.maxHp}</li>
      <li><strong>SP：</strong>${unit.sp.toFixed(1)} / ${unit.maxSp}</li>
      <li><strong>步数上限：</strong>${unit.maxSteps}</li>
      <li><strong>可用步数：</strong>${unit.remainingSteps}</li>
      <li><strong>眩晕层数：</strong>${unit.stunLayers}</li>
      <li><strong>眩晕：</strong>${unit.stunnedTurns}</li>
    `;

    const buffContainer = clone.querySelector('.buffs');
    unit.getBuffTags().forEach((tag) => {
      const span = document.createElement('span');
      span.className = 'buff-tag';
      span.textContent = tag;
      buffContainer.appendChild(span);
    });

    unitListEl.appendChild(clone);
  });
}

function renderLog(game) {
  logEl.innerHTML = '';
  game.log.slice(-200).forEach((entry) => {
    const div = document.createElement('div');
    div.className = 'log-entry';
    div.innerHTML = entry;
    logEl.appendChild(div);
  });
  logEl.scrollTop = logEl.scrollHeight;
}

function syncUI(game) {
  renderBoard(game);
  renderUnits(game);
  renderLog(game);
  roundEl.textContent = game.round;
  sideEl.textContent = game.activeSideLabel;
  activeUnitEl.textContent = game.activeUnit ? game.activeUnit.name : '-';
}

function stopAutoPlay() {
  if (autoTimer) {
    clearInterval(autoTimer);
    autoTimer = null;
    autoBtn.textContent = '自动播放';
  }
}

startBtn.addEventListener('click', () => {
  game = new Game();
  game.init();
  syncUI(game);
  startBtn.disabled = true;
  nextBtn.disabled = false;
  autoBtn.disabled = false;
  resetBtn.disabled = false;
});

nextBtn.addEventListener('click', () => {
  if (!game || game.isFinished) return;
  game.step();
  syncUI(game);
  if (game.isFinished) {
    stopAutoPlay();
    nextBtn.disabled = true;
    autoBtn.disabled = true;
  }
});

autoBtn.addEventListener('click', () => {
  if (!game || game.isFinished) return;
  if (autoTimer) {
    stopAutoPlay();
    return;
  }
  autoBtn.textContent = '暂停自动';
  const delay = Math.max(200, Number(autoDelayInput.value) || 1200);
  autoTimer = setInterval(() => {
    if (!game || game.isFinished) {
      stopAutoPlay();
      return;
    }
    game.step();
    syncUI(game);
    if (game.isFinished) {
      stopAutoPlay();
      nextBtn.disabled = true;
      autoBtn.disabled = true;
    }
  }, delay);
});

resetBtn.addEventListener('click', () => {
  stopAutoPlay();
  game = null;
  boardEl.innerHTML = '';
  unitListEl.innerHTML = '';
  logEl.innerHTML = '';
  roundEl.textContent = '-';
  sideEl.textContent = '-';
  activeUnitEl.textContent = '-';
  startBtn.disabled = false;
  nextBtn.disabled = true;
  autoBtn.disabled = true;
  resetBtn.disabled = true;
});
