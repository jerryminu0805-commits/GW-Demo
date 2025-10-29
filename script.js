const screens = Array.from(document.querySelectorAll('.screen'));
const mask = document.querySelector('.transition-mask');
const toast = document.querySelector('.toast');
let currentScreen = 'menu';
let currentStageKey = 'intro';
let maskBusy = false;

const stageIntelState = {
  intro: false,
  limit: false,
  seven: false,
};

const stageData = {
  intro: {
    title: 'Intro',
    subtitle: '初次接触战术系统',
    meta: ['推荐等级 Lv.20', '地图 7×14', '步数上限 10'],
    description: `
      <h4>战术简报</h4>
      <p>狭长的 7×14 战术区域，用以熟悉基础移动与掩体概念。我方三人并肩推进，对面为执勤刑警队伍。</p>
      <ul>
        <li>关注 HP / SP 的耗损节奏。</li>
        <li>熟悉 1 步、2 步技能的基础手感。</li>
        <li>无掩体干扰，适合练习进退与站位。</li>
      </ul>
    `,
    map: {
      width: 14,
      height: 7,
      coverCells: [],
      heroSpawns: [
        { x: 2, y: 4, label: 'Adora' },
        { x: 2, y: 6, label: 'Dario' },
        { x: 2, y: 2, label: 'Karma' },
      ],
      enemySpawns: [
        { x: 13, y: 4, label: '刑警队员' },
        { x: 13, y: 6, label: '刑警队员' },
        { x: 13, y: 2, label: '刑警队员' },
      ],
      voidRects: [],
    },
    enemies: [
      {
        name: '刑警队员',
        icon: 'COP',
        tags: ['普通', '占 1 格', 'Lv.20'],
        stats: ['HP 100', 'SP 80（降至 0：失控 1 回合并 -1 步，随后恢复 80）'],
        passives: ['正义光环：每对方回合增加自身 15 HP。'],
        skills: [
          '捅（1 步）：前方 1 格 5 伤害 + 5 SP 伤害，拔出再造成 5 伤害 + 5 SP 伤害（70%）。',
          '枪击（1 步）：指定直线 10 伤害 + 5 SP 伤害（65%）。',
          '连续挥刀（2 步）：三段挥击，总计 25 伤害与 10 SP 伤害（50%）。',
        ],
      },
    ],
  },
  limit: {
    title: '疲惫的极限',
    subtitle: '精神力拉锯',
    meta: ['推荐等级 Lv.25', '地图 10×20', '步数上限 10'],
    description: `
      <h4>战术简报</h4>
      <p>10×20 的横向战线。Khathia（赫雷西第六干部·变身）于正面压阵，持续施加范围压迫。</p>
      <ul>
        <li>管理眩晕层数与恐惧减步。</li>
        <li>重点关注 Boss 的范围攻击与 SP 恢复节奏。</li>
        <li>借助恢复与增益技能稳住阵线。</li>
      </ul>
    `,
    map: {
      width: 20,
      height: 10,
      coverCells: [],
      heroSpawns: [
        { x: 2, y: 7, label: 'Adora' },
        { x: 2, y: 9, label: 'Dario' },
        { x: 2, y: 5, label: 'Karma' },
      ],
      enemySpawns: [{ x: 18, y: 7, label: 'Khathia' }],
      voidRects: [],
    },
    enemies: [
      {
        name: 'Khathia',
        icon: 'KH',
        tags: ['Boss', '占 4 格', 'Lv.35'],
        stats: ['HP 500', 'SP 0（至 -100：失控 1 回合并 -1 步，随后归零）'],
        passives: [
          '老干部：每打中敌人恢复 2 SP。',
          '变态躯体：伤害 ×0.75，且 15% 概率免疫伤害。',
          '疲劳的躯体：每 5 回合 -2 步。',
          '糟糕的最初设计：每回合最多移动 3 格。',
        ],
        skills: [
          '血肉之刃（1 步）：前方 2×1 横斩，15 伤害（70%）。',
          '怨念之爪（1 步）：前方 2×2 抓击，10 伤害与 -5 SP（70%）。',
          '横扫（2 步）：前方 4×2 横斩，20 伤害（60%）。',
          '痛苦咆哮（2 步）：恢复全部 SP（35%）。',
          '过多疲劳患者最终的挣扎（3 步）：以自为中心 9×9，50 伤害与 -70 SP（30%）。',
        ],
      },
    ],
  },
  seven: {
    title: '七海',
    subtitle: '七海作战队遭遇战',
    meta: ['推荐等级 Lv.35+', '地图 22×20', '步数上限 10'],
    description: `
      <h4>战术简报</h4>
      <p>夜幕废弃码头，18×22 战术区域（右下 8×10 缺口）。Haz 率七海作战队登场，全员初始获得「作战余波」Debuff（-25% HP、对敌伤害 -5）。</p>
      <h4>简报片段</h4>
      <p>“……你们想查 Cult，那就去码头找他们。‘七海作战队’，唯一一支不归我们政府调度的队伍。如果你们还有命回来，我们再谈下一步。”</p>
      <p>三人组踏入破旧码头，与满身血迹的 Haz 正面相遇。鱼叉指向 Adora，气氛骤然紧绷——七海全员拉起面具，战斗迫在眉睫。</p>
    `,
    map: {
      width: 22,
      height: 20,
      coverCells: [
        // (2,3)-(4,5)
        { x: 2, y: 3 },
        { x: 2, y: 4 },
        { x: 2, y: 5 },
        { x: 3, y: 3 },
        { x: 3, y: 4 },
        { x: 3, y: 5 },
        { x: 4, y: 3 },
        { x: 4, y: 4 },
        { x: 4, y: 5 },
        // (2,12)-(5,14)
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
        // (10,11)-(12,13)
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
        { x: 21, y: 18, label: 'Haz' },
        { x: 19, y: 16, label: 'Tusk' },
        { x: 19, y: 19, label: 'Katz' },
        { x: 15, y: 20, label: 'Neyla' },
        { x: 15, y: 15, label: 'Kyn' },
      ],
      voidRects: [{ x: 15, y: 1, width: 8, height: 10 }],
    },
    enemies: [
      {
        name: 'Haz',
        icon: 'HZ',
        tags: ['Boss', '占 1 格', 'Lv.55'],
        stats: ['HP 750', 'SP 100（降至 0：失控 1 回合并 -1 步，恢复 100 与自身 5% HP）'],
        passives: [
          '弑神执念：HP < 50% 时伤害 +30%。',
          '难以抑制的仇恨：40% 几率 -5 SP 并附加恐惧。',
          '队员们听令！：双数回合自身 +10 SP，全队 +5 SP。',
          '他们不是主菜！：1～15 回合全队获得 30% 几率 ×1.5 暴击。',
          '把他们追杀到天涯海角！：首次命中赋予猎杀标记，全队对该目标 +15% 伤害。',
          '一切牺牲都是值得的……：20 回合后队员获得禁忌技能。',
          '力挽狂澜：仅 Haz 存活时，伤害 +10%、受伤 -10%，并解锁额外技能。',
        ],
        skills: [
          '鱼叉穿刺（1 步）：前方 1 格 20 伤害并恢复 10 SP（70%）。',
          '深海猎杀（2 步）：前方 3 格拉近并造成 25 伤害、-10 SP（60%）。',
          '猎神之叉（2 步）：瞬移至 5×5 内敌人身边，造成 20 伤害（50% ×2.0）、15 SP 伤害与 1 层流血（65%）。',
          '锁链缠绕（2 步）：2 回合内 -40% 受伤并对下次攻击者造成 10 SP 伤害，全队 +5 SP（50%）。',
          '鲸落（4 步）：以自身为中心 5×5，50 伤害与 20 SP 伤害，目标下回合 -1 步（30%）。',
          { text: '怨念滋生（1 步）：对所有带猎杀标记单位附加流血与恐惧（力挽狂澜后）。', locked: true },
          { text: '付出代价（2 步）：连续三段打击并附带 SP 伤害、流血（力挽狂澜后）。', locked: true },
          { text: '仇恨之叉（2 步）：横扫 +5×5 震击并附加 Haz 流血（力挽狂澜后）。', locked: true },
        ],
      },
      {
        name: 'Katz',
        icon: 'KZ',
        tags: ['小 Boss', '占 1 格', 'Lv.53'],
        stats: ['HP 500', 'SP 75（降至 0：失控 1 回合并 -1 步，恢复 75）'],
        passives: [
          '隐秘迷恋：Haz 在场时伤害 +20%，每回合 +5 SP。',
          '恐怖执行力：回合内命中 ≥2 次追加矛刺并 +30% 伤害。',
          '女强人：SP > 60 时伤害 +10%。',
        ],
        skills: [
          '矛刺（1 步）：前方 1 格 20 伤害并恢复 5 SP（70%）。',
          '链式鞭击（2 步）：前方 3 格 25 伤害并 -1 步（60%）。',
          '反复鞭尸（3 步）：前方 3 格多段鞭击，最多重复 5 次，每次恢复 5 SP（50%）。',
          '终焉礼炮（4 步）：前方 3 格投掷爆炸，3×3 范围 60 伤害与 -15 SP，下回合 -1 步（30%）。',
          { text: '必须抹杀一切……（2 步）：多段自损鞭击并可重复 5 次（队长压迫后）。', locked: true },
        ],
      },
      {
        name: 'Tusk',
        icon: 'TK',
        tags: ['小 Boss', '占 2 格', 'Lv.54'],
        stats: ['HP 1000', 'SP 60（降至 0：失控 1 回合并 -1 步，恢复 60）'],
        passives: [
          '家人的守护：Haz 受伤时改由 Tusk 承受 50% 免伤。',
          '铁壁如山：所有伤害 -30%。',
          '猛牛之力：每受伤一次，下次攻击 +5 伤害，可叠加。',
        ],
        skills: [
          '骨盾猛击（1 步）：前方 1 格 10 伤害并击退 1 格（70%）。',
          '来自深海的咆哮（2 步）：周围 3×3 敌人 -20 SP，自身额外 -20% 受伤（60%）。',
          '牛鲨冲撞（2 步）：前冲 2×3，沿途 25 伤害并眩晕 1 回合（50%）。',
          '战争堡垒（3 步）：3 回合 -50% 受伤，每回合 +10 SP，并令 Haz 伤害 +15%（30%）。',
          { text: '拼尽全力保卫队长……（2 步）：进入反伤姿态，25% 反伤，Haz 恢复 15% HP / 15 SP（队长压迫后）。', locked: true },
        ],
      },
      {
        name: 'Neyla',
        icon: 'NY',
        tags: ['精英', '占 1 格', 'Lv.52'],
        stats: ['HP 350', 'SP 80（降至 0：失控 1 回合并 -1 步，恢复 80）'],
        passives: [
          '精确瞄准：回合内未移动，伤害 +50%。',
          '冷血执行者：目标 HP < 50% 时伤害 ×2。',
          '神速装填：每 3 回合 +10 SP。',
        ],
        skills: [
          '迅捷射击（1 步）：4 格内目标 15 伤害并 -5 SP（70%）。',
          '穿刺狙击（2 步）：直线 6 格 30 伤害并附流血（60%）。',
          '双钩牵制（2 步）：前方 4 格 15 伤害并 -2 步（50%）。',
          '终末之影（3 步）：全图任意目标 50 伤害、20 SP 伤害，下回合 -1 步（30%）。',
          { text: '执行……（2 步）：前方一排双段鱼叉，目标 <15% HP 直接处决（队长压迫后，消耗自身 HP / SP）。', locked: true },
        ],
      },
      {
        name: 'Kyn',
        icon: 'KN',
        tags: ['精英', '占 1 格', 'Lv.51'],
        stats: ['HP 250', 'SP 70（降至 0：失控 1 回合并 -1 步，恢复 70）'],
        passives: [
          '打道回府：击杀后回合开始瞬移至 Haz 身边。',
          '无情暗杀：目标 HP < 25% 时直接斩杀。',
          '迅捷如风：回合开始自动 +5 SP。',
        ],
        skills: [
          '迅影突刺（1 步）：瞬移至 5×5 内敌人身边并造成 20 伤害（70%）。',
          '割喉飞刃（2 步）：直线 3 格 25 伤害与 5 SP 伤害（60%）。',
          '影杀之舞（2 步）：周围 3×3 30 伤害并无消耗移动 1 格（50%）。',
          '死亡宣告（3 步）：单体 50 伤害 + 30 SP，目标 HP < 30% 斩杀（30%）。',
          { text: '自我了断……（2 步）：瞬移并秒杀目标，自身归零（队长压迫后）。', locked: true },
        ],
      },
    ],
  },
};

