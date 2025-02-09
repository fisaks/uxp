import { Link, Typography } from "@mui/material";
import { RegisterPayload, RegisterSchema, ValidationErrorMessages } from "@uxp/common";
import { CenteredBox, ErrorTile, FormFieldErrors, FormFieldLabel, FormFieldRefs, LoadingButton, ValidatedTextField } from "@uxp/ui-lib";
import React, { useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { Link as RouterLink, useNavigate } from "react-router-dom"; // Import for routing
import { ServerErrorTile } from "../../../components";
import { useAppDispatch } from "../../../hooks";
import { handleThunkResult } from "../../../utils/thunkUtils";
import { compileSchema, validateField } from "../../../utils/validationUtils"; // Utility for schema compilation
import { selectError } from "../../error/errorSelectors";
import { clearError } from "../../error/errorSlice";
import { selectIsLoading } from "../../loading/loadingSelectors";
import { register } from "../userThunks";

// Compile schema for validation
const validate = compileSchema(RegisterSchema.body!);

const fieldLabels: FormFieldLabel<RegisterPayload> = {
    username: "User Name",
    password: "Password",
    passwordConfirm: "Confirm Password",
    firstName: "First Name",
    lastName: "Last Name",
    email: "Email Address",
};

const errorMessages: ValidationErrorMessages<RegisterPayload> = {
    minLength: {
        username: "User Name must be at least 4 characters long.",
        password: "Password must be at least 8 characters long.",
        firstName: "First Name is required.",
        lastName: "Last Name is required.",
    },
    format: {
        email: "Please provide a valid email address.",
    },
    const: {
        passwordConfirm: "Your confirmation password does not match the new password.",
    },
};

const RegisterPage: React.FC = () => {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    // Form State
    const [formData, setFormData] = useState<RegisterPayload>({
        username: "",
        password: "",
        passwordConfirm: "",
        firstName: "",
        lastName: "",
        email: "",
    });

    const [fieldErrors, setFieldErrors] = useState<FormFieldErrors<RegisterPayload>>({});
    const [errorTileVisible, setErrorTileVisible] = useState(false);
    const apiError = useSelector(selectError("user/register"));
    // Ref for Error Tile Header
    const errorTileHeaderRef = useRef<HTMLHeadingElement>(null);
    const isLoading = useSelector(selectIsLoading("user/register"));

    // Field Refs for Focus
    const fieldRefs: FormFieldRefs<RegisterPayload> = {
        username: useRef<HTMLInputElement>(null),
        password: useRef<HTMLInputElement>(null),
        passwordConfirm: useRef<HTMLInputElement>(null),
        firstName: useRef<HTMLInputElement>(null),
        lastName: useRef<HTMLInputElement>(null),
        email: useRef<HTMLInputElement>(null),
    };

    useEffect(() => {
        if (errorTileVisible && Object.keys(fieldErrors).length === 0) {
            setErrorTileVisible(false);
        }
    }, [fieldErrors, errorTileVisible]);

    const updateErrorField = (name: keyof RegisterPayload, error: string | undefined) => {
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

    const handleBlur = (name: keyof RegisterPayload) => {
        const message = validateField({
            validate,
            formData,
            field: name,
            value: formData[name],
            errorMessages,
        });

        updateErrorField(name, message);
    };

    const handleChange = (name: keyof RegisterPayload, value: string) => {
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
        dispatch(clearError("user/register"));
        const errors: FormFieldErrors<RegisterPayload> = {};
        const isValid = validate(formData);

        if (!isValid && validate.errors) {
            validate.errors.forEach((err) => {
                if (err.instancePath) {
                    const fieldName = err.instancePath.slice(1) as keyof RegisterPayload;
                    errors[fieldName] =
                        errorMessages[err.keyword as keyof ValidationErrorMessages]?.[fieldName] ?? err.message ?? "Invalid value.";
                }
            });
        }

        setFieldErrors(errors);
        setErrorTileVisible(Object.keys(errors).length > 0);

        if (Object.keys(errors).length === 0) {
            dispatch(register(formData)).then(
                handleThunkResult(() => {
                    navigate("/register-thank-you");
                })
            );
        } else {
            setTimeout(() => {
                errorTileHeaderRef.current?.focus();
            }, 0);
        }
    };

    return (
        <CenteredBox maxWidth={600}>
            <Typography variant="h4" component="h1" gutterBottom>
                Register
            </Typography>

            {apiError && <ServerErrorTile apiError={apiError} />}

            {/* Error Tile */}
            {errorTileVisible && Object.keys(fieldErrors).length > 0 && (
                <ErrorTile<RegisterPayload>
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
                    <ValidatedTextField<RegisterPayload>
                        key={key}
                        name={key as keyof RegisterPayload}
                        type={key === "email" ? "email" : ["password", "passwordConfirm"].includes(key) ? "password" : "text"}
                        label={fieldLabels[key as keyof RegisterPayload]}
                        value={formData[key as keyof RegisterPayload]}
                        error={fieldErrors[key as keyof RegisterPayload]}
                        inputRef={fieldRefs[key as keyof RegisterPayload]}
                        onChange={(value) => handleChange(key as keyof RegisterPayload, value)}
                        onBlur={() => handleBlur(key as keyof RegisterPayload)}
                    />
                ))}
                <LoadingButton variant="contained" color="primary" fullWidth sx={{ mt: 3 }} type="submit" isLoading={isLoading}>
                    Register
                </LoadingButton>
                <Typography variant="body2" align="center" sx={{ mt: 2 }}>
                    Already have an account?{" "}
                    <Link component={RouterLink} to="/login" color="primary">
                        Login
                    </Link>
                </Typography>
            </form>
        </CenteredBox>
    );
};

export default RegisterPage;
