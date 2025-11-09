# Blood Tower Plan (血楼计划) Implementation Status

## Overview
This document tracks the implementation status of the Blood Tower Plan stage, a complex multi-wave battle with destructible walls, blood fog mechanics, and a boss encounter.

## ✅ Completed Features

### Menu Integration
- ✅ Stage button added to menu (between "疲惫的极限" and "被遗弃的动物")
- ✅ Stage definition in stageCatalog with proper metadata
- ✅ Stage story/dialogue added to stageStories
- ✅ Stage progress tracking configured
- ✅ Enter button handler routes to blood-tower-battle.html

### Battle Files
- ✅ blood-tower-battle.html created with proper audio elements (Tower.mp3 and 成员B.mp3)
- ✅ blood-tower-battle-styles.css created (copied from heresy-battle-styles.css)
- ✅ blood-tower-battle-script.js created (based on heresy-battle-script.js)

### Map Configuration
- ✅ Map size: 18 rows × 26 columns
- ✅ Void areas defined:
  - Area 1: rows 6-18, columns 18-21 (rectangle)
  - Area 2: rows 1-13, columns 8-12 (rectangle)
- ✅ Cover cells: (rows 3-5, column 6) and (rows 1-7, column 9)

### Player Units
- ✅ Dario: Level 25, Position (16, 23), HP 150, SP 100
- ✅ Adora: Level 25, Position (16, 24), HP 100, SP 100
- ✅ Karma: Level 25, Position (16, 25), HP 200, SP 50

### Initial Enemy Wave
- ✅ 雏形赫雷西成员 #1: Position (3, 23), HP 150, SP 70
- ✅ 雏形赫雷西成员 #2: Position (3, 25), HP 150, SP 70
- ✅ 法形赫雷西成员: Position (5, 24), HP 100, SP 90
- ✅ 刺形赫雷西成员: Position (18, 24), HP 50, SP 100

## ⚠️ Partially Implemented Features

### Enemy Passives
The following passives are referenced but may need full implementation:
- loyalFaith (忠臣的信仰) - +10 SP per turn
- gift (Gift) - 50% chance to reduce damage by 50%
- enhancedBody (强化身体) - +20% attack damage, -20% received damage
- godInstruction (接受神的指示) - Special targeting for "cultTarget" marked enemies
- hiddenGift (隐Gift) - Stealth mechanics for assassins
- assassinTriangle (刺形三角) - Ignore all damage reduction

## ❌ Not Yet Implemented

### Critical Mechanics

#### 1. Destructible Walls System
**Requirements:**
- Wall 1: Rows/Columns (1-5, 21) 
  - Becomes fragile when all initial enemies are defeated
  - Triggers blood fog 2 turns after breaking
  - Spawns wave 2 enemies when destroyed

- Wall 2: Row/Column (13, 13-17)
  - Becomes fragile when wave 2 enemies are defeated
  - Triggers blood fog 2 turns after breaking
  - Spawns wave 3 enemies when destroyed

- Wall 3: Row/Column (13, 1-7)
  - Becomes fragile when wave 3 enemies are defeated
  - Triggers blood fog 2 turns after breaking
  - Triggers boss dialogue cutscene
  - Spawns wave 4 enemies + Boss when destroyed

**Implementation Needed:**
- Track wall state (intact/fragile/destroyed)
- Detect when all enemies of a wave are defeated
- Make walls destructible by any attack
- Spawn new enemies at specified positions
- Trigger blood fog zones after walls break

#### 2. Blood Fog Mechanic
**Requirements:**
- Appears 2 turns after a wall breaks in the area behind that wall
- Affects all units in the fog zone
- Damage per turn: -50 HP, -50 SP, +10 bleed stacks, +10 resentment stacks

**Implementation Needed:**
- Track blood fog zones and activation timers
- Apply fog damage at turn start for units in fog
- Visual indication of fog zones

#### 3. Healing Tiles
**Requirements:**
- Tile at (3, 18) - one-time use
- Tile at (16, 9) - one-time use
- Effect: Restore all HP and SP, add 1 "鸡血" (jixue) stack
- Triggered by first friendly unit to step on it
- Becomes normal tile after use

**Implementation Needed:**
- Track healing tile positions and used status
- Detect when unit moves onto tile
- Apply healing and buff effects
- Mark tile as used

#### 4. Enemy Wave Spawning

**Wave 2 (after Wall 1 breaks):**
- 法形赫雷西成员 at (3, 15)
- 雏形赫雷西成员 at (10, 16)
- 雏形赫雷西成员 at (10, 14)
- 雏形赫雷西成员 at (8, 25)
- 刺形赫雷西成员 at (12, 15)

**Wave 3 (after Wall 2 breaks):**
- 雏形赫雷西成员 at (15, 2)
- 雏形赫雷西成员 at (17, 2)
- 刺形赫雷西成员 at (16, 15)
- 刺形赫雷西成员 at (15, 13)
- 刺形赫雷西成员 at (17, 7)
- 赫雷西初代精英成员 (Elite) at (16, 4)

**Wave 4 (after Wall 3 breaks + dialogue):**
- 雏形赫雷西成员 at (10, 5)
- 雏形赫雷西成员 at (10, 3)
- 法形赫雷西成员 at (4, 6)
- 法形赫雷西成员 at (4, 2)
- 组装型进阶赫雷西成员 (Boss - Member B) at (2, 4)

**Implementation Needed:**
- Create unit definitions for Elite and Boss
- Implement spawn logic triggered by wall destruction
- Position units correctly on spawn

