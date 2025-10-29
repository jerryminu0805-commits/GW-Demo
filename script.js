const screens = Array.from(document.querySelectorAll('.screen'));
const mask = document.querySelector('.transition-mask');
const toast = document.querySelector('.toast');
let currentScreen = 'menu';
let maskBusy = false;

const stageData = {
  intro: {
    title: 'Intro',
    subtitle: '初次接触战术系统',
    meta: ['推荐等级 Lv.1', '步数上限 6', '目标：熟悉指令与掩体'],
    description: `
      <h4>关卡概要</h4>
      <p>第一次部署三人小队，学习掩体与基础步数管理。敌方只有近战异端，提供安全的实战演练空间。</p>
      <ul>
        <li>引导玩家理解 HP / SP 的互动。</li>
        <li>展示基础绿色与蓝色技能卡的抽取与使用。</li>
        <li>掩体的存在提醒玩家规避正面伤害。</li>
      </ul>
    `,
    map: {
      width: 12,
      height: 10,
      coverCells: [
        { x: 5, y: 5 },
        { x: 6, y: 5 },
        { x: 5, y: 6 },
        { x: 6, y: 6 },
        { x: 9, y: 3 },
        { x: 9, y: 4 },
        { x: 9, y: 5 },
      ],
      heroSpawns: [
        { x: 2, y: 2 },
        { x: 3, y: 2 },
        { x: 4, y: 2 },
      ],
      enemySpawns: [
        { x: 10, y: 8 },
        { x: 11, y: 8 },
      ],
      voidRects: [],
    },
  },
  limit: {
    title: '疲惫的极限',
    subtitle: '管理精神力的演练',
    meta: ['推荐等级 Lv.15', '步数上限 8', '目标：维持 SP 与行动节奏'],
    description: `
      <h4>关卡概要</h4>
      <p>强调在资源紧张时维持输出，敌方加入了范围压制与恐惧效果。玩家需要通过合理走位与恢复卡片抵抗精神消耗。</p>
      <ul>
        <li>教学眩晕层数与恐惧的叠加管理。</li>
        <li>引导使用粉色与橘色增益技能。</li>
        <li>阶段目标：撑过 6 回合或击败头目。</li>
      </ul>
    `,
    map: {
      width: 14,
      height: 12,
      coverCells: [
        { x: 4, y: 4 },
        { x: 5, y: 4 },
        { x: 4, y: 5 },
        { x: 5, y: 5 },
        { x: 10, y: 7 },
        { x: 10, y: 8 },
      ],
      heroSpawns: [
        { x: 2, y: 2 },
        { x: 3, y: 2 },
        { x: 4, y: 2 },
      ],
      enemySpawns: [
        { x: 11, y: 10 },
        { x: 12, y: 9 },
        { x: 12, y: 11 },
      ],
      voidRects: [{ x: 12, y: 1, width: 3, height: 4 }],
    },
  },
  seven: {
    title: '七海',
    subtitle: '七海作战队遭遇战',
    meta: ['推荐等级 Lv.35+', '步数上限 10', '目标：击败 Haz 与七海作战队'],
    description: `
      <h4>关卡概要</h4>
      <p>废弃码头 18×22 战术区域。Haz 率领七海作战队登场，初始便对全队施加“作战余波” Debuff，削减生命与输出。</p>
      <ul>
        <li>地图右下方存在 8×10 的缺口，需要调整推进路线。</li>
        <li>多处掩体保护敌方狙击与防御单位，必须绕后或使用位移技能。</li>
        <li>Boss 机制：猎杀标记、队长压迫、以及 20 回合后的禁忌技能解锁。</li>
      </ul>
      <p>Haz、Katz、Tusk、Neyla、Kyn 各自携带不同技能池，进入战斗前可预览所有敌方技能，但禁忌技能保持锁定状态。</p>
    `,
    map: {
      width: 22,
      height: 18,
      coverCells: [
        // 方形掩体 (2,3)-(4,5)
        { x: 2, y: 3 },
        { x: 2, y: 4 },
        { x: 2, y: 5 },
        { x: 3, y: 3 },
        { x: 3, y: 4 },
        { x: 3, y: 5 },
        { x: 4, y: 3 },
        { x: 4, y: 4 },
        { x: 4, y: 5 },
        // 长方形掩体 (2,12)-(5,14)
        { x: 2, y: 12 },
        { x: 2, y: 13 },
        { x: 2, y: 14 },
        { x: 3, y: 12 },
        { x: 3, y: 13 },
        { x: 3, y: 14 },
        { x: 4, y: 12 },
        { x: 4, y: 13 },
        { x: 4, y: 14 },
        { x: 5, y: 12 },
        { x: 5, y: 13 },
        { x: 5, y: 14 },
        // 方形掩体 (10,11)-(12,13)
        { x: 10, y: 11 },
        { x: 10, y: 12 },
        { x: 10, y: 13 },
        { x: 11, y: 11 },
        { x: 11, y: 12 },
        { x: 11, y: 13 },
        { x: 12, y: 11 },
        { x: 12, y: 12 },
        { x: 12, y: 13 },
      ],
      heroSpawns: [
        { x: 3, y: 2, label: 'Adora' },
        { x: 5, y: 2, label: 'Karma' },
        { x: 7, y: 2, label: 'Dario' },
      ],
      enemySpawns: [
        { x: 21, y: 4, label: 'Haz' },
        { x: 19, y: 6, label: 'Tusk' },
        { x: 19, y: 3, label: 'Katz' },
        { x: 15, y: 2, label: 'Neyla' },
        { x: 15, y: 7, label: 'Kyn' },
      ],
      voidRects: [{ x: 15, y: 1, width: 8, height: 10 }],
    },
  },
};

