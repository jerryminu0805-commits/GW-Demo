const screens = new Map();
document.querySelectorAll('.screen').forEach((screen) => {
  screens.set(screen.dataset.screen, screen);
});

const mask = document.querySelector('.transition-mask');
const toast = document.querySelector('.toast');
let currentScreen = 'menu';
let animationsEnabled = true;
let maskBusy = false;
let currentStage = 'intro';
let currentCharacter = 'adora';
let currentRosterTab = 'bio';
let currentTutorialTab = 'basics';

const stageData = {
  intro: {
    id: 'intro',
    title: 'Intro',
    subtitle: '初次接触战术系统',
    map: {
      width: 14,
      height: 7,
      displaySize: '7 × 14',
      covers: [],
      voids: [],
      players: [
        { name: 'Adora', x: 2, y: 4 },
        { name: 'Dario', x: 2, y: 2 },
        { name: 'Karma', x: 2, y: 6 },
      ],
      enemies: [
        { name: '刑警队员', x: 13, y: 3 },
        { name: '刑警队员', x: 13, y: 4 },
        { name: '刑警队员', x: 13, y: 5 },
      ],
    },
    enemies: [
      {
        name: '刑警队员',
        rank: '普通',
        icon: 'CP',
        notes: ['等级 20', 'HP 100', 'SP 80', 'SP 降为 0 时眩晕 1 回合并 -1 步'],
        passives: ['正义光环：每对方回合结束恢复 15 HP'],
        skills: [
          {
            name: '捅（一步）',
            description: '前方一格造成 5 点 HP + 5 点 SP 伤害，并在拔出时再造成同等伤害。出现概率 70%。',
            locked: true,
          },
          {
            name: '枪击（一步）',
            description: '指定一整排造成 10 点 HP + 5 点 SP 伤害。出现概率 65%。',
            locked: true,
          },
          {
            name: '连续挥刀（两步）',
            description: '连续三次挥刀造成 5 / 10 / 10 +10 SP 伤害。出现概率 50%。',
            locked: true,
          },
        ],
      },
    ],
  },
  limit: {
    id: 'limit',
    title: '疲惫的极限',
    subtitle: '赫雷西第六干部 · Khathia',
    map: {
      width: 20,
      height: 10,
      displaySize: '10 × 20',
      covers: [],
      voids: [],
      players: [
        { name: 'Adora', x: 2, y: 4 },
        { name: 'Dario', x: 2, y: 2 },
        { name: 'Karma', x: 2, y: 6 },
      ],
      enemies: [
        { name: 'Khathia', x: 17, y: 4, size: { w: 2, h: 2 } },
      ],
    },
    enemies: [
      {
        name: 'Khathia / 卡西亚',
        rank: 'Boss · 占 4 格',
        icon: 'KH',
        notes: ['等级 35', 'HP 500', 'SP 0（至 -100 时眩晕 1 回合并 -1 步后重置为 0）'],
        passives: [
          '老干部：造成伤害时回复 2 点 SP',
          '变态躯体：伤害减免 ×0.75，且 15% 几率免疫伤害',
          '疲劳的躯体：每 5 回合减少 2 步',
          '糟糕的最初设计：每回合最多移动 3 格',
        ],
        skills: [
          {
            name: '血肉之刃（1 步）',
            description: '对前方 2×1 横斩，造成 15 点伤害。出现概率 70%。',
            locked: true,
          },
          {
            name: '怨念之爪（1 步）',
            description: '对前方 2×2 造成 10 点 HP 与 -5 SP 伤害。出现概率 70%。',
            locked: true,
          },
          {
            name: '横扫（2 步）',
            description: '前方 4×2 横斩造成 20 点伤害。出现概率 60%。',
            locked: true,
          },
          {
            name: '痛苦咆哮（2 步）',
            description: '恢复所有 SP。出现概率 35%。',
            locked: true,
          },
          {
            name: '过多疲劳患者最终的挣扎（3 步）',
            description: '对周围 9×9 范围造成 50 HP / 70 SP 伤害。出现概率 30%。',
            locked: true,
          },
        ],
      },
    ],
  },
  'seven-seas': {
    id: 'seven-seas',
    title: '七海',
    subtitle: '与作战队的误会 · 七海作战队',
    map: {
      width: 22,
      height: 18,
      origin: 'bottom-left',
      displaySize: '18 × 22（右下 8×10 空缺）',
      covers: [
        { x1: 2, x2: 5, y1: 4, y2: 6 },
        { x1: 2, x2: 6, y1: 13, y2: 15 },
        { x1: 11, x2: 13, y1: 13, y2: 15 },
      ],
      voids: [
        { x1: 15, x2: 22, y1: 1, y2: 10 },
      ],
      players: [
        { name: 'Adora', x: 3, y: 2 },
        { name: 'Karma', x: 5, y: 2 },
        { name: 'Dario', x: 7, y: 2 },
      ],
      enemies: [
        { name: 'Haz', x: 21, y: 15 },
        { name: 'Tusk', x: 19, y: 12, size: { w: 2, h: 2 } },
        { name: 'Katz', x: 19, y: 16 },
        { name: 'Neyla', x: 15, y: 17 },
        { name: 'Kyn', x: 15, y: 12 },
      ],
    },
    narrative: [
      '夜幕低垂，海风裹挟着血腥味从破旧码头吹来。刑警队长靠在残破的装甲车旁吐出烟雾：“你们想查 Cult，就去码头找他们。七海作战队——唯一不归政府调度的队伍。如果还能活着回来，我们再谈下一步。”',
      '废弃的码头昏暗而潮湿，杂草丛生的铁轨旁，三人组在阴影中穿行。Dario 咂嘴抱怨环境破败，Karma 感到四周充斥血腥味，Adora 则低头压着帽檐。',
      '突然地面震动，浑厚的声音命令他们停下。一队异装者自黑暗中现身，为首者 Haz 带着军帽与血迹斑斑的鱼叉。他嗅到“腐蚀”的味道，目光锁定 Adora。',
      'Haz 指向 Adora 的帽子：“把帽子摘了。”Adora 惊慌后退，拒绝暴露自己。Karma 上前护住他，Dario 亦劝阻 Haz 不要动手。',
      '气氛紧绷，Haz 怒笑着举起鱼叉，认定他们与 Cult 脱不开关系。队员们迅速戴上面具护在 Haz 身后，红光在阴影中闪耀，战斗一触即发。',
    ],
    enemies: [
      {
        name: 'Haz（哈兹）',
        rank: 'Boss · 队长',
        icon: 'HZ',
        notes: ['等级 55', 'HP 750', 'SP 100（降至 0 时眩晕 1 回合并 -1 步，随后恢复 100 SP 与 5% HP）'],
        passives: [
          '弑神执念：HP 低于 50% 时伤害 +30%',
          '难以抑制的仇恨：攻击 40% 几率 -5 SP 并附加恐惧',
          '队员们听令！：双数回合开始自身 +10 SP，队员 +5 SP',
          '一切牺牲都是值得的……：20 回合后为队员施加「队长的压迫」',
          '他们不是主菜！：1~15 回合队员获得 30% 暴击',
          '把他们追杀到天涯海角！：命中的首个敌人被标记，队员对其伤害 +15%',
          '力挽狂澜：场上仅剩 Haz 时伤害 +10%，所受伤害 -10%，并解锁额外技能',
        ],
        skills: [
          {
            name: '鱼叉穿刺（1 步）',
            description: '前方一格造成 20 点伤害并回复 10 SP。出现概率 70%。',
            locked: true,
          },
          {
            name: '深海猎杀（2 步）',
            description: '前方 3 格内拉近目标至面前并造成 25 HP / -10 SP。出现概率 60%。',
            locked: true,
          },
          {
            name: '猎神之叉（2 步）',
            description: '瞬移至 5×5 范围敌人身边造成 20 点伤害（50%×2.0）+15 SP 伤害与 1 层流血。出现概率 65%。',
            locked: true,
          },
          {
            name: '锁链缠绕（2 步）',
            description: '2 回合内减免 40% 伤害，反击的敌人 -10 SP，队员 +5 SP。出现概率 50%。',
            locked: true,
          },
          {
            name: '鲸落（4 步）',
            description: '自身为中心 5×5 造成 50 HP / 20 SP 伤害并令目标下回合 -1 步。出现概率 30%。',
            locked: true,
          },
          {
            name: '怨念滋生（1 步 · 力挽狂澜）',
            description: '对所有带猎杀标记的单位附加 1 层流血与恐惧。出现几率 33%。',
            locked: true,
          },
          {
            name: '付出代价（2 步 · 力挽狂澜）',
            description: '多段鱼叉连击，前 3 格两次刺击后再对前方 2×3 横斩造成追加伤害与 5 SP 伤害。出现几率 33%。',
            locked: true,
          },
          {
            name: '仇恨之叉（2 步 · 力挽狂澜）',
            description: '前方 2×3 横斩并造成 10 SP 伤害，随后砸击自身 5×5 造成 20 点伤害与 Haz 流血。出现几率 33%。',
            locked: true,
          },
        ],
      },
      {
        name: 'Katz（卡兹）',
        rank: '小 Boss · 伤害代表',
        icon: 'KZ',
        notes: ['等级 53', 'HP 500', 'SP 75'],
        passives: [
          '隐秘迷恋：Haz 在场时伤害 +20%，每回合额外 +5 SP',
          '恐怖执行力：回合内命中 ≥2 次时追加矛刺且伤害 +30%',
          '女强人：SP > 60 时伤害 +10%',
        ],
        skills: [
          {
            name: '矛刺（1 步）',
            description: '前方 1 格造成 20 点伤害并回复 5 SP（队长压迫后停用）。出现概率 70%。',
            locked: true,
          },
          {
            name: '链式鞭击（2 步）',
            description: '前方 3 格造成 25 点伤害并令目标下回合 -1 步（压迫后停用）。出现概率 60%。',
            locked: true,
          },
          {
            name: '反复鞭尸（3 步）',
            description: '对前方 3 格多段鞭打并按 SP 百分比重复最多 5 次（压迫后停用）。出现概率 50%。',
            locked: true,
          },
          {
            name: '终焉礼炮（4 步）',
            description: '投出爆炸鱼叉对 3×3 范围造成 60 HP / -15 SP，次回合 -1 步（压迫后停用）。出现概率 30%。',
            locked: true,
          },
          {
            name: '必须抹杀一切……（2 步）',
            description: '压迫后解锁：多段鞭击造成 20/30 点伤害，各消耗自身 5 HP 并回复 5 SP，可重复最多 5 次。',
            locked: true,
          },
        ],
      },
      {
        name: 'Tusk（塔斯克）',
        rank: '小 Boss · 防御代表',
        icon: 'TK',
        notes: ['等级 54', 'HP 1000', 'SP 60'],
        passives: [
          '家人的守护：Haz 受伤时伤害转移至自身并免疫 50%',
          '铁壁如山：所有伤害 -30%',
          '猛牛之力：每次受伤后下次攻击 +5 伤害，可叠加',
        ],
        skills: [
          {
            name: '骨盾猛击（1 步）',
            description: '前方 1 格造成 10 点伤害并击退 1 格（压迫后停用）。出现概率 70%。',
            locked: true,
          },
          {
            name: '来自深海的咆哮（2 步）',
            description: '周围 3×3 敌人 -20 SP，自身额外减免 20% 伤害（压迫后停用）。出现概率 60%。',
            locked: true,
          },
          {
            name: '牛鲨冲撞（2 步）',
            description: '前方 2×3 冲锋造成 25 点伤害并眩晕（压迫后停用）。出现概率 50%。',
            locked: true,
          },
          {
            name: '战争堡垒（3 步）',
            description: '3 回合防御姿态，伤害 -50%，每回合 +10 SP 并令 Haz 伤害 +15%（压迫后停用）。出现概率 30%。',
            locked: true,
          },
          {
            name: '拼尽全力保卫队长……（2 步）',
            description: '压迫后解锁：3 回合反伤姿态（反伤 25%），自回复 10 SP 并使 Haz 回血 15% + 15 SP，伤害减免 25%。',
            locked: true,
          },
        ],
      },
      {
        name: 'Neyla（尼拉）',
        rank: '精英 · 远程狙击',
        icon: 'NY',
        notes: ['等级 52', 'HP 350', 'SP 80'],
        passives: [
          '精确瞄准：回合未移动时伤害 +50%',
          '冷血执行者：对低于 50% HP 敌人造成双倍伤害',
          '神速装填：每 3 回合 +10 SP',
        ],
        skills: [
          {
            name: '迅捷射击（1 步）',
            description: '4 格内造成 15 HP / -5 SP（压迫后停用）。出现概率 70%。',
            locked: true,
          },
          {
            name: '穿刺狙击（2 步）',
            description: '直线 6 格造成 30 HP 并附带流血（压迫后停用）。出现概率 60%。',
            locked: true,
          },
          {
            name: '双钩牵制（2 步）',
            description: '前方 4 格造成 15 HP 并令目标下回合 -2 步（压迫后停用）。出现概率 50%。',
            locked: true,
          },
          {
            name: '终末之影（3 步）',
            description: '对任意目标造成 50 HP / 20 SP，次回合 -1 步（压迫后必定出现且仅一次）。',
            locked: true,
          },
          {
            name: '执行……（2 步）',
            description: '压迫后解锁：对前方一排连发，两次各 20 点伤害并根据血量直接处决，消耗自身血量与 40 SP。',
            locked: true,
          },
        ],
      },
      {
        name: 'Kyn（金）',
        rank: '精英 · 刺客',
        icon: 'KN',
        notes: ['等级 51', 'HP 250', 'SP 70'],
        passives: [
          '打道回府：击杀后下回合开始瞬移回 Haz 身边',
          '无情暗杀：目标 HP <25% 时直接斩杀',
          '迅捷如风：回合开始自动 +5 SP',
        ],
        skills: [
          {
            name: '迅影突刺（1 步）',
            description: '瞬移至 5×5 范围敌人身边造成 20 点伤害（压迫后停用）。出现概率 70%。',
            locked: true,
          },
          {
            name: '割喉飞刃（2 步）',
            description: '前方直线 3 格造成 25 HP / 5 SP 伤害（压迫后停用）。出现概率 60%。',
            locked: true,
          },
          {
            name: '影杀之舞（2 步）',
            description: '周围 3×3 造成 30 HP 并免费移动 1 格（压迫后停用）。出现概率 50%。',
            locked: true,
          },
          {
            name: '死亡宣告（三步）',
            description: '对单体造成 50 HP / 30 SP，目标 HP <30% 直接斩杀（压迫后停用）。出现概率 30%。',
            locked: true,
          },
          {
            name: '自我了断……（2 步）',
            description: '压迫后解锁：瞬移至敌身边直接秒杀目标并牺牲自身全部 HP。',
            locked: true,
          },
        ],
      },
    ],
  },
};

