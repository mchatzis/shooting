defmodule BackendWeb.HelloController do
  use BackendWeb, :controller

  def hello(conn, _params) do
    json(conn, %{message: "hello world"})
  end
end
