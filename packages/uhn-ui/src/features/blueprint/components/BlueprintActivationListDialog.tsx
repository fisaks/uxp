import CloseIcon from "@mui/icons-material/Close";
import RefreshIcon from "@mui/icons-material/Refresh";
import Timeline from "@mui/lab/Timeline";
import TimelineConnector from "@mui/lab/TimelineConnector";
import TimelineContent from "@mui/lab/TimelineContent";
import TimelineDot from "@mui/lab/TimelineDot";
import TimelineItem from "@mui/lab/TimelineItem";
import TimelineSeparator from "@mui/lab/TimelineSeparator";
import { Box, Dialog, DialogContent, DialogTitle, IconButton, Typography } from "@mui/material";
import { BlueprintActivationDetails } from "@uhn/common";
import { toUxpTimeFormat } from "@uxp/common";
import { LinearFetchLine, usePortalContainerRef, withErrorHandler, withLoading } from "@uxp/ui-lib";
import { useSelector } from "react-redux";
import { useAppDispatch } from "../../../app/store";

import { useEffect, useRef, useState } from "react";
import { useFetchBlueprintActivationsQuery, useFetchBlueprintsQuery, useFetchBlueprintVersionActivationsQuery } from "../blueprint.api";
import { selectActivationLog, selectBlueprintVersion } from "../blueprintSelector";
import { BlueprintIdentifierVersion, closeActivationDialog } from "../blueprintSlice";

const BlueprintActivationListDialog = () => {
    const portalContainer = usePortalContainerRef();
    const { open, target } = useSelector(selectActivationLog);

    const dispatch = useAppDispatch();

    const onClose = () => {
        dispatch(closeActivationDialog());
    };
    const { data: blueprints, } = useFetchBlueprintsQuery();
    const blueprintVersion = selectBlueprintVersion(blueprints, target);
    const [isFetching, setIsFetching] = useState(false);
    const reloadRef = useRef<() => void>(() => { });
    const reload = () => {
        reloadRef.current && reloadRef.current();
    }

    return <Dialog open={open} onClose={onClose} maxWidth="md"
        fullWidth container={portalContainer.current}>
        <DialogTitle
            sx={{
                minHeight: 52, // Reduce height by 4px from default (56)
                pb: 1, // Padding bottom a bit smaller
            }}>
            Activation History {blueprintVersion && `– ${blueprintVersion.name} v${blueprintVersion.version}`}
            <IconButton
                aria-label="refresh"
                onClick={reload}
                sx={{ position: 'absolute', right: 50, top: 8 }}
            >
                <RefreshIcon />
            </IconButton>

            <IconButton
                aria-label="close"
                onClick={onClose}
                sx={{ position: 'absolute', right: 8, top: 8 }}
            >
                <CloseIcon />
            </IconButton>
            <LinearFetchLine isFetching={isFetching} />
        </DialogTitle>
        <DialogContent dividers>
            {target ? (
                <ActivationContentForVersion target={target} reloadRef={reloadRef} setIsFetching={setIsFetching} />
            ) : (
                <ActivationContent reloadRef={reloadRef} setIsFetching={setIsFetching} />
            )}
        </DialogContent>
    </Dialog>
};

const ActivationContentForVersion = ({ target, reloadRef, setIsFetching }: { target: BlueprintIdentifierVersion, reloadRef: React.MutableRefObject<() => void>, setIsFetching: React.Dispatch<React.SetStateAction<boolean>> }) => {
    const { data, isLoading, error, refetch, isFetching } = useFetchBlueprintVersionActivationsQuery(target);
    useEffect(() => {
        reloadRef.current = refetch;
    }, [refetch, reloadRef]);
    useEffect(() => {
        setIsFetching(isFetching);
    }, [isFetching, setIsFetching]);
    return <ActivationList activationLog={data ?? []}
        showIdentifier={false}
        isLoading={isLoading}
        error={error ? "An error occurred while loading the activation history" : undefined} />



}
const ActivationContent = ({ reloadRef, setIsFetching }: { reloadRef: React.MutableRefObject<() => void>, setIsFetching: React.Dispatch<React.SetStateAction<boolean>> }) => {
    const { data, isLoading, error, refetch, isFetching } = useFetchBlueprintActivationsQuery();
    useEffect(() => {
        reloadRef.current = refetch;
    }, [refetch, reloadRef]);
    useEffect(() => {
        setIsFetching(isFetching);
    }, [isFetching, setIsFetching]);

    return <ActivationList activationLog={data ?? []}
        showIdentifier={true}
        isLoading={isLoading}
        error={error ? "An error occurred while loading the activation history" : undefined} />

}

const ActivationList = withErrorHandler(withLoading(({ activationLog, showIdentifier = false }:
    { activationLog: BlueprintActivationDetails[], showIdentifier?: boolean }) => {

    if (!activationLog || activationLog.length === 0) {
        return <Typography>No activation history found.</Typography>
    }
    return (
        <Timeline
            position="alternate"
        >
            {activationLog.map((a, i) => (
                <TimelineItem key={i}>
                    <TimelineSeparator>
                        <TimelineDot color={a.deactivatedAt ? "grey" : "primary"} />
                        {i !== activationLog.length - 1 && <TimelineConnector />}
                    </TimelineSeparator>
                    <TimelineContent sx={{ position: "alternate" }}>
                        {showIdentifier && (
                            <Box>
                                <b>{a.identifier} v{a.version}</b>
                            </Box>
                        )}
                        <Box>
                            <b>Activated</b>: {toUxpTimeFormat(a.activatedAt)}
                            {a.activatedBy && <> by <b>{a.activatedBy}</b></>}
                        </Box>
                        {a.deactivatedAt && (
                            <Box>
                                <b>Deactivated</b>: {toUxpTimeFormat(a.deactivatedAt)}
                                {a.deactivatedBy && <> by <b>{a.deactivatedBy}</b></>}
                            </Box>
                        )}
                    </TimelineContent>
                </TimelineItem>
            ))}
        </Timeline>
    )
}));
export default BlueprintActivationListDialog;