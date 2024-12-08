import { JSONSchemaType } from "ajv";

export type SchemaValidate<T = object> = {
    body?: JSONSchemaType<T>;
    querystring?: JSONSchemaType<T>;
    headers?: JSONSchemaType<T>;
};
