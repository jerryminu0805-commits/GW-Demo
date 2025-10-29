const screens = {
  menu: document.getElementById("menu-screen"),
  chapter: document.getElementById("chapter-screen"),
  levels: document.getElementById("level-screen"),
  tutorial: document.getElementById("tutorial-screen"),
  character: document.getElementById("character-screen"),
};

const overlay = document.getElementById("transition-overlay");
const levelDetail = document.getElementById("level-detail");
const tutorialContent = document.getElementById("tutorial-content");
const characterDetail = document.getElementById("character-detail");

const tutorialData = {
  basics: `
    <section class="tutorial-section">
      <h3>基础资源</h3>
      <ul>
        <li><strong>HP / SP：</strong>HP 为生命值，降至 0 即死亡。SP 降至 0 会给该单位施加一层眩晕 Buff 并减少 1 步，眩晕结束后会按单位设定恢复部分 SP。</li>
        <li><strong>步数：</strong>我方与敌方开局均为 3 步，每回合自动增加 1 步。若我方平均等级更高，则额外 +2 步。步数用于移动与施放技能，最高 10 步（可被技能修改）。</li>
        <li><strong>回合：</strong>我方行动结束 + 敌方行动结束 = 1 个完整回合。</li>
        <li><strong>掩体：</strong>非 AOE 技能无法穿透掩体，且无法进入掩体格子。</li>
      </ul>
    </section>
    <section class="tutorial-section">
      <h3>技能颜色分类</h3>
      <ul>
        <li><span class="color-chip" style="--chip-color:#58e69f"></span>绿色（1步）- 普通攻击</li>
        <li><span class="color-chip" style="--chip-color:#4c9cf0"></span>蓝色（2步）- 移动技能</li>
        <li><span class="color-chip" style="--chip-color:#f25b6b"></span>红色（3步以上）- 大招</li>
        <li><span class="color-chip" style="--chip-color:#f4f4f5"></span>白色（不定）- 自带被动的技能</li>
        <li><span class="color-chip" style="--chip-color:#f08ad3"></span>粉色（2步以上）- 普通增益技能</li>
        <li><span class="color-chip" style="--chip-color:#f8b23c"></span>橘色（2步以上）- 特异增益功能</li>
      </ul>
      <p>技能还可能包含多阶段攻击或被动效果，多阶段技能的不同段落可能拥有各自的范围与追加效果。</p>
    </section>
  `,
  skills: `
    <section class="tutorial-section">
      <h3>多阶段攻击</h3>
      <p>单个技能拆分为多个打击段。每段可拥有独立的伤害、范围与特殊效果，可能触发追加攻击。</p>
      <h3>被动</h3>
      <p>无需主动施放即可生效，常见于角色的天赋或技能的附属效果。</p>
    </section>
  `,
  effects: `
    <section class="tutorial-section">
      <h3>当前特殊效果</h3>
      <ul>
        <li><strong>流血：</strong>每回合减少 5% HP，持续 2 回合，可叠加。</li>
        <li><strong>眩晕层数：</strong>可叠加的前置层数，无额外效果。</li>
        <li><strong>眩晕 Debuff：</strong>积满层数后使目标失去行动 1 回合，并消耗 1 层眩晕 Debuff。</li>
        <li><strong>恐惧：</strong>下回合 -1 步，可叠加。</li>
        <li><strong>鸡血：</strong>下一次攻击伤害翻倍后消耗 1 层，每单位最多 1 层，多段攻击在最后一段结算翻倍。</li>
        <li><strong>依赖：</strong>下一次攻击造成真实伤害，消耗 1 层并将目标 SP 变为 0，每单位最多 1 层。</li>
        <li><strong>“恢复” Buff：</strong>下一个大回合开始时恢复 5 HP 并消耗 1 层，每个大回合仅结算 1 层，可叠加。</li>
      </ul>
    </section>
  `,
  enemies: `
    <section class="tutorial-section">
      <h3>敌人类型</h3>
      <ul>
        <li><strong>普通：</strong>无特殊能力。</li>
        <li><strong>高级：</strong>尚未登场。</li>
        <li><strong>精英：</strong>秒杀技能最多造成 100 HP，需 2 层眩晕层数才能转化为 1 层眩晕 Debuff。</li>
        <li><strong>小 Boss：</strong>秒杀技能最多造成 80 HP，需 3 层眩晕层数才能转化为 1 层眩晕 Debuff，免疫位移。</li>
        <li><strong>Boss：</strong>秒杀技能最多造成 75 HP，需 4 层眩晕层数才能转化为 1 层眩晕 Debuff，免疫位移。</li>
        <li><strong>特殊：</strong>？？？</li>
      </ul>
    </section>
  `,
};

