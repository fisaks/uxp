import { UserPubllic } from "@uxp/common";
import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { setUser } from "./remoteAppSlice";

export const UXP_USER_CHANGE_EVENT = "uxpUserChange";
export type UxpUserChangeEvent = CustomEvent<{ detail: UserPubllic }>;

export const RemoteAppListener = () => {
    const dispatch = useDispatch();

    useEffect(() => {
        const initialUser = window.uxp?.getUser ? window.uxp?.getUser() : undefined;
        if (initialUser) {
            dispatch(setUser(initialUser));
        }
        const handleUserChange = (event: Event) => {
            const customEvent = event as UxpUserChangeEvent;
            console.log("Received user update:", customEvent.detail);
            dispatch(setUser(customEvent.detail)); // Update the local Redux state
        };

        window.addEventListener(UXP_USER_CHANGE_EVENT, handleUserChange);

        return () => {
            // Clean up the event listener
            window.removeEventListener(UXP_USER_CHANGE_EVENT, handleUserChange);
        };
    }, [dispatch]);

    return null;
};
