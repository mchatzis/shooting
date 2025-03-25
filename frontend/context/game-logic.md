## High-Level Game Design and Plan

### Overview
This document outlines the design and technical plan for a simple, non-graphic, multiplayer first-person shooter game featuring tactical sniper combat. The game focuses on core mechanics like player movement, projectile-based shooting, and free-for-all matches, all within a confined arena. It's designed to be minimalistic yet functional, prioritizing simplicity and fun within a 5-day development window.

---

### Game Environment and Setting
- **Environment**: A confined arena with a ground level and floating boxes at various heights. Players can jump to reach higher levels and land on boxes. (one jump at a time)
- **Aesthetics**: Very minimalistic—solid colors only. The ground is one color (e.g., blue), and boxes are in different solid shades. No textures or complex models.
- **Boundaries**: Invisible barriers prevent players from leaving the arena.

---

### Player Interaction and Movement
- **Controls**:
  - **W, A, S, D**: Move forward, left, backward, right.
  - **Spacebar**: Jump
  - **Mouse**: Controls camera direction for aiming and looking around.
- **Movement Feel**: Players move fast and feel agile. Camera movement is smooth for a responsive experience.
- **Collisions**: Players stop when colliding with objects (ground and boxes).
- **Future Additions**: Sprinting with the Shift key may be added later but is not a priority now.

---

### Combat Mechanics
- **Weapons**: Only snipers are available, with a significant reload delay (about a second) to limit active bullets and encourage tactical play.
- **Shooting**:
  - Bullets are projectiles that travel with a curved (ballistic) path due to gravity.
- **Ammo**: Unlimited ammo.

---

### Projectile Dynamics
- **Trajectory**: Bullets follow a curved path affected by gravity, requiring players to adjust aim for distance and drop.
- **Collision Detection**: Every bullet checks for collisions with players and objects. Checks must be robust and accurate.
- **Performance**: The low fire rate of snipers ensures few bullets are in the air at once, minimizing performance impact.

---

### Non-Graphic Presentation
- **Hit Feedback**: Red sparks appear when a bullet hits a player or object.
- **Damage Indication**: A red filter is applied to the screen when a player is hit.
- **Elimination**: Players are removed from play when health reaches zero and respawn after a short delay (e.g., 5 seconds).

---

### Multiplayer Aspects
- **Match Structure**: Free-for-all battles with a maximum of 15 players.
- **Match Flow**: Players jump straight into matches without a lobby system.
- **Communication**: No in-game chat for now; a global chat may be added in the future.
- **Match Duration**: Matches last 5 minutes, after which scores reset.

---

### Scoring and Progression
- **Scoring**: Tracks kills and deaths for individual players.
- **Match Objective**: The player with the most kills after 5 minutes wins.
- **Progression**: No persistent progression; scores reset after each match.

---

### User Interface and Experience
- **HUD**:
  - Displays health, ammo, and personal score (kills/deaths).
  - Pressing **Tab** shows the global scoreboard with player stats.
- **Respawn**: Players respawn after a short delay (e.g., 5 seconds) upon elimination.

---

### Game Modes and Objectives
- **Mode**: Free-for-all.
- **Objective**: The player with the most kills after 5 minutes wins.
- **Simplicity**: One mode only to keep development focused and manageable.

---

## Technical Specification

### 1. Player Movement Synchronization
- **Approach**: Use an authoritative server model.
  - Server initializes the game state. Eg. It creates the positions of the boxes and sends them to the client.
  - The server controls player positions and processes inputs.
  - Clients send movement inputs (e.g., W, A, S, D, Spacebar) to the server, which updates positions and broadcasts them to all clients.
- **Algorithm**:
  - Update movement at a fixed rate (e.g., 60 times per second).
  - Calculate velocity from input (e.g., forward = W pressed) and apply it: `position += velocity * deltaTime`.
  - For jumping, add an upward velocity (e.g., `velocity.y = jumpSpeed`) when Spacebar is pressed, allowing a single jump at a time.
- **Purpose**: Keeps all players in sync and prevents cheating.

---

### 2. Collision Management
- **Types**:
  - **Player-Environment**: Players collide with the ground and boxes.
  - **Player-Player**: Players do not collide with each other.
  - **Projectile-Player/Environment**: Bullets collide with players and objects.
- **Approach**:
  - Use Axis-Aligned Bounding Boxes (AABB) for players and objects (rectangular shapes).
  - For projectiles, use raycasting to detect hits along their curved paths.
- **Algorithm**:
  - **Player Collisions**: Before moving, check if the new position overlaps an AABB. If so, stop movement in that direction.
  - **Projectile Collisions**: Simulate the bullet's path in small steps, using raycasting between each step to check for AABB intersections.
- **Purpose**: AABB is simple and efficient for boxes, while raycasting ensures accurate bullet hits.

---

### 3. Projectile Physics
- **Trajectory**: Bullets curve downward due to gravity.
- **Algorithm**:
  - Update bullet position each frame with physics:
    - `position.x += velocity.x * deltaTime`
    - `position.z += velocity.z * deltaTime`
    - `position.y += velocity.y * deltaTime - 0.5 * gravity * deltaTime^2`
    - `velocity.y -= gravity * deltaTime`
  - Use raycasting between the previous and current positions to detect collisions.
- **Purpose**: Simulates realistic bullet drop and enables precise collision checks.

---

### 4. Scoring and Match Management
- **Scoring**:
  - Each kill increments the killer's score.
  - Deaths are tracked per player.
- **Match Flow**:
  - Matches start with up to 15 players and run for 5 minutes.
  - The server resets scores and restarts the match afterward.
- **Algorithm**:
  - Server tracks a timer (e.g., `timeLeft -= deltaTime`).
  - On elimination, increment the killer's score, respawn the player after 5 seconds, and update clients.
- **Purpose**: Centralizes scoring and timing for fairness and simplicity.

---

### Summary of Key Algorithms
- **Movement**: Velocity updates with fixed time steps.
- **Collisions**: AABB for players/objects; raycasting for projectiles.
- **Projectiles**: Physics-based paths with gravity and collision checks.
- **Networking**: 
  - Authoritative server with WebSocket updates.
  - Client-side prediction and reconciliation for local player.
  - Interpolation with fixed delay (e.g., 100ms) for smooth other-player movement.
- **Scoring**: Server-side tracking with real-time broadcasts.

---

# In-Depth Explanation

---

### Ballistics
- **Tracking Bullet Path**:
  - Each tick, the server knows the bullet's previous position (last tick) and current position (this tick).
- **Raycasting**:
  - Draw an imaginary line (a ray) from the bullet's previous position to its current position.
  - Check if this ray intersects with any player's or object's bounding box (e.g., an axis-aligned bounding box, or AABB).
  - For a fast bullet, it might move far in one tick (e.g., 16.67 units at 1000 units/s). To avoid missing hits ("tunneling"), the server ensures the ray covers the full path.
- **Hit Resolution**:
  - If the ray hits a player:
    - Calculate the exact hit point.
    - Reduce the player's health (e.g., instant kill for a sniper headshot).
    - Notify all clients of the hit (e.g., "Player A hit Player B").
  - If it hits an object (e.g., a wall), the bullet stops and is removed.

### Client Feedback
- **Hit Notification**: The server sends a message to:
  - The shooter's client: Show red sparks at the hit location.
  - The victim's client: Appy a red filter to the screen to indicate damage.
- **Elimination**: If health drops to zero, the victim's client shows a respawn timer, and they rejoin after a delay.

---