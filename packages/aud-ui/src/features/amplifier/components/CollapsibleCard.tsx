import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { Accordion, AccordionDetails, AccordionSummary, Typography } from "@mui/material";
import React from "react";

type CollapsibleCardProps = {
    title: string;
    children: React.ReactNode;
};

/** A card that is collapsed until its title is clicked. */
export const CollapsibleCard: React.FC<CollapsibleCardProps> = ({ title, children }) => (
    // Accordions only round the corners of the first and last of their siblings, and draw a divider line, so both are set here
    <Accordion disableGutters sx={{ borderRadius: 1, "&::before": { display: "none" } }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="h6">{title}</Typography>
        </AccordionSummary>
        <AccordionDetails>{children}</AccordionDetails>
    </Accordion>
);
