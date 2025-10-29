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
      <h3>作战背景</h3>
      <p>示范章节的开端，提供给初次接触指挥系统的玩家熟悉行动点、掩体与敌人仇恨机制的空间。</p>
      <h4>战场要点</h4>
      <ul>
        <li>初始站位紧凑，方便练习换位与支援。</li>
        <li>掩体仅能阻挡非范围攻击，提醒玩家体验穿透与范围差异。</li>
        <li>敌人以近战侦察兵为主，少量远程单位用于提示躲避。</li>
      </ul>
      <h4>建议战术</h4>
      <ul>
        <li>合理轮转普通攻击与移动技能，保持步数不过量溢出。</li>
        <li>尝试触发被动“冷静分析”，熟悉不行动也能恢复 SP 的机制。</li>
      </ul>
    `,
    map: {
      cols: 12,
      rows: 10,
      covers: [
        { from: [2, 5], to: [3, 6], type: 'cover-solid' },
        { from: [6, 3], to: [7, 4], type: 'cover-low' },
        { from: [9, 6], to: [10, 7], type: 'cover-low' },
      ],
      hazards: [
        { from: [0, 0], to: [11, 0], type: 'hazard-training' },
      ],
      markers: [
        { label: 'Karma', short: 'K', type: 'ally', x: 4, y: 1 },
        { label: 'Adora', short: 'A', type: 'ally', x: 5, y: 1 },
        { label: 'Dario', short: 'D', type: 'ally', x: 6, y: 1 },
        { label: '侦察兵', short: 'R', type: 'enemy', x: 8, y: 5 },
        { label: '破坏者', short: 'Sab', type: 'enemy', x: 10, y: 7 },
      ],
      legend: [
        { type: 'cover-solid', label: '掩体（全阻挡）' },
        { type: 'cover-low', label: '低掩体' },
        { type: 'hazard-training', label: '训练区边界' },
        { marker: 'ally', label: '我方初始' },
        { marker: 'enemy', label: '敌方巡逻' },
      ],
    },
    enemySkills: `
      <h3>敌方技能情报</h3>
      <article>
        <h4>异端侦察兵</h4>
        <ul>
          <li><strong>撕咬</strong>：单体近战攻击，造成 8 HP 伤害。</li>
          <li><strong>盯防</strong>：自身获得 1 层减伤，持续 1 回合。</li>
        </ul>
      </article>
      <article>
        <h4>破坏者小队</h4>
        <ul>
          <li><strong>投掷燃瓶</strong>：以玩家为中心 1 格范围造成 5 HP + 灼烧。</li>
          <li><strong>快速换位</strong>：消耗 2 步换到相邻掩体。</li>
        </ul>
      </article>
    `,
  },
  limit: {
    name: '疲惫的极限',
    recommended: '推荐等级 24',
    lore: `
      <h3>连续作战模拟</h3>
      <p>在连番战斗后，队伍的精神力逐渐紧张。环境持续施加 SP 压力，迫使玩家管理恢复技能。</p>
      <h4>战场要点</h4>
      <ul>
        <li>环境效果：所有单位每 2 回合额外损失 5 点 SP。</li>
        <li>新增持盾狂信徒，可在掩体后发动穿刺，强调位置控制。</li>
        <li>掩体分布稀疏，需要轮班守卫或主动清理。</li>
      </ul>
      <h4>建议战术</h4>
      <ul>
        <li>善用粉色与橘色辅助技能，避免队伍陷入眩晕循环。</li>
        <li>轮换主力输出，确保至少一人保持高 SP 以应对突发状况。</li>
      </ul>
    `,
    map: {
      cols: 14,
      rows: 12,
      covers: [
        { from: [1, 8], to: [3, 9], type: 'cover-low' },
        { from: [6, 4], to: [8, 6], type: 'cover-linear' },
        { from: [10, 9], to: [12, 10], type: 'cover-solid' },
      ],
      hazards: [
        { from: [0, 0], to: [13, 2], type: 'hazard-sp-drain' },
      ],
      markers: [
        { label: '前锋', short: 'V', type: 'ally', x: 3, y: 1 },
        { label: '支援', short: 'S', type: 'ally', x: 4, y: 1 },
        { label: 'Karma', short: 'K', type: 'ally', x: 5, y: 1 },
        { label: '狂信徒', short: 'Fan', type: 'enemy', x: 7, y: 7 },
        { label: '咒术师', short: 'Hex', type: 'enemy-elite', x: 11, y: 8 },
      ],
      legend: [
        { type: 'cover-solid', label: '掩体（全阻挡）' },
        { type: 'cover-linear', label: '掩体（穿刺可破）' },
        { type: 'cover-low', label: '低掩体' },
        { type: 'hazard-sp-drain', label: '精神力消耗区域' },
        { marker: 'ally', label: '我方初始' },
        { marker: 'enemy', label: '敌方小队' },
        { marker: 'enemy-elite', label: '精英单位' },
      ],
    },
    enemySkills: `
      <h3>敌方技能情报</h3>
      <article>
        <h4>持盾狂信徒</h4>
        <ul>
          <li><strong>穿刺</strong>：以直线 2 格造成 15 HP 伤害，可穿透单层掩体。</li>
          <li><strong>铁壁</strong>：获得 30% 减伤，持续 2 回合；被打破后反击 5 HP。</li>
        </ul>
      </article>
      <article>
        <h4>疲劳咒术师</h4>
        <ul>
          <li><strong>心智抽离</strong>：对单体造成 10 SP 伤害并附加“恐惧”。</li>
          <li><strong>虚弱雾</strong>：以 3×3 范围使敌方下回合步数 -1。</li>
        </ul>
      </article>
    `,
  },
  'seven-seas': {
    name: '七海',
    recommended: '推荐等级 35+',
    lore: `
      <h3>废弃码头·夜</h3>
      <p>夜幕低垂，海风夹杂血腥味。刑警队长提供的线索指向七海作战队——唯一一支不听命于政府的部队。</p>
      <p>三人组抵达破旧码头，面对的是浑身浴血、鱼叉尚滴着残肉的队长 Haz 与他最信任的四位队员。</p>
      <h4>地图情报</h4>
      <ul>
        <li>尺寸：18 × 22 格，右下方有 8 × 10 的缺口构成复杂地形。</li>
        <li>掩体分布：
          <ul>
            <li>(2,3)-(4,5) 正方形掩体，可阻挡所有非范围攻击。</li>
            <li>(2,12)-(5,14) 长方形掩体，仅范围技能或穿透技能可突破。</li>
            <li>(10,11)-(12,13) 正方形掩体，适合阻挡冲锋路线。</li>
          </ul>
        </li>
        <li>我方初始站位：Karma (3,2)、Dario (5,2)、Adora (7,2)。</li>
        <li>敌军初始站位：Haz(21,4)、Tusk(19,6)、Katz(19,3)、Neyla(15,2)、Kyn(15,7)。</li>
        <li>全体敌人携带“作战余波”Debuff：-25% HP，伤害 -5。</li>
      </ul>
      <h4>战术建议</h4>
      <ul>
        <li>优先处理 Neyla、Kyn 等机动型威胁，防止远程处决或刺杀。</li>
        <li>保持 Haz 的猎杀标记在可控范围内，随时准备驱散或护盾。</li>
        <li>利用掩体断绝 Tusk 的冲撞路线，等待其技能冷却后集火。</li>
      </ul>
    `,
    map: {
      cols: 22,
      rows: 18,
      voids: [
        { from: [14, 0], to: [21, 9] },
      ],
      covers: [
        { from: [2, 3], to: [4, 5], type: 'cover-solid' },
        { from: [2, 12], to: [5, 14], type: 'cover-linear' },
        { from: [10, 11], to: [12, 13], type: 'cover-linear' },
      ],
      markers: [
        { label: 'Karma', short: 'K', type: 'ally', x: 3, y: 2 },
        { label: 'Dario', short: 'D', type: 'ally', x: 5, y: 2 },
        { label: 'Adora', short: 'A', type: 'ally', x: 7, y: 2 },
        { label: 'Haz', short: 'Haz', type: 'boss', x: 21, y: 13 },
        { label: 'Tusk', short: 'Tu', type: 'mini-boss', x: 19, y: 11, width: 2, height: 2 },
        { label: 'Katz', short: 'Ka', type: 'mini-boss', x: 19, y: 9 },
        { label: 'Neyla', short: 'Ne', type: 'enemy-elite', x: 15, y: 12 },
        { label: 'Kyn', short: 'Ky', type: 'enemy-elite', x: 15, y: 7 },
      ],
      legend: [
        { type: 'cover-solid', label: '掩体（全阻挡）' },
        { type: 'cover-linear', label: '掩体（穿透受限）' },
        { type: 'void', label: '坍塌海水区' },
        { marker: 'ally', label: '我方初始' },
        { marker: 'enemy-elite', label: '精英单位' },
        { marker: 'mini-boss', label: '小 Boss' },
        { marker: 'boss', label: 'Haz／Boss' },
      ],
    },
    enemySkills: `
      <h3>七海作战队技能情报</h3>
      <article>
        <h4>Haz（队长／Boss Lv55）</h4>
        <p>HP 750　SP 100（归零后失控 1 回合，步数 -1，随后恢复满 SP 并回复 5% HP）</p>
        <h5>被动</h5>
        <ul>
          <li><strong>弑神执念</strong>：HP 低于 50% 时，伤害 +30%。</li>
          <li><strong>难以抑制的仇恨</strong>：攻击时 40% 几率使目标 -5 SP，并附加“恐惧”。</li>
          <li><strong>队员们听令！</strong>：每个双数回合开始，自身 +10 SP，所有队员 +5 SP。</li>
          <li><strong>一切牺牲都是值得的。。。。。。</strong>：20 回合后，队员获得“队长的压迫”解锁禁忌技能。</li>
          <li><strong>他们不是主菜！</strong>：1～15 回合队员获得 30% 暴击。</li>
          <li><strong>把他们追杀到天涯海角！</strong>：首个命中的敌人获得“猎杀标记”，队员对其伤害 +15%。</li>
          <li><strong>力挽狂澜</strong>：场上只剩 Haz 时，伤害 +10%、受伤 -10%，并解锁额外技能。</li>
        </ul>
        <h5>主动</h5>
        <ul>
          <li><strong>鱼叉穿刺</strong>（1 步）：前方 1 格造成 20 HP，并回复 10 SP。</li>
          <li><strong>深海猎杀</strong>（2 步）：投出鱼叉链条，3 格内造成 25 HP，将目标拉至身前并 -10 SP。</li>
          <li><strong>猎神之叉</strong>（2 步）：瞬移至 5×5 内目标旁，造成 20 HP（50% 几率 ×2）与 15 SP 伤害，并附加 1 层流血。</li>
          <li><strong>锁链缠绕</strong>（2 步）：两回合内减伤 40%，并令下一次攻击自己的敌人额外受到 10 SP 伤害；全队 +5 SP。</li>
          <li><strong>鲸落</strong>（4 步）：以自身为中心 5×5 造成 50 HP + 20 SP，并使命中目标下回合 -1 步。</li>
        </ul>
        <h5>力挽狂澜后解锁</h5>
        <ul>
          <li><strong>怨念滋生</strong>（1 步）：对所有带猎杀标记的目标施加 1 层流血与恐惧。</li>
          <li><strong>付出代价</strong>（2 步）：连续三段鱼叉连击（15 HP + 5 SP / 15 HP + 5 SP / 15 HP + Haz 流血）。</li>
          <li><strong>仇恨之叉</strong>（2 步）：横扫 2×3 造成 15 HP + 10 SP，并以地面冲击对 5×5 范围造成 20 HP + Haz 流血。</li>
        </ul>
      </article>
      <article>
        <h4>Katz（小 Boss Lv53）</h4>
        <p>HP 500　SP 75（归零后失控 1 回合，步数 -1，随后恢复满 SP）</p>
        <h5>被动</h5>
        <ul>
          <li><strong>隐秘迷恋</strong>：Haz 在场时伤害 +20%，每回合额外 +5 SP。</li>
          <li><strong>恐怖执行力</strong>：每回合命中 ≥2 次时追加一次“矛刺”并使伤害 +30%。</li>
          <li><strong>女强人</strong>：SP ＞ 60 时伤害 +10%。</li>
        </ul>
        <h5>主动</h5>
        <ul>
          <li><strong>矛刺</strong>（1 步）：前方 1 格造成 20 HP，并回复 5 SP。</li>
          <li><strong>链式鞭击</strong>（2 步）：直线 3 格造成 25 HP，下回合目标 -1 步。</li>
          <li><strong>反复鞭尸</strong>（3 步）：前方 3 格造成 10 HP，再次挥击造成 15 HP 并回复 5 SP，可依据 SP 重复至多 5 次。</li>
          <li><strong>终焉礼炮</strong>（4 步）：投出炸弹鱼叉，3×3 范围造成 60 HP + 15 SP，自身下回合 -1 步。</li>
          <li><strong>必须抹杀一切…</strong>（2 步，禁忌技能）：两段鞭击各造成 20 / 30 HP，自损各 5 HP，并依据 SP 重复最多 5 次。</li>
        </ul>
      </article>
      <article>
        <h4>Tusk（小 Boss Lv54）</h4>
        <p>HP 1000　SP 60（归零后失控 1 回合，步数 -1，随后恢复满 SP）</p>
        <h5>被动</h5>
        <ul>
          <li><strong>家人的守护</strong>：Haz 受到伤害时改由 Tusk 承受，并额外减免 50%。</li>
          <li><strong>铁壁如山</strong>：受到的所有伤害 -30%。</li>
          <li><strong>猛牛之力</strong>：每次受伤，下次攻击额外 +5 HP，可叠加。</li>
        </ul>
        <h5>主动</h5>
        <ul>
          <li><strong>骨盾猛击</strong>（1 步）：前方 1 格造成 10 HP 并击退 1 格。</li>
          <li><strong>来自深海的咆哮</strong>（2 步）：3×3 范围造成 20 SP，2 回合内额外减伤 20%。</li>
          <li><strong>牛鲨冲撞</strong>（2 步）：沿 2×3 路径造成 25 HP 并眩晕 1 回合。</li>
          <li><strong>战争堡垒</strong>（3 步）：3 回合减伤 50%，每回合 +10 SP，并令 Haz 伤害 +15%。</li>
          <li><strong>拼尽全力保卫队长…</strong>（2 步，禁忌技能）：3 回合减伤 25% 并反伤 25%，每回合 +10 SP，Haz 回复 15% HP + 15 SP。</li>
        </ul>
      </article>
      <article>
        <h4>Neyla（精英 Lv52）</h4>
        <p>HP 350　SP 80（归零后失控 1 回合，步数 -1，随后恢复满 SP）</p>
        <h5>被动</h5>
        <ul>
          <li><strong>精确瞄准</strong>：回合内未移动则伤害 +50%。</li>
          <li><strong>冷血执行者</strong>：对 HP 低于 50% 的目标造成双倍伤害。</li>
          <li><strong>神速装填</strong>：每 3 回合额外 +10 SP。</li>
        </ul>
        <h5>主动</h5>
        <ul>
          <li><strong>迅捷射击</strong>（1 步）：4 格内造成 15 HP，并使目标 -5 SP。</li>
          <li><strong>穿刺狙击</strong>（2 步）：直线 6 格造成 30 HP，并附加 2 回合流血。</li>
          <li><strong>双钩牵制</strong>（2 步）：4 格内造成 15 HP，使目标下回合 -2 步。</li>
          <li><strong>终末之影</strong>（3 步）：对任意目标造成 50 HP + 20 SP，自身下回合 -1 步。</li>
          <li><strong>执行…</strong>（2 步，禁忌技能）：前方一排两次射击各造成 20 HP；若目标 HP &lt; 15% 直接处决。每次消耗自身 15 HP，第二次额外 -40 SP。</li>
        </ul>
      </article>
      <article>
        <h4>Kyn（精英 Lv51）</h4>
        <p>HP 250　SP 70（归零后失控 1 回合，步数 -1，随后恢复满 SP）</p>
        <h5>被动</h5>
        <ul>
          <li><strong>打道回府</strong>：击杀敌人后，下回合开始瞬移到 Haz 身旁。</li>
          <li><strong>无情暗杀</strong>：若目标 HP 低于 25%，直接处决。</li>
          <li><strong>迅捷如风</strong>：回合开始自动 +5 SP。</li>
        </ul>
        <h5>主动</h5>
        <ul>
          <li><strong>迅影突刺</strong>（1 步）：瞬移至 5×5 内敌人身旁，造成 20 HP。</li>
          <li><strong>割喉飞刃</strong>（2 步）：直线 3 格造成 25 HP + 5 SP 伤害。</li>
          <li><strong>影杀之舞</strong>（2 步）：3×3 范围造成 30 HP，并额外免费移动 1 格。</li>
          <li><strong>死亡宣告</strong>（3 步）：对单体造成 50 HP + 30 SP，目标 HP &lt; 30% 时直接处决。</li>
          <li><strong>自我了断…</strong>（2 步，禁忌技能）：瞬移至 5×5 内任意敌人并将其秒杀，同时自我牺牲。</li>
        </ul>
      </article>
    `,
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
const enemyContent = document.querySelector('.stage-info__enemy-content');
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
  if (enemyContent) {
    enemyContent.innerHTML = data.enemySkills || '';
  }
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
