const screens = new Map();
document.querySelectorAll('.screen').forEach((screen) => {
  screens.set(screen.dataset.screen, screen);
});

const mask = document.querySelector('.transition-mask');
const settingsPanel = document.querySelector('.settings-panel');
const toast = document.querySelector('.toast');

let currentScreen = 'menu';
let maskBusy = false;
let currentStageId = 'intro';

const stageProgress = {
  intro: false,
  fatigue: false,
  sevenSeas: false,
};

function resetMaskState() {
  if (!mask) return;
  mask.classList.remove('visible', 'covering', 'revealing');
  maskBusy = false;
}

function setActiveScreen(screenId) {
  screens.forEach((node, key) => {
    node.classList.toggle('active', key === screenId);
  });
  currentScreen = screenId;
}

function transitionTo(targetScreen) {
  if (!screens.has(targetScreen) || targetScreen === currentScreen || maskBusy) {
    if (targetScreen && !screens.has(targetScreen)) {
      showToast('目标界面不存在');
    }
    return;
  }

  maskBusy = true;
  mask.classList.add('visible');
  mask.classList.remove('revealing');
  void mask.offsetWidth;
  mask.classList.add('covering');

  let stage = 'cover';
  let fallbackTimer;

  const clearFallback = () => {
    if (!fallbackTimer) return;
    clearTimeout(fallbackTimer);
    fallbackTimer = null;
  };

  const handleReveal = (event) => {
    if (event.propertyName !== 'transform') return;
    mask.removeEventListener('transitionend', handleReveal);
    stage = 'done';
    clearFallback();
    resetMaskState();
  };

  const handleCover = (event) => {
    if (event.propertyName !== 'transform') return;
    mask.removeEventListener('transitionend', handleCover);
    setActiveScreen(targetScreen);
    stage = 'reveal';
    mask.classList.remove('covering');
    mask.classList.add('revealing');
    mask.addEventListener('transitionend', handleReveal);
  };

  fallbackTimer = setTimeout(() => {
    if (stage === 'cover') {
      setActiveScreen(targetScreen);
    }
    mask.removeEventListener('transitionend', handleCover);
    mask.removeEventListener('transitionend', handleReveal);
    stage = 'done';
    resetMaskState();
    fallbackTimer = null;
  }, 2000);

  mask.addEventListener('transitionend', handleCover);
}

function showToast(message) {
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => {
    toast.classList.remove('show');
  }, 2600);
}

function toggleSettings(open = !settingsPanel.classList.contains('open')) {
  settingsPanel.classList.toggle('open', open);
  settingsPanel.setAttribute('aria-hidden', String(!open));
}

function initialiseMenu() {
  document.querySelectorAll('.menu-btn').forEach((btn) => {
    const target = btn.dataset.target;
    const action = btn.dataset.action;

    if (target) {
      btn.addEventListener('click', () => {
        if (target === 'chapters') {
          transitionTo('chapters');
        } else if (target === 'tutorial') {
          transitionTo('tutorial');
        }
      });
    }

    if (action === 'settings') {
      btn.addEventListener('click', () => toggleSettings(true));
    }

    if (action === 'exit') {
      btn.addEventListener('click', () => {
        showToast('当前演示不可退出客户端，请稍后再试。');
      });
    }
  });

  settingsPanel.querySelector('.panel-close').addEventListener('click', () => toggleSettings(false));
}

function initChapterBoard() {
  document.querySelectorAll('.chapter-card').forEach((card) => {
    card.addEventListener('click', () => {
      if (card.classList.contains('locked')) {
        showToast('该章节仍在封锁中。');
        return;
      }
      transitionTo('stages');
    });
  });
}

