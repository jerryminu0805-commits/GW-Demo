const screens = Array.from(document.querySelectorAll('.screen'));
const mask = document.querySelector('.transition-mask');
const toast = document.querySelector('.toast');
let currentScreen = 'menu';
let maskBusy = false;


const stageData = {
  intro: {
    name: 'Intro',
    recommended: '推荐等级 20',
    lore: `
      <h3>初次交火</h3>
      <p>示范章节用于熟悉 GOD'S WILL 的基础操作：站位、掩体与行动步数管理。</p>
      <h4>战斗配置</h4>
      <ul>
        <li>地图尺寸：7 × 14，双方在狭长街区两端对峙。</li>
        <li>我方起始：Adora（2,4）、Dario（2,2）、Karma（2,6）。</li>
        <li>敌方起始：三名 Lv20 刑警队员平行驻守右翼。</li>
      </ul>
      <h4>提示</h4>
      <ul>
        <li>尝试交替使用普通攻击与移动技能来保持步数盈余。</li>
        <li>观察刑警的两段攻击节奏，合理安排治疗或反击。</li>
      </ul>
    `,
    map: {
      cols: 14,
      rows: 7,
      markers: [
        { label: 'Adora', short: 'A', type: 'ally', x: 1, y: 3 },
        { label: 'Dario', short: 'D', type: 'ally', x: 1, y: 5 },
        { label: 'Karma', short: 'K', type: 'ally', x: 1, y: 1 },
        { label: '刑警', short: '警', type: 'enemy', x: 11, y: 3 },
        { label: '刑警', short: '警', type: 'enemy', x: 11, y: 5 },
        { label: '刑警', short: '警', type: 'enemy', x: 11, y: 1 },
      ],
      legend: [
        { marker: 'ally', label: '我方初始' },
        { marker: 'enemy', label: '刑警队员' },
      ],
    },
    enemies: [
      {
        key: 'police',
        name: '刑警队员',
        count: 3,
        role: '普通单位 / Lv20',
        icon: '警',
        affinity: 'enemy',
        stats: 'HP 100　SP 80（SP 降至 0 时失控 1 回合并 -1 步，随后恢复至 80）',
        passives: [
          {
            name: '正义光环',
            detail: '每个敌方回合结束时恢复自身 15 HP。',
          },
        ],
        actives: [
          {
            name: '捅',
            cost: '（1 步）',
            detail: '前方 1 格进行两段刺击，每段造成 5 HP 与 5 SP 伤害。',
          },
          {
            name: '枪击',
            cost: '（1 步）',
            detail: '指定直线的所有单位受到 10 HP 与 5 SP 伤害。',
          },
          {
            name: '连续挥刀',
            cost: '（2 步）',
            detail: '对前方 1 格连斩 3 次，依次造成 5、10、10 HP，并附加 10 SP 伤害。',
          },
        ],
      },
    ],
  },
  limit: {
    name: '疲惫的极限',
    recommended: '推荐等级 28',
    lore: `
      <h3>赫雷西第六干部·终局态</h3>
      <p>连续作战后的精神衰竭考验，面对被怨念吞噬的 Khathia。</p>
      <h4>战斗配置</h4>
      <ul>
        <li>地图尺寸：10 × 20 的长廊，左侧为我方据点。</li>
        <li>我方起始：Adora（2,4）、Dario（2,2）、Karma（2,6）。</li>
        <li>敌方起始：Khathia（占 2×2 格，位于 Adora 正对的右侧）。</li>
      </ul>
      <h4>提示</h4>
      <ul>
        <li>Khathia 会随命中回复 SP，注意控制其攻击节奏。</li>
        <li>遭遇“过多疲劳患者最终的挣扎”前务必保持队伍血量。</li>
      </ul>
    `,
    map: {
      cols: 20,
      rows: 10,
      markers: [
        { label: 'Adora', short: 'A', type: 'ally', x: 1, y: 6 },
        { label: 'Dario', short: 'D', type: 'ally', x: 1, y: 8 },
        { label: 'Karma', short: 'K', type: 'ally', x: 1, y: 4 },
        { label: 'Khathia', short: '卡', type: 'boss', x: 17, y: 6, width: 2, height: 2 },
      ],
      legend: [
        { marker: 'ally', label: '我方初始' },
        { marker: 'boss', label: 'Boss 单位' },
      ],
    },
    enemies: [
      {
        key: 'khathia',
        name: 'Khathia（卡西亚）',
        role: '赫雷西第六干部（变身）/ Boss Lv35',
        icon: '卡',
        affinity: 'boss',
        stats: 'HP 500　SP 0（SP 降至 -100 时失控 1 回合并 -1 步，随后恢复至 0）',
        passives: [
          { name: '老干部', detail: '每次命中敌人回复 2 SP。' },
          { name: '变态躯体', detail: '受到的所有伤害 ×0.75，且 15% 概率完全免疫。' },
          { name: '疲劳的躯体', detail: '每 5 回合失去 2 步。' },
          { name: '糟糕的最初设计', detail: '每回合最多移动 3 格。' },
        ],
        actives: [
          { name: '血肉之刃', cost: '（1 步）', detail: '横扫前方 2×1 区域，造成 15 HP 伤害。' },
          { name: '怨念之爪', cost: '（1 步）', detail: '撕裂前方 2×2 区域，造成 10 HP 与 5 SP 伤害。' },
          { name: '横扫', cost: '（2 步）', detail: '向前横斩 4×2 区域，造成 20 HP 伤害。' },
          { name: '痛苦咆哮', cost: '（2 步）', detail: '瞬间恢复全部 SP。' },
          { name: '过多疲劳患者最终的挣扎', cost: '（3 步）', detail: '以自身为中心 9×9 AOE，造成 50 HP 与 70 SP 伤害。' },
        ],
      },
    ],
  },
  'seven-seas': {
    name: '七海',
    recommended: '推荐等级 35+',
    lore: `
      <h3>废弃码头·夜</h3>
      <p>刑警队长指引下的暗潮汹涌之地。七海作战队以血腥威压迎接入侵者。</p>
      <h4>战斗配置</h4>
      <ul>
        <li>地图尺寸：18 × 22，右下角存在 8 × 10 的坍塌空缺。</li>
        <li>掩体：正方形掩体（2,3)-(4,5)、长条掩体（2,12)-(5,14)、码头吊机（10,11)-(12,13）。</li>
        <li>我方起始：Adora（17,2）、Karma（17,4）、Dario（17,6）。</li>
        <li>敌方起始：Haz（21,4）、Tusk（19,6，占 2×2）、Katz（19,3）、Neyla（15,2）、Kyn（15,7）。</li>
        <li>全体敌方携带“作战余波”Debuff：最大 HP -25%，造成伤害 -5。</li>
      </ul>
      <h4>战术建议</h4>
      <ul>
        <li>优先压制 Neyla 与 Kyn，避免远程处决与瞬杀威胁。</li>
        <li>利用掩体阻断 Tusk 的冲撞路线，并分散承受 Haz 的猎杀标记。</li>
        <li>20 回合后禁忌技能解锁，务必在此之前削弱七海的火力。</li>
      </ul>
    `,
    map: {
      cols: 22,
      rows: 18,
      voids: [{ from: [14, 0], to: [21, 9] }],
      covers: [
        { from: [2, 3], to: [4, 5], type: 'cover-solid' },
        { from: [2, 12], to: [5, 14], type: 'cover-linear' },
        { from: [10, 11], to: [12, 13], type: 'cover-linear' },
      ],
      markers: [
        { label: 'Adora', short: 'A', type: 'ally', x: 17, y: 2 },
        { label: 'Karma', short: 'K', type: 'ally', x: 17, y: 4 },
        { label: 'Dario', short: 'D', type: 'ally', x: 17, y: 6 },
        { label: 'Haz', short: 'Hz', type: 'boss', x: 21, y: 4 },
        { label: 'Tusk', short: 'Tu', type: 'mini-boss', x: 19, y: 6, width: 2, height: 2 },
        { label: 'Katz', short: 'Ka', type: 'mini-boss', x: 19, y: 3 },
        { label: 'Neyla', short: 'Ne', type: 'enemy-elite', x: 15, y: 2 },
        { label: 'Kyn', short: 'Ky', type: 'enemy-elite', x: 15, y: 7 },
      ],
      legend: [
        { type: 'cover-solid', label: '掩体（完全阻挡）' },
        { type: 'cover-linear', label: '掩体（可被穿透技能影响）' },
        { type: 'void', label: '坍塌海水区' },
        { marker: 'ally', label: '我方初始' },
        { marker: 'enemy-elite', label: '精英单位' },
        { marker: 'mini-boss', label: '小 Boss' },
        { marker: 'boss', label: 'Boss 单位' },
      ],
    },
    enemies: [
      {
        key: 'haz',
        name: 'Haz',
        role: '七海作战队队长 / Boss Lv55',
        icon: 'Hz',
        affinity: 'boss',
        stats: 'HP 750　SP 100（SP 降至 0 时失控 1 回合并 -1 步，随后恢复满 SP 并回复 5% HP）',
        passives: [
          { name: '弑神执念', detail: 'HP 低于 50% 时，造成的伤害 +30%。' },
          { name: '难以抑制的仇恨', detail: '攻击时 40% 概率使目标 -5 SP 并附加“恐惧”。' },
          { name: '队员们听令！', detail: '每个双数回合开始，自身 +10 SP，所有队员 +5 SP。' },
          { name: '一切牺牲都是值得的……', detail: '第 20 回合后为队员施加“队长的压迫”，解锁禁忌技能。' },
          { name: '他们不是主菜！', detail: '第 1～15 回合全队获得 30% 暴击。' },
          { name: '把他们追杀到天涯海角！', detail: '命中的首个敌人获得“猎杀标记”，全队对其伤害 +15%。' },
          { name: '力挽狂澜', detail: '场上只剩 Haz 时，伤害 +10%、受伤 -10%，并解锁额外技能。' },
        ],
        actives: [
          { name: '鱼叉穿刺', cost: '（1 步）', detail: '前方 1 格造成 20 HP，并回复自身 10 SP。' },
          { name: '深海猎杀', cost: '（2 步）', detail: '投掷鱼叉链条，3 格内造成 25 HP，将目标拉至身前并 -10 SP。' },
          { name: '猎神之叉', cost: '（2 步）', detail: '瞬移至 5×5 内目标旁，从上而下造成 20 HP（50% 概率 ×2）与 15 SP，并附加流血。' },
          { name: '锁链缠绕', cost: '（2 步）', detail: '挥舞锁链形成防护罩，2 回合内减伤 40%，下次被攻击时反击 10 SP，并令全队 +5 SP。' },
          { name: '鲸落', cost: '（4 步）', detail: '跃起砸向以自身为中心的 5×5，造成 50 HP 与 20 SP，命中单位下回合 -1 步。' },
          { name: '怨念滋生', cost: '（1 步｜力挽狂澜）', detail: '对所有带“猎杀标记”的敌人附加 1 层流血与恐惧。' },
          { name: '付出代价', cost: '（2 步｜力挽狂澜）', detail: '三段连击：15 HP、15 HP + 5 SP、再以 2×3 横扫造成 15 HP 并施加 Haz 流血。' },
          { name: '仇恨之叉', cost: '（2 步｜力挽狂澜）', detail: '2×3 横扫造成 15 HP + 10 SP，随后以 5×5 冲击造成 20 HP 并施加 Haz 流血。' },
        ],
      },
      {
        key: 'katz',
        name: 'Katz',
        role: '伤害代表 / 小 Boss Lv53',
        icon: 'Ka',
        affinity: 'mini-boss',
        stats: 'HP 500　SP 75（SP 降至 0 时失控 1 回合并 -1 步，随后恢复至 75）',
        passives: [
          { name: '隐秘迷恋', detail: 'Haz 在场时，造成伤害 +20%，每回合额外 +5 SP。' },
          { name: '恐怖执行力', detail: '每回合命中 ≥2 次时追加一次“矛刺”，并令伤害 +30%。' },
          { name: '女强人', detail: 'SP ＞ 60 时，造成伤害 +10%。' },
        ],
        actives: [
          { name: '矛刺', cost: '（1 步）', detail: '前方 1 格造成 20 HP，并回复 5 SP。（禁忌开启后不再出现）' },
          { name: '链式鞭击', cost: '（2 步）', detail: '直线 3 格造成 25 HP，使目标下回合 -1 步。（禁忌开启后不再出现）' },
          { name: '反复鞭尸', cost: '（3 步）', detail: '对前方 3 格造成 10 HP，再次挥击造成 15 HP 并回复 5 SP，可按 SP 重复至多 5 次。（禁忌开启后不再出现）' },
          { name: '终焉礼炮', cost: '（4 步）', detail: '投出炸弹鱼叉，3×3 范围造成 60 HP 与 15 SP，自身下回合 -1 步。（禁忌开启后不再出现）' },
          { name: '必须抹杀一切…', cost: '（2 步｜禁忌）', detail: '前方 3 格两段鞭击造成 20 / 30 HP，各自自损 5 HP，并可按 SP 重复至多 5 次。' },
        ],
      },
      {
        key: 'tusk',
        name: 'Tusk',
        role: '防御代表 / 小 Boss Lv54',
        icon: 'Tu',
        affinity: 'mini-boss',
        stats: 'HP 1000　SP 60（SP 降至 0 时失控 1 回合并 -1 步，随后恢复至 60）',
        passives: [
          { name: '家人的守护', detail: 'Haz 受到伤害时改由 Tusk 承受，并额外减免 50%。' },
          { name: '铁壁如山', detail: '受到所有攻击 -30% 伤害。' },
          { name: '猛牛之力', detail: '每次受伤，下次攻击额外 +5 HP，可叠加。' },
        ],
        actives: [
          { name: '骨盾猛击', cost: '（1 步）', detail: '前方 1 格造成 10 HP，并击退 1 格。（禁忌开启后不再出现）' },
          { name: '来自深海的咆哮', cost: '（2 步）', detail: '3×3 范围造成 20 SP，自身额外减伤 20%。（禁忌开启后不再出现）' },
          { name: '牛鲨冲撞', cost: '（2 步）', detail: '向前 2×3 路径造成 25 HP，并眩晕 1 回合。（禁忌开启后不再出现）' },
          { name: '战争堡垒', cost: '（3 步）', detail: '3 回合减伤 50%，每回合 +10 SP，并令 Haz 伤害 +15%。（禁忌开启后不再出现）' },
          { name: '拼尽全力保卫队长…', cost: '（2 步｜禁忌）', detail: '3 回合减伤 25% 并反伤 25%，每回合 +10 SP，同时令 Haz 回复 15% HP 与 15 SP。' },
        ],
      },
      {
        key: 'neyla',
        name: 'Neyla',
        role: '远程狙击手 / 精英 Lv52',
        icon: 'Ne',
        affinity: 'elite',
        stats: 'HP 350　SP 80（SP 降至 0 时失控 1 回合并 -1 步，随后恢复至 80）',
        passives: [
          { name: '精确瞄准', detail: '回合内未移动时，造成伤害 +50%。' },
          { name: '冷血执行者', detail: '对 HP 低于 50% 的目标造成双倍伤害。' },
          { name: '神速装填', detail: '每 3 回合额外 +10 SP。' },
        ],
        actives: [
          { name: '迅捷射击', cost: '（1 步）', detail: '4 格内造成 15 HP，并使目标 -5 SP。（禁忌开启后不再出现）' },
          { name: '穿刺狙击', cost: '（2 步）', detail: '直线 6 格造成 30 HP，并附加 2 回合流血。（禁忌开启后不再出现）' },
          { name: '双钩牵制', cost: '（2 步）', detail: '4 格内造成 15 HP，使目标下回合 -2 步。（禁忌开启后不再出现）' },
          { name: '终末之影', cost: '（3 步）', detail: '对任意目标造成 50 HP 与 20 SP，自身下回合 -1 步。（禁忌开启后每回合必定出现一次）' },
          { name: '执行…', cost: '（2 步｜禁忌）', detail: '前方一整排两段射击各造成 20 HP，若目标 HP ＜ 15% 直接处决；每次自损 15 HP，第二段额外 -40 SP。' },
        ],
      },
      {
        key: 'kyn',
        name: 'Kyn',
        role: '刺客 / 精英 Lv51',
        icon: 'Ky',
        affinity: 'elite',
        stats: 'HP 250　SP 70（SP 降至 0 时失控 1 回合并 -1 步，随后恢复至 70）',
        passives: [
          { name: '打道回府', detail: '击杀敌人后，下回合开始瞬移至 Haz 身边。' },
          { name: '无情暗杀', detail: '目标 HP 低于 25% 时直接斩杀。' },
          { name: '迅捷如风', detail: '回合开始自动 +5 SP。' },
        ],
        actives: [
          { name: '迅影突刺', cost: '（1 步）', detail: '瞬移至 5×5 内敌人身旁，造成 20 HP。（禁忌开启后不再出现）' },
          { name: '割喉飞刃', cost: '（2 步）', detail: '直线 3 格造成 25 HP 与 5 SP 伤害。（禁忌开启后不再出现）' },
          { name: '影杀之舞', cost: '（2 步）', detail: '3×3 范围造成 30 HP，并免费移动 1 格。（禁忌开启后不再出现）' },
          { name: '死亡宣告', cost: '（3 步）', detail: '对单体造成 50 HP 与 30 SP，目标 HP ＜ 30% 时直接处决。（禁忌开启后不再出现）' },
          { name: '自我了断…', cost: '（2 步｜禁忌）', detail: '瞬移至 5×5 内任意敌人并将其秒杀，同时牺牲自身全部 HP。' },
        ],
      },
    ],
  },
};
const characterData = {
  adora: {
    level: 20,
    portraitClass: 'portrait--adora',
    bio: `
      <h2>Adora</h2>
      <p>名字在西班牙语里意为“崇拜”。出生时被误认作女孩，从而拥有偏女性化的名字；在英语里，他又将名字理解为“收养”，预示着九岁时父母双亡的命运。日语中的“Ado”意为喧嚣、骚动，象征着他在经历创伤后逐步化身怪物的过程。</p>
      <ul>
        <li>6 岁结识 Karma 与 Dario，家境清贫但父母宠爱备至。</li>
        <li>九岁生日遭遇“异端”事故，失去父母与左眼，拒绝警方帮助后与挚友同住。</li>
        <li>头发右侧的腐蚀痕迹来自那场事故；16 岁摘下眼罩，在左眼钉入金属钉以掩饰十字形瞳孔。</li>
        <li>成绩常年名列前茅，涉猎技术、游戏、照顾动物等多个领域。</li>
        <li>外冷内热，不喜暴力，但为保护同伴可毫不犹豫出手。</li>
        <li>现年 18 岁，身高 169 cm，生日 8 月 4 日。</li>
      </ul>
    `,
    skills: `
      <h2>战斗数据</h2>
      <p><strong>HP：</strong>100　<strong>SP：</strong>100（降至 0 时失控 1 回合、步数 -1，结束后恢复 50% SP）</p>
      <h3>被动</h3>
      <ul>
        <li><strong>背刺</strong>：从背后攻击敌人时伤害 ×1.5。</li>
        <li><strong>冷静分析</strong>：当回合没有任何行动时恢复 10 点 SP。</li>
        <li><strong>啊啊啊你们没事吧？！</strong>：若 6×6 范围内有友方单位（不含自身）则回复 5% HP 与 5 SP。</li>
        <li><strong>对战斗的恐惧</strong>：SP 低于 10 时伤害 ×1.5。</li>
      </ul>
      <h3>技能池</h3>
      <ul>
        <li><strong>短匕轻挥！</strong>（绿色／1 步，80% 概率出现）：前方 1 格，造成 10 HP 与 5 SP 伤害。</li>
        <li><strong>枪击</strong>（灰色／1 步，65%）：拥有手枪道具时，对一整排造成 10 HP + 5 SP 伤害。</li>
        <li><strong>呀！你不要靠近我呀！！</strong>（蓝色／2 步，40%）：可选择周围任意 5 格；若目标 HP ＜ 50%，追击一次“短匕轻挥！”。</li>
        <li><strong>自制粉色迷你电击装置！</strong>（红色／3 步，30%）：前方 2 格，造成 10 HP + 15 SP 伤害并麻痹目标（下回合步数 -1）。</li>
        <li><strong>略懂的医术！</strong>（粉色／2 步，25 级解锁，30%）：以自身为中心 5×5，治疗 20 HP + 15 SP 并赋予 1 层“恢复” Buff。</li>
        <li><strong>加油哇！</strong>（橘色／4 步，25 级解锁，20%）：为友方赋予 1 层“鸡血” Buff。</li>
        <li><strong>只能靠你了。。</strong>（橘色／4 步，35 级解锁，15%）：自身损失 25 HP，为友方施加“依赖” Buff。</li>
      </ul>
    `,
  },
  karma: {
    level: 20,
    portraitClass: 'portrait--karma',
    bio: `
      <h2>Karma</h2>
      <p>名字意为“命运、行动”。自出生起便与 Dario 为友，幼儿园时结识 Adora。家庭暴力迫使他 9 岁时搬离原生家庭，与挚友同住。</p>
      <ul>
        <li>栗红色短发、手掌巨大，常穿衬衫与黑裤。</li>
        <li>在校成绩垫底但体能怪物，保持约 2/3 校级纪录。</li>
        <li>热爱暴力却逐渐学会克制，18 岁后与 Dario 参与非法活动。</li>
        <li>爱喝能量饮料与酒，曾抽烟但为 Adora 戒烟改用电子烟。</li>
        <li>幼儿园起暗恋 Adora，现年 19 岁，身高 189 cm，生日 4 月 14 日。</li>
      </ul>
    `,
    skills: `
      <h2>战斗数据</h2>
      <p><strong>HP：</strong>200　<strong>SP：</strong>50（降至 0 时失控 1 回合、步数 -1、HP -20，结束后恢复 50% SP）</p>
      <h3>被动</h3>
      <ul>
        <li><strong>暴力瘾</strong>：连续攻击同一敌人伤害 ×1.5；连击 ≥3 次追加“沙包大的拳头”，≥4 次每次连击后追加，但每次额外连击消耗 5 SP。</li>
        <li><strong>强悍的肉体</strong>：受到伤害 ×0.75。</li>
        <li><strong>自尊心</strong>：根据失去的 HP 增加伤害，每损失 1% HP 获得 0.5% 伤害。</li>
      </ul>
      <h3>技能池</h3>
      <ul>
        <li><strong>沙包大的拳头</strong>（绿色／1 步，80%）：造成 15 点伤害。</li>
        <li><strong>枪击</strong>（灰色／1 步，65%）：拥有手枪道具时，对一整排造成 10 HP + 5 SP 伤害。</li>
        <li><strong>都听你的</strong>（蓝色／2 步，40%）：可移动至周围任意 3 格并恢复 5 SP。</li>
        <li><strong>嗜血之握</strong>（红色／3 步，30%）：连续使用 4 次“沙包大的拳头”后，可处决非 Boss（75/80/100 HP）。</li>
        <li><strong>深呼吸</strong>（白色／2 步，25 级解锁，20%）：立即恢复全部 SP 与 10 HP；若未进入技能池则为自身增加 10% 伤害（仅能存在 1 张）。</li>
      </ul>
    `,
  },
  dario: {
    level: 20,
    portraitClass: 'portrait--dario',
    bio: `
      <h2>Dario</h2>
      <p>名字意为“财富、富有”，象征他与生俱来的丰厚家产。父母在他 6 岁时失踪，只留下豪宅与巨额资产，成为三人据点。</p>
      <ul>
        <li>佩戴美元符号发夹，左臂替换为黑色机械臂。</li>
        <li>成绩略低于平均，体能与敏捷兼备，保持约 1/3 校级纪录。</li>
        <li>笑容轻松、性格抽象，热爱暴力并视之为艺术。</li>
        <li>嗜茶、偶尔抽烟喝酒，自认打扮讲究。</li>
        <li>现年 19 岁，身高 187 cm，生日 5 月 24 日。</li>
      </ul>
    `,
    skills: `
      <h2>战斗数据</h2>
      <p><strong>HP：</strong>150　<strong>SP：</strong>100（降至 0 时失控 1 回合、步数 -1，结束后恢复 75% SP）</p>
      <h3>被动</h3>
      <ul>
        <li><strong>快速调整</strong>：混乱后恢复 75% SP。</li>
        <li><strong>反击</strong>：受到伤害时 50% 概率反击“机械爪击”。</li>
        <li><strong>士气鼓舞</strong>：每逢 5 的倍数回合，为全队回复 15 SP。</li>
      </ul>
      <h3>技能池</h3>
      <ul>
        <li><strong>机械爪击</strong>（绿色／1 步，80%）：前方 2 格造成 15 点伤害，15% 概率附加眩晕层。</li>
        <li><strong>枪击</strong>（灰色／1 步，65%）：拥有手枪道具时，对一整排造成 10 HP + 5 SP 伤害。</li>
        <li><strong>迅捷步伐</strong>（蓝色／2 步，40%）：可移动至周围任意 4 格并使最近敌人 -5 SP。</li>
        <li><strong>拿来吧你！</strong>（红色／3 步，30%）：拉扯直线第一位非 Boss 单位至面前并造成 20 HP 与眩晕，Boss 免位移但仍受眩晕层与 -15 SP。</li>
        <li><strong>先苦后甜</strong>（橘色／4 步，25 级解锁，15%）：下一回合步数 +4（同一技能池仅能出现 1 张）。</li>
      </ul>
    `,
  },
};

