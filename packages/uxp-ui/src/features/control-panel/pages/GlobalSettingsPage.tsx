import { Box, IconButton, Tooltip, Typography, useTheme } from "@mui/material";
import {
    ApiErrorResponse,
    ErrorCodes,
    GlobalConfigData,
    PatchGlobalConfigResponse,
    ValidationErrorMessages,
} from "@uxp/common";
import {
    createDebouncedUpdater,
    FormFieldErrors,
    FormFieldLabel,
    FormFieldRefs,
    Loading,
    ValidatedTextField,
} from "@uxp/ui-lib";
import { useAppDispatch } from "../../../hooks";

import RefreshIcon from "@mui/icons-material/Refresh";
import React, { useCallback, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { ServerErrorTile } from "../../../components";
import { selectError } from "../../error/errorSelectors";
import { selectGlobalConfig } from "../../global-config/globalConfigSelectors";
import {
    fetchLatestGlobalSettings,
    patchGlobalSetting,
    PatchGlobalSettingPayload,
} from "../../global-config/globalConfigThunk";
import { selectIsLoading } from "../../loading/loadingSelectors";

const fieldLabels: FormFieldLabel<GlobalConfigData> = {
    siteName: "Site Name",
};

const fieldErrorMessages: ValidationErrorMessages<GlobalConfigData> = {
    minLength: {
        siteName: "The site name must be at least 2 characters long.",
    },
};
const globalErrorMessages = {
    patchVersionConflict: "The site name has been updated by another user. Please refresh the page and try again.",
    internalServerError: "There was an error updating the site name. Please try again later.",
};

const GlobalSettingsPage: React.FC = () => {
    const dispatch = useAppDispatch();
    const theme = useTheme();
    const globalConfig = useSelector(selectGlobalConfig);
    const [formData, setFormData] = useState<GlobalConfigData>({
        siteName: globalConfig?.siteName ?? "",
    });

    const isLoading = useSelector(selectIsLoading("globalSettings/patch"));
    const isLoadingLatest = useSelector(selectIsLoading("globalSettings/fetchLatest"));
    const loadingLatestError = useSelector(selectError("globalSettings/fetchLatest"));

    const fieldRefs: FormFieldRefs<GlobalConfigData> = {
        siteName: useRef<HTMLInputElement>(null),
    };
    const [fieldErrors, setFieldErrors] = useState<FormFieldErrors<GlobalConfigData>>({});

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
        (error: ApiErrorResponse, payload: PatchGlobalSettingPayload) => {
            error.errors.forEach((error) => {
                if (error.code === ErrorCodes.VALIDATION) {
                    const keyword = error.params?.value as keyof ValidationErrorMessages;
                    updateFieldError(payload.key, fieldErrorMessages[keyword]?.[payload.key] ?? "Invalid value.");
                } else if (error.code === ErrorCodes.PATCH_VERSION_CONFLICT) {
                    updateFieldError(payload.key, globalErrorMessages.patchVersionConflict);
                } else {
                    updateFieldError(payload.key, globalErrorMessages.internalServerError);
                }
            });
        },
        [updateFieldError]
    );

    const fieldSuccessHandler = useCallback(
        (result: PatchGlobalConfigResponse, payload: PatchGlobalSettingPayload) => {
            updateFieldError(payload.key, undefined);
        },
        [updateFieldError]
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
        (name: keyof GlobalConfigData, value: string) => {
            setFormData((prev) => ({ ...prev, [name]: value }));
            debouncedUpdateSiteName(dispatch, { key: name, value: value });
        },
        [dispatch, debouncedUpdateSiteName, setFormData]
    );
    const reload = useCallback(() => {
        dispatch(fetchLatestGlobalSettings({}));
    }, []);

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
                    <ValidatedTextField<GlobalConfigData>
                        key={key}
                        disabled={isLoadingLatest}
                        name={key as keyof GlobalConfigData}
                        type="text"
                        loading={isLoading}
                        label={fieldLabels[key as keyof GlobalConfigData]}
                        value={formData[key as keyof GlobalConfigData]}
                        error={fieldErrors[key as keyof GlobalConfigData]}
                        inputRef={fieldRefs[key as keyof GlobalConfigData]}
                        onChange={(value) => handleChange(key as keyof GlobalConfigData, value)}
                    />
                ))}
            </form>
        </Box>
    );
};

export default GlobalSettingsPage;