const tutorialContent = {
  basics: `
    <h4>Hp / Sp</h4>
    <ul>
      <li>HP 降至 0 等于死亡。</li>
      <li>SP 降至 0 会给该单位上一层眩晕 Buff 并减一步，眩晕结束后恢复部分 SP（每个单位不同）。</li>
    </ul>
    <h4>步数</h4>
    <ul>
      <li>双方起始拥有 3 步，每回合都会额外 +1 步。</li>
      <li>若双方平均等级存在差距，更高的一方每回合额外 +2 步。</li>
      <li>步数决定任何行动与技能费用，上限 10（可被技能增减）。</li>
    </ul>
    <h4>回合</h4>
    <p>每当我方行动完毕以及敌方行动完毕，各计 1 回合。</p>
    <h4>掩体</h4>
    <p>掩体易懂：非范围技能无法穿透，且无法进入掩体格。</p>
  `,
  skills: `
    <h4>技能颜色分类</h4>
    <ul>
      <li><span class="skill-tag green">绿色（1 步）</span>：普通攻击。</li>
      <li><span class="skill-tag blue">蓝色（2 步）</span>：移动技能。</li>
      <li><span class="skill-tag red">红色（3 步以上）</span>：大招。</li>
      <li><span class="skill-tag white">白色（可变）</span>：自带被动的技能。</li>
      <li><span class="skill-tag pink">粉色（2 步以上）</span>：普通增益技能。</li>
      <li><span class="skill-tag orange">橘色（2 步以上）</span>：特异增益功能。</li>
    </ul>
    <h4>机制说明</h4>
    <ul>
      <li>多阶段攻击：单个技能分数段打击，每一段可能附带特殊效果或不同范围。</li>
      <li>被动：无需主动发动的常驻效果。</li>
    </ul>
  `,
  effects: `
    <h4>特殊效果（目前有的）</h4>
    <ul>
      <li>流血：每回合减少 5% HP，持续 2 回合，可叠加。</li>
      <li>眩晕层数：可叠加，无特殊效果。</li>
      <li>眩晕 Debuff：达到需求层数后失去行动 1 回合并消耗 1 层眩晕 Debuff。</li>
      <li>恐惧：下回合减一步，可叠加。</li>
      <li>鸡血：下一次攻击伤害 ×2 并消耗 1 层鸡血（多阶段在最后一段结算），单体最多 1 层。</li>
      <li>依赖：下一次攻击造成真实伤害并将自身 SP 归零，使用后消耗，单体最多 1 层。</li>
      <li>“恢复” Buff：下一大回合开始时恢复 5 HP 并消耗 1 层，每个大回合只会消耗 1 层，可叠加。</li>
    </ul>
  `,
  enemies: `
    <h4>敌人</h4>
    <ul>
      <li>普通：没有特殊机制。</li>
      <li>高级：目前没有。</li>
      <li>精英：需叠 2 层眩晕才会换取 1 层眩晕 Debuff；秒杀技能改为造成 100 HP。</li>
      <li>小 Boss：需叠 3 层眩晕才能获得 1 层眩晕 Debuff；秒杀技能改为造成 80 HP，无法被位移。</li>
      <li>Boss：需叠 4 层眩晕才会获得 1 层眩晕 Debuff；秒杀技能造成 75 HP，无法被位移。</li>
      <li>特殊：？？？</li>
    </ul>
    <p>七海作战队所有人开场时获得「作战余波」Debuff（-25% HP、对敌伤害 -5）。</p>
  `,
};

