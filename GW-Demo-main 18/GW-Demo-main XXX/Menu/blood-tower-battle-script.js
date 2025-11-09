(() => {
  const ROWS = 18;
  const COLS = 26;

  const CELL = (r, c) => `${r}-${c}`;
  const range = (start, end) => {
    const out = [];
    const step = start <= end ? 1 : -1;
    for (let i = start; step > 0 ? i <= end : i >= end; i += step) {
      out.push(i);
    }
    return out;
  };

  const rectCells = (r1, c1, r2, c2) => {
    const cells = [];
    const rows = range(Math.min(r1, r2), Math.max(r1, r2));
    const cols = range(Math.min(c1, c2), Math.max(c1, c2));
    rows.forEach((r) => {
      cols.forEach((c) => {
        cells.push(CELL(r, c));
      });
    });
    return cells;
  };

  const voidCells = new Set([
    ...rectCells(1, 8, 13, 12),
    ...rectCells(6, 18, 18, 21),
  ]);

  const coverCells = new Set([
    ...rectCells(3, 6, 5, 6),
    ...rectCells(1, 9, 7, 9),
    ...rectCells(1, 21, 5, 21),
    ...rectCells(13, 13, 13, 17),
    ...rectCells(13, 1, 13, 7),
  ]);

  const walls = {
    wall1: {
      id: 'wall1',
      name: '可摧毁墙体①',
      cells: rectCells(1, 21, 5, 21),
      fogZone: 'fog1',
      status: 'intact',
    },
    wall2: {
      id: 'wall2',
      name: '可摧毁墙体②',
      cells: rectCells(13, 13, 13, 17),
      fogZone: 'fog2',
      status: 'intact',
    },
    wall3: {
      id: 'wall3',
      name: '可摧毁墙体③',
      cells: rectCells(13, 1, 13, 7),
      fogZone: 'fog3',
      status: 'intact',
    },
  };

  const createFogZone = (id, name, cells) => ({
    id,
    name,
    cells,
    cellSet: new Set(cells),
  });

  const fogZones = {
    fog1: createFogZone('fog1', '墙体①后区域', rectCells(6, 19, 13, 23)),
    fog2: createFogZone('fog2', '墙体②后区域', rectCells(7, 13, 13, 18)),
    fog3: createFogZone('fog3', '墙体③后区域', rectCells(6, 2, 13, 11)),
  };

  const healingTiles = new Map();

  const PLAYER_UNITS = [
    { id: 'dario', name: 'Dario', label: 'Da', row: 16, col: 23, hp: 150, sp: 100 },
    { id: 'adora', name: 'Adora', label: 'Ad', row: 16, col: 24, hp: 100, sp: 100 },
    { id: 'karma', name: 'Karma', label: 'Ka', row: 16, col: 25, hp: 200, sp: 50 },
  ];

  const phases = [
    {
      id: 'phase0',
      label: '外围哨卫',
      description: '雏形与法形成员守在下层走廊入口。',
      enemies: [
        { id: 'p0-novice-a', name: '雏形赫雷西成员', label: '雏', row: 3, col: 23, hp: 150, sp: 70, role: 'enemy' },
        { id: 'p0-novice-b', name: '雏形赫雷西成员', label: '雏', row: 3, col: 25, hp: 150, sp: 70, role: 'enemy' },
        { id: 'p0-mage-a', name: '法形赫雷西成员', label: '法', row: 5, col: 24, hp: 100, sp: 90, role: 'enemy' },
        { id: 'p0-assassin-a', name: '刺形赫雷西成员', label: '刺', row: 18, col: 24, hp: 50, sp: 100, role: 'enemy' },
      ],
      afterClear() {
        logEvent('可摧毁墙体①的支撑崩解，厚重的阻隔开始破碎。');
        destroyWall('wall1');
        addHealingTile('heal-1', 3, 18, '恢复格（一次性）');
        scheduleFog('fog1', 2, '墙体①后区域将在 2 回合后被血雾填满。');
      },
    },
    {
      id: 'phase1',
      label: '二层增援',
      description: '增援部队自侧舱现身，试图拖住推进速度。',
      enemies: [
        { id: 'p1-mage-a', name: '法形赫雷西成员', label: '法', row: 3, col: 15, hp: 100, sp: 90, role: 'enemy' },
        { id: 'p1-novice-a', name: '雏形赫雷西成员', label: '雏', row: 10, col: 16, hp: 150, sp: 70, role: 'enemy' },
        { id: 'p1-novice-b', name: '雏形赫雷西成员', label: '雏', row: 10, col: 14, hp: 150, sp: 70, role: 'enemy' },
        { id: 'p1-novice-c', name: '雏形赫雷西成员', label: '雏', row: 8, col: 25, hp: 150, sp: 70, role: 'enemy' },
        { id: 'p1-assassin-a', name: '刺形赫雷西成员', label: '刺', row: 12, col: 15, hp: 50, sp: 100, role: 'enemy' },
      ],
      afterClear() {
        logEvent('可摧毁墙体②崩塌，视线延伸至核心走廊。');
        destroyWall('wall2');
        addHealingTile('heal-2', 16, 9, '恢复格（一次性）');
        scheduleFog('fog2', 2, '墙体②后的中央平台即将弥漫血雾。');
      },
    },
    {
      id: 'phase2',
      label: '核心卫队',
      description: '精英与刺形小队守住核心走廊，拖延时间。',
      enemies: [
        { id: 'p2-novice-a', name: '雏形赫雷西成员', label: '雏', row: 15, col: 2, hp: 150, sp: 70, role: 'enemy' },
        { id: 'p2-novice-b', name: '雏形赫雷西成员', label: '雏', row: 17, col: 2, hp: 150, sp: 70, role: 'enemy' },
        { id: 'p2-assassin-a', name: '刺形赫雷西成员', label: '刺', row: 16, col: 15, hp: 50, sp: 100, role: 'enemy' },
        { id: 'p2-assassin-b', name: '刺形赫雷西成员', label: '刺', row: 15, col: 13, hp: 50, sp: 100, role: 'enemy' },
        { id: 'p2-assassin-c', name: '刺形赫雷西成员', label: '刺', row: 17, col: 7, hp: 50, sp: 100, role: 'enemy' },
        { id: 'p2-elite', name: '赫雷西初代精英成员', label: '精', row: 16, col: 4, hp: 200, sp: 50, role: 'elite' },
      ],
      afterClear() {
        logEvent('核心尽头的可摧毁墙体③应声碎裂，一片血雾翻涌而出。');
        destroyWall('wall3');
        scheduleFog('fog3', 2, '墙体③后的最深区域将在 2 回合后完全被血雾侵蚀。');
        triggerMemberBCutscene();
      },
    },
    {
      id: 'phase3',
      label: '终局对决',
      description: '赫雷西成员B 亲自率队迎战，试图终结侵入者。',
      enemies: [
        { id: 'p3-novice-a', name: '雏形赫雷西成员', label: '雏', row: 10, col: 5, hp: 150, sp: 70, role: 'enemy' },
        { id: 'p3-novice-b', name: '雏形赫雷西成员', label: '雏', row: 10, col: 3, hp: 150, sp: 70, role: 'enemy' },
        { id: 'p3-mage-a', name: '法形赫雷西成员', label: '法', row: 4, col: 6, hp: 100, sp: 90, role: 'enemy' },
        { id: 'p3-mage-b', name: '法形赫雷西成员', label: '法', row: 4, col: 2, hp: 100, sp: 90, role: 'enemy' },
        { id: 'p3-boss', name: '组装型进阶赫雷西成员（成员B）', label: 'B', row: 2, col: 4, hp: 250, sp: 90, role: 'boss' },
      ],
      afterClear() {
        logEvent('血楼计划模拟完成，赫雷西成员B 的部队被彻底击溃。');
        handleVictory();
      },
    },
  ];

  const state = {
    round: 1,
    currentPhaseIndex: 0,
    completed: false,
    pendingFog: new Map(),
    activeFog: new Set(),
  };

  const units = new Map();
  const cellMap = new Map();

  const battleArea = document.getElementById('battleArea');
  const phaseLabel = document.getElementById('phaseLabel');
  const roundLabel = document.getElementById('roundLabel');
  const fogCountdownLabel = document.getElementById('fogCountdown');
  const allyList = document.getElementById('allyList');
  const enemyList = document.getElementById('enemyList');
  const logEl = document.getElementById('log');
  const advancePhaseBtn = document.getElementById('advancePhaseBtn');
  const simulateTurnBtn = document.getElementById('simulateTurnBtn');
  const resetBtn = document.getElementById('resetBtn');
  const accomplishModal = document.getElementById('accomplish');
  const confirmBtn = document.getElementById('confirmBtn');
  const defeatModal = document.getElementById('defeatModal');
  const defeatConfirmBtn = document.getElementById('defeatConfirmBtn');
  const towerAudio = document.getElementById('towerBGM');
  const memberAudio = document.getElementById('memberBGM');

  function setupGrid() {
    battleArea.style.setProperty('--rows', ROWS);
    battleArea.style.setProperty('--cols', COLS);
    battleArea.innerHTML = '';
    cellMap.clear();

    for (let r = 1; r <= ROWS; r += 1) {
      for (let c = 1; c <= COLS; c += 1) {
        const cell = document.createElement('div');
        cell.className = 'cell';
        const key = CELL(r, c);
        if (voidCells.has(key)) {
          cell.classList.add('void');
        }
        if (coverCells.has(key)) {
          cell.classList.add('cover');
        }
        battleArea.appendChild(cell);
        cellMap.set(key, cell);
      }
    }
  }

  function resetWalls() {
    Object.values(walls).forEach((wall) => {
      wall.status = 'intact';
      wall.cells.forEach((key) => {
        const cell = cellMap.get(key);
        if (cell) {
          cell.classList.remove('wall-ruined');
          cell.classList.add('wall-intact');
        }
      });
    });
  }

  function destroyWall(id) {
    const wall = walls[id];
    if (!wall || wall.status === 'destroyed') return;
    wall.status = 'destroyed';
    wall.cells.forEach((key) => {
      const cell = cellMap.get(key);
      if (cell) {
        cell.classList.remove('wall-intact');
        cell.classList.add('wall-ruined');
      }
    });
  }

  function addHealingTile(id, row, col, note) {
    const key = CELL(row, col);
    healingTiles.set(key, { id, row, col, note, consumed: false });
    logEvent(`恢复格出现在 (${row}, ${col}) —— 首位踏上的友军将回复全部 HP / SP 并获得一层鸡血。`);
    renderHealingTiles();
  }

  function renderHealingTiles() {
    cellMap.forEach((cell) => {
      cell.classList.remove('heal');
    });
    healingTiles.forEach((tile, key) => {
      if (!tile.consumed) {
        const cell = cellMap.get(key);
        if (cell) {
          cell.classList.add('heal');
        }
      }
    });
  }

  function scheduleFog(id, countdown, message) {
    const zone = fogZones[id];
    if (!zone) return;
    state.pendingFog.set(id, countdown);
    if (message) {
      logEvent(message);
    }
    updateFogVisuals();
    updateFogLabel();
  }

  function updateFogVisuals() {
    Object.values(fogZones).forEach((zone) => {
      zone.cells.forEach((key) => {
        const cell = cellMap.get(key);
        if (cell) {
          cell.classList.remove('fog-warning', 'blood-fog');
        }
      });
    });

    state.pendingFog.forEach((_, id) => {
      const zone = fogZones[id];
      if (!zone) return;
      zone.cells.forEach((key) => {
        const cell = cellMap.get(key);
        if (cell) {
          cell.classList.add('fog-warning');
        }
      });
    });

    state.activeFog.forEach((id) => {
      const zone = fogZones[id];
      if (!zone) return;
      zone.cells.forEach((key) => {
        const cell = cellMap.get(key);
        if (cell) {
          cell.classList.add('blood-fog');
        }
      });
    });
  }

  function updateFogLabel() {
    const fragments = [];
    state.pendingFog.forEach((value, id) => {
      const zone = fogZones[id];
      if (zone) {
        fragments.push(`${zone.name}：${value} 回合后血雾`);
      }
    });
    state.activeFog.forEach((id) => {
      const zone = fogZones[id];
      if (zone) {
        fragments.push(`${zone.name}：血雾生效`);
      }
    });
    fogCountdownLabel.textContent = fragments.length ? fragments.join(' / ') : '无血雾';
  }

  function spawnUnit(data, overrides = {}) {
    const unit = {
      id: data.id,
      name: data.name,
      label: data.label || data.name.slice(0, 2),
      row: data.row,
      col: data.col,
      hp: data.hp,
      maxHp: data.hp,
      sp: data.sp,
      maxSp: data.sp,
      side: overrides.side || (data.role === 'enemy' || data.role === 'elite' ? 'enemy' : data.role === 'boss' ? 'boss' : 'player'),
      role: data.role || overrides.role || 'enemy',
      phase: overrides.phase || null,
      status: {
        bleed: 0,
        resentment: 0,
      },
      alive: true,
    };
    units.set(unit.id, unit);
  }

  function removeUnit(id) {
    units.delete(id);
  }

  function spawnPlayers() {
    PLAYER_UNITS.forEach((unit) => {
      spawnUnit(unit, { side: 'player', role: 'player' });
    });
  }

  function spawnPhase(index) {
    const phase = phases[index];
    if (!phase) return;
    phase.enemies.forEach((enemy) => {
      spawnUnit(enemy, { side: enemy.role === 'boss' ? 'boss' : 'enemy', phase: phase.id });
    });
    logEvent(`【${phase.label}】${phase.description}`);
  }

  function renderUnits() {
    battleArea.querySelectorAll('.unit').forEach((node) => node.remove());
    units.forEach((unit) => {
      if (!unit.alive) return;
      const key = CELL(unit.row, unit.col);
      const cell = cellMap.get(key);
      if (!cell) return;
      const div = document.createElement('div');
      const classes = ['unit'];
      if (unit.side === 'player') {
        classes.push('player');
      } else if (unit.side === 'boss') {
        classes.push('boss');
      } else {
        classes.push('enemy');
      }
      div.className = classes.join(' ');
      div.textContent = unit.label;
      cell.appendChild(div);
    });
  }

  function renderRoster() {
    const allies = [];
    const enemies = [];
    units.forEach((unit) => {
      if (unit.side === 'player') {
        allies.push(unit);
      } else {
        enemies.push(unit);
      }
    });

    const createCard = (unit) => {
      const li = document.createElement('li');
      const classes = ['unit-card'];
      if (unit.side === 'boss') {
        classes.push('boss');
      } else if (unit.side === 'enemy') {
        classes.push(unit.role === 'elite' ? 'boss' : 'enemy');
      }
      li.className = classes.join(' ');

      const header = document.createElement('header');
      const title = document.createElement('h5');
      title.textContent = unit.name;
      const meta = document.createElement('span');
      meta.textContent = unit.side === 'player' ? '我方' : unit.role === 'elite' ? '精英' : unit.side === 'boss' ? '小Boss' : '敌方';
      header.appendChild(title);
      header.appendChild(meta);
      li.appendChild(header);

      const bars = document.createElement('div');
      bars.className = 'bars';
      const hpBar = document.createElement('div');
      hpBar.className = 'bar hp';
      const hpSpan = document.createElement('span');
      hpSpan.style.width = `${Math.max(0, Math.round((unit.hp / unit.maxHp) * 100))}%`;
      hpBar.appendChild(hpSpan);
      const spBar = document.createElement('div');
      spBar.className = 'bar sp';
      const spSpan = document.createElement('span');
      spSpan.style.width = `${Math.max(0, Math.round((unit.sp / unit.maxSp) * 100))}%`;
      spBar.appendChild(spSpan);
      bars.appendChild(hpBar);
      bars.appendChild(spBar);
      li.appendChild(bars);

      const statusLine = document.createElement('div');
      statusLine.className = 'status';
      const statusParts = [];
      if (!unit.alive) {
        statusParts.push('阵亡');
      }
      if (unit.status.bleed) {
        statusParts.push(`流血 ×${unit.status.bleed}`);
      }
      if (unit.status.resentment) {
        statusParts.push(`怨念 ×${unit.status.resentment}`);
      }
      if (!statusParts.length) {
        statusParts.push('状态稳定');
      }
      statusLine.textContent = statusParts.join(' | ');
      li.appendChild(statusLine);
      return li;
    };

    allyList.innerHTML = '';
    allies
      .sort((a, b) => a.name.localeCompare(b.name))
      .forEach((unit) => {
        allyList.appendChild(createCard(unit));
      });

    enemyList.innerHTML = '';
    enemies
      .sort((a, b) => a.name.localeCompare(b.name))
      .forEach((unit) => {
        enemyList.appendChild(createCard(unit));
      });
  }

  function updatePhaseLabel() {
    const phase = phases[state.currentPhaseIndex];
    if (!phase) {
      phaseLabel.textContent = '全部波次已完成';
    } else {
      phaseLabel.textContent = `${phase.label}（${state.currentPhaseIndex + 1}/${phases.length}）`;
    }
  }

  function updateRoundLabel() {
    roundLabel.textContent = `第 ${state.round} 回合`;
  }

  function updateButtons() {
    const done = state.completed;
    advancePhaseBtn.disabled = done || state.currentPhaseIndex >= phases.length;
    simulateTurnBtn.disabled = done;
  }

  function renderAll() {
    renderUnits();
    renderRoster();
    renderHealingTiles();
    updateFogVisuals();
    updatePhaseLabel();
    updateRoundLabel();
    updateFogLabel();
    updateButtons();
  }

  function logEvent(message) {
    if (!logEl) return;
    const entry = document.createElement('div');
    entry.className = 'log-entry';
    entry.innerHTML = `<strong>·</strong> ${message}`;
    logEl.appendChild(entry);
    logEl.scrollTop = logEl.scrollHeight;
  }

  function startPhase(index) {
    if (index >= phases.length) {
      handleVictory();
      return;
    }
    state.currentPhaseIndex = index;
    spawnPhase(index);
    renderAll();
  }

  function advancePhase() {
    if (state.completed) return;
    const phase = phases[state.currentPhaseIndex];
    if (!phase) {
      handleVictory();
      return;
    }

    let removed = 0;
    phase.enemies.forEach((enemy) => {
      if (units.has(enemy.id)) {
        removeUnit(enemy.id);
        removed += 1;
      }
    });
    if (removed > 0) {
      logEvent(`模拟击破「${phase.label}」全部敌人（${removed} 单位）。`);
    }

    if (typeof phase.afterClear === 'function') {
      phase.afterClear();
    }

    const nextIndex = state.currentPhaseIndex + 1;
    if (nextIndex < phases.length) {
      startPhase(nextIndex);
    } else {
      renderAll();
    }
  }

  function simulateTurn() {
    if (state.completed) return;
    state.round += 1;

    const activated = [];
    state.pendingFog.forEach((value, id) => {
      const next = value - 1;
      if (next <= 0) {
        state.pendingFog.delete(id);
        state.activeFog.add(id);
        activated.push(id);
      } else {
        state.pendingFog.set(id, next);
      }
    });

    activated.forEach((id) => {
      const zone = fogZones[id];
      if (zone) {
        logEvent(`${zone.name} 的血雾全面扩散，滞留单位将持续受创！`);
      }
    });

    const damageReports = [];
    state.activeFog.forEach((id) => {
      const zone = fogZones[id];
      if (!zone) return;
      const affected = [];
      units.forEach((unit) => {
        if (!unit.alive) return;
        const key = CELL(unit.row, unit.col);
        if (!zone.cellSet.has(key)) return;
        unit.hp = Math.max(0, unit.hp - 50);
        unit.sp = Math.max(0, unit.sp - 50);
        unit.status.bleed += 10;
        unit.status.resentment += 10;
        if (unit.hp === 0) {
          unit.alive = false;
          affected.push(`${unit.name}（阵亡）`);
        } else {
          affected.push(`${unit.name}（HP/SP -50）`);
        }
      });
      if (affected.length) {
        damageReports.push(`${zone.name}：${affected.join('，')}`);
      }
    });

    const hasActiveFog = state.activeFog.size > 0;
    const hasPendingFog = state.pendingFog.size > 0;

    if (damageReports.length) {
      logEvent(`血雾伤害结算 —— ${damageReports.join(' / ')}`);
    } else if (hasActiveFog) {
      logEvent('血雾仍在翻涌，但本回合没有单位受到额外伤害。');
    } else if (hasPendingFog) {
      logEvent('血雾正在酝酿中，请留意倒计时。');
    } else {
      logEvent('周遭暂无血雾压迫，队伍继续推进。');
    }

    updateFogVisuals();
    renderAll();
  }

  function recordCompletion() {
    try {
      const key = 'gwdemo_stage_completions';
      const stored = localStorage.getItem(key);
      const completions = stored ? JSON.parse(stored) : {};
      completions.bloodTowerPlan = (completions.bloodTowerPlan || 0) + 1;
      localStorage.setItem(key, JSON.stringify(completions));
    } catch (error) {
      console.warn('Failed to record stage completion', error);
    }
  }

  function handleVictory() {
    if (state.completed) return;
    state.completed = true;
    updateButtons();
    renderAll();
    tryStopAudio(memberAudio);
    tryStopAudio(towerAudio);
    recordCompletion();
    setTimeout(() => {
      accomplishModal.classList.remove('hidden');
    }, 320);
  }

  function resetSimulation(logIntro = true) {
    units.clear();
    healingTiles.clear();
    state.round = 1;
    state.currentPhaseIndex = 0;
    state.completed = false;
    state.pendingFog = new Map();
    state.activeFog = new Set();
    resetWalls();
    renderHealingTiles();
    updateFogVisuals();
    updateFogLabel();
    spawnPlayers();
    renderAll();
    if (logIntro) {
      if (logEl) {
        logEl.innerHTML = '';
      }
      logEvent('血楼计划演算已启动 —— 塔楼内部结构分为三层封锁，请逐一击破。');
    }
    tryStopAudio(memberAudio);
    tryPlayAudio(towerAudio, 0.62);
    startPhase(0);
  }

  function triggerMemberBCutscene() {
    tryStopAudio(towerAudio);
    tryPlayAudio(memberAudio, 0.72);
    logEvent('赫雷西成员B 缓步出现，语气诚挚却满载敌意。');
    logEvent('成员B：我真的非常尊重你们。');
    logEvent('成员B：你们能走到这里，完全证明了你们的意志与信念。');
    logEvent('成员B：真是可惜，我们立场不同啊……但愿来世相认时，再当挚友吧。');
  }

  function tryPlayAudio(audio, volume = 0.7) {
    if (!audio) return;
    try {
      audio.volume = volume;
      audio.currentTime = 0;
      const playPromise = audio.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(() => {});
      }
    } catch (error) {
      console.warn('Audio play failed', error);
    }
  }

  function tryStopAudio(audio) {
    if (!audio) return;
    try {
      audio.pause();
      audio.currentTime = 0;
    } catch (error) {
      console.warn('Audio stop failed', error);
    }
  }

  function showDefeatModal() {
    defeatModal.classList.remove('hidden');
  }

  function hideDefeatModal() {
    defeatModal.classList.add('hidden');
  }

  advancePhaseBtn.addEventListener('click', advancePhase);
  simulateTurnBtn.addEventListener('click', simulateTurn);
  resetBtn.addEventListener('click', () => {
    resetSimulation(true);
    logEvent('模拟被重置，所有单位与墙体回到初始状态。');
    showDefeatModal();
  });
  confirmBtn.addEventListener('click', () => {
    window.location.href = 'index.html';
  });
  defeatConfirmBtn.addEventListener('click', () => {
    hideDefeatModal();
  });

  setupGrid();
  resetSimulation();
})();
