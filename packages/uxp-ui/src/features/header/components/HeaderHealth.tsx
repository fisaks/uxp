import React, { useState } from "react";

import { HealthBootstraps } from "./HealthBootstraps";
import { HealthIndicatorButton } from "./HealthIndicatorButton";
import { HealthMenu } from "./HealthMenu";
import { HealthNoticeBubble } from "./HealthNoticeBubble";
import { UxpHealth } from "./UxpHealth";


export const HeaderHealth = () => {
    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
    const openMenu = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const closeMenu = () => {
        setAnchorEl(null);
    };

    return (
        <>
            <HealthIndicatorButton onClick={openMenu} />
            <HealthNoticeBubble />
            <HealthBootstraps />
            <UxpHealth />

            <HealthMenu
                anchorEl={anchorEl}
                onClose={closeMenu}
            />
        </>
    );
};
