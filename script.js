// 2D 回合制 RPG Demo - 七海作战队Boss战
// 变更摘要：
// - 注入基础栅格/单位样式与 --cell 默认值，修复“又没角色了”（无 CSS 时看不到格子/单位）。
// - AI：加入 BFS 寻路与兜底移动，避免整轮只动队长或卡住不用完步数。
// - 多阶段技能：每一阶段即时演出与结算（青→红→结算→黄阶段标记）。
// - Adora：略懂的医术！；电击装置会叠1层眩晕叠层与恐惧减步。
// - Karma：深呼吸 被动+10% 只要卡在池里未被使用，主动用为回蓝+10HP。
// - UI：新增 Full Screen（全屏）按钮，支持原生全屏与模拟全屏双方案；修复 2x2 单位（Tusk）初始可能不在视区的覆盖刷新。
// - GOD’S WILL：增强健壮性（按钮/菜单/点击单位三路触发），并在全屏/窗口变化后稳定可用。
// - Neyla：压迫后“终末之影”规则：每回合保证手牌至多一张；如无且卡满则随机替换一张为“终末之影”。
// - 调整：双钩牵制 → Neyla 常态技能（2步，红，前3格内优先最近，单体）；终焉礼炮不再标注为压迫技能（常态/压迫均可用）。
// - 调整：Katz「反复鞭尸」→ 3步 前3格AOE，10/15伤害+每段+5SP，按自身SP百分比重复（最多5次），出现率50%，压迫后不再出现。
// - 调整：Neyla 常态也可抽到「终末之影」（30%）。
// - 调整：Kyn「影杀之舞」→ 常态2步 3x3 AOE 30伤害（不受掩体）并立即免费位移1格（50%），压迫后不再出现；压迫后新增「自我了断。。」。
// - 状态栏：被“猎杀标记”的单位在 Debuff 栏显示“猎杀标记”。
// - 修复：Tusk（2x2）被点击锁定时，技能指向将智能映射到其四个覆盖格之一，避免“进入姿态后无法被选中/命中”（具体逻辑在 part2 的 overlay 点击处理）。
// - 新增保证：在“敌方回合结束，玩家回合开始”之前，敌方必定把步数用到 0（若无技能则自动向玩家单位逼近），详见 part2 的 exhaustEnemySteps 与 finishEnemyTurn 逻辑。

let ROWS = 18;
let COLS = 22;

const CELL_SIZE = 56;
const GRID_GAP = 6;
const BOARD_PADDING = 8;
const BOARD_BORDER = 1;
const BOARD_WIDTH = COLS * CELL_SIZE + (COLS - 1) * GRID_GAP + (BOARD_PADDING + BOARD_BORDER) * 2;
const BOARD_HEIGHT = ROWS * CELL_SIZE + (ROWS - 1) * GRID_GAP + (BOARD_PADDING + BOARD_BORDER) * 2;
const MAX_STEPS = 10;
const BASE_START_STEPS = 3;
const SKILLPOOL_MAX = 13;
const START_HAND_COUNT = 3;

const ENEMY_IS_AI_CONTROLLED = true;
const ENEMY_WINDUP_MS = 850;

// Telegraph/Impact Durations
const TELEGRAPH_MS = 520;
const IMPACT_MS    = 360;
const STAGE_MS     = 360;

const DEBUG_AI = false;
function aiLog(u,msg){ if(DEBUG_AI) appendLog(`[AI] ${u.name}: ${msg}`); }

const inventory = { pistol: false };

let roundsPassed = 0;
function computeBaseSteps(){ return Math.min(BASE_START_STEPS + roundsPassed, MAX_STEPS); }

let playerSteps = computeBaseSteps();
let enemySteps = computeBaseSteps();
let currentSide = 'player';

let selectedUnitId = null;
let highlighted = new Set();
let logEl;

let _skillSelection = null;
let fxLayer = null;
let cameraEl = null;
let battleAreaEl = null;
let mapPaneEl = null;
let cameraControlsEl = null;
let roundBannerEl = null;
let introDialogEl = null;

let playerStepsEl, enemyStepsEl, roundCountEl, partyStatus, selectedInfo, skillPool, accomplish, damageSummary;

let hazMarkedTargetId = null;

let interactionLocked = false;
let introPlayed = false;
let cameraResetTimer = null;
let enemyActionCameraLock = false;
let cameraLoopHandle = null;
let cameraDragState = null;
let cameraInputsRegistered = false;

const cameraState = {
  x: 0,
  y: 0,
  scale: 1,
  targetX: 0,
  targetY: 0,
  targetScale: 1,
  vx: 0,
  vy: 0,
  vs: 0,
  baseScale: 1,
  minScale: 0.6,
  maxScale: 1.6,
};

// GOD'S WILL
let godsWillArmed = false;
let godsWillMenuEl = null;
let godsWillBtn = null;

// Fullscreen
let fsBtn = null;
let isSimFullscreen = false;

// AI Watchdog
let aiLoopToken = 0;
let aiWatchdogTimer = null;
function armAIWatchdog(token, ms=12000){
  if(aiWatchdogTimer) clearTimeout(aiWatchdogTimer);
  aiWatchdogTimer = setTimeout(()=>{
    if(token === aiLoopToken && currentSide === 'enemy'){
      appendLog('AI 看门狗触发：强制结束敌方回合');
      enemySteps = 0; updateStepsUI();
      finishEnemyTurn();
    }
  }, ms);
}
function clearAIWatchdog(){ if(aiWatchdogTimer){ clearTimeout(aiWatchdogTimer); aiWatchdogTimer=null; } }

// —— 地图/掩体 ——
function toRC_FromBottomLeft(x, y){ const c = x + 1; const r = ROWS - y; return { r, c }; }
function isVoidCell(r,c){
  const voidRStart = ROWS - 8 + 1; // 11
  const voidCStart = COLS - 10 + 1; // 13
  return (r >= voidRStart && c >= voidCStart);
}
const coverCells = new Set();
function addCoverRectBL(x1,y1,x2,y2){
  const xmin = Math.min(x1,x2), xmax = Math.max(x1,x2);
  const ymin = Math.min(y1,y2), ymax = Math.max(y1,y2);
  for(let x=xmin; x<=xmax; x++){
    for(let y=ymin; y<=ymax; y++){
      const {r,c} = toRC_FromBottomLeft(x,y);
      if(r>=1 && r<=ROWS && c>=1 && c<=COLS && !isVoidCell(r,c)){
        coverCells.add(`${r},${c}`);
      }
    }
  }
}
function isCoverCell(r,c){ return coverCells.has(`${r},${c}`); }
function clampCell(r,c){ return r>=1 && r<=ROWS && c>=1 && c<=COLS && !isVoidCell(r,c) && !isCoverCell(r,c); }

// —— 单位 ——
function createUnit(id, name, side, level, r, c, maxHp, maxSp, restoreOnZeroPct, spZeroHpPenalty=0, passives=[], extra={}){
  return {
    id, name, side, level, r, c,
    size: extra.size || 1,
    hp: maxHp, maxHp,
    sp: maxSp, maxSp,
    restoreOnZeroPct, spZeroHpPenalty,
    facing: side==='player' ? 'right' : 'left',
    status: {
      stunned: 0,
      paralyzed: 0,
      bleed: 0,
      hazBleedTurns: 0,
      recoverStacks: 0,          // “恢复”Buff 层数（每大回合开始消耗一层，+5HP）
    },
    dmgDone: 0,
    skillPool: [],
    passives: passives.slice(),
    actionsThisTurn: 0,
    consecAttacks: 0,
    turnsStarted: 0,
    dealtStart: false,
    team: extra.team || null,
    oppression: false,
    chainShieldTurns: 0,
    chainShieldRetaliate: 0,
    tuskRageStacks: 0,
    stunThreshold: extra.stunThreshold || 1,
    _staggerStacks: 0,
    pullImmune: !!extra.pullImmune,
    _spBroken: false,
    spPendingRestore: null,
    _comeback: false,

    // 姿态系统（Tusk等）
    _stanceType: null,        // 'defense' | 'retaliate' | null
    _stanceTurns: 0,
    _stanceDmgRed: 0,         // 0.5 表示50%减伤
    _stanceSpPerTurn: 0,
    _reflectPct: 0,           // 0.3 表示反弹30%受到的HP伤害

    _fortressTurns: 0, // 兼容旧逻辑（已由姿态系统替代）
  };
}
const units = {};
// 玩家
units['adora'] = createUnit('adora','Adora','player',52, 17, 2, 100,100, 0.5,0, ['backstab','calmAnalysis','proximityHeal','fearBuff']);
units['dario'] = createUnit('dario','Dario','player',52, 17, 6, 150,100, 0.75,0, ['quickAdjust','counter','moraleBoost']);
units['karma'] = createUnit('karma','Karma','player',52, 17, 4, 200,50, 0.5,20, ['violentAddiction','toughBody','pride']);
// 七海
function applyAftermath(u){ u.hp = Math.max(1, Math.floor(u.hp * 0.75)); if(!u.passives.includes('aftermath')) u.passives.push('aftermath'); }
units['haz']  = createUnit('haz','Haz','enemy',55, 4,21, 750,100, 1.0,0, ['hazObsess','hazHatred','hazOrders','hazWorth','hazCritWindow','hazHunt'], {team:'seven', stunThreshold:4, pullImmune:true}); applyAftermath(units['haz']);
units['katz'] = createUnit('katz','Katz','enemy',53, 3,19, 500,75, 1.0,0, ['katzHidden','katzExecution','katzStrong'], {team:'seven', stunThreshold:3, pullImmune:true}); applyAftermath(units['katz']);
units['tusk'] = createUnit('tusk','Tusk','enemy',54, 6,19, 1000,60, 1.0,0, ['tuskGuard','tuskWall','tuskBull'], {team:'seven', size:2, stunThreshold:3, pullImmune:true}); applyAftermath(units['tusk']);
units['neyla']= createUnit('neyla','Neyla','enemy',52, 2,15, 350,80, 1.0,0, ['neylaAim','neylaCold','neylaReload'], {team:'seven', stunThreshold:2}); applyAftermath(units['neyla']);
units['kyn']  = createUnit('kyn','Kyn','enemy',51, 7,15, 250,70, 1.0,0, ['kynReturn','kynExecute','kynSwift'], {team:'seven', stunThreshold:2}); applyAftermath(units['kyn']);

// —— 范围/工具 ——
const DIRS = { up:{dr:-1,dc:0}, down:{dr:1,dc:0}, left:{dr:0,dc:-1}, right:{dr:0,dc:1} };
function mdist(a,b){ return Math.abs(a.r-b.r)+Math.abs(a.c-b.c); }
function cardinalDirFromDelta(dr,dc){ if(Math.abs(dr)>=Math.abs(dc)) return dr<=0?'up':'down'; return dc<=0?'left':'right'; }
function clampValue(value, min, max){ return Math.max(min, Math.min(max, value)); }
function forwardCellAt(u, dir, dist){
  const d=DIRS[dir]; const r=u.r + d.dr*dist, c=u.c + d.dc*dist;
  if(u.size===2){ if(clampCell(r,c) && clampCell(r+1,c+1)) return {r,c}; return null; }
  if(clampCell(r,c)) return {r,c};
  return null;
}
function forwardLineAt(u, dir){
  const arr=[]; const d=DIRS[dir]; let r=u.r+d.dr, c=u.c+d.dc;
  while(true){
    if(u.size===2){ if(!(clampCell(r,c) && clampCell(r+1,c+1))) break; }
    else if(!clampCell(r,c)) break;
    arr.push({r,c}); r+=d.dr; c+=d.dc;
  }
  return arr;
}
function range_adjacent(u){
  const res=[];
  if(u.size===2){
    const cand = [
      {r:u.r-1, c:u.c}, {r:u.r-1, c:u.c+1},
      {r:u.r+2, c:u.c}, {r:u.r+2, c:u.c+1},
      {r:u.r, c:u.c-1}, {r:u.r+1, c:u.c-1},
      {r:u.r, c:u.c+2}, {r:u.r+1, c:u.c+2},
    ];
    for(const p of cand){ if(clampCell(p.r,p.c)) res.push({...p, dir: cardinalDirFromDelta(p.r-u.r, p.c-u.c)}); }
  } else {
    for(const k in DIRS){ const d=DIRS[k]; const r=u.r+d.dr, c=u.c+d.dc; if(clampCell(r,c)) res.push({r,c,dir:k}); }
  }
  return res;
}
function range_forward_n(u,n, aimDir){ const dir=aimDir||u.facing; const arr=[]; for(let i=1;i<=n;i++){ const c=forwardCellAt(u,dir,i); if(c) arr.push({r:c.r,c:c.c,dir}); } return arr; }
function range_line(u, aimDir){ const dir=aimDir||u.facing; return forwardLineAt(u,dir).map(p=>({r:p.r,c:p.c,dir})); }
function inRadiusCells(u, maxManhattan, {allowOccupied=false, includeSelf=true}={}){
  const res=[];
  for(let r=1;r<=ROWS;r++){
    for(let c=1;c<=COLS;c++){
      if(!clampCell(r,c)) continue;
      const occ = getUnitAt(r,c);
      const isSelf = unitCoversCell(u, r, c);
      if(mdist(u,{r,c})<=maxManhattan){
        if(!allowOccupied && occ && !(includeSelf && isSelf)) continue;
        res.push({r,c});
      }
    }
  }
  return res;
}
function range_move_radius(u, radius){
  return inRadiusCells(u, radius, {allowOccupied:false, includeSelf:true})
    .map(p=>({r:p.r,c:p.c,dir:cardinalDirFromDelta(p.r-u.r,p.c-u.c)}));
}
function range_square_n(u, nHalf){
  const arr=[];
  for(let dr=-nHalf; dr<=nHalf; dr++){
    for(let dc=-nHalf; dc<=nHalf; dc++){
      const r=u.r+dr, c=u.c+dc; if(clampCell(r,c)) arr.push({r,c,dir:u.facing});
    }
  }
  return arr;
}
function unitCoversCell(u, r, c){
  if(!u || u.hp<=0) return false;
  if(u.size===2) return (r===u.r || r===u.r+1) && (c===u.c || c===u.c+1);
  return (u.r===r && u.c===c);
}
function getUnitAt(r,c){
  for(const id in units){ const u=units[id]; if(!u || u.hp<=0) continue; if(unitCoversCell(u, r, c)) return u; }
  return null;
}
function canPlace2x2(u, r, c){
  const cells=[{r,c},{r:r+1,c},{r,c:c+1},{r:r+1,c:c+1}];
  for(const p of cells){
    if(!clampCell(p.r,p.c)) return false;
    const occ=getUnitAt(p.r,p.c); if(occ && occ!==u) return false;
  }
  return true;
}
// 横斩区域（横向宽度 x 前向深度）
function forwardRectCentered(u, dir, lateralWidth, depth){
  const res=[];
  const d = DIRS[dir];
  const lat = (dir==='up'||dir==='down') ? {dr:0,dc:1} : {dr:1,dc:0};
  const half = Math.floor(lateralWidth/2);
  for(let step=1; step<=depth; step++){
    for(let w=-half; w<=half; w++){
      const rr = u.r + d.dr*step + lat.dr*w;
      const cc = u.c + d.dc*step + lat.dc*w;
      if(clampCell(rr,cc)) res.push({r:rr,c:cc,dir});
    }
  }
  return res;
}