const stageNodes = Array.from(document.querySelectorAll('.stage-node'));
const stageTitle = document.querySelector('.stage-info__title');
const stageMeta = document.querySelector('.stage-info__meta');
const stageLore = document.querySelector('.stage-info__lore');
const enemySection = document.querySelector('.stage-info__enemies');
const enemyRoster = document.querySelector('[data-enemy-roster]');
const enemyDetails = document.querySelector('[data-enemy-details]');
const stageMapSection = document.querySelector('.stage-info__map');
const stageMapCanvas = stageMapSection ? stageMapSection.querySelector('[data-map-canvas]') : null;
const stageMapLegend = stageMapSection ? stageMapSection.querySelector('[data-map-legend]') : null;
let activeStage = 'intro';
const unlockedStages = new Set();

const tutorialTabs = Array.from(document.querySelectorAll('.tutorial__tab'));
const tutorialPanels = Array.from(document.querySelectorAll('.tutorial__panel'));
const characterTabs = Array.from(document.querySelectorAll('.character__tab'));
const characterPanels = Array.from(document.querySelectorAll('.character__panel'));
const characterItems = Array.from(document.querySelectorAll('.character__item'));
const levelValue = document.querySelector('.level-value');
const portrait = document.querySelector('.portrait__image');

function setActiveScreen(target) {
  screens.forEach((screen) => {
    const isTarget = screen.dataset.screen === target;
    screen.classList.toggle('active', isTarget);
    screen.setAttribute('aria-hidden', (!isTarget).toString());
  });
  currentScreen = target;
}

