import CloseIcon from "@mui/icons-material/Close";
import RefreshIcon from "@mui/icons-material/Refresh";
import {
    Box,
    Dialog,
    DialogContent,
    DialogTitle,
    IconButton,
    Tab,
    Tabs,
    Typography
} from "@mui/material";
import { LinearFetchLine, usePortalContainerRef, withErrorHandler, withLoading } from "@uxp/ui-lib";

import { BlueprintVersionLog } from "@uhn/common";
import { useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { useAppDispatch } from "../../../app/store";
import { useFetchBlueprintsQuery, useFetchBlueprintVersionLogQuery } from "../blueprint.api";
import { selectBlueprintVersion, selectBlueprintVersionLog } from "../blueprintSelector";
import { BlueprintIdentifierVersion, closeBlueprintVersionLogDialog } from "../blueprintSlice";


export const BlueprintVersionLogDialog = () => {
    const portalContainer = usePortalContainerRef();
    const { open, target } = useSelector(selectBlueprintVersionLog);
    const dispatch = useAppDispatch();
    const { data: blueprints } = useFetchBlueprintsQuery();
    const blueprintVersion = selectBlueprintVersion(blueprints, target);

    const onClose = () => dispatch(closeBlueprintVersionLogDialog());
    const [isFetching, setIsFetching] = useState(false);
    const reloadRef = useRef<() => void>(() => { });
    const reload = () => {
        reloadRef.current && reloadRef.current();
    }

    return (
        <Dialog open={open} onClose={onClose} maxWidth="xl"
            slotProps={{ paper: { style: { maxHeight: "90vh", minHeight: "90vh", height: "90vh" } } }}
            fullWidth container={portalContainer.current}>
            <DialogTitle>
                Blueprint log – {blueprintVersion?.name || target?.identifier} v{blueprintVersion?.version || target?.version}
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
                    sx={{ position: 'absolute', right: 8, top: 8, }}
                >
                    <CloseIcon />
                </IconButton>
                <LinearFetchLine isFetching={isFetching} />
            </DialogTitle>
            <DialogContent>
                {target && (
                    <LogDataLoader
                        target={target}
                        reloadRef={reloadRef}
                        setIsFetching={setIsFetching}
                    />
                )}
            </DialogContent>
        </Dialog>
    );
};

type LogDataLoaderProps = {
    target: BlueprintIdentifierVersion,
    reloadRef: React.MutableRefObject<() => void>,
    setIsFetching: React.Dispatch<React.SetStateAction<boolean>>
};

const LogDataLoader = ({ target, reloadRef, setIsFetching }: LogDataLoaderProps) => {
    const { data, isLoading, isFetching, error, refetch } = useFetchBlueprintVersionLogQuery({
        identifier: target.identifier,
        version: target.version
    });
    useEffect(() => {
        reloadRef.current = refetch;
    }, [refetch, reloadRef]);
    useEffect(() => {

        setIsFetching(isFetching && !isLoading);
    }, [isFetching, setIsFetching, isLoading]);

    return <BlueprintLogPanel isLoading={isLoading} error={error} log={data} />;

}

const BlueprintLogPanel = withErrorHandler(withLoading(({ log }: { log?: BlueprintVersionLog }) => {

    const [tab, setTab] = useState<"install" | "compile">("install");
    if (!log) return null;
    return (
        <Box
            sx={{
                height: "100%",
                display: "flex",
                flexDirection: "column",
                minHeight: 0
            }}
        >
            {log.errorSummary && (
                <ErrorSummary summary={log.errorSummary} />
            )}
            <Tabs
                value={tab}
                onChange={(_, v) => setTab(v)}
                sx={{ mb: 1, flexShrink: 0 }}
            >
                <Tab label="Install log" value="install" />
                <Tab label="Compile log" value="compile" />
            </Tabs>
            <Box sx={{
                flex: 1,
                minHeight: 0,
                background: "#2323230d",
                borderRadius: 4,
                overflow: "auto",
            }}>
                <LogContentArea
                    log={log && tab === "install" ? log.installLog : log && tab === "compile" ? log.compileLog : undefined}
                />
            </Box>
        </Box>
    );
}));

const ErrorSummary = ({ summary }: { summary: string }) => (
    <Box sx={{ mb: 2 }}>
        <Typography fontWeight={500} sx={{ mb: 0.5 }}>Error summary:</Typography>
        <pre style={{
            fontFamily: 'Fira Mono, monospace, Consolas, Monaco',
            fontSize: "0.95rem",
            whiteSpace: "pre-wrap",
            margin: 0,
            background: "#2323230d",
            borderRadius: 4,
            padding: "8px"
        }}>
            {summary}
        </pre>
    </Box>
);

const LogContentArea = ({ log }: { log?: string }) => (
    <Box
        sx={{
            width: "100%",
            height: "100%",
            minHeight: 120,
            display: "flex",
            alignItems: log ? "stretch" : "center",
            justifyContent: log ? "stretch" : "center",
        }}
    >
        {log ? (
            <pre
                style={{
                    fontFamily: 'Fira Mono, monospace, Consolas, Monaco',
                    fontSize: "0.95rem",
                    whiteSpace: "pre-wrap",
                    background: "transparent",
                    border: "none",
                    padding: "8px",
                    margin: 0,
                    width: "100%",
                    minHeight: "100%",
                }}
            >
                {log}
            </pre>
        ) : (
            <Typography color="text.secondary" sx={{
                width: "100%",
                textAlign: "center",
            }}>
                No log available.
            </Typography>
        )}
    </Box>
);