// —— 日志/FX & UI 样式 ——
function appendLog(txt){
  try{
    if(!logEl) logEl=document.getElementById('log');
    if(logEl){ const line=document.createElement('div'); line.textContent=txt; logEl.prepend(line); }
    else console.log('[LOG]',txt);
  } catch(e){ console.log('[LOG]',txt); }
}
function injectFXStyles(){
  if(document.getElementById('fx-styles')) return;
  const css = `
  :root { --fx-z: 1000; --cell: ${CELL_SIZE}px; }
  #battleArea { position: relative; display: grid; gap: 2px; background: #0d1117; padding: 6px; border-radius: 10px; }
  .cell { width: var(--cell); height: var(--cell); position: relative; background: #1f1f1f; border-radius: 6px; overflow: hidden; }
  .cell.void { background: repeating-linear-gradient(45deg, #111 0 6px, #0b0b0b 6px 12px); opacity: 0.5; }
  .cell.cover { background: #1e293b; box-shadow: inset 0 0 0 2px rgba(59,130,246,0.35); }
  .cell .coord { position: absolute; right: 4px; bottom: 2px; font-size: 10px; color: rgba(255,255,255,0.35); }
  .unit { position: absolute; inset: 4px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.15); border-radius: 6px; color: #fff; font-size: 12px; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; }
  .unit.player { background: rgba(82,196,26,0.15); border-color: rgba(82,196,26,0.35); }
  .unit.enemy  { background: rgba(245,34,45,0.12); border-color: rgba(245,34,45,0.35); }
  .hpbar,.spbar { width: 90%; height: 6px; background: rgba(255,255,255,0.08); border-radius: 4px; margin-top: 4px; overflow: hidden; }
  .hpbar .hpfill { height: 100%; background: #ff4d4f; }
  .spbar .spfill { height: 100%; background: #40a9ff; }

  .fx-layer { position: absolute; inset: 0; pointer-events: none; z-index: var(--fx-z); }
  .fx { position: absolute; will-change: transform, opacity; }
  .fx-pop { animation: fx-pop 280ms ease-out forwards; }
  .fx-float { animation: fx-float-up 900ms ease-out forwards; }
  .fx-impact { width: 60px; height: 60px; background: radial-gradient(closest-side, rgba(255,255,255,0.9), rgba(255,180,0,0.5) 60%, transparent 70%); border-radius: 50%;
               animation: fx-impact 380ms ease-out forwards; mix-blend-mode: screen; }
  .fx-number { font-weight: 800; font-size: 18px; text-shadow: 0 1px 0 #000, 0 0 8px rgba(0,0,0,0.35); }
  .fx-number.hp { color: #ff4d4f; }
  .fx-number.sp { color: #36cfc9; }
  .fx-trail { width: 6px; height: 0; background: linear-gradient(90deg, rgba(255,255,255,0), rgba(255,255,255,0.85), rgba(255,255,255,0));
              box-shadow: 0 0 8px rgba(255,255,255,0.8); transform-origin: 0 0; animation: fx-trail 220ms linear forwards; mix-blend-mode: screen; }
  .shake { animation: cam-shake 180ms ease-in-out 1; }
  .pulse { animation: pulse 600ms ease-out 1; }
  @keyframes fx-pop { 0%{ transform: scale(0.7); opacity: 0.0; } 55%{ transform: scale(1.1); opacity: 1; } 100%{ transform: scale(1); opacity: 1; } }
  @keyframes fx-float-up { 0%{ transform: translate(-50%,-50%) translateY(0); opacity: 1; } 100%{ transform: translate(-50%,-50%) translateY(-36px); opacity: 0; } }
  @keyframes fx-impact { 0%{ transform: translate(-50%,-50%) scale(0.6); opacity: 0; }
                         50%{ transform: translate(-50%,-50%) scale(1.1); opacity: 1; }
                         100%{ transform: translate(-50%,-50%) scale(0.8); opacity: 0; } }
  @keyframes fx-trail { 0% { opacity: 0; } 30% { opacity: 1; } 100% { opacity: 0; } }
  @keyframes cam-shake {
    0% { transform: translate(2px, -2px) scale(1.02); }
    25% { transform: translate(-2px, 2px) scale(1.02); }
    50% { transform: translate(2px, 2px) scale(1.02); }
    75% { transform: translate(-2px, -2px) scale(1.02); }
    100% { transform: translate(0, 0) scale(1); }
  }
  @keyframes pulse {
    0% { box-shadow: 0 0 0 0 rgba(255,255,0,0.6); }
    100% { box-shadow: 0 0 0 12px rgba(255,255,0,0); }
  }

  /* Telegraph/Impact 高亮 */
  .cell.highlight-tele { background: rgba(24,144,255,0.28) !important; }
  .cell.highlight-imp  { background: rgba(245,34,45,0.30) !important; }
  .cell.highlight-stage{ background: rgba(250,173,20,0.34) !important; }

  /* 技能卡简易样式（含 pink/white/blue） */
  .skillCard { border-left: 6px solid #91d5ff; background: rgba(255,255,255,0.06); padding: 8px; border-radius: 8px; margin: 6px 0; cursor: pointer; }
  .skillCard.green { border-left-color:#73d13d; }
  .skillCard.red   { border-left-color:#ff4d4f; }
  .skillCard.blue  { border-left-color:#40a9ff; }
  .skillCard.pink  { border-left-color:#eb2f96; }
  .skillCard.white { border-left-color:#d9d9d9; }
  .skillCard.disabled { opacity: 0.55; cursor: not-allowed; }
  .skillCard .small { font-size: 12px; opacity: 0.85; }

  /* GOD'S WILL */
  #godsWillBtn {
    position: fixed; right: 16px; bottom: 16px; z-index: 3001;
    padding: 10px 14px; border: none; border-radius: 10px; color: #fff;
    background: #2f54eb; box-shadow: 0 6px 16px rgba(0,0,0,0.2); cursor: pointer;
    font-weight: 700; letter-spacing: 0.5px;
  }
  #godsWillBtn.armed { background: #722ed1; }

  /* GOD'S WILL 菜单 */
  .gods-menu {
    position: absolute; z-index: 3002; background: rgba(20,20,30,0.95); color: #fff;
    border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 8px; min-width: 180px;
    box-shadow: 0 6px 16px rgba(0,0,0,0.35); backdrop-filter: blur(2px);
  }
  .gods-menu .title { font-size: 12px; opacity: 0.8; margin-bottom: 6px; }
  .gods-menu .row { display: flex; gap: 6px; }
  .gods-menu button {
    flex: 1; padding: 6px 8px; border: none; border-radius: 6px; cursor: pointer; font-weight: 700;
  }
  .gods-menu .kill { background: #f5222d; color: #fff; }
  .gods-menu .onehp { background: #faad14; color: #111; }
  .gods-menu .cancel { background: #434343; color: #fff; }

  /* Fullscreen Button */
  #fullscreenBtn {
    position: fixed; left: 16px; bottom: 16px; z-index: 3001;
    padding: 10px 14px; border: none; border-radius: 10px; color: #fff;
    background: #13c2c2; box-shadow: 0 6px 16px rgba(0,0,0,0.2); cursor: pointer;
    font-weight: 700; letter-spacing: 0.5px;
  }
  #fullscreenBtn.on { background: #08979c; }

  /* 模拟全屏（不支持原生时的兜底） */
  html.fs-sim, body.fs-sim { width: 100%; height: 100%; overflow: hidden; }
  body.fs-sim #battleCamera {
    position: fixed !important; left: 0; top: 0; width: 100vw; height: 100vh;
    background: #0b0f1a;
  }
  body.fs-sim #battleArea {
    margin: 0 auto;
  }
  `;
  const style = document.createElement('style'); style.id='fx-styles'; style.textContent=css; document.head.appendChild(style);
}
function ensureFxLayer(){ if(!fxLayer){ fxLayer=document.createElement('div'); fxLayer.className='fx-layer'; battleAreaEl.appendChild(fxLayer); } }
function getCellEl(r,c){ return document.querySelector(`.cell[data-r="${r}"][data-c="${c}"]`); }
function getCellCenter(r,c){
  const cell = getCellEl(r,c); const area = battleAreaEl;
  if(!cell || !area) return {x:0,y:0};
  const cr = cell.getBoundingClientRect(); const ar = area.getBoundingClientRect();
  return { x: cr.left - ar.left + cr.width/2, y: cr.top - ar.top + cr.height/2 };
}
function makeEl(cls, html=''){ const el=document.createElement('div'); el.className=`fx ${cls}`; if(html) el.innerHTML=html; return el; }
function onAnimEndRemove(el, timeout=1200){ const done=()=>el.remove(); el.addEventListener('animationend',done,{once:true}); setTimeout(done, timeout); }
function fxAtCell(r,c,el){ ensureFxLayer(); const p=getCellCenter(r,c); el.style.left=`${p.x}px`; el.style.top=`${p.y}px`; fxLayer.appendChild(el); return el; }
function showHitFX(r,c){ const el=makeEl('fx-impact fx-pop'); fxAtCell(r,c, el); onAnimEndRemove(el,500); }
function showDamageFloat(r,c,hp,sp){
  ensureFxLayer();
  if(hp>0){ const el=makeEl('fx-number hp fx-float', `-${hp}`); el.style.transform='translate(-50%,-50%)'; fxAtCell(r,c,el); onAnimEndRemove(el,900); }
  if(sp>0){ const el=makeEl('fx-number sp fx-float', `-${sp} SP`); el.style.transform='translate(-50%,-50%)'; const p=getCellCenter(r,c); el.style.left=`${p.x+16}px`; el.style.top=`${p.y-6}px`; fxLayer.appendChild(el); onAnimEndRemove(el,900); }
}
function showGainFloat(r,c,hp,sp){
  ensureFxLayer();
  if(hp>0){ const el=makeEl('fx-number hp fx-float', `+${hp}`); el.style.color='#73d13d'; el.style.transform='translate(-50%,-50%)'; fxAtCell(r,c,el); onAnimEndRemove(el,900); }
  if(sp>0){ const el=makeEl('fx-number sp fx-float', `+${sp} SP`); el.style.color='#40a9ff'; el.style.transform='translate(-50%,-50%)'; const p=getCellCenter(r,c); el.style.left=`${p.x+16}px`; el.style.top=`${p.y-6}px`; fxLayer.appendChild(el); onAnimEndRemove(el,900); }
}
function pulseCell(r,c){ const cell=getCellEl(r,c); if(!cell) return; cell.classList.add('pulse'); setTimeout(()=>cell.classList.remove('pulse'),620); }
function applyCameraTransform(){
  if(!battleAreaEl) return;
  battleAreaEl.style.setProperty('--cam-scale', cameraState.scale.toFixed(4));
  battleAreaEl.style.setProperty('--cam-tx', `${cameraState.x.toFixed(2)}px`);
  battleAreaEl.style.setProperty('--cam-ty', `${cameraState.y.toFixed(2)}px`);
}
function clampCameraTargets(){
  if(!mapPaneEl) return;
  const vw = mapPaneEl.clientWidth || BOARD_WIDTH;
  const vh = mapPaneEl.clientHeight || BOARD_HEIGHT;
  const scale = cameraState.targetScale;
  const scaledWidth = BOARD_WIDTH * scale;
  const scaledHeight = BOARD_HEIGHT * scale;
  const maxX = Math.max(0, (scaledWidth - vw) / 2);
  const maxY = Math.max(0, (scaledHeight - vh) / 2);
  cameraState.targetX = clampValue(cameraState.targetX, -maxX, maxX);
  cameraState.targetY = clampValue(cameraState.targetY, -maxY, maxY);
  cameraState.x = clampValue(cameraState.x, -maxX, maxX);
  cameraState.y = clampValue(cameraState.y, -maxY, maxY);
}
function updateCameraBounds(){
  if(!mapPaneEl) return;
  const vw = mapPaneEl.clientWidth || BOARD_WIDTH;
  const vh = mapPaneEl.clientHeight || BOARD_HEIGHT;
  const fitScale = Math.min(vw / BOARD_WIDTH, vh / BOARD_HEIGHT) || 1;
  const base = Math.min(1, fitScale);
  cameraState.baseScale = base;
  cameraState.minScale = Math.max(0.5, base * 0.7);
  cameraState.maxScale = Math.max(base * 1.75, base * 1.1);
  cameraState.targetScale = clampValue(cameraState.targetScale || base, cameraState.minScale, cameraState.maxScale);
  cameraState.scale = clampValue(cameraState.scale || base, cameraState.minScale, cameraState.maxScale);
  clampCameraTargets();
  applyCameraTransform();
}
function startCameraLoop(){
  if(cameraLoopHandle) return;
  const step = ()=>{
    const stiffness = 0.12;
    const damping = 0.86;

    cameraState.vx += (cameraState.targetX - cameraState.x) * stiffness;
    cameraState.vx *= damping;
    cameraState.x += cameraState.vx;

    cameraState.vy += (cameraState.targetY - cameraState.y) * stiffness;
    cameraState.vy *= damping;
    cameraState.y += cameraState.vy;

    cameraState.vs += (cameraState.targetScale - cameraState.scale) * stiffness;
    cameraState.vs *= damping;
    cameraState.scale += cameraState.vs;

    if(Math.abs(cameraState.x - cameraState.targetX) < 0.05 && Math.abs(cameraState.vx) < 0.05){ cameraState.x = cameraState.targetX; cameraState.vx = 0; }
    if(Math.abs(cameraState.y - cameraState.targetY) < 0.05 && Math.abs(cameraState.vy) < 0.05){ cameraState.y = cameraState.targetY; cameraState.vy = 0; }
    if(Math.abs(cameraState.scale - cameraState.targetScale) < 0.001 && Math.abs(cameraState.vs) < 0.001){ cameraState.scale = cameraState.targetScale; cameraState.vs = 0; }

    applyCameraTransform();
    cameraLoopHandle = requestAnimationFrame(step);
  };
  cameraLoopHandle = requestAnimationFrame(step);
}
function stopCameraLoop(){ if(cameraLoopHandle){ cancelAnimationFrame(cameraLoopHandle); cameraLoopHandle = null; } }
function setCameraTarget({x=cameraState.targetX, y=cameraState.targetY, scale=cameraState.targetScale, immediate=false}={}){
  cameraState.targetScale = clampValue(scale, cameraState.minScale, cameraState.maxScale);
  cameraState.targetX = x;
  cameraState.targetY = y;
  clampCameraTargets();
  if(immediate){
    cameraState.x = cameraState.targetX;
    cameraState.y = cameraState.targetY;
    cameraState.scale = cameraState.targetScale;
    cameraState.vx = cameraState.vy = cameraState.vs = 0;
    applyCameraTransform();
  } else {
    startCameraLoop();
  }
}
function cameraReset({immediate=false}={}){
  if(cameraResetTimer){ clearTimeout(cameraResetTimer); cameraResetTimer=null; }
  setCameraTarget({x:0, y:0, scale:cameraState.baseScale, immediate});
}
function cellCenterOffset(r,c){
  const centerX = BOARD_BORDER + BOARD_PADDING + (c - 1) * (CELL_SIZE + GRID_GAP) + CELL_SIZE / 2;
  const centerY = BOARD_BORDER + BOARD_PADDING + (r - 1) * (CELL_SIZE + GRID_GAP) + CELL_SIZE / 2;
  return {
    x: centerX - BOARD_WIDTH / 2,
    y: centerY - BOARD_HEIGHT / 2,
  };
}
function cameraFocusOnCell(r,c,{scale=null, hold=enemyActionCameraLock?0:360, immediate=false}={}){
  if(!battleAreaEl || !mapPaneEl) return;
  const offset = cellCenterOffset(r,c);
  const autoScale = enemyActionCameraLock ? cameraState.baseScale * 1.05 : cameraState.baseScale * 1.1;
  const desiredScale = clampValue(scale===null ? Math.min(autoScale, cameraState.maxScale) : scale, cameraState.minScale, cameraState.maxScale);
  const tx = -offset.x * desiredScale;
  const ty = -offset.y * desiredScale;
  setCameraTarget({x:tx, y:ty, scale:desiredScale, immediate});
  if(cameraResetTimer){ clearTimeout(cameraResetTimer); cameraResetTimer=null; }
  if(hold>0){
    cameraResetTimer = setTimeout(()=> cameraReset(), hold);
  }
}
function cameraShake(){
  if(!battleAreaEl) return;
  battleAreaEl.classList.remove('shake');
  void battleAreaEl.offsetWidth;
  battleAreaEl.classList.add('shake');
  setTimeout(()=> battleAreaEl && battleAreaEl.classList.remove('shake'), 260);
}
function zoomCamera(multiplier, focusEvent=null){
  if(!mapPaneEl) return;
  const prevScale = cameraState.targetScale;
  const nextScale = clampValue(prevScale * multiplier, cameraState.minScale, cameraState.maxScale);
  if(Math.abs(nextScale - prevScale) < 0.0001) return;

  let focusX = 0;
  let focusY = 0;
  if(focusEvent){
    const rect = mapPaneEl.getBoundingClientRect();
    focusX = (focusEvent.clientX - (rect.left + rect.width/2));
    focusY = (focusEvent.clientY - (rect.top + rect.height/2));
  }
  const ratio = nextScale / prevScale;
  const newX = cameraState.targetX - focusX * (ratio - 1);
  const newY = cameraState.targetY - focusY * (ratio - 1);
  setCameraTarget({x:newX, y:newY, scale:nextScale});
}
function registerCameraInputs(){
  if(!mapPaneEl || cameraInputsRegistered) return;
  cameraInputsRegistered = true;
  mapPaneEl.addEventListener('wheel', (e)=>{
    e.preventDefault();
    if(interactionLocked) return;
    const factor = e.deltaY < 0 ? 1.08 : 0.94;
    zoomCamera(factor, e);
  }, {passive:false});
  mapPaneEl.addEventListener('contextmenu', (e)=> e.preventDefault());
  mapPaneEl.addEventListener('mousedown', (e)=>{
    if(e.button!==2 || interactionLocked) return;
    e.preventDefault();
    cameraDragState = { startX: e.clientX, startY: e.clientY, originX: cameraState.targetX, originY: cameraState.targetY };
    mapPaneEl.classList.add('dragging');
  });
  window.addEventListener('mousemove', (e)=>{
    if(!cameraDragState) return;
    const dx = e.clientX - cameraDragState.startX;
    const dy = e.clientY - cameraDragState.startY;
    setCameraTarget({x: cameraDragState.originX + dx, y: cameraDragState.originY + dy});
  });
  window.addEventListener('mouseup', (e)=>{
    if(e.button!==2 || !cameraDragState) return;
    cameraDragState = null;
    if(mapPaneEl) mapPaneEl.classList.remove('dragging');
  });
}
function createCameraControls(){
  if(!mapPaneEl) return;
  if(cameraControlsEl && cameraControlsEl.isConnected) cameraControlsEl.remove();
  cameraControlsEl = document.createElement('div');
  cameraControlsEl.className = 'cameraControls';
  const zoomInBtn = document.createElement('button');
  zoomInBtn.type='button';
  zoomInBtn.textContent = '+';
  zoomInBtn.title = '放大';
  zoomInBtn.addEventListener('click', ()=>{ if(interactionLocked) return; zoomCamera(1.12); });
  const zoomOutBtn = document.createElement('button');
  zoomOutBtn.type='button';
  zoomOutBtn.textContent = '−';
  zoomOutBtn.title = '缩小';
  zoomOutBtn.addEventListener('click', ()=>{ if(interactionLocked) return; zoomCamera(0.9); });
  cameraControlsEl.appendChild(zoomInBtn);
  cameraControlsEl.appendChild(zoomOutBtn);
  mapPaneEl.appendChild(cameraControlsEl);
}

// —— Telegraph/Impact 工具 —— 
function sleep(ms){ return new Promise(res=>setTimeout(res, ms)); }
function setInteractionLocked(on){
  interactionLocked = !!on;
  document.body.classList.toggle('interaction-locked', interactionLocked);
  if(interactionLocked && cameraDragState){
    cameraDragState = null;
    if(mapPaneEl) mapPaneEl.classList.remove('dragging');
  }
  if(interactionLocked) clearSkillAiming();
}
function ensureRoundBanner(){
  if(!roundBannerEl){
    roundBannerEl = document.createElement('div');
    roundBannerEl.className = 'roundBanner';
    const inner = document.createElement('div');
    inner.className = 'text';
    roundBannerEl.appendChild(inner);
    document.body.appendChild(roundBannerEl);
  }
  return roundBannerEl;
}
function showRoundBanner(text, duration=1800){
  const el = ensureRoundBanner();
  const inner = el.querySelector('.text');
  if(inner){
    inner.textContent = text;
    inner.classList.remove('animate');
    void inner.offsetWidth;
    inner.classList.add('animate');
  }
  el.classList.add('show');
  setTimeout(()=>{
    el.classList.remove('show');
    if(inner) inner.classList.remove('animate');
  }, duration);
}
function ensureIntroDialog(){
  if(!introDialogEl){
    introDialogEl = document.createElement('div');
    introDialogEl.className = 'introDialog';
    introDialogEl.style.display = 'none';
    const box = document.createElement('div');
    box.className = 'box';
    const nameplate = document.createElement('div');
    nameplate.className = 'nameplate';
    const name = document.createElement('div');
    name.className = 'name';
    nameplate.appendChild(name);
    box.appendChild(nameplate);
    const body = document.createElement('div');
    body.className = 'dialogBody';
    const content = document.createElement('div');
    content.className = 'content';
    body.appendChild(content);
    box.appendChild(body);
    const hint = document.createElement('div');
    hint.className = 'hint';
    hint.textContent = '点击继续';
    box.appendChild(hint);
    introDialogEl.appendChild(box);
    document.body.appendChild(introDialogEl);
  }
  return introDialogEl;
}
function showIntroLine(line){
  const dialog = ensureIntroDialog();
  const payload = (typeof line === 'string') ? {speaker: 'Haz', text: line} : line;
  const speaker = payload && payload.speaker ? payload.speaker : 'Haz';
  const text = payload && payload.text ? payload.text : '';
  const content = dialog.querySelector('.content');
  const name = dialog.querySelector('.nameplate .name');
  if(name) name.textContent = speaker;
  if(content){
    content.textContent = text;
    content.classList.remove('reveal');
    void content.offsetWidth;
    content.classList.add('reveal');
  }
  dialog.style.display = 'flex';
  dialog.classList.add('show');
  return new Promise(resolve=>{
    const handler = ()=>{
      dialog.removeEventListener('click', handler);
      resolve();
    };
    dialog.addEventListener('click', handler, {once:true});
  });
}
function hideIntroDialog(){ if(introDialogEl){ introDialogEl.style.display = 'none'; introDialogEl.classList.remove('show'); } }
async function playIntroCinematic(){
  if(introPlayed) return;
  introPlayed = true;
  setInteractionLocked(true);
  cameraReset({immediate:true});
  await sleep(260);
  const haz = units['haz'];
  if(haz && haz.hp>0){
    const zoom = clampValue(cameraState.baseScale * 1.3, cameraState.minScale, cameraState.maxScale);
    cameraFocusOnCell(haz.r, haz.c, {scale: zoom, hold:0});
    await sleep(420);
  }
  await showIntroLine({speaker:'Haz', text:'这种躲躲藏藏遮遮掩掩的人绝对不是什么好东西'});
  await showIntroLine({speaker:'Haz', text:'准备好队员们，今晚不出意外的话，又能钓到一条大的。。。'});
  hideIntroDialog();
  cameraReset();
  await sleep(520);
  showRoundBanner('回合一', 2200);
  await sleep(2000);
  setInteractionLocked(false);
}
function uniqueCells(cells){ const s=new Set(); const out=[]; for(const c of cells||[]){ const k=`${c.r},${c.c}`; if(!s.has(k)){ s.add(k); out.push(c);} } return out; }
function addTempClassToCells(cells, cls, ms){
  const arr=uniqueCells(cells);
  for(const c of arr){ const el=getCellEl(c.r,c.c); if(el) el.classList.add(cls); }
  setTimeout(()=>{ for(const c of arr){ const el=getCellEl(c.r,c.c); if(el) el.classList.remove(cls); } }, ms);
}
async function telegraphThenImpact(cells){
  const arr=uniqueCells(cells);
  addTempClassToCells(arr, 'highlight-tele', TELEGRAPH_MS);
  await sleep(TELEGRAPH_MS);
  addTempClassToCells(arr, 'highlight-imp', IMPACT_MS);
  await sleep(IMPACT_MS);
}
async function stageMark(cells){
  const arr=uniqueCells(cells);
  addTempClassToCells(arr, 'highlight-stage', STAGE_MS);
  await sleep(STAGE_MS);
}

// —— 叠层眩晕 & SP 崩溃 —— 
function applyStunOrStack(target, layers=1, {reason='', bypass=false}={}){
  const u = target; if(!u || u.hp<=0) return;
  if(bypass){
    u.status.stunned = Math.max(1, u.status.stunned + 1);
    if(reason) appendLog(`${u.name} 因${reason}，陷入眩晕`);
    return;
  }
  const thr = Math.max(1, u.stunThreshold || 1);
  u._staggerStacks = (u._staggerStacks || 0) + Math.max(1, layers);
  appendLog(`${u.name} 眩晕叠层 +${layers}（${u._staggerStacks}/${thr}）`);
  if(u._staggerStacks >= thr){
    u._staggerStacks = 0;
    u.status.stunned = Math.max(1, u.status.stunned + 1);
    if(reason) appendLog(`${u.name} 叠层达到门槛，陷入眩晕`);
  }
}
function handleSpCrashIfNeeded(u){
  if(!u || u.hp<=0) return;
  if(u.sp <= 0 && !u._spBroken){
    u._spBroken = true;
    applyStunOrStack(u, 1, {bypass:true, reason:'SP崩溃'});
    if(u.side==='player'){ playerSteps = Math.max(0, playerSteps - 1); } else { enemySteps = Math.max(0, enemySteps - 1); }
    const restored = Math.floor(u.maxSp * u.restoreOnZeroPct);
    u.spPendingRestore = Math.max(u.spPendingRestore ?? 0, restored);
    appendLog(`${u.name} 的 SP 崩溃：下个己方回合自动恢复至 ${u.spPendingRestore}`);
  }
  if(u.sp > 0 && u._spBroken) u._spBroken = false;
}
function applySpDamage(targetOrId, amount, {sourceId=null, reason=null}={}){
  const u = typeof targetOrId === 'string' ? units[targetOrId] : targetOrId;
  if(!u || u.hp<=0 || amount<=0) return 0;
  const before = u.sp;
  u.sp = Math.max(0, u.sp - amount);
  const delta = before - u.sp;
  if(delta>0){
    showDamageFloat(u.r,u.c,0,delta);
    if(reason){ appendLog(reason.replace('{delta}', String(delta))); }
    handleSpCrashIfNeeded(u);
    renderAll();
  }
  return delta;
}

