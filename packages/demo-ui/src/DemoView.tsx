import { RemoteAppListener, UxpTheme } from "@uxp/ui-lib";
import React from "react";
import MiscPage from "./features/template/MiscPage";



const DemoView: React.FC = () => {

    return (
        <UxpTheme>
            <RemoteAppListener />
            <MiscPage />
        </UxpTheme>
    );
};

export default DemoView;
