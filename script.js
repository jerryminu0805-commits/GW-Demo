
const screens = Array.from(document.querySelectorAll('.screen'));
const transition = document.getElementById('transition');
const transitionCircle = transition.querySelector('.transition-circle');
let currentScreen = 'screen-menu';
let pendingScreen = null;
let currentLevelId = null;
let currentCharacterId = null;
const visitedLevels = new Set();

function createVoidArea(cols, rows, region) {
    const cells = [];
    for (let x = region.startX; x < region.startX + region.width && x <= cols; x += 1) {
        for (let y = region.startY; y < region.startY + region.height && y <= rows; y += 1) {
            cells.push({ x, y });
        }
    }
    return cells;
}

const chapterData = [
    { id: 'demo', name: 'Demo', status: '已开放', unlocked: true },
    { id: 'chapter-2', name: 'Chapter 2', status: '锁定', unlocked: false },
    { id: 'chapter-3', name: 'Chapter 3', status: '锁定', unlocked: false },
    { id: 'chapter-4', name: 'Chapter 4', status: '锁定', unlocked: false },
    { id: 'chapter-5', name: 'Chapter 5', status: '锁定', unlocked: false },
    { id: 'chapter-6', name: 'Chapter 6', status: '锁定', unlocked: false },
    { id: 'chapter-7', name: 'Chapter 7', status: '锁定', unlocked: false }
];

