## Overview

- **Tick Rate**: game loop ticks per second
- **Collision Type**: Axis-Aligned Bounding Box (AABB) collisions
- **Resolution Order**: X, Z, Y axis sequentially

## Player and Box Definitions

- **Player AABB**:
  - Min: `(x - 1, y, z - 0.5)`
  - Max: `(x + 1, y + 4.5, z + 0.5)`
  - Note: `y` is the player's base (feet)

- **Box AABB**:
  - Min: `(box.x - 2.5, box.y - 2.5, box.z - 2.5)`
  - Max: `(box.x + 2.5, box.y + 2.5, box.z + 2.5)`

## Collision Resolution Process

For each tick, the server updates the player's position as follows:

1. **Calculate Horizontal Velocity (vx, vz)**:
   - Derived from player input (W, A, S, D) and rotation
   - Normalized if speed exceeds 10 units/sec (is this true?)

2. **Calculate Vertical Velocity (vy)**:
   - Apply gravity: `vy -= gravity * delta_time`
   - If jumping (on ground and space pressed): `vy = jump_force`

3. **Compute Movement Deltas**:
   - `dx = vx / tick_rate`
   - `dy = vy / tick_rate`
   - `dz = vz / tick_rate`

4. **Resolve Collisions Along Each Axis**:
   - **X-Axis**:
     - Move: `temp_x += dx`
     - If intersecting boxes:
       - `dx > 0`: Set `x = min(box.left) - 1`
       - `dx < 0`: Set `x = max(box.right) + 1`
   - **Z-Axis**:
     - Move: `temp_z += dz`
     - If intersecting boxes:
       - `dz > 0`: Set `z = min(box.front) - 0.5`
       - `dz < 0`: Set `z = max(box.back) + 0.5`
   - **Y-Axis**:
     - Move: `temp_y += dy`
     - If intersecting boxes:
       - `dy > 0`: Set `y = min(box.bottom) - 4.5`
       - `dy < 0`: Set `y = max(box.top)`, `vy = 0`, `on_ground = true`
     - If no intersections:
       - `y < 0`: Set `y = 0`, `vy = 0`, `on_ground = true`
       - `y >= 0`: Set `on_ground = false`