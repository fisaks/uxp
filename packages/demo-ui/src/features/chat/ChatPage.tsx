import { useEffect } from "react";
import { useSelector } from "react-redux";
import ChatRoom from "./ChatRoom";
import ChatRoomList from "./ChatRoomList";
import ChatUserList from "./ChatUserList";

import { useAppDispatch } from "../../hooks";
import { connectWebSocket, leaveRoom } from "./chatActions";
import { selectCurrentRoom } from "./chatSelector";

const ChatPage = () => {
    const dispatch = useAppDispatch();
    const currentRoom = useSelector(selectCurrentRoom());

    useEffect(() => {
        dispatch(connectWebSocket())

        return () => {
            if (currentRoom) {
                leaveRoom(currentRoom);
            }
        };
    }, [dispatch, currentRoom]);

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