const stageCatalog = {
  intro: {
    id: 'intro',
    name: 'Intro',
    subtitle: '基础战斗演练',
    size: '7 × 14',
    narrative: [
      '示范章节的开端。为玩家铺垫世界观与操作，包含低威胁遭遇、基础掩体运用与步数管理教学。',
    ],
    brief: [
      '地图 7×14 的城区街区，以直线对峙为主。',
      'Adora：自左至右第 2 格、自上至下第 4 格。',
      'Dario：自左至右第 2 格、自上至下第 2 格。',
      'Karma：自左至右第 2 格、自上至下第 6 格。',
      '敌人：对面排布三名刑警队员，维持平行阵形。',
    ],
    map: {
      rows: 7,
      cols: 14,
      voids: [],
      cover: [],
      players: [
        { row: 4, col: 2, label: 'Ad', type: 'player', tone: 'adora' },
        { row: 2, col: 2, label: 'Da', type: 'player', tone: 'dario' },
        { row: 6, col: 2, label: 'Ka', type: 'player', tone: 'karma' },
      ],
      enemies: [
        { row: 2, col: 12, label: '警', type: 'enemy' },
        { row: 4, col: 12, label: '警', type: 'enemy' },
        { row: 6, col: 12, label: '警', type: 'enemy' },
      ],
    },
    enemies: [
      {
        name: '刑警队员',
        icon: '👮',
        rank: '普通 / 等级 20',
        summary: 'HP 100 · SP 80（归零后失控 1 回合并 -1 步，再恢复至 80）',
        threat: 'enemy',
        skills: [
          { name: '被动：正义光环', detail: '每当敌方行动回合结束时，自身恢复 15 HP。' },
          { name: '捅（1 步）', detail: '前方 1 格突刺造成 5 点伤害 + 5 点 SP 伤害；拔出追加 5 点伤害 + 5 点 SP 伤害。出现概率 70%。' },
          { name: '枪击（1 步）', detail: '指定方位整排造成 10 点伤害与 5 点 SP 伤害。出现概率 65%。' },
          { name: '连续挥刀（2 步）', detail: '前方 1 格三段斩：5/10/10 点伤害，最后一段附加 10 点 SP 伤害。出现概率 50%。' },
        ],
      },
    ],
  },
  fatigue: {
    id: 'fatigue',
    name: '疲惫的极限',
    subtitle: '赫雷西第六干部残像',
    size: '10 × 20',
    narrative: [
      '面对赫雷西第六干部 Khathia 的变身体，团队将体验高压的 Boss 对决。',
    ],
    brief: [
      '地图 10×20 的废弃广场，地形开阔。',
      '三人组沿左侧列纵向站位：Dario（第 2 行）、Adora（第 4 行）、Karma（第 6 行）。',
      'Khathia：位于场地中央靠右位置，占据 2×2 区域，与 Adora 正面对峙。',
      '该 Boss 拥有极强的范围攻击与恢复能力。',
    ],
    map: {
      rows: 10,
      cols: 20,
      voids: [],
      cover: [],
      players: [
        { row: 4, col: 2, label: 'Ad', type: 'player', tone: 'adora' },
        { row: 2, col: 2, label: 'Da', type: 'player', tone: 'dario' },
        { row: 6, col: 2, label: 'Ka', type: 'player', tone: 'karma' },
      ],
      enemies: [
        { row: 4, col: 15, label: 'Kh', type: 'boss' },
        { row: 4, col: 16, label: 'Kh', type: 'boss' },
        { row: 5, col: 15, label: 'Kh', type: 'boss' },
        { row: 5, col: 16, label: 'Kh', type: 'boss' },
      ],
    },
    enemies: [
      {
        name: 'Khathia · 赫雷西第六干部（变身）',
        icon: '💀',
        rank: 'Boss / 等级 35',
        summary: 'HP 500 · SP 0（降至 -100：失控 1 回合、-1 步，并重置为 0）',
        threat: 'boss',
        skills: [
          { name: '被动：老干部', detail: '每次命中敌人回复 2 点 SP。' },
          { name: '被动：变态躯体', detail: '所有伤害 ×0.75，并有 15% 几率完全免疫一次伤害。' },
          { name: '被动：疲劳的躯体', detail: '每 5 回合减少 2 步。' },
          { name: '被动：糟糕的最初设计', detail: '每回合最多移动 3 格。' },
          { name: '血肉之刃（1 步）', detail: '对前方 2×1 区域横斩，造成 15 点伤害。出现概率 70%。' },
          { name: '怨念之爪（1 步）', detail: '对前方 2×2 区域抓击，造成 10 点伤害与 -5 SP。出现概率 70%。' },
          { name: '横扫（2 步）', detail: '前方 4×2 横斩，造成 20 点伤害。出现概率 60%。' },
          { name: '痛苦咆哮（2 步）', detail: '恢复全部 SP。出现概率 35%。' },
          { name: '过多疲劳患者最终的挣扎（3 步）', detail: '360° 全范围（9×9）造成 50 点伤害与 70 SP 伤害。出现概率 30%。' },
        ],
      },
    ],
  },
  sevenSeas: {
    id: 'sevenSeas',
    name: '七海',
    subtitle: '七海作战队遭遇战',
    size: '18 × 25（右下角 8×10 空缺）',
    narrative: [
      '夜幕低垂，海风裹挟着血腥味，刑警队长指引三人组前往七海作战队所在的废弃码头。',
      '在破败铁轨间，Haz 与队员们现身。气氛骤然紧绷，谈判破裂之际，七海作战队全员戴上面具、摆开战阵。',
      'Haz 的仇恨和嗜杀在风暴中升腾，七海作战队准备动用禁忌武器。',
    ],
    brief: [
      '地图 18×25，右下角 8×10 区域为空缺海水区。',
      '掩体：左上 (3,13)~(5,15) 3×3；右上 (9,13)~(11,15) 3×3；左下 (3,3)~(5,5) 3×3。',
      '我方：Adora (3,2)、Karma (5,2)、Dario (7,2)。',
      '敌方：Haz (21,15)、Tusk (19-20,12-13 占 2×2)、Katz (19,16)、Neyla (15,17)、Kyn (15,12)。',
      '全员附带“作战余波”Debuff（-25% HP，上限伤害 -5）。',
    ],
    map: (() => {
      const rows = 18;
      const offsetX = 5;
      const cols = 22 + offsetX;

      const convert = (x, y) => ({
        row: rows - y + 1,
        col: x + offsetX,
      });

      const voids = new Set();
      for (let x = 15; x <= 22; x += 1) {
        for (let y = 1; y <= 10; y += 1) {
          const cell = convert(x, y);
          voids.add(`${cell.row}-${cell.col}`);
        }
      }

      const cover = [];
      const pushRect = (x1, y1, x2, y2) => {
        for (let x = x1; x <= x2; x += 1) {
          for (let y = y1; y <= y2; y += 1) {
            const cell = convert(x, y);
            cover.push(cell);
          }
        }
      };
      // === Cover layout updated to match reference image ===
// Top-left block 4×3
pushRect(2, 13, 5, 15);
// Top-mid-right block 4×3
pushRect(9, 13, 11, 15);
// Bottom-left L shape: 3×3 square + one extra tile at (3,2)
pushRect(3, 4, 5, 6);

      const players = [
        { ...convert(3, 2), label: 'Ad', type: 'player', tone: 'adora' },
        { ...convert(5, 2), label: 'Ka', type: 'player', tone: 'karma' },
        { ...convert(7, 2), label: 'Da', type: 'player', tone: 'dario' },
      ];

      const enemies = [
        { ...convert(21, 15), label: 'Haz', type: 'boss' },
        { ...convert(19, 13), label: 'Tu', type: 'miniboss' },
        { ...convert(19, 12), label: 'Tu', type: 'miniboss' },
        { ...convert(20, 12), label: 'Tu', type: 'miniboss' },
        { ...convert(20, 13), label: 'Tu', type: 'miniboss' },
        { ...convert(19, 16), label: 'Ka', type: 'miniboss' },
        { ...convert(15, 17), label: 'Ne', type: 'elite' },
        { ...convert(15, 12), label: 'Ky', type: 'elite' },
      ];

      return {
        rows,
        cols,
        voids,
        cover,
        players,
        enemies,
      };
    })(),
    enemies: [
      {
        name: 'Haz（哈兹）',
        icon: '⚓',
        rank: '七海作战队队长 / Boss / 等级 55',
        summary: 'HP 750 · SP 100（归零：失控 1 回合、-1 步，并回复 5% HP + SP 满）',
        threat: 'boss',
        skills: [
          { name: '被动：弑神执念', detail: 'HP < 50% 时伤害 +30%。' },
          { name: '被动：难以抑制的仇恨', detail: '每次攻击 40% 概率 -5 SP 并施加恐惧。' },
          { name: '被动：队员们听令！', detail: '偶数回合开始自身 +10 SP，队员 +5 SP。' },
          { name: '被动：一切牺牲都是值得的……', detail: '20 回合后所有队员获得“队长的压迫”Debuff，解锁禁忌技能。' },
          { name: '被动：他们不是主菜！', detail: '前 15 回合全队获得 30% 暴击增伤。' },
          { name: '被动：把他们追杀到天涯海角！', detail: '被命中首个敌方单位获得猎杀标记，全队对其伤害 +15%。' },
          { name: '被动：力挽狂澜', detail: '仅剩 Haz 时：伤害 +10%、受伤 -10%，并新增怨念技能组。' },
          { name: '鱼叉穿刺（1 步）', detail: '向前刺击 1 格，造成 20 点伤害并回复 10 SP。出现概率 70%。' },
          { name: '深海猎杀（2 步）', detail: '鱼叉链条命中前方 3 格内目标并拉近，造成 25 点伤害与 -10 SP。出现概率 60%。' },
          { name: '猎神之叉（2 步）', detail: '瞬移至 5×5 内的敌人身旁刺击，造成 20 点伤害（50%×2.0）、15 SP 伤害并附加流血。出现概率 65%。' },
          { name: '锁链缠绕（2 步）', detail: '2 回合内减免 40% 伤害，下次攻击者受到 10 SP 伤害，全队 +5 SP。出现概率 50%。' },
          { name: '鲸落（4 步）', detail: '以自身为中心 5×5 砸击，造成 50 点伤害与 20 SP 伤害，并令目标下回合 -1 步。出现概率 30%。' },
          { name: '怨念滋生（1 步）', detail: '（力挽狂澜后）对所有带猎杀标记目标施加 1 层流血与恐惧。出现概率 33%。' },
          { name: '付出代价（2 步）', detail: '（力挽狂澜后）前推三段连击：3 格穿刺 15 伤害、4 格穿刺 15+5 SP、2×3 横扫 15 伤害并附加 Haz 流血。出现概率 33%。' },
          { name: '仇恨之叉（2 步）', detail: '（力挽狂澜后）前方 2×3 横扫 15 伤害+10 SP，随后 5×5 震地造成 20 伤害并附 Haz 流血（每回合 -3% HP，持续 2 大回合）。出现概率 33%。' },
        ],
      },
      {
        name: 'Katz（卡兹）',
        icon: '💣',
        rank: '伤害代表 / 小 Boss / 等级 53',
        summary: 'HP 500 · SP 75（归零：失控 1 回合、-1 步，之后自动恢复至 75）',
        threat: 'miniboss',
        skills: [
          { name: '被动：隐秘迷恋', detail: 'Haz 在场时伤害 +20%，每回合额外 +5 SP。' },
          { name: '被动：恐怖执行力', detail: '回合内命中 ≥2 次时追加矛刺，伤害 +30%。' },
          { name: '被动：女强人', detail: 'SP > 60 时伤害 +10%。' },
          { name: '矛刺（1 步）', detail: '前方 1 格 20 点伤害并自回复 5 SP。出现概率 70%（队长的压迫后停用）。' },
          { name: '链式鞭击（2 步）', detail: '前方 3 格鞭击 25 点伤害并令目标下回合 -1 步。出现概率 60%（压迫后停用）。' },
          { name: '反复鞭尸（3 步）', detail: '前方 3 格多段鞭打 10/15 伤害，回复 5 SP，按 SP 百分比最多重复 5 次。出现概率 50%（压迫后停用）。' },
          { name: '终焉礼炮（4 步）', detail: '投掷炸弹鱼叉，3×3 范围 60 伤害与 -15 SP，自身下回合 -1 步。出现概率 30%（压迫后停用）。' },
          { name: '必须抹杀一切……（2 步）', detail: '（压迫后）前方 3 格两段鞭击 20/30 伤害，各消耗自身 5 HP，按 SP 百分比最多重复 5 次并回复 5 SP。' },
        ],
      },
      {
        name: 'Tusk（塔斯克）',
        icon: '🛡️',
        rank: '防御代表 / 小 Boss / 等级 54',
        summary: 'HP 1000 · SP 60（归零：失控 1 回合、-1 步，之后自动恢复至 60）',
        threat: 'miniboss',
        skills: [
          { name: '被动：家人的守护', detail: 'Haz 受伤时转移伤害至自身并免疫其中 50%。' },
          { name: '被动：铁壁如山', detail: '所有伤害降低 30%。' },
          { name: '被动：猛牛之力', detail: '每次受伤，下次攻击 +5 伤害，可叠加。' },
          { name: '骨盾猛击（1 步）', detail: '前方 1 格 10 伤害并击退 1 格。出现概率 70%（压迫后停用）。' },
          { name: '来自深海的咆哮（2 步）', detail: '周围 3×3 敌人 -20 SP，自身额外减伤 20%。出现概率 60%（压迫后停用）。' },
          { name: '牛鲨冲撞（2 步）', detail: '向前 2×3 冲锋，沿途 25 伤害并眩晕 1 回合。出现概率 50%（压迫后停用）。' },
          { name: '战争堡垒（3 步）', detail: '3 回合内防御姿态，减伤 50%、每回合 +10 SP，并令 Haz 伤害 +15%。出现概率 30%（压迫后停用）。' },
          { name: '拼尽全力保卫队长……（2 步）', detail: '（压迫后）3 回合反伤姿态：减伤 25%、反弹 25% 伤害，每回合 +10 SP，Haz 恢复 15% HP 与 15 SP 并伤害 +15%。' },
        ],
      },
      {
        name: 'Neyla（尼拉）',
        icon: '🎯',
        rank: '远程狙击手 / 精英 / 等级 52',
        summary: 'HP 350 · SP 80（归零：失控 1 回合、-1 步，之后自动恢复至 80）',
        threat: 'elite',
        skills: [
          { name: '被动：精确瞄准', detail: '回合内未移动时伤害 +50%。' },
          { name: '被动：冷血执行者', detail: '目标 HP < 50% 时造成双倍伤害。' },
          { name: '被动：神速装填', detail: '每 3 回合额外回复 10 SP。' },
          { name: '迅捷射击（1 步）', detail: '4 格内 15 伤害并 -5 SP。出现概率 70%（压迫后停用）。' },
          { name: '穿刺狙击（2 步）', detail: '直线 6 格 30 伤害并附流血（-5% HP，2 回合）。出现概率 60%（压迫后停用）。' },
          { name: '双钩牵制（2 步）', detail: '前方 4 格 15 伤害并令目标下回合 -2 步。出现概率 50%（压迫后停用）。' },
          { name: '终末之影（三步）', detail: '全场任意目标 50 伤害 + 20 SP 伤害，自身下回合 -1 步。出现概率 30%（压迫后每回合必定出现一次）。' },
          { name: '执行……（2 步）', detail: '前方整排双段鱼叉，各 20 伤害（目标 HP <15% 直接处决），自身消耗 30 HP 与 40 SP。压迫后出现。' },
        ],
      },
      {
        name: 'Kyn（金）',
        icon: '🗡️',
        rank: '刺客 / 精英 / 等级 51',
        summary: 'HP 250 · SP 70（归零：失控 1 回合、-1 步，之后自动恢复至 70）',
        threat: 'elite',
        skills: [
          { name: '被动：打道回府', detail: '击杀敌人后下回合开始瞬移回 Haz 身边。' },
          { name: '被动：无情暗杀', detail: '敌人 HP < 25% 时直接斩杀。' },
          { name: '被动：迅捷如风', detail: '回合开始自动回复 5 SP。' },
          { name: '迅影突刺（1 步）', detail: '瞬移至 5×5 内敌人侧旁，造成 20 伤害。出现概率 70%（压迫后停用）。' },
          { name: '割喉飞刃（2 步）', detail: '直线 3 格投掷，造成 25 伤害 + 5 SP 伤害。出现概率 60%（压迫后停用）。' },
          { name: '影杀之舞（2 步）', detail: '周围 3×3 范围 30 伤害并额外免费移动 1 格。出现概率 50%（压迫后停用）。' },
          { name: '死亡宣告（3 步）', detail: '单体 50 伤害 + 30 SP，目标 HP < 30% 直接斩杀。出现概率 30%（压迫后停用）。' },
          { name: '自我了断……（2 步）', detail: '（压迫后）瞬移至 5×5 内敌人并秒杀，自己消耗全部 HP。' },
        ],
      },
    ],
  },
};

