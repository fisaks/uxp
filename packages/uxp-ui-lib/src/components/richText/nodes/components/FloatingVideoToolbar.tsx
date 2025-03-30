import React from 'react'
import { IconButton, Paper, Stack, Tooltip, Typography, useTheme } from '@mui/material'
import FormatAlignLeftIcon from '@mui/icons-material/FormatAlignLeft'
import FormatAlignRightIcon from '@mui/icons-material/FormatAlignRight'
import FormatAlignJustify from '@mui/icons-material/FormatAlignJustify'
import LockIcon from '@mui/icons-material/Lock'
import LockOpenIcon from '@mui/icons-material/LockOpen'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import * as styles from '../../RichTextEditor.module.css'
import { activeAlignStyle } from '../utils/videoHelpers'

interface FloatingVideoToolbarProps {
  align: 'left' | 'center' | 'right'
  aspectLocked: boolean
  onAlignChange: (value: 'left' | 'center' | 'right') => void
  onAspectToggle: () => void
  toolbarLeft: number | null
  height: number
  slotProps?: any
}

const Icons = {
    left: <FormatAlignLeftIcon />,
    right: <FormatAlignRightIcon />,
    center: <FormatAlignJustify />,
  }


export const FloatingVideoToolbar: React.FC<FloatingVideoToolbarProps> = ({
  align,
  aspectLocked,
  onAlignChange,
  onAspectToggle,
  toolbarLeft,
  height,
  slotProps,
}) => {
  const theme = useTheme()
  const activeStyle = activeAlignStyle(theme)

  return (
    <Paper
      className={styles.floatingToolbar}
      elevation={4}
      sx={{
        position: "absolute",
        left: toolbarLeft ? `${toolbarLeft}px` : "50%",
        transform: "translateX(-50%)",
        top: `calc(${height}px + 8px)`,
        padding: "4px 8px",
        display: "inline-flex",
        alignItems: "center",
        gap: 1,
        zIndex: 10,
        backgroundColor: theme.palette.background.default,
        color: theme.palette.text.primary,
      }}
    >
      <Stack spacing={1} alignItems="center">
        <Stack direction="row" spacing={1}>
          {(['left', 'right', 'center'] as const).map((value) => {
            return (
              <Tooltip key={value} title={`Align ${value}`} slotProps={slotProps}>
                <IconButton
                  onClick={() => onAlignChange(value)}
                  sx={align === value ? activeStyle : {}}
                >
                  {Icons[value]}
                </IconButton>
              </Tooltip>
            )
          })}

          <Tooltip
            title={aspectLocked ? "Unlock Aspect Ratio" : "Lock Aspect Ratio"}
            slotProps={slotProps}
          >
            <IconButton onClick={onAspectToggle} sx={aspectLocked ? activeStyle : {}}>
              {aspectLocked ? <LockIcon /> : <LockOpenIcon />}
            </IconButton>
          </Tooltip>
        </Stack>

        <Stack direction="row" alignItems="center" spacing={1}>
          <InfoOutlinedIcon sx={{ color: 'info.main' }} fontSize="small" />
          <Typography variant="subtitle2" color="info">Unselect to resize</Typography>
        </Stack>
      </Stack>
    </Paper>
  )
} 