const tutorialContent = {
  basics: `
    <h4>Hp / Sp</h4>
    <ul>
      <li>HP 降为 0 时该单位阵亡。</li>
      <li>SP 降为 0 会使单位陷入<span class="highlight">眩晕</span>，并减少 1 步；眩晕结束时会恢复部分 SP（每个单位不同）。</li>
    </ul>
    <h4>步数</h4>
    <ul>
      <li>双方初始 3 步，每回合结束都会额外获得 1 步。</li>
      <li>若双方平均等级存在差距，更高的一方每回合额外 +2 步。</li>
      <li>步数是所有行动与技能的费用，上限为 10（可被技能增减）。</li>
    </ul>
    <h4>回合与掩体</h4>
    <ul>
      <li>我方完成行动与敌方完成行动各计 1 回合。</li>
      <li>掩体可阻挡非范围攻击，无法穿越。</li>
    </ul>
  `,
  skills: `
    <h4>技能颜色分类</h4>
    <ul>
      <li><span class="skill-tag green">绿色（1 步）</span>：普通攻击。</li>
      <li><span class="skill-tag blue">蓝色（2 步）</span>：移动或位移技能。</li>
      <li><span class="skill-tag red">红色（3 步以上）</span>：大招。</li>
      <li><span class="skill-tag white">白色（可变）</span>：自带被动效果的技能。</li>
      <li><span class="skill-tag pink">粉色（2 步以上）</span>：常规增益技能。</li>
      <li><span class="skill-tag orange">橘色（2 步以上）</span>：特异增益技能。</li>
    </ul>
    <h4>机制说明</h4>
    <ul>
      <li>多阶段攻击：单张技能分多段打击，每段可带有额外效果与不同范围。</li>
      <li>被动：无需主动发动的常驻效果。</li>
    </ul>
  `,
  effects: `
    <h4>特殊效果（目前）</h4>
    <ul>
      <li>流血：每回合损失 5% HP，持续 2 回合，可叠加。</li>
      <li>眩晕层数：可叠加，无额外效果，达到阈值后触发眩晕 Debuff。</li>
      <li>眩晕 Debuff：达到需求层数后失去行动 1 回合并消耗 1 层眩晕 Debuff。</li>
      <li>恐惧：下回合 -1 步，可叠加。</li>
      <li>鸡血：下一次攻击伤害 ×2，使用后消耗，单体最多 1 层（多段攻击在最后一段结算）。</li>
      <li>依赖：下一次攻击造成真实伤害并将自身 SP 归零，使用后消耗，单体最多 1 层。</li>
      <li>“恢复” Buff：下一大回合开始时回复 5 HP 并消耗 1 层，每个大回合只会消耗 1 层，可叠加。</li>
    </ul>
  `,
  enemies: `
    <h4>敌人类型</h4>
    <ul>
      <li>普通：无特殊机制。</li>
      <li>高级：<em>暂未出现</em>。</li>
      <li>精英：如「精英」敌人需 2 层眩晕层数才会转化为 1 层眩晕 Debuff，秒杀技能仅造成 100 HP。</li>
      <li>小 Boss：如「小Boss」敌人需 3 层眩晕层数，秒杀技能仅造成 80 HP，免疫拉扯。</li>
      <li>Boss：需 4 层眩晕层数，秒杀技能造成 75 HP，免疫位移。</li>
      <li>特殊：？？？</li>
    </ul>
    <p>七海作战队全员在战斗开始时都会获得「作战余波」Debuff（-25% HP，-5 对敌伤害）。</p>
  `,
};