const characterData = {
  adora: {
    name: 'Adora',
    level: 20,
    bio: [
      '名字在西班牙语里意为“崇拜”。Adora 刚出生时家人以为他是女孩，于是给了他一个偏女性化的名字；在英语里，他也将其理解为“收养”，预示九岁时父母双亡的命运。',
      '在日语里，名字前半的 “Ado” 有“喧嚣、骚动”之意，象征他在目睹朋友被枪杀后逐渐化为怪物的过程。',
      '他原本是个快乐的孩子，六岁时结识了挚友 Karma 与 Dario。家境不富裕，但父母倾尽所有疼爱他。九岁生日途中遭遇异端暴走，父母遇难，本人左眼被毁，这场创伤伴随终生。',
      '事发后拒绝警方帮助，直奔 Dario 家，并在那与 Karma 团聚。头发右侧的“腐蚀”正来自那场事故。',
      '亲眼目睹朋友死去后，他经历了痛苦的蜕变，逐渐变成嗜血、失控的怪物；这一过程极其残酷。',
      '通常穿着舒适毛衣，深灰长发垂至身体下半部。9～15 岁长期抑郁，却仍然成绩名列前茅，各科出众，兴趣广泛，包括技术、游戏与照顾动物。',
      '他不喜欢暴力，但必要时会致命；偶尔有些懒与孩子气，经常劝朋友减少暴力。力量与速度不算强，不喜激烈运动，也不常出门。',
      '九岁后一直戴着帽子与眼罩，直到 16 岁才摘下；左眼呈十字形，他觉得不好看，于是在上面钉入金属钉。16 岁后在伙伴陪伴下逐渐开朗。',
      '喜欢汽水。现年 18 岁，身高 169 厘米，生日 8 月 4 日。他真心信任、热爱并珍惜这个三人组。',
    ],
    skills: [
      'Hp：100 · SP：100（降为 0 时失控 1 回合并 -1 步，随后自动恢复 50% SP）',
      '被动：背刺 — 从背后攻击敌方伤害 ×1.5',
      '被动：冷静分析 — 若当回合未行动则恢复 10 点 SP',
      '被动：啊啊啊你们没事吧？！— 6×6 范围内有友军时，为对方回复 5% HP 与 5 SP（不含自身）',
      '被动：对战斗的恐惧 — SP 低于 10 时，伤害 ×1.5',
      '20 级解锁：短匕轻挥！（绿 · 1 步）— 前方一格 10 HP + 5 精神伤害，80% 出现在技能池',
      '20 级解锁：枪击（灰 · 1 步）— 若持手枪，对一整排造成 10 HP + 5 精神伤害，65% 出现',
      '20 级解锁：呀！你不要靠近我呀！！（蓝 · 2 步）— 四周任选 5 格位移，若敌方 HP <50% 追加一次“短匕轻挥！”，40% 出现',
      '20 级解锁：自制粉色迷你电击装置！（红 · 3 步）— 前方 2 格 10 HP + 15 精神伤害并麻痹减步，30% 出现',
      '25 级解锁：略懂的医术！（粉 · 2 步）— 5×5 选友军回复 20 HP + 15 SP，并赋予“恢复” Buff，30% 出现',
      '25 级解锁：加油哇！（橘 · 4 步）— 5×5 选友军赋予“鸡血” Buff，20% 出现',
      '35 级解锁：只能靠你了。。（橘 · 4 步）— 自损 25 HP，向周围 5 格友军施加“依赖” Buff，15% 出现',
    ],
  },
  karma: {
    name: 'Karma',
    level: 20,
    bio: [
      '名字意为“命运、天意、行动”，象征他的所作所为最终导向不可避免的结局。',
      '自出生起便与 Dario 为友，幼儿园时结识 Adora，主动接近孤僻的他。与父母关系极差，家中常年争吵。九岁那年母亲将怒气发泄在他身上，他遂搬到 Dario 家。',
      '平时穿衬衫配黑裤，手掌巨大，栗红短发。校园成绩垫底，不擅长动脑；过去喜好暴力，在 Adora 劝导下学会克制。',
      '常常不经思考先行动，后脑自出生起便有红色“†”印记——邪教诅咒失败留下的痕迹，也许是他体质强悍的原因。',
      '曾沉迷电子游戏，被 Adora 教训后弃坑。童年不正常，性格略显扭曲。18 岁后与 Dario 增加违法活动，Adora 虽不赞同最终也加入。',
      '力大无穷，几拳即可砸倒树木；在校体育项目保持三分之二纪录。喜好能量饮料与酒精，曾抽烟，因 Adora 讨厌二手烟改用电子烟。',
      '爱吃肉；幼儿园起暗恋 Adora，当时并不知道他是男生。现年 19 岁，身高 189 厘米，生日 4 月 14 日。真心珍惜三人组。',
    ],
    skills: [
      'Hp：200 · SP：50（降为 0 时失控 1 回合并 -1 步，自损 20 HP，随后恢复 50% SP）',
      '被动：暴力瘾 — 连续攻击伤害 ×1.5；连续 3 次后追击“沙包大的拳头”，每多一次继续追击，连续 4 次后 -5 SP',
      '被动：强悍的肉体 — 所受伤害 ×0.75',
      '被动：自尊心 — 根据损失 HP 增加自身伤害（1% HP = 0.5% 伤害）',
      '20 级解锁：沙包大的拳头（绿 · 1 步）— 15 点伤害，80% 出现',
      '20 级解锁：枪击（灰 · 1 步）— 若持手枪，对一整排造成 10 HP + 5 精神伤害，65% 出现',
      '20 级解锁：都听你的（蓝 · 2 步）— 四周任选 3 格并回复 5 SP，40% 出现',
      '20 级解锁：嗜血之握（红 · 3 步）— 连续四次“沙包大的拳头”后处决非 Boss（75）/ 小 Boss（80）/ 精英（100），30% 出现',
      '25 级解锁：深呼吸（白 · 2 步）— 主动恢复全部 SP 与 10 HP；若未出现在技能池则提供 10% 伤害加成（池内仅保留 1 张），20% 出现',
    ],
  },
  dario: {
    name: 'Dario',
    level: 20,
    bio: [
      '名字意为“财富、富有、更多的钱”，映射他优渥的经济状况。',
      '他不喜欢这个名字——既因发音，也因那是父母留下的唯一痕迹。父母在他 6 岁时失踪，只留豪宅、汽车与大量资产。',
      '与两位好友关系密切，常在其豪宅周围活动，将那里作为据点。平时穿正式衬衫配黑裤，头戴夸张美元符号发夹。',
      '左手幼时被煤气罐爆炸毁坏，更换为细长黑色机械臂，自觉酷炫。成绩略低于平均，强壮敏捷但不及 Karma，保持学校约三分之一体育纪录。',
      '热爱暴力并视其为艺术，笑时露出价值堪比半辆车的金牙。头部略扁，浅棕色头发常扎起，看似年轻有为。',
      '以财富为傲却容易无聊，亦因此参与可获利的非法活动。虽然常在笑，但真正快乐时刻稀少。喜好抽烟喝酒，却最爱喝茶。',
      '喜欢打扮体面，性格抽象难以捉摸。现年 19 岁，身高 187 厘米，生日 5 月 24 日，同样珍视三人组。',
    ],
    skills: [
      'Hp：150 · SP：100（降为 0 时失控 1 回合并 -1 步，随后恢复 75% SP）',
      '被动：快速调整 — 失控后额外恢复 25% SP（合计 75%）',
      '被动：反击 — 受到伤害 50% 几率以“机械爪击”反击',
      '被动：士气鼓舞 — 每逢 5 的倍数回合为全队恢复 15 SP',
      '20 级解锁：机械爪击（绿 · 1 步）— 前方两格 15 点伤害（15% 眩晕），80% 出现',
      '20 级解锁：枪击（灰 · 1 步）— 若持手枪，对一整排造成 10 HP + 5 精神伤害，65% 出现',
      '20 级解锁：迅捷步伐（蓝 · 2 步）— 四周任选 4 格并令最近敌人 -5 SP，40% 出现',
      '20 级解锁：拿来吧你！（红 · 3 步）— 拉近一整排首个非 Boss 敌人造成 20 HP、附加眩晕与 -15 SP；Boss 仅受眩晕与 SP 伤害，30% 出现',
      '25 级解锁：先苦后甜（橘 · 4 步）— 下一回合 +4 步（技能池中仅保留 1 张），15% 出现',
    ],
  },
};