const sevenSeasStage = stageCatalog.sevenSeas;
const sevenSeasBriefFallback = sevenSeasStage ? [...sevenSeasStage.brief] : [];
const sevenSeasDebuffNote = sevenSeasStage
  ? sevenSeasStage.brief.find((line) => line.includes('作战余波'))
  : '';

function normaliseRectFromNumbers(numbers) {
  if (!Array.isArray(numbers) || numbers.length < 2) return null;
  if (numbers.length === 2) {
    const [x, y] = numbers;
    return {
      x1: x,
      x2: x,
      y1: y,
      y2: y,
    };
  }

  if (numbers.length === 3) {
    const [x1, x2, y] = numbers;
    return {
      x1: Math.min(x1, x2),
      x2: Math.max(x1, x2),
      y1: y,
      y2: y,
    };
  }

  const [x1, x2, y1, y2] = numbers;
  return {
    x1: Math.min(x1, x2),
    x2: Math.max(x1, x2),
    y1: Math.min(y1, y2),
    y2: Math.max(y1, y2),
  };
}

const sevenSeasPlayerMeta = {
  adora: {
    key: 'adora',
    name: 'Adora',
    label: 'Ad',
    tone: 'adora',
    aliases: ['adora', '阿多拉'],
  },
  karma: {
    key: 'karma',
    name: 'Karma',
    label: 'Ka',
    tone: 'karma',
    aliases: ['karma', '卡尔玛', '卡玛'],
  },
  dario: {
    key: 'dario',
    name: 'Dario',
    label: 'Da',
    tone: 'dario',
    aliases: ['dario', '达里奥'],
  },
};

const sevenSeasEnemyMeta = {
  haz: {
    key: 'haz',
    name: 'Haz',
    label: 'Haz',
    type: 'boss',
    aliases: ['haz', '哈兹'],
  },
  tusk: {
    key: 'tusk',
    name: 'Tusk',
    label: 'Tu',
    type: 'miniboss',
    aliases: ['tusk', '塔斯克'],
  },
  katz: {
    key: 'katz',
    name: 'Katz',
    label: 'Kz',
    type: 'miniboss',
    aliases: ['katz', '卡兹'],
  },
  neyla: {
    key: 'neyla',
    name: 'Neyla',
    label: 'Ne',
    type: 'elite',
    aliases: ['neyl', 'neyla', '尼拉'],
  },
  kyn: {
    key: 'kyn',
    name: 'Kyn',
    label: 'Ky',
    type: 'elite',
    aliases: ['kyn', '金'],
  },
  khathia: {
    key: 'khathia',
    name: 'Khathia',
    label: 'Kh',
    type: 'boss',
    aliases: ['khathia', '卡西亚'],
  },
};

function extractNumbers(line) {
  if (!line) return [];
  const normalised = line.replace(/(?<=\d)\s*-\s*(?=\d)/g, ' ');
  return (normalised.match(/-?\d+/g) || []).map((token) => Number(token));
}

