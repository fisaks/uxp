import BoltIcon from "@mui/icons-material/Bolt";
import WidthFullIcon from "@mui/icons-material/WidthFull";
import WidthNormalIcon from "@mui/icons-material/WidthNormal";
import {
    Box,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    ToggleButton,
    ToggleButtonGroup,
    Typography,
} from "@mui/material";
import { ChartsReferenceLine } from "@mui/x-charts/ChartsReferenceLine";
import { LineChart } from "@mui/x-charts/LineChart";
import { ElectricityPriceEntry } from "@uhn/common";
import { ReloadIconButton, TooltipIconButton, usePortalContainerRef } from "@uxp/ui-lib";
import { DateTime } from "luxon";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { useLocation } from "react-router-dom";
import { useUHNWebSocket } from "../../../app/UHNAppBrowserWebSocketManager";
import { selectPriceRules } from "../../rule/ruleSelectors";
import { PriceRulesSection } from "../components/PriceRulesSection";
import { selectElectricitySnapshot } from "../electricitySlice";
import { getRuleLimits, limitColor, rearmPrice } from "../priceLimits";
import { CHEAP_COLOR, EXPENSIVE_COLOR, CHEAP_THRESHOLD, EXPENSIVE_THRESHOLD, NORMAL_COLOR, TZ, formatTime, getPriceColor } from "../priceFormat";
import { useSlotMs } from "../useSlotPrices";

type IntervalMode = "15min" | "60min";

const DATE_OPTIONS: Intl.DateTimeFormatOptions = { timeZone: TZ };

function formatDate(isoDate: string): string {
    const d = new Date(isoDate);
    return d.toLocaleDateString("fi-FI", { ...DATE_OPTIONS, weekday: "short", day: "numeric", month: "numeric" });
}

/** UTC hour key (YYYY-MM-DDTHH) for grouping into 60-min buckets. Finnish offsets are whole hours, so UTC hours line up with Finnish hours, and the repeated hour when clocks go back stays two separate buckets. */
function utcHourKey(isoDate: string): string {
    return new Date(isoDate).toISOString().slice(0, 13);
}

/** Get the Finnish-timezone date string (YYYY-MM-DD) for day comparison. */
function finnishDateKey(date: Date): string {
    return DateTime.fromJSDate(date).setZone(TZ).toFormat("yyyy-MM-dd");
}

type AggregatedEntry = {
    startDate: string;
    endDate: string;
    price: number;
};

function aggregateTo60Min(prices: ElectricityPriceEntry[]): AggregatedEntry[] {
    const hourMap = new Map<string, ElectricityPriceEntry[]>();
    for (const p of prices) {
        const key = utcHourKey(p.startDate);
        const group = hourMap.get(key);
        if (group) group.push(p);
        else hourMap.set(key, [p]);
    }

    return Array.from(hourMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([, entries]) => ({
            startDate: entries[0].startDate,
            endDate: entries[entries.length - 1].endDate,
            price: entries.reduce((sum, e) => sum + e.price, 0) / entries.length,
        }));
}

type DaySummary = {
    avg: number;
    min: { price: number; time: string };
    max: { price: number; time: string };
};

/**
 * A day needs more than half of its 15-minute slots to be summarised. The market publishes delivery days that
 * run 01:00–01:00 Finnish time (CET), so until tomorrow's prices are published the data only reaches into the
 * first hour of tomorrow, and after 14:00 today's first hour is missing. Half a day separates those slivers
 * from real data.
 */
const MIN_DAY_SLOTS = 48;

function computeDaySummary(prices: ElectricityPriceEntry[], dayOffset: number, slotMs: number): DaySummary | undefined {
    const targetDateStr = DateTime.fromMillis(slotMs).setZone(TZ).plus({ days: dayOffset }).toFormat("yyyy-MM-dd");

    const dayPrices = prices.filter((p) => {
        return finnishDateKey(new Date(p.startDate)) === targetDateStr;
    });

    if (dayPrices.length < MIN_DAY_SLOTS) return undefined;

    const avg = dayPrices.reduce((sum, p) => sum + p.price, 0) / dayPrices.length;
    const minEntry = dayPrices.reduce((min, p) => (p.price < min.price ? p : min), dayPrices[0]);
    const maxEntry = dayPrices.reduce((max, p) => (p.price > max.price ? p : max), dayPrices[0]);

    return {
        avg,
        min: { price: minEntry.price, time: formatTime(minEntry.startDate) },
        max: { price: maxEntry.price, time: formatTime(maxEntry.startDate) },
    };
}

