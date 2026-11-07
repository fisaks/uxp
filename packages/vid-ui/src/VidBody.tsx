import { Alert, Box, Snackbar } from "@mui/material";
import { AppBodyContent } from "@uxp/ui-lib";
import { Navigate, Route, Routes } from "react-router-dom";
import { CastBar, CAST_ROW_ROOM } from "./features/cast/CastBar";
import { CastProvider, useCast } from "./features/cast/CastProvider";
import { ClipListPage } from "./features/home-video/ClipListPage";
import { ClipPage } from "./features/home-video/ClipPage";
import { HomeVideosProvider, useHomeVideos } from "./features/home-video/HomeVideosProvider";
import { HomePage } from "./features/home/HomePage";
import { HOME_PATH, HOME_VIDEOS_PATH } from "./menu";
import { VideoNavigation } from "./VideoNavigation";

const SaveErrorNotice = () => {
    const { saveError, clearSaveError } = useHomeVideos();
    return (
        <Snackbar open={saveError !== undefined} autoHideDuration={6000} onClose={clearSaveError}>
            <Alert severity="error" onClose={clearSaveError}>
                {saveError}
            </Alert>
        </Snackbar>
    );
};

/** The page keeps its end clear of the cast bar, which is fixed to the bottom of the window. */
const Pages = () => {
    const sessionCount = useCast().state?.sessions.length ?? 0;
    return (
        <Box sx={{ pb: `${sessionCount * CAST_ROW_ROOM}px` }}>
            <VideoNavigation />
            <Routes>
                <Route path={HOME_PATH} element={<HomePage />} />
                <Route path={HOME_VIDEOS_PATH} element={<ClipListPage />} />
                <Route path={`${HOME_VIDEOS_PATH}/clips/:id`} element={<ClipPage />} />
                <Route path="*" element={<Navigate to={HOME_PATH} replace={true} />} />
            </Routes>
        </Box>
    );
};

export const VidBody = () => (
    <AppBodyContent appHaveOwnLeftSideBar={false}>
        <CastProvider>
            <HomeVideosProvider>
                <Pages />
                <CastBar />
                <SaveErrorNotice />
            </HomeVideosProvider>
        </CastProvider>
    </AppBodyContent>
);