// —— 伤害计算 —— 
function backstabMultiplier(attacker,target){
  const fromBehind = (target.facing === 'right' && attacker.c < target.c) || (target.facing === 'left' && attacker.c > target.c);
  if(fromBehind && attacker.side !== target.side){ appendLog('背刺触发 x1.5 伤害！'); return 1.5; }
  if(attacker.id === 'adora' && attacker.sp < 10) return 1.5;
  return 1.0;
}
function hasDeepBreathPassive(attacker){
  if(!attacker || attacker.id!=='karma') return false;
  const pool = attacker.skillPool || [];
  return pool.some(s=>s && s.name === '深呼吸');
}
function calcOutgoingDamage(attacker, baseDmg, target, skillName){
  let dmg = baseDmg;
  if(attacker.passives.includes('fearBuff') && attacker.sp<10) dmg = Math.round(dmg*1.5);
  if(attacker.passives.includes('pride')){
    const lostRatio = (attacker.maxHp - attacker.hp) / attacker.maxHp;
    dmg = Math.round(dmg * (1 + lostRatio * 0.5));
  }
  if(attacker.id==='karma' && skillName==='沙包大的拳头' && (attacker.consecAttacks||0)>=1){ dmg = Math.round(dmg*1.5); }
  if(attacker.id==='adora' && skillName==='短匕轻挥' && target){ dmg = Math.round(dmg * backstabMultiplier(attacker,target)); }
  if(attacker.team==='seven'){ dmg = Math.max(0, dmg - 5); }
  if(attacker.id==='haz' && attacker.hp <= attacker.maxHp/2){ dmg = Math.round(dmg * 1.3); }
  if(attacker.id==='haz' && attacker._comeback) dmg = Math.round(dmg * 1.10);

  if(hasDeepBreathPassive(attacker)){
    dmg = Math.round(dmg * 1.10);
  }

  const withinCritWindow = roundsPassed <= 15;
  if(attacker.team==='seven' && withinCritWindow && Math.random() < 0.30){ dmg = Math.round(dmg * 1.5); appendLog(`${attacker.name} 暴击！伤害 x1.5`); }

  if(attacker.team==='seven' && target && hazMarkedTargetId && target.id===hazMarkedTargetId){ dmg = Math.round(dmg * 1.15); }
  if(attacker.id==='tusk' && (attacker.tuskRageStacks||0)>0){ dmg += 5*attacker.tuskRageStacks; appendLog(`Tusk 猛牛之力：额外 +${5*attacker.tuskRageStacks} 伤害`); attacker.tuskRageStacks = 0; }
  return dmg;
}
function damageUnit(id, hpDmg, spDmg, reason, sourceId=null, opts={}){
  const u = units[id]; if(!u || u.hp<=0) return;

  if(sourceId){
    const src = units[sourceId];
    if(src && src.side === u.side){ appendLog(`友伤无效：${src.name} -> ${u.name}`); return; }
  }
  // 掩体：远程（距离>1）才被掩体免疫
  if(sourceId){
    const src = units[sourceId];
    if(src && isCoverCell(u.r, u.c) && mdist(src, u) > 1 && !opts.ignoreCover){
      appendLog(`${u.name} 处于掩体内，抵御了远距离伤害`);
      return;
    }
  }
  // 力挽狂澜减伤
  if(u.id==='haz' && u._comeback){
    hpDmg = Math.round(hpDmg * 0.9);
    spDmg = Math.round(spDmg * 0.9);
  }

  // 姿态减伤（优先于 Tusk 固有护甲）
  if(u._stanceType && u._stanceTurns>0 && u._stanceDmgRed>0){
    hpDmg = Math.round(hpDmg * (1 - u._stanceDmgRed));
    spDmg = Math.round(spDmg * (1 - u._stanceDmgRed));
  } else {
    // Tusk 固有“骨墙”（若未进入姿态）
    if(u.id==='tusk' && !opts.ignoreTuskWall){
      hpDmg = Math.round(hpDmg * 0.7);
      spDmg = Math.round(spDmg * 0.7);
    }
  }

  // Tusk 替 Haz 承伤
  if(u.id==='haz'){
    const tusk = units['tusk'];
    if(tusk && tusk.hp>0){
      const redHp = Math.round(hpDmg * 0.5);
      const redSp = Math.round(spDmg * 0.5);
      appendLog(`Tusk 家人的守护：替 Haz 承受伤害（-50%）`);
      tusk.tuskRageStacks = (tusk.tuskRageStacks||0) + 1;
      damageUnit('tusk', redHp, redSp, `（转移自 Haz）${reason}`, sourceId, {...opts, _redirected:true});
      return;
    }
  }

  if(u.id==='haz' && u.chainShieldTurns>0){
    hpDmg = Math.round(hpDmg * 0.6);
    spDmg = Math.round(spDmg * 0.6);
  }
  if(u.passives.includes('toughBody') && !opts.ignoreToughBody){
    hpDmg = Math.round(hpDmg * 0.75);
  }

  const finalHp = Math.max(0, hpDmg);
  const finalSp = Math.max(0, spDmg);

  u.hp = Math.max(0, u.hp - finalHp);
  u.sp = Math.max(0, u.sp - finalSp);

  appendLog(`${reason} (-${finalHp} HP, -${finalSp} SP)`);
  cameraShake(); showHitFX(u.r, u.c); showDamageFloat(u.r, u.c, finalHp, finalSp); pulseCell(u.r, u.c);

  // 锁链缠绕 反击（Haz）
  if(sourceId){
    const src = units[sourceId];
    if(src && u.chainShieldTurns>0 && u.chainShieldRetaliate>0){
      u.chainShieldRetaliate = 0;
      applySpDamage(src, 10, {sourceId: u.id, reason:`锁链缠绕反击：${src.name} SP -{delta}`});
    }
  }

  // 反伤姿态：反弹部分HP伤害
  if(sourceId && u._stanceType==='retaliate' && u._stanceTurns>0 && u._reflectPct>0 && !opts._reflected){
    const refl = Math.max(0, Math.round(finalHp * u._reflectPct));
    if(refl>0){
      const src = units[sourceId];
      if(src && src.hp>0){
        appendLog(`${u.name} 的反伤姿态：反弹 ${refl} 伤害给 ${src.name}`);
        damageUnit(src.id, refl, 0, `反伤姿态反弹自 ${u.name}`, u.id, {...opts, _reflected:true, ignoreCover:true, ignoreToughBody:true});
      }
    }
  }

  handleSpCrashIfNeeded(u);
  checkHazComebackStatus();

  renderAll();
}

// —— 公用 FX —— 
function showTrail(r1,c1,r2,c2,{thickness=6,color=null}={}){
  ensureFxLayer();
  const p1=getCellCenter(r1,c1), p2=getCellCenter(r2,c2);
  const dx=p2.x-p1.x, dy=p2.y-p1.y;
  const len=Math.hypot(dx,dy);
  const ang=Math.atan2(dy,dx)*180/Math.PI;
  const trail=makeEl('fx-trail');
  if(color){ trail.style.background=color; }
  trail.style.left=`${p1.x}px`;
  trail.style.top =`${p1.y}px`;
  trail.style.width=`${thickness}px`;
  trail.style.transformOrigin='0 0';
  trail.style.transform=`translate(0,-${Math.max(1, Math.floor(thickness/2))}px) rotate(${ang}deg) scaleY(${len/thickness})`;
  fxLayer.appendChild(trail);
  onAnimEndRemove(trail, 260);
}

// —— 玩家/敌方技能 —— 
function playerGunExec(u, desc){
  const dir = desc && desc.dir ? desc.dir : u.facing;
  const muzzle = forwardCellAt(u, dir, 1) || {r:u.r,c:u.c};
  cameraFocusOnCell(muzzle.r, muzzle.c);
  const line = forwardLineAt(u,dir);
  for(const cell of line){
    const tu = getUnitAt(cell.r,cell.c);
    showTrail(muzzle.r, muzzle.c, cell.r, cell.c);
    if(tu && tu.hp>0 && tu.side !== u.side){
      damageUnit(tu.id,10,5,`${u.name} 的 枪击 命中 ${tu.name}`, u.id);
      u.dmgDone += 10;
    }
  }
  unitActed(u);
}
function adoraDagger(u,target){
  if(!target || target.side===u.side){ appendLog('短匕轻挥 目标无效'); return; }
  const dmg = calcOutgoingDamage(u,10,target,'短匕轻挥');
  cameraFocusOnCell(target.r, target.c);
  damageUnit(target.id, dmg, 5, `${u.name} 用 短匕轻挥 攻击 ${target.name}`, u.id);
  u.dmgDone += dmg; unitActed(u);
}
function adoraPanicMove(u, payload){
  const dest = payload && payload.moveTo; if(!dest){ appendLog('无效的目的地'); return; }
  cameraFocusOnCell(dest.r, dest.c); showTrail(u.r,u.c,dest.r,dest.c);
  u.r=dest.r; u.c=dest.c; pulseCell(u.r,u.c);
  for(const d of Object.keys(DIRS)){
    const cell = forwardCellAt(u,d,1); if(!cell) continue;
    const t = getUnitAt(cell.r,cell.c);
    if(t && t.side!==u.side && t.hp>0 && t.hp <= t.maxHp/2){ appendLog(`${u.name} 追击残血！`); adoraDagger(u,t); break; }
  }
  unitActed(u);
}
function adoraZap(u,target){
  if(!target || target.side===u.side){ appendLog('电击装置 目标无效'); return; }
  cameraFocusOnCell(target.r, target.c);
  damageUnit(target.id,10,15,`${u.name} 自制粉色迷你电击装置 命中 ${target.name}`, u.id);
  applyStunOrStack(target, 1, {reason:'电击装置'});
  target.status.paralyzed = (target.status.paralyzed||0) + 1;
  appendLog(`${target.name} 下回合 -1 步`);
  u.dmgDone += 10; unitActed(u);
}
function darioClaw(u,target){
  if(!target || target.side===u.side){ appendLog('机械爪击 目标无效'); return; }
  const dmg = calcOutgoingDamage(u,15,target,'机械爪击');
  cameraFocusOnCell(target.r, target.c);
  damageUnit(target.id, dmg, 0, `${u.name} 发动 机械爪击 ${target.name}`, u.id);
  u.dmgDone += dmg; unitActed(u);
}
function darioSwiftMove(u, payload){
  const dest = payload && payload.moveTo; if(!dest){ appendLog('无效的目的地'); return; }
  cameraFocusOnCell(dest.r, dest.c); showTrail(u.r,u.c,dest.r,dest.c);
  u.r=dest.r; u.c=dest.c; pulseCell(u.r,u.c);
  const enemies = Object.values(units).filter(x=>x.side!==u.side && x.hp>0);
  if(enemies.length){
    let target=null, best=1e9;
    for(const e of enemies){ const d=mdist(u,e); if(d<best){best=d; target=e;} }
    const reduced = applySpDamage(target, 5, {sourceId:u.id});
    appendLog(`${target.name} SP -${reduced}（迅捷步伐）`);
  }
  unitActed(u);
}
function darioPull(u, targetOrDesc){
  let target = null, usedDir = null;
  if(targetOrDesc && targetOrDesc.id){ target = targetOrDesc; usedDir = cardinalDirFromDelta(target.r - u.r, target.c - u.c); }
  else if(targetOrDesc && targetOrDesc.dir){ usedDir = targetOrDesc.dir; const line = forwardLineAt(u, usedDir); for(const cell of line){ const tu=getUnitAt(cell.r,cell.c); if(tu && tu.hp>0 && tu.side!==u.side){ target=tu; break; } } }
  if(!target){ appendLog('拿来吧你！ 未找到可拉拽目标'); return; }
  cameraFocusOnCell(target.r, target.c);
  if(target.pullImmune){ appendLog(`${target.name} 免疫拉扯（小Boss/Boss），改为冲击效果`); }
  else {
    let placement = null;
    if(usedDir){
      const line = forwardLineAt(u, usedDir);
      for(const cell of line){ const occ = getUnitAt(cell.r, cell.c); if(!occ){ placement = cell; break; } }
    }
    if(placement){
      appendLog(`${u.name} 将 ${target.name} 拉到 (${placement.r}, ${placement.c})`);
      showTrail(target.r, target.c, placement.r, placement.c);
      target.r = placement.r; target.c = placement.c; pulseCell(target.r, target.c);
    } else {
      appendLog('前方无空位，改为直接造成冲击效果');
    }
  }
  const dmg = calcOutgoingDamage(u,20,target,'拿来吧你！');
  damageUnit(target.id, dmg, 0, `${u.name} 的 拿来吧你！ 命中 ${target.name}`, u.id);
  applyStunOrStack(target, 1, {reason:'拉扯冲击'});
  const reduced = applySpDamage(target, 15, {sourceId: u.id});
  appendLog(`${target.name} SP -${reduced}`);
  u.dmgDone += dmg; unitActed(u);
}
function karmaObeyMove(u, payload){
  const dest = payload && payload.moveTo; if(!dest){ appendLog('无效的目的地'); return; }
  cameraFocusOnCell(dest.r, dest.c); showTrail(u.r,u.c,dest.r,dest.c);
  u.r = dest.r; u.c = dest.c; pulseCell(u.r,u.c);
  if(u.consecAttacks > 0){ appendLog(`${u.name} 的连击被打断（移动）`); u.consecAttacks = 0; }
  u.sp = Math.min(u.maxSp, u.sp + 5); u._spBroken = (u.sp<=0); showGainFloat(u.r,u.c,0,5);
  unitActed(u);
}
function karmaGrip(u,target){
  if(!target || target.side===u.side){ appendLog('嗜血之握 目标无效'); return; }
  cameraFocusOnCell(target.r, target.c);
  let fixed = null;
  if(target.id==='haz') fixed = 75;
  else if(target.id==='tusk' || target.id==='katz') fixed = 80;
  else if(target.id==='kyn' || target.id==='neyla') fixed = 100;
  if(fixed!==null){
    const deal = Math.min(target.hp, fixed);
    damageUnit(target.id, deal, 0, `${u.name} 嗜血之握 重创 ${target.name}`, u.id, {ignoreToughBody:true, ignoreTuskWall:true});
  } else {
    damageUnit(target.id, target.hp, 0, `${u.name} 嗜血之握 处决 ${target.name}`, u.id, {ignoreToughBody:true});
  }
  unitActed(u);
}
function unitActed(u){ u.actionsThisTurn = Math.max(0, (u.actionsThisTurn||0)+1); }
function karmaPunch(u,target){
  if(!target || target.side===u.side){ appendLog('沙包大的拳头 目标无效'); return; }
  const dmg = calcOutgoingDamage(u, 15, target, '沙包大的拳头');
  cameraFocusOnCell(target.r, target.c);
  damageUnit(target.id, dmg, 0, `${u.name} 出拳 ${target.name}`, u.id);
  u.dmgDone += dmg; u.consecAttacks = (u.consecAttacks||0)+1; unitActed(u);
}

// —— Katz 技能（含新反复鞭尸逻辑） —— 
async function katz_RepeatedWhip(u, desc){
  // 反复鞭尸（三步）
  // 鱼矛成鞭，挥舞前面3格所有敌方单位：10伤害后再15伤害，并恢复5SP；
  // 按自身SP百分比重复该两段攻击（floor(sp/maxSp*5) 次，1..5），最多5次
  const dir = (desc && desc.dir) ? desc.dir : u.facing;
  const cells = range_forward_n(u,3,dir);
  if(!cells.length){ appendLog('反复鞭尸：前路受阻'); unitActed(u); return; }

  const cycles = Math.max(1, Math.min(5, Math.floor((u.sp / Math.max(1,u.maxSp)) * 5)));
  let totalHits = 0;
  for(let cycle=1; cycle<=cycles; cycle++){
    await telegraphThenImpact(cells);
    const hitSet1=new Set(); let hits1=0;
    for(const c of cells){
      const tu=getUnitAt(c.r,c.c);
      if(tu && tu.side!=='enemy' && !hitSet1.has(tu.id)){
        damageUnit(tu.id, 10, 0, `${u.name} 反复鞭尸·第${cycle}次 第一鞭 命中 ${tu.name}`, u.id);
        hitSet1.add(tu.id); hits1++;
      }
    }
    await stageMark(cells);
    const hitSet2=new Set(); let hits2=0;
    for(const c of cells){
      const tu=getUnitAt(c.r,c.c);
      if(tu && tu.side!=='enemy' && !hitSet2.has(tu.id)){
        damageUnit(tu.id, 15, 0, `${u.name} 反复鞭尸·第${cycle}次 第二鞭 重击 ${tu.name}`, u.id);
        hitSet2.add(tu.id); hits2++;
      }
    }
    // 每轮 +5SP
    const beforeSP = u.sp;
    u.sp = Math.min(u.maxSp, u.sp + 5);
    u._spBroken = (u.sp<=0);
    showGainFloat(u.r,u.c,0,u.sp-beforeSP);
    totalHits += hits1 + hits2;
  }
  appendLog(`反复鞭尸 累计命中段数：${totalHits}`);
  unitActed(u);
}
async function katz_EndSalvo(u, desc){
  // 终焉礼炮：直线5格，每单位35HP（不受掩体）；常态/压迫均可用
  const dir = (desc && desc.dir) ? desc.dir : u.facing;
  const cells = range_forward_n(u,5,dir);
  await telegraphThenImpact(cells);
  let hits=0,set=new Set();
  for(const c of cells){
    const tu=getUnitAt(c.r,c.c);
    if(tu && tu.side!=='enemy' && !set.has(tu.id)){
      damageUnit(tu.id, 35, 0, `${u.name} 终焉礼炮 命中 ${tu.name}`, u.id, {ignoreCover:true});
      set.add(tu.id); hits++;
    }
  }
  appendLog(`终焉礼炮 命中 ${hits} 人`);
  unitActed(u);
}

// —— 新增技能实现 —— 
// Adora：略懂的医术！（25级，粉色）
function adoraFieldMedic(u, aim){
  const t = getUnitAt(aim.r, aim.c);
  if(!t || t.side!==u.side){ appendLog('略懂的医术！ 目标无效'); return; }
  const hpBefore = t.hp, spBefore = t.sp;
  t.hp = Math.min(t.maxHp, t.hp + 20);
  t.sp = Math.min(t.maxSp, t.sp + 15);
  t._spBroken = (t.sp<=0);
  t.status.recoverStacks = (t.status.recoverStacks || 0) + 1;
  appendLog(`${u.name} 对 ${t.name} 使用 略懂的医术！：+20HP +15SP，并赋予“恢复”(${t.status.recoverStacks})`);
  showGainFloat(t.r,t.c,t.hp-hpBefore,t.sp-spBefore);
  unitActed(u);
}
// Karma：深呼吸（25级，白色）
function karmaDeepBreath(u){
  const hpBefore = u.hp, spBefore = u.sp;
  u.sp = u.maxSp; u._spBroken = (u.sp<=0);
  u.hp = Math.min(u.maxHp, u.hp + 10);
  appendLog(`${u.name} 使用 深呼吸：SP回满，+10HP（被动+10%仅在手牌中未被使用时生效）`);
  showGainFloat(u.r,u.c,u.hp-hpBefore,u.sp-spBefore);
  unitActed(u);
}