const levelData = {
    intro: {
        id: 'intro',
        name: 'Intro',
        description: '地图 7x14\n\nAdora 出现在 (2,4)，Dario 出现在 (2,2)，Karma 出现在 (2,6)。对面有三名刑警队员平行列阵。',
        map: {
            rows: 7,
            cols: 14,
            allies: [
                { x: 2, y: 4, label: 'A' },
                { x: 2, y: 2, label: 'D' },
                { x: 2, y: 6, label: 'K' }
            ],
            enemies: [
                { x: 13, y: 2, label: '警' },
                { x: 13, y: 4, label: '警' },
                { x: 13, y: 6, label: '警' }
            ],
            covers: [],
            voids: []
        },
        enemies: [
            {
                name: '刑警队员',
                icon: '👮',
                meta: '普通 · 等级20 · 占1格',
                passives: [
                    '正义光环：每对方回合，增加自身15HP'
                ],
                skills: [
                    '捅（1步）— 前方一格两段刺击，各造成5点伤害与5点SP伤害',
                    '枪击（1步）— 指定方位一整排造成10点伤害与5点SP伤害',
                    '连续挥刀（2步）— 三段伤害：5、10、10伤害并附加10点SP伤害'
                ]
            }
        ]
    },
    limit: {
        id: 'limit',
        name: '疲惫的极限',
        description: '地图 10x20\n\nAdora (2,4)、Dario (2,2)、Karma (2,6)。Khathia 出现在正对 Adora 的位置。',
        map: {
            rows: 10,
            cols: 20,
            allies: [
                { x: 2, y: 4, label: 'A' },
                { x: 2, y: 2, label: 'D' },
                { x: 2, y: 6, label: 'K' }
            ],
            enemies: [
                { x: 15, y: 4, label: '卡', width: 2, height: 2, category: 'boss' }
            ],
            covers: [],
            voids: []
        },
        enemies: [
            {
                name: 'Khathia/卡西亚-赫雷西第六干部',
                icon: '🩸',
                meta: 'Boss · 等级35 · 占4格',
                passives: [
                    '老干部：每打到敌人回复2点SP',
                    '变态躯体：受到伤害减免×0.75，15%概率免疫伤害',
                    '疲劳的躯体：每5回合减少2步',
                    '糟糕的最初设计：每回合最多移动3格'
                ],
                skills: [
                    '血肉之刃（1步）— 前方2x1横斩造成15点伤害',
                    '怨念之爪（1步）— 前方2x2抓击造成10点伤害与5点SP伤害',
                    '横扫（2步）— 前方4x2横斩造成20点伤害',
                    '痛苦咆哮（2步）— 恢复所有SP',
                    '过多疲劳患者最终的挣扎（3步）— 以自身为中心9x9造成50伤害与70SP伤害'
                ]
            }
        ]
    },
    nanaumi: {
        id: 'nanaumi',
        name: '七海',
        description: '夜幕低垂，海风裹挟着血腥味，从远方破旧的码头吹来……\n\n场景切换：废弃码头。三人组与七海作战队的交锋一触即发。地图 18x22（右下 8x10 区域为空缺）。',
        map: {
            rows: 18,
            cols: 22,
            allies: [
                { x: 3, y: 16, label: 'A' },
                { x: 5, y: 16, label: 'K' },
                { x: 7, y: 16, label: 'D' }
            ],
            enemies: [
                { x: 21, y: 6, label: '哈', category: 'boss' },
                { x: 18, y: 8, label: '塔', width: 1, height: 2, category: 'boss' },
                { x: 19, y: 4, label: '卡', category: 'mini' },
                { x: 15, y: 3, label: '尼', category: 'elite' },
                { x: 15, y: 9, label: '金', category: 'elite' }
            ],
            covers: [
                { from: { x: 2, y: 3 }, to: { x: 4, y: 5 } },
                { from: { x: 2, y: 12 }, to: { x: 5, y: 14 } },
                { from: { x: 10, y: 11 }, to: { x: 12, y: 13 } }
            ],
            voids: createVoidArea(22, 18, { startX: 15, width: 8, startY: 9, height: 10 })
        },
        enemies: [
            {
                name: 'Haz（哈兹）',
                icon: '⚓',
                meta: 'Boss · 七海作战队队长 · 占1格 · 等级55',
                passives: [
                    '弑神执念：HP低于50%时伤害提高30%',
                    '难以抑制的仇恨：40%概率减少敌方5点SP并附加恐惧',
                    '队员们听令！：双数回合开始回复自身10SP并给队员各5SP',
                    '一切牺牲都是值得的：20回合后队员解锁禁忌技能',
                    '他们不是主菜！：1～15回合队员获得暴击Buff',
                    '把他们追杀到天涯海角！：首次命中的敌人被施加猎杀标记',
                    '力挽狂澜：只剩Haz时获得增伤与减伤并解锁额外技能'
                ],
                skills: [
                    '鱼叉穿刺（1步）— 20伤害并回复10SP',
                    '深海猎杀（2步）— 投掷链条造成25伤害，拉近敌人并减少10SP',
                    '猎神之叉（2步）— 瞬移至目标身侧造成20伤害（50%×2伤害）与15SP伤害并附加流血',
                    '锁链缠绕（2步）— 2回合减免40%伤害并反击造成10点SP伤害，队员获5SP',
                    '鲸落（4步）— 5x5范围造成50伤害与20SP伤害并减少目标下一回合步数1',
                    '怨念滋生（1步，力挽狂澜后）— 对猎杀标记目标附加流血与恐惧',
                    '付出代价（2步，力挽狂澜后）— 多段穿刺共造成45伤害并附加5SP伤害与Haz流血',
                    '仇恨之叉（2步，力挽狂澜后）— 横斩与范围冲击造成伤害并附加Haz流血'
                ]
            },
            {
                name: 'Katz（卡兹）',
                icon: '💣',
                meta: '小Boss · 七海作战队伤害代表 · 占1格 · 等级53',
                passives: [
                    '隐秘迷恋：Haz在场时伤害提高20%，每回合额外恢复5SP',
                    '恐怖执行力：每回合命中≥2次时追加矛刺并提高30%伤害',
                    '女强人：SP高于60时伤害提高10%'
                ],
                skills: [
                    '矛刺（1步）— 20伤害并回复5SP',
                    '链式鞭击（2步）— 3格鞭打造成25伤害并减少目标1步',
                    '反复鞭尸（3步）— 连续鞭打，多次造成10/15伤害并回复5SP',
                    '终焉礼炮（4步）— 3x3爆炸造成60伤害并减少15SP，自身下一回合-1步',
                    '必须抹杀一切…（2步，压迫后）— 多段鞭打造成20/30伤害并回复5SP，最高重复5次'
                ]
            },
            {
                name: 'Tusk（塔斯克）',
                icon: '🛡️',
                meta: '小Boss · 七海作战队防御代表 · 占2格 · 等级54',
                passives: [
                    '家人的守护：Haz受伤时转移伤害并免疫其中50%',
                    '铁壁如山：自身受到的伤害降低30%',
                    '猛牛之力：每次受伤后下次攻击额外+5伤害，可叠加'
                ],
                skills: [
                    '骨盾猛击（1步）— 10伤害并击退1格',
                    '来自深海的咆哮（2步）— 周围3x3夺取20SP并额外降伤20%',
                    '牛鲨冲撞（2步）— 2x3冲撞造成25伤害并眩晕1回合',
                    '战争堡垒（3步）— 3回合减免50%伤害并每回合回复10SP，Haz伤害+15%',
                    '拼尽全力保卫队长…（2步，压迫后）— 反伤姿态，减伤25%并反伤25%，每回合回复10SP，同时治疗Haz'
                ]
            },
            {
                name: 'Neyla（尼拉）',
                icon: '🎯',
                meta: '精英 · 七海作战队远程狙击手 · 占1格 · 等级52',
                passives: [
                    '精确瞄准：若回合内未移动，造成伤害提高50%',
                    '冷血执行者：对生命值低于50%的敌人造成双倍伤害',
                    '神速装填：每3回合额外恢复10SP'
                ],
                skills: [
                    '迅捷射击（1步）— 4格内造成15伤害并减少5SP',
                    '穿刺狙击（2步）— 直线6格造成30伤害并附加流血',
                    '双钩牵制（2步）— 4格内造成15伤害并减少2步',
                    '终末之影（3步）— 任意目标造成50伤害与20SP伤害，自身下一回合-1步',
                    '执行…（2步，压迫后）— 两段鱼叉射击各20伤害，低血量目标直接处决'
                ]
            },
            {
                name: 'Kyn（金）',
                icon: '🗡️',
                meta: '精英 · 七海作战队刺客 · 占1格 · 等级51',
                passives: [
                    '打道回府：击杀敌人后下回合开始瞬移至Haz身边',
                    '无情暗杀：敌人生命值低于25%时直接斩杀',
                    '迅捷如风：回合开始自动恢复5SP'
                ],
                skills: [
                    '迅影突刺（1步）— 5x5瞬移至敌人身边造成20伤害',
                    '割喉飞刃（2步）— 直线3格造成25伤害与5SP伤害',
                    '影杀之舞（2步）— 3x3范围造成30伤害后额外移动1格',
                    '死亡宣告（三步）— 单体造成50伤害与30SP伤害，低血量直接斩杀',
                    '自我了断…（2步，压迫后）— 瞬移并秒杀目标，同时牺牲自身全部HP'
                ]
            }
        ]
    }
};