const characterData = {
  adora: {
    level: 20,
    intro: `
      <h3>Adora</h3>
      <p>名字在西班牙语中意为「崇拜」，也与「收养」相关。九岁生日当天遭遇异端暴走，父母罹难并失去左眼，此后与 Karma、Dario 相依为命。</p>
      <ul>
        <li>通常穿着舒适毛衣，深灰长发垂至身躯下半部。</li>
        <li>6 岁结识 Karma 与 Dario，9～15 岁长期抑郁，但成绩名列前茅。</li>
        <li>不喜暴力却愿为朋友致命，下意识守护同伴。</li>
        <li>9 岁后几乎不摘帽子，16 岁才摘下眼罩；左眼钉子封印伤痕。</li>
        <li>喜欢汽水，偶尔孩子气，现年 18 岁，身高 169 cm，生日 8 月 4 日。</li>
      </ul>
    `,
    skills: `
      <h3>技能概览</h3>
      <p>HP：100｜SP：100（降至 0 时失控 1 回合并 -1 步，后恢复 50% SP）</p>
      <ul>
        <li>被动：背刺——从背后攻击伤害 ×1.5。</li>
        <li>被动：冷静分析——若回合内未行动，恢复 10 SP。</li>
        <li>被动：啊啊啊你们没事吧？！——6×6 范围内存在友方时回复其 5% HP 与 5 SP。</li>
        <li>被动：对战斗的恐惧——SP &lt; 10 时伤害 ×1.5。</li>
        <li>短匕轻挥！（绿·1 步）：前方 1 格，10 伤害 + 5 精神伤害（80% 抽取率）。</li>
        <li>枪击（灰·1 步）：直线列目标 10 伤害 + 5 精神伤害（需手枪道具，65%）。</li>
        <li>呀！你不要靠近我呀！！（蓝·2 步）：可选周围任意 5 格移动，对方 HP &lt; 50% 时追击「短匕轻挥！」（40%）。</li>
        <li>自制粉色迷你电击装置！（红·3 步）：前方 2 格，10 伤害 + 15 精神伤害并麻痹（30%）。</li>
        <li>25 级解锁——略懂的医术！（粉·2 步）：5×5 范围友方回复 20 HP + 15 SP，并赋予「恢复」Buff（30%）。</li>
        <li>25 级解锁——加油哇！（橘·4 步）：5×5 范围友方获得「鸡血」Buff（20%）。</li>
        <li>35 级解锁——只能靠你了。。（橘·4 步）：牺牲 25 HP，赋予友方「依赖」Buff（15%）。</li>
      </ul>
    `,
  },
  karma: {
    level: 20,
    intro: `
      <h3>Karma</h3>
      <p>名字象征「命运与行动」。自幼与 Dario 相识，幼儿园时结识 Adora。童年长期处于家暴与争吵之中，九岁后搬离家庭。</p>
      <ul>
        <li>平时衬衫配黑裤，栗红短发，身后胎记呈红色十字。</li>
        <li>偏爱暴力但在 Adora 影响下渐懂克制，性格直接易冲动。</li>
        <li>力量极强，校园体育纪录保持者，喜欢能量饮料与酒精。</li>
        <li>曾抽烟但改用电子烟；幼时误以为 Adora 为女孩而暗恋。</li>
        <li>现年 19 岁，身高 189 cm，生日 4 月 14 日。</li>
      </ul>
    `,
    skills: `
      <h3>技能概览</h3>
      <p>HP：200｜SP：50（降至 0 时失控 1 回合、-1 步并损失 20 HP，后恢复 50% SP）</p>
      <ul>
        <li>被动：暴力瘾——连续攻击伤害 ×1.5，连击 ≥3 时追加「沙包大的拳头」，4 连后 -5 SP。</li>
        <li>被动：强悍的肉体——受到伤害 ×0.75。</li>
        <li>被动：自尊心——根据失去的 HP 增加伤害（1% 换 0.5%）。</li>
        <li>沙包大的拳头（绿·1 步）：15 伤害（80%）。</li>
        <li>枪击（灰·1 步）：直线 10 伤害 + 5 精神伤害（需手枪，道具 65%）。</li>
        <li>都听你的（蓝·2 步）：可选周围任意 3 格并回复 5 SP（40%）。</li>
        <li>嗜血之握（红·3 步）：连用四次基础攻击后抓取，非 Boss 75/80/100 伤害并处决（30%）。</li>
        <li>25 级解锁——深呼吸（白·2 步）：主动恢复全部 SP + 10 HP；若未出现在技能池则 +10% 伤害（唯一，20%）。</li>
      </ul>
    `,
  },
  dario: {
    level: 20,
    intro: `
      <h3>Dario</h3>
      <p>名字意为「财富」。六岁时父母离奇失踪，遗留大量资产，与两位好友在豪宅据点活动，爱把暴力当作艺术。</p>
      <ul>
        <li>正式衬衫配黑裤，佩戴美元符号发夹，浅棕头发常束起。</li>
        <li>左手因事故更换为黑色机械手臂，性格轻松却难以真正快乐。</li>
        <li>喜欢茶与精致打扮，笑时露出价值高昂的金牙。</li>
        <li>体育成绩优异，热衷暴力以寻求刺激。</li>
        <li>现年 19 岁，身高 187 cm，生日 5 月 24 日。</li>
      </ul>
    `,
    skills: `
      <h3>技能概览</h3>
      <p>HP：150｜SP：100（降至 0 时失控 1 回合并 -1 步，后恢复 75% SP）</p>
      <ul>
        <li>被动：快速调整——失控后额外恢复 25% SP。</li>
        <li>被动：反击——受伤有 50% 几率反击「机械爪击」。</li>
        <li>被动：士气鼓舞——每个 5 的倍数回合为全队回复 15 SP。</li>
        <li>机械爪击（绿·1 步）：前方 2 格 15 伤害，15% 几率眩晕（80%）。</li>
        <li>枪击（灰·1 步）：直线 10 伤害 + 5 精神伤害（需手枪，65%）。</li>
        <li>迅捷步伐（蓝·2 步）：可选周围 4 格并削减最近敌人 5 SP（40%）。</li>
        <li>拿来吧你！（红·3 步）：直线拉至面前并眩晕，Boss 仅受眩晕与 SP 伤害（30%）。</li>
        <li>25 级解锁——先苦后甜（橘·4 步）：下一回合 +4 步（唯一，15%）。</li>
      </ul>
    `,
  },
};

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  window.clearTimeout(showToast.timeout);
  showToast.timeout = window.setTimeout(() => {
    toast.classList.remove('show');
  }, 2200);
}

