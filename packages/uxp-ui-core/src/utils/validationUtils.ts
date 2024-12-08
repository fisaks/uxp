import { ValidationErrorMessages } from "@uxp/common";
import Ajv, { ValidateFunction } from "ajv";
import addErrors from "ajv-errors";
import addFormats from "ajv-formats";

const ajv = new Ajv({ allErrors: true, $data: true });
addFormats(ajv);
addErrors(ajv);

export const compileSchema = (schema: object): ValidateFunction => ajv.compile(schema);

interface ValidateFieldOptions<TFormData> {
    validate: ValidateFunction; // AJV compiled schema validation function
    formData: TFormData; // Full form data object
    field: keyof TFormData; // Field name to validate
    value: TFormData[keyof TFormData]; // Field value to validate
    errorMessages?: ValidationErrorMessages<TFormData>;
}

export const validateField = <TFormData extends Record<string, any>>({
    validate,
    formData,
    field,
    value,
    errorMessages,
}: ValidateFieldOptions<TFormData>): string | undefined => {
    const singleFieldData = { ...formData, [field]: value };
    const isValid = validate(singleFieldData);

    if (!isValid && validate.errors) {
        console.log("Validation Errors", validate.errors);
        const errorForField = validate.errors
            .filter((f) => f.keyword !== "if")
            .find((err) => err.instancePath === `/${String(field)}`);

        if (errorForField) {
            const keyword = errorForField.keyword;

            // If errorMessages are provided, map to custom message
            if (errorMessages) {
                return (
                    errorMessages[keyword as keyof ValidationErrorMessages]?.[field] ??
                    errorForField?.message ??
                    "Invalid value."
                );
            }
            return errorForField?.message ?? "Invalid value.";
        }
    }
    return undefined;
};