const characterData = [
    {
        id: 'adora',
        name: 'Adora',
        level: 20,
        portrait: 'Adora',
        bio: `名字在西班牙语里意为“崇拜”。Adora 刚出生时家人以为他是女孩，于是给了他一个偏女性化的名字。可在英语里，Adora 也被他理解为与“收养”有关，这也预示了他在九岁时父母双亡的命运。在日语里，名字前半的“Ado”有“喧嚣、骚动”之意，也象征着他在目睹朋友被枪杀后如何化为怪物。
他原本是个快乐的孩子，六岁时结识了两位挚友 Karma 与 Dario。家境并不富裕，但父母把能给的一切都给了这个独生子。九岁生日那天，他执意要去离家不远的游乐园。途中，一名“异端”成员已在街中央暴走，化作巨大、灾厄般、非人的怪物。车辆来不及刹车撞上了它；怪物的尖刺贯穿车体，杀死了 Adora 的父母，也夺走了他的一只眼。怪物受伤后逃逸，几辆警车紧随其后。童年的这场创伤伴随了 Adora 的一生。事发后，他拒绝警方的帮助，径直跑到 Dario 家，看到 Karma 也已经住在那里。
他头发右侧的“腐蚀”来自那场导致父母丧生的事故。
在亲眼看见朋友死在面前之后，他逐渐变成了一个嗜血、失去自我、残暴的怪物；这一过程极其不人道且痛苦。
— 通常穿一件舒适的毛衣
— 深灰色长发一直垂到身体下半部
— 9～15 岁这几年一直处于抑郁状态
— 但成绩始终名列年级前茅
— 各科都很聪明，几乎样样精通，兴趣广泛，包括但不限于技术、游戏、照顾动物等
— 并不喜欢暴力，但必要时会致命
— 小时候（6 岁）喜欢戴帽子；异端事件（9 岁）后几乎从不摘下
— 有点懒
— 偶尔有些孩子气
— 多数时候试图劝两位朋友少些暴力
— 力量与速度都不算强，不喜欢运动或任何需要剧烈活动的事
— 不太喜欢出门
— 9 岁后一直戴着眼罩，直到 16 岁才摘下；左眼变成了十字形，他觉得不好看，于是在左眼上加了一枚钉子，贯穿左眼与头部
— 16 岁后开始变得更开心，也许是这些年朋友持续安慰与陪伴的缘故？
— 喜欢喝汽水
— 现年龄：18
— 身高：169 厘米
— 生日：8 月 4 日
— 真心信任、热爱并珍惜这个三人组`,
        skills: `Adora（占1格）（初始等级20）：\nHp：100\nSP：100（到0会丧失控制权一回合以及减少一步，然后自动恢复50%）\n技能：\n被动：背刺 — 如果攻击到敌方单位的背后造成伤害×1.5\n被动：冷静分析 — 如果该回合没有任何动作则恢复10点SP\n被动：啊啊啊你们没事吧？！ — 若6x6范围内有友军（不包括自己），回复5%HP与5SP\n被动：对战斗的恐惧 — SP低于10时伤害×1.5\n20级解锁：\n短匕轻挥！（绿色/1步）— 前方一格造成10点伤害与5点精神伤害（80%出现率）\n枪击（灰色/1步）— 若携带手枪，对指定方向整排造成10伤害与5点精神伤害（65%出现率）\n呀！你不要靠近我呀！！（蓝色/2步）— 可选四周任意5格，若敌方HP低于50%追击一次“短匕轻挥！”（40%出现率）\n自制粉色迷你电击装置！（红色/3步）— 前方2格造成10伤害与15点精神伤害并麻痹（减步数）（30%出现率）\n25级解锁：\n略懂的医术！（粉色/2步）— 5x5内治疗友军20HP与15SP并附加“恢复”Buff（30%出现率）\n加油哇！（橘色/4步）— 5x5内赋予“鸡血”Buff（20%出现率）\n35级解锁：\n只能靠你了。。（橘色/4步）— 牺牲25HP，为友军施加“依赖”Buff（15%出现率）`
    },
    {
        id: 'karma',
        name: 'Karma',
        level: 20,
        portrait: 'Karma',
        bio: `名字意为“命运、天意、行动”，象征着他的所作所为最终导向了不可避免的致命结局。
自出生起就和 Dario 是朋友，幼儿园时结识了 Adora。看到 Adora 总是一个人，他便主动上前结交。他与父母关系不好，家里常年争吵。9 岁那年，母亲与父亲争执后把怒气发泄在 Karma 身上。Karma 无法继续忍受这种令人窒息的氛围，搬去了 Dario 家。
— 平时穿衬衫配黑裤
— 手掌很大
— 栗红色头发，长度不算长
— 在校时成绩常年垫底，不擅长需要动脑的事情
— 喜好暴力，但在 Adora 的长期劝导下学会了更多克制
— 常常不经思考就先行动
— 自出生起头后方就有一个巨大的红色“†”印记
— 曾沉迷电子游戏，但被 Adora 教训后弃坑
— 童年并不正常，因此性格略显扭曲
— 18 岁以后与 Dario 开始增加违法活动；Adora 不赞同但最终加入
— 力大到几拳就能砸倒一棵树；保持学校约三分之二的体育纪录
— 喜欢能量饮料和酒精
— 过去抽烟，因 Adora 受不了二手烟改用电子烟
— 爱吃肉
— 幼儿园时就暗恋 Adora，当时并不知道他是男生
— 现年龄：19
— 身高：189 厘米
— 生日：4 月 14 日
— 真心信任、热爱并珍惜这个三人组`,
        skills: `Karma（占1格）（初始等级20）：\nHp：200\nSP：50（到0会丧失控制权一回合并减少一步且扣除20HP，之后恢复50%SP）\n技能：\n被动：暴力瘾 — 每连续攻击一次伤害×1.5，连续3次追加“沙包大的拳头”，超过4次消耗5SP\n被动：强悍的肉体 — 受到的伤害减免×0.75\n被动：自尊心 — 根据失去的HP增加伤害（1%HP=0.5%伤害）\n20级解锁：\n沙包大的拳头（绿色/1步）— 15点伤害（80%出现率）\n枪击（灰色/1步）— 若携带手枪，对指定方向整排造成10伤害与5点精神伤害（65%出现率）\n都听你的（蓝色/2步）— 可选择四周任意3步并回复5SP（40%出现率）\n嗜血之握（红色/3步）— 连续使用四次拳后处决非Boss/小Boss/精英（不同伤害阈值）（30%出现率）\n25级解锁：\n深呼吸（白色/2步）— 主动恢复全部SP与10HP；若未入池则被动+10%伤害（20%出现率）`
    },
    {
        id: 'dario',
        name: 'Dario',
        level: 20,
        portrait: 'Dario',
        bio: `名字意为“财富、富有、更多的钱”，象征着他当下的经济水平。
他一直不喜欢自己的名字——先是觉得听起来难听，其次这是父母起的名字，而父母在他 6 岁时就消失了，只留下豪宅、汽车与大笔金钱。他从不需要为账单发愁，也不知道父母为何留下这些财产。三人常在他的豪宅周围活动，并把那里定为据点。
— 平时穿正式衬衫配黑裤，头上别着夸张的美元符号发夹
— 左手因煤气罐事故毁掉，换成细长黑色机械手臂
— 在校成绩略低于平均
— 强壮敏捷但不及 Karma，保持学校约三分之一体育纪录
— 热爱暴力，认为“暴力就是艺术”
— 总挂着轻松笑容，露出价值堪比半辆车的金牙
— 浅棕色头发，常扎成马尾
— 以财富为傲，容易感到无聊，因此参与非法活动
— 真正感到快乐的时候很少
— 喜欢抽烟与喝酒，但最爱喝茶
— 喜欢打扮得体，性格略显抽象
— 现年龄：19
— 身高：187 厘米
— 生日：5 月 24 日
— 真心信任、热爱并珍惜这个三人组`,
        skills: `Dario（占1格）（初始等级20）：\nHp：150\nSP：100（到0会丧失控制权一回合并减少一步，随后恢复75%SP）\n技能：\n被动：快速调整 — 混乱后额外恢复25%SP\n被动：反击 — 受到伤害有50%概率以“机械爪击”反击\n被动：士气鼓舞 — 每5回合为所有友军增加15SP\n20级解锁：\n机械爪击（绿色/1步）— 前方两格15伤害（15%概率眩晕）（80%出现率）\n枪击（灰色/1步）— 若携带手枪，对指定方向整排造成10伤害与5点精神伤害（65%出现率）\n迅捷步伐（蓝色/2步）— 可选择四周任意4步并降低最近敌人5SP（40%出现率）\n拿来吧你！（红色/3步）— 指定方向首个非Boss造成20伤害并拉至身前眩晕并降低15SP，对Boss仅施加眩晕与SP伤害（30%出现率）\n25级解锁：\n先苦后甜（橘色/4步）— 下一回合额外+4步（技能池仅能存在一张）（15%出现率）`
    }
];