// Haz 原有与禁招（多阶段均即时结算）
async function haz_HarpoonStab(u, target){
  if(!target || target.side===u.side){ appendLog('鱼叉穿刺 目标无效'); return; }
  const cells=[{r:target.r,c:target.c}];
  await telegraphThenImpact(cells);
  const dmg = calcOutgoingDamage(u,20,target,'鱼叉穿刺');
  cameraFocusOnCell(target.r, target.c);
  damageUnit(target.id, dmg, 0, `${u.name} 鱼叉穿刺 命中 ${target.name}`, u.id);
  u.sp = Math.min(u.maxSp, u.sp + 10); u._spBroken = (u.sp<=0); showGainFloat(u.r,u.c,0,10);
  if(!hazMarkedTargetId){ hazMarkedTargetId = target.id; appendLog(`猎杀标记：${target.name} 被标记，七海对其伤害 +15%`); }
  if(Math.random() < 0.4){
    const reduced = applySpDamage(target,5,{sourceId:u.id});
    appendLog(`${target.name} SP -${reduced}（恐惧）`);
    target.status.paralyzed = (target.status.paralyzed||0) + 1;
    appendLog(`${target.name} 下回合 -1 步`);
  }
  u.dmgDone += dmg; unitActed(u);
}
async function haz_DeepHunt(u, desc){
  const dir = desc && desc.dir ? desc.dir : u.facing;
  const cells = range_forward_n(u,3,dir);
  await telegraphThenImpact(cells);
  let target=null;
  for(const c of cells){ const tu=getUnitAt(c.r,c.c); if(tu && tu.side!=='enemy'){ target=tu; break; } }
  if(!target){ appendLog('深海猎杀 未找到目标'); return; }
  const dmg = calcOutgoingDamage(u,25,target,'深海猎杀');
  cameraFocusOnCell(target.r, target.c);
  damageUnit(target.id, dmg, 0, `${u.name} 深海猎杀 命中 ${target.name}`, u.id);
  const front = forwardCellAt(u, dir, 1);
  if(front && !getUnitAt(front.r, front.c)){ target.r = front.r; target.c = front.c; pulseCell(front.r, front.c); appendLog(`${target.name} 被拉至面前一格`); }
  const reduced = applySpDamage(target,10,{sourceId:u.id});
  appendLog(`${target.name} SP -${reduced}`);
  if(!hazMarkedTargetId){ hazMarkedTargetId = target.id; appendLog(`猎杀标记：${target.name} 被标记，七海对其伤害 +15%`); }
  u.dmgDone += dmg; unitActed(u);
}
async function haz_GodFork(u, target){
  if(!target || target.side===u.side){ appendLog('猎神之叉 目标无效'); return; }
  await telegraphThenImpact([{r:target.r,c:target.c}]);
  const adj = range_adjacent(target);
  let dest = null, best=1e9;
  for(const p of adj){ if(getUnitAt(p.r,p.c)) continue; const d = mdist(u, p); if(d<best){best=d; dest=p;} }
  if(dest){ u.r=dest.r; u.c=dest.c; pulseCell(u.r,u.c); appendLog(`${u.name} 瞬移至 ${target.name} 身边`); }
  let dmg = calcOutgoingDamage(u,20,target,'猎神之叉');
  if(Math.random()<0.5){ dmg = Math.round(dmg*2.0); appendLog('猎神之叉 暴怒加成 x2.0'); }
  cameraFocusOnCell(target.r, target.c);
  damageUnit(target.id, dmg, 15, `${u.name} 猎神之叉 重击 ${target.name}`, u.id);
  target.status.bleed = Math.max(target.status.bleed||0, 2); appendLog(`${target.name} 附加流血（2回合，每回合 -5%最大HP）`);
  if(!hazMarkedTargetId){ hazMarkedTargetId = target.id; appendLog(`猎杀标记：${target.name} 被标记，七海对其伤害 +15%`); }
  u.dmgDone += dmg; unitActed(u);
}
function haz_ChainShield(u){
  u.chainShieldTurns = 2; u.chainShieldRetaliate = 1;
  appendLog(`${u.name} 锁链缠绕：2回合内伤害-40%，下次被打反击 10SP`);
  for(const id in units){
    const v=units[id];
    if(v.team==='seven' && v.hp>0){
      v.sp = Math.min(v.maxSp, v.sp+5);
      v._spBroken = (v.sp<=0);
      showGainFloat(v.r,v.c,0,5);
    }
  }
  unitActed(u);
}
async function haz_WhaleFall(u){
  const cells = range_square_n(u,2);
  await telegraphThenImpact(cells);
  const set=new Set(); let hits=0;
  for(const c of cells){
    const tu = getUnitAt(c.r,c.c);
    if(tu && tu.side!=='enemy' && !set.has(tu.id)){
      damageUnit(tu.id, 50, 20, `${u.name} 鲸落 轰击 ${tu.name}`, u.id, {ignoreCover:true});
      tu.status.paralyzed = (tu.status.paralyzed||0) + 1;
      set.add(tu.id); hits++;
    }
  }
  appendLog(`鲸落 命中 ${hits} 个单位`);
  unitActed(u);
}
async function haz_PayThePrice(u, desc){
  const dir = desc && desc.dir ? desc.dir : u.facing;

  // 段1：前刺（前3）
  const L1 = range_forward_n(u,3,dir);
  await telegraphThenImpact(L1);
  let h1=0;
  for(const c of L1){ const tu=getUnitAt(c.r,c.c); showTrail(u.r,u.c,c.r,c.c); if(tu && tu.side!=='enemy'){ damageUnit(tu.id,15,0,`${u.name} 付出代价·前刺 命中 ${tu.name}`, u.id); h1++; } }
  await stageMark(L1);

  // 段2：穿刺（前4）
  const L2 = range_forward_n(u,4,dir);
  await telegraphThenImpact(L2);
  let h2=0;
  for(const c of L2){ const tu=getUnitAt(c.r,c.c); showTrail(u.r,u.c,c.r,c.c); if(tu && tu.side!=='enemy'){ damageUnit(tu.id,15,5,`${u.name} 付出代价·穿刺 命中 ${tu.name}`, u.id); h2++; } }
  await stageMark(L2);

  // 段3：横斩（横3x前2）
  const R = forwardRectCentered(u, dir, 3, 2);
  await telegraphThenImpact(R);
  let h3=0; const seen=new Set();
  for(const c of R){
    const tu=getUnitAt(c.r,c.c);
    if(tu && tu.side!=='enemy' && !seen.has(tu.id)){
      damageUnit(tu.id,15,0,`${u.name} 付出代价·横斩 命中 ${tu.name}`, u.id);
      tu.status.hazBleedTurns = 2; appendLog(`${tu.name} 附加 Haz流血(2)`); seen.add(tu.id); h3++;
    }
  }
  appendLog(`付出代价：前刺${h1}/穿刺${h2}/横斩${h3}`);
  unitActed(u);
}
async function haz_ForkOfHatred(u, desc){
  const dir = desc && desc.dir ? desc.dir : u.facing;

  // 阶段1：横斩（横3x前2）
  const R = forwardRectCentered(u, dir, 3, 2);
  await telegraphThenImpact(R);
  let h1=0; const seen1=new Set();
  for(const c of R){
    const tu=getUnitAt(c.r,c.c);
    if(tu && tu.side!=='enemy' && !seen1.has(tu.id)){
      damageUnit(tu.id,15,10,`${u.name} 仇恨之叉·横斩 命中 ${tu.name}`, u.id);
      seen1.add(tu.id); h1++;
    }
  }
  await stageMark(R);

  // 阶段2：自身5x5重砸（不受掩体）
  const AOE = range_square_n(u,2);
  await telegraphThenImpact(AOE);
  let h2=0; const seen2=new Set();
  for(const c of AOE){
    const tu=getUnitAt(c.r,c.c);
    if(tu && tu.side!=='enemy' && !seen2.has(tu.id)){
      damageUnit(tu.id,20,0,`${u.name} 仇恨之叉·重砸 命中 ${tu.name}`, u.id, {ignoreCover:true});
      tu.status.hazBleedTurns = 2; appendLog(`${tu.name} 附加 Haz流血(2)`);
      seen2.add(tu.id); h2++;
    }
  }
  appendLog(`仇恨之叉：横斩命中 ${h1}，重砸命中 ${h2}`);
  unitActed(u);
}

// Katz
async function katz_Thrust(u,target){
  if(!target || target.side===u.side){ appendLog('矛刺 目标无效'); return; }
  await telegraphThenImpact([{r:target.r,c:target.c}]);
  let dmg = calcOutgoingDamage(u,20,target,'矛刺');
  cameraFocusOnCell(target.r,target.c);
  damageUnit(target.id, dmg, 0, `${u.name} 矛刺 命中 ${target.name}`, u.id);
  u.sp = Math.min(u.maxSp, u.sp+5); u._spBroken = (u.sp<=0); showGainFloat(u.r,u.c,0,5);
  u.dmgDone += dmg; unitActed(u);
}
async function katz_ChainWhip(u,desc){
  const dir = desc && desc.dir ? desc.dir : u.facing;
  const cells = range_forward_n(u,3,dir);
  await telegraphThenImpact(cells);
  let hits=0, set=new Set();
  for(const c of cells){
    const tu=getUnitAt(c.r,c.c);
    if(tu && tu.side!=='enemy' && !set.has(tu.id)){
      damageUnit(tu.id,25,0,`${u.name} 链式鞭击 命中 ${tu.name}`, u.id);
      tu.status.paralyzed = (tu.status.paralyzed||0) + 1;
      set.add(tu.id); hits++;
    }
  }
  appendLog(`链式鞭击 命中 ${hits} 人`);
  unitActed(u);
}
async function katz_MustErase(u, desc){
  const dir = desc && desc.dir ? desc.dir : u.facing;
  const cells = range_forward_n(u,3,dir);
  await telegraphThenImpact(cells);
  const cycleTimes = Math.max(1, Math.min(5, Math.floor((u.sp/u.maxSp)*5)));
  for(let cycle=1; cycle<=cycleTimes; cycle++){
    const dmg = cycle===1?20:30;
    let set=new Set(), hits=0;
    for(const c of cells){
      const tu=getUnitAt(c.r,c.c);
      if(tu && tu.side!=='enemy' && !set.has(tu.id)){
        damageUnit(tu.id, dmg, 0, `${u.name} 必须抹杀一切.. 第${cycle}段 命中 ${tu.name}`, u.id);
        set.add(tu.id); hits++;
      }
    }
    if(hits>0){
      u.hp = Math.max(1, u.hp - 5); showDamageFloat(u.r,u.c,5,0);
      u.sp = Math.min(u.maxSp, u.sp + 5); u._spBroken = (u.sp<=0); showGainFloat(u.r,u.c,0,5);
      await stageMark(cells);
    }
  }
  unitActed(u);
}

// Tusk
async function tusk_ShieldBash(u,target){
  if(!target || target.side===u.side){ appendLog('骨盾猛击 目标无效'); return; }
  await telegraphThenImpact([{r:target.r,c:target.c}]);
  const dmg = calcOutgoingDamage(u,10,target,'骨盾猛击');
  cameraFocusOnCell(target.r,target.c);
  damageUnit(target.id, dmg, 0, `${u.name} 骨盾猛击 ${target.name}`, u.id);
  const dir = cardinalDirFromDelta(target.r-u.r, target.c-u.c);
  const back = forwardCellAt(target, dir, 1);
  if(back && !getUnitAt(back.r, back.c)){ target.r=back.r; target.c=back.c; pulseCell(back.r,back.c); appendLog(`${target.name} 被击退一格`); }
  u.dmgDone += dmg; unitActed(u);
}
async function tusk_DeepRoar(u){
  const cells = range_square_n(u,1);
  await telegraphThenImpact(cells);
  const set=new Set(); let hits=0;
  for(const c of cells){
    const tu=getUnitAt(c.r,c.c);
    if(tu && tu.side!=='enemy' && !set.has(tu.id)){
      const reduced = applySpDamage(tu, 20, {sourceId:u.id});
      appendLog(`${tu.name} 因咆哮 SP -${reduced}`);
      set.add(tu.id); hits++;
    }
  }
  appendLog(`来自深海的咆哮 命中 ${hits} 人`);
  unitActed(u);
}
function enterStance(u, type, turns, {dmgReduction=0, spPerTurn=0, reflectPct=0}={}){
  u._stanceType = type;
  u._stanceTurns = turns;
  u._stanceDmgRed = Math.max(0, Math.min(0.9, dmgReduction));
  u._stanceSpPerTurn = Math.max(0, spPerTurn|0);
  u._reflectPct = Math.max(0, Math.min(0.9, reflectPct));
  appendLog(`${u.name} 进入${type==='defense'?'防御姿态':'反伤姿态'}（${turns}回合）`);
}
function clearStance(u){
  if(u._stanceType){
    appendLog(`${u.name} 的${u._stanceType==='defense'?'防御姿态':'反伤姿态'} 结束`);
  }
  u._stanceType=null; u._stanceTurns=0; u._stanceDmgRed=0; u._stanceSpPerTurn=0; u._reflectPct=0;
}
function tusk_WarFortress(u){
  // 防御姿态：减伤50%，每回合+10SP，3回合；期间无法移动
  enterStance(u, 'defense', 3, {dmgReduction:0.5, spPerTurn:10});
  unitActed(u);
}
function tusk_RetaliateGuard(u){
  // 反伤姿态：减伤40%，每回合+10SP，反弹30%所受HP伤害，3回合；期间无法移动
  enterStance(u, 'retaliate', 3, {dmgReduction:0.4, spPerTurn:10, reflectPct:0.3});
  unitActed(u);
}
async function tusk_BullCharge(u, desc){
  // 牛鲨冲撞：朝一个方向冲锋至多3格，撞到第一个敌人时造成20伤并击退1格；若未撞到人则移动到终点
  const dir = (desc && desc.dir) ? desc.dir : u.facing;
  const path = range_forward_n(u,3,dir);
  if(!path.length){ appendLog('牛鲨冲撞：前路受阻'); unitActed(u); return; }
  await telegraphThenImpact(path);
  let lastFree = null;
  let hitTarget = null;
  for(const step of path){
    const occ = getUnitAt(step.r, step.c);
    if(occ && occ.side!=='enemy'){ hitTarget = occ; break; }
    if(!occ) lastFree = step;
    else break;
  }
  if(hitTarget){
    if(lastFree){ showTrail(u.r,u.c,lastFree.r,lastFree.c); u.r=lastFree.r; u.c=lastFree.c; pulseCell(u.r,u.c); }
    const dmg = calcOutgoingDamage(u,20,hitTarget,'牛鲨冲撞');
    cameraFocusOnCell(hitTarget.r, hitTarget.c);
    damageUnit(hitTarget.id, dmg, 0, `${u.name} 牛鲨冲撞 命中并撞击 ${hitTarget.name}`, u.id);
    const knockDir = cardinalDirFromDelta(hitTarget.r - u.r, hitTarget.c - u.c);
    const back = forwardCellAt(hitTarget, knockDir, 1);
    if(back && !getUnitAt(back.r, back.c)){ hitTarget.r=back.r; hitTarget.c=back.c; pulseCell(back.r, back.c); appendLog(`${hitTarget.name} 被撞退一格`); }
  } else if(lastFree){
    showTrail(u.r,u.c,lastFree.r,lastFree.c);
    u.r=lastFree.r; u.c=lastFree.c; pulseCell(u.r,u.c);
    appendLog(`${u.name} 牛鲨冲撞：无人命中，移动至终点`);
  } else {
    appendLog('牛鲨冲撞：无法前进');
  }
  unitActed(u);
}

// Neyla
async function neyla_SwiftShot(u, targetOrAim){
  let tu = null;
  if(targetOrAim){
    if(targetOrAim.id) tu = targetOrAim;
    else if(typeof targetOrAim.r==='number' && typeof targetOrAim.c==='number') tu = getUnitAt(targetOrAim.r, targetOrAim.c);
  }
  if(!tu || tu.side===u.side){ appendLog('迅捷射击 未命中'); unitActed(u); return; }
  const dist = mdist(u, tu);
  if(dist > 4){ appendLog(`${u.name} 迅捷射击 失败：目标超出射程（≤4）`); unitActed(u); return; }
  await telegraphThenImpact([{r:tu.r,c:tu.c}]);
  let base=15;
  if((u.actionsThisTurn||0)===0) base = Math.round(base*1.5);
  if(tu.hp <= tu.maxHp/2) base = base*2;
  const dmg = calcOutgoingDamage(u,base,tu,'迅捷射击');
  cameraFocusOnCell(tu.r, tu.c);
  damageUnit(tu.id, dmg, 5, `${u.name} 迅捷射击 命中 ${tu.name}`, u.id);
  unitActed(u);
}
async function neyla_PierceSnipe(u, desc){
  const dir = desc && desc.dir ? desc.dir : u.facing;
  const line = range_forward_n(u,6,dir);
  await telegraphThenImpact(line);
  let hits=0, set=new Set();
  for(const c of line){
    const tu=getUnitAt(c.r,c.c);
    if(tu && tu.side!=='enemy' && !set.has(tu.id)){
      damageUnit(tu.id,30,0,`${u.name} 穿刺狙击 命中 ${tu.name}`, u.id);
      tu.status.bleed = Math.max(tu.status.bleed||0, 2);
      set.add(tu.id); hits++;
    }
  }
  appendLog(`穿刺狙击 命中 ${hits} 人`);
  unitActed(u);
}
async function neyla_EndShadow(u, aim){
  const tu = getUnitAt(aim.r, aim.c);
  if(!tu || tu.side==='enemy') { appendLog('终末之影 未命中'); unitActed(u); return; }
  await telegraphThenImpact([{r:tu.r,c:tu.c}]);
  cameraFocusOnCell(tu.r, tu.c);
  damageUnit(tu.id, 50, 20, `${u.name} 终末之影 命中 ${tu.name}`, u.id);
  unitActed(u);
}
// Neyla：双钩牵制（2步，红，前3格内优先最近，单体）
async function neyla_DoubleHook(u, desc){
  const dir = (desc && desc.dir) ? desc.dir : u.facing;
  const cells = range_forward_n(u,3,dir);
  await telegraphThenImpact(cells);
  let target=null;
  for(const c of cells){ const tu=getUnitAt(c.r,c.c); if(tu && tu.side!=='enemy'){ target=tu; break; } }
  if(!target){ appendLog('双钩牵制 未命中'); unitActed(u); return; }
  // 拉近一格
  const backDir = cardinalDirFromDelta(u.r - target.r, u.c - target.c);
  const stepCell = forwardCellAt(target, backDir, 1);
  if(stepCell && !getUnitAt(stepCell.r, stepCell.c)){
    showTrail(target.r,target.c, stepCell.r, stepCell.c);
    target.r = stepCell.r; target.c = stepCell.c; pulseCell(target.r,target.c);
    appendLog(`${target.name} 被双钩拉近一格`);
  }
  target.status.paralyzed = (target.status.paralyzed||0) + 1;
  appendLog(`${target.name} 因双钩牵制：下回合 -1 步`);
  const dmg = calcOutgoingDamage(u,15,target,'双钩牵制');
  damageUnit(target.id, dmg, 0, `${u.name} 双钩牵制 命中 ${target.name}`, u.id);
  u.dmgDone += dmg; unitActed(u);
}

// —— Kyn —— 
function kynReturnToHaz(u){
  const haz = units['haz'];
  if(!haz || haz.hp<=0){ appendLog('迅影返身：Haz 已不在场，无法回归'); return; }
  const adj = range_adjacent(haz).filter(p=>!getUnitAt(p.r,p.c));
  if(adj.length===0){ appendLog('迅影返身：Haz 身旁无空位'); return; }
  let best=adj[0], bestD=mdist(u,adj[0]);
  for(const p of adj){ const d=mdist(u,p); if(d<bestD){ best=p; bestD=d; } }
  u.r = best.r; u.c = best.c; pulseCell(u.r,u.c);
  appendLog(`${u.name} 迅影返身：回归队长身侧`);
}
async function kyn_ShadowDash(u, target){
  if(!target || target.side===u.side){ appendLog('迅影突刺 目标无效'); return; }
  await telegraphThenImpact([{r:target.r,c:target.c}]);
  const adj = range_adjacent(target).filter(p=>!getUnitAt(p.r,p.c));
  if(adj.length){ const p=adj[0]; u.r=p.r; u.c=p.c; pulseCell(u.r,u.c); }
  const thresh = Math.ceil(target.maxHp*0.25);
  let executed = false;

  if(target.hp<=thresh){
    damageUnit(target.id, target.hp, 0, `${u.name} 迅影突刺 处决 ${target.name}`, u.id);
    executed = true;
  } else {
    const before = target.hp;
    damageUnit(target.id, 20, 0, `${u.name} 迅影突刺 命中 ${target.name}`, u.id);
    if(before>0 && target.hp<=0) executed = true;
  }
  if(u.passives.includes('kynReturn') && executed){
    kynReturnToHaz(u);
  }
  unitActed(u);
}
async function kyn_DeathCall(u, target){
  if(!target || target.side===u.side){ appendLog('死亡宣告 目标无效'); return; }
  await telegraphThenImpact([{r:target.r,c:target.c}]);
  const thresh = Math.ceil(target.maxHp*0.30);
  let executed = false;

  if(target.hp<=thresh){
    damageUnit(target.id, target.hp, 0, `${u.name} 死亡宣告 处决 ${target.name}`, u.id);
    executed = true;
  } else {
    const before = target.hp;
    damageUnit(target.id, 50, 30, `${u.name} 死亡宣告 重创 ${target.name}`, u.id);
    if(before>0 && target.hp<=0) executed = true;
  }
  if(u.passives.includes('kynReturn') && executed){
    kynReturnToHaz(u);
  }
  unitActed(u);
}
// Kyn：割喉飞刃（4格内单体 20HP + 流血1 + 恐惧1）
async function kyn_ThroatBlade(u, aim){
  const tu = getUnitAt(aim.r, aim.c);
  if(!tu || tu.side==='enemy'){ appendLog('割喉飞刃 未命中'); unitActed(u); return; }
  if(mdist(u,tu) > 4){ appendLog('割喉飞刃 超出射程（≤4）'); unitActed(u); return; }
  await telegraphThenImpact([{r:tu.r,c:tu.c}]);
  const dmg = calcOutgoingDamage(u,20,tu,'割喉飞刃');
  cameraFocusOnCell(tu.r, tu.c);
  damageUnit(tu.id, dmg, 0, `${u.name} 割喉飞刃 命中 ${tu.name}`, u.id);
  tu.status.bleed = (tu.status.bleed||0) + 1;
  tu.status.paralyzed = (tu.status.paralyzed||0) + 1;
  appendLog(`${tu.name} 附加 流血+1、恐惧+1`);
  unitActed(u);
}
// Kyn：影杀之舞（2步 常态 3x3 AOE 30，随后免费移动1格；不受掩体）
async function kyn_ShadowDance_AOE(u){
  const cells = range_square_n(u,1);
  await telegraphThenImpact(cells);
  const seen=new Set(); let hits=0;
  for(const c of cells){
    const tu=getUnitAt(c.r,c.c);
    if(tu && tu.side!=='enemy' && !seen.has(tu.id)){
      damageUnit(tu.id, 30, 0, `${u.name} 影杀之舞 横扫 ${tu.name}`, u.id, {ignoreCover:true});
      seen.add(tu.id); hits++;
    }
  }
  appendLog(`影杀之舞 AOE 命中 ${hits} 人`);
  // 立即免费移动1格（若有空位）
  const neigh = range_adjacent(u).filter(p=>!getUnitAt(p.r,p.c));
  if(neigh.length){
    const p = neigh[0];
    showTrail(u.r,u.c,p.r,p.c);
    u.r=p.r; u.c=p.c; pulseCell(u.r,u.c);
    appendLog(`${u.name} 影杀之舞：免费位移 1 格`);
  }
  unitActed(u);
}