const tutorialContent = {
  basics: [
    {
      title: 'Hp / Sp',
      body: [
        'HP 降为 0 即视为死亡。',
        'SP 降为 0 会使单位进入 1 层眩晕 Debuff 与 -1 步的状态，眩晕结束后恢复部分 SP（每个单位不同）。',
      ],
    },
    {
      title: '步数',
      body: [
        '双方均以 3 步起始，每回合自动 +1 步。',
        '根据双方平均等级对比，更高的一方每回合额外获得 2 步。',
        '步数决定任何行动，也是技能的费用。默认上限 10 步（可被增减步技能影响）。',
      ],
    },
    {
      title: '回合流程',
      body: ['每当我方与敌方各完成行动，视为 1 个回合。'],
    },
    {
      title: '掩体',
      body: ['掩体可阻挡所有非 AOE 技能，且无法进入掩体格。'],
    },
  ],
  'skill-types': [
    {
      title: '技能颜色分类',
      body: [
        '绿色（1 步）：普通攻击。',
        '蓝色（2 步）：移动技能。',
        '红色（3 步以上）：大招。',
        '白色（步数不定）：自带被动的技能。',
        '粉色（2 步以上）：普通增益技能。',
        '橘色（2 步以上）：特异增益技能。',
      ],
    },
    {
      title: '多阶段攻击与被动',
      body: [
        '多阶段攻击：单个技能包含多段攻击，可能伴随不同范围与特殊效果。',
        '被动：无需主动施放即可生效的能力。',
      ],
    },
  ],
  effects: [
    {
      title: '特殊效果（可叠加）',
      body: [
        '流血：每回合减少 5% HP，持续 2 回合，可叠加。',
        '眩晕层数：可叠加，无直接效果。',
        '眩晕 Debuff：累积至指定层数后，使单位失去行动能力 1 回合并消耗 1 层眩晕 Debuff。',
        '恐惧：下回合 -1 步，可叠加。',
        '鸡血：下一次攻击伤害 ×2，随后消耗 1 层（每单位最多 1 层，若为多段攻击则加在最后一段）。',
        '依赖：下一次攻击造成真实伤害并令自身 SP 归零，随后消耗 1 层（每单位最多 1 层）。',
        '“恢复” Buff：下一个大回合开始时恢复 5 HP 并消耗 1 层，每个大回合仅触发 1 层，可叠加。',
      ],
    },
  ],
  enemies: [
    {
      title: '敌人分类',
      body: [
        '普通：无特殊能力。',
        '高级：暂未出现。',
        '精英：拥有秒杀技能（如嗜血之握），伤害上限 100 HP，需叠 2 层眩晕方可附加 1 层眩晕 Debuff。',
        '小 Boss：秒杀技能伤害上限 80 HP，需叠 3 层眩晕方可附加 1 层眩晕 Debuff，并免疫位移。',
        'Boss：秒杀技能伤害上限 75 HP，需叠 4 层眩晕方可附加 1 层眩晕 Debuff，并免疫位移。',
        '特殊：？？？',
      ],
    },
  ],
};

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => {
    toast.classList.remove('show');
  }, 2500);
}

