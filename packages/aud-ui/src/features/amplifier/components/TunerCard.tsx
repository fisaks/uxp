import React from "react";
import { AmplifierInfo, AmplifierTuner } from "@aud/common";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import RadioIcon from "@mui/icons-material/Radio";
import { alpha, Box, Button, Card, CardContent, keyframes, Typography } from "@mui/material";
import { SendAmplifierCommand } from "../useAmplifierCommand";

const FM_BAND = "FM";

// The glow of the station that is playing breathes slowly between a soft and a stronger shine.
const glow = (color: string) =>
    keyframes({
        "0%, 100%": { boxShadow: `0 0 6px 1px ${alpha(color, 0.45)}` },
        "50%": { boxShadow: `0 0 16px 4px ${alpha(color, 0.85)}` },
    });

type TunerCardProps = {
    info: AmplifierInfo;
    tuner: AmplifierTuner;
    disabled: boolean;
    send: SendAmplifierCommand;
    /** Show the stations marked as favourite in the station list (all of them when none is marked). */
    favoritesOnly?: boolean;
};

/** FM frequencies are in units of 10 kHz (10110 is 101.1 MHz), AM frequencies in kHz. */
const formatFrequency = (band: string, frequency: number) =>
    band === FM_BAND ? `${Number((frequency / 100).toFixed(2))} MHz` : `${frequency} kHz`;

export const TunerCard: React.FC<TunerCardProps> = ({ info, tuner, disabled, send, favoritesOnly = false }) => {
    const isTuned = (frequency: number) => tuner.band === FM_BAND && tuner.frequency === frequency;
    const station = info.tunerStations.find((s) => isTuned(s.frequency));
    const frequency = formatFrequency(tuner.band, tuner.frequency);
    const favorites = info.tunerStations.filter((s) => s.favorite);
    const buttons = favoritesOnly && favorites.length > 0 ? favorites : info.tunerStations;
    const program = [tuner.programService, tuner.programType && `(${tuner.programType})`].filter(Boolean).join(" ");

    return (
        <Card>
            <CardContent>
                <Typography variant="h6" gutterBottom>
                    Tuner
                </Typography>
                {/* What is playing: the station of the list when the frequency is in it, otherwise the frequency itself. */}
                <Box
                    sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 2,
                        p: 2,
                        borderRadius: 1,
                        borderLeft: 4,
                        borderColor: "primary.main",
                        bgcolor: (theme) => alpha(theme.palette.primary.main, 0.12),
                    }}
                >
                    <RadioIcon color="primary" sx={{ fontSize: 40 }} />
                    <Box sx={{ minWidth: 0 }}>
                        <Typography variant="overline" color="text.secondary" sx={{ lineHeight: 1.5 }}>
                            Now playing
                        </Typography>
                        <Typography variant="h5" sx={{ fontWeight: 600, overflowWrap: "anywhere", lineHeight: 1.2 }}>
                            {station ? station.name : `${tuner.band} ${frequency}`}
                        </Typography>
                        <Typography color="text.secondary">{[station && frequency, program].filter(Boolean).join(" · ")}</Typography>
                        {tuner.radioText && (
                            <Typography variant="body2" color="text.secondary" sx={{ fontStyle: "italic", overflowWrap: "anywhere" }}>
                                {tuner.radioText}
                            </Typography>
                        )}
                    </Box>
                </Box>
                <Box
                    sx={{
                        display: "grid",
                        gridTemplateColumns: `repeat(auto-fill, minmax(${favoritesOnly ? 130 : 150}px, 1fr))`,
                        gap: 1,
                        mt: 2,
                    }}
                >
                    {buttons.map((s) => {
                        const tuned = isTuned(s.frequency);
                        return (
                            // The other buttons are neutral so that the one that is playing is the only coloured one.
                            <Button
                                key={`${s.name}-${s.frequency}`}
                                variant={tuned ? "contained" : "outlined"}
                                color={tuned ? "primary" : "inherit"}
                                disabled={disabled}
                                onClick={() => send("amplifier_set_tuner_frequency", { frequency: s.frequency })}
                                title={s.name}
                                aria-pressed={tuned}
                                sx={{
                                    position: "relative",
                                    flexDirection: "column",
                                    textTransform: "none",
                                    minHeight: 64,
                                    px: 1,
                                    py: 0.75,
                                    lineHeight: 1.25,
                                    ...(tuned
                                        ? {
                                              boxShadow: (theme) => `0 0 10px 2px ${alpha(theme.palette.primary.main, 0.6)}`,
                                              animation: (theme) => `${glow(theme.palette.primary.main)} 2.5s ease-in-out infinite`,
                                              "@media (prefers-reduced-motion: reduce)": { animation: "none" },
                                          }
                                        : { borderColor: "divider", color: "text.secondary" }),
                                }}
                            >
                                {tuned && <CheckCircleIcon sx={{ position: "absolute", top: 4, right: 4, fontSize: 16 }} />}
                                {/* The name takes up to two lines, the frequency is always the last line. */}
                                <Typography
                                    variant="body2"
                                    sx={{
                                        fontWeight: 600,
                                        overflowWrap: "anywhere",
                                        display: "-webkit-box",
                                        WebkitLineClamp: 2,
                                        WebkitBoxOrient: "vertical",
                                        overflow: "hidden",
                                    }}
                                >
                                    {s.name}
                                </Typography>
                                <Typography variant="caption" sx={{ opacity: 0.8 }}>
                                    {formatFrequency(FM_BAND, s.frequency)}
                                </Typography>
                            </Button>
                        );
                    })}
                </Box>
            </CardContent>
        </Card>
    );
};
