import { HouseCreateVersionResponse } from "@h2c/common";
import ClearIcon from "@mui/icons-material/Clear";
import SaveAsIcon from "@mui/icons-material/SaveAs";
import UndoIcon from "@mui/icons-material/Undo";
import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    InputAdornment,
    TextField,
    Tooltip,
} from '@mui/material';
import { AsyncButton, usePortalContainer, useSafeState } from '@uxp/ui-lib';
import { DateTime } from 'luxon';
import {
    forwardRef,
    useCallback,
    useImperativeHandle,
    useState
} from 'react';
import { createHouseVersion } from "../house.api";


type HouseToMakeVersionOf = {
    uuid: string, houseName: string
}
export interface HouseVersionLabelDialogRef {
    open: (house: HouseToMakeVersionOf) => void;
}

const HouseVersionLabelDialog = forwardRef<HouseVersionLabelDialogRef>((_, ref) => {

    const container = usePortalContainer();
    const [open, setOpen] = useSafeState(false);
    const [house, setHouse] = useState<HouseToMakeVersionOf | undefined>(undefined);
    const [label, setLabel] = useState('');
    const [saving, setSaving] = useSafeState(false);
    const [doneText, setDoneText] = useSafeState("");

    const createDefaultLabel = useCallback((houseName: String) => {
        return `${houseName || "House"} - ${DateTime.now().toFormat('d.M.yyyy HH:mm:ss')}`;
    }, []);
    useImperativeHandle(ref, () => ({
        open: (arg) => {
            setHouse(arg);
            setLabel(createDefaultLabel(arg.houseName));
            setOpen(true);
        },
    }));

    const handleSave = async () => {
        const trimmed = label.trim();
        if (!trimmed || !house) return;
        setDoneText("");
        setSaving(true);
        try {
            const response = await createHouseVersion({ uuidHouse: house?.uuid, label: trimmed });
            if (response.new) {
                setDoneText("Version created");
            } else {
                setDoneText(`Version already exists`);
            }
            return response;
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onClose={() => setOpen(false)} maxWidth="xs" fullWidth container={container}>
            <DialogTitle>Create {house?.houseName || "House"} Version</DialogTitle>
            <DialogContent>
                <TextField
                    autoFocus
                    label="Version label"
                    fullWidth
                    margin="dense"
                    value={label}
                    onChange={(e) => {
                        if (e.target.value.length <= 50) {
                            setLabel(e.target.value);
                        }
                    }}
                    helperText={`${label.length}/50`}
                    slotProps={{
                        input: {
                            endAdornment: (
                                <InputAdornment position="end">
                                    <>
                                        {label.length > 0 &&
                                            <Tooltip title="Clear">
                                                <IconButton onClick={() => setLabel('')} edge="end" size="small">
                                                    <ClearIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                        }
                                        <Tooltip title="Revert to default">
                                            <IconButton onClick={() => setLabel(createDefaultLabel(house?.houseName ?? ""))} edge="end" size="small">
                                                <UndoIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                    </>
                                </InputAdornment>
                            )
                        }
                    }}
                />
            </DialogContent>
            <DialogActions>
                <Button
                    onClick={() => setOpen(false)}
                    disabled={saving}>
                    Cancel
                </Button>
                <AsyncButton
                    onClick={handleSave}
                    afterDone={() => setOpen(false)}
                    disabled={!label.trim()} variant="contained"
                    doneText={doneText}
                    loadingText='Creating version'
                    startIcon={<SaveAsIcon />}
                >
                    Create version
                </AsyncButton>


            </DialogActions>
        </Dialog>
    );
});

export default HouseVersionLabelDialog;