function identifyMeta(line, lookup) {
  const lower = line.toLowerCase();
  return (
    Object.values(lookup).find((meta) => {
      if (lower.includes(meta.key)) return true;
      if (Array.isArray(meta.aliases)) {
        return meta.aliases.some((alias) => {
          const aliasLower = alias.toLowerCase();
          return lower.includes(aliasLower) || line.includes(alias);
        });
      }
      return false;
    }) || null
  );
}

function formatRange(start, end) {
  if (start === end) return `${start}`;
  return `${Math.min(start, end)}～${Math.max(start, end)}`;
}

function formatRect(rect) {
  if (!rect) return '';
  return `（${formatRange(rect.x1, rect.x2)}，${formatRange(rect.y1, rect.y2)}）`;
}

function parseSevenSeasGameTxt(text) {
  if (!text || !sevenSeasStage) return null;

  const lines = text
    .split(/\r?\n/)
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('#')) return '';
      const withoutComment = trimmed.replace(/\s+#.*$/, '').trim();
      return withoutComment;
    })
    .filter((line) => line.length);

  if (!lines.length) return null;

  const rects = { cover: [], voids: [] };
  const players = [];
  const enemies = [];
  const notes = [];
  const bounds = {
    minX: Number.POSITIVE_INFINITY,
    maxX: Number.NEGATIVE_INFINITY,
    minY: Number.POSITIVE_INFINITY,
    maxY: Number.NEGATIVE_INFINITY,
  };

  const updateBounds = (rect) => {
    if (!rect) return;
    bounds.minX = Math.min(bounds.minX, rect.x1);
    bounds.maxX = Math.max(bounds.maxX, rect.x2);
    bounds.minY = Math.min(bounds.minY, rect.y1);
    bounds.maxY = Math.max(bounds.maxY, rect.y2);
  };

  let declaredSize = null;

  lines.forEach((line) => {
    const lower = line.toLowerCase();
    const numbers = extractNumbers(lower);

    if (lower.startsWith('size') || lower.includes('尺寸')) {
      declaredSize = numbers.slice(0, 2);
      return;
    }

    if (lower.startsWith('note') || lower.includes('备注')) {
      const note = line.replace(/^\s*note\s*[:：]?\s*/i, '').trim();
      if (note) {
        notes.push(note);
      }
      return;
    }

    if (lower.includes('void') || lower.includes('空缺') || lower.includes('缺口') || lower.includes('海水')) {
      const rect = normaliseRectFromNumbers(numbers);
      if (rect) {
        rects.voids.push(rect);
        updateBounds(rect);
      }
      return;
    }

    if (lower.includes('cover') || lower.includes('掩体')) {
      const rect = normaliseRectFromNumbers(numbers);
      if (rect) {
        rects.cover.push(rect);
        updateBounds(rect);
      }
      return;
    }

    const playerMeta = identifyMeta(lower, sevenSeasPlayerMeta);
    if (playerMeta) {
      const rect = normaliseRectFromNumbers(numbers);
      if (rect) {
        players.push({ meta: playerMeta, rect });
        updateBounds(rect);
      }
      return;
    }

    const enemyMeta = identifyMeta(lower, sevenSeasEnemyMeta);
    if (enemyMeta) {
      const rect = normaliseRectFromNumbers(numbers);
      if (rect) {
        enemies.push({ meta: enemyMeta, rect });
        updateBounds(rect);
      }
    }
  });

  const hasDeclaredSize =
    Array.isArray(declaredSize) &&
    declaredSize.length >= 2 &&
    declaredSize.every((value) => Number.isFinite(value) && value > 0);

  if (
    !hasDeclaredSize &&
    (!Number.isFinite(bounds.minX) ||
      !Number.isFinite(bounds.maxX) ||
      !Number.isFinite(bounds.minY) ||
      !Number.isFinite(bounds.maxY))
  ) {
    return null;
  }

  const baseMinX = hasDeclaredSize ? 1 : bounds.minX;
  const baseMinY = hasDeclaredSize ? 1 : bounds.minY;

  const rows = hasDeclaredSize
    ? Math.max(1, Math.round(declaredSize[0]))
    : Math.max(1, bounds.maxY - bounds.minY + 1);
  const cols = hasDeclaredSize
    ? Math.max(1, Math.round(declaredSize[1]))
    : Math.max(1, bounds.maxX - bounds.minX + 1);

  const convert = (x, y) => ({
    row: rows - (y - baseMinY),
    col: x - baseMinX + 1,
  });

  const withinBounds = (cell) =>
    cell && cell.row >= 1 && cell.row <= rows && cell.col >= 1 && cell.col <= cols;

  const voids = new Set();
  rects.voids.forEach((rect) => {
    for (let x = rect.x1; x <= rect.x2; x += 1) {
      for (let y = rect.y1; y <= rect.y2; y += 1) {
        const cell = convert(x, y);
        if (withinBounds(cell)) {
          voids.add(`${cell.row}-${cell.col}`);
        }
      }
    }
  });

  const cover = [];
  rects.cover.forEach((rect) => {
    for (let x = rect.x1; x <= rect.x2; x += 1) {
      for (let y = rect.y1; y <= rect.y2; y += 1) {
        const cell = convert(x, y);
        if (withinBounds(cell)) {
          cover.push(cell);
        }
      }
    }
  });

  const playerCells = [];
  players.forEach(({ meta, rect }) => {
    for (let x = rect.x1; x <= rect.x2; x += 1) {
      for (let y = rect.y1; y <= rect.y2; y += 1) {
        const cell = convert(x, y);
        if (withinBounds(cell)) {
          playerCells.push({
            ...cell,
            label: meta.label,
            type: 'player',
            tone: meta.tone,
          });
        }
      }
    }
  });

  const enemyCells = [];
  enemies.forEach(({ meta, rect }) => {
    for (let x = rect.x1; x <= rect.x2; x += 1) {
      for (let y = rect.y1; y <= rect.y2; y += 1) {
        const cell = convert(x, y);
        if (withinBounds(cell)) {
          enemyCells.push({
            ...cell,
            label: meta.label,
            type: meta.type,
          });
        }
      }
    }
  });

  const voidNote = rects.voids.length
    ? rects.voids
        .map((rect) => {
          const width = rect.x2 - rect.x1 + 1;
          const height = rect.y2 - rect.y1 + 1;
          return `空缺 ${width}×${height}${formatRect(rect)}`;
        })
        .join('；')
    : '';

  const brief = [];
  const computedSize = `${rows} × ${cols}${voidNote ? `（${voidNote}）` : ''}`;
  brief.push(`地图 ${rows}×${cols}${voidNote ? `（${voidNote}）` : ''}。`);

  if (rects.cover.length) {
    const coverSummary = rects.cover
      .map((rect, index) => `区域 ${index + 1}${formatRect(rect)}`)
      .join('；');
    brief.push(`掩体：${coverSummary}。`);
  }

  if (players.length) {
    const playerSummary = players
      .map((entry) => `${entry.meta.name}${formatRect(entry.rect)}`)
      .join('；');
    brief.push(`我方：${playerSummary}。`);
  }

  if (enemies.length) {
    const enemySummary = enemies
      .map((entry) => `${entry.meta.name}${formatRect(entry.rect)}`)
      .join('；');
    brief.push(`敌方：${enemySummary}。`);
  }

  notes.forEach((note) => {
    brief.push(note.endsWith('。') ? note : `${note}。`);
  });

  const map = {
    rows,
    cols,
    voids,
    cover,
    players: playerCells,
    enemies: enemyCells,
  };

  const preferredSize = hasDeclaredSize
    ? `${rows} × ${cols}${voidNote ? `（${voidNote}）` : ''}`
    : computedSize;

  return {
    map,
    brief,
    sizeLabel: preferredSize,
    fallbackSize: computedSize,
  };
}

