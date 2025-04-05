import React, { useCallback } from "react";
import { useDispatch } from "react-redux";
import { AppDispatch } from "../../../app/store";

import { House } from "@h2c/common";
import { Box, Divider, Grid2, useTheme } from "@mui/material";
import { DebouncedAsyncTextField } from "@uxp/ui-lib";

import { DocumentEditor, DocumentEditorRef } from "../../document/components/DocumentEditor";
import { FieldKeyEditor } from "../../field-key/FieldKeyEditor";
import { patchHouseField } from "../houseThunks";

type HousePanelProps = {
    house: House;
    expandedHouseId: string | null;
    editMode: boolean;
    documentRef: React.RefObject<DocumentEditorRef>;
};
export const HousePanel = ({ house, expandedHouseId, documentRef, editMode }: HousePanelProps) => {
    const dispatch: AppDispatch = useDispatch();

    const theme = useTheme();

    const handleHousePatchField = useCallback(({ field, value }: { field: keyof House | `details.${string}`; value?: string }) => {
        return dispatch(patchHouseField({ entityId: house.uuid, field, value })).unwrap();
    }, [house.uuid]);


    return (

        <Box sx={{ pt: 0, pb: 2, backgroundColor: theme.palette.action.selected, borderRadius: "4px" }}>
            <Box sx={{ backgroundColor: theme.palette.background.paper, pl: 1, pr: 1 }}>
                <Box sx={{ mt: 0, pt: 2 }}>

                    <Grid2 container spacing={2} columns={{ xs: 12, md: 12, }}>

                        <Grid2 size={{ xs: 12, md: 6 }} >
                            <DebouncedAsyncTextField<House>
                                fullWidth
                                label="House Name"
                                field="name"
                                value={house.name}
                                disabled={!editMode}
                                asyncAction={handleHousePatchField}
                            />
                        </Grid2>
                        <Grid2 size={{ xs: 12, md: 2 }}>
                            <DebouncedAsyncTextField<House>
                                fullWidth
                                label="Year Built"
                                field="yearBuilt"
                                value={house.yearBuilt}
                                disabled={!editMode}
                                asyncAction={handleHousePatchField}
                            />
                        </Grid2>
                        <Grid2 size={{ xs: 12, md: 4 }}>
                            <DebouncedAsyncTextField<House>

                                fullWidth
                                label="Legal Registration Number"
                                field="legalRegistrationNumber"
                                value={house.legalRegistrationNumber}
                                disabled={!editMode}
                                asyncAction={handleHousePatchField} />
                        </Grid2>
                        <Grid2 size={12}>
                            <DebouncedAsyncTextField<House>
                                multiline
                                maxRows={4}
                                label="Address"
                                field="address"
                                value={house.address}
                                disabled={!editMode}
                                asyncAction={handleHousePatchField}
                            />
                        </Grid2>
                        <Grid2 size={12}>
                            <Divider textAlign="center" sx={{ fontWeight: 'bold' }}>Additional Details</Divider>

                            <FieldKeyEditor

                                addKeyLabel="Add Field"
                                editMode={editMode}
                                type="building"
                                value={house.details ?? {}}
                                onKeyAdd={({ key, value }) => {
                                    return dispatch(patchHouseField({ entityId: house.uuid, field: `details.${key}`, value })).unwrap();
                                }}
                                onKeyRemove={(key) => {
                                    return dispatch(patchHouseField({ entityId: house.uuid, field: `details.${key}`, value: undefined })).unwrap();
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
                                        asyncAction={handleHousePatchField}
                                    />

                                )}
                            />

                        </Grid2>

                        <Grid2 size={12}>
                            <Divider textAlign="center" sx={{ mb: 2, fontWeight: 'bold' }}>Notes</Divider>
                            <DocumentEditor documentId={house.documentId} editable={editMode} ref={documentRef} label={`${house.name} Notes`} />
                        </Grid2>
                    </Grid2>
                </Box>
            </Box>
        </Box>


    )
}