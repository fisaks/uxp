import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { SvgIconProps } from '@mui/material/SvgIcon';
import React, { useEffect, useState } from 'react';
import { WithOptionalTooltip } from './WithOptionalTooltip';

interface InlineSuccessProps {
    message?: string;
    small?: boolean;
    portalContainer?: React.RefObject<HTMLElement | null>;
    duration?: number; // milliseconds
    icon?: React.ElementType<SvgIconProps>|undefined; // Accepts any MUI icon component
}

const InlineSuccess: React.FC<InlineSuccessProps> = ({
    message,
    small = false,
    portalContainer,
    duration = 3000,
    icon = CheckCircleOutlineIcon, // fallback
}) => {
    const [visible, setVisible] = useState(true);

    useEffect(() => {
        if (!message || duration <= 0) return;
        const timeout = setTimeout(() => setVisible(false), duration);
        return () => clearTimeout(timeout);
    }, [message, duration]);

    if (!visible) return null;

    const Icon = icon;

    return (
        <WithOptionalTooltip tooltip={message} portalContainer={portalContainer} success>
            <Icon
                fontSize={small ? 'small' : 'medium'}
                color="success"
                sx={{ color: 'success.main' }}
            />
        </WithOptionalTooltip>
    );
};

export default InlineSuccess;