function transitionToScreen(target) {
  if (target === currentScreen || maskBusy) return;
  maskBusy = true;
  mask.classList.add('is-visible', 'is-covering');

  const handleCoverEnd = (event) => {
    if (event.animationName !== 'mask-cover') return;
    mask.removeEventListener('animationend', handleCoverEnd);
    setActiveScreen(target);
    mask.classList.remove('is-covering');
    mask.classList.add('is-revealing');
    mask.addEventListener('animationend', handleRevealEnd, { once: true });
  };

  const handleRevealEnd = (event) => {
    if (event.animationName !== 'mask-reveal') return;
    mask.classList.remove('is-visible', 'is-revealing');
    maskBusy = false;
  };

  mask.addEventListener('animationend', handleCoverEnd);
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('is-visible');
  setTimeout(() => {
    toast.classList.remove('is-visible');
  }, 2200);
}

function renderStage(stageKey) {
  const data = stageData[stageKey];
  if (!data) return;
  if (stageTitle) {
    stageTitle.textContent = data.name || '???';
  }
  if (stageMeta) {
    stageMeta.textContent = data.recommended || '';
    stageMeta.classList.toggle('is-hidden', !data.recommended);
  }
  if (stageLore) {
    stageLore.innerHTML = data.lore || '';
  }
  renderStageMap(data.map);
  renderEnemies(stageKey);
  if (enemySection) {
    enemySection.classList.toggle('is-locked', !unlockedStages.has(stageKey));
  }
}

