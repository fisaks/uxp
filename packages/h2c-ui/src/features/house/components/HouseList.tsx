import HouseIcon from '@mui/icons-material/House';
import WbShadeIcon from '@mui/icons-material/WbShade';
import React, { useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch } from "../../../app/store";

import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { Box, Collapse, List, ListItem, ListItemText, useTheme } from "@mui/material";
import { CardTabs, withErrorHandler, withLoading, WithOptionalTooltip } from "@uxp/ui-lib";

import { DocumentEditorRef } from "../../document/components/DocumentEditor";
import { selectAllHouses } from "../houseSelectors";
import { addBuilding } from "../houseThunks";


import { BuildingPanel } from "./BuildingPanel";
import { HouseActions } from './HouseActions';
import { HousePanel } from "./HousePanel";

type HouseArgument = {
    uuid: string;
    houseName: string;
}
const HouseList: React.FC = () => {
    const dispatch: AppDispatch = useDispatch();
    const houses = useSelector(selectAllHouses);
    const theme = useTheme();
    const documentRef = useRef<DocumentEditorRef>(null);
    const [expandedHouseId, setExpandedHouseId] = useState<string | null>(null);
    const [editMode, setEditMode] = useState(false);

    const handleExpandHouse = (event: React.MouseEvent<HTMLElement>, houseId: string) => {

        if (!event.currentTarget.contains(event.target as Node)) return;

        setExpandedHouseId(expandedHouseId === houseId ? null : houseId);
        setEditMode(false);
    };
    const addBuildingTab = (houseUuid: string) => {
        return dispatch(addBuilding(houseUuid)).unwrap();
    }


    const handleEditToggle = (event: React.MouseEvent<HTMLElement>, houseId: string) => {

        event.stopPropagation();
        const isSameHouse = expandedHouseId === houseId;

        if (editMode) {
            if (isSameHouse) {
                documentRef.current?.save();
                setEditMode(false);
            }
            // Don't toggle anything if editing another house
            return;
        }
        if (!isSameHouse) {
            setExpandedHouseId(houseId);
        }
        setEditMode(true);

    };

    return (
        <div>
            <List>
                {houses.map((house) => (
                    <Box key={house.uuid} sx={{ borderBottom: `1px solid ${theme.palette.divider}`, mb: 1 }}>
                        <ListItem
                            component={"div"}
                            onClick={(e) => { handleExpandHouse(e, house.uuid) }}
                            sx={{
                                cursor: "pointer",
                                backgroundColor: theme.palette.background.paper,
                                "&:hover": { backgroundColor: theme.palette.action.hover },
                            }}
                        >
                            <ListItemText primary={house.name || "Please fill in house details"}
                                slotProps={{
                                    primary: {
                                        sx: {
                                            color: !house.name ? theme.palette.warning.main : undefined,
                                        },
                                    },
                                }}
                            />
                            <HouseActions house={house} handleEditToggle={handleEditToggle} />

                            {expandedHouseId === house.uuid ? <WithOptionalTooltip tooltip={"Hide House"}><ExpandLessIcon /></WithOptionalTooltip> : <WithOptionalTooltip tooltip={"Show House"}><ExpandMoreIcon /></WithOptionalTooltip>}
                        </ListItem>
                        <Collapse in={expandedHouseId === house.uuid} timeout="auto" unmountOnExit>
                            <Box sx={{ backgroundColor: theme.palette.background.paper }}>
                                <CardTabs tabs={[{ label: house.name, icon: <HouseIcon /> }, ...(house.buildings.map((building) => ({ label: building.name || "New Building", icon: <WbShadeIcon /> })))]}
                                    addTab={editMode ? () => addBuildingTab(house.uuid) : undefined}
                                >
                                    <HousePanel
                                        house={house}
                                        expandedHouseId={expandedHouseId}
                                        editMode={editMode}
                                        documentRef={documentRef}
                                    />
                                    {house.buildings.map((building) => (<BuildingPanel key={building.uuid} building={building} houseUuid={house.uuid} editMode={editMode} />))}
                                </CardTabs>

                            </Box>
                        </Collapse>
                    </Box>
                ))
                }
            </List >

        </div >
    );
};

export default withErrorHandler(withLoading(HouseList));
