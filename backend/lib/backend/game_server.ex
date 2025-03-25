defmodule Backend.GameServer do
  use GenServer

  # Ticks per second for server
  @tick_rate 60
  @tick_interval div(1000, @tick_rate)

  def start_link(_opts \\ []), do: GenServer.start_link(__MODULE__, [], name: __MODULE__)

  def init(_opts) do
    boxes = generate_boxes()
    players = %{}
    schedule_tick()
    {:ok, %{boxes: boxes, players: players}}
  end

  def get_boxes, do: GenServer.call(__MODULE__, :get_boxes)
  def join_game, do: GenServer.call(__MODULE__, :join_game)
  def get_players, do: GenServer.call(__MODULE__, :get_players)

  def update_player_input(player_id, keys, rotation_y, sequence_number),
    do: GenServer.cast(__MODULE__, {:update_input, player_id, keys, rotation_y, sequence_number})

  def leave_game(player_id), do: GenServer.cast(__MODULE__, {:leave_game, player_id})

  # Handle calls
  def handle_call(:get_boxes, _from, state), do: {:reply, state.boxes, state}

  def handle_call(:join_game, _from, state) do
    player_id = generate_player_id()
    starting_position = generate_starting_position()

    player_data = %{
      position: starting_position,
      rotation_y: 0.0,
      keys: %{"w" => false, "a" => false, "s" => false, "d" => false, "space" => false},
      velocity: %{x: 0.0, y: 0.0, z: 0.0},
      on_ground: true,
      last_sequence: 0
    }

    new_players = Map.put(state.players, player_id, player_data)
    {:reply, {player_id, starting_position}, %{state | players: new_players}}
  end

  def handle_call(:get_players, _from, state) do
    players =
      Enum.into(state.players, %{}, fn {id, data} ->
        {id, %{position: data.position, rotation_y: data.rotation_y}}
      end)

    {:reply, players, state}
  end

  # Handle casts
  def handle_cast({:update_input, player_id, keys, rotation_y, sequence_number}, state) do
    case Map.get(state.players, player_id) do
      nil ->
        {:noreply, state}

      player_data ->
        new_player_data = %{
          player_data
          | keys: keys,
            rotation_y: rotation_y,
            last_sequence: sequence_number
        }

        new_players = Map.put(state.players, player_id, new_player_data)
        {:noreply, %{state | players: new_players}}
    end
  end

  def handle_cast({:leave_game, player_id}, state) do
    new_players = Map.delete(state.players, player_id)
    {:noreply, %{state | players: new_players}}
  end

  # Game loop tick
  def handle_info(:tick, state) do
    new_players =
      Enum.into(state.players, %{}, fn {id, data} ->
        {id, update_player_position(data, state.boxes)}
      end)

    # Broadcast updates
    players_data =
      Enum.into(new_players, %{}, fn {id, data} ->
        {id,
         %{
           position: data.position,
           rotation_y: data.rotation_y,
           sequence_number: data.last_sequence,
           on_ground: data.on_ground,
           velocity_y: data.velocity.y
         }}
      end)

    BackendWeb.Endpoint.broadcast("game", "update_positions", %{players: players_data})
    schedule_tick()
    {:noreply, %{state | players: new_players}}
  end

  defp schedule_tick do
    Process.send_after(self(), :tick, @tick_interval)
  end

  defp update_player_position(player_data, boxes) do
    keys = player_data.keys
    rotation_y = player_data.rotation_y
    position = player_data.position
    velocity = player_data.velocity
    on_ground = player_data.on_ground

    # units per second
    move_speed = 10.0
    jump_force = 35.0
    gravity = 9.8 * 4

    # Horizontal velocity
    {vx, vz} =
      Enum.reduce(["w", "s", "a", "d"], {0.0, 0.0}, fn key, {vx_acc, vz_acc} ->
        if Map.get(keys, key, false) do
          case key do
            "w" ->
              {vx_acc + move_speed * :math.sin(rotation_y),
               vz_acc + move_speed * :math.cos(rotation_y)}

            "s" ->
              {vx_acc - move_speed * :math.sin(rotation_y),
               vz_acc - move_speed * :math.cos(rotation_y)}

            "a" ->
              {vx_acc + move_speed * :math.cos(rotation_y),
               vz_acc - move_speed * :math.sin(rotation_y)}

            "d" ->
              {vx_acc - move_speed * :math.cos(rotation_y),
               vz_acc + move_speed * :math.sin(rotation_y)}
          end
        else
          {vx_acc, vz_acc}
        end
      end)

    # Normalize horizontal speed
    horizontal_speed = :math.sqrt(vx * vx + vz * vz)

    {vx, vz} =
      if horizontal_speed > move_speed and horizontal_speed > 0 do
        scale = move_speed / horizontal_speed
        {vx * scale, vz * scale}
      else
        {vx, vz}
      end

    # Vertical movement
    vy = velocity.y - gravity * (1.0 / @tick_rate)
    vy = if keys["space"] and on_ground, do: jump_force, else: vy

    # Calculate movements
    dx = vx / @tick_rate
    dz = vz / @tick_rate
    dy = vy / @tick_rate

    # Collision resolution
    temp_position = position

    temp_position =
      resolve_collision_along_x(%{temp_position | x: temp_position.x + dx}, dx, boxes)

    temp_position =
      resolve_collision_along_z(%{temp_position | z: temp_position.z + dz}, dz, boxes)

    {temp_position, vy, on_ground} =
      resolve_collision_along_y(%{temp_position | y: temp_position.y + dy}, dy, vy, boxes)

    new_velocity = %{x: vx, y: vy, z: vz}
    %{player_data | position: temp_position, velocity: new_velocity, on_ground: on_ground}
  end

  defp resolve_collision_along_x(temp_position, dx, boxes) do
    intersecting_boxes = get_intersecting_boxes(temp_position, boxes)

    if Enum.empty?(intersecting_boxes) do
      temp_position
    else
      if dx > 0 do
        box = Enum.min_by(intersecting_boxes, &(&1.position.x - 2.5))
        %{temp_position | x: box.position.x - 2.5 - 1}
      else
        box = Enum.max_by(intersecting_boxes, &(&1.position.x + 2.5))
        %{temp_position | x: box.position.x + 2.5 + 1}
      end
    end
  end

  defp resolve_collision_along_z(temp_position, dz, boxes) do
    intersecting_boxes = get_intersecting_boxes(temp_position, boxes)

    if Enum.empty?(intersecting_boxes) do
      temp_position
    else
      if dz > 0 do
        box = Enum.min_by(intersecting_boxes, &(&1.position.z - 2.5))
        %{temp_position | z: box.position.z - 2.5 - 0.5}
      else
        box = Enum.max_by(intersecting_boxes, &(&1.position.z + 2.5))
        %{temp_position | z: box.position.z + 2.5 + 0.5}
      end
    end
  end

  defp resolve_collision_along_y(temp_position, dy, vy, boxes) do
    intersecting_boxes = get_intersecting_boxes(temp_position, boxes)

    if Enum.empty?(intersecting_boxes) do
      if temp_position.y < 0,
        do: {%{temp_position | y: 0}, 0, true},
        else: {temp_position, vy, false}
    else
      if dy > 0 do
        box = Enum.min_by(intersecting_boxes, &(&1.position.y - 2.5))
        {%{temp_position | y: box.position.y - 2.5 - 4.5}, vy, false}
      else
        box = Enum.max_by(intersecting_boxes, &(&1.position.y + 2.5))
        {%{temp_position | y: box.position.y + 2.5}, 0, true}
      end
    end
  end

  defp get_intersecting_boxes(position, boxes) do
    Enum.filter(boxes, fn box ->
      box_min = %{x: box.position.x - 2.5, y: box.position.y - 2.5, z: box.position.z - 2.5}
      box_max = %{x: box.position.x + 2.5, y: box.position.y + 2.5, z: box.position.z + 2.5}
      player_min = %{x: position.x - 1, y: position.y, z: position.z - 0.5}
      player_max = %{x: position.x + 1, y: position.y + 4.5, z: position.z + 0.5}

      player_min.x < box_max.x and player_max.x > box_min.x and
        player_min.y < box_max.y and player_max.y > box_min.y and
        player_min.z < box_max.z and player_max.z > box_min.z
    end)
  end

  defp generate_player_id, do: :crypto.strong_rand_bytes(16) |> Base.encode16()

  defp generate_starting_position do
    %{x: :rand.uniform() * 160 - 80, y: 0, z: :rand.uniform() * 160 - 80}
  end

  defp generate_boxes do
    for _ <- 1..200 do
      height_dist = :rand.uniform()

      y =
        cond do
          height_dist < 0.1 -> 2.5
          height_dist < 0.3 -> 2.5 + :rand.uniform() * 15
          height_dist < 0.4 -> 20 + :rand.uniform() * 15
          height_dist < 0.75 -> 35 + :rand.uniform() * 25
          true -> 70 + :rand.uniform() * 50
        end

      %{
        position: %{
          x: :rand.uniform() * 160 - 80,
          y: y,
          z: :rand.uniform() * 160 - 80
        },
        material_index: :rand.uniform(5) - 1
      }
    end
  end
end