function loadSevenSeasMapFromFile() {
  if (!sevenSeasStage || typeof fetch !== 'function') return;

  fetch('files/Game.txt')
    .then((response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.text();
    })
    .then((text) => {
      const parsed = parseSevenSeasGameTxt(text);
      if (!parsed) return;

      sevenSeasStage.map = parsed.map;
      sevenSeasStage.size = parsed.sizeLabel || parsed.fallbackSize;

      const newBrief = [...parsed.brief];
      if (sevenSeasDebuffNote && !newBrief.some((line) => line.includes('作战余波'))) {
        newBrief.push(sevenSeasDebuffNote);
      }

      sevenSeasStage.brief = newBrief;

      if (currentStageId === 'sevenSeas') {
        renderStage('sevenSeas');
      }
    })
    .catch((error) => {
      console.warn('无法根据 Game.txt 更新七海地图，保留默认配置。', error);
      sevenSeasStage.brief = [...sevenSeasBriefFallback];
    });
}

function renderStage(stageId) {
  const stage = stageCatalog[stageId];
  if (!stage) return;

  currentStageId = stageId;

  document.querySelectorAll('.stage-item').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.stage === stageId);
  });

  const stageName = document.querySelector('.stage-name');
  const stageSubtitle = document.querySelector('.stage-subtitle');
  const mapSize = document.querySelector('.map-size');
  const narrative = document.querySelector('.stage-narrative');
  const brief = document.querySelector('.stage-brief');
  const mapGrid = document.querySelector('.map-grid');
  const enemyList = document.querySelector('.enemy-list');

  stageName.textContent = stage.name;
  stageSubtitle.textContent = stage.subtitle;
  mapSize.textContent = `地图尺寸：${stage.size}`;

  narrative.innerHTML = stage.narrative.map((text) => `<p>${text}</p>`).join('');

  brief.innerHTML = [
    '<h4>战场情报</h4>',
    '<ul>',
    ...stage.brief.map((item) => `<li>${item}</li>`),
    '</ul>',
  ].join('');

  const { rows, cols, voids, cover, players, enemies } = stage.map;
  mapGrid.style.setProperty('--rows', rows);
  mapGrid.style.setProperty('--cols', cols);
  mapGrid.innerHTML = '';

  const coverSet = new Set(cover.map((cell) => `${cell.row}-${cell.col}`));
  const playerMap = new Map(players.map((cell) => [`${cell.row}-${cell.col}`, cell]));
  const enemyMap = new Map(enemies.map((cell) => [`${cell.row}-${cell.col}`, cell]));

  for (let row = 1; row <= rows; row += 1) {
    for (let col = 1; col <= cols; col += 1) {
      const key = `${row}-${col}`;
      const cell = document.createElement('div');
      cell.className = 'map-cell';

      if (voids instanceof Set ? voids.has(key) : false) {
        cell.classList.add('void');
        mapGrid.appendChild(cell);
        continue;
      }

      if (coverSet.has(key)) {
        cell.classList.add('cover');
        cell.dataset.label = '';
      }

      if (playerMap.has(key)) {
        const data = playerMap.get(key);
        cell.classList.add('player');
        cell.dataset.label = data.label;
      } else if (enemyMap.has(key)) {
        const data = enemyMap.get(key);
        const threatType = data.type || 'enemy';
        cell.classList.add(threatType);
        cell.dataset.label = data.label;
      }

      mapGrid.appendChild(cell);
    }
  }

  enemyList.innerHTML = '';
  const visited = stageProgress[stageId];

  stage.enemies.forEach((enemy) => {
    const card = document.createElement('article');
    const threat = enemy.threat || 'enemy';
    card.className = `enemy-card threat-${threat}`;

    const head = document.createElement('div');
    head.className = 'enemy-head';

    const icon = document.createElement('div');
    icon.className = 'enemy-icon';
    icon.textContent = enemy.icon;

    const meta = document.createElement('div');
    meta.className = 'enemy-meta';

    const title = document.createElement('h5');
    title.textContent = enemy.name;

    const rank = document.createElement('p');
    rank.textContent = `${enemy.rank} · ${enemy.summary}`;

    meta.appendChild(title);
    meta.appendChild(rank);
    head.appendChild(icon);
    head.appendChild(meta);
    card.appendChild(head);

    const list = document.createElement('ul');
    list.className = 'skill-list';

    enemy.skills.forEach((skill) => {
      const item = document.createElement('li');
      item.className = 'skill-item';
      if (!visited) {
        item.classList.add('locked');
        item.textContent = '???（技能资料锁定）';
      } else {
        item.innerHTML = `<strong>${skill.name}</strong>：${skill.detail}`;
      }
      list.appendChild(item);
    });

    card.appendChild(list);
    enemyList.appendChild(card);
  });
}

function initStageBoard() {
  document.querySelectorAll('.stage-item').forEach((btn) => {
    btn.addEventListener('click', () => {
      renderStage(btn.dataset.stage);
    });
  });

  document.querySelector('.enter-btn').addEventListener('click', () => {
    stageProgress[currentStageId] = true;
    renderStage(currentStageId);
    showToast(`关卡「${stageCatalog[currentStageId].name}」资料已解锁。`);
  });
}

function applyPortraitImage(imageElement, character) {
  if (!imageElement || !character) return;

  imageElement.dataset.portraitCharacter = character.name;
  imageElement.alt = `${character.name} 立绘`;
  imageElement.src = character.portrait;
}

const portraitLibrary = typeof portraitAssets === 'undefined' ? {} : portraitAssets;

