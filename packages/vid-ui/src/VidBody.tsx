import { Alert, Box, Snackbar, SnackbarCloseReason } from "@mui/material";
import React from "react";
import { AppBodyContent } from "@uxp/ui-lib";
import { Navigate, Route, Routes } from "react-router-dom";
import { CastBar, CAST_ROW_ROOM } from "./features/cast/CastBar";
import { CastProvider } from "./features/cast/CastProvider";
import { useBarSessions } from "./features/cast/useBarSessions";
import { PlayerPage } from "./features/cast/PlayerPage";
import { ChromecastsPage } from "./features/chromecast/ChromecastsPage";
import { ClipListPage } from "./features/home-video/ClipListPage";
import { ClipPage } from "./features/home-video/ClipPage";
import { saveErrorCleared } from "./features/home-video/saveErrorSlice";
import { selectSaveErrorMessage } from "./features/home-video/saveErrorSelectors";
import { PlaylistsPage } from "./features/playlist/PlaylistsPage";
import { HomePage } from "./features/home/HomePage";
import { useAppDispatch, useAppSelector } from "./hooks";
import { CHROMECASTS_PATH, HOME_PATH, HOME_VIDEOS_PATH, PLAYER_PATH, PLAYLISTS_PATH } from "./menu";
import { VideoNavigation } from "./VideoNavigation";

const SaveErrorNotice = () => {
    const dispatch = useAppDispatch();
    const saveError = useAppSelector(selectSaveErrorMessage);
    const clearSaveError = () => dispatch(saveErrorCleared());
    // A click elsewhere is what blurs the field that was being saved, so it must not close the notice.
    const closeNotice = (_event: React.SyntheticEvent | Event, reason?: SnackbarCloseReason) => {
        if (reason !== "clickaway") clearSaveError();
    };
    return (
        <Snackbar open={saveError !== undefined} autoHideDuration={6000} onClose={closeNotice}>
            <Alert severity="error" onClose={clearSaveError}>
                {saveError}
            </Alert>
        </Snackbar>
    );
};

/** The page keeps its end clear of the cast bar, which is fixed to the bottom of the window. */
const Pages = () => {
    const sessionCount = useBarSessions().length;
    return (
        <Box sx={{ pb: `${sessionCount * CAST_ROW_ROOM}px` }}>
            <VideoNavigation />
            <Routes>
                <Route path={HOME_PATH} element={<HomePage />} />
                <Route path={HOME_VIDEOS_PATH} element={<ClipListPage />} />
                <Route path={`${HOME_VIDEOS_PATH}/clips/:id`} element={<ClipPage />} />
                <Route path={CHROMECASTS_PATH} element={<ChromecastsPage />} />
                <Route path={PLAYLISTS_PATH} element={<PlaylistsPage />} />
                <Route path={`${PLAYER_PATH}/:deviceId`} element={<PlayerPage />} />
                <Route path="*" element={<Navigate to={HOME_PATH} replace={true} />} />
            </Routes>
        </Box>
    );
};

export const VidBody = () => (
    <AppBodyContent appHaveOwnLeftSideBar={false}>
        <CastProvider>
            <Pages />
            <CastBar />
            <SaveErrorNotice />
        </CastProvider>
    </AppBodyContent>
);
