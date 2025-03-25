defmodule BackendWeb.HelloChannel do
  use Phoenix.Channel

  # When a client joins the "hello" channel, kick off a recurring task.
  def join("hello", _params, socket) do
    # Kick off the first send immediately
    send(self(), :send_hi)
    {:ok, socket}
  end

  # Handle the recurring :send_hi message
  def handle_info(:send_hi, socket) do
    # Send "hi" to the client on the "hi" event
    push(socket, "hi", %{message: "hi"})
    # Schedule the next message in 5 seconds (5000 milliseconds)
    Process.send_after(self(), :send_hi, 5000)
    {:noreply, socket}
  end
end