const tutorialContent = {
    overview: `- Hp/Sp\n  - Hp 到 0 等于死亡\n  - Sp 到 0 会给该单位上一层眩晕 Buff 以及减一步，在眩晕结束后恢复些许 Sp（每个单位不同）\n- 步数\n  - 双方从 3 步开始，每回合增加 1 步\n  - 平均等级更高的一方每回合额外获得 2 步\n  - 步数决定行动与技能消耗，最高 10 步（除非受加减步技能影响）\n- 回合\n  - 我方行动完 + 敌方行动完 = 1 回合\n- 掩体\n  - 非 AOE 技能无法穿透掩体，且无法进入`,
    skills: `- 技能颜色\n  - 绿色（1步）— 普通攻击\n  - 蓝色（2步）— 移动技能\n  - 红色（3步以上）— 大招\n  - 白色（不一定）— 自带被动的技能\n  - 粉色（2步以上）— 普通增益技能\n  - 橘色（2步以上）— 特异增益功能\n- 多阶段攻击：单个技能分段造成伤害，可包含特殊效果或不同范围\n- 被动：无需主动发动`,
    effects: `- 流血：每回合减少5%血量，持续2回合，可叠加\n- 眩晕层数：可叠加，无额外效果\n- 眩晕 Debuff：到所需层数后失去行动1回合并消耗一层眩晕 Debuff\n- 恐惧：下回合减一步，可叠加\n- 鸡血：下一次攻击伤害双倍并消耗一层（每单位最多1层，若多阶段则作用于最后一段）\n- 依赖：下一次攻击造成真实伤害并将自身SP降为0，每单位最多1层\n- “恢复” Buff：下一大回合开始时恢复5HP并消耗一层，每大回合仅消耗一层，可叠加`,
    enemies: `- 普通：无特殊效果\n- 高级：暂无\n- 精英：秒杀技能仅造成100HP，需叠2层眩晕才会附加眩晕 Debuff\n- 小Boss：秒杀技能仅造成80HP，需叠3层眩晕才会附加眩晕 Debuff，无法被强制移动\n- Boss：秒杀技能仅造成75HP，需叠4层眩晕才会附加眩晕 Debuff，无法被强制移动\n- 特殊：？？？`
};