function renderStageMap(mapData) {
  if (!stageMapSection || !stageMapCanvas) return;
  stageMapCanvas.innerHTML = '';
  if (!mapData) {
    stageMapSection.classList.add('is-hidden');
    if (stageMapLegend) {
      stageMapLegend.innerHTML = '';
      stageMapLegend.classList.add('is-hidden');
    }
    return;
  }

  const cols = Math.max(1, mapData.cols || 12);
  const rows = Math.max(1, mapData.rows || 12);
  const cells = Array.from({ length: rows }, () => Array.from({ length: cols }, () => 'floor'));

  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
  const toRowIndex = (y) => rows - 1 - y;

  const applyArea = (area, type) => {
    if (!area) return;
    const fromX = clamp(Math.min(area.from?.[0] ?? 0, area.to?.[0] ?? 0), 0, cols - 1);
    const toX = clamp(Math.max(area.from?.[0] ?? 0, area.to?.[0] ?? 0), 0, cols - 1);
    const fromY = clamp(Math.min(area.from?.[1] ?? 0, area.to?.[1] ?? 0), 0, rows - 1);
    const toY = clamp(Math.max(area.from?.[1] ?? 0, area.to?.[1] ?? 0), 0, rows - 1);

    for (let y = fromY; y <= toY; y += 1) {
      const rowIndex = toRowIndex(y);
      if (rowIndex < 0 || rowIndex >= rows) continue;
      for (let x = fromX; x <= toX; x += 1) {
        cells[rowIndex][x] = type;
      }
    }
  };

  if (Array.isArray(mapData.hazards)) {
    mapData.hazards.forEach((area) => applyArea(area, area.type || 'hazard'));
  }
  if (Array.isArray(mapData.covers)) {
    mapData.covers.forEach((area) => applyArea(area, area.type || 'cover-solid'));
  }
  if (Array.isArray(mapData.voids)) {
    mapData.voids.forEach((area) => applyArea(area, 'void'));
  }

  const tacticalMap = document.createElement('div');
  tacticalMap.className = 'tactical-map';
  tacticalMap.style.setProperty('--map-cols', cols);
  tacticalMap.style.setProperty('--map-rows', rows);

  const grid = document.createElement('div');
  grid.className = 'tactical-map__grid';
  grid.style.setProperty('--map-cols', cols);
  grid.style.setProperty('--map-rows', rows);

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const cell = document.createElement('div');
      const type = cells[row][col];
      cell.className = `map-cell map-cell--${type}`;
      grid.appendChild(cell);
    }
  }

  if (Array.isArray(mapData.markers)) {
    mapData.markers.forEach((marker) => {
      if (marker.x == null || marker.y == null) return;
      const markerEl = document.createElement('div');
      markerEl.className = `map-marker map-marker--${marker.type || 'neutral'}`;
      if (marker.short) {
        const short = document.createElement('span');
        short.className = 'map-marker__code';
        short.textContent = marker.short;
        markerEl.appendChild(short);
      }
      const label = document.createElement('span');
      label.className = 'map-marker__label';
      label.textContent = marker.label || '';
      markerEl.appendChild(label);

      const spanX = clamp((marker.width || 1), 1, cols);
      const spanY = clamp((marker.height || 1), 1, rows);
      const columnStart = clamp(marker.x, 0, cols - 1) + 1;
      const rowStart = clamp(rows - marker.y - spanY + 1, 1, rows);

      markerEl.style.gridColumn = `${columnStart} / span ${spanX}`;
      markerEl.style.gridRow = `${rowStart} / span ${spanY}`;
      grid.appendChild(markerEl);
    });
  }

  tacticalMap.appendChild(grid);
  stageMapCanvas.appendChild(tacticalMap);

  if (stageMapLegend) {
    stageMapLegend.innerHTML = '';
    if (Array.isArray(mapData.legend) && mapData.legend.length) {
      stageMapLegend.classList.remove('is-hidden');
      mapData.legend.forEach((entry) => {
        const item = document.createElement('div');
        item.className = 'map-legend__item';

        if (entry.type) {
          const swatch = document.createElement('span');
          swatch.className = `map-legend__swatch map-legend__swatch--${entry.type}`;
          item.appendChild(swatch);
        } else if (entry.marker) {
          const marker = document.createElement('span');
          marker.className = `map-legend__marker map-legend__marker--${entry.marker}`;
          item.appendChild(marker);
        }

        const text = document.createElement('span');
        text.className = 'map-legend__label';
        text.textContent = entry.label;
        item.appendChild(text);
        stageMapLegend.appendChild(item);
      });
    } else {
      stageMapLegend.classList.add('is-hidden');
    }
  }

  stageMapSection.classList.remove('is-hidden');
}