function playTransition(onMiddle) {
  if (maskBusy) return;
  maskBusy = true;
  mask.classList.remove('intro', 'reveal');
  mask.classList.add('cover');

  const handleCoverEnd = () => {
    mask.removeEventListener('animationend', handleCoverEnd);
    onMiddle?.();
    mask.classList.remove('cover');
    mask.classList.add('reveal');
    mask.addEventListener('animationend', handleRevealEnd, { once: true });
  };

  const handleRevealEnd = () => {
    mask.classList.remove('reveal');
    maskBusy = false;
  };

  mask.addEventListener('animationend', handleCoverEnd, { once: true });
}

function setActiveScreen(target) {
  if (currentScreen === target) return;
  playTransition(() => {
    screens.forEach((screen) => {
      screen.classList.toggle('active', screen.dataset.screen === target);
    });
    currentScreen = target;
  });
}

function populateStageDescriptions() {
  Object.entries(stageData).forEach(([key, data]) => {
    const container = document.querySelector(`[data-description="${key}"]`);
    if (container) {
      container.innerHTML = data.description;
    }
  });
}

function renderStage(stageKey) {
  const data = stageData[stageKey];
  if (!data) return;

  document.getElementById('stageTitle').textContent = data.title;
  document.getElementById('stageSubtitle').textContent = data.subtitle;

  const metaContainer = document.getElementById('stageMeta');
  metaContainer.innerHTML = '';
  data.meta.forEach((item) => {
    const span = document.createElement('span');
    span.textContent = item;
    metaContainer.appendChild(span);
  });

  const preview = document.querySelector('.map-preview');
  preview.innerHTML = '';

  if (!data.map) {
    preview.innerHTML = '<p class="placeholder">暂未提供地图预览。</p>';
    return;
  }

  const { width, height, coverCells, heroSpawns, enemySpawns, voidRects } = data.map;
  const coverSet = new Set(coverCells.map((cell) => `${cell.x}-${cell.y}`));
  const heroSet = new Map(heroSpawns.map((cell) => [`${cell.x}-${cell.y}`, cell.label || '友方']));
  const enemySet = new Map(enemySpawns.map((cell) => [`${cell.x}-${cell.y}`, cell.label || '敌方']));

  const voidCells = new Set();
  voidRects.forEach((rect) => {
    const { x, y, width: w, height: h } = rect;
    for (let ix = x; ix < x + w; ix += 1) {
      for (let iy = y; iy < y + h; iy += 1) {
        voidCells.add(`${ix}-${iy}`);
      }
    }
  });

  const grid = document.createElement('div');
  grid.className = 'map-grid';
  grid.style.gridTemplateColumns = `repeat(${width}, 16px)`;
  grid.style.gridTemplateRows = `repeat(${height}, 16px)`;

  for (let row = height; row >= 1; row -= 1) {
    for (let col = 1; col <= width; col += 1) {
      const key = `${col}-${row}`;
      const cell = document.createElement('div');
      cell.classList.add('map-cell');

      if (voidCells.has(key)) {
        cell.classList.add('void');
      }
      if (coverSet.has(key)) {
        cell.classList.add('cover');
      }
      if (heroSet.has(key)) {
        cell.classList.add('spawn-hero');
        cell.title = heroSet.get(key);
      }
      if (enemySet.has(key)) {
        cell.classList.add('spawn-enemy');
        cell.title = enemySet.get(key);
      }

      grid.appendChild(cell);
    }
  }

  preview.appendChild(grid);

  if (heroSpawns.length || enemySpawns.length) {
    const legend = document.createElement('div');
    legend.className = 'map-legend';
    if (heroSpawns.length) {
      const heroItem = document.createElement('span');
      heroItem.className = 'legend-item hero';
      heroItem.textContent = '我方初始位置';
      legend.appendChild(heroItem);
    }
    if (enemySpawns.length) {
      const enemyItem = document.createElement('span');
      enemyItem.className = 'legend-item enemy';
      enemyItem.textContent = '敌方初始位置';
      legend.appendChild(enemyItem);
    }
    preview.appendChild(legend);
  }
}