const screensMap = new Map(screens.map((screen) => [screen.id, screen]));

function showScreen(screenId) {
    screens.forEach((screen) => {
        screen.classList.toggle('active', screen.id === screenId);
    });
    currentScreen = screenId;
}

function triggerTransition(nextScreenId) {
    if (currentScreen === nextScreenId) return;
    pendingScreen = nextScreenId;
    transition.classList.remove('active-cover', 'active-reveal');
    void transition.offsetWidth;
    transition.classList.add('active-cover');
}

transitionCircle.addEventListener('animationend', (event) => {
    if (event.animationName === 'cover' && pendingScreen) {
        showScreen(pendingScreen);
        transition.classList.remove('active-cover');
        void transition.offsetWidth;
        transition.classList.add('active-reveal');
    } else if (event.animationName === 'reveal') {
        transition.classList.remove('active-reveal');
        pendingScreen = null;
    }
});

function renderChapters() {
    const container = document.getElementById('chapter-list');
    container.innerHTML = '';
    chapterData.forEach((chapter, index) => {
        const card = document.createElement('div');
        card.className = 'chapter-card';
        card.dataset.chapter = chapter.id;
        card.innerHTML = `
            <div class="chapter-name">${chapter.name}</div>
            <div class="chapter-status">${chapter.unlocked ? '可进入' : '锁定'}</div>
            <div class="chapter-index">${String(index + 1).padStart(2, '0')}</div>
        `;
        if (chapter.unlocked) {
            card.classList.add('unlocked');
            card.addEventListener('click', () => {
                triggerTransition('screen-levels');
            });
        }
        container.appendChild(card);
    });
}