function setMaskRadius(value) {
  mask.style.setProperty('--mask-radius', value);
}

function activateScreen(target) {
  if (currentScreen === target) return;
  const next = screens.get(target);
  if (!next) return;
  screens.get(currentScreen)?.classList.remove('active');
  next.classList.add('active');
  currentScreen = target;
}

function goToScreen(target) {
  if (maskBusy || currentScreen === target) return;
  const performSwitch = () => {
    activateScreen(target);
    requestAnimationFrame(() => setMaskRadius('120%'));
    setTimeout(() => {
      maskBusy = false;
    }, animationsEnabled ? 950 : 10);
  };

  if (!animationsEnabled) {
    performSwitch();
    return;
  }

  maskBusy = true;
  requestAnimationFrame(() => setMaskRadius('0%'));
  setTimeout(performSwitch, 320);
}

function buildMap(stage) {
  const canvas = document.querySelector('.map-canvas');
  const sizeLabel = document.querySelector('.map-size');
  canvas.innerHTML = '';
  const {
    width,
    height,
    covers = [],
    voids = [],
    players = [],
    enemies = [],
    origin = 'top-left',
  } = stage.map;
  const mapOrigin = origin;

  sizeLabel.textContent = stage.map.displaySize || `${height} × ${width}`;
  canvas.style.gridTemplateColumns = `repeat(${width}, var(--cell-size))`;
  canvas.style.gridTemplateRows = `repeat(${height}, var(--cell-size))`;

  const grid = Array.from({ length: height }, () => Array(width).fill(''));

  const withinBounds = (x, y) => x >= 1 && x <= width && y >= 1 && y <= height;
  const toRowIndex = (y) => (mapOrigin === 'bottom-left' ? height - y : y - 1);
  const toColIndex = (x) => x - 1;

  const placeCell = (x, y, cls) => {
    if (!withinBounds(x, y)) return;
    const rowIndex = toRowIndex(y);
    const colIndex = toColIndex(x);
    if (rowIndex < 0 || rowIndex >= height || colIndex < 0 || colIndex >= width) return;
    grid[rowIndex][colIndex] = cls;
  };

  const markRect = (rects, cls) => {
    rects.forEach((rect) => {
      for (let y = rect.y1; y <= rect.y2; y += 1) {
        for (let x = rect.x1; x <= rect.x2; x += 1) {
          placeCell(x, y, cls);
        }
      }
    });
  };

  markRect(voids, 'void');
  markRect(covers, 'cover');

  const paintUnit = (unit, cls) => {
    const widthSpan = unit.size?.w ?? 1;
    const heightSpan = unit.size?.h ?? 1;
    for (let dy = 0; dy < heightSpan; dy += 1) {
      for (let dx = 0; dx < widthSpan; dx += 1) {
        placeCell(unit.x + dx, unit.y + dy, cls);
      }
    }
  };

  players.forEach((unit) => paintUnit(unit, 'player'));
  enemies.forEach((unit) => paintUnit(unit, 'enemy'));

  for (let row = 0; row < height; row += 1) {
    for (let col = 0; col < width; col += 1) {
      const cell = document.createElement('div');
      const state = grid[row][col];
      cell.className = `map-cell${state ? ` ${state}` : ''}`;
      canvas.appendChild(cell);
    }
  }
}