function setupStageButtons() {
  const buttons = document.querySelectorAll('.stage-btn');
  buttons.forEach((btn) => {
    btn.addEventListener('click', () => {
      if (btn.classList.contains('active')) return;
      buttons.forEach((item) => item.classList.remove('active'));
      btn.classList.add('active');

      const key = btn.dataset.stage;
      document.querySelectorAll('.stage-description').forEach((description) => {
        description.hidden = description.dataset.description !== key;
      });

      renderStage(key);
    });
  });

  renderStage('intro');
}

function setupTutorial() {
  Object.entries(tutorialContent).forEach(([tab, html]) => {
    const panel = document.querySelector(`[data-tab-panel="${tab}"]`);
    if (panel) {
      panel.innerHTML = html;
    }
  });

  const buttons = document.querySelectorAll('.tab-btn');
  buttons.forEach((btn) => {
    btn.addEventListener('click', () => {
      if (btn.getAttribute('aria-selected') === 'true') return;
      const tab = btn.dataset.tab;

      buttons.forEach((item) => item.setAttribute('aria-selected', item === btn ? 'true' : 'false'));
      document.querySelectorAll('.tab-panel').forEach((panel) => {
        panel.hidden = panel.dataset.tabPanel !== tab;
      });
    });
  });
}

function setupCharacters() {
  const introContainer = document.querySelector('.character-content[data-view="intro"]');
  const skillsContainer = document.querySelector('.character-content[data-view="skills"]');
  const levelDisplay = document.getElementById('portraitLevel');
  const portraitLabel = document.getElementById('portraitLabel');

  const characterTabs = document.querySelectorAll('.character-tab');
  const viewTabs = document.querySelectorAll('.view-tab');

  const renderCharacter = (key) => {
    const data = characterData[key];
    if (!data) return;
    introContainer.innerHTML = data.intro;
    skillsContainer.innerHTML = data.skills;
    levelDisplay.textContent = data.level;
    portraitLabel.textContent = key.charAt(0).toUpperCase() + key.slice(1);
  };

  const activateCharacter = (key) => {
    characterTabs.forEach((tab) => {
      tab.classList.toggle('active', tab.dataset.character === key);
    });
    renderCharacter(key);
  };

  const activateView = (view) => {
    viewTabs.forEach((tab) => {
      tab.classList.toggle('active', tab.dataset.view === view);
    });
    document.querySelectorAll('.character-content').forEach((panel) => {
      panel.hidden = panel.dataset.view !== view;
    });
  };

  characterTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      activateCharacter(tab.dataset.character);
    });
  });

  viewTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      activateView(tab.dataset.view);
    });
  });

  activateCharacter('adora');
  activateView('intro');
}

