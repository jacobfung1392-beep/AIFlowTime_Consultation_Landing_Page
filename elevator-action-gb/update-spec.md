# Elevator Action GB - Massive Feature Update Specification

## Overview
This document specifies ALL changes to be made to game.js. The game is a Game Boy-style 2D platformer (160x144 canvas, 4-shade green palette). All changes must preserve the GB aesthetic and existing game mechanics.

## Files to Modify
- `/home/user/workspace/elevator-action-gb/game.js` (main game, ~2150 lines)

## CRITICAL CONSTRAINTS
- Preserve GB palette: darkest=#0f380f, dark=#306230, light=#8bac0f, lightest=#9bbc0f
- Canvas is 160x144, TILE=8, font is 'Press Start 2P' 8px
- Do NOT break existing controls, input system, touch support, sound system
- Do NOT modify index.html - only game.js
- Keep all existing helper functions (rectOverlap, tileAt, isSolid, etc.)
- Keep the IIFE wrapper (() => { ... })()
- Keep the deterministic testing hooks (window.advanceTime, window.render_game_to_text)
- Keep the resizeCanvas() function as-is

## CHANGES REQUIRED

### 1. REMOVE CONTACT DAMAGE (lines 1295-1302)
Remove the "Touch player damage" block in updateEnemies(). Touching police should NOT cause harm.
The block to remove:
```
    // Touch player damage
    if (p && !p.enteringDoor && G.invincibleTimer <= 0) {
      if (rectOverlap({ x: p.x, y: p.y, w: p.w, h: p.h }, { x: e.x, y: e.y, w: e.w, h: e.h })) {
        if (!p.jumpKicking) {
          playerHit(1);
        }
      }
    }
```

### 2. EXPAND TO 6+ LEVELS WITH PROGRESSIVE DIFFICULTY
Currently generateBuilding() uses `numFloors = 8 + Math.min(level, 4) * 2` which scales by level but there's no level cap or design variety.

Create 6 distinct level configurations. Each level should have:
- Different number of floors (8, 10, 12, 14, 14, 16)
- Different number of shafts
- Different enemy density
- Different door distribution
- Level 6 ends with a boss fight

Keep the procedural generation but parameterize it per level:
```js
const LEVEL_CONFIG = [
  { floors: 8,  shafts: 1, enemyRate: 0.2, redDoors: 2, qmarkDoors: 1, hasDogs: false, bossLevel: false },
  { floors: 10, shafts: 2, enemyRate: 0.3, redDoors: 3, qmarkDoors: 2, hasDogs: false, bossLevel: false },
  { floors: 12, shafts: 2, enemyRate: 0.4, redDoors: 3, qmarkDoors: 2, hasDogs: false, bossLevel: false },
  { floors: 12, shafts: 2, enemyRate: 0.5, redDoors: 4, qmarkDoors: 3, hasDogs: true,  bossLevel: false },
  { floors: 14, shafts: 3, enemyRate: 0.6, redDoors: 4, qmarkDoors: 3, hasDogs: true,  bossLevel: false },
  { floors: 16, shafts: 3, enemyRate: 0.7, redDoors: 5, qmarkDoors: 4, hasDogs: true,  bossLevel: true  },
];
```
After level 6 loops back to level 1 but with harder settings (scale enemy counts/speed).

### 3. ADD 2 NEW GUN TYPES (shotgun + rocket)
Add to WEAPONS object:
```js
shotgun: {
  name: 'SHOTGN',
  fireRate: 0.5,
  bulletSpeed: 100,
  maxOnScreen: 12,  // 4 per shot x 3
  ammo: 12,
  piercing: false,
  spread: 3,        // fires 4 bullets (1 + 3 extra) in a fan
  auto: false,
  bulletW: 2,
  bulletH: 2,
},
rocket: {
  name: 'ROCKET',
  fireRate: 0.8,
  bulletSpeed: 80,
  maxOnScreen: 2,
  ammo: 8,
  piercing: true,
  spread: 0,
  auto: false,
  bulletW: 6,
  bulletH: 3,
  explosive: true,  // NEW: deals area damage
},
```
- Shotgun: fires 4 bullets in a spread pattern (wider fan than current spread weapon)
- Rocket: slow, big, piercing, and explodes on wall contact dealing area damage (kills enemies within 16px)

Update enterDoor() to include shotgun and rocket in the question mark door loot table.
Update drawBullet rendering to show rocket as a distinct shape (rectangle with tail).

