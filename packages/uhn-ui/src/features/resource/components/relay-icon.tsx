import { SvgIcon, SvgIconProps } from "@mui/material";

export function ReedRelayOpenIcon(props: SvgIconProps) {
    const r = 1;

    return (
        <SvgIcon {...props} viewBox="0 0 24 24">
            <g transform="rotate(-90 12 12)">
                {/* Upper vertical conductor (stops at terminal edge) */}
                <line
                    x1="12"
                    y1="2"
                    x2="12"
                    y2={6 - r}
                    stroke="currentColor"
                    strokeWidth="2"
                />

                {/* Upper terminal */}
                <circle
                    cx="12"
                    cy="6"
                    r={r}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                />

                {/* Lower terminal */}
                <circle
                    cx="12"
                    cy="18"
                    r={r}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                />

                {/* Lower vertical conductor (starts at terminal edge) */}
                <line
                    x1="12"
                    y1={18 + r}
                    x2="12"
                    y2="22"
                    stroke="currentColor"
                    strokeWidth="2"
                />

                {/* Contact arm (open) */}
                <line
                    x1="12"
                    y1="16"
                    x2="16"
                    y2="11"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                />

                {/* Oval enclosure (outline) */}
                <ellipse
                    cx="12"
                    cy="12"
                    rx="7"
                    ry="6"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    opacity="0.7"
                />
            </g>
        </SvgIcon>
    );
}

export function ReedRelayClosedIcon(props: SvgIconProps) {
    const r = 1.8;

    return (
        <SvgIcon {...props} viewBox="0 0 24 24">
            <g transform="rotate(-90 12 12)">
                {/* Oval enclosure (FILLED when active) */}
                <ellipse
                    cx="12"
                    cy="12"
                    rx="7"
                    ry="6"
                    fill="currentColor"
                    fillOpacity="0.18"
                />

                {/* Upper vertical conductor */}
                <line
                    x1="12"
                    y1="2"
                    x2="12"
                    y2={6 - r}
                    stroke="currentColor"
                    strokeWidth="2"
                />

                {/* Upper terminal */}
                <circle
                    cx="12"
                    cy="6"
                    r={r}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                />

                {/* Lower terminal */}
                <circle
                    cx="12"
                    cy="18"
                    r={r}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                />

                {/* Lower vertical conductor */}
                <line
                    x1="12"
                    y1={18 + r}
                    x2="12"
                    y2="22"
                    stroke="currentColor"
                    strokeWidth="2"
                />

                {/* Contact arm (connected) */}
                <line
                    x1="12"
                    y1="16"
                    x2="12"
                    y2={6 + r}
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                />

                {/* Oval outline on top */}
                <ellipse
                    cx="12"
                    cy="12"
                    rx="7"
                    ry="6"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    opacity="0.9"
                />
            </g>
        </SvgIcon>
    );
}
