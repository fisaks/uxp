import { useSelector } from "react-redux";
import { useDemoWebSocket } from "../../app/DemoAppBrowserWebSocketManager";
import { selectChatRooms } from "./chatSelector";
import { useAppDispatch } from "../../hooks";
import { setCurrentRoom } from "./chatSlice";


const ChatRoomList = () => {
    const dispatch = useAppDispatch();
    const rooms = useSelector(selectChatRooms());
    const { sendMessage } = useDemoWebSocket();

    const handleJoinRoom = (room: string) => {
        sendMessage("join_room", { room });
        dispatch(setCurrentRoom(room));
    };

    return (
        <div className="chat-room-list">
            <h2>Available Rooms</h2>
            <ul>
                {rooms.map((room) => (
                    <li key={room}>
                        <button onClick={() => handleJoinRoom(room)}>{room}</button>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default ChatRoomList;