function renderLevels() {
    const list = document.getElementById('level-list');
    list.innerHTML = '';
    Object.values(levelData).forEach((level, index) => {
        const item = document.createElement('div');
        item.className = 'level-item';
        item.dataset.level = level.id;
        item.innerHTML = `<div class="level-name">${level.name}</div>`;
        item.addEventListener('click', () => selectLevel(level.id));
        if (index === 0) {
            item.classList.add('active');
            currentLevelId = level.id;
        }
        list.appendChild(item);
    });
    selectLevel(currentLevelId || Object.keys(levelData)[0]);
}

function selectLevel(levelId) {
    currentLevelId = levelId;
    document.querySelectorAll('.level-item').forEach((item) => {
        item.classList.toggle('active', item.dataset.level === levelId);
    });
    const level = levelData[levelId];
    document.getElementById('level-description').textContent = level.description;
    renderMap(level.map);
    renderEnemies(level.enemies, visitedLevels.has(levelId));
}

function renderMap(map) {
    const container = document.getElementById('map-container');
    container.innerHTML = '';
    const grid = document.createElement('div');
    grid.className = 'map-grid';
    grid.style.gridTemplateColumns = `repeat(${map.cols}, 28px)`;
    grid.style.gridTemplateRows = `repeat(${map.rows}, 28px)`;

    const cellMap = new Map();

    const addUnit = (unit, type) => {
        const width = unit.width || unit.size || 1;
        const height = unit.height || 1;
        for (let dx = 0; dx < width; dx += 1) {
            for (let dy = 0; dy < height; dy += 1) {
                const key = `${unit.x + dx}-${unit.y + dy}`;
                cellMap.set(key, { label: unit.label, type });
            }
        }
    };

    (map.allies || []).forEach((unit) => addUnit(unit, 'ally'));
    (map.enemies || []).forEach((unit) => {
        const type = unit.category === 'boss' ? 'boss' : 'enemy';
        addUnit(unit, type);
    });

    const coverCells = new Set();
    (map.covers || []).forEach((cover) => {
        for (let x = cover.from.x; x <= cover.to.x; x += 1) {
            for (let y = cover.from.y; y <= cover.to.y; y += 1) {
                coverCells.add(`${x}-${y}`);
            }
        }
    });

    const voidCells = new Set((map.voids || []).map((cell) => `${cell.x}-${cell.y}`));

    for (let row = 1; row <= map.rows; row += 1) {
        for (let col = 1; col <= map.cols; col += 1) {
            const cell = document.createElement('div');
            cell.className = 'map-cell';
            const key = `${col}-${row}`;
            if (cellMap.has(key)) {
                const info = cellMap.get(key);
                cell.classList.add(info.type);
                cell.textContent = info.label;
            } else if (coverCells.has(key)) {
                cell.classList.add('cover');
            } else if (voidCells.has(key)) {
                cell.classList.add('void');
            }
            grid.appendChild(cell);
        }
    }
    container.appendChild(grid);
}