function renderStageDetail(stage) {
  const detailTitle = document.querySelector('.detail-title');
  const detailSubtitle = document.querySelector('.detail-subtitle');
  const enemyList = document.querySelector('.enemy-list');
  const narrative = document.querySelector('.stage-narrative');

  detailTitle.textContent = stage.title;
  detailSubtitle.textContent = stage.subtitle;
  buildMap(stage);

  if (narrative) {
    narrative.innerHTML = '';
    if (stage.narrative && stage.narrative.length > 0) {
      narrative.hidden = false;
      const heading = document.createElement('h3');
      heading.textContent = '剧情片段';
      narrative.appendChild(heading);
      stage.narrative.forEach((line) => {
        const p = document.createElement('p');
        p.textContent = line;
        narrative.appendChild(p);
      });
    } else {
      narrative.hidden = true;
    }
  }

  enemyList.innerHTML = '';

  stage.enemies.forEach((enemy) => {
    const card = document.createElement('div');
    card.className = 'enemy-card';

    const header = document.createElement('header');
    const icon = document.createElement('div');
    icon.className = 'enemy-icon';
    icon.textContent = enemy.icon;
    const title = document.createElement('div');
    title.innerHTML = `<strong>${enemy.name}</strong>`;

    header.append(icon, title);

    const meta = document.createElement('div');
    meta.className = 'enemy-meta';
    enemy.notes.forEach((note) => {
      const span = document.createElement('span');
      span.textContent = note;
      meta.appendChild(span);
    });

    const passiveList = document.createElement('div');
    passiveList.className = 'skill-list';
    const passiveHeader = document.createElement('div');
    passiveHeader.className = 'skill-name';
    passiveHeader.textContent = '被动技能';
    passiveList.appendChild(passiveHeader);
    enemy.passives.forEach((passive) => {
      const p = document.createElement('div');
      p.textContent = `• ${passive}`;
      passiveList.appendChild(p);
    });

    const skillList = document.createElement('div');
    skillList.className = 'skill-list';
    const skillHeader = document.createElement('div');
    skillHeader.className = 'skill-name';
    skillHeader.textContent = '主动技能';
    skillList.appendChild(skillHeader);
    enemy.skills.forEach((skill) => {
      const item = document.createElement('div');
      const unlocked = stage.entered || !skill.locked;
      if (!unlocked) {
        item.className = 'locked';
        item.textContent = `◼ ${skill.name} — 情报锁定`;
      } else {
        item.innerHTML = `<strong>◼ ${skill.name}</strong><br />${skill.description}`;
      }
      skillList.appendChild(item);
    });

    card.append(header, meta, passiveList, skillList);
    enemyList.appendChild(card);
  });
}