// —— Neyla 压迫后“终末之影”保证（每回合最多一张；无则添加/替换） ——
function makeNeylaEndShadowSkill(u){
  return skill('终末之影',2,'red','全图任意单体 50HP+20SP',
    (uu)=> inRadiusCells(uu,999,{allowOccupied:true}).map(p=>({...p,dir:uu.facing})),
    (uu,aim)=> neyla_EndShadow(uu,aim),
    {aoe:false},
    {cellTargeting:true, castMs:1200}
  );
}
function ensureNeylaEndShadowGuarantee(u){
  if(!u || u.id!=='neyla' || !u.oppression) return;
  const pool = u.skillPool || [];
  const firstIdx = pool.findIndex(s=>s && s.name==='终末之影');
  for(let i=pool.length-1;i>=0;i--){
    if(i!==firstIdx && pool[i] && pool[i].name==='终末之影'){
      pool.splice(i,1);
    }
  }
  if(firstIdx>=0) return;
  const endShadow = makeNeylaEndShadowSkill(u);
  if(pool.length < SKILLPOOL_MAX){
    pool.push(endShadow);
  } else {
    const idx = Math.floor(Math.random()*pool.length);
    pool[idx] = endShadow;
  }
  appendLog('Neyla 压迫：已保证“终末之影”在手牌中（最多仅一张）');
}

// —— 技能池/抽牌（含调整：Katz/Nelya/Kyn 技能）；移动卡统一蓝色 —— 
function skill(name,cost,color,desc,rangeFn,execFn,estimate={},meta={}){ return {name,cost,color,desc,rangeFn,execFn,estimate,meta}; }
function buildSkillFactoriesForUnit(u){
  const F=[];
  if(u.id==='adora'){
    F.push(
      { key:'短匕轻挥', prob:0.85, cond:()=>true, make:()=> skill('短匕轻挥',1,'green','邻格 10HP +5SP（背刺x1.5）',
        (uu,aimDir,aimCell)=> aimCell && mdist(uu,aimCell)===1? [{r:aimCell.r,c:aimCell.c,dir:cardinalDirFromDelta(aimCell.r-uu.r,aimCell.c-uu.c)}] : range_adjacent(uu),
        (uu,target)=> adoraDagger(uu,target),
        {},
        {castMs:900}
      )},
      { key:'枪击', prob:0.65, cond:()=>inventory.pistol, make:()=> skill('枪击',1,'green','指定方向整排 10HP+5SP（需手枪）',
        (uu,aimDir)=> aimDir? range_line(uu,aimDir) : (()=>{const a=[]; for(const d in DIRS) range_line(uu,d).forEach(x=>a.push(x)); return a;})(),
        (uu,desc)=> playerGunExec(uu,desc),
        {aoe:true},
        {castMs:900}
      )},
      { key:'呀！你不要靠近我呀！！', prob:0.40, cond:()=>true, make:()=> skill('呀！你不要靠近我呀！！',2,'blue','位移≤5；若相邻敌人≤50%HP，追击一次短匕',
        (uu)=> range_move_radius(uu,5),
        (uu,payload)=> adoraPanicMove(uu,payload),
        {},
        {moveSkill:true, moveRadius:5, castMs:600}
      )},
      { key:'自制粉色迷你电击装置', prob:0.30, cond:()=>true, make:()=> skill('自制粉色迷你电击装置',3,'red','前方1-2格 10HP 15SP；叠1层眩晕；并使目标下回合-1步',
        (uu,aimDir)=> aimDir? range_forward_n(uu,2,aimDir) : (()=>{const a=[]; for(const d in DIRS) range_forward_n(uu,2,d).forEach(x=>a.push(x)); return a;})(),
        (uu,target)=> adoraZap(uu,target),
        {},
        {castMs:1000}
      )}
    );
    F.push(
      { key:'略懂的医术！', prob:0.25, cond:()=>u.level>=25, make:()=> skill('略懂的医术！',2,'pink','以自身为中心5x5内选择友方：+20HP/+15SP，并赋予一层“恢复”Buff',
        (uu)=> range_square_n(uu,2).filter(p=>{ const tu=getUnitAt(p.r,p.c); return tu && tu.side===uu.side; }),
        (uu,aim)=> adoraFieldMedic(uu,aim),
        {aoe:false},
        {cellTargeting:true, castMs:900}
      )}
    );
  } else if(u.id==='dario'){
    F.push(
      { key:'机械爪击', prob:0.90, cond:()=>true, make:()=> skill('机械爪击',1,'green','前方1-2格 15HP',
        (uu,aimDir)=> aimDir? range_forward_n(uu,2,aimDir) : (()=>{const a=[]; for(const d in DIRS) range_forward_n(uu,2,d).forEach(x=>a.push(x)); return a;})(),
        (uu,targetOrDesc)=> {
          if(targetOrDesc && targetOrDesc.id) darioClaw(uu,targetOrDesc);
          else if(targetOrDesc && targetOrDesc.dir){
            const line = range_forward_n(uu,2,targetOrDesc.dir);
            let tgt=null; for(const c of line){ const tu=getUnitAt(c.r,c.c); if(tu && tu.side!=='player'){ tgt=tu; break; } }
            if(tgt) darioClaw(uu,tgt); else appendLog('机械爪击 未命中');
          }
        },
        {},
        {castMs:900}
      )},
      { key:'枪击', prob:0.65, cond:()=>inventory.pistol, make:()=> skill('枪击',1,'green','指定方向整排 10HP+5SP（需手枪）',
        (uu,aimDir)=> aimDir? range_line(uu,aimDir) : (()=>{const a=[]; for(const d in DIRS) range_line(uu,d).forEach(x=>a.push(x)); return a;})(),
        (uu,desc)=> playerGunExec(uu,desc),
        {aoe:true},
        {castMs:900}
      )},
      { key:'迅捷步伐', prob:0.40, cond:()=>true, make:()=> skill('迅捷步伐',2,'blue','位移≤4；最近敌人 SP -5',
        (uu)=> range_move_radius(uu,4),
        (uu,payload)=> darioSwiftMove(uu,payload),
        {},
        {moveSkill:true, moveRadius:4, castMs:600}
      )},
      { key:'拿来吧你！', prob:0.30, cond:()=>true, make:()=> skill('拿来吧你！',3,'red','方向整排：拉至最近空格 +20HP、叠层、-15SP（小Boss/Boss免疫拉扯）',
        (uu,aimDir)=> aimDir? range_line(uu,aimDir) : (()=>{const a=[]; for(const d in DIRS) range_line(uu,d).forEach(x=>a.push(x)); return a;})(),
        (uu,desc)=> darioPull(uu,desc),
        {aoe:true},
        {castMs:1100}
      )}
    );
  } else if(u.id==='karma'){
    F.push(
      { key:'沙包大的拳头', prob:0.90, cond:()=>true, make:()=> skill('沙包大的拳头',1,'green','邻格 15HP（连击递增）',
        (uu,aimDir,aimCell)=> aimCell && mdist(uu,aimCell)===1? [{r:aimCell.r,c:aimCell.c,dir:cardinalDirFromDelta(aimCell.r-uu.r,aimCell.c-uu.c)}] : range_adjacent(uu),
        (uu,target)=> karmaPunch(uu,target),
        {},
        {castMs:900}
      )},
      { key:'枪击', prob:0.65, cond:()=>inventory.pistol, make:()=> skill('枪击',1,'green','指定方向整排 10HP+5SP（需手枪）',
        (uu,aimDir)=> aimDir? range_line(uu,aimDir) : (()=>{const a=[]; for(const d in DIRS) range_line(uu,d).forEach(x=>a.push(x)); return a;})(),
        (uu,desc)=> playerGunExec(uu,desc),
        {aoe:true},
        {castMs:900}
      )},
      { key:'都听你的', prob:0.40, cond:()=>true, make:()=> skill('都听你的',2,'blue','位移≤3，并恢复自身 5SP（打断连击）',
        (uu)=> range_move_radius(uu,3),
        (uu,payload)=> karmaObeyMove(uu,payload),
        {},
        {moveSkill:true, moveRadius:3, castMs:600}
      )},
      { key:'嗜血之握', prob:0.30, cond:()=>true, make:()=> {
          const sk = skill('嗜血之握',3,'red','（需连击≥4）精英100/小Boss80/Boss75/普通处决',
            (uu,aimDir)=> aimDir? range_forward_n(uu,2,aimDir) : (()=>{const a=[]; for(const d in DIRS) range_forward_n(uu,2,d).forEach(x=>a.push(x)); return a;})(),
            (uu,target)=> karmaGrip(uu,target),
            {},
            {requireConsec:4, castMs:900}
          );
          return sk;
        }
      }
    );
    F.push(
      { key:'深呼吸', prob:0.20, cond:()=>u.level>=25 && !(u.skillPool||[]).some(s=>s.name==='深呼吸'), make:()=> skill('深呼吸',2,'white','被动：只要此卡在技能池，伤害+10%；主动使用：自身SP回满并+10HP（使用后该卡被移除）',
        (uu)=>[{r:uu.r,c:uu.c,dir:uu.facing}],
        (uu)=> karmaDeepBreath(uu),
        {},
        {castMs:700}
      )}
    );
  } else if(u.id==='haz'){
    if(!u._comeback){
      F.push(
        { key:'鱼叉穿刺', prob:0.70, cond:()=>true, make:()=> skill('鱼叉穿刺',1,'green','前方1格 20伤害 自身+10SP',
          (uu,aimDir)=> aimDir? range_forward_n(uu,1,aimDir) : (()=>{const a=[]; for(const d in DIRS) range_forward_n(uu,1,d).forEach(x=>a.push(x)); return a;})(),
          (uu,descOrTarget)=> {
            let tgt=null, dir=uu.facing;
            if(descOrTarget && descOrTarget.id) tgt=descOrTarget;
            else if(descOrTarget && descOrTarget.dir){ dir=descOrTarget.dir; const cell=forwardCellAt(uu,dir,1); if(cell) tgt=getUnitAt(cell.r,cell.c); }
            if(tgt) haz_HarpoonStab(uu,tgt); else appendLog('鱼叉穿刺 未命中');
          },
          {},
          {castMs:1100}
        )},
        { key:'深海猎杀', prob:0.60, cond:()=>true, make:()=> skill('深海猎杀',2,'red','前方3格内命中 25伤害 拉到面前 SP-10',
          (uu,aimDir)=> aimDir? range_forward_n(uu,3,aimDir) : (()=>{const a=[]; for(const d in DIRS) range_forward_n(uu,3,d).forEach(x=>a.push(x)); return a;})(),
          (uu,desc)=> haz_DeepHunt(uu,desc),
          {},
          {castMs:1200}
        )},
        { key:'猎神之叉', prob:0.65, cond:()=>true, make:()=> skill('猎神之叉',2,'red','5x5内选择敌人：瞬移至其身旁并造成20(50%概率x2)+15SP并施加流血(2)',
          (uu)=> range_square_n(uu,2),
          (uu,aim)=> { const tu = aim && aim.id ? aim : getUnitAt(aim.r, aim.c); if(tu && tu.side!=='enemy') haz_GodFork(uu,tu); else appendLog('猎神之叉 未命中'); },
          {},
          {cellTargeting:true, castMs:1200}
        )},
        { key:'锁链缠绕', prob:0.50, cond:()=>true, make:()=> skill('锁链缠绕',2,'green','2回合内伤害-40%，下次被打反击10SP，队伍+5SP',
          (uu)=>[{r:uu.r,c:uu.c,dir:uu.facing}],
          (uu)=> haz_ChainShield(uu),
          {},
          {castMs:600}
        )},
        { key:'鲸落', prob:0.30, cond:()=>true, make:()=> skill('鲸落',4,'red','自身中心5x5 50HP +20SP，并使目标下回合-1步（AOE不受掩体）',
          (uu)=> range_square_n(uu,2),
          (uu)=> haz_WhaleFall(uu),
          {aoe:true},
          {castMs:1300}
        )}
      );
    } else {
      F.push(
        { key:'深海猎杀', prob:0.70, cond:()=>true, make:()=> skill('深海猎杀',2,'red','前方3格内命中 25伤害 拉到面前 SP-10（力挽狂澜）',
          (uu,aimDir)=> aimDir? range_forward_n(uu,3,aimDir) : (()=>{const a=[]; for(const d in DIRS) range_forward_n(uu,3,d).forEach(x=>a.push(x)); return a;})(),
          (uu,desc)=> haz_DeepHunt(uu,desc),
          {},
          {castMs:1200}
        )},
        { key:'怨念滋生', prob:0.33, cond:()=>true, make:()=> skill('怨念滋生',1,'green','全图：对被猎杀标记目标 施加1流血+1恐惧',
          (uu)=>[{r:uu.r,c:uu.c,dir:uu.facing}],
          (uu)=> { if(!hazMarkedTargetId){ appendLog('怨念滋生：没有被标记的目标'); unitActed(uu); return; } const t=units[hazMarkedTargetId]; if(!t||t.hp<=0){ appendLog('怨念滋生：标记目标不存在或已倒下'); unitActed(uu); return; } addTempClassToCells([{r:t.r,c:t.c}],'highlight-tele',TELEGRAPH_MS); setTimeout(()=>{ t.status.bleed=(t.status.bleed||0)+1; t.status.paralyzed=(t.status.paralyzed||0)+1; appendLog(`${uu.name} 怨念滋生：对 ${t.name} 施加 1层流血 与 1层恐惧`); }, TELEGRAPH_MS); unitActed(uu); },
          {},
          {castMs:800}
        )},
        { key:'付出代价', prob:0.33, cond:()=>true, make:()=> skill('付出代价',2,'red','前刺3/穿刺4/横斩(横3x前2)，逐段即时结算',
          (uu,aimDir)=> aimDir? range_forward_n(uu,4,aimDir) : (()=>{const a=[]; for(const d in DIRS) range_forward_n(uu,4,d).forEach(x=>a.push(x)); return a;})(),
          (uu,desc)=> haz_PayThePrice(uu,desc),
          {aoe:true},
          {castMs:2000}
        )},
        { key:'仇恨之叉', prob:0.33, cond:()=>true, make:()=> skill('仇恨之叉',2,'red','横斩(横3x前2)+自身5x5重砸，逐段即时结算',
          (uu,aimDir)=> aimDir? forwardRectCentered(uu,aimDir,3,2) : (()=>{const a=[]; for(const d in DIRS) forwardRectCentered(uu,d,3,2).forEach(x=>a.push(x)); return a;})(),
          (uu,desc)=> haz_ForkOfHatred(uu,desc),
          {aoe:true},
          {castMs:1900}
        )}
      );
    }
  } else if(u.id==='katz'){
    if(!u.oppression){
      F.push(
        { key:'矛刺', prob:0.60, cond:()=>true, make:()=> skill('矛刺',1,'green','前方1格 20伤 自身+5SP',
          (uu,aimDir)=> aimDir? range_forward_n(uu,1,aimDir) : (()=>{const a=[]; for(const d in DIRS) range_forward_n(uu,1,d).forEach(x=>a.push(x)); return a;})(),
          (uu,desc)=>{ let tgt=null, dir=uu.facing; if(desc && desc.dir){ dir=desc.dir; const c=forwardCellAt(uu,dir,1); if(c) tgt=getUnitAt(c.r,c.c); } if(tgt) katz_Thrust(uu,tgt); else appendLog('矛刺 未命中'); },
          {},
          {castMs:1000}
        )},
        { key:'链式鞭击', prob:0.50, cond:()=>true, make:()=> skill('链式鞭击',2,'red','前方3格逐格 25伤 使下回合-1步',
          (uu,aimDir)=> aimDir? range_forward_n(uu,3,aimDir) : (()=>{const a=[]; for(const d in DIRS) range_forward_n(uu,3,d).forEach(x=>a.push(x)); return a;})(),
          (uu,desc)=> katz_ChainWhip(uu,desc),
          {},
          {castMs:1200}
        )},
        { key:'反复鞭尸', prob:0.50, cond:()=>true, make:()=> skill('反复鞭尸',3,'red','前方3格AOE：每轮10/15HP并+5SP，按SP百分比重复（最多5次）',
          (uu,aimDir)=> aimDir? range_forward_n(uu,3,aimDir) : (()=>{const a=[]; for(const d in DIRS) range_forward_n(uu,3,d).forEach(x=>a.push(x)); return a;})(),
          (uu,desc)=> katz_RepeatedWhip(uu,desc),
          {},
          {castMs:1400}
        )},
        { key:'终焉礼炮', prob:0.35, cond:()=>true, make:()=> skill('终焉礼炮',3,'red','直线5格 35HP（不受掩体）',
          (uu,aimDir)=> aimDir? range_forward_n(uu,5,aimDir) : (()=>{const a=[]; for(const d in DIRS) range_forward_n(uu,5,d).forEach(x=>a.push(x)); return a;})(),
          (uu,desc)=> katz_EndSalvo(uu,desc),
          {aoe:true},
          {castMs:1400}
        )}
      );
    } else {
      F.push(
        { key:'必须抹杀一切。。', prob:0.55, cond:()=>true, make:()=> skill('必须抹杀一切。。',2,'red','前方3格多段：20/30伤（自损5HP/段），每段+5SP（最多5段）',
          (uu,aimDir)=> aimDir? range_forward_n(uu,3,aimDir) : (()=>{const a=[]; for(const d in DIRS) range_forward_n(uu,3,d).forEach(x=>a.push(x)); return a;})(),
          (uu,desc)=> katz_MustErase(uu,desc),
          {aoe:true},
          {castMs:1800}
        )},
        { key:'终焉礼炮', prob:0.45, cond:()=>true, make:()=> skill('终焉礼炮',3,'red','直线5格 35HP（不受掩体）',
          (uu,aimDir)=> aimDir? range_forward_n(uu,5,aimDir) : (()=>{const a=[]; for(const d in DIRS) range_forward_n(uu,5,d).forEach(x=>a.push(x)); return a;})(),
          (uu,desc)=> katz_EndSalvo(uu,desc),
          {aoe:true},
          {castMs:1400}
        )}
      );
    }
  } else if(u.id==='tusk'){
    if(!u.oppression){
      F.push(
        { key:'骨盾猛击', prob:0.70, cond:()=>true, make:()=> skill('骨盾猛击',1,'green','邻格 10伤 击退1格',
          (uu,aimDir,aimCell)=> aimCell && mdist(uu,aimCell)===1? [{r:aimCell.r,c:aimCell.c,dir:cardinalDirFromDelta(aimCell.r-uu.r,aimCell.c-uu.c)}] : range_adjacent(uu),
          (uu,target)=> tusk_ShieldBash(uu,target),
          {},
          {castMs:1000}
        )},
        { key:'来自深海的咆哮', prob:0.50, cond:()=>true, make:()=> skill('来自深海的咆哮',2,'red','3x3范围 敌方SP -20',
          (uu)=> range_square_n(uu,1),
          (uu)=> tusk_DeepRoar(uu),
          {aoe:true},
          {castMs:1200}
        )},
        { key:'战争堡垒', prob:0.45, cond:()=>true, make:()=> skill('战争堡垒',2,'red','进入防御姿态：3回合内伤害-50%且每回合+10SP（期间无法移动）',
          (uu)=>[{r:uu.r,c:uu.c,dir:uu.facing}],
          (uu)=> tusk_WarFortress(uu),
          {},
          {castMs:700}
        )},
        { key:'牛鲨冲撞', prob:0.45, cond:()=>true, make:()=> skill('牛鲨冲撞',2,'blue','向一方向冲锋≤3格，撞击第一个敌人造成20伤并击退1格；否则移动到终点',
          (uu,aimDir)=> aimDir? range_forward_n(uu,3,aimDir) : (()=>{const a=[]; for(const d in DIRS) range_forward_n(uu,3,d).forEach(x=>a.push(x)); return a;})(),
          (uu,desc)=> tusk_BullCharge(uu,desc),
          {},
          {moveSkill:true, moveRadius:3, castMs:900}
        )}
      );
    } else {
      F.push(
        { key:'拼尽全力保卫队长', prob:0.60, cond:()=>true, make:()=> skill('拼尽全力保卫队长',2,'red','进入反伤姿态：3回合内伤害-40%、每回合+10SP、反弹30%所受HP伤（期间无法移动）',
          (uu)=>[{r:uu.r,c:uu.c,dir:uu.facing}],
          (uu)=> tusk_RetaliateGuard(uu),
          {},
          {castMs:700}
        )}
      );
    }
  } else if(u.id==='neyla'){
    if(!u.oppression){
      F.push(
        { key:'迅捷射击', prob:0.70, cond:()=>true, make:()=> skill('迅捷射击',1,'green','4格内单体 15HP +5SP',
          (uu,aimDir,aimCell)=> inRadiusCells(uu,4,{allowOccupied:true}).map(p=>({...p,dir:cardinalDirFromDelta(p.r-uu.r,p.c-uu.c)})),
          (uu,aim)=> neyla_SwiftShot(uu,aim),
          {aoe:false},
          {cellTargeting:true, castMs:1100}
        )},
        { key:'穿刺狙击', prob:0.60, cond:()=>true, make:()=> skill('穿刺狙击',2,'red','直线6格 穿透 30HP +流血',
          (uu,aimDir)=> aimDir? range_forward_n(uu,6,aimDir) : (()=>{const a=[]; for(const d in DIRS) range_forward_n(uu,6,d).forEach(x=>a.push(x)); return a;})(),
          (uu,desc)=> neyla_PierceSnipe(uu,desc),
          {aoe:true},
          {castMs:1200}
        )},
        { key:'双钩牵制', prob:0.45, cond:()=>true, make:()=> skill('双钩牵制',2,'red','前方3格优先最近：拉近1格并赋予恐惧（-1步）',
          (uu,aimDir)=> aimDir? range_forward_n(uu,3,aimDir) : (()=>{const a=[]; for(const d in DIRS) range_forward_n(uu,3,d).forEach(x=>a.push(x)); return a;})(),
          (uu,desc)=> neyla_DoubleHook(uu,desc),
          {},
          {castMs:1100}
        )},
        { key:'终末之影', prob:0.30, cond:()=>true, make:()=> makeNeylaEndShadowSkill(u) }
      );
    } else {
      F.push(
        { key:'终末之影', prob:0.50, cond:()=>true, make:()=> makeNeylaEndShadowSkill(u) },
        { key:'执行……', prob:0.55, cond:()=>true, make:()=> skill('执行……',2,'red','前方整排 20伤/20伤（第二枪<15%处决）；自身第一枪-15HP，第二枪-15HP-40SP',
          (uu,aimDir)=> aimDir? range_line(uu,aimDir) : (()=>{const a=[]; for(const d in DIRS) range_line(uu,d).forEach(x=>a.push(x)); return a;})(),
          (uu,desc)=> neyla_ExecuteHarpoons(uu,desc),
          {aoe:true},
          {castMs:1800}
        )}
      );
    }
  } else if(u.id==='kyn'){
    if(!u.oppression){
      F.push(
        { key:'迅影突刺', prob:0.60, cond:()=>true, make:()=> skill('迅影突刺',1,'green','5x5内任一敌人身边 20HP（≤25%处决，处决后返身）',
          (uu)=> range_square_n(uu,2),
          (uu,aim)=>{ const tu=getUnitAt(aim.r,aim.c); if(tu && tu.side!=='enemy') kyn_ShadowDash(uu,tu); },
          {aoe:false},
          {cellTargeting:true, castMs:1200}
        )},
        { key:'死亡宣告', prob:0.25, cond:()=>true, make:()=> skill('死亡宣告',3,'red','单体 50HP+30SP（≤30%处决，处决后返身）',
          (uu)=> inRadiusCells(uu,6,{allowOccupied:true}).map(p=>({...p,dir:uu.facing})),
          (uu,aim)=>{ const tu=getUnitAt(aim.r,aim.c); if(tu && tu.side!=='enemy') kyn_DeathCall(uu,tu); },
          {aoe:false},
          {cellTargeting:true, castMs:1200}
        )},
        { key:'割喉飞刃', prob:0.40, cond:()=>true, make:()=> skill('割喉飞刃',2,'red','4格内单体 20HP +流血1 +恐惧1',
          (uu,aimDir,aimCell)=> inRadiusCells(uu,4,{allowOccupied:true}).map(p=>({...p,dir:uu.facing})),
          (uu,aim)=> kyn_ThroatBlade(uu,aim),
          {aoe:false},
          {cellTargeting:true, castMs:900}
        )},
        { key:'影杀之舞', prob:0.50, cond:()=>true, make:()=> skill('影杀之舞',2,'red','3x3 AOE 30HP（不受掩体）并立刻免费位移1格（常态）',
          (uu)=>[{r:uu.r,c:uu.c,dir:uu.facing}],
          (uu)=> kyn_ShadowDance_AOE(uu),
          {aoe:true},
          {castMs:1200}
        )}
      );
    } else {
      F.push(
        { key:'自我了断。。', prob:0.40, cond:()=>true, make:()=> skill('自我了断。。',2,'red','5x5内任意敌人：瞬杀，自己HP清零（压迫）',
          (uu)=> range_square_n(uu,2),
          (uu,aim)=>{ const tu=getUnitAt(aim.r,aim.c); if(tu && tu.side!=='enemy'){ damageUnit(tu.id, tu.hp, 0, `${uu.name} 自我了断 秒杀 ${tu.name}`, uu.id); damageUnit(uu.id, uu.hp, 0, `${uu.name} 生命燃尽`, uu.id, {ignoreToughBody:true}); } unitActed(uu); },
          {aoe:false},
          {cellTargeting:true, castMs:1100}
        )}
      );
    }
  }
  return F;
}
function drawOneSkill(u){
  const fset = buildSkillFactoriesForUnit(u);
  const viable = fset.filter(f=>f.cond());
  if(viable.length===0) return null;
  for(let i=0;i<30;i++){ const f=viable[Math.floor(Math.random()*viable.length)]; if(Math.random()<f.prob) return f.make(); }
  viable.sort((a,b)=> b.prob-a.prob);
  return viable[0].make();
}
function drawSkills(u, n){
  let toDraw = Math.max(0, Math.min(n, SKILLPOOL_MAX - u.skillPool.length));
  while(toDraw>0){ const sk=drawOneSkill(u); if(!sk) break; u.skillPool.push(sk); toDraw--; }
  if(u.skillPool.length > SKILLPOOL_MAX) u.skillPool.length = SKILLPOOL_MAX;
}
function ensureStartHand(u){ if(u.dealtStart) return; u.skillPool.length = 0; drawSkills(u, START_HAND_COUNT); u.dealtStart = true; appendLog(`${u.name} 起手手牌：${u.skillPool.map(s=>s.name).join(' / ')}`); }

