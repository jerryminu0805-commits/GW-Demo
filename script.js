const screens = Array.from(document.querySelectorAll('.screen'));
const mask = document.querySelector('.transition-mask');
const toast = document.querySelector('.toast');
let currentScreen = 'menu';
let maskBusy = false;

const stageDetails = {
  intro: `
    <h3>Intro</h3>
    <p>示范章节的开端。为玩家铺垫世界观与操作，包含低威胁遭遇、基础掩体运用与步数管理教学。</p>
    <ul>
      <li>推荐队伍：Adora / Karma / Dario。</li>
      <li>胜利条件：击败所有异端侦察兵。</li>
      <li>提示：利用掩体吸收普通攻击，逐步熟悉 SP 与步数的消耗节奏。</li>
    </ul>
  `,
  limit: `
    <h3>疲惫的极限</h3>
    <p>持续作战对队伍造成的精神消耗开始显现，考验玩家在负面状态与资源短缺中的调度能力。</p>
    <ul>
      <li>环境效果：所有单位每 2 回合额外损失 5 点 SP。</li>
      <li>新增敌人：持盾的狂信徒，可在掩体后施放穿刺。</li>
      <li>提示：合理安排粉色与橘色增益技能，避免进入眩晕循环。</li>
    </ul>
  `,
  'seven-seas': `
    <h3>七海</h3>
    <p>夜幕低垂，海风裹挟着血腥味，从废弃码头吹来。这里是与七海作战队的首次交锋。</p>
    <section>
      <h4>序幕</h4>
      <p>刑警队长的情报指向七海作战队——唯一一支不受政府调度的部队。三人组抵达破旧码头，迎接他们的，是浑身浴血的队长 Haz 与他的队伍。</p>
    </section>
    <section>
      <h4>地图情报</h4>
      <ul>
        <li>尺寸：18 × 22 格，右下存在 8 × 10 的缺口。</li>
        <li>掩体：
          <ul>
            <li>(2,3)-(4,5) 正方形，阻挡所有非范围伤害。</li>
            <li>(2,12)-(5,14) 长方形，阻挡长度超过 1 格的攻击。</li>
            <li>(10,11)-(12,13) 正方形，同样阻挡长度超过 1 格的攻击。</li>
          </ul>
        </li>
        <li>初始站位：Karma (3,2)、Dario (5,2)、Adora (7,2)。</li>
        <li>敌军：Haz、Tusk、Katz、Neyla、Kyn，全部带有“作战余波” Debuff（-25% HP，伤害 -5）。</li>
      </ul>
    </section>
    <section>
      <h4>敌方概览</h4>
      <p><strong>Haz（Boss）</strong>——Lv55，HP 750 / SP 100。被动“弑神执念”“难以抑制的仇恨”等让他在 50% HP 以下进入高爆发状态，并能为队友恢复 SP。开启“力挽狂澜”后将获得全新的猎杀技能组合。</p>
      <p><strong>Katz（小 Boss）</strong>——Lv53，HP 500 / SP 75。擅长多段鞭击，随着“队长的压迫”转为高风险的自损技能“必须抹杀一切…”。</p>
      <p><strong>Tusk（小 Boss）</strong>——Lv54，HP 1000 / SP 60。兼具分摊与减伤能力，必要时以“拼尽全力保卫队长……”为 Haz 回复生命与 SP。</p>
      <p><strong>Neyla（精英）</strong>——Lv52，HP 350 / SP 80。静止射击时伤害翻倍，获得“队长的压迫”后会以“终末之影”覆盖战场，随后进入处决模式“执行…”。</p>
      <p><strong>Kyn（精英）</strong>——Lv51，HP 250 / SP 70。擅长瞬移与处决，触发“自我了断……”时可换取敌我同归的秒杀。</p>
    </section>
    <section>
      <h4>战术提示</h4>
      <ul>
        <li>优先控制 Neyla 与 Kyn，避免队伍在中后期遭到远程处决。</li>
        <li>监控 Haz 的猎杀标记，防止被集火。</li>
        <li>借助掩体限制 Tusk 的冲撞路线，等待其技能冷却后集中火力。</li>
      </ul>
    </section>
  `,
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

const stageButtons = Array.from(document.querySelectorAll('.stage'));
const detailsPanel = document.querySelector('.stage__details');
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

function setStageDetail(stageKey) {
  detailsPanel.innerHTML = stageDetails[stageKey] || '';
}

function setActiveStage(stageKey) {
  stageButtons.forEach((button) => {
    const isActive = button.dataset.stage === stageKey;
    button.classList.toggle('is-active', isActive);
    button.setAttribute('aria-pressed', isActive.toString());
  });
  setStageDetail(stageKey);
}

stageButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const key = button.dataset.stage;
    setActiveStage(key);
  });
});

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
  'open-characters': () => transitionToScreen('characters'),
  'back-to-chapters': () => transitionToScreen('chapters'),
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
  const stage = document.querySelector('.stage--seven-seas');
  if (!stage) return;
  for (let i = 0; i < 3; i += 1) {
    const particle = document.createElement('span');
    particle.classList.add('particle');
    stage.appendChild(particle);
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
