import { useEffect } from "react";
import { useSelector } from "react-redux";
import ChatRoom from "./ChatRoom";
import ChatRoomList from "./ChatRoomList";
import ChatUserList from "./ChatUserList";

import { useDemoWebSocket } from "../../app/DemoWebSocketManager";
import { selectCurrentRoom } from "./chatSelector";

const ChatPage = () => {
    const currentRoom = useSelector(selectCurrentRoom());
    const { sendMessage } = useDemoWebSocket();
    useEffect(() => {

        return () => {
            if (currentRoom) {
                sendMessage("leave_room", { room: currentRoom });

            }
        };
    }, [currentRoom]);

    return (
        <div className="chat-page">
            <ChatRoomList />
            {currentRoom ? (
                <div className="chat-container">
                    <ChatRoom />
                    <ChatUserList />
                </div>
            ) : (
                <p>Select a room to start chatting</p>
            )}
        </div>
    );
};

export default ChatPage;
