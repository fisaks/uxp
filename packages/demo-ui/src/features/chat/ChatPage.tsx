import { useEffect } from "react";
import { useSelector } from "react-redux";
import ChatRoom from "./ChatRoom";
import ChatRoomList from "./ChatRoomList";
import ChatUserList from "./ChatUserList";

import { useDemoWebSocket } from "../../app/DemoAppBrowserWebSocketManager";
import { selectCurrentRoom } from "./chatSelector";
import { setCurrentRoom } from "./chatSlice";
import { useAppDispatch } from "../../hooks";
import { Box, Typography } from "@mui/material";

const ChatPage = () => {
    const currentRoom = useSelector(selectCurrentRoom());
    const { sendMessage } = useDemoWebSocket();
    const dispatch=useAppDispatch();
    useEffect(() => {

        return () => {
            if (currentRoom) {
                sendMessage("leave_room", { room: currentRoom });
                 dispatch(setCurrentRoom(null));
            }
        };
    }, [currentRoom]);

    return (
        <Box sx={{}}>
            <Typography variant="h1">Chat</Typography>
            <ChatRoomList />
            {currentRoom ? (
                <div className="chat-container">
                    <ChatRoom />
                    <ChatUserList />
                </div>
            ) : (
                <p>Select a room to start chatting</p>
            )}
        </Box>
    );
};

export default ChatPage;