// —— GOD’S WILL —— 
function disarmGodsWill(){
  godsWillArmed = false;
  if(godsWillBtn) godsWillBtn.classList.remove('armed');
  if(godsWillMenuEl){ godsWillMenuEl.remove(); godsWillMenuEl = null; }
  appendLog('GOD’S WILL：退出选取模式');
}
function showGodsWillMenuAtUnit(u){
  if(!battleAreaEl || !u || u.hp<=0){ appendLog('GOD’S WILL：目标无效或已倒下'); disarmGodsWill(); return; }
  if(godsWillMenuEl){ godsWillMenuEl.remove(); godsWillMenuEl=null; }
  const p = getCellCenter(u.r, u.c);
  const areaRect = battleAreaEl.getBoundingClientRect();
  godsWillMenuEl = document.createElement('div');
  godsWillMenuEl.className = 'gods-menu';
  godsWillMenuEl.style.left = `${Math.max(8, p.x + areaRect.left + 8)}px`;
  godsWillMenuEl.style.top  = `${Math.max(8, p.y + areaRect.top  - 8)}px`;
  godsWillMenuEl.innerHTML = `
    <div class="title">GOD’S WILL → ${u.name}</div>
    <div class="row">
      <button class="kill">杀死</button>
      <button class="onehp">留 1 HP</button>
      <button class="cancel">取消</button>
    </div>
  `;
  godsWillMenuEl.querySelector('.kill').onclick = (e)=>{
    e.stopPropagation();
    const before = u.hp;
    u.hp = 0;
    appendLog(`GOD’S WILL：${u.name} 被直接抹除（-${before} HP）`);
    cameraShake(); showHitFX(u.r,u.c); showDamageFloat(u.r,u.c,before,0);
    checkHazComebackStatus();
    renderAll();
    disarmGodsWill();
  };
  godsWillMenuEl.querySelector('.onehp').onclick = (e)=>{
    e.stopPropagation();
    if(u.hp>1){
      const delta = u.hp - 1;
      u.hp = 1;
      appendLog(`GOD’S WILL：${u.name} 被压到 1 HP（-${delta} HP）`);
      cameraShake(); showHitFX(u.r,u.c); showDamageFloat(u.r,u.c,delta,0);
    } else {
      appendLog(`GOD’S WILL：${u.name} 已是 1 HP`);
    }
    checkHazComebackStatus();
    renderAll();
    disarmGodsWill();
  };
  godsWillMenuEl.querySelector('.cancel').onclick = (e)=>{ e.stopPropagation(); disarmGodsWill(); };
  document.body.appendChild(godsWillMenuEl);
}
function toggleGodsWill(){
  godsWillArmed = !godsWillArmed;
  if(godsWillBtn){
    if(godsWillArmed){
      godsWillBtn.classList.add('armed');
      appendLog('GOD’S WILL：已开启，点击任意单位选择“杀死/留 1 HP”，ESC 可取消');
    } else {
      godsWillBtn.classList.remove('armed');
      appendLog('GOD’S WILL：关闭');
    }
  }
  if(!godsWillArmed && godsWillMenuEl){ godsWillMenuEl.remove(); godsWillMenuEl=null; }
}
// 全屏切换（原生优先，失败时启用模拟全屏）
function setSimFullscreen(on){
  isSimFullscreen = !!on;
  document.documentElement.classList.toggle('fs-sim', on);
  document.body.classList.toggle('fs-sim', on);
  if(fsBtn){
    fsBtn.classList.toggle('on', on || !!document.fullscreenElement);
    fsBtn.textContent = (on || document.fullscreenElement) ? 'Exit Full Screen' : 'Full Screen';
  }
  // 刷新覆盖
  setTimeout(()=> refreshLargeOverlays(), 80);
}
function toggleFullscreen(){
  if(document.fullscreenElement){
    document.exitFullscreen().finally(()=> setSimFullscreen(false));
    return;
  }
  if(document.documentElement.requestFullscreen){
    document.documentElement.requestFullscreen().then(()=>{
      setSimFullscreen(false);
    }).catch(()=>{
      setSimFullscreen(!isSimFullscreen);
    });
  } else {
    setSimFullscreen(!isSimFullscreen);
  }
}
document.addEventListener('fullscreenchange', ()=>{
  if(fsBtn){
    fsBtn.classList.toggle('on', !!document.fullscreenElement);
    fsBtn.textContent = document.fullscreenElement ? 'Exit Full Screen' : 'Full Screen';
  }
  setTimeout(()=> refreshLargeOverlays(), 80);
});

// —— UI/交互 —— 
function buildGrid(){
  if(!battleAreaEl) return;
  // 确保 --cell 可用，避免“无角色/看不到格子”
  battleAreaEl.style.setProperty('--cell', `${CELL_SIZE}px`);
  battleAreaEl.style.gridTemplateColumns = `repeat(${COLS}, var(--cell))`;
  battleAreaEl.style.gridTemplateRows = `repeat(${ROWS}, var(--cell))`;
  battleAreaEl.innerHTML = '';
  for(let r=1;r<=ROWS;r++){
    for(let c=1;c<=COLS;c++){
      const cell = document.createElement('div');
      cell.className = 'cell';
      if(isVoidCell(r,c)) cell.classList.add('void');
      if(isCoverCell(r,c)) cell.classList.add('cover');
      cell.dataset.r=r; cell.dataset.c=c;
      const coord=document.createElement('div'); coord.className='coord'; coord.textContent=`${r},${c}`; cell.appendChild(coord);

      cell.addEventListener('click', ()=>{
        if(interactionLocked) return;
        const rr=+cell.dataset.r, cc=+cell.dataset.c;
        if(_skillSelection){
          handleSkillConfirmCell(_skillSelection.unit,_skillSelection.skill,{r:rr,c:cc});
          return;
        }
        const occ = getUnitAt(rr,cc);
        if(occ){
          if(godsWillArmed){ showGodsWillMenuAtUnit(occ); return; }
          onUnitClick(occ.id); return;
        }
        onCellClick(rr,cc);
      });
      cell.addEventListener('mouseenter', ()=>{
        if(interactionLocked) return;
        if(_skillSelection){
          const rr=+cell.dataset.r, cc=+cell.dataset.c;
          handleSkillPreviewCell(_skillSelection.unit,_skillSelection.skill,{r:rr,c:cc});
        }
      });
      cell.addEventListener('contextmenu', (e)=>{ e.preventDefault(); if(interactionLocked) return; clearSkillAiming(); renderAll(); });
      battleAreaEl.appendChild(cell);
    }
  }
}
function refreshLargeOverlays(){
  if(!battleAreaEl) return;
  battleAreaEl.querySelectorAll('.largeOverlay').forEach(n=>n.remove());
  for(const id in units){
    const u=units[id];
    if(u && u.hp>0 && u.size===2){
      renderLargeUnitOverlay(u);
    }
  }
}
function placeUnits(){
  if(!battleAreaEl) return;
  document.querySelectorAll('.cell .unit').forEach(n=>n.remove());
  battleAreaEl.querySelectorAll('.largeOverlay').forEach(n=>n.remove());

  for(const id in units){
    const u=units[id]; if(u.hp<=0) continue;

    if(u.size===2){
      renderLargeUnitOverlay(u);
      continue;
    }

    const sel=`.cell[data-r="${u.r}"][data-c="${u.c}"]`;    const cell=document.querySelector(sel);
    if(!cell) continue;
    const div=document.createElement('div');
    div.className='unit ' + (u.side==='player'?'player':'enemy');
    div.dataset.id=id;
    if(u.id==='haz'){
      div.classList.add('hazUnit');
      if(u._comeback) div.classList.add('comeback');
    }

    div.addEventListener('click',(e)=>{
      if(interactionLocked) return;
      if(godsWillArmed){
        e.stopPropagation();
        showGodsWillMenuAtUnit(u);
        return;
      }
      if(_skillSelection){
        e.stopPropagation();
        handleSkillConfirmCell(_skillSelection.unit,_skillSelection.skill,{r:u.r,c:u.c});
        return;
      }
      e.stopPropagation();
      onUnitClick(id);
    });

    const hpPct = Math.max(0, Math.min(100, (u.hp/u.maxHp*100)||0));
    const spPct = Math.max(0, Math.min(100, (u.maxSp ? (u.sp/u.maxSp*100) : 0)));
    const aura = (u.id==='haz') ? '<div class="hazParticles"></div>' : '';
    div.innerHTML = `
      ${aura}
      <div class="name">${u.name}</div>
      <div class="hpbar"><div class="hpfill" style="width:${hpPct}%"></div></div>
      <div class="spbar"><div class="spfill" style="width:${spPct}%"></div></div>
    `;
    cell.appendChild(div);
  }
}

//part 1 结束
function renderLargeUnitOverlay(u){
  if(!battleAreaEl) return;

  const cells = getCoveredCells(u);
  const allVisible = cells.every(c=> !!getCellEl(c.r, c.c));
  if(!allVisible) return;

  const overlay = document.createElement('div');
  overlay.className = 'largeOverlay ' + (u.side==='player'?'player':'enemy');
  overlay.dataset.id = u.id;
  overlay.style.position = 'absolute';

  const span = CELL_SIZE * u.size + GRID_GAP * (u.size - 1);
  const left = BOARD_BORDER + BOARD_PADDING + (u.c - 1) * (CELL_SIZE + GRID_GAP);
  const top = BOARD_BORDER + BOARD_PADDING + (u.r - 1) * (CELL_SIZE + GRID_GAP);
  overlay.style.left = `${left}px`;
  overlay.style.top = `${top}px`;
  overlay.style.width = `${span}px`;
  overlay.style.height = `${span}px`;
  overlay.style.background = (u.side==='player')?'rgba(82,196,26,0.15)':'rgba(245,34,45,0.12)';
  overlay.style.border = '1px solid rgba(255,255,255,0.25)';
  overlay.style.borderRadius = '10px';
  overlay.style.color = '#fff';
  overlay.style.display='flex';
  overlay.style.flexDirection='column';
  overlay.style.justifyContent='center';
  overlay.style.alignItems='center';
  overlay.style.pointerEvents='auto';

  overlay.addEventListener('click',(e)=>{
    if(interactionLocked) return;
    e.stopPropagation();
    if(godsWillArmed){ showGodsWillMenuAtUnit(u); return; }
    if(_skillSelection){
      // 智能将瞄准点映射到 2x2 覆盖的可行格
      const attacker = _skillSelection.unit;
      const skill = _skillSelection.skill;
      const aim = chooseBestAimCellForLargeTarget(attacker, skill, u) || {r:u.r, c:u.c};
      handleSkillConfirmCell(attacker, skill, aim);
      return;
    }
    onUnitClick(u.id);
  });

  const hpPct = Math.max(0, Math.min(100, (u.hp/u.maxHp*100)||0));
  const spPct = Math.max(0, Math.min(100, (u.maxSp ? (u.sp/u.maxSp*100) : 0)));
  overlay.innerHTML = `
    <div class="title">${u.name}</div>
    <div class="hpbar" style="width:90%;height:6px;background:rgba(255,255,255,0.08);border-radius:4px;overflow:hidden;">
      <div class="hpfill" style="height:100%;width:${hpPct}%;background:#ff4d4f;"></div>
    </div>
    <div class="spbar" style="width:90%;height:6px;background:rgba(255,255,255,0.08);border-radius:4px;overflow:hidden;margin-top:4px;">
      <div class="spfill" style="height:100%;width:${spPct}%;background:#40a9ff;"></div>
    </div>
  `;

  battleAreaEl.appendChild(overlay);
}

// —— 大体型（2x2）瞄准辅助 —— 
function getCoveredCells(u){
  if(!u || u.hp<=0) return [];
  if(u.size===2) return [{r:u.r,c:u.c},{r:u.r+1,c:u.c},{r:u.r,c:u.c+1},{r:u.r+1,c:u.c+1}];
  return [{r:u.r,c:u.c}];
}
function chooseBestAimCellForLargeTarget(attacker, sk, target){
  if(!attacker || !sk || !target) return null;
  const cells = getCoveredCells(target);
  // 优先：在技能范围内且与攻击者最近的覆盖格
  let best=null, bestD=1e9;
  for(const c of cells){
    const dir = resolveAimDirForSkill(attacker, sk, c);
    let inRange=false;
    try{
      const rc = sk.rangeFn(attacker, dir, c) || [];
      inRange = rangeIncludeCell(rc, c);
    }catch(e){ inRange=false; }
    if(inRange){
      const d = mdist(attacker, c);
      if(d < bestD){ bestD=d; best=c; }
    }
  }
  if(best) return best;
  // 兜底：返回最近覆盖格
  let nearest=cells[0], nd=mdist(attacker, cells[0]);
  for(const c of cells){ const d=mdist(attacker,c); if(d<nd){ nd=d; nearest=c; } }
  return nearest;
}

function summarizeNegatives(u){
  let parts=[];
  if(u._staggerStacks && (u.stunThreshold||1)>1) parts.push(`叠层${u._staggerStacks}/${u.stunThreshold}`);
  if(u.status.stunned>0) parts.push(`眩晕x${u.status.stunned}`);
  if(u.status.paralyzed>0) parts.push(`恐惧x${u.status.paralyzed}`);
  if(u.status.bleed>0) parts.push(`流血x${u.status.bleed}`);
  if(u.status.hazBleedTurns>0) parts.push(`Haz流血x${u.status.hazBleedTurns}`);
  if(u.status.recoverStacks>0) parts.push(`恢复x${u.status.recoverStacks}`);
  if(u._spBroken) parts.push(`SP崩溃`);
  if(hazMarkedTargetId && u.id === hazMarkedTargetId) parts.push('猎杀标记');
  if(u._stanceType && u._stanceTurns>0){
    parts.push(u._stanceType==='defense' ? `防御姿态(${u._stanceTurns})` : `反伤姿态(${u._stanceTurns})`);
  }
  return parts.join(' ');
}
function renderStatus(){
  if(!partyStatus) return;
  partyStatus.innerHTML='';
  for(const id of ['adora','dario','karma']){
    const u=units[id]; if(!u) continue;
    const el=document.createElement('div'); el.className='partyRow';
    el.innerHTML=`<strong>${u.name}</strong> HP:${u.hp}/${u.maxHp} SP:${u.sp}/${u.maxSp} ${summarizeNegatives(u)}`;
    partyStatus.appendChild(el);
  }
  const enemyWrap=document.createElement('div'); enemyWrap.style.marginTop='10px'; enemyWrap.innerHTML='<strong>敌方（七海作战队）</strong>';
  const enemyUnits = Object.values(units).filter(u=>u.side==='enemy' && u.hp>0);
  for(const u of enemyUnits){
    const el=document.createElement('div'); el.className='partyRow small';
    el.innerHTML=`${u.name} HP:${u.hp}/${u.maxHp} SP:${u.sp}/${u.maxSp} ${u.oppression?'[压迫] ':''}${u._comeback?'[力挽狂澜] ':''}${summarizeNegatives(u)}`;
    enemyWrap.appendChild(el);
  }
  partyStatus.appendChild(enemyWrap);
}
function updateStepsUI(){
  if(playerStepsEl) playerStepsEl.textContent=playerSteps;
  if(enemyStepsEl) enemyStepsEl.textContent=enemySteps;
  if(roundCountEl) roundCountEl.textContent = String(roundsPassed);
}

