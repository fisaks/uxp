import { BuildingData } from "@h2c/common";
import DeleteIcon from "@mui/icons-material/Delete";
import { Box, Divider, Grid2, useTheme } from "@mui/material";
import { ActionIconButton, DebouncedAsyncTextField } from "@uxp/ui-lib";
import { useCallback } from "react";
import { useAppDispatch } from "../../../hooks";
import { DocumentEditor } from "../../document/components/DocumentEditor";
import { FieldKeyEditor } from "../../field-key/FieldKeyEditor";
import { patchBuildingField, removeBuilding } from "../houseThunks";

type BuildingPanelProps = {
    houseUuid: string;
    building: BuildingData;
    editMode: boolean;

}

export const BuildingPanel = ({ building, houseUuid, editMode }: BuildingPanelProps) => {
    const dispatch = useAppDispatch();
    const theme = useTheme();

    const handlePatchBuildingField = useCallback(({ field, value }: { field: keyof BuildingData | `details.${string}`; value?: string }) => {
        return dispatch(patchBuildingField({ uuidHouse: houseUuid, uuidBuilding: building.uuid, field, value })).unwrap();
    }, [houseUuid, building.uuid]);

    return (
        <Box sx={{ pt: 0, pb: 2, backgroundColor: theme.palette.action.selected, borderRadius: "4px" }}>
            <Box sx={{ backgroundColor: theme.palette.background.paper, pl: 1, pr: 1 }}>
                <Box sx={{ mt: 0, pt: 2 }}>

                    <Grid2 container spacing={2} columns={{ xs: 12, md: 12, }}>

                        <Grid2 size={{ xs: 12, md: 10 }} sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <DebouncedAsyncTextField<BuildingData>
                                fullWidth
                                label="Building Name"
                                field="name"
                                value={building.name}
                                disabled={!editMode}
                                asyncAction={handlePatchBuildingField}

                            />
                            {editMode && <ActionIconButton
                                thunk={removeBuilding}
                                dispatch={dispatch}
                                payload={{ houseUuid: houseUuid, buildingUuid: building.uuid }}
                                confirmMessage={building.name ? `Are you sure you want to delete the ${building.name} building?` : "Are you sure you want to delete this building?"}
                                tooltip={`Delete Building ${building.name}`}
                            >
                                <DeleteIcon sx={{ color: theme.palette.error.main }} />
                            </ActionIconButton>}
                        </Grid2>
                        <Grid2 size={{ xs: 12, md: 2 }}>
                            <DebouncedAsyncTextField<BuildingData>
                                fullWidth
                                label="Year Built"
                                field="yearBuilt"
                                value={building.yearBuilt}
                                disabled={!editMode}
                                asyncAction={handlePatchBuildingField}
                            />
                        </Grid2>
                        <Grid2 size={12}>
                            <Divider textAlign="center" sx={{ fontWeight: 'bold' }}>Additional Details</Divider>

                            <FieldKeyEditor

                                addKeyLabel="Add Field"
                                editMode={editMode}
                                type="building"
                                value={building.details ?? {}}
                                onKeyAdd={({ key, value }) => {
                                    return dispatch(patchBuildingField({ uuidHouse: houseUuid, uuidBuilding: building.uuid, field: `details.${key}`, value })).unwrap();
                                }}
                                onKeyRemove={(key) => {
                                    return dispatch(patchBuildingField({ uuidHouse: houseUuid, uuidBuilding: building.uuid, field: `details.${key}`, value: undefined })).unwrap();
                                }}
                                renderValueField={(key, value, editMode) => (
                                    <DebouncedAsyncTextField<Record<`details.${string}`, string>>
                                        multiline
                                        variant="outlined"
                                        maxRows={8}
                                        fullWidth
                                        label={key}
                                        field={`details.${key}`}
                                        value={value}
                                        disabled={!editMode}
                                        asyncAction={handlePatchBuildingField}
                                    />

                                )}
                            />

                        </Grid2>
                        <Grid2 size={12}>
                            <Divider textAlign="center" sx={{ mb: 2, fontWeight: 'bold' }}>Notes</Divider>
                            <DocumentEditor documentId={building.documentId} editable={editMode} label={`${building.name} Notes`} />
                        </Grid2>
                    </Grid2>
                </Box>
            </Box>
        </Box>
    );
}