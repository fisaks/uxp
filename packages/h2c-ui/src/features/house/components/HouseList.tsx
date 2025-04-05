import HouseIcon from '@mui/icons-material/House';
import WbShadeIcon from '@mui/icons-material/WbShade';
import React, { useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch } from "../../../app/store";

import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { Box, Collapse, IconButton, List, ListItem, ListItemText, useTheme } from "@mui/material";
import { ActionIconButton, CardTabs, withErrorHandler, withLoading, WithOptionalTooltip } from "@uxp/ui-lib";

import { DocumentEditorRef } from "../../document/components/DocumentEditor";
import { selectAllHouses } from "../houseSelectors";
import { addBuilding, deleteHouse } from "../houseThunks";

import { BuildingPanel } from "./BuildingPanel";
import { HousePanel } from "./HousePanel";

const HouseList: React.FC = () => {
    const dispatch: AppDispatch = useDispatch();
    const houses = useSelector(selectAllHouses);
    const theme = useTheme();
    const documentRef = useRef<DocumentEditorRef>(null);
    const [expandedHouseId, setExpandedHouseId] = useState<string | null>(null);
    const [editMode, setEditMode] = useState(false);

    const handleExpandHouse = (houseId: string) => {
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
                            onClick={() => handleExpandHouse(house.uuid)}
                            sx={{
                                cursor: "pointer",
                                backgroundColor: theme.palette.background.paper,
                                "&:hover": { backgroundColor: theme.palette.action.hover },
                            }}
                        >
                            <ListItemText primary={house.name || "Please fill in house details"}
                                primaryTypographyProps={{ sx: { color: !house.name ? theme.palette.warning.main : undefined } }} />
                            <ActionIconButton
                                thunk={deleteHouse}
                                dispatch={dispatch}
                                payload={house.uuid}
                                confirmMessage="Are you sure you want to delete this house?"
                                tooltip="Delete House"
                            >
                                <DeleteIcon sx={{ color: theme.palette.error.main }} />
                            </ActionIconButton>
                            <WithOptionalTooltip tooltip={"Edit House"}>
                                <IconButton onClick={(e) => handleEditToggle(e, house.uuid)} aria-label="Edit House">
                                    <EditIcon sx={{ color: theme.palette.primary.main }} />
                                </IconButton>
                            </WithOptionalTooltip>
                            {expandedHouseId === house.uuid ? <WithOptionalTooltip tooltip={"Hide House"}><ExpandLessIcon /></WithOptionalTooltip> : <WithOptionalTooltip tooltip={"Show House"}><ExpandMoreIcon /></WithOptionalTooltip>}
                        </ListItem>
                        <Collapse in={expandedHouseId === house.uuid} timeout="auto" unmountOnExit>
                            <Box sx={{ backgroundColor: theme.palette.background.paper }}>
                                <CardTabs tabs={[{ label: house.name, icon: <HouseIcon /> }, ...(house.buildings.map((building) => ({ label: building.name || "New Building", icon: <WbShadeIcon /> })))]}
                                    addTab={() => addBuildingTab(house.uuid)}
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