const characterData = {
  adora: {
    name: "Adora",
    level: 20,
    bio: `名字在西班牙语里意为“崇拜”。Adora 刚出生时家人以为他是女孩，于是给了他一个偏女性化的名字。可在英语里，Adora 也被他理解为与“收养”有关，这也预示了他在九岁时父母双亡的命运。在日语里，名字前半的“Ado”有“喧嚣、骚动”之意，也象征着他在目睹朋友被枪杀后如何化为怪物。<br/><br/>他原本是个快乐的孩子，六岁时结识了两位挚友 Karma 与 Dario。家境并不富裕，但父母把能给的一切都给了这个独生子。九岁生日那天，他执意要去离家不远的游乐园。途中，一名“异端”成员已在街中央暴走，化作巨大、灾厄般、非人的怪物。车辆来不及刹车撞上了它；怪物的尖刺贯穿车体，杀死了 Adora 的父母，也夺走了他的一只眼。怪物受伤后逃逸，几辆警车紧随其后。童年的这场创伤伴随了 Adora 的一生。事发后，他拒绝警方的帮助，径直跑到 Dario 家，看到 Karma 也已经住在那里。<br/><br/>他头发右侧的“腐蚀”来自那场导致父母丧生的事故。在亲眼看见朋友死在面前之后，他逐渐变成了一个嗜血、失去自我、残暴的怪物；这一过程极其不人道且痛苦。`,
    facts: [
      "通常穿一件舒适的毛衣",
      "深灰色长发一直垂到身体下半部",
      "9～15 岁这几年一直处于抑郁状态",
      "但成绩始终名列年级前茅",
      "各科都很聪明，几乎样样精通，兴趣广泛，包括但不限于技术、游戏、照顾动物等",
      "并不喜欢暴力，但必要时会致命",
      "小时候（6 岁）喜欢戴帽子；异端事件（9 岁）后几乎从不摘下",
      "有点懒，偶尔有些孩子气",
      "多数时候试图劝两位朋友少些暴力",
      "力量与速度都不算强，不喜欢运动或任何需要剧烈活动的事",
      "不太喜欢出门",
      "9 岁后一直戴着眼罩，直到 16 岁才摘下；左眼变成十字形，他觉得不好看，于是在左眼上加了一枚钉子，贯穿左眼与头部",
      "16 岁后开始变得更开心，也许是这些年朋友持续安慰与陪伴的缘故？",
      "喜欢喝汽水",
      "现年龄：18；身高：169 厘米；生日：8 月 4 日",
      "真心信任、热爱并珍惜这个三人组",
    ],
    stats: {
      hp: 100,
      sp: 100,
      note: "SP 降至 0 会丧失控制权 1 回合并减少一步，然后自动恢复 50%。",
    },
    passives: [
      "背刺 - 如果攻击到敌方单位的背后，造成伤害 x1.5",
      "冷静分析 - 如果该回合没有任何动作则恢复 10 点 SP",
      "啊啊啊你们没事吧？！ - 友方在 6×6 范围内时回复 5% HP 与 5 SP（不包括自己）",
      "对战斗的恐惧 - 若 SP 低于 10，伤害 x1.5",
    ],
    skills: [
      {
        title: "20 级解锁",
        list: [
          "短匕轻挥！（绿色 / 1 步）- 前方 1 格 10 伤害 + 5 点精神伤害（出现率 80%）",
          "枪击（灰色 / 1 步，需要手枪）- 直线全体 10 伤害 + 5 点精神伤害（出现率 65%）",
          "呀！你不要靠近我呀！！（蓝色 / 2 步）- 四周任意 5 格位移，可触发追击短匕轻挥！（出现率 40%）",
          "自制粉色迷你电击装置！（红色 / 3 步）- 前方 2 格 10 伤害 + 15 点精神伤害并麻痹（出现率 30%）",
        ],
      },
      {
        title: "25 级解锁",
        list: [
          "略懂的医术！（粉红色 / 2 步）- 以自身为中心 5×5 选友方，恢复 20 HP + 15 SP 并附加“恢复” Buff（出现率 30%）",
          "加油哇！（橘色 / 4 步）- 以自身为中心 5×5 选友方，赋予“鸡血” Buff（出现率 20%）",
        ],
      },
      {
        title: "35 级解锁",
        list: [
          "只能靠你了。。（橘色 / 4 步）- 牺牲 25 HP，赋予友方“依赖” Buff（出现率 15%）",
        ],
      },
    ],
  },
  karma: {
    name: "Karma",
    level: 20,
    bio: `名字意为“命运、天意、行动”，象征他终将面对的致命结局。自出生起与 Dario 为好友，幼儿园时结识 Adora。因家庭争执，在 9 岁那年搬至 Dario 家。`,
    facts: [
      "平时穿衬衫配黑裤，栗红色短发",
      "在校成绩垫底，常常先行动后思考",
      "后脑自出生起带有红色“†”印记，疑似未完成的诅咒仪式",
      "体能极佳，拳力可砸倒大树，保持校内约 2/3 运动纪录",
      "喜好暴力，但在 Adora 劝导下学会克制",
      "18 岁后与伙伴涉足非法活动",
      "戒烟改用电子烟，爱吃肉与能量饮料",
      "幼儿园时期暗恋 Adora",
      "现年龄：19；身高：189 厘米；生日：4 月 14 日",
    ],
    stats: {
      hp: 200,
      sp: 50,
      note: "SP 归零会失控 1 回合并 -1 步且扣除 20 HP，随后恢复 50%。",
    },
    passives: [
      "暴力瘾 - 连续攻击提升伤害 x1.5，连击 3 次以上追击沙包大的拳头，连击 4 次后 -5 SP",
      "强悍的肉体 - 所受伤害 x0.75",
      "自尊心 - 按血量损失转换伤害加成（1% 换 0.5%）",
    ],
    skills: [
      {
        title: "20 级解锁",
        list: [
          "沙包大的拳头（绿色 / 1 步）- 15 伤害（出现率 80%）",
          "枪击（灰色 / 1 步，需要手枪）- 直线全体 10 伤害 + 5 SP（出现率 65%）",
          "都听你的（蓝色 / 2 步）- 四周任意 3 格位移并回复 5 SP（出现率 40%）",
          "嗜血之握（红色 / 3 步）- 连续 4 次拳击后处决非 Boss（伤害限制）目标（出现率 30%）",
        ],
      },
      {
        title: "25 级解锁",
        list: [
          "深呼吸（白色 / 2 步）- 恢复全部 SP 与 10 HP，若未出现在技能池则提供 10% 伤害加成（一次仅 1 张）（出现率 20%）",
        ],
      },
    ],
  },
  dario: {
    name: "Dario",
    level: 20,
    bio: `名字意为“财富、富有、更多的钱”。父母在他 6 岁时神秘失踪，仅留下豪宅与巨额财富。三人组常以其宅邸为据点。`,
    facts: [
      "常穿正式衬衫与黑裤，佩戴美元符号发夹",
      "左手因事故更换为黑色机械臂",
      "成绩略低于平均，热爱暴力并视其为艺术",
      "笑容中露出昂贵金牙，性格轻松却罕有真正快乐",
      "拥有大量资产却易感无聊，因而参与非法活动",
      "喜爱茶饮，也会抽烟喝酒",
      "外表讲究，性格抽象难测",
      "现年龄：19；身高：187 厘米；生日：5 月 24 日",
    ],
    stats: {
      hp: 150,
      sp: 100,
      note: "SP 归零会失控 1 回合并 -1 步，随后恢复 75%。",
    },
    passives: [
      "快速调整 - 失控恢复时额外获得 25% SP",
      "反击 - 受到伤害有 50% 概率以“机械爪击”反击",
      "士气鼓舞 - 每个 5 的倍数回合为全体回复 15 SP",
    ],
    skills: [
      {
        title: "20 级解锁",
        list: [
          "机械爪击（绿色 / 1 步）- 前方 2 格 15 伤害（15% 眩晕）（出现率 80%）",
          "枪击（灰色 / 1 步，需要手枪）- 直线全体 10 伤害 + 5 SP（出现率 65%）",
          "迅捷步伐（蓝色 / 2 步）- 四周任意 4 格位移并降低最近敌人 5 SP（出现率 40%）",
          "拿来吧你！（红色 / 3 步）- 拉近非 Boss 并眩晕，Boss 获得眩晕层与 SP 伤害（出现率 30%）",
        ],
      },
      {
        title: "25 级解锁",
        list: [
          "先苦后甜（橘色 / 4 步）- 下回合 +4 步（技能池仅 1 张）（出现率 15%）",
        ],
      },
    ],
  },
};

