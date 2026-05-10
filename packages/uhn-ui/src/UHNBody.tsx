import { AppBodyContent } from "@uxp/ui-lib";
import { Route, Routes, useLocation } from "react-router-dom";
import { CommandPaletteDialog } from "./features/command-palette/CommandPaletteDialog";
import { CommandPaletteProvider } from "./features/command-palette/CommandPaletteContext";
import { useCommandPaletteShortcut } from "./features/command-palette/useCommandPaletteShortcut";
import { ApiTokenPage } from "./features/api-token/pages/ApiTokenPage";
import { BlueprintListPage } from "./features/blueprint/pages/BlueprintListPage";
import { IconPreviewPage } from "./features/blueprint/pages/IconPreviewPage";
import { UploadBlueprintPage } from "./features/blueprint/pages/UploadBlueprintPage";
import { LocationPage } from "./features/location/pages/LocationPage";
import { ResourcePage } from "./features/resource/pages/ResourcePage";
import { RulePage } from "./features/rule/pages/RulePage";
import { ScenePage } from "./features/scene/pages/ScenePage";
import { TechnicalPageWrapper } from "./features/technical/components/TechnicalPageWrapper";
import { TechnicalPage } from "./features/technical/pages/TechnicalPage";
import { TopicTracePage } from "./features/topic-trace/pages/TopicTracePage";
import { SchedulePage } from "./features/schedule/pages/SchedulePage";
import { ViewPage } from "./features/view/pages/ViewPage";

export const UHNBody = () => {
    const location = useLocation();
    const isHomePage = location.pathname === "/" || (!location.pathname.startsWith("/technical"));
    const { paletteOpen, paletteClose, paletteTrigger } = useCommandPaletteShortcut(!isHomePage);

    return (
        <AppBodyContent appHaveOwnLeftSideBar={false}>
            <CommandPaletteDialog open={paletteOpen} onClose={paletteClose} />
            <CommandPaletteProvider value={paletteTrigger}>
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
                <Route path="/technical/rules" element={
                    <TechnicalPageWrapper><RulePage /></TechnicalPageWrapper>
                } />
                <Route path="/technical/rules/:itemId" element={
                    <TechnicalPageWrapper><RulePage /></TechnicalPageWrapper>
                } />
                <Route path="/technical/schedules" element={
                    <TechnicalPageWrapper><SchedulePage /></TechnicalPageWrapper>
                } />
                <Route path="/technical/schedules/:itemId" element={
                    <TechnicalPageWrapper><SchedulePage /></TechnicalPageWrapper>
                } />

                <Route path="*" element={<LocationPage />} />
            </Routes>
            </CommandPaletteProvider>
        </AppBodyContent>
    );
};
