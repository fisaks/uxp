import { Alert, Box, Chip, CircularProgress, MenuItem, Stack, TextField, Typography } from "@mui/material";
import { HomeVideoClip } from "@vid/common";
import { usePortalContainerRef } from "@uxp/ui-lib";
import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { PlayAllButton } from "../cast/PlayAllButton";
import { SEARCH_PARAM } from "../search/SearchBox";
import { useClipSearch } from "../search/useClipSearch";
import { PAGE_WIDTH } from "../shared/pageWidth";
import { useRestoreScroll } from "../shared/useRestoreScroll";
import { ClipTile } from "./ClipTile";
import { NO_DATE_LABEL, NO_LABELS, isUnlabelled, yearOf } from "./clipFormat";
import { useGetClipsQuery, useGetLabelsQuery } from "./home-video.api";
import { YEAR_SCROLL_MARGIN, YearBar, yearAnchorId } from "./YearBar";

const ANY = "";
const HIGHLIGHT_MS = 2000;
const UNLABELLED_PARAM = "unlabelled";

type Filter = { year: string; person: string; tag: string; unlabelled: boolean; found: Set<string> | undefined };

const matches = (clip: HomeVideoClip, f: Filter) =>
    (!f.found || f.found.has(clip.id)) &&
    (!f.year || (yearOf(clip) ?? NO_DATE_LABEL) === f.year) &&
    (!f.person || clip.people.includes(f.person)) &&
    (!f.tag || clip.tags.includes(f.tag)) &&
    (!f.unlabelled || isUnlabelled(clip));

/** The clips of the filtered timeline as one group for each year, and the clips without a date last. */
const groupByYear = (clips: HomeVideoClip[]) => {
    const groups = new Map<string, HomeVideoClip[]>();
    for (const clip of clips) {
        const year = yearOf(clip) ?? NO_DATE_LABEL;
        groups.set(year, [...(groups.get(year) ?? []), clip]);
    }
    return [...groups.entries()];
};

type FilterSelectProps = { label: string; value: string; options: string[]; onChange: (value: string) => void };

const FilterSelect: React.FC<FilterSelectProps> = ({ label, value, options, onChange }) => {
    const portalContainer = usePortalContainerRef();
    return (
        <TextField
            select
            size="small"
            label={label}
            value={options.includes(value) ? value : ANY}
            onChange={(e) => onChange(e.target.value)}
            sx={{ minWidth: 130, "& .MuiSelect-icon": { color: "primary.main" } }}
            slotProps={{ select: { MenuProps: { container: portalContainer.current } } }}
        >
            <MenuItem value={ANY}>Any</MenuItem>
            {options.map((option) => (
                <MenuItem key={option} value={option}>
                    {option}
                </MenuItem>
            ))}
        </TextField>
    );
};

export const ClipListPage: React.FC = () => {
    const { data: clips, isError: loadError } = useGetClipsQuery();
    const labels = useGetLabelsQuery().data ?? NO_LABELS;
    // The filter is in the address, so it is still there when you come back from a clip.
    const [params, setParams] = useSearchParams();
    // The words come from the search box of the top bar, through the address.
    const query = params.get(SEARCH_PARAM) ?? "";
    const foundIds = useClipSearch(query.trim());
    const found = useMemo(() => (foundIds ? new Set(foundIds) : undefined), [foundIds]);
    const filter: Filter = {
        found,
        year: params.get("year") ?? ANY,
        person: params.get("person") ?? ANY,
        tag: params.get("tag") ?? ANY,
        unlabelled: params.has(UNLABELLED_PARAM),
    };
    const setFilter = (name: string, value: string | boolean) =>
        setParams(
            (current) => {
                const next = new URLSearchParams(current);
                if (value) next.set(name, value === true ? "1" : value);
                else next.delete(name);
                return next;
            },
            { replace: true }
        );

    const years = useMemo(() => [...new Set((clips ?? []).map((c) => yearOf(c) ?? NO_DATE_LABEL))], [clips]);
    const shown = useMemo(
        () => (clips ?? []).filter((c) => matches(c, filter)),
        [clips, filter.found, filter.year, filter.person, filter.tag, filter.unlabelled]
    );
    const groups = useMemo(() => groupByYear(shown), [shown]);

    // The year that was jumped to is outlined for a moment, so it is clear where on the page it starts.
    const [jumpedTo, setJumpedTo] = useState<string>();
    useEffect(() => {
        if (jumpedTo === undefined) return;
        const timer = setTimeout(() => setJumpedTo(undefined), HIGHLIGHT_MS);
        return () => clearTimeout(timer);
    }, [jumpedTo]);

    useRestoreScroll(clips !== undefined);

    if (loadError) return <Alert severity="error">The clips could not be read.</Alert>;
    if (!clips) return <CircularProgress sx={{ display: "block", mx: "auto", mt: 4 }} />;

    return (
        <Box sx={{ p: { xs: 0, sm: 2 }, maxWidth: PAGE_WIDTH, mx: "auto" }}>
            <Stack direction="row" flexWrap="wrap" alignItems="center" sx={{ gap: 1.5, mb: 2 }}>
                <FilterSelect label="Year" value={filter.year} options={years} onChange={(v) => setFilter("year", v)} />
                <FilterSelect label="Person" value={filter.person} options={labels.people} onChange={(v) => setFilter("person", v)} />
                <FilterSelect label="Tag" value={filter.tag} options={labels.tags} onChange={(v) => setFilter("tag", v)} />
                <Chip
                    size="small"
                    label="Unlabelled"
                    color="primary"
                    variant={filter.unlabelled ? "filled" : "outlined"}
                    onClick={() => setFilter(UNLABELLED_PARAM, !filter.unlabelled)}
                />
                <Typography variant="body2" color="text.secondary">
                    {shown.length} of {clips.length} clips
                </Typography>
                <PlayAllButton clipIds={shown.map((c) => c.id)} />
            </Stack>
            <YearBar years={groups.map(([year]) => year)} onJump={setJumpedTo} />
            {groups.length === 0 && <Typography color="text.secondary">No clip matches.</Typography>}
            {groups.map(([year, group]) => (
                <Box
                    key={year}
                    id={yearAnchorId(year)}
                    sx={{
                        mb: 3,
                        p: 1,
                        borderRadius: 1,
                        scrollMarginTop: `${YEAR_SCROLL_MARGIN}px`,
                        outline: jumpedTo === year ? 3 : 0,
                        outlineStyle: "solid",
                        outlineColor: "primary.main",
                    }}
                >
                    <Typography variant="h6" sx={{ mb: 1 }}>
                        {year}
                    </Typography>
                    <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))" }}>
                        {group.map((clip) => (
                            <ClipTile key={clip.id} clip={clip} />
                        ))}
                    </Box>
                </Box>
            ))}
        </Box>
    );
};
