import {
    LockUserPayload,
    LoginPayload,
    ProfilePayload,
    RegisterPayload,
    UnlockUserPayload,
    UpdateTokenVersionPayload,
    UpdateUserRolesPayload,
    UserSearchRequest,
    UserSettingsPayload,
} from "../user/user.types";
import { SchemaValidate } from "./schemaValidate";

export const RegisterSchema: SchemaValidate<RegisterPayload> = {
    body: {
        type: "object",
        properties: {
            username: { type: "string", minLength: 4 },
            password: { type: "string", minLength: 8 },
            passwordConfirm: { type: "string" },
            firstName: { type: "string", minLength: 1 },
            lastName: { type: "string", minLength: 1 },
            email: { type: "string", format: "email" },
        },
        required: ["username", "password", "email", "firstName", "lastName"],
        allOf: [
            {
                properties: {
                    passwordConfirm: { const: { $data: "1/password" } },
                },
            },
        ],
    },
};

export const LoginSchema: SchemaValidate<LoginPayload> = {
    body: {
        type: "object",
        properties: {
            username: { type: "string", minLength: 4 },
            password: { type: "string", minLength: 8 },
        },
        required: ["username", "password"],
    },
};

export const UnlockUserSchema: SchemaValidate<UnlockUserPayload> = {
    body: {
        type: "object",
        properties: {
            uuid: { type: "string", format: "uuid" },
        },
        required: ["uuid"],
    },
};

export const LockUserSchema: SchemaValidate<LockUserPayload> = {
    body: {
        type: "object",
        properties: {
            uuid: { type: "string", format: "uuid" },
        },
        required: ["uuid"],
    },
};

export const UpdateUserRoleSchema: SchemaValidate<UpdateUserRolesPayload> = {
    body: {
        type: "object",
        properties: {
            uuid: { type: "string", format: "uuid" },
            roles: {
                type: "array",
                items: { type: "string", enum: ["admin", "user"] },
            },
        },
        required: ["uuid", "roles"],
    },
};

export const UpdateTokenVersionSchema: SchemaValidate<UpdateTokenVersionPayload> = {
    body: {
        type: "object",
        properties: {
            uuid: { type: "string", format: "uuid" },
        },
        required: ["uuid"],
    },
};
export const ProfileSchema: SchemaValidate<ProfilePayload, undefined, { uuid: string }> = {
    body: {
        type: "object",
        properties: {
            passwordOld: { type: "string", if: { minLength: 1 }, then: { minLength: 8 } },
            password: { type: "string", if: { minLength: 1 }, then: { minLength: 8 } },
            passwordConfirm: { type: "string" },
            firstName: { type: "string", minLength: 1 },
            lastName: { type: "string", minLength: 1 },
            email: { type: "string", format: "email" },
        },
        required: ["passwordOld", "password", "passwordConfirm", "email", "firstName", "lastName"],
        allOf: [
            {
                properties: {
                    passwordConfirm: { const: { $data: "1/password" } },
                },
            },
            {
                if: {
                    properties: {
                        password: { type: "string", minLength: 1 }, // Apply condition only if password has a value
                    },
                },
                then: {
                    properties: {
                        password: { not: { const: { $data: "1/passwordOld" } } },
                        passwordOld: { type: "string", minLength: 8 },
                    },
                },
            },
        ],
    },
    params: {
        type: "object",
        properties: {
            uuid: { type: "string", format: "uuid" },
        },
        required: ["uuid"],
    },
};

export const UserSettingsSchema: SchemaValidate<Required<UserSettingsPayload>> = {
    body: {
        type: "object",
        properties: {
            //theme: { type: "string", enum: ["dracula", "light"] },
            theme: { type: "string", enum: ["dracula", "light"] },
        },
        required: [],
    },
};

export const UserSearchSchema: SchemaValidate<UserSearchRequest> = {
    body: {
        type: "object",
        properties: {
            filters: {
                type: "array",
                items: {
                    type: "object",
                    properties: {
                        field: {
                            type: "string",
                            enum: [
                                "uuid",
                                "username",
                                "firstName",
                                "lastName",
                                "email",
                                "roles",
                                "createdAt",
                                "lastLogin",
                                "isDisabled",
                            ],
                        },
                        value: {
                            anyOf: [
                                {
                                    type: "string",
                                    nullable: true,
                                    minLength: 0,
                                    maxLength: 50,
                                    not: { enum: ["true", "false"] },
                                },
                                { type: "boolean" },
                                { type: "number" },
                            ],
                        },
                        operator: { type: "string", enum: ["eq", "lt", "gt", "contains"] },
                    },
                    required: ["field", "value", "operator"],
                },
                nullable: true,
            },
            search: {
                type: ["string", "array"],
                anyOf: [
                    { type: "string", nullable: true, minLength: 0, maxLength: 50 },
                    {
                        type: "array",
                        items: { type: "string", nullable: true, minLength: 0, maxLength: 50 },
                    },
                ],
                nullable: true,
            },
            sort: {
                type: "array",
                items: {
                    type: "object",
                    properties: {
                        field: {
                            type: "string",
                            enum: [
                                "uuid",
                                "username",
                                "firstName",
                                "lastName",
                                "email",
                                "roles",
                                "createdAt",
                                "lastLogin",
                                "isDisabled",
                            ],
                        },
                        direction: { type: "string", enum: ["asc", "desc"] },
                    },
                    required: ["field", "direction"],
                },
                nullable: true,
            },
            pagination: {
                type: "object",
                properties: {
                    page: { type: "integer", minimum: 1 },
                    size: { type: "integer", minimum: 1 },
                },
                required: ["page", "size"],
            },
        },
        required: ["pagination"],
    },
};
