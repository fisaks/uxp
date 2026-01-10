import { Middleware } from "@reduxjs/toolkit";
import { UserPublic } from "@uxp/common";
import { UXP_USER_CHANGE_EVENT } from "@uxp/ui-lib";
import { login, logout, whoami } from "../features/user/userThunks"; // adjust path

let lastUser: UserPublic | undefined = undefined;

export const uxpUserBroadcastMiddleware: Middleware =
    (store) => (next) => (action) => {
        const result = next(action);

        if (
            login.fulfilled.match(action) ||
            whoami.fulfilled.match(action) ||
            logout.fulfilled.match(action)
        ) {
            const currentUser = store.getState().user.user;

            if (currentUser !== lastUser) {
                lastUser = currentUser;

                window.dispatchEvent(
                    new CustomEvent(UXP_USER_CHANGE_EVENT, {
                        detail: currentUser,
                    })
                );
            }
        }

        return result;
    };