function setupNavigation() {
  document.querySelector('[data-action="start"]').addEventListener('click', () => {
    setActiveScreen('chapters');
  });

  document.querySelector('[data-action="tutorial"]').addEventListener('click', () => {
    setActiveScreen('tutorial');
  });

  document.querySelector('[data-action="settings"]').addEventListener('click', () => {
    const panel = document.querySelector('[data-dialog="settings"]');
    panel.hidden = false;
    panel.querySelector('.panel-card').focus?.();
  });

  document.querySelector('[data-action="exit"]').addEventListener('click', () => {
    showToast('当前版本无法离开，敬请期待。');
  });

  document.querySelector('[data-action="close-settings"]').addEventListener('click', () => {
    document.querySelector('[data-dialog="settings"]').hidden = true;
  });

  document.querySelectorAll('[data-action="back-menu"]').forEach((btn) => {
    btn.addEventListener('click', () => setActiveScreen('menu'));
  });

  document.querySelector('[data-action="back-chapters"]').addEventListener('click', () => {
    setActiveScreen('chapters');
  });

  document.querySelector('[data-action="open-characters"]').addEventListener('click', () => {
    setActiveScreen('characters');
  });

  document.querySelector('[data-action="back-stage"]').addEventListener('click', () => {
    setActiveScreen('stage');
  });

  document.querySelector('.chapter-strip.unlocked').addEventListener('click', () => {
    setActiveScreen('stage');
  });

  document.querySelectorAll('.chapter-strip.locked').forEach((strip) => {
    strip.addEventListener('click', () => {
      showToast('该章节尚未解锁。');
    });
  });
}

mask?.addEventListener('animationend', (event) => {
  if (event.animationName === 'introReveal') {
    mask.classList.remove('intro');
  }
});

populateStageDescriptions();
setupStageButtons();
setupTutorial();
setupCharacters();
setupNavigation();
