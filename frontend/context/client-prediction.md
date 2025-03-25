### Smoothing movement by correcting server update jitter
#### Client-Side Prediction and interpolation for Local Player
1. **Immediate Local Movement**: When the player presses a key (e.g., W, A, S, D, or Spacebar), the client calculates and applies the movement locally using the same physics rules as the server (e.g., move speed, gravity, jump force). The client has the map state (which is static and comprised of boxes and the ground) and will, therefore, calculate provisional collisions and prohibit movement. Of course, the server will enforce them in the next tick. Hence, it is important that the client and the server calculate collisions in the same way.

2. **Send Inputs to Server**: The client sends each input to the server with a unique sequence number, allowing the server to process them in order.

3. **Server Response**: The server records the inputs and updates the authoritative state. At the next tick, the server processes the new game state and sends it back to the client with the last processed sequence number.

4. **Reconciliation**: When the client receives the server’s state:
   - Compare the sequence number to see which inputs the server has processed.
   - If the client is ahead (has unprocessed inputs), reapply those inputs to the server’s state to align the local prediction.
   - Smoothly correct the local position if there’s a discrepancy.

#### Handling the Y-Axis
Since jumping and gravity affect vertical movement:
- **Local Prediction**: Simulate gravity and jumping locally (e.g., apply upward velocity on jump, decrease `y` velocity with gravity).
- **Jumping Rule**: Player can jump if they are on the ground or on a box.
- **Ground Reconciliation**: Trust the server’s “on_ground” flag. If the client’s state deviates, use the server update to re-establish the correct state, applying a simple, fixed smoothing correction if needed.

---

#### Interpolation for Other Players (Lerp with timestamps)
1. **Store Updates**: Store server updates (position, rotation) for other players with timestamps in a history buffer.
2. **Smooth Rendering**: Render each player’s position and rotation by interpolating between the two most recent updates, targeting a fixed delay (e.g., 100ms ago), to smooth out discrete server updates.
3. **Animation**: Calculate movement speed from interpolated positions to switch between idle and walking animations.
4. **Handle Delays**: If updates are late, hold the last interpolated position until new data arrives, avoiding extrapolation.


---