function renderEnemies(stageKey) {
  if (!enemySection || !enemyRoster || !enemyDetails) return;
  enemyRoster.innerHTML = '';
  enemyDetails.innerHTML = '';

  const stage = stageData[stageKey];
  const enemies = stage?.enemies;

  if (!Array.isArray(enemies) || enemies.length === 0) {
    enemySection.classList.add('is-empty');
    const placeholder = document.createElement('p');
    placeholder.className = 'enemy-empty';
    placeholder.textContent = '暂无敌方情报。';
    enemyDetails.appendChild(placeholder);
    return;
  }

  enemySection.classList.remove('is-empty');

  const createListItem = (entry = {}, includeCost = false) => {
    const item = document.createElement('li');
    if (entry.name) {
      const title = document.createElement('strong');
      title.textContent = entry.name;
      item.appendChild(title);
    }
    if (includeCost && entry.cost) {
      const cost = document.createElement('span');
      cost.className = 'enemy-card__cost';
      cost.textContent = ` ${entry.cost}`;
      item.appendChild(cost);
    }
    if (entry.detail) {
      const detail = document.createElement('span');
      detail.className = 'enemy-card__detail';
      detail.textContent = item.childNodes.length ? `：${entry.detail}` : entry.detail;
      item.appendChild(detail);
    }
    return item;
  };

  enemies.forEach((enemy) => {
    const affinity = enemy?.affinity || 'neutral';
    const iconText = (enemy?.icon || enemy?.name || '?').slice(0, 2);
    const nameText = enemy?.count ? `${enemy.name} ×${enemy.count}` : (enemy?.name || '未知单位');

    const rosterItem = document.createElement('div');
    rosterItem.className = `enemy-roster__item enemy-roster__item--${affinity}`;
    rosterItem.title = enemy?.role || nameText;

    const rosterIcon = document.createElement('span');
    rosterIcon.className = 'enemy-roster__icon';
    rosterIcon.textContent = iconText;
    rosterItem.appendChild(rosterIcon);

    const rosterName = document.createElement('span');
    rosterName.className = 'enemy-roster__name';
    rosterName.textContent = nameText;
    rosterItem.appendChild(rosterName);

    enemyRoster.appendChild(rosterItem);

    const card = document.createElement('article');
    card.className = `enemy-card enemy-card--${affinity}`;

    const header = document.createElement('header');
    header.className = 'enemy-card__header';

    const cardIcon = document.createElement('div');
    cardIcon.className = `enemy-card__icon enemy-card__icon--${affinity}`;
    cardIcon.textContent = iconText;
    header.appendChild(cardIcon);

    const titleWrap = document.createElement('div');
    titleWrap.className = 'enemy-card__title';

    const title = document.createElement('h4');
    title.textContent = nameText;
    titleWrap.appendChild(title);

    if (enemy?.role) {
      const role = document.createElement('p');
      role.className = 'enemy-card__role';
      role.textContent = enemy.role;
      titleWrap.appendChild(role);
    }

    header.appendChild(titleWrap);
    card.appendChild(header);

    const body = document.createElement('div');
    body.className = 'enemy-card__body';

    if (enemy?.stats) {
      const stats = document.createElement('p');
      stats.className = 'enemy-card__stats';
      stats.textContent = enemy.stats;
      body.appendChild(stats);
    }

    if (Array.isArray(enemy?.passives) && enemy.passives.length) {
      const section = document.createElement('section');
      section.className = 'enemy-card__section';
      const heading = document.createElement('h5');
      heading.textContent = '被动';
      section.appendChild(heading);
      const list = document.createElement('ul');
      list.className = 'enemy-card__list';
      enemy.passives.forEach((entry) => {
        list.appendChild(createListItem(entry));
      });
      section.appendChild(list);
      body.appendChild(section);
    }

    if (Array.isArray(enemy?.actives) && enemy.actives.length) {
      const section = document.createElement('section');
      section.className = 'enemy-card__section';
      const heading = document.createElement('h5');
      heading.textContent = '主动技能';
      section.appendChild(heading);
      const list = document.createElement('ul');
      list.className = 'enemy-card__list';
      enemy.actives.forEach((entry) => {
        list.appendChild(createListItem(entry, true));
      });
      section.appendChild(list);
      body.appendChild(section);
    }

    if (Array.isArray(enemy?.notes) && enemy.notes.length) {
      const notes = document.createElement('section');
      notes.className = 'enemy-card__section enemy-card__section--notes';
      const list = document.createElement('ul');
      list.className = 'enemy-card__list';
      enemy.notes.forEach((entry) => {
        list.appendChild(createListItem(entry));
      });
      notes.appendChild(list);
      body.appendChild(notes);
    }

    card.appendChild(body);
    enemyDetails.appendChild(card);
  });
}

