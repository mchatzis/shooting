- Remove other players' ids (injection attack using another player's ids)
- Maybe this too slow? :
```
  defp generate_player_id do
    :crypto.strong_rand_bytes(16) |> Base.encode16()
  end
```
- force SSL
- Add 'meta' and 'twitter' in hmtl
- Restrict games to 15 players each, 5-minute duration
- Collision Detection: The axis-by-axis approach (resolve_collision_along_x/y/z) works but may miss diagonal collisions. The doc’s AABB intent is met, but you might consider enhancing this later for robustness, as noted in the thinking trace.
- Each incoming “move” message calls update_player_input via an asynchronous cast. These messages update the player’s input state (keys and rotation). However, the game’s physics and position updates only occur on each tick (every ~16.67ms). This means that regardless of how many input messages arrive in between ticks, only the most recent state is used when the tick processes the update. This means user input can get lost.