function selectStage(stageId) {
  const stage = stageData[stageId];
  if (!stage) return;
  currentStage = stageId;
  document
    .querySelectorAll('.stage-card')
    .forEach((card) => card.classList.toggle('active', card.dataset.stage === stageId));
  renderStageDetail(stage);
}

function updateRosterLevel(character) {
  const tag = document.querySelector('.level-tag');
  tag.textContent = `Lv.${character.level}`;
}

function renderRoster() {
  const data = characterData[currentCharacter];
  if (!data) return;
  const scroll = document.querySelector('.roster-scroll');
  scroll.innerHTML = '';

  updateRosterLevel(data);

  if (currentRosterTab === 'bio') {
    data.bio.forEach((paragraph) => {
      const p = document.createElement('p');
      p.textContent = paragraph;
      scroll.appendChild(p);
    });
  } else {
    const heading = document.createElement('h3');
    heading.textContent = `${data.name} · 技能`; 
    scroll.appendChild(heading);
    const list = document.createElement('ul');
    data.skills.forEach((line) => {
      const li = document.createElement('li');
      li.textContent = line;
      list.appendChild(li);
    });
    scroll.appendChild(list);
  }
}

function renderTutorial() {
  const sections = tutorialContent[currentTutorialTab] || [];
  const container = document.querySelector('.tutorial-scroll');
  container.innerHTML = '';
  sections.forEach((section) => {
    const title = document.createElement('h2');
    title.textContent = section.title;
    container.appendChild(title);
    const list = document.createElement('ul');
    section.body.forEach((line) => {
      const li = document.createElement('li');
      li.textContent = line;
      list.appendChild(li);
    });
    container.appendChild(list);
  });
}

