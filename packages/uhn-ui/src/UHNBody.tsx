import { AppBodyContent } from "@uxp/ui-lib";
import { Route, Routes } from "react-router-dom";
import { ApiTokenPage } from "./features/api-token/pages/ApiTokenPage";
import { BlueprintListPage } from "./features/blueprint/pages/BlueprintListPage";
import { IconPreviewPage } from "./features/blueprint/pages/IconPreviewPage";
import { UploadBlueprintPage } from "./features/blueprint/pages/UploadBlueprintPage";
import { LocationPage } from "./features/location/pages/LocationPage";
import { ResourcePage } from "./features/resource/pages/ResourcePage";
import { ScenePage } from "./features/scene/pages/ScenePage";
import { TechnicalPageWrapper } from "./features/technical/components/TechnicalPageWrapper";
import { TechnicalPage } from "./features/technical/pages/TechnicalPage";
import { TopicTracePage } from "./features/topic-trace/pages/TopicTracePage";
import { ViewPage } from "./features/view/pages/ViewPage";

export const UHNBody = () => {
    return (
        <AppBodyContent appHaveOwnLeftSideBar={false}>
            <Routes>
                <Route path="/" element={<LocationPage />} />

                <Route path="/technical" element={
                    <TechnicalPageWrapper><TechnicalPage /></TechnicalPageWrapper>
                } />
                <Route path="/technical/topic-trace" element={
                    <TechnicalPageWrapper><TopicTracePage /></TechnicalPageWrapper>
                } />
                <Route path="/technical/blueprints" element={
                    <TechnicalPageWrapper><BlueprintListPage /></TechnicalPageWrapper>
                } />
                <Route path="/technical/blueprints/upload" element={
                    <TechnicalPageWrapper><UploadBlueprintPage /></TechnicalPageWrapper>
                } />
                <Route path="/technical/blueprints/icons" element={
                    <TechnicalPageWrapper><IconPreviewPage /></TechnicalPageWrapper>
                } />
                <Route path="/technical/api-tokens" element={
                    <TechnicalPageWrapper><ApiTokenPage /></TechnicalPageWrapper>
                } />
                <Route path="/technical/resources" element={
                    <TechnicalPageWrapper><ResourcePage /></TechnicalPageWrapper>
                } />
                <Route path="/technical/resources/:itemId" element={
                    <TechnicalPageWrapper><ResourcePage /></TechnicalPageWrapper>
                } />
                <Route path="/technical/views" element={
                    <TechnicalPageWrapper><ViewPage /></TechnicalPageWrapper>
                } />
                <Route path="/technical/views/:itemId" element={
                    <TechnicalPageWrapper><ViewPage /></TechnicalPageWrapper>
                } />
                <Route path="/technical/scenes" element={
                    <TechnicalPageWrapper><ScenePage /></TechnicalPageWrapper>
                } />
                <Route path="/technical/scenes/:itemId" element={
                    <TechnicalPageWrapper><ScenePage /></TechnicalPageWrapper>
                } />

                <Route path="*" element={<LocationPage />} />
            </Routes>
        </AppBodyContent>
    );
};
