import { Link, Typography } from "@mui/material";
import { LoginPayload, LoginSchema, ValidationErrorMessages } from "@uxp/common";
import React, { useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { Link as RouterLink } from "react-router-dom"; // Import for routing

import { CenteredBox, ErrorTile, FormFieldErrors, FormFieldLabel, FormFieldRefs, LoadingButton, ValidatedTextField } from "@uxp/ui-lib";

import { ServerErrorTile } from "../../../components";
import { useAppDispatch } from "../../../hooks";
import { compileSchema, validateField } from "../../../utils/validationUtils"; // Utility for schema compilation
import { selectError } from "../../error/errorSelectors";
import { clearError } from "../../error/errorSlice";
import { selectIsLoading } from "../../loading/loadingSelectors";
import { login } from "../userThunks";

// Compile schema for validation
const validate = compileSchema(LoginSchema.body!);

const fieldLabels: FormFieldLabel<LoginPayload> = {
    username: "User Name",
    password: "Password",
};

const errorMessages: ValidationErrorMessages<LoginPayload> = {
    minLength: {
        username: "User Name must be at least 4 characters long.",
        password: "Password must be at least 8 characters long.",
    },
};

const LoginPage: React.FC = () => {
    const dispatch = useAppDispatch();

    // Form State
    const [formData, setFormData] = useState<LoginPayload>({
        username: "",
        password: "",
    });

    const [fieldErrors, setFieldErrors] = useState<FormFieldErrors<LoginPayload>>({});
    const [errorTileVisible, setErrorTileVisible] = useState(false);
    const isLoading = useSelector(selectIsLoading("user/login"));
    const apiError = useSelector(selectError("user/login"));
    // Ref for Error Tile Header
    const errorTileHeaderRef = useRef<HTMLHeadingElement>(null);

    // Field Refs for Focus
    const fieldRefs: FormFieldRefs<LoginPayload> = {
        username: useRef<HTMLInputElement>(null),
        password: useRef<HTMLInputElement>(null),
    };

    useEffect(() => {
        if (errorTileVisible && Object.keys(fieldErrors).length === 0) {
            setErrorTileVisible(false);
        }
    }, [fieldErrors, errorTileVisible]);

    const updateErrorField = (name: keyof LoginPayload, error: string | undefined) => {
        if (error) {
            setFieldErrors((prev) => ({ ...prev, [name]: error }));
        } else {
            setFieldErrors((prev) => {
                 // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const { [name]: _, ...rest } = prev;
                return rest;
            });
        }
    };

    const handleBlur = (name: keyof LoginPayload) => {
        const message = validateField({
            validate,
            formData,
            field: name,
            value: formData[name],
            errorMessages,
        });

        updateErrorField(name, message);
    };

    const handleChange = (name: keyof LoginPayload, value: string) => {
        setFormData((prev) => ({ ...prev, [name]: value }));

        if (fieldErrors[name]) {
            const message = validateField({
                validate,
                formData: { ...formData, [name]: value },
                field: name,
                value,
                errorMessages,
            });

            updateErrorField(name, message);
        }
    };

    const handleSubmit = () => {
        dispatch(clearError("user/login"));
        const errors: FormFieldErrors<LoginPayload> = {};
        const isValid = validate(formData);

        if (!isValid && validate.errors) {
            validate.errors.forEach((err) => {
                if (err.instancePath) {
                    const fieldName = err.instancePath.slice(1) as keyof LoginPayload;
                    errors[fieldName] =
                        errorMessages[err.keyword as keyof ValidationErrorMessages]?.[fieldName] ?? err.message ?? "Invalid value.";
                }
            });
        }

        setFieldErrors(errors);
        setErrorTileVisible(Object.keys(errors).length > 0);

        if (Object.keys(errors).length === 0) {
            dispatch(login(formData));
        } else {
            setTimeout(() => {
                errorTileHeaderRef.current?.focus();
            }, 0);
        }
    };

    return (
        <CenteredBox maxWidth={400}>
            <Typography variant="h4" component="h1" gutterBottom>
                Login
            </Typography>

            {apiError && <ServerErrorTile apiError={apiError} />}

            {/* Error Tile */}
            {errorTileVisible && Object.keys(fieldErrors).length > 0 && (
                <ErrorTile<LoginPayload>
                    errors={fieldErrors}
                    fieldLabels={fieldLabels}
                    fieldRefs={fieldRefs}
                    errorTileRef={errorTileHeaderRef}
                />
            )}

            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    handleSubmit();
                }}
            >
                {Object.keys(formData).map((key) => (
                    <ValidatedTextField<LoginPayload>
                        key={key}
                        name={key as keyof LoginPayload}
                        type={key === "password" ? "password" : "text"}
                        label={fieldLabels[key as keyof LoginPayload]}
                        value={formData[key as keyof LoginPayload]}
                        error={fieldErrors[key as keyof LoginPayload]}
                        inputRef={fieldRefs[key as keyof LoginPayload]}
                        onChange={(value) => handleChange(key as keyof LoginPayload, value)}
                        onBlur={() => handleBlur(key as keyof LoginPayload)}
                    />
                ))}
                <LoadingButton variant="contained" color="primary" fullWidth sx={{ mt: 3 }} type="submit" isLoading={isLoading}>
                    Login
                </LoadingButton>
                {/* Register Link */}
                <Typography variant="body2" align="center" sx={{ mt: 2 }}>
                    Don't have an account?{" "}
                    <Link component={RouterLink} to="/register" color="primary">
                        Register
                    </Link>
                </Typography>
            </form>
        </CenteredBox>
    );
};

export default LoginPage;