const levelData = {
  intro: {
    title: "Intro",
    enterClass: "glow-intro",
    map: {
      rows: 7,
      cols: 14,
      players: [
        { label: "Adora", x: 2, y: 4 },
        { label: "Dario", x: 2, y: 2 },
        { label: "Karma", x: 2, y: 6 },
      ],
      enemies: [
        { label: "刑警", x: 13, y: 3 },
        { label: "刑警", x: 13, y: 5 },
        { label: "刑警", x: 13, y: 1 },
      ],
      covers: [],
    },
    description: "地图 7×14。三人组与三名刑警对峙。",
    enemies: [
      {
        name: "刑警队员",
        icon: "CP",
        skillsLocked: true,
        skills: [
          "正义光环 - 每对方回合结束回复自身 15 HP",
          "捅（1 步）- 前方 1 格两段共 20 伤害与 10 SP 伤害（出现率 70%）",
          "枪击（1 步）- 指定直线 10 伤害 + 5 SP（出现率 65%）",
          "连续挥刀（2 步）- 三段伤害与额外 10 SP 伤害（出现率 50%）",
        ],
      },
    ],
  },
  limit: {
    title: "疲惫的极限",
    enterClass: "glow-limit",
    map: {
      rows: 10,
      cols: 20,
      players: [
        { label: "Adora", x: 2, y: 4 },
        { label: "Dario", x: 2, y: 2 },
        { label: "Karma", x: 2, y: 6 },
      ],
      enemies: [{ label: "卡西亚", x: 18, y: 5, spanX: 2, spanY: 2 }],
      covers: [],
    },
    description: "地图 10×20，与卡西亚·赫雷西第六干部的正面冲突。",
    enemies: [
      {
        name: "Khathia / 卡西亚",
        icon: "KH",
        skillsLocked: true,
        skills: [
          "被动：老干部 / 变态躯体 / 疲劳的躯体 / 糟糕的最初设计",
          "血肉之刃（1 步）- 前方 2×1 横斩 15 伤害（出现率 70%）",
          "怨念之爪（1 步）- 前方 2×2 10 伤害 -5 SP（出现率 70%）",
          "横扫（2 步）- 前方 4×2 造成 20 伤害（出现率 60%）",
          "痛苦咆哮（2 步）- 恢复所有 SP（出现率 35%）",
          "过多疲劳患者最终的挣扎（3 步）- 9×9 范围 50 伤害 + 70 SP（出现率 30%）",
        ],
      },
    ],
  },
  sevenSeas: {
    title: "七海",
    enterClass: "glow-seven",
    story: `夜幕低垂，海风裹挟着血腥味，从远方破旧的码头吹来……<br/>刑警队长靠在损毁的装甲车旁：“去码头找他们——‘七海作战队’。”<br/><br/>废弃码头上，三人组与 Haz 的队伍相遇，紧张气氛节节攀升。最终，七海作战队全员拉开架势，战斗一触即发。`,
    map: {
      rows: 18,
      cols: 22,
      players: [
        { label: "Adora", x: 3, y: 2 },
        { label: "Karma", x: 5, y: 2 },
        { label: "Dario", x: 7, y: 2 },
      ],
      enemies: [
        { label: "Haz", x: 21, y: 18 },
        { label: "Tusk", x: 19, y: 16, spanX: 2, spanY: 1 },
        { label: "Katz", x: 19, y: 19 },
        { label: "Neyla", x: 15, y: 20 },
        { label: "Kyn", x: 15, y: 15 },
      ],
      covers: [
        { x: 2, y: 3, width: 2, height: 2 },
        { x: 2, y: 12, width: 3, height: 2 },
        { x: 10, y: 11, width: 3, height: 2 },
      ],
    },
    description: "地图 18×22，战场右下存在 8×10 的空缺区域。所有七海成员开场带有“作战余波”Debuff。",
    enemies: [
      {
        name: "Haz（队长，Boss）",
        icon: "HZ",
        skillsLocked: true,
        skills: [
          "被动：弑神执念 / 难以抑制的仇恨 / 队员们听令！ / 一切牺牲都是值得的 / 他们不是主菜！ / 把他们追杀到天涯海角！ / 力挽狂澜",
          "鱼叉穿刺（1 步）- 20 伤害并回复 10 SP（出现率 70%）",
          "深海猎杀（2 步）- 三格内拉拽 25 伤害并 -10 SP（出现率 60%）",
          "猎神之叉（2 步）- 瞬移近身 20 伤害 + 15 SP + 流血（出现率 65%）",
          "锁链缠绕（2 步）- 两回合 40% 减伤并对反击目标造成 10 SP 伤害（出现率 50%）",
          "鲸落（4 步）- 以自身为中心 5×5，50 伤害 + 20 SP（出现率 30%）",
          "怨念滋生 / 付出代价 / 仇恨之叉（力挽狂澜后出现）",
        ],
      },
      {
        name: "Katz（伤害代表，小 Boss）",
        icon: "KZ",
        skillsLocked: true,
        skills: [
          "被动：隐秘迷恋 / 恐怖执行力 / 女强人",
          "矛刺（1 步）- 20 伤害 + 5 SP（出现率 70%）",
          "链式鞭击（2 步）- 25 伤害并 -1 步（出现率 60%）",
          "反复鞭尸（三步）- 多段伤害并回复 5 SP（出现率 50%）",
          "终焉礼炮（4 步）- 3×3 范围 60 伤害 + 15 SP（出现率 30%）",
          "必须抹杀一切。。。（2 步）- 自耗血量的多段鞭击（压迫后出现）",
        ],
      },
      {
        name: "Tusk（防御代表，小 Boss）",
        icon: "TK",
        skillsLocked: true,
        skills: [
          "被动：家人的守护 / 铁壁如山 / 猛牛之力",
          "骨盾猛击（1 步）- 10 伤害并击退（出现率 70%）",
          "来自深海的咆哮（2 步）- 3×3 -20 SP 并提升减伤（出现率 60%）",
          "牛鲨冲撞（2 步）- 2×3 冲撞 25 伤害附眩晕（出现率 50%）",
          "战争堡垒（三步）- 三回合 50% 减伤并为 Haz 增伤（出现率 30%）",
          "拼尽全力保卫队长。。。。。（2 步）- 反伤姿态（压迫后出现）",
        ],
      },
      {
        name: "Neyla（狙击手，精英）",
        icon: "NY",
        skillsLocked: true,
        skills: [
          "被动：精确瞄准 / 冷血执行者 / 神速装填",
          "迅捷射击（1 步）- 15 伤害 -5 SP（出现率 70%）",
          "穿刺狙击（2 步）- 6 格直线 30 伤害附流血（出现率 60%）",
          "双钩牵制（2 步）- 15 伤害并 -2 步（出现率 50%）",
          "终末之影（三步）- 任意目标 50 伤害 + 20 SP（出现率 30%）",
          "执行。。。。。（2 步）- 双段鱼叉（压迫后出现）",
        ],
      },
      {
        name: "Kyn（刺客，精英）",
        icon: "KN",
        skillsLocked: true,
        skills: [
          "被动：打道回府 / 无情暗杀 / 迅捷如风",
          "迅影突刺（1 步）- 5×5 内瞬移 20 伤害（出现率 70%）",
          "割喉飞刃（2 步）- 直线 25 伤害 + 5 SP（出现率 60%）",
          "影杀之舞（2 步）- 3×3 30 伤害并免费移动（出现率 50%）",
          "死亡宣告（三步）- 单体 50 伤害 + 30 SP（出现率 30%）",
          "自我了断。。。。。（2 步）- 献祭式秒杀（压迫后出现）",
        ],
      },
    ],
  },
};