function setActiveStage(stageKey) {
  if (!stageData[stageKey]) return;
  activeStage = stageKey;
  stageNodes.forEach((node) => {
    const isActive = node.dataset.stage === stageKey;
    node.classList.toggle('is-active', isActive);
    node.setAttribute('aria-pressed', isActive.toString());
  });
  renderStage(stageKey);
}

stageNodes.forEach((node) => {
  node.addEventListener('click', () => {
    setActiveStage(node.dataset.stage);
  });
});

function scanStage(stageKey) {
  const data = stageData[stageKey];
  if (!data) return;
  showToast(`已扫描 ${data.name} 战场。`);
}

function unlockStage(stageKey) {
  const data = stageData[stageKey];
  if (!data) return;
  const firstUnlock = !unlockedStages.has(stageKey);
  unlockedStages.add(stageKey);
  renderStage(stageKey);
  showToast(firstUnlock ? `${data.name} 敌方技能已解锁` : `${data.name} 情报已掌握`);
}

function setActiveTutorial(tabKey) {
  tutorialTabs.forEach((tab) => {
    const isTarget = tab.dataset.tab === tabKey;
    tab.classList.toggle('is-active', isTarget);
    tab.setAttribute('aria-selected', isTarget.toString());
  });
  tutorialPanels.forEach((panel) => {
    const isTarget = panel.dataset.tabPanel === tabKey;
    panel.classList.toggle('is-active', isTarget);
    panel.setAttribute('aria-hidden', (!isTarget).toString());
  });
}

