import { Button } from "@mui/material";
import { UxpTheme } from "@uxp/ui-lib";
import React from "react";
import { useSelector } from "react-redux";
import ImageDisplay from "./ImageDisplay";
import { selectTemplateValue } from "./features/template/templateSelector";
import { fetchTemplate } from "./features/template/templateThunk";
import { useAppDispatch } from "./hooks";

const H2CApp: React.FC = () => {
    const dispatch = useAppDispatch();
    const value = useSelector(selectTemplateValue);

    const handleButtonClick = () => {
        dispatch(fetchTemplate());
    };

    return (
        <UxpTheme>
            <div>
                <h1>Welcome to U2C App</h1>

                <ImageDisplay />
                <Button variant="contained" color="primary" onClick={handleButtonClick}>
                    Call Template Thunk
                </Button>
                <div>{value}</div>
            </div>
        </UxpTheme>
    );
};

export default H2CApp;
