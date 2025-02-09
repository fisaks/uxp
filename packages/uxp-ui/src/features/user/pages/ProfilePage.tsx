import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { Accordion, AccordionDetails, AccordionSummary, Typography } from "@mui/material";
import { ProfilePayload, ProfileSchema, ValidationErrorMessages } from "@uxp/common";
import React, { useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { ErrorTile, CenteredBox, ValidatedTextField, FormFieldErrors, FormFieldLabel, FormFieldRefs, LoadingButton } from "@uxp/ui-lib";
import { ServerErrorTile } from "../../../components";
import { useAppDispatch } from "../../../hooks";
import { compileSchema, validateField } from "../../../utils/validationUtils"; // Utility for schema compilation
import { selectError } from "../../error/errorSelectors";
import { clearError } from "../../error/errorSlice";
import { selectIsLoading, selectIsProcessed } from "../../loading/loadingSelectors";
import { selectCurrentUser } from "../userSelectors";
import { updateProfile } from "../userThunks";

// Compile schema for validation
const validate = compileSchema(ProfileSchema.body!);

const fieldLabels: FormFieldLabel<ProfilePayload> = {
    passwordOld: "Old Password",
    password: "New Password",
    passwordConfirm: "Confirm New Password",
    firstName: "First Name",
    lastName: "Last Name",
    email: "Email Address",
};

const errorMessages: ValidationErrorMessages<ProfilePayload> = {
    minLength: {
        passwordOld: "Old password must be at least 8 characters long.",
        password: "New password must be at least 8 characters long.",
        firstName: "First Name is required.",
        lastName: "Last Name is required.",
    },
    format: {
        email: "Please provide a valid email address.",
    },
    const: {
        passwordConfirm: "Your confirmation password does not match the new password.",
    },
    not: {
        password: "Your new password can't be the same as the old one",
    },
};

const ProfilePage: React.FC = () => {
    const dispatch = useAppDispatch();
    const user = useSelector(selectCurrentUser());
    // Form State
    const [formData, setFormData] = useState<ProfilePayload>({
        firstName: user?.firstName ?? "",
        lastName: user?.lastName ?? "",
        email: user?.email ?? "",
        passwordOld: "",
        password: "",
        passwordConfirm: "",
    });

    const [fieldErrors, setFieldErrors] = useState<FormFieldErrors<ProfilePayload>>({});
    const [errorTileVisible, setErrorTileVisible] = useState(false);
    const apiError = useSelector(selectError("user/profile"));
    // Ref for Error Tile Header
    const errorTileHeaderRef = useRef<HTMLHeadingElement>(null);
    const isLoading = useSelector(selectIsLoading("user/profile"));
    const isProcessed = useSelector(selectIsProcessed("user/profile"));
    // Field Refs for Focus
    const fieldRefs: FormFieldRefs<ProfilePayload> = {
        passwordOld: useRef<HTMLInputElement>(null),
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

    useEffect(() => {
        if (isProcessed) {
            setFormData((prevFormData) => ({
                ...prevFormData,
                password: "",
                passwordConfirm: "",
                passwordOld: "",
            }));
        }
    }, [isProcessed]);

    const updateErrorField = (name: keyof ProfilePayload, error: string | undefined) => {
        if (error) {
            setFieldErrors((prev) => ({ ...prev, [name]: error }));
        } else {
            setFieldErrors((prev) => {
                const { [name]: _, ...rest } = prev;
                return rest;
            });
        }
    };

    const handleBlur = (name: keyof ProfilePayload) => {
        const message = validateField({
            validate,
            formData,
            field: name,
            value: formData[name],
            errorMessages,
        });

        updateErrorField(name, message);
    };

    const handleChange = (name: keyof ProfilePayload, value: string) => {
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
        dispatch(clearError("user/profile"));
        const errors: FormFieldErrors<ProfilePayload> = {};
        const isValid = validate(formData);

        if (!isValid && validate.errors) {
            console.log(validate.errors);
            validate.errors
                .filter((f) => f.keyword !== "if")
                .forEach((err) => {
                    if (err.instancePath) {
                        const fieldName = err.instancePath.slice(1) as keyof ProfilePayload;
                        errors[fieldName] =
                            errorMessages[err.keyword as keyof ValidationErrorMessages]?.[fieldName] ?? err.message ?? "Invalid value.";
                    }
                });
        }

        setFieldErrors(errors);
        setErrorTileVisible(Object.keys(errors).length > 0);

        if (Object.keys(errors).length === 0) {
            dispatch(updateProfile({ uuid: user?.uuid!, payload: formData }));
        } else {
            setTimeout(() => {
                errorTileHeaderRef.current?.focus();
            }, 0);
        }
    };

    return (
        <CenteredBox maxWidth={600}>
            <Typography variant="h4" component="h1" gutterBottom>
                My Profile ({user?.username})
            </Typography>

            {apiError && <ServerErrorTile apiError={apiError} />}

            {/* Error Tile */}
            {errorTileVisible && Object.keys(fieldErrors).length > 0 && (
                <ErrorTile<ProfilePayload>
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
                {Object.keys(formData)
                    .filter((key) => !key.startsWith("password"))
                    .map((key) => (
                        <ValidatedTextField<ProfilePayload>
                            key={key}
                            name={key as keyof ProfilePayload}
                            type={
                                key === "email"
                                    ? "email"
                                    : ["passwordOld", "password", "passwordConfirm"].includes(key)
                                      ? "password"
                                      : "text"
                            }
                            label={fieldLabels[key as keyof ProfilePayload]}
                            value={formData[key as keyof ProfilePayload]}
                            error={fieldErrors[key as keyof ProfilePayload]}
                            inputRef={fieldRefs[key as keyof ProfilePayload]}
                            onChange={(value) => handleChange(key as keyof ProfilePayload, value)}
                            onBlur={() => handleBlur(key as keyof ProfilePayload)}
                        />
                    ))}

                <Accordion>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />} aria-controls="change-password-content" id="change-password-header">
                        <Typography>Change Password</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                            {Object.keys(formData)
                                .filter((key) => key.startsWith("password"))
                                .map((key) => (
                                    <ValidatedTextField<ProfilePayload>
                                        key={key}
                                        name={key as keyof ProfilePayload}
                                        type={
                                            key === "email"
                                                ? "email"
                                                : ["passwordOld", "password", "passwordConfirm"].includes(key)
                                                  ? "password"
                                                  : "text"
                                        }
                                        label={fieldLabels[key as keyof ProfilePayload]}
                                        value={formData[key as keyof ProfilePayload]}
                                        error={fieldErrors[key as keyof ProfilePayload]}
                                        inputRef={fieldRefs[key as keyof ProfilePayload]}
                                        onChange={(value) => handleChange(key as keyof ProfilePayload, value)}
                                        onBlur={() => handleBlur(key as keyof ProfilePayload)}
                                    />
                                ))}
                        </div>
                    </AccordionDetails>
                </Accordion>

                <LoadingButton
                    variant="contained"
                    color="primary"
                    fullWidth
                    sx={{ mt: 3 }}
                    type="submit"
                    isLoading={isLoading}
                    done={isProcessed}
                    doneText="Profile Updated"
                >
                    Update Profile
                </LoadingButton>
            </form>
        </CenteredBox>
    );
};

export default ProfilePage;