const characterData = {
  adora: {
    level: 20,
    intro: `
      <h3>Adora</h3>
      <p>名字在西班牙语里意为“崇拜”。Adora 刚出生时家人以为他是女孩，于是给了他一个偏女性化的名字。可在英语里，Adora 也被他理解为与“收养”有关，这也预示了他在九岁时父母双亡的命运。在日语里，名字前半的“Ado”有“喧嚣、骚动”之意，也象征着他在目睹朋友被枪杀后如何化为怪物。</p>
      <p>他原本是个快乐的孩子，六岁时结识了两位挚友 Karma 与 Dario。家境并不富裕，但父母把能给的一切都给了这个独生子。九岁生日那天，他执意要去离家不远的游乐园。途中，一名“异端”成员已在街中央暴走，化作巨大、灾厄般、非人的怪物。车辆来不及刹车撞上了它；怪物的尖刺贯穿车体，杀死了 Adora 的父母，也夺走了他的一只眼。怪物受伤后逃逸，几辆警车紧随其后。童年的这场创伤伴随了 Adora 的一生。事发后，他拒绝警方的帮助，径直跑到 Dario 家，看到 Karma 也已经住在那里。</p>
      <p>他头发右侧的“腐蚀”来自那场导致父母丧生的事故。在亲眼看见朋友死在面前之后，他逐渐变成了一个嗜血、失去自我、残暴的怪物；这一过程极其不人道且痛苦。</p>
      <ul>
        <li>通常穿一件舒适的毛衣。</li>
        <li>深灰色长发一直垂到身体下半部。</li>
        <li>9～15 岁这几年一直处于抑郁状态。</li>
        <li>但成绩始终名列年级前茅。</li>
        <li>各科都很聪明，几乎样样精通，兴趣广泛，包括但不限于技术、游戏、照顾动物等。</li>
        <li>并不喜欢暴力，但必要时会致命。</li>
        <li>小时候（6 岁）喜欢戴帽子；异端事件（9 岁）后几乎从不摘下。</li>
        <li>有点懒，偶尔有些孩子气。</li>
        <li>多数时候试图劝两位朋友少些暴力。</li>
        <li>力量与速度都不算强，不喜欢运动或任何需要剧烈活动的事。</li>
        <li>不太喜欢出门。</li>
        <li>9 岁后一直戴着眼罩，直到 16 岁才摘下；左眼变成了十字形，他觉得不好看，于是在左眼上加了一枚钉子，贯穿左眼与头部。</li>
        <li>16 岁后开始变得更开心，也许是这些年朋友持续安慰与陪伴的缘故？</li>
        <li>喜欢喝汽水。</li>
        <li>现年龄：18｜身高：169 cm｜生日：8 月 4 日。</li>
        <li>真心信任、热爱并珍惜这个三人组。</li>
      </ul>
    `,
    skills: `
      <h3>技能</h3>
      <p>HP：100｜SP：100（降至 0 会丧失控制权 1 回合并减少 1 步，随后恢复 50% SP）</p>
      <ul>
        <li>被动：背刺——如果攻击到敌方单位的背后造成伤害 ×1.5。</li>
        <li>被动：冷静分析——如果该回合没有任何动作则恢复 10 点 SP。</li>
        <li>被动：啊啊啊你们没事吧？！——如果有友方单位在 Adora 6×6 格范围内的话回复 5% 的血量以及 5 点 SP（不包括自己）。</li>
        <li>被动：对战斗的恐惧——如果低于 10 点 SP 增加 ×1.5 伤害。</li>
        <li>短匕轻挥！（绿·1 步）——前方 1 格造成 10 点伤害以及 5 点精神伤害（80% 可能性）。</li>
        <li>枪击（灰·1 步）——指定方位一整排 10 伤害 + 5 点精神伤害（需手枪，道具 65% 可能性）。</li>
        <li>呀！你不要靠近我呀！！（蓝·2 步）——可选择四周任意 5 格移动；若对方 HP < 50% 追击一次“短匕轻挥！”（40%）。</li>
        <li>自制粉色迷你电击装置！（红·3 步）——前方 2 格造成 10 伤害与 15 精神伤害并麻痹对方（30%）。</li>
        <li>25 级解锁：略懂的医术！（粉·2 步）——以自身为中心 5×5 选定友方，恢复 20 HP + 15 SP 并赋予“恢复”Buff（30%）。</li>
        <li>25 级解锁：加油哇！（橘·4 步）——5×5 友方获得“鸡血”Buff（20%）。</li>
        <li>35 级解锁：只能靠你了。。（橘·4 步）——牺牲 25 HP，指定周围 5 格友方施加“依赖”Buff（15%）。</li>
      </ul>
    `,
  },
  karma: {
    level: 20,
    intro: `
      <h3>Karma</h3>
      <p>名字意为“命运、天意、行动”，象征着他的所作所为最终导向了不可避免的致命结局。自出生起就和 Dario 是朋友，幼儿园时结识了 Adora。看到 Adora 总是一个人，他便主动上前结交。他与父母关系不好，家里常年争吵。9 岁那年，母亲与父亲争执后把怒气发泄在 Karma 身上。Karma 无法继续忍受这种令人窒息的氛围，搬去了 Dario 家。</p>
      <ul>
        <li>平时穿衬衫配黑裤。</li>
        <li>手掌很大，栗红色头发。</li>
        <li>在校时成绩常年垫底，不擅长需要动脑的事情。</li>
        <li>喜好暴力，但在 Adora 的长期劝导下学会克制。</li>
        <li>常常不经思考就先行动。</li>
        <li>头后方有红色“†”胎记，被认为是诅咒失败的痕迹。</li>
        <li>曾沉迷电子游戏，但被 Adora 打得毫无还手之力后弃坑。</li>
        <li>童年不正常，因此性格略显扭曲。</li>
        <li>18 岁后与 Dario 增加违法活动，Adora 虽不赞同但最终加入。</li>
        <li>力量极强，几拳就能砸倒一棵树，体育纪录保持者。</li>
        <li>喜欢能量饮料和酒精，改用电子烟以照顾 Adora。</li>
        <li>爱吃肉，幼儿园起暗恋 Adora（当时不知道他是男生）。</li>
        <li>现年龄：19｜身高：189 cm｜生日：4 月 14 日。</li>
        <li>真心信任、热爱并珍惜这个三人组。</li>
      </ul>
    `,
    skills: `
      <h3>技能</h3>
      <p>HP：200｜SP：50（降至 0 会丧失控制权 1 回合并减少 1 步，同时扣除 20 HP，随后恢复 50% SP）</p>
      <ul>
        <li>被动：暴力瘾——连续攻击伤害 ×1.5；连续 ≥3 次追击“沙包大的拳头”，连续 4 次后 -5 SP。</li>
        <li>被动：强悍的肉体——所有受到的伤害 ×0.75。</li>
        <li>被动：自尊心——根据丢失的血量提升自身伤害（1% 换 0.5%）。</li>
        <li>沙包大的拳头（绿·1 步）：15 伤害（80%）。</li>
        <li>枪击（灰·1 步）：指定直线 10 伤害 + 5 精神伤害（需手枪，道具 65%）。</li>
        <li>都听你的（蓝·2 步）：可选择四周任意 3 格并回复 5 SP（40%）。</li>
        <li>嗜血之握（红·3 步）：连续使用四次沙包大的拳头后抓取，非 Boss 75 / 小 Boss 80 / 精英 100 伤害并处决（30%）。</li>
        <li>25 级解锁：深呼吸（白·2 步）：主动恢复所有 SP 并回复 10 HP；若当前技能池未使用则 +10% 伤害（唯一，20%）。</li>
      </ul>
    `,
  },
  dario: {
    level: 20,
    intro: `
      <h3>Dario</h3>
      <p>名字意为“财富、富有、更多的钱”，象征着他当下的经济水平。他一直不喜欢自己的名字——先是觉得难听，其次这是父母起的名字，而父母在他 6 岁时就消失了，只留下豪宅、汽车与大笔金钱。</p>
      <p>他与另外两人是好友，三人常在他其中一栋豪宅周围活动，并把那里定为据点。</p>
      <ul>
        <li>平时穿正式衬衫配黑裤，头上别着夸张的美元符号发夹。</li>
        <li>左手因事故被自己“毁掉”，换上细长黑色机械臂，自觉很酷。</li>
        <li>在校成绩略低于平均，强壮又敏捷但不及 Karma。</li>
        <li>热爱暴力并认为“暴力就是艺术”。</li>
        <li>常挂轻松笑容，笑时露出价值堪比半辆车的金牙。</li>
        <li>浅棕色头发常在脑后扎起，看似年轻有为的富家子。</li>
        <li>以财富为傲，容易无聊，因此参与非法活动。</li>
        <li>真正感到快乐的时候很少。</li>
        <li>喜欢抽烟与喝酒，但最爱喝茶。</li>
        <li>喜欢打扮得体，性格有点抽象、难以捉摸。</li>
        <li>现年龄：19｜身高：187 cm｜生日：5 月 24 日。</li>
        <li>真心信任、热爱并珍惜这个三人组。</li>
      </ul>
    `,
    skills: `
      <h3>技能</h3>
      <p>HP：150｜SP：100（降至 0 会丧失控制权 1 回合并减少 1 步，随后恢复 75% SP）</p>
      <ul>
        <li>被动：快速调整——混乱后额外恢复 25% SP。</li>
        <li>被动：反击——受到伤害有 50% 几率反击“机械爪击”。</li>
        <li>被动：士气鼓舞——每逢 5 的倍数回合，全友方 +15 SP。</li>
        <li>机械爪击（绿·1 步）：前方两格 15 伤害，15% 概率眩晕（80%）。</li>
        <li>枪击（灰·1 步）：指定直线 10 伤害 + 5 精神伤害（需手枪，道具 65%）。</li>
        <li>迅捷步伐（蓝·2 步）：可选择四周任意 4 格并令最近敌人 -5 SP（40%）。</li>
        <li>拿来吧你！（红·3 步）：指定直线拉至面前并眩晕，Boss 仅受眩晕与 SP 伤害（30%）。</li>
        <li>25 级解锁：先苦后甜（橘·4 步）：下一回合 +4 步（唯一，15%）。</li>
      </ul>
    `,
  },
};

