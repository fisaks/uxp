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
    const [fieldErrors, setFieldErrors] = useState<FormFieldErrors<GlobalConfigData>>({});
    const isLoading = useSelector(selectIsLoading("globalSettings/patch"));
    const isLoadingLatest = useSelector(selectIsLoading("globalSettings/fetchLatest"));
    const loadingLatestError = useSelector(selectError("globalSettings/fetchLatest"));

    const fieldRefs: FormFieldRefs<GlobalConfigData> = {
        siteName: useRef<HTMLInputElement>(null),
    };

    const fieldErrorHandler = (error: ApiErrorResponse, payload: PatchGlobalSettingPayload) => {
        error.errors
            .filter((e) => e.code === ErrorCodes.VALIDATION)
            .forEach((e) => {
                const keyword = e.params?.value;
                setFieldErrors((prev) => ({
                    ...prev,
                    [payload.key]:
                        fieldErrorMessages[keyword as keyof ValidationErrorMessages]?.[payload.key] ?? "Invalid value.",
                }));
            });
        error.errors
            .filter((e) => e.code === ErrorCodes.PATCH_VERSION_CONFLICT)
            .forEach((e) => {
                setFieldErrors((prev) => ({
                    ...prev,
                    [payload.key]: globalErrorMessages.patchVersionConflict,
                }));
            });
        error.errors
            .filter((e) => e.code === ErrorCodes.INTERNAL_SERVER_ERROR)
            .forEach((e) => {
                setFieldErrors((prev) => ({
                    ...prev,
                    [payload.key]: globalErrorMessages.internalServerError,
                }));
            });
    };
    const fieldSuccessHandler = (result: PatchGlobalConfigResponse, payload: PatchGlobalSettingPayload) => {
        setFieldErrors((prev) => ({
            ...prev,
            [payload.key]: undefined,
        }));
    };
    const debouncedUpdateSiteName = useMemo(
        () =>
            createDebouncedUpdater({
                updateThunk: patchGlobalSetting,
                successHandler: fieldSuccessHandler,
                errorHandler: fieldErrorHandler,
                debounceWait: 1000,
            }),
        []
    );

    const reload = () => {
        dispatch(fetchLatestGlobalSettings({}));
    };

    const handleChange = useCallback(
        (name: keyof GlobalConfigData, value: string) => {
            setFormData((prev) => ({ ...prev, [name]: value }));
            debouncedUpdateSiteName(dispatch, { key: name, value: value });
        },
        [dispatch, debouncedUpdateSiteName, setFormData]
    );

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
                {Object.keys(formData)
                    .filter((key) => !key.startsWith("password"))
                    .map((key) => (
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
