import Ajv, { JSONSchemaType } from "ajv";
export type AjvKeyword =
    | "type"
    | "minLength"
    | "maxLength"
    | "format"
    | "minimum"
    | "maximum"
    | "pattern"
    | "enum"
    | "const"
    | "required"
    | "additionalProperties"
    | "dependencies"
    | "anyOf"
    | "allOf"
    | "oneOf"
    | "not";

export type SchemaValidate<TBody = object, TQuerystring = undefined, TParams = undefined, THeaders = undefined> = {
    body?: JSONSchemaType<TBody>;
    querystring?: JSONSchemaType<TQuerystring>;
    params?: JSONSchemaType<TParams>;
    headers?: JSONSchemaType<THeaders>;
};
export type ValidationErrorMessages<T = string> = Partial<Record<AjvKeyword, Partial<Record<T extends string ? string : keyof T, string>>>>;

export type MessagePayloadSchema<T> = JSONSchemaType<T>;