function showToast(message) {
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  window.clearTimeout(showToast.timeout);
  showToast.timeout = window.setTimeout(() => {
    toast.classList.remove('show');
  }, 2400);
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

function renderMap(stageKey) {
  const data = stageData[stageKey];
  const preview = document.querySelector('.map-preview');
  const legend = document.querySelector('.map-legend');
  if (!preview || !legend) return;

  preview.innerHTML = '';
  legend.innerHTML = '';
  legend.hidden = true;

  if (!data?.map) {
    preview.innerHTML = '<p class="placeholder">暂未提供地图预览。</p>';
    return;
  }

  const { width, height, coverCells, heroSpawns, enemySpawns, voidRects } = data.map;
  const coverSet = new Set(coverCells.map((cell) => `${cell.x}-${cell.y}`));
  const heroSet = new Map(heroSpawns.map((cell) => [`${cell.x}-${cell.y}`, cell.label || '友方']));
  const enemySet = new Map(enemySpawns.map((cell) => [`${cell.x}-${cell.y}`, cell.label || '敌方']));

  const voidCells = new Set();
  voidRects.forEach((rect) => {
    const { x, y, width: rectWidth, height: rectHeight } = rect;
    for (let ix = x; ix < x + rectWidth; ix += 1) {
      for (let iy = y; iy < y + rectHeight; iy += 1) {
        voidCells.add(`${ix}-${iy}`);
      }
    }
  });

  const grid = document.createElement('div');
  grid.className = 'map-grid';
  grid.style.gridTemplateColumns = `repeat(${width}, 18px)`;
  grid.style.gridTemplateRows = `repeat(${height}, 18px)`;

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
    legend.hidden = false;
    if (heroSpawns.length) {
      const heroItem = document.createElement('span');
      heroItem.className = 'legend-hero';
      heroItem.textContent = '我方初始位置';
      legend.appendChild(heroItem);
    }
    if (enemySpawns.length) {
      const enemyItem = document.createElement('span');
      enemyItem.className = 'legend-enemy';
      enemyItem.textContent = '敌方初始位置';
      legend.appendChild(enemyItem);
    }
  }
}

