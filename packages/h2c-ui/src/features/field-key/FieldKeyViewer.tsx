import {
    Box,
    Grid2,
    Typography
} from "@mui/material";
import { ReadOnlyTextField } from "@uxp/ui-lib";
import React from "react";
import { useFieldKeysRenderValue } from "./useFieldKeyRenderValue";

type FieldKeyViewerProps = {
    editorLabel?: string;
    value: Record<string, string>;
    renderValueField?: (key: string, value: string) => React.ReactNode;
    printLayout?: boolean;
}

type FieldRenderItem = {
    key: string;
    val: string;
    size: number;
};

export const FieldKeyViewer: React.FC<FieldKeyViewerProps> = ({
    value,
    editorLabel,
    renderValueField,
    printLayout
}) => {

    const renderValue: FieldRenderItem[] = useFieldKeysRenderValue(value);

    return (
        <Box sx={{ mb: 2, mt: 2, }}>
            {editorLabel && <Typography variant="subtitle2" gutterBottom>
                {editorLabel}
            </Typography>}

            <Grid2 container spacing={2} >
                {renderValue.map(({ key, val, size, }) => (

                    <Grid2 key={key} size={printLayout ? size : { xs: 12, md: size }}>
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
                                    renderValueField(key, val)) :
                                    <ReadOnlyTextField
                                        label={key}
                                        value={val}
                                        sx={{ mr: 1 }}
                                    />
                                }
                            </Box>
                        </Box>
                    </Grid2>
                ))}
            </Grid2>
        </Box >
    );
};
