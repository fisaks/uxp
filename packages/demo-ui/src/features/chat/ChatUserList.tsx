import { useSelector } from "react-redux";
import { selectCurrentRoom, selectRoomUsers } from "./chatSelector";

const ChatUserList = () => {
    const currentRoom = useSelector(selectCurrentRoom());
    const users = useSelector(selectRoomUsers())

    return (
        <div className="chat-user-list">
            <h3>Users in {currentRoom}</h3>
            <ul>
                {users.map((username) => (
                    <li key={username}>{username}</li>
                ))}
            </ul>
        </div>
    );
};

export default ChatUserList;
