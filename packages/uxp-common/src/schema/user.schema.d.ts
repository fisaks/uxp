import { LockUserPayload, LoginPayload, ProfilePayload, RegisterPayload, UnlockUserPayload, UpdateTokenVersionPayload, UpdateUserRolesPayload, UserSearchRequest, UserSettingsPayload } from "../user/user.types";
import { SchemaValidate } from "./schemaValidate";
export declare const RegisterSchema: SchemaValidate<RegisterPayload>;
export declare const LoginSchema: SchemaValidate<LoginPayload>;
export declare const UnlockUserSchema: SchemaValidate<UnlockUserPayload>;
export declare const LockUserSchema: SchemaValidate<LockUserPayload>;
export declare const UpdateUserRoleSchema: SchemaValidate<UpdateUserRolesPayload>;
export declare const UpdateTokenVersionSchema: SchemaValidate<UpdateTokenVersionPayload>;
export declare const ProfileSchema: SchemaValidate<ProfilePayload, undefined, {
    uuid: string;
}>;
export declare const UserSettingsSchema: SchemaValidate<Required<UserSettingsPayload>>;
export declare const UserSearchSchema: SchemaValidate<UserSearchRequest>;
//# sourceMappingURL=user.schema.d.ts.map