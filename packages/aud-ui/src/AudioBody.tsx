import { Box } from "@mui/material";
import { AppBodyContent } from "@uxp/ui-lib";
import { Navigate, Route, Routes } from "react-router-dom";
import { AudioNavigation } from "./AudioNavigation";
import AmplifierPage from "./features/amplifier/AmplifierPage";
import LibraryPage from "./features/library/LibraryPage";

export const AudioBody = () => {
    return (
        <AppBodyContent appHaveOwnLeftSideBar={false}>
            <Box sx={{ maxWidth: 900, mx: "auto" }}>
                <AudioNavigation />
                <Routes>
                    <Route path="/amplifier" element={<AmplifierPage />} />
                    <Route path="/library/*" element={<LibraryPage />} />
                    <Route path="*" element={<Navigate to="/amplifier" replace={true} />} />
                </Routes>
            </Box>
        </AppBodyContent>
    );
};