function handleMenuAction(action) {
  switch (action) {
    case 'start':
      goToScreen('chapters');
      break;
    case 'settings':
      goToScreen('settings');
      break;
    case 'tutorial':
      goToScreen('tutorial');
      break;
    case 'exit':
      showToast('演示环境暂不支持退出。');
      break;
    default:
      break;
  }
}

function handleBack(target) {
  goToScreen(target);
}

function bindEvents() {
  document.querySelectorAll('button[data-action]').forEach((button) => {
    button.addEventListener('click', () => {
      const action = button.dataset.action;
      if (button.closest('.screen-menu')) {
        handleMenuAction(action);
      } else if (action === 'roster') {
        goToScreen('roster');
      } else if (action === 'enter') {
        const stage = stageData[currentStage];
        if (!stage) return;
        if (!stage.entered) {
          stage.entered = true;
          renderStageDetail(stage);
          showToast('已记录：敌方技能情报解锁。');
        } else {
          showToast('关卡已记录，可随时重新进入。');
        }
      }
    });
  });

  document.querySelectorAll('button[data-back]').forEach((button) => {
    button.addEventListener('click', () => handleBack(button.dataset.back));
  });

  document.querySelectorAll('.chapter-card.unlocked').forEach((card) => {
    card.addEventListener('click', () => goToScreen('stages'));
  });

  document.querySelectorAll('.stage-card').forEach((card) => {
    card.addEventListener('click', () => selectStage(card.dataset.stage));
  });

  document.querySelectorAll('.roster-pill').forEach((pill) => {
    pill.addEventListener('click', () => {
      currentCharacter = pill.dataset.character;
      document
        .querySelectorAll('.roster-pill')
        .forEach((node) => node.classList.toggle('active', node === pill));
      renderRoster();
    });
  });

  document.querySelectorAll('.roster-tabs .tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      currentRosterTab = tab.dataset.rosterTab;
      document
        .querySelectorAll('.roster-tabs .tab')
        .forEach((node) => node.classList.toggle('active', node === tab));
      renderRoster();
    });
  });

  document.querySelectorAll('.tutorial-tabs .tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      currentTutorialTab = tab.dataset.tutorialTab;
      document
        .querySelectorAll('.tutorial-tabs .tab')
        .forEach((node) => node.classList.toggle('active', node === tab));
      renderTutorial();
    });
  });

  const audioToggle = document.getElementById('audio-toggle');
  if (audioToggle) {
    audioToggle.addEventListener('change', (event) => {
      showToast(event.target.checked ? '环境音乐已启用（示意）。' : '环境音乐已静音。');
    });
  }

  const animationToggle = document.getElementById('animation-toggle');
  if (animationToggle) {
    animationToggle.addEventListener('change', (event) => {
      animationsEnabled = event.target.checked;
      if (!animationsEnabled) {
        mask.classList.add('no-anim');
        setMaskRadius('120%');
        showToast('过场动画已关闭。');
      } else {
        mask.classList.remove('no-anim');
        requestAnimationFrame(() => setMaskRadius('120%'));
        showToast('过场动画已开启。');
      }
    });
  }
}

function init() {
  bindEvents();
  selectStage(currentStage);
  renderRoster();
  renderTutorial();

  window.addEventListener('load', () => {
    requestAnimationFrame(() => setMaskRadius('120%'));
  });
}

init();
