import { Box, Typography } from "@mui/material";
import { RuntimeInteractionView } from "@uhn/common";
import React from "react";
import { TechnicalDeepLink } from "../../shared/TechnicalDeepLink";
import { viewDisplayLines } from "./viewInfoLines";

const lineSx = { fontFamily: "monospace", fontSize: "0.75rem" };

const ResourceLink: React.FC<{ id: string }> = ({ id }) => (
    <TechnicalDeepLink to={`/technical/resources/${id}`}>{id}</TechnicalDeepLink>
);

/** The resources a view uses beyond its command, state sources and controls: state display, availability, deactivate
 *  command, side effects and name map. Sections without items are left out. */
export const ViewInfoDetails: React.FC<{ view: RuntimeInteractionView }> = ({ view }) => {
    const displayLines = viewDisplayLines(view);
    const sideEffects = view.sideEffects ?? [];
    const nameMapResources = view.nameMap?.resources ?? [];

    return (
        <>
            {displayLines.length > 0 && (
                <Box sx={{ mt: 0.5 }}>
                    <Typography variant="body2">Display ({displayLines.length}):</Typography>
                    {displayLines.map((line, i) => (
                        <Typography key={i} variant="body2" sx={lineSx}>
                            {line.slot}: <ResourceLink id={line.resourceId} />
                            {line.format ? ` (${line.format})` : ""}
                            {line.shownWhenFromResourceId && <>{" shown when "}<ResourceLink id={line.shownWhenFromResourceId} /></>}
                        </Typography>
                    ))}
                </Box>
            )}
            {view.availability && (
                <Box sx={{ mt: 0.5 }}>
                    <Typography variant="body2">Availability:</Typography>
                    <Typography variant="body2" sx={lineSx}>from: <ResourceLink id={view.availability.fromResourceId} /></Typography>
                    {view.availability.poweredByResourceId && (
                        <Typography variant="body2" sx={lineSx}>powered by: <ResourceLink id={view.availability.poweredByResourceId} /></Typography>
                    )}
                </Box>
            )}
            {view.command?.onDeactivate && (
                <Box sx={{ mt: 0.5 }}>
                    <Typography variant="body2">On deactivate:</Typography>
                    <Typography variant="body2" sx={lineSx}>{view.command.onDeactivate.type}: <ResourceLink id={view.command.onDeactivate.resourceId} /></Typography>
                </Box>
            )}
            {sideEffects.length > 0 && (
                <Box sx={{ mt: 0.5 }}>
                    <Typography variant="body2">Side effects ({sideEffects.length}):</Typography>
                    {sideEffects.map((effect, i) => (
                        <Typography key={i} variant="body2" sx={lineSx}>{effect.action}: <ResourceLink id={effect.resourceId} /></Typography>
                    ))}
                </Box>
            )}
            {nameMapResources.length > 0 && (
                <Box sx={{ mt: 0.5 }}>
                    <Typography variant="body2">Name map ({nameMapResources.length}):</Typography>
                    {nameMapResources.map((entry, i) => (
                        <Typography key={i} variant="body2" sx={lineSx}>{entry.name}: <ResourceLink id={entry.resourceId} /></Typography>
                    ))}
                </Box>
            )}
        </>
    );
};