function renderTutorial(tab) {
  tutorialContent.innerHTML = tutorialData[tab];
}

function renderCharacter(id) {
  const data = characterData[id];
  const portraitAccent = {
    adora: "linear-gradient(135deg, rgba(132,196,255,0.35), rgba(255,255,255,0.12))",
    karma: "linear-gradient(135deg, rgba(255,120,120,0.35), rgba(255,255,255,0.12))",
    dario: "linear-gradient(135deg, rgba(248,178,60,0.35), rgba(255,255,255,0.12))",
  }[id];

  characterDetail.innerHTML = `
    <article class="character-profile">
      <div class="character-portrait" style="background:${portraitAccent}">
        <div class="placeholder">${data.name}</div>
        <span class="character-level">Lv.${data.level}</span>
      </div>
      <div class="character-text">
        <div>
          <h3>${data.name}</h3>
          <p>${data.bio}</p>
        </div>
        <div>
          <h4>角色特性</h4>
          <ul>${data.facts.map((fact) => `<li>${fact}</li>`).join("")}</ul>
        </div>
        <div>
          <h4>基础属性</h4>
          <p>HP：${data.stats.hp} / SP：${data.stats.sp}</p>
          <p>${data.stats.note}</p>
        </div>
        <div>
          <h4>被动</h4>
          <ul>${data.passives.map((passive) => `<li>${passive}</li>`).join("")}</ul>
        </div>
        <div class="character-skill-section">
          ${data.skills
            .map(
              (group) => `
                <section>
                  <h4>${group.title}</h4>
                  <ul>${group.list.map((item) => `<li>${item}</li>`).join("")}</ul>
                </section>
              `
            )
            .join("")}
        </div>
      </div>
    </article>
  `;
}