/** Avg / cheapest / most expensive cards of one day; "N/A" until the day's prices are known. */
const DaySummaryCards: React.FC<{ day: "Today" | "Tomorrow"; summary: DaySummary | undefined }> = ({ day, summary }) => (
    <>
        <SummaryCard
            title={`Avg ${day}`}
            value={summary ? `${summary.avg.toFixed(2)} snt` : "N/A"}
            color={summary ? getPriceColor(summary.avg) : undefined}
        />
        <SummaryCard
            title={`Cheapest ${day}`}
            value={summary ? `${summary.min.price.toFixed(2)} snt` : "N/A"}
            subtitle={summary?.min.time}
            color={summary ? getPriceColor(summary.min.price) : undefined}
        />
        <SummaryCard
            title={`Most Expensive ${day}`}
            value={summary ? `${summary.max.price.toFixed(2)} snt` : "N/A"}
            subtitle={summary?.max.time}
            color={summary ? getPriceColor(summary.max.price) : undefined}
        />
    </>
);

const SummaryCard: React.FC<{ title: string; value: string; subtitle?: string; color?: string }> = ({
    title,
    value,
    subtitle,
    color,
}) => (
    <Paper
        variant="outlined"
        sx={{
            p: 2,
            flex: 1,
            minWidth: 140,
            textAlign: "center",
            borderRadius: 2,
        }}
    >
        <Typography variant="caption" color="text.secondary">
            {title}
        </Typography>
        <Typography variant="h5" sx={{ color: color ?? "text.primary", fontWeight: 600 }}>
            {value}
        </Typography>
        {subtitle && (
            <Typography variant="caption" color="text.secondary">
                {subtitle}
            </Typography>
        )}
    </Paper>
);

