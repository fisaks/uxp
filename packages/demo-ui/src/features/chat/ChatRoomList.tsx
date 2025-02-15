import { useSelector } from "react-redux";
import { useAppDispatch } from "../../hooks";
import { joinRoom } from "./chatActions";
import { selectChatRooms } from "./chatSelector";


const ChatRoomList = () => {
    const dispatch = useAppDispatch();
    const rooms = useSelector(selectChatRooms());

    const handleJoinRoom = (room: string) => {
        dispatch(joinRoom(room));
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
