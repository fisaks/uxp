import ClearIcon from "@mui/icons-material/Clear";
import SearchIcon from "@mui/icons-material/Search";
import { InputAdornment, TextField } from "@mui/material";
import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { HOME_VIDEOS_PATH } from "../../menu";
import { LabelledIconButton } from "../shared/LabelledIconButton";

export const SEARCH_PARAM = "q";

type SearchBoxProps = {
    /** Puts the cursor in the box when it is shown, for a box that was opened by pressing the search icon. */
    autoFocus?: boolean;
};

/**
 * The search box of the app. The words are in the address of the home videos list, which shows the clips that match, so
 * typing on any other page opens that list. The other filters of the list are kept while typing.
 */
export const SearchBox: React.FC<SearchBoxProps> = ({ autoFocus }) => {
    const { pathname, search } = useLocation();
    const navigate = useNavigate();
    const onList = pathname.replace(/\/$/, "") === HOME_VIDEOS_PATH;
    const query = onList ? (new URLSearchParams(search).get(SEARCH_PARAM) ?? "") : "";

    const setQuery = (words: string) => {
        const params = new URLSearchParams(onList ? search : "");
        if (words) params.set(SEARCH_PARAM, words);
        else params.delete(SEARCH_PARAM);
        // Every letter on the list replaces the entry, so back does not step through the letters.
        navigate({ pathname: HOME_VIDEOS_PATH, search: params.toString() }, { replace: onList });
    };

    return (
        <TextField
            size="small"
            fullWidth
            autoFocus={autoFocus}
            placeholder="Search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            slotProps={{
                input: {
                    startAdornment: (
                        <InputAdornment position="start">
                            <SearchIcon fontSize="small" color="primary" />
                        </InputAdornment>
                    ),
                    endAdornment: query ? (
                        <InputAdornment position="end">
                            <LabelledIconButton label="Clear the search" onClick={() => setQuery("")}>
                                <ClearIcon fontSize="small" />
                            </LabelledIconButton>
                        </InputAdornment>
                    ) : undefined,
                },
            }}
        />
    );
};