export const ElectricityPricePage: React.FC = () => {
    const snapshot = useSelector(selectElectricitySnapshot);
    const [mode, setMode] = useState<IntervalMode>("60min");
    const { sendMessageAsync } = useUHNWebSocket();
    const portalContainer = usePortalContainerRef();
    const [refreshing, setRefreshing] = useState(false);
    const [fullWidth, setFullWidth] = useState(false);

    const handleRefresh = useCallback(async () => {
        setRefreshing(true);
        try {
            await sendMessageAsync("uhn:electricity:refresh", {});
        } finally {
            setRefreshing(false);
        }
    }, [sendMessageAsync]);

    const displayPrices = useMemo(
        () => (mode === "60min" ? aggregateTo60Min(snapshot.prices) : snapshot.prices),
        [snapshot.prices, mode],
    );

    const slotMs = useSlotMs();

    const todaySummary = useMemo(() => computeDaySummary(snapshot.prices, 0, slotMs), [snapshot.prices, slotMs]);
    const tomorrowSummary = useMemo(() => computeDaySummary(snapshot.prices, 1, slotMs), [snapshot.prices, slotMs]);

    // Day markers: the first entry's day at the left edge, then every Helsinki midnight with room for its label (3h+ of data after it)
    const dayMarkers = useMemo(() => {
        if (snapshot.prices.length === 0) return [];
        const first = DateTime.fromISO(snapshot.prices[0].startDate).setZone(TZ);
        const last = DateTime.fromISO(snapshot.prices[snapshot.prices.length - 1].startDate).setZone(TZ);
        const markers = [{ at: first.toJSDate(), label: formatDate(first.toISO()!) }];
        for (let day = first.startOf("day").plus({ days: 1 }); day.plus({ hours: 3 }) <= last; day = day.plus({ days: 1 })) {
            markers.push({ at: day.toJSDate(), label: formatDate(day.toISO()!) });
        }
        return markers;
    }, [snapshot.prices]);

    // Chart data
    const chartXData = useMemo(() => displayPrices.map((p) => new Date(p.startDate)), [displayPrices]);
    const chartYData = useMemo(() => displayPrices.map((p) => p.price), [displayPrices]);

    // Find "now" index for reference line
    const nowIndex = useMemo(() => {
        for (let i = displayPrices.length - 1; i >= 0; i--) {
            if (new Date(displayPrices[i].startDate).getTime() <= slotMs) return i;
        }
        return -1;
    }, [displayPrices, slotMs]);

    const currentPrice = useMemo(() => {
        if (nowIndex >= 0 && nowIndex < displayPrices.length) return displayPrices[nowIndex];
        return undefined;
    }, [displayPrices, nowIndex]);

    const hasData = snapshot.prices.length > 0;

    // Rules with price triggers; the checked ones show their limits on the chart.
    // The rule panel links here with { showRuleIds } to preselect rules (and expand the list).
    const priceRules = useSelector(selectPriceRules);
    const locationState = useLocation().state as { showRuleIds?: string[] } | null;
    const [selectedRuleIds, setSelectedRuleIds] = useState<Set<string>>(() => new Set(locationState?.showRuleIds ?? []));
    const [rulesExpanded, setRulesExpanded] = useState(() => (locationState?.showRuleIds?.length ?? 0) > 0);
    const toggleRule = useCallback((ruleId: string) => {
        setSelectedRuleIds((prev) => {
            const next = new Set(prev);
            if (!next.delete(ruleId)) next.add(ruleId);
            return next;
        });
    }, []);
    const shownLimits = useMemo(
        () => priceRules
            .map((rule, index) => ({ rule, color: limitColor(index) }))
            .filter(({ rule }) => selectedRuleIds.has(rule.id))
            .flatMap(({ rule, color }) => getRuleLimits(rule).map((limit) => ({ limit, color }))),
        [priceRules, selectedRuleIds],
    );
    // The y-axis follows the data; grow it when a limit would lie above the highest price.
    const yAxisMax = useMemo(() => {
        if (shownLimits.length === 0) return undefined;
        const highestPrice = snapshot.prices.reduce((max, p) => Math.max(max, p.price), 0);
        const highestLimit = shownLimits.reduce((max, { limit }) => Math.max(max, limit.threshold, rearmPrice(limit)), 0);
        return Math.max(highestPrice, highestLimit) * 1.08;
    }, [shownLimits, snapshot.prices]);

    return (
        <Box sx={{ maxWidth: fullWidth ? "none" : 1200, mx: "auto" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                <BoltIcon sx={{ color: "primary.main" }} />
                <Typography variant="h1">Electricity Spot Price</Typography>
                <ReloadIconButton isLoading={refreshing} reload={handleRefresh} tooltipPortal={portalContainer} />
                <TooltipIconButton
                    tooltip={fullWidth ? "Limit width" : "Full width"}
                    tooltipPortal={portalContainer}
                    onClick={() => setFullWidth((v) => !v)}
                    sx={{ color: "primary.main", display: { xs: "none", lg: "inline-flex" } }}
                >
                    {fullWidth ? <WidthNormalIcon /> : <WidthFullIcon />}
                </TooltipIconButton>
            </Box>

            {!hasData ? (
                <Paper variant="outlined" sx={{ p: 4, textAlign: "center", borderRadius: 2 }}>
                    <Typography color="text.secondary">No price data available yet.</Typography>
                </Paper>
            ) : (
                <>
                    {/* Summary boxes */}
                    <Box sx={{ display: "flex", gap: 2, mb: 3, flexWrap: "wrap" }}>
                        {currentPrice && (
                            <SummaryCard
                                title="Current Price"
                                value={`${currentPrice.price.toFixed(2)} snt`}
                                subtitle="snt/kWh incl. VAT"
                                color={getPriceColor(currentPrice.price)}
                            />
                        )}
                        <DaySummaryCards day="Today" summary={todaySummary} />
                        <DaySummaryCards day="Tomorrow" summary={tomorrowSummary} />
                    </Box>

                    {/* Controls */}
                    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
                        <ToggleButtonGroup
                            value={mode}
                            exclusive
                            onChange={(_, v) => v && setMode(v)}
                            size="small"
                            sx={{
                                "& .MuiToggleButton-root:not(.Mui-selected)": {
                                    color: "text.secondary",
                                },
                            }}
                        >
                            <ToggleButton value="15min">15 min</ToggleButton>
                            <ToggleButton value="60min">60 min</ToggleButton>
                        </ToggleButtonGroup>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                            {snapshot.fetchedAt && (
                                <Typography variant="caption" color="text.secondary">
                                    Updated {formatTime(snapshot.fetchedAt)}
                                </Typography>
                            )}
                            {!tomorrowSummary && (
                                <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                                    (next day prices available ~14:00)
                                </Typography>
                            )}
                        </Box>
                    </Box>

                    {/* Line chart */}
                    <Paper variant="outlined" sx={{ p: 2, pl: 0, pr: 0,borderRadius: 2, mb: 3 }}>
                        <LineChart
                            xAxis={[
                                {
                                    data: chartXData,
                                    scaleType: "time",
                                    domainLimit: "strict",
                                    valueFormatter: (value: Date) => formatTime(value.toISOString()),
                                },
                            ]}
                            yAxis={[
                                {
                                    ...(yAxisMax !== undefined && { min: 0, max: yAxisMax }),
                                    colorMap: {
                                        type: "piecewise",
                                        thresholds: [CHEAP_THRESHOLD, EXPENSIVE_THRESHOLD],
                                        colors: [CHEAP_COLOR, NORMAL_COLOR, EXPENSIVE_COLOR],
                                    },
                                },
                            ]}
                            series={[
                                {
                                    data: chartYData,
                                    area: true,
                                    showMark: false,
                                    color: "#ff9800",
                                    valueFormatter: (v: number | null) =>
                                        v != null ? `${v.toFixed(2)} snt/kWh` : "",
                                },
                            ]}
                            height={400}
                            slotProps={{ popper: { container: portalContainer.current } }}
                            margin={{ left: 30, right: 20, top: 10, bottom: 30 }}
                            sx={{
                                "& .MuiAreaElement-root": {
                                    fillOpacity: 0.15,
                                },
                            }}
                        >
                            {dayMarkers.map((m) => (
                                <ChartsReferenceLine
                                    key={m.label}
                                    x={m.at}
                                    lineStyle={{ stroke: "#9e9e9e", strokeOpacity: 0.5, strokeWidth: 1 }}
                                    labelStyle={{ fill: "#9e9e9e", fontSize: 11 }}
                                    labelAlign="start"
                                    label={m.label}
                                />
                            ))}
                            {shownLimits.map(({ limit, color }, i) => (
                                <Fragment key={`${limit.ruleId}-${i}`}>
                                    <ChartsReferenceLine
                                        y={limit.threshold}
                                        lineStyle={{ stroke: color, strokeWidth: 1.5, strokeDasharray: "6 3" }}
                                        labelStyle={{ fill: color, fontSize: 11 }}
                                        // above-limits label on the left, below-limits on the right so close limits do not overlap
                                        labelAlign={limit.direction === "above" ? "start" : "end"}
                                        label={`${limit.ruleName} ${limit.direction} ${limit.threshold}`}
                                    />
                                    {limit.hysteresis > 0 && (
                                        <ChartsReferenceLine
                                            y={rearmPrice(limit)}
                                            lineStyle={{ stroke: color, strokeWidth: 1, strokeDasharray: "2 3", strokeOpacity: 0.8 }}
                                        />
                                    )}
                                </Fragment>
                            ))}
                            <ChartsReferenceLine
                                x={new Date(slotMs)}
                                lineStyle={{ stroke: "#2196f3", strokeWidth: 2, strokeDasharray: "4 2" }}
                                labelStyle={{ fill: "#2196f3", fontSize: 11 }}
                                labelAlign="start"
                                spacing={{ x: 5, y: 19 }} // a line below the day labels so they don't overlap when close
                                label="Now"
                            />
                        </LineChart>
                    </Paper>

                    <PriceRulesSection
                        rules={priceRules}
                        selectedRuleIds={selectedRuleIds}
                        onToggleRule={toggleRule}
                        expanded={rulesExpanded}
                        onExpandedChange={setRulesExpanded}
                    />

                    {/* Price table */}
                    <Paper variant="outlined" sx={{ borderRadius: 2 }}>
                        <TableContainer>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Date</TableCell>
                                        <TableCell>Time</TableCell>
                                        <TableCell align="right">Price (snt/kWh)</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {displayPrices.map((p) => {
                                        const startMs = new Date(p.startDate).getTime();
                                        const endMs = new Date(p.endDate).getTime();
                                        const isCurrent = slotMs >= startMs && slotMs < endMs;
                                        return (
                                            <TableRow
                                                key={p.startDate}
                                                sx={{
                                                    ...(isCurrent && {
                                                        bgcolor: "action.selected",
                                                        fontWeight: 700,
                                                    }),
                                                }}
                                            >
                                                <TableCell sx={{ whiteSpace: "nowrap" }}>{formatDate(p.startDate)}</TableCell>
                                                <TableCell sx={{ whiteSpace: "nowrap" }}>
                                                    {formatTime(p.startDate)}–{formatTime(p.endDate)}
                                                </TableCell>
                                                <TableCell
                                                    align="right"
                                                    sx={{
                                                        color: getPriceColor(p.price),
                                                        fontWeight: isCurrent ? 700 : 400,
                                                    }}
                                                >
                                                    {p.price.toFixed(3)}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Paper>
                </>
            )}
        </Box>
    );
};
