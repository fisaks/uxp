import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import React from 'react';
import { WithOptionalTooltip } from './WithOptionalTooltip';

interface InlineErrorProps {
    message?: string;
    small?: boolean;
    portalContainer?: React.RefObject<HTMLElement | null>;
}

const InlineError: React.FC<InlineErrorProps> = ({ message, small = false, portalContainer }) => {

    return (
        <WithOptionalTooltip tooltip={message} portalContainer={portalContainer} error>
            <ErrorOutlineIcon
                fontSize={small ? 'small' : 'medium'}
                color="error"
                sx={{ color: 'error.main' }}
            />
        </WithOptionalTooltip>
    );
};

export default InlineError;
