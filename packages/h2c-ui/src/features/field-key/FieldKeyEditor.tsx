import { Add, Close } from "@mui/icons-material";
import {
    Box,
    Grid2,
    TextField,
    Typography
} from "@mui/material";
import React, { useMemo, useState } from "react";

import { FieldKeyType } from "@h2c/common";
import { AsyncIconButton, GhostHintAutocomplete } from "@uxp/ui-lib";
import { useSelector } from "react-redux";
import { useAppDispatch } from "../../hooks";
import { selectActionError } from "../loading-error/loadingErrorSlice";
import { addKey, removeKey } from "./fieldKeyThunk";
import { useFieldKeysRenderValue } from "./useFieldKeyRenderValue";
import { useFieldKeys } from "./useFieldKeys";


type FieldKeyEditorProps = {
    type: FieldKeyType;
    editorLabel?: string;
    addKeyLabel: string;
    editMode: boolean;
    value: Record<string, string>;
    onKeyAdd: ({ key, value }: { key: string, value: string }) => Promise<unknown>;
    onKeyRemove: (key: string) => Promise<unknown>;
    renderValueField?: (key: string, value: string, editMode: boolean) => React.ReactNode;
};



type FieldRenderItem = {
    key: string;
    val: string;
    size: number;
};

export const FieldKeyEditor: React.FC<FieldKeyEditorProps> = ({
    type,
    value,
    onKeyAdd,
    onKeyRemove,
    editorLabel,
    renderValueField,
    addKeyLabel,
    editMode = false,
}) => {
    const dispatch = useAppDispatch();
    const availableKeys = useFieldKeys(type);
    const [newKeyInput, setNewKeyInput] = useState("");
    const [newValueInput, setNewValueInput] = useState("");
    const fieldKeyAddError = useSelector(selectActionError("fieldKeys/add"))
    const usedKeys = Object.keys(value).map((k) => k.toLowerCase());

    const filteredOptions = useMemo(() => {
        return availableKeys.filter((k) => !usedKeys.includes(k.normalizedKey));
    }, [availableKeys, usedKeys]);

    const renderValue: FieldRenderItem[] = useFieldKeysRenderValue(value);

    const handleAdd = async () => {
        const trimmedKey = newKeyInput.trim();
        if (!trimmedKey || usedKeys.includes(trimmedKey.toLowerCase())) return;

        // Check if it exists already
        const exists = availableKeys.find(
            (k) => k.normalizedKey === trimmedKey.toLowerCase()
        );

        if (!exists) {
            dispatch(addKey({
                type,
                key: newKeyInput,
            }));
        }
        return onKeyAdd({ key: trimmedKey, value: newValueInput }).then(() => {
            setNewKeyInput("");
            setNewValueInput("");
        });

    };

    const handleRemove = (key: string) => {
        const updated = { ...value };
        delete updated[key];
        return onKeyRemove(key);
    };
    const handleRemoveKey = (key: string) => {
        return dispatch(removeKey({
            type,
            key,
        })).unwrap();
    };

    return (
        <Box sx={{ mb: 2, mt: 2, }}>
            {editorLabel && <Typography variant="subtitle2" gutterBottom>
                {editorLabel}
            </Typography>}

            <Grid2 container spacing={2} >
                {renderValue.map(({ key, val, size, }) => (

                    <Grid2 key={key} size={{ xs: 12, md: size }}>
                        <Box sx={{
                            display: "flex", alignItems: "center",
                            transition: "box-shadow 0.2s, transform 0.2s",
                            '&:has(.hover-trigger:hover)': {
                                boxShadow: 3,
                                transform: "translateY(-2px)",
                            }
                        }}>
                            <Box sx={{ flex: 1 }}>
                                {renderValueField ? (
                                    renderValueField(key, val, editMode)) :
                                    <TextField

                                        label={key}
                                        value={val}
                                        disabled={true}
                                        fullWidth
                                        sx={{ mr: 1 }}
                                    />
                                }
                            </Box>
                            {editMode &&

                                <AsyncIconButton tooltip="Remove Detail" className="hover-trigger" onClick={() => handleRemove(key)}>
                                    <Close />
                                </AsyncIconButton>}

                        </Box>
                    </Grid2>

                ))}
            </Grid2>

            {editMode && <Grid2 container spacing={1} alignItems="center" mt={1} mb={1}>
                <Grid2 size={{ xs: 12, md: 6 }} >
                    <GhostHintAutocomplete label={addKeyLabel} options={filteredOptions.map((o) => o.key)} sx={{ mr: '2.6rem' }}
                        value={newKeyInput} onInputChange={setNewKeyInput} onRemoveHint={handleRemoveKey} hintAdditionError={fieldKeyAddError} />
                </Grid2>
                <Grid2 size={{ xs: 12, md: 6 }} >
                    <Box sx={{ display: "flex", alignItems: "center" }}>

                        <TextField
                            multiline
                            maxRows={4}
                            label="Value"
                            value={newValueInput}
                            onChange={(e) => setNewValueInput(e.target.value)}
                            sx={{ flex: 2, minWidth: "15rem" }}
                            fullWidth
                        />

                        <AsyncIconButton
                            tooltip="Add Detail"
                            onClick={handleAdd}
                            disabled={!newKeyInput.trim() || !newValueInput}>
                            <Add />
                        </AsyncIconButton>

                    </Box>
                </Grid2>
            </Grid2>}

        </Box >
    );
};
