import { Button } from "@mui/material";
import { RemoteAppListener, selectCurrentUser, UxpTheme } from "@uxp/ui-lib";
import React, { Suspense, useState } from "react";
import { useSelector } from "react-redux";
import ImageDisplay from "./ImageDisplay";
import { selectTemplateValue } from "./features/template/templateSelector";
import { fetchTemplate } from "./features/template/templateThunk";
import { useAppDispatch } from "./hooks";

const LazyTextComponent = React.lazy(() => import("./LazyTextComponent"));

const H2CApp: React.FC = () => {
    const dispatch = useAppDispatch();
    const value = useSelector(selectTemplateValue);
    const user = useSelector(selectCurrentUser);
    const [showLazyComponent, setShowLazyComponent] = useState(false);

    const handleButtonClick = () => {
        dispatch(fetchTemplate());
    };

    const handleLazyLoadClick = () => {
        setShowLazyComponent(true);
    };

    return (
        <UxpTheme>
            <RemoteAppListener />
            <div>
                <h1>Welcome to U2C App {user?.username}</h1>

                <ImageDisplay />
                <Button variant="contained" color="primary" onClick={handleButtonClick}>
                    Call Template Thunk
                </Button>
                <div>{value}</div>

                <Button sx={{ mt: "20px" }} variant="contained" color="secondary" onClick={handleLazyLoadClick}>
                    Load Lazy Component
                </Button>

                {showLazyComponent && (
                    <Suspense fallback={<div>Loading...</div>}>
                        <LazyTextComponent />
                    </Suspense>
                )}
            </div>
        </UxpTheme>
    );
};

export default H2CApp;
