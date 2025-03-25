defmodule BackendWeb.UserSocket do
  use Phoenix.Socket

  ## Channels
  channel "game", BackendWeb.GameChannel
  channel "hello", BackendWeb.HelloChannel

  def connect(_params, socket, _connect_info), do: {:ok, socket}
  def id(_socket), do: nil
end