const characterData = {
  adora: {
    name: 'Adora',
    level: 20,
    portrait: portraitLibrary.adora || '',
    bio: {
      intro: [
        '名字在西班牙语里意为“崇拜”。Adora 刚生时家人以为他是女孩，于是给了他一个偏女性化的名字。在英语里，他理解为“收养”；在日语里，“Ado”意味着喧嚣，象征他见证好友遭枪杀后转变的命运。',
        '他原本是快乐的孩子，九岁生日当天的异端暴走夺走了父母与左眼，事故也在他头发右侧留下“腐蚀”。自此，他拒绝警方帮助，逃往挚友 Dario 家，与 Karma 重逢。',
        '目睹朋友死亡后，他逐渐变为嗜血的怪物，这段转变极其痛苦。',
      ],
      facts: [
        '通常穿舒适毛衣，深灰色长发垂至身体下半部。',
        '6～15 岁常年处于抑郁，但成绩始终名列前茅，兴趣广泛（技术、游戏、动物护理等）。',
        '不喜暴力但必要时会致命；劝阻朋友少行暴力。',
        '力量与速度一般，不喜剧烈运动与外出。',
        '9 岁后一直戴着帽子与眼罩，16 岁摘下后在十字形左眼上加钉子。',
        '16 岁后在伙伴支持下逐渐开朗，喜欢汽水，现年 18 岁，身高 169 厘米，生日 8 月 4 日。',
        '真心信任并珍惜这支三人组。',
      ],
    },
    skills: {
      overview: 'Adora（初始等级 20）· 占 1 格 · HP 100 · SP 100（降至 0：失控 1 回合、-1 步，后自动恢复 50%）。',
      passives: [
        '背刺：攻击敌人背部时造成 1.5 倍伤害。',
        '冷静分析：若该回合未行动，恢复 10 点 SP。',
        '啊啊啊你们没事吧？！：6×6 范围有友方时，为该友方恢复 5% HP 与 5 SP（不含自身）。',
        '对战斗的恐惧：自身 SP < 10 时，伤害 ×1.5。',
      ],
      actives: [
        {
          tier: '20 级解锁',
          list: [
            {
              name: '短匕轻挥！',
              color: 'green',
              colorLabel: '绿色',
              cost: '1 步',
              description: '前方 1 格造成 10 点伤害与 5 点精神伤害。',
              note: '出现概率 80%。',
            },
            {
              name: '枪击',
              color: 'gray',
              colorLabel: '灰色',
              cost: '1 步',
              description: '需携带手枪道具；指定方位整排造成 10 点伤害与 5 点精神伤害。',
              note: '出现概率 65%。',
            },
            {
              name: '呀！你不要靠近我呀！！',
              color: 'blue',
              colorLabel: '蓝色',
              cost: '2 步',
              description: '可选四周任意 5 格瞬移（可少选）；若目标 HP 低于 50%，追击一次“短匕轻挥！”。',
              note: '出现概率 40%。',
            },
            {
              name: '自制粉色迷你电击装置！',
              color: 'red',
              colorLabel: '红色',
              cost: '3 步',
              description: '前方 2 格造成 10 点伤害与 15 点精神伤害，并令目标麻痹（下回合 -步数）。',
              note: '出现概率 30%。',
            },
          ],
        },
        {
          tier: '25 级解锁',
          list: [
            {
              name: '略懂的医术！',
              color: 'pink',
              colorLabel: '粉色',
              cost: '2 步',
              description: '以自身为中心 5×5 选择 1 名友方，恢复 20 HP 与 15 SP，并赋予 1 层“恢复”Buff（下一个大回合开始恢复 5 HP，仅消耗 1 层）。',
              note: '出现概率 30%。',
            },
            {
              name: '加油哇！',
              color: 'orange',
              colorLabel: '橘色',
              cost: '4 步',
              description: '以自身为中心 5×5 选择 1 名友方，授予 1 层“鸡血”Buff（下次攻击伤害 ×2，最多 1 层）。',
              note: '出现概率 20%。',
            },
          ],
        },
        {
          tier: '35 级解锁',
          list: [
            {
              name: '只能靠你了。。',
              color: 'orange',
              colorLabel: '橘色',
              cost: '4 步',
              description: '牺牲自身 25 HP，为四周任意 5 格内 1 名友方施加“依赖”Buff（下次攻击造成真实伤害并将其 SP 降至 0，最多 1 层）。',
              note: '出现概率 15%。',
            },
          ],
        },
      ],
    },
  },
  karma: {
    name: 'Karma',
    level: 20,
    portrait: portraitLibrary.karma || '',
    bio: {
      intro: [
        '名字意为“命运、天意、行动”，象征着他的所作所为指向无法避免的致命结局。',
        '自出生起便与 Dario 是好友，幼儿园时结识 Adora。由于家庭暴力，9 岁那年搬到 Dario 家居住。',
      ],
      facts: [
        '常穿衬衫配黑裤，栗红色短发，手掌宽大。',
        '在校成绩垫底但擅长体能，保持三分之二的校级纪录。',
        '喜爱暴力，但在 Adora 劝导下学会收敛；性格常先行动后思考。',
        '后脑存在巨大红色“†”胎记，疑似失败的诅咒仪式所致。',
        '过去沉迷游戏，遭 Adora 教训后戒掉；喜欢能量饮料和酒精。',
        '曾吸烟，顾及 Adora 健康改用电子烟；18 岁起与 Dario 从事违法活动。',
        '力大无穷，几拳可砸倒树木。',
        '幼儿园起暗恋 Adora，当时不知他是男生。现年 19 岁，身高 189 厘米，生日 4 月 14 日。',
      ],
    },
    skills: {
      overview: 'Karma（初始等级 20）· 占 1 格 · HP 200 · SP 50（降至 0：失控 1 回合、-1 步并扣除 20 HP，后自动恢复 50%）。',
      passives: [
        '暴力瘾：连续攻击同一敌人时伤害 ×1.5；连续 3 次以上追击“沙包大的拳头”，连续 4 次后消耗 5 SP。',
        '强悍的肉体：所受伤害 ×0.75。',
        '自尊心：按失去 HP 的 0.5% 等比例提升自身伤害。',
      ],
      actives: [
        {
          tier: '20 级解锁',
          list: [
            {
              name: '沙包大的拳头',
              color: 'green',
              colorLabel: '绿色',
              cost: '1 步',
              description: '造成 15 点伤害。',
              note: '出现概率 80%。',
            },
            {
              name: '枪击',
              color: 'gray',
              colorLabel: '灰色',
              cost: '1 步',
              description: '需手枪道具；指定方位整排造成 10 点伤害与 5 点精神伤害。',
              note: '出现概率 65%。',
            },
            {
              name: '都听你的',
              color: 'blue',
              colorLabel: '蓝色',
              cost: '2 步',
              description: '可选四周任意 3 格并回复 5 SP（可少选）。',
              note: '出现概率 40%。',
            },
            {
              name: '嗜血之握',
              color: 'red',
              colorLabel: '红色',
              cost: '3 步',
              description: '连续使用四次“沙包大的拳头”后可释放，对非 Boss 造成 75 伤害、小 Boss 80、精英 100，并立即处决对应目标。',
              note: '出现概率 30%。',
            },
          ],
        },
        {
          tier: '25 级解锁',
          list: [
            {
              name: '深呼吸',
              color: 'white',
              colorLabel: '白色',
              cost: '2 步',
              description: '主动恢复全部 SP 与 10 HP；若当前技能卡池未使用该技能，则获得 10% 伤害加成（同一时间仅可存在 1 张）。',
              note: '出现概率 20%。',
            },
          ],
        },
      ],
    },
  },
  dario: {
    name: 'Dario',
    level: 20,
    portrait: portraitLibrary.dario || '',
    bio: {
      intro: [
        '名字意为“财富、富有、更多的钱”，象征他掌握的庞大资产。',
        '父母在他 6 岁时消失，只留下豪宅和巨额财产。与 Adora、Karma 交好，将自家豪宅作为据点。',
      ],
      facts: [
        '穿着正式衬衫配黑裤，佩戴美元符号发夹。',
        '左手因煤气罐事故更换为细长黑色机械臂，自觉十分酷。',
        '学业略低于平均，强壮敏捷但不及 Karma。',
        '热爱暴力，认为“暴力就是艺术”；常带笑容却鲜少真正快乐。',
        '拥有价值惊人的金牙，喜欢茶、烟与酒；性格难以捉摸。',
        '易感无聊，因追求刺激与收益参与非法活动。',
        '现年 19 岁，身高 187 厘米，生日 5 月 24 日。',
      ],
    },
    skills: {
      overview: 'Dario（初始等级 20）· 占 1 格 · HP 150 · SP 100（降至 0：失控 1 回合、-1 步，后自动恢复 75%）。',
      passives: [
        '快速调整：失控后额外恢复 25% SP（总计 75%）。',
        '反击：受到伤害 50% 概率使用“机械爪击”反击。',
        '士气鼓舞：每个 5 的倍数回合，为所有友方回复 15 SP。',
      ],
      actives: [
        {
          tier: '20 级解锁',
          list: [
            {
              name: '机械爪击',
              color: 'green',
              colorLabel: '绿色',
              cost: '1 步',
              description: '前方 2 格造成 15 点伤害，并有 15% 概率令目标眩晕。',
              note: '出现概率 80%。',
            },
            {
              name: '枪击',
              color: 'gray',
              colorLabel: '灰色',
              cost: '1 步',
              description: '需手枪道具；指定方位整排造成 10 点伤害与 5 点精神伤害。',
              note: '出现概率 65%。',
            },
            {
              name: '迅捷步伐',
              color: 'blue',
              colorLabel: '蓝色',
              cost: '2 步',
              description: '可选四周任意 4 格并自由移动，同时令最近敌人 -5 SP（可少选）。',
              note: '出现概率 40%。',
            },
            {
              name: '拿来吧你！',
              color: 'red',
              colorLabel: '红色',
              cost: '3 步',
              description: '整排首个非 Boss 单位造成 20 点伤害并拉至身前，附 1 回合眩晕与 -15 SP；对 Boss 仍附眩晕与 SP 伤害但无法拉动。',
              note: '出现概率 30%。',
            },
          ],
        },
        {
          tier: '25 级解锁',
          list: [
            {
              name: '先苦后甜',
              color: 'orange',
              colorLabel: '橘色',
              cost: '4 步',
              description: '下一回合额外 +4 步（技能池一次仅能存在 1 张）。',
              note: '出现概率 15%。',
            },
          ],
        },
      ],
    },
  },
};