function renderEnemies(stageKey) {
  const data = stageData[stageKey];
  const roster = document.getElementById('enemyRoster');
  if (!data || !roster) return;

  roster.innerHTML = '';
  const intelUnlocked = !!stageIntelState[stageKey];

  if (!data.enemies?.length) {
    roster.innerHTML = '<p class="placeholder">暂无敌方情报。</p>';
    return;
  }

  data.enemies.forEach((enemy) => {
    const card = document.createElement('article');
    card.className = 'enemy-card';

    const header = document.createElement('div');
    header.className = 'enemy-header';

    const title = document.createElement('div');
    title.className = 'enemy-title';

    const icon = document.createElement('div');
    icon.className = 'enemy-icon';
    icon.textContent = enemy.icon || enemy.name.slice(0, 2).toUpperCase();
    title.appendChild(icon);

    const name = document.createElement('h5');
    name.textContent = enemy.name;
    name.style.margin = '0';
    name.style.letterSpacing = '2px';
    name.style.fontSize = '18px';
    title.appendChild(name);

    header.appendChild(title);

    if (enemy.tags?.length) {
      const tags = document.createElement('div');
      tags.className = 'enemy-tags';
      enemy.tags.forEach((tag) => {
        const span = document.createElement('span');
        span.textContent = tag;
        tags.appendChild(span);
      });
      header.appendChild(tags);
    }

    card.appendChild(header);

    if (intelUnlocked) {
      if (enemy.stats?.length) {
        const stats = document.createElement('div');
        stats.className = 'enemy-stats';
        enemy.stats.forEach((item) => {
          const span = document.createElement('span');
          span.textContent = item;
          stats.appendChild(span);
        });
        card.appendChild(stats);
      }

      const passiveList = enemy.passives?.length ? enemy.passives : [];
      const skills = enemy.skills?.length ? enemy.skills : [];

      if (passiveList.length) {
        const passiveBlock = document.createElement('div');
        passiveBlock.className = 'enemy-skills';
        passiveBlock.setAttribute('aria-label', '被动技能');
        passiveList.forEach((text) => {
          const item = document.createElement('div');
          item.className = 'enemy-skill';
          item.textContent = text;
          passiveBlock.appendChild(item);
        });
        card.appendChild(passiveBlock);
      }

      if (skills.length) {
        const skillBlock = document.createElement('div');
        skillBlock.className = 'enemy-skills';
        skillBlock.setAttribute('aria-label', '主动技能');
        skills.forEach((skill) => {
          const item = document.createElement('div');
          item.className = 'enemy-skill';
          if (typeof skill === 'string') {
            item.textContent = skill;
          } else {
            item.textContent = skill.text;
            item.dataset.locked = skill.locked ? 'true' : 'false';
          }
          skillBlock.appendChild(item);
        });
        card.appendChild(skillBlock);
      }
    } else {
      const overlay = document.createElement('div');
      overlay.className = 'enemy-lock';
      overlay.textContent = '技能情报锁定';
      card.appendChild(overlay);
    }

    roster.appendChild(card);
  });
}