function renderEnemies(enemies, unlocked) {
    const list = document.getElementById('enemy-list');
    list.innerHTML = '';
    enemies.forEach((enemy) => {
        const card = document.createElement('div');
        card.className = 'enemy-card';
        card.innerHTML = `
            <div class="enemy-header">
                <div class="enemy-icon">${enemy.icon}</div>
                <div>
                    <div class="enemy-name">${enemy.name}</div>
                    <div class="enemy-meta">${enemy.meta}</div>
                </div>
            </div>
        `;
        const passives = document.createElement('div');
        passives.className = 'enemy-passives';
        passives.innerHTML = `<strong>被动技能：</strong><br>${enemy.passives.map((p) => `• ${p}`).join('<br>')}`;
        card.appendChild(passives);

        const skills = document.createElement('div');
        skills.className = 'enemy-skills';
        if (!unlocked) {
            skills.classList.add('locked');
        } else {
            skills.innerHTML = `<strong>主动技能：</strong><br>${enemy.skills.map((s) => `• ${s}`).join('<br>')}`;
        }
        card.appendChild(skills);
        list.appendChild(card);
    });
}

function renderCharacters() {
    const selector = document.getElementById('character-selector');
    selector.innerHTML = '';
    characterData.forEach((character, index) => {
        const pill = document.createElement('div');
        pill.className = 'character-pill';
        pill.dataset.character = character.id;
        pill.textContent = character.name;
        pill.addEventListener('click', () => selectCharacter(character.id));
        if (index === 0) {
            pill.classList.add('active');
            currentCharacterId = character.id;
        }
        selector.appendChild(pill);
    });
    selectCharacter(currentCharacterId || characterData[0].id);
}