function renderCharacter(characterId) {
  const data = characterData[characterId];
  if (!data) return;

  document.querySelectorAll('.character-tab').forEach((tab) => {
    tab.classList.toggle('active', tab.dataset.character === characterId);
  });

  const portrait = document.querySelector('.portrait-art');
  const portraitImg = portrait.querySelector('.portrait-image');
  if (portraitImg) {
    applyPortraitImage(portraitImg, data);
  }

  document.querySelector('.level-number').textContent = data.level;
  portrait.setAttribute('aria-label', `${data.name} 立绘`);

  renderCharacterSection('bio', characterId);
}

function renderCharacterSection(section, characterId) {
  const data = characterData[characterId];
  if (!data) return;

  document.querySelectorAll('.detail-tab').forEach((tab) => {
    tab.classList.toggle('active', tab.dataset.section === section);
  });

  const container = document.querySelector('.detail-content');
  container.innerHTML = '';

  if (section === 'bio') {
    data.bio.intro.forEach((paragraph) => {
      const p = document.createElement('p');
      p.textContent = paragraph;
      container.appendChild(p);
    });

    const list = document.createElement('ul');
    data.bio.facts.forEach((fact) => {
      const li = document.createElement('li');
      li.textContent = fact;
      list.appendChild(li);
    });
    container.appendChild(list);
  } else {
    const header = document.createElement('h3');
    header.textContent = data.name;
    container.appendChild(header);

    const overview = document.createElement('p');
    overview.textContent = data.skills.overview;
    container.appendChild(overview);

    const passiveTitle = document.createElement('h4');
    passiveTitle.textContent = '被动技能';
    container.appendChild(passiveTitle);

    const passiveList = document.createElement('ul');
    passiveList.className = 'passive-skill-list';
    data.skills.passives.forEach((item) => {
      const li = document.createElement('li');
      li.textContent = item;
      passiveList.appendChild(li);
    });
    container.appendChild(passiveList);

    data.skills.actives.forEach((tierBlock) => {
      const tierTitle = document.createElement('h4');
      tierTitle.textContent = tierBlock.tier;
      container.appendChild(tierTitle);

      const ul = document.createElement('ul');
      ul.className = 'active-skill-list';
      tierBlock.list.forEach((entry) => {
        const li = document.createElement('li');
        li.className = 'skill-entry';

        const badge = document.createElement('span');
        badge.className = `skill-badge skill-${entry.color}`;
        badge.textContent = entry.colorLabel;
        li.appendChild(badge);

        const body = document.createElement('div');
        body.className = 'skill-body';

        const headerRow = document.createElement('div');
        headerRow.className = 'skill-header';

        const title = document.createElement('strong');
        title.textContent = entry.name;
        headerRow.appendChild(title);

        const cost = document.createElement('span');
        cost.className = 'skill-cost';
        cost.textContent = entry.cost;
        headerRow.appendChild(cost);

        body.appendChild(headerRow);

        const desc = document.createElement('p');
        desc.textContent = `${entry.description}${entry.note ? ` ${entry.note}` : ''}`;
        body.appendChild(desc);

        li.appendChild(body);
        ul.appendChild(li);
      });
      container.appendChild(ul);
    });
  }
}

function initCharacterBoard() {
  document.querySelectorAll('.character-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      renderCharacter(tab.dataset.character);
    });
  });

  document.querySelectorAll('.detail-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      renderCharacterSection(tab.dataset.section, document.querySelector('.character-tab.active').dataset.character);
    });
  });

  renderCharacter('adora');
}

const tutorialData = {
  basics: {
    title: '简短游戏玩法',
    sections: [
      {
        heading: 'HP / SP',
        bullets: [
          'HP 归零即死亡。',
          'SP 归零会令单位获得 1 层眩晕 Debuff 与 -1 步，眩晕结束后恢复部分 SP（数值因单位而异）。',
        ],
      },
      {
        heading: '步数',
        bullets: [
          '双方以 3 步开局，每回合 +1 步。',
          '若双方平均等级不同，较高者每回合额外 +2 步。',
          '步数用于移动、攻击与释放技能，默认上限 10（可被增减）。',
        ],
      },
      {
        heading: '回合',
        bullets: [
          '我方行动结束 + 敌方行动结束 = 1 个完整回合。',
        ],
      },
      {
        heading: '掩体',
        bullets: [
          '非范围（非 AOE）技能无法穿透掩体，也不能进入掩体格。',
        ],
      },
    ],
  },
  skills: {
    title: '技能',
    sections: [
      {
        heading: '颜色分类',
        bullets: [
          '绿色（1 步）：普通攻击。',
          '蓝色（2 步）：移动技能。',
          '红色（3 步及以上）：大招。',
          '白色（不定步数）：自带被动效果的技能。',
          '粉色（2 步及以上）：普通增益技能。',
          '橘色（2 步及以上）：特异增益技能。',
        ],
      },
      {
        heading: '特殊分类',
        bullets: [
          '多阶段攻击：一个技能分成多段伤害，可附加不同效果或范围。',
          '被动：无需主动发动即可生效的能力。',
        ],
      },
    ],
  },
  effects: {
    title: '特殊效果（目前有的）',
    sections: [
      {
        heading: '持续状态',
        bullets: [
          '流血：每回合 -5% HP，持续 2 回合，可叠加。',
          '眩晕层数：可叠加，达到门槛后触发眩晕 Debuff。',
          '眩晕 Debuff：目标失去行动 1 回合并消耗 1 层眩晕 Debuff。',
          '恐惧：下回合 -1 步，可叠加。',
          '鸡血：下一次攻击伤害 ×2 并消耗 1 层（每单位最多 1 层，若多阶段仅加于最后一段）。',
          '依赖：下一次攻击造成真实伤害并降自身 SP 至 0（每单位最多 1 层）。',
          '“恢复”Buff：下一个大回合开始时恢复 5 HP 并消耗 1 层，每个大回合仅触发 1 层，可叠加。',
        ],
      },
    ],
  },
  enemies: {
    title: '敌人',
    sections: [
      {
        heading: '敌人类型',
        bullets: [
          '普通：无特殊能力。',
          '高级：暂未实装。',
          '精英：拥有秒杀技能时改为固定伤害（如嗜血之握 100 HP），需累计 2 层眩晕层数触发 1 层眩晕 Debuff。',
          '小 Boss：秒杀技能改为 80 HP，需 3 层眩晕层数触发眩晕 Debuff，无法被强制位移。',
          'Boss：秒杀技能改为 75 HP，需 4 层眩晕层数触发眩晕 Debuff，无法被强制位移。',
          '特殊：？？？（尚未公开）。',
        ],
      },
    ],
  },
};

function renderTutorial(topic) {
  document.querySelectorAll('.tutorial-tab').forEach((tab) => {
    tab.classList.toggle('active', tab.dataset.topic === topic);
  });

  const data = tutorialData[topic];
  const container = document.querySelector('.tutorial-content');
  if (!data) {
    container.innerHTML = '<p>该教学内容尚未开放。</p>';
    return;
  }

  container.innerHTML = '';
  const title = document.createElement('h3');
  title.textContent = data.title;
  container.appendChild(title);

  data.sections.forEach((section) => {
    const heading = document.createElement('h4');
    heading.textContent = section.heading;
    container.appendChild(heading);

    const list = document.createElement('ul');
    section.bullets.forEach((item) => {
      const li = document.createElement('li');
      li.textContent = item;
      list.appendChild(li);
    });
    container.appendChild(list);
  });
}

function initTutorialBoard() {
  document.querySelectorAll('.tutorial-tab').forEach((tab) => {
    tab.addEventListener('click', () => renderTutorial(tab.dataset.topic));
  });

  renderTutorial('basics');
}

