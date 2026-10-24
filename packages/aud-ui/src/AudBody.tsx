import { AppBodyContent } from "@uxp/ui-lib";
import { Navigate, Route, Routes } from "react-router-dom";
import StatusPage from "./pages/StatusPage";

export const AudBody = () => {
    return (
        <AppBodyContent appHaveOwnLeftSideBar={false}>
            <Routes>
                <Route path="/status" element={<StatusPage />} />
                <Route path="*" element={<Navigate to="/status" replace={true} />} />
            </Routes>
        </AppBodyContent>
    );
};
