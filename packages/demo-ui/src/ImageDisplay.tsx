import React from "react";
import { Box } from "@mui/material";
import * as styles from "./ImageDisplay.module.css"; // Importing CSS module
import { getBaseUrlStatic } from "./config";

const ImageDisplay: React.FC = () => {
    return (
        <Box className={styles.container}>
            {" "}
            {/* Using a CSS module class */}
            <img
                src={`${getBaseUrlStatic()}/large-image.jpg`} // Large image loaded separately, not bundled
                alt="Large Display"
                className={styles.largeImage}
            />
            <img
                src={require("../static/small-image.jpg")} // Small image bundled with the project
                alt="Small Display"
                className="global-small-image" // Global CSS class from global.css
            />
        </Box>
    );
};

export default ImageDisplay;
