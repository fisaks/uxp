import { Autocomplete, Box, Chip, Stack, TextField, useTheme } from "@mui/material";
import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterLuxon } from "@mui/x-date-pickers/AdapterLuxon";
import { HomeVideoClip, HomeVideoClipUpdate } from "@vid/common";
import { usePortalContainerRef } from "@uxp/ui-lib";
import { DateTime } from "luxon";
import React, { useState } from "react";
import { useGetLabelsQuery, useUpdateClipMutation } from "./home-video.api";
import { NO_LABELS } from "./clipFormat";

// Side by side from a tablet width up, one under the other on a phone.
const DATE_ROW_COLUMNS = { xs: "1fr", sm: "1fr 200px" };
const LABELS_ROW_COLUMNS = { xs: "1fr", sm: "1fr 1fr" };

type LabelsFieldProps = { label: string; value: string[]; options: string[]; onChange: (value: string[]) => void };

/** Chips that are typed or picked from the labels already in use on other clips. */
const LabelsField: React.FC<LabelsFieldProps> = ({ label, value, options, onChange }) => {
    const portalContainer = usePortalContainerRef();
    return (
        <Autocomplete
            multiple
            freeSolo
            autoSelect
            size="small"
            options={options}
            value={value}
            sx={{ "& .MuiAutocomplete-popupIndicator, & .MuiAutocomplete-clearIndicator": { color: "primary.main" } }}
            onChange={(_, next) => onChange([...new Set(next.map((s) => s.trim()).filter(Boolean))])}
            renderTags={(tags, getTagProps) =>
                tags.map((tag, index) => {
                    const { key, ...props } = getTagProps({ index });
                    return <Chip key={key} label={tag} size="small" {...props} />;
                })
            }
            renderInput={(params) => <TextField {...params} label={label} />}
            slotProps={{ popper: { container: portalContainer.current } }}
        />
    );
};

/** The fields of a clip. A text field is saved when you leave it, a list or the date when it changes; only what changed is sent. */
export const ClipForm: React.FC<{ clip: HomeVideoClip }> = ({ clip }) => {
    const labels = useGetLabelsQuery().data ?? NO_LABELS;
    const [updateClip] = useUpdateClipMutation();
    const [title, setTitle] = useState(clip.title);
    const [description, setDescription] = useState(clip.description);
    const theme = useTheme();
    const portalContainer = usePortalContainerRef();

    const save = (update: HomeVideoClipUpdate) => void updateClip({ id: clip.id, update });
    const saveTitle = () => {
        const next = title.trim();
        setTitle(next);
        if (next !== clip.title) save({ title: next });
    };
    const saveDescription = () => {
        const next = description.trim();
        setDescription(next);
        if (next !== clip.description) save({ description: next });
    };
    // Typing a date passes through values that are not dates yet: only a whole date, or an emptied field, is saved.
    const saveDate = (value: DateTime | null) => {
        if (value === null || value.isValid) {
            const next = value?.toISODate() ?? null;
            if (next !== clip.date) save({ date: next });
        }
    };

    return (
        <Stack sx={{ gap: 2 }}>
            <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: DATE_ROW_COLUMNS }}>
                <TextField label="Title" size="small" value={title} onChange={(e) => setTitle(e.target.value)} onBlur={saveTitle} />
                <LocalizationProvider dateAdapter={AdapterLuxon} adapterLocale="fi">
                    <DatePicker
                        label="Date"
                        format="d.M.yyyy"
                        value={clip.date ? DateTime.fromISO(clip.date) : null}
                        onChange={saveDate}
                        slotProps={{
                            textField: { size: "small", fullWidth: true },
                            field: { clearable: true },
                            openPickerIcon: { sx: { color: theme.palette.primary.main } },
                            popper: { container: portalContainer.current },
                            dialog: { container: portalContainer.current },
                        }}
                    />
                </LocalizationProvider>
            </Box>
            <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: LABELS_ROW_COLUMNS, alignItems: "start" }}>
                <LabelsField label="People" value={clip.people} options={labels.people} onChange={(people) => save({ people })} />
                <LabelsField label="Tags" value={clip.tags} options={labels.tags} onChange={(tags) => save({ tags })} />
            </Box>
            <TextField
                label="Description"
                size="small"
                multiline
                minRows={8}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onBlur={saveDescription}
            />
        </Stack>
    );
};
