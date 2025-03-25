import { Socket } from "phoenix";

const protocol = window.location.protocol === "https:" ? "wss" : "ws";
const backendHost = 'aram.gigalixirapp.com';
const socketUrl =
    import.meta.env.DEV
        ? "ws://localhost:4000/socket"
        : `${protocol}://${backendHost}/socket`;

export function connectHello() {
    const socket = new Socket(socketUrl, { params: {} });
    socket.connect();

    const channel = socket.channel("hello", {});
    channel.join()
        .receive("ok", (resp) => { console.log("Joined hello channel", resp); })
        .receive("error", (resp) => { console.error("Unable to join hello channel", resp); });

    channel.on("hi", payload => {
        console.log("Received hi message:", payload.message);
    });
}

export function connectGame(
    onGameDataReceived: (data: any) => void,
    onUpdatePositions: (data: any) => void
) {
    const socket = new Socket(socketUrl, { params: {} });
    socket.connect();

    const channel = socket.channel("game", {});
    channel.join()
        .receive("ok", (resp) => {
            console.log("Joined game channel", resp);
            onGameDataReceived(resp);
        })
        .receive("error", (resp) => {
            console.error("Unable to join game channel", resp);
        });

    // Listen for position updates from the server
    channel.on("update_positions", (payload) => {
        onUpdatePositions(payload);
    });

    // Return a function to send movement inputs with sequence number
    return (keys: any, rotation_y: number, sequenceNumber: number) => {
        channel.push("move", { keys, rotation_y, sequenceNumber });
    };
}