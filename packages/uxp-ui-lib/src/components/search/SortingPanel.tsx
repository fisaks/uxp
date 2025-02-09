import { Add as AddIcon, ArrowDownward, ArrowUpward, Remove as RemoveIcon } from "@mui/icons-material";
import { Box, FormControl, Grid, IconButton, InputLabel, MenuItem, OutlinedInput, Select, Tooltip, Typography } from "@mui/material";
import { SearchConfig, SearchSortType } from "@uxp/common";

export const SortingPanel = <T,>({
    config,
    sortOptions,
    handleSortChange,
    addSortOption,
    removeSortOption,
    toggleSortDirection,
}: {
    config: SearchConfig<T>;
    sortOptions: SearchSortType<T>[];
    handleSortChange: (index: number, key: keyof T, direction: "asc" | "desc") => void;
    addSortOption: () => void;
    removeSortOption: (index: number) => void;
    toggleSortDirection: (index: number) => void;
}) => (
    <>
        <Grid item xs={12}>
            <Typography variant="subtitle1" sx={{ mb: 2 }}>
                Sort Options
            </Typography>
        </Grid>
        {sortOptions.map((option, index) => (
            <Grid item xs={12} sm={6}>
                <Box key={index} sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
                    <FormControl fullWidth>
                        <InputLabel>Sort By</InputLabel>
                        <Select
                            value={sortOptions[index]?.field || ""}
                            onChange={(e) => handleSortChange(index, e.target.value as keyof T, sortOptions[index]?.direction || "asc")}
                            input={<OutlinedInput label="Sort By" />}
                        >
                            {config.sorting.map((sortField) => (
                                <MenuItem key={sortField.key as string} value={sortField.key as string}>
                                    {sortField.label}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <Tooltip title={option.direction === "asc" ? "Set descending" : "Set ascending"}>
                        <IconButton
                            aria-label={option.direction === "asc" ? "Set descending" : "Set ascending"}
                            onClick={() => toggleSortDirection(index)}
                        >
                            {option.direction === "asc" ? <ArrowUpward /> : <ArrowDownward />}
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Remove sort option">
                        <IconButton aria-label="Remove sort option" onClick={() => removeSortOption(index)}>
                            <RemoveIcon />
                        </IconButton>
                    </Tooltip>
                </Box>
            </Grid>
        ))}
        <Tooltip title="Add sort option">
            <IconButton aria-label="Add sort option" onClick={addSortOption}>
                <AddIcon />
            </IconButton>
        </Tooltip>
    </>
);
