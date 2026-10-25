import { AppBodyContent } from "@uxp/ui-lib";
import { Navigate, Route, Routes } from "react-router-dom";
import AmplifierPage from "./features/amplifier/AmplifierPage";

export const AudioBody = () => {
    return (
        <AppBodyContent appHaveOwnLeftSideBar={false}>
            <Routes>
                <Route path="/amplifier" element={<AmplifierPage />} />
                <Route path="*" element={<Navigate to="/amplifier" replace={true} />} />
            </Routes>
        </AppBodyContent>
    );
};
