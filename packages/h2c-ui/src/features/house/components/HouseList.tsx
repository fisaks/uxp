import React, { useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch } from "../../../app/store";

import { House } from "@h2c/common";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { Box, Collapse, IconButton, List, ListItem, ListItemText, Typography, useTheme } from "@mui/material";
import { ActionIconButton, DebouncedPatchTextField, RichTextEditor, withErrorHandler, withLoading } from "@uxp/ui-lib";

import { selectAllHouses } from "../houseSelectors";
import { deleteHouse, patchHouseField } from "../houseThunks";
import { DocumentEditor, DocumentEditorRef } from "../../document/components/DocumentEditor";

const HouseList: React.FC = () => {
    const dispatch: AppDispatch = useDispatch();
    const houses = useSelector(selectAllHouses);
    const theme = useTheme();
    const documentRef=useRef<DocumentEditorRef>(null);

    const [expandedHouseId, setExpandedHouseId] = useState<string | null>(null);
    const [editMode, setEditMode] = useState(false);

    const handleExpandHouse = (houseId: string) => {
        setExpandedHouseId(expandedHouseId === houseId ? null : houseId);
        setEditMode(false);
    };

    const handleEditToggle = () => {
        if(editMode) {
            documentRef.current?.save();
        }
        setEditMode(!editMode);
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
                            <ListItemText primary={house.name} />
                            <ActionIconButton
                                thunk={deleteHouse}
                                dispatch={dispatch}
                                payload={house.uuid}
                                confirmMessage="Are you sure you want to delete this house?"
                                tooltip="Delete House"
                            >
                                <DeleteIcon sx={{ color: theme.palette.error.main }} />
                            </ActionIconButton>
                            {expandedHouseId === house.uuid ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                        </ListItem>
                        <Collapse in={expandedHouseId === house.uuid} timeout="auto" unmountOnExit>
                            <Box sx={{ pt: 2, pb: 2, backgroundColor: theme.palette.action.selected, borderRadius: "4px" }}>
                                <Box sx={{ backgroundColor: theme.palette.background.paper, pl: 1, pr: 1 }}>
                                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                        <Typography variant="h6" color={theme.palette.text.primary}>
                                            House Details
                                        </Typography>
                                        <IconButton onClick={handleEditToggle}>
                                            <EditIcon sx={{ color: theme.palette.primary.main }} />
                                        </IconButton>{" "}
                                    </Box>

                                    <Box sx={{ mt: 2 }}>
                                        <DebouncedPatchTextField<House>
                                            entityId={house.uuid}
                                            label="House Name"
                                            field="name"
                                            value={house.name}
                                            disabled={!editMode}
                                            dispatch={dispatch}
                                            patchAction={patchHouseField}
                                        />

                                        <DebouncedPatchTextField<House>
                                            entityId={house.uuid}
                                            label="Address"
                                            field="address"
                                            value={house.address}
                                            disabled={!editMode}
                                            dispatch={dispatch}
                                            patchAction={patchHouseField}
                                        />

                                        <DebouncedPatchTextField<House>
                                            entityId={house.uuid}
                                            label="Year Built"
                                            field="yearBuilt"
                                            value={house.yearBuilt}
                                            disabled={!editMode}
                                            dispatch={dispatch}
                                            patchAction={patchHouseField}
                                        />

                                        <DebouncedPatchTextField<House>
                                            entityId={house.uuid}
                                            label="Legal Registration Number"
                                            field="legalRegistrationNumber"
                                            value={house.legalRegistrationNumber}
                                            disabled={!editMode}
                                            dispatch={dispatch}
                                            patchAction={patchHouseField}
                                        />
                                        <DocumentEditor documentId={house.documentId} editable={editMode} ref={documentRef} />
                                         
                                    </Box>
                                </Box>
                            </Box>
                        </Collapse>
                    </Box>
                ))}
            </List>
        </div>
    );
};

export default withErrorHandler(withLoading(HouseList));
