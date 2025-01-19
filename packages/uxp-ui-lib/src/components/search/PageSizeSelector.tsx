import { FormControl, InputLabel, MenuItem, Select } from "@mui/material";
export const PageSizeSelector = ({
    pageSize,
    setPageSize,
    pageSizes = [5, 10, 20, 50],
}: {
    pageSize: number;
    setPageSize: (size: number) => void;
    pageSizes?: number[];
}) => (
    <FormControl fullWidth>
        <InputLabel>Page Size</InputLabel>
        <Select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))}>
            {pageSizes.map((size) => (
                <MenuItem key={size} value={size}>
                    {size}
                </MenuItem>
            ))}
        </Select>
    </FormControl>
);
