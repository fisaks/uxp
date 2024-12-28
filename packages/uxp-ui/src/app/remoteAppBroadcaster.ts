import { UXP_USER_CHANGE_EVENT } from "@uxp/ui-lib";
import store from "./store"; // Your Redux store

// Expose the current user state globally
if (!window.uxp) {
    window.uxp = {};
}

window.uxp!.getUser = () => store.getState().user.user;

let previousUser = store.getState().user.user;

store.subscribe(() => {
    const currentUser = store.getState().user.user;

    // Broadcast changes only if the user state has changed
    if (currentUser !== previousUser) {
        previousUser = currentUser;
        console.log("Broadcasting user update:", currentUser); //
        window.dispatchEvent(
            new CustomEvent(UXP_USER_CHANGE_EVENT, {
                detail: currentUser, // Send the updated user state
            })
        );
    }
});
