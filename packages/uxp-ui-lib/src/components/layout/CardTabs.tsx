import AddIcon from "@mui/icons-material/Add";
import { Box, Tab, Tabs, useTheme } from "@mui/material";
import React, { forwardRef, useImperativeHandle, useMemo, useRef, useState } from "react";
import { SANITIZE_TABS_PROPS, SanitizedProps } from "../../util/SanitizedProps";
import { AsyncIconButton } from "../forms/AsyncIconButton";

export type CardTab = {
    label: string;
    hint?: string;
    icon?: React.ReactElement;
};

export type CardTabsHandle = {
    selectTab: (index: number) => void;
    getSelectedIndex: () => number;
};

export type CardTabsProps = {
    tabs: CardTab[];
    children: React.ReactNode;
    initialValue?: number;
    addTab?: (event: React.MouseEvent<HTMLButtonElement>) => Promise<unknown>;
};

export const CardTabs = forwardRef<CardTabsHandle, CardTabsProps>(({ tabs, children, initialValue = 0, addTab }, ref) => {
    const theme = useTheme();
    const [selectedIndex, setSelectedIndex] = useState(initialValue);
    const portalRef = useRef<HTMLDivElement>(null);
    useImperativeHandle(ref, () => ({
        selectTab: (index: number) => setSelectedIndex(index),
        getSelectedIndex: () => selectedIndex,
    }), [selectedIndex]);
    const handleAddTab = (event: React.MouseEvent<HTMLButtonElement>) => {
        if (addTab) {
            return addTab(event).then(() => {
                setSelectedIndex(tabs.length);
            });
        }
        return Promise.resolve();
    };
    const childrenArray = useMemo(() => (React.Children.toArray(children)), [children]);

    return (
        <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
            <Tabs
                value={Math.min(selectedIndex, childrenArray.length - 1)}

                onChange={(_, i) => setSelectedIndex(i)}
                variant="scrollable"
                scrollButtons="auto"

                sx={{
                    minHeight: "48px",
                    '& .MuiTab-root': {
                        textTransform: "none",
                        borderTopLeftRadius: "8px",
                        borderTopRightRadius: "8px",
                        minHeight: "48px",
                        px: 2,
                        py: 1,
                        backgroundColor: theme.palette.action.selected,
                        border: `1px solid ${theme.palette.divider}`,
                        borderBottom: "none",
                        marginRight: 1,
                        zIndex: 1,
                    },
                    '& .Mui-selected': {
                        backgroundColor: theme.palette.action.disabled,
                        boxShadow: theme.shadows[2],
                        zIndex: 2,
                    },
                }}
            >
                {tabs.map((tab, idx) => (

                    <Tab key={`${tab.label}_${idx}`} label={tab.label} icon={tab.icon} iconPosition={tab.icon ? "start" : undefined} title={tab.hint} />


                ))}
                {addTab && <SanitizedProps keys={SANITIZE_TABS_PROPS}>
                    <AsyncIconButton onClick={handleAddTab}
                        tooltip="Add Another Building"
                        tooltipPortal={portalRef}>
                        <AddIcon />
                    </AsyncIconButton></SanitizedProps>}
            </Tabs>

            <Box
                sx={{
                    border: `1px solid ${theme.palette.divider}`,
                    borderTop: "none",
                    borderRadius: "0 0 8px 8px",

                    mt: 0,
                }}
            >
                {React.Children.toArray(children)[Math.min(selectedIndex, childrenArray.length - 1)]}
            </Box>
            <div ref={portalRef}></div>
        </Box>
    );
});


