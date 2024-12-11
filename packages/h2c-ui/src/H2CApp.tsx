import React from "react";
import ImageDisplay from "./ImageDisplay";
import { fetchTemplate } from "./features/template/templateThunk";
import { useDispatch, useSelector } from "react-redux";
import { selectTemplateValue } from "./features/template/templateSelector";
import { Button } from "@mui/material";
import { useAppDispatch } from "./hooks";

const H2CApp: React.FC = () => {
    const dispatch = useAppDispatch();
    const value = useSelector(selectTemplateValue);

    const handleButtonClick = () => {
        dispatch(fetchTemplate());
    };

    return (
        <div>
            <h1>Welcome to U2C App</h1>

            <ImageDisplay />
            <Button variant="contained" color="primary" onClick={handleButtonClick}>
                Call Template Thunk
            </Button>
            <div>{value}</div>
        </div>
    );
};

export default H2CApp;