tutorialTabs.forEach((tab) => {
  tab.addEventListener('click', () => setActiveTutorial(tab.dataset.tab));
});

function setCharacter(characterKey) {
  const data = characterData[characterKey];
  if (!data) return;
  levelValue.textContent = data.level;
  portrait.className = `portrait__image ${data.portraitClass || ''}`;
  characterPanels.forEach((panel) => {
    const key = panel.dataset.tabPanel;
    if (key === 'bio') {
      panel.innerHTML = data.bio;
    }
    if (key === 'skills') {
      panel.innerHTML = data.skills;
    }
  });
  characterItems.forEach((item) => {
    const isActive = item.dataset.character === characterKey;
    item.classList.toggle('is-active', isActive);
    item.setAttribute('aria-pressed', isActive.toString());
  });
}

characterItems.forEach((item) => {
  item.addEventListener('click', () => setCharacter(item.dataset.character));
});

characterTabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    const target = tab.dataset.tab;
    characterTabs.forEach((button) => {
      const isActive = button.dataset.tab === target;
      button.classList.toggle('is-active', isActive);
      button.setAttribute('aria-selected', isActive.toString());
    });
    characterPanels.forEach((panel) => {
      const isActive = panel.dataset.tabPanel === target;
      panel.classList.toggle('is-active', isActive);
      panel.setAttribute('aria-hidden', (!isActive).toString());
    });
  });
});

