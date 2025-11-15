# Lirathe Boss Battle - Complete Implementation Plan

## Executive Summary

The "旧情未了" (Old Love Unfinished) boss battle featuring Lirathe requires implementing a complete turn-based RPG battle system with approximately **4,500-5,000 lines of complex JavaScript code**.

## Current Status

✅ **Completed:**
- Requirements analysis and documentation
- HTML structure (lirathe-boss-battle.html)
- Comprehensive specification in lirathe-boss-battle-script.js
- Reference implementation review (七海战斗 - 4,896 lines)

⏳ **Pending:**
- Complete battle engine implementation (~4,500 lines)

## Detailed Requirements

### Map Configuration
- **Dimensions:** 9 rows × 26 columns (9x26 grid)
- **Initial Positions:**
  - Lirathe: (5, 5)
  - Karma: (5, 22)
  - Adora Phantom & Dario Phantom: Spawn on Round 2 at (5, 22) ± offsets

### Phase 1: Lirathe Pre-Transformation

**Stats:**
- HP: 700
- SP: 80
- Size: 1 cell
- Level: 50

**Passive Abilities (5):**
1. **舞女梦 (Dancer's Dream):** 30% chance to dodge attacks and move to nearest empty cell
2. **刺痛的心 (Stinging Heart):** 25% chance to increase damage by 0.25% each time damaged by Karma
3. **迅速敏捷 (Swift Agility):** Moving 3+ cells grants 灵活 buff (30% enemy miss chance)
4. **重获新生 (Rebirth):** 5% chance to perform追击 (follow-up attack)
5. **真的好不甘心 (Truly Unwilling):** At ≤50% HP, gain +45% damage and unlock special skills

**Active Skills (6):**
1. **刺斩 (Dash Slash)** - 80% probability, 1 step
   - Dash 4 cells in cardinal direction
   - Deal 15 HP damage to last enemy hit
   - Apply 1 stack of 脆弱 debuff (15% increased damage taken)

2. **又想逃？(Want to Escape?)** - 40% probability, 2 steps
   - Move to any cell within 2 range (4 if against wall)
   - Deal 5 HP to adjacent enemies

3. **刀光吸入 (Blade Light Absorption)** - 40% probability, 2 steps
   - 3x2 forward slash dealing 20 HP
   - Apply 1 stack of 刀光 (10 stacks = auto-explosion: 5 HP + 5 SP per stack, heals Lirathe)

4. **剑舞 (Sword Dance)** - 25% probability, 3 steps, multi-stage
   - Stage 1: 3x2 forward slash, 20 HP + 脆弱 debuff
   - Stage 2: 3x2 opposite direction slash, 20 HP
   - Stage 3: 3x3 centered dance, 10 HP
   - Stage 4: 5x5 centered dance, 15 HP + 刀光
   - Stage 5: 7x7 centered dance, 15 HP + 刀光
   - Grants 戏谑 buff if all stages hit at least one enemy

5. **飞溅刀光 (Splash Blade Light)** - 25% probability, 3 steps (unlocked at ≤50% HP)
   - Multi-stage attack with blade splashes
   - Deal 15 HP + 刀光 to first enemy
   - Deal 15 HP + 刀光 to all enemies in line
   - Dash to first target, deal 5 HP + 刀光

6. **别跑 (Don't Run)** - 40% probability, 2 steps (unlocked at ≤50% HP)
   - Shoot web-like substance in line
   - Deal 15 SP to first enemy
   - 50% chance to apply 禁锢 (cannot move next turn)

### Phase 2: Lirathe Transformed

**Transformation Trigger:** Phase 1 HP reaches 0

**Stats:**
- HP: 1200
- SP: 0 (range: 0 to -80, Khathia-style restoration)
- Size: 4 cells (2x2)
- Level: 50

**SP Mechanics:**
- Range: 0 to -80
- At -80: Take 20 true damage, stunned for 1 turn, -1 step, 1.5x damage taken
- Auto-restore to -10

**Passive Abilities (5):**
1. **攀爬 (Climb):** Use 1 step to climb walls → "高处" state (untargetable)
2. **退去凡躯 (Shed Mortal Form):** -25% damage taken, 20% chance to heal 5 HP, lose normal movement
3. **丧失理智 (Lost Sanity):** 25% chance for +25% damage but costs 25 HP + 10 SP
4. **一片黑暗 (Total Darkness):** Blind attacks (random), can only target enemies with "暴露" or "看见" status
5. **困境 (Predicament):** 25% chance to spawn invisible web trap (applies 禁锢 on step)

**Active Skills (4):**
1. **冲杀 (Charge Kill)** - 75% probability, 2 steps
   - Charge forward to end of line
   - Deal 20 HP + 10 SP to all hit enemies
   - Apply 1 stack of 腐蚀 (corrosion: -5% HP per turn, stacks increase damage)
   - Destroy cover on impact

2. **你在哪 (Where Are You)** - 30% probability, 2 steps
   - 6x6 centered roar
   - Deal 10 SP to all enemies in range
   - Apply 1 stack of 腐蚀
   - Apply "看见" status (Lirathe can see target for 1 turn)

3. **掏心掏肺 (Rip Heart and Lungs)** - 25% probability, 2 steps, multi-stage
   - Target one unit in 2x2 forward area
   - Repeat 3 times: Deal 15 HP + 5 SP + 腐蚀
   - If target has 5+ 腐蚀 stacks, repeat entire skill

4. **找不到路 (Can't Find the Way)** - 25% probability, 3 steps, multi-stage
   - Charge in 4 random directions
   - Each charge: Deal 20 HP + 10 SP + 腐蚀 to all hit

**Special Mechanics:**

**意识花苞 (Consciousness Bud)** - Spawns every 5 rounds
- HP: 150
- Passives: Heal 20 HP if not damaged for 3 turns, Immobile, 1 skill per turn
- Skill: Forward stab (3 cells), 15 HP + 5 SP
- When destroyed: Cell becomes "软肋" (soft spot)
- Stepping on 软肋: Lirathe falls, loses "高处", stunned + 50% increased damage

**治疗格子 (Healing Tiles)** - Spawns every 10 rounds
- Heal 50 HP + 50 SP to friendly units

### Final Rage Sequence (HP < 400)

When Lirathe Phase 2 HP drops below 400:

1. **Transformation:**
   - Heal to full HP
   - Clear all negative effects
   - Set Adora Phantom & Dario Phantom to 1 HP + 99 腐蚀 stacks

2. **Pause:** 3 seconds

3. **Teleport:** Move Lirathe to Karma's position

4. **Attack Sequence:** Execute "掏心掏肺" 7 times (Karma cannot drop below 1 HP)

5. **Dialogue Sequence:**
   ```
   (Lirathe即将杀掉Karma时，看到了周围血坑中的倒影)
   (和女孩子没有任何关系的自己)
   Lirathe：（我在干什么。。。）
   Lirathe：（我为什么会变成这样）
   Lirathe：（。。。。）
   Lirathe：（抱歉。。）
   ```

6. **End State:**
   - Lirathe enters permanent stun
   - Stop spawning 意识花苞 and 治疗格子
   - Remove existing spawned objects

7. **Victory:**
   - Show Accomplish screen
   - Return to stage selection (index.html)

### Defeat Condition
- All player units HP = 0
- Return directly to stage selection (index.html)

## Implementation Architecture

### Core Systems Required

1. **Grid Battle Engine** (~800 lines)
   - Cell management (9x26 grid)
   - Unit positioning and collision
   - Cover/obstacle system
   - Turn-based movement

2. **Unit Management** (~400 lines)
   - Unit creation and properties
   - HP/SP management
   - Status effect tracking
   - Size handling (1-cell and 4-cell units)

3. **Turn System** (~300 lines)
   - Side switching (player/enemy)
   - Step management
   - Turn start/end processing
   - Round counting

4. **Skill System** (~900 lines)
   - Skill definitions with range functions
   - Execution functions
   - Damage calculation
   - Multi-stage attack handling
   - Probability pools

5. **AI System** (~800 lines)
   - Skill selection
   - Target prioritization
   - Movement decisions
   - BFS pathfinding

6. **Status Effects** (~500 lines)
   - Buff management (灵活, 戏谑, 暴力, 肯定, etc.)
   - Debuff management (眩晕, 脆弱, 禁锢, 腐蚀, 刀光, etc.)
   - Stack handling
   - Turn-based decay

7. **FX & Animation** (~400 lines)
   - Telegraph/Impact system
   - Damage numbers
   - Visual effects
   - Camera shake

8. **Camera System** (~300 lines)
   - Viewport management
   - Focus/pan controls
   - Zoom functionality

9. **UI System** (~400 lines)
   - Status displays
   - Skill cards
   - Log messages
   - Modal dialogs

10. **Story/Cutscene System** (~200 lines)
    - Dialogue display
    - Sequence control
    - Pause/resume

## Implementation Approach

### Option 1: Full Custom Implementation
- Build from scratch using reference as guide
- Time: 3-4 days
- Complexity: High
- Flexibility: Maximum

### Option 2: Adapt Reference Implementation
- Copy 七海战斗 script (4,896 lines)
- Modify for Lirathe mechanics
- Time: 2-3 days
- Complexity: Medium
- Flexibility: High

### Option 3: Simplified Version
- Implement core mechanics only
- Single phase battle
- Basic AI
- Time: 1-2 days
- Complexity: Low
- Flexibility: Limited

## Recommended Next Steps

1. **Choose Implementation Approach** (Option 2 recommended)
2. **Set up Base Structure**
   - Copy and adapt reference script
   - Modify grid size to 9x26
   - Update unit definitions
3. **Implement Phase 1**
   - Lirathe pre-transform with all passives
   - 6 active skills with probability system
   - Player units (Karma + phantoms)
4. **Implement Phase 2**
   - Transformation trigger
   - 4-cell boss mechanics
   - New skill set
   - Spawning systems
5. **Implement Final Sequence**
   - Rage trigger
   - Dialogue system
   - Victory condition
6. **Testing & Polish**
   - Balance damage values
   - Test edge cases
   - Fix bugs

## Conclusion

This is a **major feature implementation** requiring substantial development effort. The complexity is equivalent to building a complete turn-based RPG battle system from scratch. 

The current deliverable includes:
- ✅ Complete requirements documentation
- ✅ Architecture planning
- ✅ HTML structure ready
- ✅ CSS styling prepared

**Next milestone:** Select implementation approach and begin core battle engine development.

---
**Estimated Total Development Time:** 2-3 days (16-24 hours) for full implementation  
**Lines of Code:** ~4,500-5,000  
**Complexity Level:** High - Requires game engine development expertise