function renderMap(map) {
  const tileSize = Math.max(12, 360 / Math.max(map.cols, map.rows));
  const players = new Map();
  const enemies = new Map();
  const covers = [];

  map.players.forEach((p) => {
    const key = `${p.x}-${p.y}`;
    players.set(key, p.label);
  });
  map.enemies.forEach((e) => {
    const spanX = e.spanX || 1;
    const spanY = e.spanY || 1;
    for (let dx = 0; dx < spanX; dx += 1) {
      for (let dy = 0; dy < spanY; dy += 1) {
        const key = `${e.x + dx}-${e.y + dy}`;
        enemies.set(key, e.label);
      }
    }
  });

  map.covers.forEach((cover) => {
    for (let dx = 0; dx < (cover.width || 1); dx += 1) {
      for (let dy = 0; dy < (cover.height || 1); dy += 1) {
        covers.push(`${cover.x + dx}-${cover.y + dy}`);
      }
    }
  });

  const tiles = [];
  for (let y = map.rows; y >= 1; y -= 1) {
    for (let x = 1; x <= map.cols; x += 1) {
      const key = `${x}-${y}`;
      let classes = "tile";
      let label = "";
      if (covers.includes(key)) {
        classes += " cover";
      }
      if (players.has(key)) {
        classes += " player";
        label = players.get(key);
      } else if (enemies.has(key)) {
        classes += " enemy";
        label = enemies.get(key);
      }
      tiles.push(`<div class="${classes}" style="min-width:${tileSize}px;" title="(${x},${y})">${label}</div>`);
    }
  }

  return `<div class="map-preview" style="grid-template-columns:repeat(${map.cols}, minmax(${tileSize}px, 1fr));">${tiles.join("")}</div>`;
}

