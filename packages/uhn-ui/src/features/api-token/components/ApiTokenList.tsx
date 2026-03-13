import DeleteIcon from "@mui/icons-material/Delete";
import {
    Box,
    Chip,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography,
} from "@mui/material";
import { ApiTokenInfo } from "@uhn/common";
import { toUxpTimeFormat } from "@uxp/common";
import {
    ConfirmDialog,
    InlineError,
    LinearFetchLine,
    Loading,
    mapApiErrorsToMessageString,
    TooltipIconButton,
    usePortalContainerRef,
    withErrorHandler,
    withLoading,
} from "@uxp/ui-lib";
import { useState } from "react";
import { useFetchApiTokensQuery, useRevokeApiTokenMutation } from "../apiToken.api";

const ApiTokenList: React.FC = () => {
    const { data: tokens, isFetching } = useFetchApiTokensQuery();

    if (!tokens || tokens.length === 0) {
        return (
            <Box p={2}>
                <Typography>No API tokens found.</Typography>
            </Box>
        );
    }

    const activeTokens = tokens.filter((t) => !t.revokedAt);
    const revokedTokens = tokens.filter((t) => t.revokedAt);

    return (
        <Box>
            <LinearFetchLine isFetching={isFetching} />
            <TableContainer>
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell>Label</TableCell>
                            <TableCell>Blueprint</TableCell>
                            <TableCell>Token</TableCell>
                            <TableCell>Created</TableCell>
                            <TableCell>Last Used</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell align="right">Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {activeTokens.map((token) => (
                            <ApiTokenRow key={token.id} token={token} />
                        ))}
                        {revokedTokens.map((token) => (
                            <ApiTokenRow key={token.id} token={token} />
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
};

const ApiTokenRow: React.FC<{ token: ApiTokenInfo }> = ({ token }) => {
    const portalContainer = usePortalContainerRef();
    const [revokeConfirmOpen, setRevokeConfirmOpen] = useState(false);
    const [revokeToken, { isLoading: isRevoking, error: revokeError }] =
        useRevokeApiTokenMutation();

    const isRevoked = !!token.revokedAt;

    const handleRevoke = () => setRevokeConfirmOpen(true);
    const handleRevokeCancel = () => setRevokeConfirmOpen(false);
    const handleRevokeConfirm = () => {
        setRevokeConfirmOpen(false);
        revokeToken(token.id);
    };

    return (
        <>
            <TableRow sx={{ opacity: isRevoked ? 0.5 : 1 }}>
                <TableCell>{token.label}</TableCell>
                <TableCell>
                    <Typography variant="body2" fontFamily="monospace">
                        {token.blueprintIdentifier}
                    </Typography>
                </TableCell>
                <TableCell>
                    <Typography variant="body2" fontFamily="monospace">
                        ****{token.lastFourChars}
                    </Typography>
                </TableCell>
                <TableCell>
                    <Typography variant="body2">
                        {toUxpTimeFormat(token.createdAt)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                        by {token.createdBy}
                    </Typography>
                </TableCell>
                <TableCell>
                    {token.lastUsedAt
                        ? toUxpTimeFormat(token.lastUsedAt)
                        : "Never"}
                </TableCell>
                <TableCell>
                    {isRevoked ? (
                        <Chip label="Revoked" color="error" size="small" />
                    ) : (
                        <Chip label="Active" color="success" size="small" />
                    )}
                </TableCell>
                <TableCell align="right">
                    {isRevoking && <Loading size={15} />}
                    {revokeError && (
                        <InlineError
                            message={mapApiErrorsToMessageString(revokeError)}
                            small
                            portalContainer={portalContainer}
                        />
                    )}
                    {!isRevoked && (
                        <TooltipIconButton
                            onClick={handleRevoke}
                            tooltip="Revoke token"
                            tooltipPortal={portalContainer}
                            size="small"
                            color="error"
                        >
                            <DeleteIcon />
                        </TooltipIconButton>
                    )}
                </TableCell>
            </TableRow>
            <ConfirmDialog
                open={revokeConfirmOpen}
                onCancel={handleRevokeCancel}
                onConfirm={handleRevokeConfirm}
                title="Confirm Revoke Token"
                confirmText={{
                    template:
                        "Are you sure you want to revoke the token {label:bold}? This action cannot be undone. Any CLI integrations using this token will stop working.",
                    values: { label: token.label },
                }}
            />
        </>
    );
};

export default withErrorHandler(withLoading(ApiTokenList));