// —— 选中/瞄准 —— 
function canUnitMove(u){
  if(!u) return false;
  if(u._stanceType && u._stanceTurns>0) return false; // 姿态期间禁止移动
  return true;
}
function clearSkillAiming(){ _skillSelection=null; clearHighlights(); }
function clearAllSelection(){ _skillSelection=null; selectedUnitId=null; clearHighlights(); if(skillPool) skillPool.innerHTML=''; if(selectedInfo) selectedInfo.innerHTML=''; }
function startSkillAiming(u,sk){
  if(interactionLocked || !u || u.hp<=0) return;
  clearHighlights();
  _skillSelection={unit:u,skill:sk};
  appendLog(`${u.name} 选择了技能：${sk.name}，移动鼠标到目标格以预览并点击`);
  handleSkillPreviewCell(u,sk,{r:u.r,c:u.c});
}
function rangeIncludeCell(cells, aimCell){ return cells.some(c=>c.r===aimCell.r && c.c===aimCell.c); }
function resolveAimDirForSkill(u, sk, aimCell){
  const vecDir = cardinalDirFromDelta(aimCell.r - u.r, aimCell.c - u.c);
  try{
    const cells = sk.rangeFn(u, vecDir, aimCell) || [];
    if(rangeIncludeCell(cells, aimCell)) return vecDir;
  }catch(e){}
  for(const dir of Object.keys(DIRS)){
    let cells=[];
    try{ cells = sk.rangeFn(u, dir, aimCell) || []; }catch(e){ cells=[]; }
    if(rangeIncludeCell(cells, aimCell)) return dir;
  }
  return vecDir;
}
function handleSkillPreviewCell(u, sk, aimCell){
  if(interactionLocked || !u || u.hp<=0) return;
  clearHighlights();
  const aimDir = resolveAimDirForSkill(u, sk, aimCell);
  const cells = sk.rangeFn(u, aimDir, aimCell) || [];
  for(const c of cells) markCell(c.r,c.c,'skill');
  const inPreview = rangeIncludeCell(cells, aimCell);
  if(inPreview) markCell(aimCell.r, aimCell.c, 'target');
}
function consumeCardFromHand(u, sk){ if(!u || !u.skillPool) return; const idx=u.skillPool.indexOf(sk); if(idx>=0) u.skillPool.splice(idx,1); }
function discardSkill(u, sk){
  if(interactionLocked) return;
  if(!u || !sk) return;
  if(u.side !== currentSide){ appendLog('现在不是你的回合'); return; }
  if(u.hp<=0){ appendLog('该单位已无法行动'); return; }
  if(_skillSelection && _skillSelection.unit===u && _skillSelection.skill===sk){ clearSkillAiming(); }
  consumeCardFromHand(u, sk);
  appendLog(`${u.name} 弃置了技能：${sk.name}`);
  renderAll(); showSelected(u);
}
function handleSkillConfirmCell(u, sk, aimCell){
  if(interactionLocked || !u || u.hp<=0) return;
  if(!_skillSelection) return;

  if(sk.meta && sk.meta.moveSkill && !canUnitMove(u)){
    appendLog(`${u.name} 处于姿态中，无法进行任何移动`);
    clearSkillAiming(); renderAll(); return;
  }

  if(sk.meta && sk.meta.requireConsec && (u.consecAttacks||0) < sk.meta.requireConsec){
    appendLog(`未满足使用条件：需要当前连击 ≥ ${sk.meta.requireConsec}`);
    clearSkillAiming(); renderAll(); return;
  }

  const currentSteps = (u.side==='player')? playerSteps : enemySteps;
  if(sk.cost > currentSteps){ appendLog('步数不足'); clearSkillAiming(); renderAll(); return; }

  const aimDir = resolveAimDirForSkill(u, sk, aimCell);
  const cells = sk.rangeFn(u, aimDir, aimCell) || [];
  if(!rangeIncludeCell(cells, aimCell)){ appendLog('该格不在技能范围内'); return; }

  if(u.side==='player'){ playerSteps = Math.max(0, playerSteps - sk.cost); } else { enemySteps = Math.max(0, enemySteps - sk.cost); }

  const targetUnit = getUnitAt(aimCell.r, aimCell.c);
  try{
    if(sk.meta && sk.meta.moveSkill) sk.execFn(u, {moveTo: aimCell});
    else if(sk.meta && sk.meta.cellTargeting) sk.execFn(u, aimCell);
    else if(sk.estimate && sk.estimate.aoe) sk.execFn(u, {dir:aimDir});
    else if(targetUnit) sk.execFn(u, targetUnit);
    else sk.execFn(u, {r:aimCell.r,c:aimCell.c,dir:aimDir});
  }catch(e){ console.error('技能执行错误',e); appendLog(`[错误] 技能执行失败：${sk.name} - ${e.message}`); }

  consumeCardFromHand(u, sk);
  clearSkillAiming();
  renderAll();
  showSelected(u);

  if(u.id==='karma' && sk.name!=='沙包大的拳头'){
    if(u.consecAttacks>0) appendLog(`${u.name} 的连击被打断（使用其他技能）`);
    u.consecAttacks = 0;
  }

  unitActed(u);
  setTimeout(()=>{ checkEndOfTurn(); }, 220);
}
function onUnitClick(id){
  if(interactionLocked) return;
  const u=units[id]; if(!u) return;
  if(godsWillArmed){ showGodsWillMenuAtUnit(u); return; }
  if(u.side==='enemy' && ENEMY_IS_AI_CONTROLLED){ appendLog('敌方单位由 AI 控制，无法手动操作'); selectedUnitId=id; showSelected(u); return; }
  if(u.side===currentSide && u.status.stunned) appendLog(`${u.name} 眩晕中，无法行动`);
  selectedUnitId=id; showSelected(u);
}
function onCellClick(r,c){
  if(interactionLocked) return;
  if(_skillSelection) return;
  if(!selectedUnitId) {
    if(godsWillArmed){ appendLog('GOD’S WILL：请直接点击单位，而非空格'); }
    return;
  }
  const sel=units[selectedUnitId]; if(!sel || sel.hp<=0) return;

  if(sel.side==='enemy' && ENEMY_IS_AI_CONTROLLED){ appendLog('敌方单位由 AI 控制'); return; }
  if(sel.side!==currentSide){ appendLog('不是该单位的回合'); return; }
  if(sel.status.stunned){ appendLog(`${sel.name} 眩晕中，无法行动`); return; }
  if(!canUnitMove(sel)){ appendLog(`${sel.name} 处于${sel._stanceType==='defense'?'防御姿态':'反伤姿态'}，本回合不能移动`); return; }

  const key=`${r},${c}`; if(!highlighted.has(key)) return;
  if(playerSteps<=0 && sel.side==='player'){ appendLog('剩余步数不足'); return; }
  const occ=getUnitAt(r,c); if(occ){ appendLog('格子被占用'); return; }

  if(sel.size===2){ if(!canPlace2x2(sel, r, c)){ appendLog('该位置无法容纳 2x2 单位'); return; } }

  sel.facing = (c>sel.c)?'right':(c<sel.c?'left':sel.facing);
  sel.r=r; sel.c=c;
  if(sel.side==='player') playerSteps=Math.max(0, playerSteps-1); else enemySteps=Math.max(0, enemySteps-1);
  appendLog(`${sel.name} 移动到 (${r},${c})`);
  if(sel.side!=='player') cameraFocusOnCell(r,c);
  pulseCell(r,c);
  if(sel.id==='karma' && sel.consecAttacks>0){ appendLog(`${sel.name} 的连击被打断（移动）`); sel.consecAttacks=0; }
  unitActed(sel);
  clearHighlights(); renderAll(); showSelected(sel);
  setTimeout(()=>{ checkEndOfTurn(); }, 160);
}
function showSelected(u){
  clearSkillAiming();
  const base=`<strong>${u.name}</strong><br>HP: ${u.hp}/${u.maxHp} SP:${u.sp}/${u.maxSp} 级别:${u.level} ${summarizeNegatives(u)}`;
  let extra='';
  if(u.skillPool && u.skillPool.length){ extra += `<div class="partyRow small">手牌(${u.skillPool.length}/${SKILLPOOL_MAX}): ${u.skillPool.map(s=>s.name).join(' / ')}</div>`; }
  if(selectedInfo) selectedInfo.innerHTML = base + extra;

  if(skillPool){
    if(u.side==='enemy'){ skillPool.innerHTML = `<div class="partyRow small">敌方单位（AI 控制），无法操作</div>`; }
    else if(currentSide!=='player'){ skillPool.innerHTML = `<div class="partyRow small">不是你的回合</div>`; }
    else {
      skillPool.innerHTML = '';
      if(!u.dealtStart) ensureStartHand(u);
      const pool = u.skillPool || [];
      for(const sk of pool){
        const stepsOk = playerSteps>=sk.cost;
        const colorClass = sk.color || ((sk.meta && sk.meta.moveSkill) ? 'blue' : (sk.cost>=3 ? 'red' : 'green'));

        const card=document.createElement('div');
        card.className='skillCard '+colorClass;
        if(!stepsOk) card.classList.add('disabled');

        const header=document.createElement('div');
        header.style.display='flex';
        header.style.alignItems='center';
        header.style.justifyContent='space-between';

        const leftBox=document.createElement('div');
        leftBox.innerHTML = `<strong>${sk.name}</strong><div class="small">${sk.desc||''}</div>`;

        const rightBox=document.createElement('div');
        rightBox.textContent = `${sk.cost} 步`;

        const discardBtn=document.createElement('button');
        discardBtn.textContent='弃置';
        discardBtn.className='discardBtn';
        discardBtn.style.marginLeft='8px';
        discardBtn.style.fontSize='12px';
        discardBtn.style.padding='2px 6px';
        discardBtn.addEventListener('click',(e)=>{ e.stopPropagation(); if(interactionLocked) return; discardSkill(u, sk); });

        const rightWrap=document.createElement('div');
        rightWrap.style.display='flex';
        rightWrap.style.alignItems='center';
        rightWrap.style.gap='6px';
        rightWrap.appendChild(rightBox);
        rightWrap.appendChild(discardBtn);

        header.appendChild(leftBox);
        header.appendChild(rightWrap);
        card.appendChild(header);

        card.addEventListener('contextmenu',(e)=>{ e.preventDefault(); if(interactionLocked) return; discardSkill(u,sk); });
        card.addEventListener('click', ()=>{
          if(interactionLocked) return;
          if(!stepsOk){ appendLog('步数不足'); return; }
          if(u.status.stunned){ appendLog(`${u.name} 眩晕中`); return; }
          if(u.hp<=0){ appendLog(`${u.name} 已阵亡，无法行动`); return; }
          if(sk.meta && sk.meta.moveSkill && !canUnitMove(u)){ appendLog(`${u.name} 处于姿态中，无法移动`); return; }
          startSkillAiming(u, sk);
        });

        skillPool.appendChild(card);
      }
    }
  }

  clearHighlights();
  if(u.side===currentSide && !u.status.stunned && u.side==='player' && canUnitMove(u)){
    const moves=range_move_radius(u,1).filter(p=>!getUnitAt(p.r,p.c));
    for(const m of moves){ const key=`${m.r},${m.c}`; highlighted.add(key); markCell(m.r,m.c,'move'); }
  }
}
function clearHighlights(){ highlighted.clear(); document.querySelectorAll('.cell').forEach(cell=>cell.classList.remove('highlight-move','highlight-skill','highlight-skill-target','pulse','highlight-tele','highlight-imp','highlight-stage')); }
function markCell(r,c,kind){
  const cell=getCellEl(r,c);
  if(cell && !cell.classList.contains('void')){
    cell.classList.add(kind==='move'?'highlight-move':(kind==='target'?'highlight-skill-target':'highlight-skill'));
  }
}

// —— 回合与被动（含“恢复”/Neyla 保底/姿态结算） —— 
function applyParalysisAtTurnStart(side){
  const team = Object.values(units).filter(u=>u.side===side && u.hp>0);
  let totalPar = team.reduce((s,u)=> s + (u.status.paralyzed||0), 0);
  if(totalPar>0){
    if(side==='player'){ const before=playerSteps; playerSteps = Math.max(0, playerSteps - totalPar); appendLog(`恐惧/减步：玩家 -${totalPar} 步（${before} -> ${playerSteps}）`); }
    else { const before=enemySteps; enemySteps = Math.max(0, enemySteps - totalPar); appendLog(`恐惧/减步：敌方 -${totalPar} 步（${before} -> ${enemySteps}）`); }
    for(const u of team) u.status.paralyzed = 0;
    updateStepsUI();
  }
}
function avg(arr){ if(!arr || arr.length===0) return null; return Math.floor(arr.reduce((s,u)=>s+u.level,0)/arr.length); }
function applyLevelSuppression(){
  const playerAvg = avg(Object.values(units).filter(u=>u.side==='player' && u.hp>0));
  const enemyAvg  = avg(Object.values(units).filter(u=>u.side==='enemy' && u.hp>0));
  if(playerAvg===null||enemyAvg===null) return;
  if(playerAvg>enemyAvg){ const add=Math.floor((playerAvg-enemyAvg)/5); if(add>0){ playerSteps += add; appendLog(`等级压制：玩家 +${add} 步`); } }
  else if(enemyAvg>playerAvg){ const add=Math.floor((enemyAvg-playerAvg)/5); if(add>0){ enemySteps += add; appendLog(`敌方 +${add} 步（等级压制）`); } }
  updateStepsUI();
}
function processUnitsTurnStart(side){
  if(side==='enemy'){
    if(roundsPassed % 2 === 0){
      const haz = units['haz'];
      if(haz && haz.hp>0){ haz.sp = Math.min(haz.maxSp, haz.sp+10); haz._spBroken = (haz.sp<=0); showGainFloat(haz.r,haz.c,0,10); appendLog('队员们听令！Haz +10SP'); }
      for(const id in units){
        const v=units[id]; if(v.team==='seven' && v.hp>0 && v.id!=='haz'){ v.sp = Math.min(v.maxSp, v.sp+5); v._spBroken=(v.sp<=0); showGainFloat(v.r,v.c,0,5); }
      }
      appendLog('队员们听令！其他队员 +5SP');
    }
    if(roundsPassed >= 20){
      for(const id of ['katz','tusk','neyla','kyn']){
        const v=units[id];
        if(v && v.hp>0 && !v.oppression){
          v.oppression = true;
          v.skillPool.length = 0;
          v.dealtStart = false;
          ensureStartHand(v);
          if(v.id==='neyla') ensureNeylaEndShadowGuarantee(v);
          appendLog(`${v.name} 获得“队长的压迫”：开始使用禁忌技能`);
        }
      }
    }
  }

  for(const id in units){
    const u=units[id];
    if(u.side!==side || u.hp<=0) continue;

    u.actionsThisTurn = 0;
    u.turnsStarted = (u.turnsStarted||0) + 1;

    const extraDraw = Math.max(0, u.turnsStarted - 1);
    if(extraDraw>0) drawSkills(u, extraDraw);

    // Neyla 压迫后每回合保证“终末之影”在手牌，且最多一张
    if(u.id==='neyla' && u.oppression){ ensureNeylaEndShadowGuarantee(u); }

    // 姿态：回合开始时结算SP恢复与持续回合-1；结束时主动清除
    if(u._stanceType && u._stanceTurns>0){
      if(u._stanceSpPerTurn>0){
        const beforeSP = u.sp;
        u.sp = Math.min(u.maxSp, u.sp + u._stanceSpPerTurn);
        u._spBroken = (u.sp<=0);
        showGainFloat(u.r,u.c,0,u.sp-beforeSP);
        appendLog(`${u.name} 的${u._stanceType==='defense'?'防御':'反伤'}姿态：+${u._stanceSpPerTurn} SP`);
      }
      u._stanceTurns = Math.max(0, u._stanceTurns - 1);
      if(u._stanceTurns===0){
        clearStance(u);
      }
    }

    if(u.spPendingRestore!=null){
      const val = Math.min(u.maxSp, u.spPendingRestore);
      u.sp = val; u._spBroken = (u.sp<=0); u.spPendingRestore = null;
      appendLog(`${u.name} 的 SP 自动恢复至 ${val}`); showGainFloat(u.r,u.c,0,val);
      if(u.id==='haz'){
        const heal = Math.max(1, Math.floor(u.maxHp*0.05));
        u.hp = Math.min(u.maxHp, u.hp + heal);
        appendLog(`Haz 因SP恢复同时回复 ${heal} HP`); showGainFloat(u.r,u.c,heal,0);
      }
    }

    // “恢复”
    if(u.status.recoverStacks && u.status.recoverStacks > 0){
      const before = u.hp;
      u.hp = Math.min(u.maxHp, u.hp + 5);
      u.status.recoverStacks = Math.max(0, u.status.recoverStacks - 1);
      showGainFloat(u.r,u.c,u.hp-before,0);
      appendLog(`${u.name} 的“恢复”触发：+5HP（剩余 ${u.status.recoverStacks}）`);
    }

    if(u.status.bleed && u.status.bleed>0){
      const bleedDmg = Math.max(1, Math.floor(u.maxHp*0.05));
      damageUnit(u.id, bleedDmg, 0, `${u.name} 因流血受损`, null);
      u.status.bleed = Math.max(0, u.status.bleed-1);
    }
    if(u.status.hazBleedTurns && u.status.hazBleedTurns>0){
      const bleedDmg = Math.max(1, Math.floor(u.maxHp*0.03));
      damageUnit(u.id, bleedDmg, 0, `${u.name} 因Haz流血受损`, null);
      u.status.hazBleedTurns = Math.max(0, u.status.hazBleedTurns-1);
    }

    // 老的堡垒兼容（现在已由姿态系统取代）
    if(u.id==='tusk' && u._fortressTurns>0){
      u.sp = Math.min(u.maxSp, u.sp+10);
      u._spBroken = (u.sp<=0);
      showGainFloat(u.r,u.c,0,10);
      u._fortressTurns--;
    }
  }

  checkHazComebackStatus();
}
function processUnitsTurnEnd(side){
  for(const id in units){
    const u=units[id];
    if(u.side!==side) continue;
    if(u.id==='adora' && u.passives.includes('calmAnalysis')){
      if((u.actionsThisTurn||0)===0){
        u.sp = Math.min(u.maxSp, u.sp + 10);
        u._spBroken = (u.sp<=0);
        appendLog('Adora 冷静分析：+10SP'); showGainFloat(u.r,u.c,0,10);
      }
    }
    if(u.id==='karma' && u.consecAttacks>0){ appendLog('Karma 连击在回合结束时重置'); u.consecAttacks=0; }
  }
  for(const id in units){
    const u=units[id];
    if(u.side!==side) continue;
    if(u.status.stunned>0){
      u.status.stunned = Math.max(0, u.status.stunned-1);
      appendLog(`${u.name} 的眩晕减少 1（剩余 ${u.status.stunned}）`);
    }
  }
}
function applyEndOfRoundPassives(){
  const adora = units['adora'];
  if(adora && adora.hp>0 && adora.passives.includes('proximityHeal')){
    for(const oid in units){
      const v=units[oid];
      if(!v || v.id===adora.id || v.side!==adora.side || v.hp<=0) continue;
      if(Math.max(Math.abs(v.r-adora.r), Math.abs(v.c-adora.c)) <= 3){
        const heal = Math.max(1, Math.floor(v.maxHp*0.05));
        v.hp = Math.min(v.maxHp, v.hp + heal);
        v.sp = Math.min(v.maxSp, v.sp + 5);
        v._spBroken = (v.sp<=0);
        appendLog(`Adora 邻近治疗：为 ${v.name} 恢复 ${heal} HP 和 5 SP`);
        showGainFloat(v.r,v.c,heal,5);
      }
    }
  }
}
function finishEnemyTurn(){
  clearAIWatchdog();
  processUnitsTurnEnd('enemy');
  roundsPassed += 1;
  applyEndOfRoundPassives();

  updateStepsUI();
  setTimeout(()=>{
    currentSide='player';
    playerSteps=computeBaseSteps();
    appendLog('敌方回合结束，玩家回合开始');
    applyLevelSuppression();
    applyParalysisAtTurnStart('player');
    processUnitsTurnStart('player');
    renderAll();
  }, 300);
}
function endTurn(){
  clearAllSelection();
  if(currentSide==='player'){
    appendLog('玩家结束回合');
    playerSteps = 0;
    updateStepsUI();
    checkEndOfTurn();
  } else {
    appendLog('敌方结束回合');
    // finishEnemyTurn() 会在敌方步数已被耗尽时被调用
    finishEnemyTurn();
  }
}

