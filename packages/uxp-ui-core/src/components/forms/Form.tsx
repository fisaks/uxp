import { Box } from "@mui/material";

import React from "react";

export type FormFieldKeys<FormData> = FormData extends string ? string : keyof FormData;
export type FormField<FormData extends string | object = string> = Record<FormFieldKeys<FormData>, string>;
export type FormFieldLabel<FormData extends string | object = string> = FormField<FormData>;
export type FormFieldErrors<FormData extends string | object = string> = Partial<FormField<FormData>>;
export type FormFieldRefs<FormData extends string | object = string> = Record<
    FormFieldKeys<FormData>,
    React.RefObject<HTMLInputElement>
>;

interface FormProps extends React.ComponentPropsWithoutRef<"form"> {
    children: React.ReactNode;
}

const Form: React.FC<FormProps> = ({ children, ...props }) => (
    <Box component="form" noValidate {...props}>
        {children}
    </Box>
);

export default Form;