function selectCharacter(characterId) {
    currentCharacterId = characterId;
    document.querySelectorAll('.character-pill').forEach((pill) => {
        pill.classList.toggle('active', pill.dataset.character === characterId);
    });
    const character = characterData.find((item) => item.id === characterId);
    document.getElementById('character-portrait').textContent = character.portrait;
    document.getElementById('character-level').textContent = `Lv.${character.level}`;
    updateCharacterDetails();
}

function updateCharacterDetails() {
    const activeTab = document.querySelector('.character-tab.active').dataset.tab;
    const character = characterData.find((item) => item.id === currentCharacterId);
    const container = document.getElementById('character-details');
    container.textContent = activeTab === 'bio' ? character.bio : character.skills;
}

function renderTutorial(tabId = 'overview') {
    const container = document.getElementById('tutorial-content');
    const content = tutorialContent[tabId] || '';
    container.innerHTML = content
        .split('\n')
        .map((line) => {
            if (line.startsWith('- ')) {
                return `<div>• ${line.slice(2)}</div>`;
            }
            if (line.trim().startsWith('- ')) {
                return `<div style="margin-left:1.2rem">${line.trim()}</div>`;
            }
            if (line.trim().startsWith('  - ')) {
                return `<div style=\"margin-left:1.6rem\">${line.trim().slice(4)}</div>`;
            }
            return `<div>${line}</div>`;
        })
        .join('');
}

document.querySelectorAll('.menu-button').forEach((button) => {
    button.addEventListener('click', () => {
        const action = button.dataset.action;
        if (action === 'start') {
            triggerTransition('screen-chapters');
        } else if (action === 'settings') {
            document.getElementById('settings-panel').classList.remove('hidden');
        } else if (action === 'tutorial') {
            triggerTransition('screen-tutorial');
        } else if (action === 'exit') {
            document.getElementById('exit-panel').classList.remove('hidden');
        }
    });
});

document.querySelectorAll('.back-button').forEach((button) => {
    button.addEventListener('click', () => {
        const action = button.dataset.action;
        if (action === 'back-to-menu') {
            triggerTransition('screen-menu');
        } else if (action === 'back-to-chapters') {
            triggerTransition('screen-chapters');
        } else if (action === 'back-to-levels') {
            triggerTransition('screen-levels');
        }
    });
});

document.querySelector('[data-action="open-characters"]').addEventListener('click', () => {
    triggerTransition('screen-characters');
});

document.querySelectorAll('.panel-close').forEach((button) => {
    button.addEventListener('click', () => {
        button.closest('.panel').classList.add('hidden');
    });
});

document.getElementById('enter-button').addEventListener('click', () => {
    if (!currentLevelId) return;
    visitedLevels.add(currentLevelId);
    renderEnemies(levelData[currentLevelId].enemies, true);
    const button = document.getElementById('enter-button');
    button.textContent = '已记录情报';
    setTimeout(() => {
        button.textContent = '进入关卡';
    }, 1800);
});

document.querySelectorAll('.character-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
        if (tab.classList.contains('active')) return;
        document.querySelectorAll('.character-tab').forEach((item) => item.classList.remove('active'));
        tab.classList.add('active');
        updateCharacterDetails();
    });
});

document.querySelectorAll('.tutorial-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.tutorial-tab').forEach((item) => item.classList.remove('active'));
        tab.classList.add('active');
        renderTutorial(tab.dataset.tab);
    });
});

renderChapters();
renderLevels();
renderCharacters();
renderTutorial();

window.addEventListener('load', () => {
    transition.classList.remove('active-reveal');
});
