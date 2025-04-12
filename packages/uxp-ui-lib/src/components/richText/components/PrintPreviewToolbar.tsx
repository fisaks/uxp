import ClearIcon from '@mui/icons-material/Clear';
import CloseIcon from '@mui/icons-material/Close';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import PrintIcon from '@mui/icons-material/Print';
import SettingsIcon from '@mui/icons-material/Settings';
import {
    AppBar,
    FormControlLabel,
    IconButton,
    Menu,
    MenuItem,
    Switch,
    TextField,
    Toolbar,
    Tooltip
} from '@mui/material';
import { usePortalContainer } from '../../../features/shadow-root/ShadowRootContext';

import { MouseEvent, useState } from 'react';

export type PrintSettings = {
    orientation: 'portrait' | 'landscape';
    includeHeader: boolean,
    showName: boolean,
    showMeta: boolean,
}
type PrintPreviewToolbarProps = {
    documentName: string;
    setDocumentName: (name: string) => void;
    handlePrint: (e: MouseEvent<HTMLElement>) => void;
    handleExportPDF: () => void;
    printSettings: PrintSettings
    setPrintSettings: (settings: PrintSettings) => void;
}
export const PrintPreviewToolbar = ({ documentName, setDocumentName, handleExportPDF, handlePrint, printSettings, setPrintSettings }: PrintPreviewToolbarProps) => {
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

    const portalContainerRef = usePortalContainer();
    const handleOpenMenu = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleCloseMenu = () => {
        setAnchorEl(null);
    };

    const handleToggle = (key: keyof PrintSettings) => {
        setPrintSettings(({ ...printSettings, [key]: !printSettings[key] }));
    };

    const handleOrientationChange = (value: 'portrait' | 'landscape') => {
        setPrintSettings(({ ...printSettings, orientation: value }));
    };

    return (
        <AppBar position="sticky" id="preview-toolbar" sx={{ top: 0, display: 'print', '@media print': { display: 'none' } }}>
            <Toolbar sx={{
                flexWrap: 'wrap', gap: 1, justifyContent: {
                    xs: 'flex-start', md: 'center',
                }
            }}>

                <IconButton edge="start" color="inherit" onClick={() => window.close()}>
                    <CloseIcon />
                </IconButton>
                <TextField
                    variant="standard"
                    value={documentName}
                    onChange={(e) => setDocumentName(e.target.value)}
                    sx={{ flex: 1, minWidth: 170, maxWidth: 450 }}
                    placeholder="Document name"
                    slotProps={{
                        input: {
                            endAdornment: documentName ? (
                                <IconButton
                                    size="small"
                                    onClick={() => setDocumentName('')}
                                    edge="end"
                                    sx={{ color: 'inherit' }}
                                >
                                    <ClearIcon fontSize="small" />
                                </IconButton>
                            ) : undefined,
                        }
                    }}

                />
                <Tooltip title="Print Options" slotProps={{ popper: { disablePortal: true } }}>
                    <IconButton color="inherit" onClick={handleOpenMenu}>
                        <SettingsIcon />
                    </IconButton>
                </Tooltip>

                <Tooltip title="Print" slotProps={{ popper: { disablePortal: true } }}>
                    <IconButton color="inherit" onClick={handlePrint}>
                        <PrintIcon />
                    </IconButton>
                </Tooltip>
                <Tooltip title="Export as PDF" slotProps={{ popper: { disablePortal: true } }}>
                    <IconButton color="inherit" onClick={handleExportPDF}>
                        <PictureAsPdfIcon />
                    </IconButton>
                </Tooltip>

                <Menu
                    anchorEl={anchorEl}
                    open={Boolean(anchorEl)}
                    onClose={handleCloseMenu}
                    container={portalContainerRef}
                >
                    <MenuItem selected={printSettings.orientation === 'portrait'} onClick={() => handleOrientationChange('portrait')}>
                        Portrait
                    </MenuItem>
                    <MenuItem selected={printSettings.orientation === 'landscape'} onClick={() => handleOrientationChange('landscape')}>
                        Landscape
                    </MenuItem>

                    <MenuItem>
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={printSettings.includeHeader}
                                    onChange={() => handleToggle('includeHeader')}
                                />
                            }
                            label="Include header"
                        />
                    </MenuItem>

                    <MenuItem>
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={printSettings.showName}
                                    onChange={() => handleToggle('showName')}
                                />
                            }
                            label="Show document name"
                        />
                    </MenuItem>

                    <MenuItem>
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={printSettings.showMeta}
                                    onChange={() => handleToggle('showMeta')}
                                />
                            }
                            label="Show document meta"
                        />
                    </MenuItem>
                </Menu>
            </Toolbar>
        </AppBar>

    )
}