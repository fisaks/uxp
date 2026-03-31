import { Box, IconButton, Tooltip, Typography, useTheme } from "@mui/material";
import { ApiErrorResponse, ErrorCodes, GlobalConfigPayload, GlobalConfigPublic, ValidationErrorMessages } from "@uxp/common";
import { createDebouncedUpdater, FormFieldErrors, FormFieldLabel, FormFieldRefs, Loading, ValidatedTextField } from "@uxp/ui-lib";
import { useAppDispatch } from "../../../hooks";

import RefreshIcon from "@mui/icons-material/Refresh";
import React, { useCallback, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { ServerErrorTile } from "../../../components";
import { selectError } from "../../error/errorSelectors";
import { selectGlobalConfig } from "../../global-config/globalConfigSelectors";
import { configFieldUpdated } from "../../global-config/globalConfigSlice";
import { fetchPublicGlobalSettings, patchGlobalSetting } from "../../global-config/globalConfigThunk";
import { selectIsLoading } from "../../loading/loadingSelectors";

const fieldLabels: FormFieldLabel<GlobalConfigPublic> = {
    siteName: "Site Name",
};

const fieldErrorMessages: ValidationErrorMessages<GlobalConfigPublic> = {
    minLength: {
        siteName: "The site name must be at least 2 characters long.",
    },
};
const globalErrorMessages = {
    internalServerError: "There was an error updating the site name. Please try again later.",
};

const GlobalSettingsPage: React.FC = () => {
    const dispatch = useAppDispatch();
    const theme = useTheme();
    const globalConfig = useSelector(selectGlobalConfig);
    const [formData, setFormData] = useState<GlobalConfigPublic>({
        siteName: globalConfig?.siteName ?? "",
    });

    const isLoading = useSelector(selectIsLoading("globalSettings/patch"));
    const isLoadingLatest = useSelector(selectIsLoading("globalSettings/fetchPublic"));
    const loadingLatestError = useSelector(selectError("globalSettings/fetchPublic"));

    const fieldRefs: FormFieldRefs<GlobalConfigPublic> = {
        siteName: useRef<HTMLInputElement>(null),
    };
    const [fieldErrors, setFieldErrors] = useState<FormFieldErrors<GlobalConfigPublic>>({});

    const updateFieldError = useCallback(
        (key: string, message: string | undefined) => {
            setFieldErrors((prev) => ({
                ...prev,
                [key]: message,
            }));
        },
        [setFieldErrors]
    );

    const fieldErrorHandler = useCallback(
        (error: ApiErrorResponse, payload: GlobalConfigPayload) => {
            error.errors.forEach((error) => {
                if (error.code === ErrorCodes.VALIDATION) {
                    const keyword = error.params?.value as keyof ValidationErrorMessages;
                    updateFieldError(payload.key, fieldErrorMessages[keyword]?.[payload.key as keyof GlobalConfigPublic] ?? "Invalid value.");
                } else {
                    updateFieldError(payload.key, globalErrorMessages.internalServerError);
                }
            });
        },
        [updateFieldError]
    );

    const fieldSuccessHandler = useCallback(
        (_result: unknown, payload: GlobalConfigPayload) => {
            updateFieldError(payload.key, undefined);
            dispatch(configFieldUpdated(payload));
        },
        [updateFieldError, dispatch]
    );

    const debouncedUpdateSiteName = useMemo(
        () =>
            createDebouncedUpdater({
                updateThunk: patchGlobalSetting,
                successHandler: fieldSuccessHandler,
                errorHandler: fieldErrorHandler,
                debounceWait: 1000,
            }),
        [fieldSuccessHandler, fieldErrorHandler]
    );

    const handleChange = useCallback(
        (name: keyof GlobalConfigPublic, value: string) => {
            setFormData((prev) => ({ ...prev, [name]: value }));
            debouncedUpdateSiteName(dispatch, { key: name, value: value });
        },
        [dispatch, debouncedUpdateSiteName, setFormData]
    );
    const reload = useCallback(() => {
        dispatch(fetchPublicGlobalSettings({}));
    }, [dispatch]);

    return (
        <Box sx={{ p: 2 }}>
            {loadingLatestError && <ServerErrorTile apiError={loadingLatestError} />}
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Typography variant="h2" component="h2">
                    Global Settings
                </Typography>
                <Tooltip title={isLoadingLatest ? "Refreshing..." : "Reload"}>
                    <span>
                        <IconButton
                            aria-label="reload settings"
                            onClick={reload}
                            disabled={isLoadingLatest}
                            sx={{ color: theme.palette.primary.main }}
                        >
                            {isLoadingLatest ? <Loading size={20} /> : <RefreshIcon />}
                        </IconButton>
                    </span>
                </Tooltip>
            </Box>

            <form>
                {Object.keys(formData).map((key) => (
                    <ValidatedTextField<GlobalConfigPublic>
                        key={key}
                        disabled={isLoadingLatest}
                        name={key as keyof GlobalConfigPublic}
                        type="text"
                        loading={isLoading}
                        label={fieldLabels[key as keyof GlobalConfigPublic]}
                        value={formData[key as keyof GlobalConfigPublic]}
                        error={fieldErrors[key as keyof GlobalConfigPublic]}
                        inputRef={fieldRefs[key as keyof GlobalConfigPublic]}
                        onChange={(value) => handleChange(key as keyof GlobalConfigPublic, value)}
                    />
                ))}
            </form>
        </Box>
    );
};

export default GlobalSettingsPage;