// —— 敌方 AI：保证用尽全部步数（无技能时必向玩家逼近） —— 
function distanceForAI(u,target){
  const baseR = u.size===2 ? (u.r+0.5) : u.r;
  const baseC = u.size===2 ? (u.c+0.5) : u.c;
  return Math.abs(baseR - target.r) + Math.abs(baseC - target.c);
}
function isWalkableForUnit(u, r, c){
  if(u.size===2) return canPlace2x2(u, r, c);
  if(!clampCell(r,c)) return false;
  const occ = getUnitAt(r,c);
  return !occ || occ===u;
}
function neighborsOf(u, r, c){
  const res=[];
  for(const dir of Object.keys(DIRS)){
    const d=DIRS[dir];
    const rr=r+d.dr, cc=c+d.dc;
    if(isWalkableForUnit(u, rr, cc)) res.push({r:rr, c:cc, dir});
  }
  return res;
}
function goalAdjCellsForTargets(u, targets){
  const goals=[];
  const seen=new Set();
  for(const t of targets){
    const adj = range_adjacent(t);
    for(const p of adj){
      const k=`${p.r},${p.c}`;
      if(seen.has(k)) continue;
      if(isWalkableForUnit(u, p.r, p.c) && !getUnitAt(p.r,p.c)){
        goals.push({r:p.r, c:p.c});
        seen.add(k);
      }
    }
  }
  return goals;
}
function bfsNextStepTowardAny(u, targets, maxExplore=4000){
  const goals = goalAdjCellsForTargets(u, targets);
  if(goals.length===0) return null;
  const goalSet = new Set(goals.map(g=>`${g.r},${g.c}`));

  const q=[];
  const prev=new Map();
  const startKey = `${u.r},${u.c}`;
  q.push({r:u.r, c:u.c});
  prev.set(startKey, null);
  let foundKey=null;

  while(q.length && prev.size < maxExplore){
    const cur=q.shift();
    const ck=`${cur.r},${cur.c}`;
    if(goalSet.has(ck)){ foundKey=ck; break; }
    const ns = neighborsOf(u, cur.r, cur.c);
    for(const n of ns){
      const nk=`${n.r},${n.c}`;
      if(!prev.has(nk)){
        prev.set(nk, ck);
        q.push({r:n.r, c:n.c});
      }
    }
  }
  if(!foundKey) return null;

  let stepKey=foundKey, back=prev.get(stepKey);
  while(back && back!==startKey){
    stepKey = back;
    back = prev.get(stepKey);
  }
  const [sr, sc] = (back===null? foundKey : stepKey).split(',').map(Number);
  const dir = cardinalDirFromDelta(sr - u.r, sc - u.c);
  return {r:sr, c:sc, dir};
}
function tryStepsToward(u, target){
  const prefs=[];
  const baseC = u.size===2 ? (u.c+0.5) : u.c;
  const baseR = u.size===2 ? (u.r+0.5) : u.r;
  const dc=Math.sign(target.c - baseC);
  const dr=Math.sign(target.r - baseR);
  if(Math.abs(target.c-baseC) >= Math.abs(target.r-baseR)){
    if(dc!==0) prefs.push(dc>0?'right':'left');
    if(dr!==0) prefs.push(dr>0?'down':'up');
  } else {
    if(dr!==0) prefs.push(dr>0?'down':'up');
    if(dc!==0) prefs.push(dc>0?'right':'left');
  }
  for(const k of ['up','down','left','right']) if(!prefs.includes(k)) prefs.push(k);

  for(const dir of prefs){
    const cand = forwardCellAt(u,dir,1);
    if(!cand) continue;
    if(u.size===2){
      if(canPlace2x2(u, cand.r, cand.c)){ u.r=cand.r; u.c=cand.c; u.facing=dir; return {moved:true}; }
    } else {
      if(!getUnitAt(cand.r,cand.c)){ u.r=cand.r; u.c=cand.c; u.facing=dir; return {moved:true}; }
    }
  }
  return {moved:false};
}
function computeRallyPoint(){
  const haz = units['haz'];
  if(haz && haz.hp>0) return {r:haz.r, c:haz.c};
  const allies = Object.values(units).filter(x=>x.side==='enemy' && x.hp>0);
  if(allies.length===0) return {r:10,c:10};
  const avgR = Math.round(allies.reduce((s,a)=>s+a.r,0)/allies.length);
  const avgC = Math.round(allies.reduce((s,a)=>s+a.c,0)/allies.length);
  return {r:avgR, c:avgC};
}
function computeCellsForSkill(u, sk, dir){
  try{ return sk.rangeFn(u, dir||u.facing, null) || []; }catch(e){ return []; }
}
function aiAwait(ms){ return new Promise(res=>setTimeout(res, ms)); }

function enemyLivingEnemies(){ return Object.values(units).filter(u=>u.side==='enemy' && u.hp>0); }
function enemyLivingPlayers(){ return Object.values(units).filter(u=>u.side==='player' && u.hp>0); }

function buildSkillCandidates(en){
  const skillset = (en.skillPool && en.skillPool.length) ? en.skillPool : [];
  const candidates=[];
  for(const sk of skillset){
    if(sk.cost>enemySteps) continue;
    try{
      // 自我增益先（锁链缠绕/堡垒/反伤）
      const selfCells = sk.rangeFn(en, en.facing, null) || [];
      const isSelfOnly = selfCells.length>0 && selfCells.every(c=>c.r===en.r && c.c===en.c);
      const isBuffName = ['锁链缠绕','战争堡垒','拼尽全力保卫队长'].includes(sk.name);
      const canUseBuff = isBuffName && ((sk.name==='锁链缠绕' && en.chainShieldTurns<=0) || (!en._stanceType || en._stanceTurns<=0));
      if(isSelfOnly && isBuffName && canUseBuff){
        candidates.push({sk, dir:en.facing, score: 22}); // 自保最高
        continue;
      }

      const dirs = Object.keys(DIRS);
      const isAdjSkill = ['鱼叉穿刺','骨盾猛击','沙包大的拳头','短匕轻挥'].includes(sk.name);
      if(isAdjSkill){
        const adj = range_adjacent(en);
        for(const c of adj){
          const tu=getUnitAt(c.r,c.c);
          if(tu && tu.side==='player'){ candidates.push({sk, dir:c.dir, targetUnit:tu, score: 16}); }
        }
      } else if(sk.meta && sk.meta.cellTargeting){
        const cells = sk.rangeFn(en, en.facing, null) || [];
        let best=null, bestScore=-1;
        for(const c of cells){
          const tu=getUnitAt(c.r,c.c);
          if(tu && tu.side==='player' && tu.hp>0){
            const hpRatio = tu.hp/tu.maxHp;
            const sc = 18 + Math.floor((1-hpRatio)*20);
            if(sc>bestScore){ bestScore=sc; best={sk, targetUnit:tu, score:sc}; }
          }
        }
        if(best) candidates.push(best);
      } else {
        for(const d of dirs){
          const cells = sk.rangeFn(en,d,null) || [];
          let hits=0, set=new Set();
          for(const c of cells){
            const tu=getUnitAt(c.r,c.c);
            if(tu && tu.side==='player' && !set.has(tu.id)){ set.add(tu.id); hits++; }
          }
          if(hits>0) candidates.push({sk, dir:d, score: 10 + hits*8});
        }
      }
    } catch(e){
      console.error('AI 技能评估错误', e);
      appendLog(`[AI错误] ${en.name} 评估 ${sk.name} 失败：${e.message}`);
    }
  }
  candidates.sort((a,b)=> b.score-a.score);
  return candidates;
}
async function execEnemySkillCandidate(en, cand){
  enemySteps = Math.max(0, enemySteps - cand.sk.cost);
  updateStepsUI();

  const cells = cand.targetUnit
    ? [{r:cand.targetUnit.r, c:cand.targetUnit.c}]
    : computeCellsForSkill(en, cand.dir, cand.dir);

  clearHighlights();
  cells.forEach(c=> markCell(c.r,c.c,'skill'));
  await aiAwait(ENEMY_WINDUP_MS);
  clearHighlights();

  try{
    if(cand.targetUnit && cand.sk.meta && cand.sk.meta.cellTargeting){
      await cand.sk.execFn(en, {r:cand.targetUnit.r, c:cand.targetUnit.c});
    } else if(cand.targetUnit){
      await cand.sk.execFn(en, cand.targetUnit);
    } else if(cand.sk.estimate && cand.sk.estimate.aoe){
      await cand.sk.execFn(en, {dir:cand.dir});
    } else {
      await cand.sk.execFn(en, {dir:cand.dir});
    }
    consumeCardFromHand(en, cand.sk);
    renderAll();
    return true;
  } catch(e){
    console.error('AI 技能施放错误', e);
    appendLog(`[AI错误] ${en.name} 施放 ${cand.sk.name} 失败：${e.message}`);
    return false;
  }
}
function stepTowardNearestPlayer(en){
  if(!canUnitMove(en)) return false;
  const players = enemyLivingPlayers();
  if(players.length===0) return false;
  // BFS toward any player's adjacent cell
  const step = bfsNextStepTowardAny(en, players);
  if(step){
    en.facing = step.dir || en.facing;
    en.r = step.r; en.c = step.c;
    enemySteps = Math.max(0, enemySteps - 1);
    updateStepsUI();
    cameraFocusOnCell(en.r,en.c);
    renderAll();
    appendLog(`${en.name} 逼近：向玩家方向移动 1 步`);
    return true;
  }
  // Fallback heuristic toward nearest player's position
  let nearest=players[0], md=distanceForAI(en, players[0]);
  for(const p of players){ const d=distanceForAI(en,p); if(d<md){ md=d; nearest=p; } }
  const mv = tryStepsToward(en, nearest);
  if(mv.moved){
    enemySteps = Math.max(0, enemySteps - 1);
    updateStepsUI();
    cameraFocusOnCell(en.r,en.c);
    renderAll();
    appendLog(`${en.name} 逼近：向最近玩家挪动 1 步`);
    return true;
  }
  return false;
}
function wasteOneEnemyStep(reason='敌方犹豫不决，浪费了 1 步'){
  if(enemySteps>0){
    enemySteps = Math.max(0, enemySteps - 1);
    appendLog(reason);
    updateStepsUI();
    return true;
  }
  return false;
}

async function exhaustEnemySteps(){
  aiLoopToken++; const token = aiLoopToken;
  armAIWatchdog(token, 20000);

  // 主循环：直到步数归零或一方全灭
  while(currentSide==='enemy' && enemySteps>0){
    if(token !== aiLoopToken) break;

    // 快速终止条件
    const livingEnemies = enemyLivingEnemies();
    const players = enemyLivingPlayers();
    if(livingEnemies.length===0 || players.length===0){
      enemySteps = 0;
      updateStepsUI();
      break;
    }

    let progressedThisRound = false;

    // 轮询每个单位各尝试一次“动作”
    for(const en of livingEnemies){
      if(enemySteps<=0) break;
      if(!en || en.hp<=0) continue;
      if(en.status.stunned){ aiLog(en,'眩晕跳过'); continue; }
      if(!en.dealtStart) ensureStartHand(en);
      if(en.id==='neyla' && en.oppression) ensureNeylaEndShadowGuarantee(en);

      // 1) 尝试技能
      let didAct = false;
      const candidates = buildSkillCandidates(en);
      if(candidates.length>0){
        didAct = await execEnemySkillCandidate(en, candidates[0]);
        if(didAct) progressedThisRound = true;
      }

      // 2) 无技能可用 → 向玩家移动
      if(!didAct && enemySteps>0){
        const moved = stepTowardNearestPlayer(en);
        if(moved){
          progressedThisRound = true;
          await aiAwait(140);
        }
      }

      // 3) 仍无动作 → 尝试原地随机挪步（只为消步）
      if(!didAct && enemySteps>0 && !progressedThisRound){
        const neigh = neighborsOf(en, en.r, en.c).filter(p=> !getUnitAt(p.r,p.c));
        if(canUnitMove(en) && neigh.length){
          const pick = neigh[Math.floor(Math.random()*neigh.length)];
          en.r = pick.r; en.c = pick.c;
          en.facing = pick.dir || en.facing;
          enemySteps = Math.max(0, enemySteps - 1);
          updateStepsUI();
          cameraFocusOnCell(en.r,en.c);
          renderAll();
          appendLog(`${en.name} 试探性移动：消耗 1 步`);
          progressedThisRound = true;
          await aiAwait(120);
        }
      }
    }

    // 整轮无人动作 → 强行消步直到 0（防止卡住）
    if(!progressedThisRound){
      // 尝试对一个可移动单位强制朝集合点靠拢
      const anyMovable = enemyLivingEnemies().find(e=> canUnitMove(e) && neighborsOf(e, e.r, e.c).some(p=>!getUnitAt(p.r,p.c)));
      if(anyMovable){
        const rally = computeRallyPoint();
        const mv = tryStepsToward(anyMovable, rally);
        if(mv.moved){
          enemySteps = Math.max(0, enemySteps - 1);
          updateStepsUI();
          cameraFocusOnCell(anyMovable.r,anyMovable.c);
          renderAll();
          appendLog(`${anyMovable.name} 整队：向集合点挪动 1 步`);
          await aiAwait(120);
          continue; // 继续下一轮
        }
      }
      // 仍无法动作 → 直接丢弃步数
      if(enemySteps>0){
        wasteOneEnemyStep();
        await aiAwait(80);
      }
    }
  }

  clearAIWatchdog();
}

async function enemyTurn(){
  renderAll();
  const livingEnemies = enemyLivingEnemies();
  const livingPlayers = enemyLivingPlayers();
  if(livingEnemies.length===0 || livingPlayers.length===0){
    enemySteps = 0; updateStepsUI();
    return finishEnemyTurn();
  }
  appendLog('敌方开始行动');

  enemyActionCameraLock = true;

  // 用尽步数
  await exhaustEnemySteps();

  // 兜底：确保步数为 0
  if(enemySteps>0){
    appendLog('兜底：将剩余敌方步数清零');
    enemySteps = 0; updateStepsUI();
  }

  enemyActionCameraLock = false;
  cameraReset();

  // 正式结束敌方回合
  finishEnemyTurn();
}

// —— 胜负/渲染循环 ——
function checkWin(){
  const enemiesAlive = Object.values(units).some(u=>u.side==='enemy' && u.hp>0);
  const playersAlive = Object.values(units).some(u=>u.side==='player' && u.hp>0);
  if(!enemiesAlive){ showAccomplish(); return true; }
  if(!playersAlive){ appendLog('全灭，失败（本 demo 未实现失败界面）'); return true; }
  return false;
}
function showAccomplish(){
  if(!accomplish) return;
  accomplish.classList.remove('hidden');
  if(damageSummary){
    damageSummary.innerHTML='';
    const wrap=document.createElement('div'); wrap.className='acctable';
    for(const id of ['adora','dario','karma']){
      const u=units[id];
      const row=document.createElement('div'); row.className='row';
      row.innerHTML=`<strong>${u.name}</strong><div class="small">造成伤害: ${u.dmgDone}，受到: ${u.maxHp - u.hp}</div>`;
      wrap.appendChild(row);
    }
    damageSummary.appendChild(wrap);
  }
  const btn=document.getElementById('confirmBtn');
  if(btn) btn.onclick=()=>{ accomplish.classList.add('hidden'); appendLog('通关!'); };
}
function renderAll(){
  buildGrid();
  placeUnits();
  renderStatus();
  updateStepsUI();
  if(checkWin()) return;
}
function checkEndOfTurn(){
  if(currentSide==='player' && playerSteps<=0){
    appendLog('玩家步数耗尽，轮到敌方');
    processUnitsTurnEnd('player');
    currentSide='enemy';
    enemySteps=computeBaseSteps();
    applyLevelSuppression();
    applyParalysisAtTurnStart('enemy');
    processUnitsTurnStart('enemy');
    // 敌方回合：保证用尽步数
    setTimeout(()=>{ enemyTurn(); }, 200);
    return;
  }
  if(currentSide==='enemy' && enemySteps<=0){
    appendLog('敌方步数耗尽，轮到玩家');
    finishEnemyTurn();
    return;
  }
}

// —— Haz 力挽狂澜触发检测（含卡池替换规则） —— 
function checkHazComebackStatus(){
  const haz = units['haz'];
  if(!haz || haz.hp<=0) return;
  const others = Object.values(units).filter(v=>v.side==='enemy' && v.hp>0 && v.id!=='haz');
  const shouldActive = (others.length===0);
  if(shouldActive && !haz._comeback){
    haz._comeback = true;

    if(haz.skillPool && haz.skillPool.length){
      haz.skillPool = haz.skillPool.filter(sk => sk.name === '深海猎杀');
    } else {
      haz.skillPool = [];
    }
    const need = Math.max(0, START_HAND_COUNT - haz.skillPool.length);
    drawSkills(haz, need);

    appendLog('Haz 被动「力挽狂澜」觉醒：伤害+10%，所受伤害-10%，卡池已替换为「深海猎杀 + 力挽狂澜禁招」，其他原始技能出现几率为 0');
  }
}

// —— 初始化 —— 
document.addEventListener('DOMContentLoaded', ()=>{
  battleAreaEl = document.getElementById('battleArea');
  mapPaneEl = document.getElementById('mapPane');
  cameraEl = battleAreaEl;
  playerStepsEl = document.getElementById('playerSteps');
  enemyStepsEl = document.getElementById('enemySteps');
  roundCountEl = document.getElementById('roundCount');
  partyStatus = document.getElementById('partyStatus');
  selectedInfo = document.getElementById('selectedInfo');
  skillPool = document.getElementById('skillPool');
  logEl = document.getElementById('log');
  accomplish = document.getElementById('accomplish');
  damageSummary = document.getElementById('damageSummary');

  updateCameraBounds();
  createCameraControls();
  registerCameraInputs();
  cameraReset({immediate:true});
  startCameraLoop();

  // 掩体（不可进入）
  addCoverRectBL(2,3,4,5);
  addCoverRectBL(2,12,5,14);
  addCoverRectBL(10,11,12,13);

  injectFXStyles();

  // 起手手牌
  for(const id in units){ const u=units[id]; if(u.hp>0) ensureStartHand(u); }

  playerSteps = computeBaseSteps();
  enemySteps = computeBaseSteps();

  renderAll();
  updateCameraBounds();
  applyCameraTransform();

  // 初次渲染后延迟刷新 2x2 覆盖
  setTimeout(()=> refreshLargeOverlays(), 0);
  setTimeout(()=> refreshLargeOverlays(), 240);
  if('requestAnimationFrame' in window){
    requestAnimationFrame(()=> refreshLargeOverlays());
  }
  window.addEventListener('load', ()=> refreshLargeOverlays());

  appendLog('七海作战队 Boss 战开始：地图 18x22，右下角 8x10 空缺；掩体为不可进入。');
  appendLog('叠层眩晕：精英2层（Kyn/Neyla）；小Boss3层（Tusk/Katz）；Boss4层（Haz）。SP崩溃直接眩晕且下回合自动回蓝。');
  appendLog('敌方攻击带预警并有较长前摇；AOE 预警为青色、命中为红色；多阶段技能逐段即时结算并以黄色标记上一段受击区。');
  appendLog('保证：敌方在回合结束前必定将步数耗尽；若无法施放技能，则必定向玩家单位移动或消步。');
  appendLog('每个来回计 1 回合；20 回合后触发“队长的压迫”。');

  const endTurnBtn=document.getElementById('endTurnBtn');
  if(endTurnBtn) endTurnBtn.addEventListener('click', ()=>{ if(interactionLocked) return; endTurn(); });

  // GOD'S WILL 按钮
  godsWillBtn = document.createElement('button');
  godsWillBtn.id = 'godsWillBtn';
  godsWillBtn.textContent = "GOD'S WILL";
  godsWillBtn.title = '调试：点击后选择任意单位 → 杀死或留 1 HP（ESC 取消）';
  godsWillBtn.onclick = (e)=>{ e.stopPropagation(); if(interactionLocked) return; toggleGodsWill(); };
  document.body.appendChild(godsWillBtn);

  // Full Screen 按钮
  fsBtn = document.createElement('button');
  fsBtn.id = 'fullscreenBtn';
  fsBtn.textContent = 'Full Screen';
  fsBtn.title = '切换全屏模式';
  fsBtn.onclick = (e)=>{ e.stopPropagation(); if(interactionLocked) return; toggleFullscreen(); };
  document.body.appendChild(fsBtn);

  // ESC 取消 GOD’S WILL
  window.addEventListener('keydown',(e)=>{
    if(e.key === 'Escape' && godsWillArmed){
      disarmGodsWill();
    }
  });

  // 视口改变时刷新 2x2 覆盖和菜单
  let _resizeTimer=null;
  window.addEventListener('resize', ()=>{
    if(_resizeTimer) clearTimeout(_resizeTimer);
    _resizeTimer = setTimeout(()=>{
      refreshLargeOverlays();
      if(godsWillMenuEl && godsWillMenuEl.isConnected){
        godsWillMenuEl.remove();
        godsWillMenuEl=null;
        if(godsWillArmed) appendLog('GOD’S WILL 菜单因窗口变化已移除，请重新点击单位');
      }
      updateCameraBounds();
    }, 120);
  });

  applyLevelSuppression();
  applyParalysisAtTurnStart('player');
  processUnitsTurnStart('player');
  updateStepsUI();
  setTimeout(()=> playIntroCinematic(), 80);
});