const actionHandlers = {
  start: () => transitionToScreen('chapters'),
  settings: () => showToast('设置功能将在正式版开放'),
  exit: () => showToast('Demo 版本暂不支持离开'),
  tutorial: () => transitionToScreen('tutorial'),
  'back-to-menu': () => transitionToScreen('menu'),
  'open-demo': () => {
    setActiveStage(activeStage);
    transitionToScreen('stages');
  },
  'open-characters': () => transitionToScreen('characters'),
  'back-to-chapters': () => transitionToScreen('chapters'),
  'scan-stage': () => scanStage(activeStage),
  'enter-stage': () => unlockStage(activeStage),
};

document.addEventListener('click', (event) => {
  const target = event.target.closest('[data-action]');
  if (!target) return;
  const handler = actionHandlers[target.dataset.action];
  if (handler) {
    handler();
  }
});

function addSevenSeaParticles() {
  const container = document.querySelector('.stage-node--seven-seas .stage-node__particles');
  if (!container) return;
  container.innerHTML = '';
  const count = 26;
  for (let i = 0; i < count; i += 1) {
    const particle = document.createElement('span');
    particle.classList.add('particle');
    particle.style.left = `${8 + Math.random() * 84}%`;
    particle.style.bottom = `${-12 + Math.random() * 18}px`;
    particle.style.animationDelay = `${Math.random() * 3.2}s`;
    particle.style.animationDuration = `${2.2 + Math.random() * 2.4}s`;
    container.appendChild(particle);
  }
}

function init() {
  addSevenSeaParticles();
  setActiveStage('intro');
  setActiveTutorial('basics');
  setCharacter('adora');
  characterTabs.forEach((tab) => {
    const isActive = tab.classList.contains('is-active');
    tab.setAttribute('aria-selected', isActive.toString());
  });
}

document.addEventListener('DOMContentLoaded', init);