function renderStage(stageKey) {
  const data = stageData[stageKey];
  if (!data) return;

  currentStageKey = stageKey;
  document.getElementById('stageTitle').textContent = data.title;
  document.getElementById('stageSubtitle').textContent = data.subtitle;

  const metaContainer = document.getElementById('stageMeta');
  metaContainer.innerHTML = '';
  data.meta.forEach((item) => {
    const span = document.createElement('span');
    span.textContent = item;
    metaContainer.appendChild(span);
  });

  renderMap(stageKey);
  renderEnemies(stageKey);

  const enterBtn = document.querySelector('[data-action="enter-stage"]');
  if (enterBtn) {
    enterBtn.dataset.stage = stageKey;
    enterBtn.textContent = stageIntelState[stageKey] ? '再次进入' : '进入关卡';
  }
}

function setupStageButtons() {
  const buttons = document.querySelectorAll('.stage-btn');
  buttons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const { stage } = btn.dataset;
      if (!stage || stage === currentStageKey) return;

      buttons.forEach((item) => item.classList.toggle('active', item === btn));

      document
        .querySelectorAll('.stage-description')
        .forEach((panel) => (panel.hidden = panel.dataset.description !== stage));

      renderStage(stage);
    });
  });

  renderStage(currentStageKey);
}

function setupTutorial() {
  Object.entries(tutorialContent).forEach(([tab, content]) => {
    const panel = document.querySelector(`.tab-panel[data-tab-panel="${tab}"]`);
    if (panel) {
      panel.innerHTML = content;
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

  document.querySelector('[data-action="enter-stage"]').addEventListener('click', (event) => {
    const { stage } = event.currentTarget.dataset;
    if (!stage) return;

    if (!stageIntelState[stage]) {
      stageIntelState[stage] = true;
      showToast('战斗情报已解锁。');
      renderStage(stage);
    } else {
      showToast('正在进入关卡……');
    }
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