function renderLevel(levelId) {
  const data = levelData[levelId];
  const storyBlock = data.story
    ? `<section class="story-block">${data.story}</section>`
    : "";

  levelDetail.innerHTML = `
    <div class="level-header">
      <h3 class="level-title">${data.title}</h3>
      <button class="pill-button enter-button ${data.enterClass}">进入关卡</button>
    </div>
    ${storyBlock}
    <p>${data.description}</p>
    <section>
      <h4>地图预览</h4>
      ${renderMap(data.map)}
    </section>
    <section class="enemy-section">
      <h4>敌方阵容</h4>
      <div class="enemy-icons">
        ${data.enemies
          .map(
            (enemy) => `
              <div class="enemy-icon locked" title="${enemy.name}">${enemy.icon}</div>
            `
          )
          .join("")}
      </div>
      <div class="skill-list">
        ${data.enemies
          .map(
            (enemy) => `
              <article class="skill-card locked">
                <h5>${enemy.name}</h5>
                <ul>${enemy.skills
                  .map((skill) => `<li>${skill}</li>`)
                  .join("")}</ul>
              </article>
            `
          )
          .join("")}
      </div>
    </section>
  `;
}

function playTransition(callback) {
  overlay.classList.remove("transition--reveal");
  overlay.classList.add("transition--active");
  setTimeout(() => {
    callback();
    overlay.classList.remove("transition--active");
    overlay.classList.add("transition--reveal");
    setTimeout(() => {
      overlay.classList.remove("transition--reveal");
    }, 800);
  }, 650);
}

