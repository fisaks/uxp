import { useState } from "react";
import { useSelector } from "react-redux";
import { useDemoWebSocket } from "../../app/DemoAppBrowserWebSocketManager";
import { selectCurrentRoom, selectRoomMessages } from "./chatSelector";


const ChatRoom = () => {
    const currentRoom = useSelector(selectCurrentRoom());
    const messages = useSelector(selectRoomMessages());
    const { sendMessage } = useDemoWebSocket();
    const [message, setMessage] = useState("");

    const handleSend = () => {
        if (message.trim() && currentRoom) {
            sendMessage("send_message", { room: currentRoom, text: message });
            setMessage("");
        }
    };

    return (
        <div className="chat-room">
            <h2>Room: {currentRoom}</h2>
            <div className="messages">
                {messages.map((msg, index) => (
                    <p key={index}>
                        <strong>{msg.username}:</strong> {msg.text}
                    </p>
                ))}
            </div>
            <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type a message..."
            />
            <button onClick={handleSend}>Send</button>
        </div>
    );
};

export default ChatRoom;
