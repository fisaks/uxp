import { Alert, Snackbar } from "@mui/material";
import { AppBodyContent } from "@uxp/ui-lib";
import { Navigate, Route, Routes } from "react-router-dom";
import { ClipListPage } from "./features/home-video/ClipListPage";
import { ClipPage } from "./features/home-video/ClipPage";
import { HomeVideosProvider, useHomeVideos } from "./features/home-video/HomeVideosProvider";

const HOME_PATH = "/";

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

export const VidBody = () => (
    <AppBodyContent appHaveOwnLeftSideBar={false}>
        <HomeVideosProvider>
            <Routes>
                <Route path={HOME_PATH} element={<ClipListPage />} />
                <Route path="/clips/:id" element={<ClipPage />} />
                <Route path="*" element={<Navigate to={HOME_PATH} replace={true} />} />
            </Routes>
            <SaveErrorNotice />
        </HomeVideosProvider>
    </AppBodyContent>
);