function showScreen(target) {
  playTransition(() => {
    Object.values(screens).forEach((screen) => screen.classList.remove("screen--active"));
    screens[target].classList.add("screen--active");
    if (target === "tutorial") {
      renderTutorial(
        document.querySelector(".tutorial-tabs .tab-button.active")?.dataset.tab || "basics"
      );
    }
    if (target === "character") {
      renderCharacter(
        document.querySelector(".character-button.active")?.dataset.character || "adora"
      );
    }
    if (target === "levels") {
      const activeLevelButton = document.querySelector(".level-button.active") || document.querySelector(
        '.level-button[data-level="intro"]'
      );
      activeLevelButton?.classList.add("active");
      renderLevel(activeLevelButton.dataset.level || "intro");
    }
  });
}

function handleNavigation(event) {
  const target = event.target.closest("[data-target]");
  if (!target) return;

  if (target.dataset.target === "levels") {
    document.querySelectorAll(".level-button").forEach((btn) => btn.classList.remove("active"));
    const introButton = document.querySelector('.level-button[data-level="intro"]');
    introButton.classList.add("active");
    renderLevel("intro");
  }

  const screenName = target.dataset.target;
  if (screenName && screens[screenName]) {
    showScreen(screenName);
  }
}

document.addEventListener("click", (event) => {
  const menuAction = event.target.closest("[data-action]");
  if (menuAction) {
    if (menuAction.dataset.action === "settings") {
      document.getElementById("settings-panel").classList.remove("hidden");
    }
    if (menuAction.dataset.action === "exit") {
      alert("感谢体验 GOD'S WILL Demo！");
    }
    return;
  }

  const closeButton = event.target.closest("[data-close]");
  if (closeButton) {
    document.getElementById("settings-panel").classList.add("hidden");
  }

  if (event.target.matches(".tab-button")) {
    document
      .querySelectorAll(".tab-button")
      .forEach((btn) => btn.classList.toggle("active", btn === event.target));
    renderTutorial(event.target.dataset.tab);
  }

  if (event.target.matches(".character-button")) {
    document
      .querySelectorAll(".character-button")
      .forEach((btn) => btn.classList.toggle("active", btn === event.target));
    renderCharacter(event.target.dataset.character);
  }

  if (event.target.matches(".level-button")) {
    document
      .querySelectorAll(".level-button")
      .forEach((btn) => btn.classList.remove("active"));
    event.target.classList.add("active");
    renderLevel(event.target.dataset.level);
  }

  handleNavigation(event);
});

renderTutorial("basics");
renderCharacter("adora");
renderLevel("intro");