### 4. ADD PATROL DOGS IN LEVELS 4-6
Dogs are a new enemy type. They:
- Move faster than cops (ENEMY_SPEED * 1.8)
- Cannot shoot (melee only via charging)
- Are shorter (h: 8 instead of 14)
- Run toward the player when on same floor and within range
- Deal damage by charging through the player (unlike cops who don't cause contact damage - DOGS DO cause contact damage)
- Worth more points when killed (200 base)
- Have a distinct sprite (lower, wider, 4-legged)

Add to createEnemy:
```js
function createEnemy(x, y, floor, type = null) {
  // type can be 'hat', 'suit', or 'dog'
  const isDog = type === 'dog';
  return {
    x, y,
    w: isDog ? 10 : 8,
    h: isDog ? 8 : 14,
    ...other fields...,
    type: type || (Math.random() < 0.3 ? 'hat' : 'suit'),
  };
}
```

Dogs should ONLY be spawned on levels 4+ (index 3+). Use LEVEL_CONFIG.hasDogs flag.

In spawnEnemies(), check level config for dogs. On dog levels, ~30% of enemies should be dogs.

Draw dogs distinctly: lower profile, four legs, ears. Use PAL.darkest.

Dogs DO cause contact damage (re-add contact damage check but ONLY for dogs).

### 5. ELEVATOR TOP PLATE
Currently elevators are just a bottom plate (h=4). The real game has a top plate too.

Add a `topY` property to elevators. The top plate sits at `elev.topY = elev.y - floorH * TILE + 4` (roughly one floor above the bottom plate, moves with it).

Player can stand ON TOP of the elevator:
- If player lands on the top plate, they ride it but CANNOT control up/down
- Player is a passenger on top, can still jump off or walk off
- Top plate collision: check if player feet are at topY and player is above

Add to createElevator:
```js
function createElevator(shaftX, startY, minY, maxY, floorH) {
  return {
    ...existing fields...,
    topH: 4,     // top plate thickness
    // topY is calculated dynamically: elev.y - (floorH * TILE) + 4
  };
}
```

In drawElevator, draw the top plate at the calculated topY position.

In updatePlayer, add collision check for elevator top plates (similar to bottom plate but player cannot control the elevator).

### 6. VERIFY BULLET DODGE (jump + crouch)
This should already work with the current crouch hitbox code (lines 1331-1344). 
Verify that:
- Crouching reduces hitbox to y+7 to y+14 (top half of body is unhittable) ✓
- Jumping raises player above bullet trajectory ✓
- Enemy bullets are fired at y+5 (standing) or y+10 (crouching) — these should pass over crouching players and under jumping players

If the bullet heights don't allow clean dodges, adjust enemy bullet Y to be at a consistent mid-body height (e.y + 6) so crouching below and jumping above are both viable.

### 7. SOLID SCORING MECHANISM
Create a clear scoring system:
```
Document door (red !): 500 pts
Question mark door:    200 pts
Kill cop (shooting):   100 pts (150 if lights off)
Kill cop (jump kick):  150 pts (200 if lights off)
Kill cop (elevator):   300 pts
Kill cop (lamp):       300 pts
Kill dog (any method): 200 pts (250 if lights off)
Kill boss:            2000 pts
Level clear bonus:    1000 * level_number (capped at 10000)
Extra life:           Every 10,000 points
```

Update all the scoring locations in the code to match this table. Make sure:
- updateBullets enemy kill section awards correct points by enemy type
- jump kick section awards correct points by enemy type
- elevator crush awards correct points
- lamp kill awards correct points

### 8. DIFFICULTY CURVE
As levels progress:
- Enemy count increases (already partially done, enhance it)
- Enemy shoot frequency increases (reduce shootTimer range)
- Enemy patrol speed increases slightly
- Dogs move faster on later levels
- More enemies spawn from blue doors
- Boss at level 6 is tough

Implementation:
```js
function getDifficultyMultiplier(level) {
  return {
    enemySpawnRate: 0.005 * (1 + level * 0.5),
    maxEnemies: 6 + level * 3,
    shootTimerBase: Math.max(0.8, 1.5 - level * 0.1),
    shootTimerRandom: Math.max(0.5, 1.5 - level * 0.15),
    patrolSpeed: ENEMY_SPEED * (1 + level * 0.08),
    dogSpeed: ENEMY_SPEED * 1.8 * (1 + level * 0.1),
  };
}
```

### 9. BOSS ENEMY AT END OF LEVEL 6
When the player reaches the bottom floor of level 6, a boss spawns.

Boss properties:
- Larger sprite (16x16 px)
- Has health: 10 hits to kill
- Shoots faster (every 0.6 seconds)
- Fires 2 bullets at once (straight + angled)
- Moves slower but aggressively chases player on same floor
- Flashes when hit
- Worth 2000 points

Add `isBoss` flag to enemy. Boss has special AI:
- Always faces player
- Shoots rapidly
- Cannot be one-shot killed (has boss HP)

Boss sprite: larger trenchcoat figure with distinctive hat, drawn with more detail.

When boss dies, level complete triggers immediately (don't need to go to exit).

### 10. LEVEL INTRO SCREENS
Before each level starts, show a brief "FLOOR X" / "LEVEL X" intro screen for ~2 seconds.

Add new state: `STATE.LEVEL_INTRO = 7`

In initLevel, instead of setting state directly to PLAYING, set it to LEVEL_INTRO first.

Draw function:
```js
function drawLevelIntro() {
  ctx.fillStyle = PAL.darkest;
  ctx.fillRect(0, 0, NATIVE_W, NATIVE_H);
  ctx.fillStyle = PAL.lightest;
  ctx.font = '8px "Press Start 2P"';
  ctx.textAlign = 'center';
  ctx.fillText('LEVEL ' + (G.level + 1), NATIVE_W / 2, 60);
  ctx.fillStyle = PAL.light;
  ctx.fillText('FLOOR ' + G.building.numFloors, NATIVE_W / 2, 80);
  // Show level name/subtitle
  const names = ['LOBBY', 'OFFICES', 'ARCHIVES', 'KENNEL', 'PENTHOUSE', 'ROOFTOP'];
  ctx.fillText(names[G.level % 6] || 'BUILDING', NATIVE_W / 2, 100);
}
```

### 11. EXTRA LIFE EVERY 10,000 POINTS
Track a threshold. Every time score crosses a 10,000 boundary, grant extra life.

```js
// In G object, add:
nextLifeAt: 10000,

// After any score addition, check:
function checkBonusLife() {
  while (G.score >= G.nextLifeAt) {
    G.lives++;
    G.nextLifeAt += 10000;
    // Play special SFX
    SFX.pickup(); // or a special 1UP sound
    G.weaponPickupMsg = '1UP!';
    G.weaponPickupTimer = 2.0;
  }
}
```

Call checkBonusLife() after every score change.

### 12. ENHANCED SOUND EFFECTS
The SFX object already exists with basic sounds. Add these new ones:
```js
SFX.dogBark()    — short, low growl for dogs (low frequency burst)
SFX.bossHit()    — deep impact sound
SFX.bossDeath()  — dramatic explosion sequence
SFX.levelIntro() — ascending chime when level intro shows
SFX.extraLife()  — celebratory jingle for 1UP
SFX.rocketExplode() — explosion sound for rocket weapon
```

### 13. UPDATE render_game_to_text
Add new fields to the diagnostic output:
- dogs count
- boss alive/dead
- current level config
- nextLifeAt threshold

## IMPORTANT IMPLEMENTATION NOTES

1. The game uses an IIFE wrapper — all code is inside `(() => { ... })()`
2. The game loop is at the end: `requestAnimationFrame(gameLoop)`
3. State constants are in STATE object — add LEVEL_INTRO = 7
4. All rendering goes through the render() function switch statement
5. The update() function switch statement dispatches to update functions
6. Enemy types are just strings on the enemy object ('hat', 'suit', 'dog', 'boss')
7. Sound uses Web Audio API procedural synthesis — keep it simple
8. Touch controls map to keyboard codes — no changes needed there

## TESTING CHECKLIST
After making changes, the game should:
- Start at title screen, press START to begin
- Show level intro "LEVEL 1" for 2 seconds
- Generate a building with correct floor count
- Player can move, jump, shoot, crouch
- Cops walk/stop/walk pattern, shoot only when on same floor
- Contact with cops does NOT cause damage
- Question mark doors give random weapons (6 total: pistol, machinegun, spread, laser, shotgun, rocket)
- Red doors give documents and 500 points
- Dogs appear on levels 4+, run toward player, cause contact damage
- Elevators have top and bottom plates
- Score system matches the spec table
- Level 6 has a boss
- Extra life at every 10,000 points
- Game over works correctly
- window.render_game_to_text() returns valid JSON with all fields
