import { Box, Divider } from "@mui/material";
import { UhnSystemCommand, UhnSystemSnapshot, UhnSystemStatus } from "@uhn/common";
import React, { useRef, useState } from "react";
import { useUHNSystemWebSocket } from "../../app/UHNSystemBrowserWebSocketManager";
import { ExecutionStatusPopover } from "./components/ExecutionStatusPopover";
import { useExecutionPopover } from "./hooks/useExecutionPopover";
import { AdvancedSection } from "./sections/AdvancedSection";
import { DebugSection } from "./sections/DebugSection";
import { HeaderSection } from "./sections/HeaderSection";
import { LoggingSection } from "./sections/LoggingSection";
import { QuickLinksSection } from "./sections/QuickLinksSection";
import { RuntimeSection } from "./sections/RuntimeSection";
import { ScopeSection } from "./sections/ScopeSection";

type SystemPanelProps = {
    uhnStatus?: UhnSystemStatus;
    uhnSnapshot?: UhnSystemSnapshot;
    subscribed: boolean;
    connectionError: boolean;
};

export const SystemPanel: React.FC<SystemPanelProps> = ({
    uhnStatus,
    uhnSnapshot,
    subscribed,
    connectionError,
}) => {
    const { sendMessage } = useUHNSystemWebSocket();
    const popover = useExecutionPopover(uhnStatus);
    const infoAnchorRef = useRef<HTMLButtonElement>(null);
    const busy = uhnStatus?.state === "running";

    const [scope, setScope] = useState<string>("all");

    const scopeKey = scope === "all" ? "master" : scope;
    const runtimeConfig = uhnSnapshot?.runtimes?.[scopeKey];
    const isEdgeScope = scope !== "all" && scope !== "master";
    const edgeOffline = isEdgeScope && runtimeConfig?.nodeOnline === false;

    const target = scope === "all" ? undefined : scope;

    const sendSystemCommand = (
        e: React.SyntheticEvent,
        command: UhnSystemCommand
    ) => {
        popover.openAtAnchor(e.currentTarget);
        sendMessage("uhn:system:command", command);
    };

    const statusToShow = popover.currentStatus ?? popover.lastStatus;
    return (
        <Box sx={{ p: 2, minWidth: 320 }}>
            <HeaderSection
                subscribed={subscribed}
                connectionError={connectionError}
                hasLastExecution={Boolean(popover.lastStatus)}
                infoAnchorRef={infoAnchorRef}
                onOpenLastExecution={() => {
                    if (popover.lastStatus) {
                        popover.openAtAnchor(infoAnchorRef.current);
                    }
                }}
            />

            <ScopeSection
                scope={scope}
                runtimes={uhnSnapshot?.runtimes}
                onScopeChange={setScope}
            />

            <Divider sx={{ my: 1 }} />

            <DebugSection
                runMode={runtimeConfig?.runMode}
                busy={busy || edgeOffline}
                setRunModeRunning={
                    uhnStatus?.state === "running" &&
                    uhnStatus.command === "setRunMode"
                }
                onToggle={e =>
                    sendSystemCommand(e, {
                        command: "setRunMode",
                        target,
                        payload: {
                            runtimeMode:
                                runtimeConfig?.runMode === "debug"
                                    ? "normal"
                                    : "debug"
                        }
                    })
                }
            />

            <Divider sx={{ my: 2 }} />

            <RuntimeSection
                runtimeConfig={runtimeConfig}
                busy={busy || edgeOffline}
                onStart={e => sendSystemCommand(e, { command: "startRuntime", target, payload: {} })}
                onStop={e => sendSystemCommand(e, { command: "stopRuntime", target, payload: {} })}
                onRestart={e => sendSystemCommand(e, { command: "restartRuntime", target, payload: {} })}
            />

            <Divider sx={{ my: 2 }} />

            <LoggingSection
                logLevel={runtimeConfig?.logLevel}
                busy={busy || edgeOffline}
                onSetLevel={(level, e) =>
                    sendSystemCommand(e, { command: "setLogLevel", target, payload: { logLevel: level } })
                }
            />

            {!isEdgeScope && (
                <>
                    <Divider sx={{ my: 2 }} />

                    <AdvancedSection
                        disabled={busy || uhnSnapshot?.runtimes?.["master"]?.runtimeStatus !== "running"}
                        onRecompile={e =>
                            sendSystemCommand(e, { command: "recompileBlueprint", payload: {} })
                        }
                    />
                </>
            )}

            {statusToShow && popover.anchorEl && popover.open && (
                <ExecutionStatusPopover
                    anchorEl={popover.anchorEl}
                    status={statusToShow}
                    onClose={popover.close}
                />
            )}

            <Divider sx={{ my: 2 }} />

            <QuickLinksSection />
        </Box>
    );
};
