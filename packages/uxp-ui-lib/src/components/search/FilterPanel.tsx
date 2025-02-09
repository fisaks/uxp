import { FormControl, Grid, InputLabel, MenuItem, OutlinedInput, Select, TextField } from "@mui/material";
import { DateTimePicker } from "@mui/x-date-pickers";
import { SearchConfig, SearchFilterType } from "@uxp/common";
import { DateTime } from "luxon";

export const FilterPanel = <T,>({
    config,
    filters,
    handleFilterChange,
}: {
    config: SearchConfig<T>;
    filters: SearchFilterType<T>;
     // eslint-disable-next-line @typescript-eslint/no-explicit-any
    handleFilterChange: (key: keyof SearchFilterType<T>, value: any) => void;
}) => (
    <Grid container spacing={2} sx={{ mb: 2 }}>
        {config.filters.map((filter) => (
            <Grid item xs={12} sm={6} key={String(filter.key)}>
                {filter.uiType === "text" && (
                    <TextField
                        label={filter.label}
                        value={(filters[filter.key] as string) || ""}
                        onChange={(e) => handleFilterChange(filter.key, e.target.value)}
                        fullWidth
                    />
                )}
                {filter.uiType === "datetime" && (
                    <DateTimePicker
                        label={filter.label}
                        value={(filters[filter.key] as DateTime) || null}
                        onChange={(date) => handleFilterChange(filter.key, date)}
                        ampm={false}
                        localeText={{ toolbarTitle: "Select Date and Time" }}
                        slotProps={{ textField: { fullWidth: true } }}
                    />
                )}
                {["selectOne", "selectMultiple"].includes(filter.uiType) && (
                    <FormControl fullWidth>
                        <InputLabel>{filter.label}</InputLabel>
                        <Select
                            multiple={filter.uiType === "selectMultiple"}
                            value={filters[filter.key] ?? (filter.uiType === "selectMultiple" ? [] : "")}
                            onChange={(e) => handleFilterChange(filter.key, e.target.value)}
                            input={<OutlinedInput label={filter.label} />}
                            renderValue={filter.uiType === "selectMultiple" ? (selected) => (selected as string[]).join(", ") : undefined}
                        >
                            {filter.options?.map((option) => (
                                <MenuItem key={option.value} value={option.value}>
                                    {option.label}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                )}
            </Grid>
        ))}
    </Grid>
);