#### 5. Boss Dialogue System
**Requirements:**
- Trigger when Wall 3 is destroyed
- Pause battle, stop Tower.mp3
- Display dialogue sequence:
  - 赫雷西成员B：我真的非常尊重你们
  - 赫雷西成员B：你们能走到这里以及完全证明了你们的意志以及信念
  - 赫雷西成员B：。。。
  - 赫雷西成员B：真是。。
  - 赫雷西成员B：真是可惜，我们立场不同啊
  - 赫雷西成员B：但愿来世相认时——
  - 赫雷西成员B：再当挚友吧
- Start 成员B.mp3 loop after dialogue
- Resume battle with Boss spawned

**Implementation Needed:**
- Dialogue UI system (overlay with continue/skip buttons)
- BGM control (stop Tower.mp3, play 成员B.mp3)
- Link dialogue completion to Boss spawn

#### 6. BGM Switching
**Requirements:**
- Tower.mp3 plays at battle start (loop)
- Stop Tower.mp3 when Wall 3 breaks
- Play 成员B.mp3 (loop) after boss dialogue

**Implementation Needed:**
- Audio element references
- Stop/play logic at appropriate triggers
- Volume fade in/out for smooth transitions

#### 7. Elite Enemy Configuration
**赫雷西初代精英成员 (Initial Elite Member):**
- HP: 200, SP: 50
- Level: 25
- Stun threshold: 2 (needs 2 stun stacks)
- Bloodlust Grip: Only deals 100 HP damage (not instant kill)
- Passives:
  - loyalFaith (+10 SP per turn)
  - Extra action per turn if alive
  - Blood pollution spread (creates blood tiles)
  - godInstruction (cult target special behavior)
- Skills:
  - 异臂 (2 steps) - 80% probability
  - 重锤 (2 steps) - 50% probability
  - 献祭 (2 steps) - 25% probability
  - 爆锤 (3 steps, multi-stage) - 15% probability

**Implementation Needed:**
- Create elite unit configuration
- Implement blood tile mechanic
- Implement multi-stage attack (爆锤)

#### 8. Boss Enemy Configuration
**组装型进阶赫雷西成员 (Member B):**
- HP: 250, SP: 90
- Level: 25
- Stun threshold: 3 (needs 3 stun stacks)
- Bloodlust Grip: Only deals 80 HP damage
- Cannot be force-moved
- Passives:
  - loyalFaith (+15 SP per turn, enhanced)
  - Extra action per turn if alive
  - Soul Comfort (heal 5% HP + 5 SP to nearby allies in 7×7)
  - Divine Instruction Transmitter (35% chance to apply cultTarget on attack)
- Skills (all conditional on ally presence):
  - 以神明之名："祝福" (2 steps) - 40% probability
  - 以神明之名："关怀" (2 steps) - 40% probability
  - 以神明之名："自由" (3 steps) - 40% probability
  - 协助我们！(3 steps) - 40% probability - spawns Novice
  - 辅助我们！(3 steps) - 40% probability - spawns Mage
  - 暗杀令 (2 steps) - 40% probability - spawns half-HP Assassin
  - 以神明之名："清除" (2 steps) - 60% probability

**Implementation Needed:**
- Create boss unit with all passives
- Implement ally detection logic for skills
- Implement ally spawning skills
- Implement cultTarget explosion mechanic

#### 9. Assassin Stealth Mechanics
**Requirements:**
- Start battle invisible
- Cannot be seen, clicked, or camera-followed
- Revealed when dealing or receiving damage
- Re-stealth after 3 turns of no combat interaction

**Implementation Needed:**
- Stealth status tracking
- UI visibility toggle
- Camera behavior modification
- Turn counter for re-stealth

### Minor Features

#### 10. Cover Cells
- Currently: 3 rows at (3,6)-(5,6) and (1,9)-(7,9) per problem statement
- Status: Mentioned in requirements but not implemented

#### 11. Return to Menu
- Battle should return to stage select regardless of win/loss
- Status: Default behavior should work, may need verification

## Testing Checklist

- [ ] Menu navigation to Blood Tower stage
- [ ] Story dialogue displays correctly
- [ ] Battle loads without errors
- [ ] Player units appear at correct positions
- [ ] Initial enemies appear at correct positions
- [ ] Void cells block movement
- [ ] Turn system works
- [ ] Basic combat works
- [ ] Destructible walls appear and function
- [ ] Wall 1 breaks and spawns wave 2
- [ ] Blood fog appears after wall 1 breaks
- [ ] Healing tiles work
- [ ] Wall 2 breaks and spawns wave 3
- [ ] Elite enemy appears and functions
- [ ] Wall 3 breaks and triggers dialogue
- [ ] Boss dialogue displays correctly
- [ ] BGM switches from Tower.mp3 to 成员B.mp3
- [ ] Boss spawns after dialogue
- [ ] Boss skills work correctly
- [ ] Assassin stealth mechanics work
- [ ] Victory condition triggers
- [ ] Defeat condition triggers
- [ ] Return to menu after battle

## Next Steps

1. Implement destructible wall system with state tracking
2. Add wave 2-4 enemy spawning logic
3. Implement blood fog zones and damage
4. Add healing tile mechanics
5. Create Elite and Boss unit configurations
6. Implement boss dialogue system
7. Add BGM switching logic
8. Implement assassin stealth mechanics
9. Test all mechanics thoroughly
10. Verify audio files (Tower.mp3 and 成员B.mp3) are available

## Notes

- The battle script is based on heresy-battle-script.js which provides most of the core combat mechanics
- Many enemy skills are already partially implemented via existing heresy battle skills
- The main work is adding the special mechanics (walls, fog, healing, waves, dialogue, BGM)
- The existing passive system should support most enemy abilities with minor additions
