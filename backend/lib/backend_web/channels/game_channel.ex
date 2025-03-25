defmodule BackendWeb.GameChannel do
  use Phoenix.Channel

  def join("game", _params, socket) do
    {player_id, starting_position} = Backend.GameServer.join_game()
    players = Backend.GameServer.get_players()
    boxes = Backend.GameServer.get_boxes()

    payload = %{
      player_id: player_id,
      starting_position: starting_position,
      players: players,
      boxes: boxes
    }

    {:ok, payload, assign(socket, :player_id, player_id)}
  end

  def handle_in(
        "move",
        %{"keys" => keys, "rotation_y" => rotation_y, "sequenceNumber" => sequence_number},
        socket
      ) do
    player_id = socket.assigns.player_id
    Backend.GameServer.update_player_input(player_id, keys, rotation_y, sequence_number)
    {:noreply, socket}
  end

  def terminate(_reason, socket) do
    Backend.GameServer.leave_game(socket.assigns.player_id)
    :ok
  end
end
