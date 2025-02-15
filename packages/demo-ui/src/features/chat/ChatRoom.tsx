import { useState } from "react";
import { useSelector } from "react-redux";
import { useAppDispatch } from "../../hooks";
import { sendMessage } from "./chatActions";
import { selectCurrentRoom, selectRoomMessages } from "./chatSelector";


const ChatRoom = () => {
    const dispatch = useAppDispatch();
    const currentRoom = useSelector(selectCurrentRoom());
    const messages = useSelector(selectRoomMessages());

    const [message, setMessage] = useState("");

    const handleSend = () => {
        if (message.trim() && currentRoom) {
            dispatch(sendMessage(currentRoom, message));
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
