export const fieldKeyTypes = ["building", "test"] as const;
export type FieldKeyType = (typeof fieldKeyTypes)[number];

export type FieldKey = {
    key: string
    normalizedKey: string

}
export type FieldKeyWithType = FieldKey & {
    type: FieldKeyType
}
export type NewFieldKeyPayload = {
    key: string
    type: FieldKeyType
}
export type GetFieldKeyByTypeResponse = {
    [key in FieldKeyType]?: FieldKey[];
}