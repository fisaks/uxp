import { Box, Typography } from "@mui/material";

export type FormattedMessageType = {
    /**
     * Template string with placeholders.
     *
     * Examples:
     *  - "Uploaded {file} successfully"
     *  - "Saved {name:bold} at {time:italic}"
     *  - "Removed {item:error} permanently"
     *
     * Placeholders:
     *  - {key}                → bold by default
     *  - {key:bold}           → bold
     *  - {key:italic}         → italic
     *  - {key:success}        → theme success.main color
     *  - {key:error}          → theme error.main color
     *  - {key:600}            → custom font weight
     */
    template: string;

    /**
     * Values injected into the template.
     *
     * Example:
     *   { file: "invoice.pdf", time: "12:30" }
     */
    values: Record<string, string | undefined | null | number>;
};

/**
 * Renders a template message where placeholders such as {file} are replaced
 * with formatted Typography spans.
 *
 * Example usage:
 *   <FormattedMessage
 *      template="Uploaded {file} successfully"
 *      values={{ file: "invoice.pdf" }}
 *   />
 */
export const FormattedMessage: React.FC<FormattedMessageType> = ({ template, values }) => {
    return (
        <Typography variant="body2">
            {renderTemplate(template, values)}
        </Typography>
    );
};

/**
 * Internal formatting logic for parsing {placeholder} tokens
 * and rendering them with MUI styling.
 */
export function renderTemplate(
    template: string,
    values: Record<string, string | undefined | null | number>
): React.ReactNode[] {
    const parts: React.ReactNode[] = [];
    let cursor = 0;

    // Match {key} or {key:modifier}
    const regex = /\{([^}:]+)(?::([^}]+))?\}/g;
    let match;

    while ((match = regex.exec(template)) !== null) {
        const [raw, key, modifier] = match;
        const start = match.index;

        // Text before this placeholder
        if (start > cursor) {
            parts.push(template.slice(cursor, start));
        }

        const value = values[key] ?? "";

        // Determine style
        const styleProps = getStyleForModifier(modifier);

        parts.push(
            <Box
                key={start}
                component="span"
                {...styleProps}
            >
                {value}
            </Box>
        );

        cursor = start + raw.length;
    }

    // Trailing text
    if (cursor < template.length) {
        parts.push(template.slice(cursor));
    }

    return parts;
}

/**
 * Maps `{key:modifier}` to MUI style props.
 */
function getStyleForModifier(modifier?: string) {
    if (!modifier) {
        return { fontWeight: 600 }; // default bold
    }

    switch (modifier) {
        case "bold":
            return { fontWeight: 600 };
        case "italic":
            return { fontStyle: "italic" };
        case "success":
            return { color: "success.main", fontWeight: 600 };
        case "error":
            return { color: "error.main", fontWeight: 600 };
    }

    // Custom font weight: {key:500}
    const weight = Number(modifier);
    if (!isNaN(weight)) {
        return { fontWeight: weight };
    }

    // Fallback: bold
    return { fontWeight: 600 };
}