function bindNavigation() {
  document.querySelectorAll('[data-target]').forEach((btn) => {
    if (btn.classList.contains('menu-btn')) return;
    btn.addEventListener('click', () => {
      const target = btn.dataset.target;
      toggleSettings(false);
      if (target === 'characters' && currentScreen !== 'stages') {
        showToast('请先进入关卡选择界面。');
        return;
      }
      transitionTo(target);
    });
  });
}

function initialiseMaskReveal() {
  maskBusy = true;
  let completed = false;

  const finish = (event) => {
    if (event.propertyName !== 'transform') return;
    mask.removeEventListener('transitionend', finish);
    completed = true;
    resetMaskState();
  };

  setTimeout(() => {
    mask.classList.remove('covering');
    mask.classList.add('revealing');
    mask.addEventListener('transitionend', finish);
  }, 300);

  setTimeout(() => {
    if (completed) return;
    mask.removeEventListener('transitionend', finish);
    completed = true;
    resetMaskState();
  }, 1500);
}

function init() {
  initialiseMaskReveal();
  initialiseMenu();
  initChapterBoard();
  initStageBoard();
  initCharacterBoard();
  initTutorialBoard();
  bindNavigation();
  loadSevenSeasMapFromFile();
  renderStage('intro');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    toggleSettings(false);
  }
});







;


/* ===== BGM autoplay + LIVE amplitude follower (HARD-EDGED MAX) =====
   - Stronger, crisp motion (no jelly): big uniform scale + lift
   - Gated transients + micro-baseline so idle sections aren't dead
   - Small per-word lag for depth
================================================================= */
(function setupBGMAndBeat() {
  const audioEl = document.getElementById('bgm');
  if (!audioEl) return;

  const getTargets = () => {
    const menu = document.querySelector('.screen-menu.active');
    return menu ? Array.from(menu.querySelectorAll('.logo-word')) : [];
  };

  // Autoplay: muted -> fade in
  audioEl.autoplay = true;
  audioEl.loop = true;
  audioEl.volume = 0.0;
  audioEl.muted = true;

  function fadeIn() {
    try {
      audioEl.muted = false;
      const target = 0.8;
      const steps = 22;
      let v = 0;
      const timer = setInterval(() => {
        v += target/steps;
        audioEl.volume = Math.min(target, v);
        if (audioEl.volume >= target) clearInterval(timer);
      }, 45);
    } catch {}
  }
  audioEl.addEventListener('playing', fadeIn, { once: true });
  audioEl.addEventListener('canplay', () => { try { audioEl.play(); } catch {} }, { once: true });
  try { const p = audioEl.play(); if (p && p.catch) p.catch(() => { audioEl.muted = true; audioEl.play().catch(()=>{}); }); } catch {}

  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) throw new Error('no webaudio');
    const ctx = new AudioCtx();
    const resume = () => { if (ctx.state !== 'running') ctx.resume().catch(()=>{}); };
    resume();

    const src = ctx.createMediaElementSource(audioEl);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.80; // more reactive for larger hits
    src.connect(analyser);
    analyser.connect(ctx.destination);

    const freq = new Uint8Array(analyser.frequencyBinCount);

    // Baselines / stats
    let ema = 120, varE = 0;
    const emaAlpha = 0.025;

    // Impulse gate
    let pulse = 0, hold = 0, lastFire = 0, lastImpulseAt = performance.now();
    let thresholdZ = 2.6;           // start fairly high
    const minGapMs = 70;            // allow denser hits
    const holdMs = 60;              // snappier hold
    const decayPerSec = 7.5;        // faster decay (crisp)

    // Micro baseline follower 0..1
    let baseEnv = 0;
    const baseUp = 0.3, baseDn = 0.12;

    // Slight lag for second word
    const perWordLag = [0, 10];

    function tick() {
      analyser.getByteFrequencyData(freq);

      // Weighted energy: emphasize low end but include some low-mid
      let low=0, nm=0, mid=0, nn=0;
      for (let i = 2; i < 26 && i < freq.length; i++) { low += freq[i]; nm++; }  // ~40-150Hz
      for (let i = 26; i < 46 && i < freq.length; i++) { mid += freq[i]; nn++; } // ~150-260Hz
      const eLow = low / Math.max(1,nm);
      const eMid = mid / Math.max(1,nn);
      const energy = 0.75*eLow + 0.25*eMid;

      // z-score gating
      ema = (1 - emaAlpha) * ema + emaAlpha * energy;
      const d = energy - ema;
      varE = (1 - emaAlpha) * varE + emaAlpha * d * d;
      const std = Math.sqrt(varE + 1e-6);
      const z = (energy - ema) / (std + 1e-6);

      const nowMs = performance.now();
      // Adaptive threshold window
      if (nowMs - lastImpulseAt > 1200)      thresholdZ = Math.max(1.8, thresholdZ - 0.08);
      else if (nowMs - lastImpulseAt < 400)  thresholdZ = Math.min(2.8, thresholdZ + 0.02);

      if (z > thresholdZ && (nowMs - lastFire) > minGapMs) {
        lastFire = nowMs;
        lastImpulseAt = nowMs;
        hold = holdMs;
        const kick = Math.min(2.0, (z - thresholdZ) * 0.7 + 0.7);
        pulse = Math.max(pulse, kick);
      }

      // Hold/decay
      const dt = 1/60;
      if (hold > 0) { hold -= dt*1000; if (hold < 0) hold = 0; }
      else { pulse *= Math.exp(-decayPerSec * dt); }

      // Baseline follower
      let tBase = (energy - ema + 1.4*std) / (3.0*std + 1e-6);
      tBase = Math.max(0, Math.min(1, tBase));
      baseEnv = baseEnv + (tBase > baseEnv ? baseUp : baseDn) * (tBase - baseEnv);

      // Map to visuals (MAX): big uniform scale + lift, minimal blur, higher contrast
      const amp = Math.min(2.2, pulse);
      const scale = 1 + baseEnv * 0.03 + amp * 0.18;  // up to ~+0.03 + +0.396
      const lift  = -(baseEnv * 2.5 + amp * 10);      // up to ~-22px
      const glow  = Math.min(1, baseEnv * 0.35 + amp * 0.85);
      const blur  = Math.round(8 + 14 * glow);        // keep blur modest (hard look)
      const drop  = Math.round(10 + 18 * glow);

      const targets = getTargets();
      if (targets.length) {
        targets.forEach((el, idx) => {
          if (!el._ampLag) el._ampLag = amp;
          const beta = perWordLag[idx % 2] ? 0.22 : 0.0;
          el._ampLag = el._ampLag + beta * (amp - el._ampLag);
          const a2 = perWordLag[idx % 2] ? el._ampLag : amp;

          el.style.transform = `translateY(${(- (baseEnv*2.5 + a2*10)).toFixed(2)}px) scale(${(1 + baseEnv*0.03 + a2*0.18).toFixed(4)})`;
          el.style.textShadow = `0 0 ${blur}px rgba(255,255,255,0.68)`;
          el.style.filter = `drop-shadow(0 0 ${drop}px rgba(255,255,255,0.52)) contrast(${(1 + (baseEnv*0.12 + a2*0.32)).toFixed(3)})`;
          el.style.letterSpacing = '';
          el.style.rotate = '';
        });
      }
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  } catch (e) {
    // Fallback: uniform punch
    let t0 = performance.now();
    function breath() {
      const t = (performance.now() - t0) / 1000;
      const e = Math.max(0, Math.sin(t * 2 * Math.PI * 2));
      const s = 1 + e * 0.12;
      const y = -e * 8;
      const targets = getTargets();
      if (targets.length) {
        targets.forEach((el) => {
          el.style.transform = `translateY(${y.toFixed(2)}px) scale(${s.toFixed(4)})`;
          el.style.textShadow = `0 0 ${Math.round(18 + 14*e)}px rgba(255,255,255,0.6)`;
          el.style.filter = `drop-shadow(0 0 ${Math.round(14 + 14*e)}px rgba(255,255,255,0.48))`;
        });
      }
      requestAnimationFrame(breath);
    }
    requestAnimationFrame(breath);
  }
})();
;
;





