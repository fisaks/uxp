export type DeepPartial<T> = {
    [P in keyof T]?: T[P] extends Array<infer U> // If the property is an array
        ? Array<DeepPartial<U>> // Recursively apply DeepPartial to the array's element type
        : T[P] extends object // If the property is an object
          ? DeepPartial<T[P]> // Recursively apply DeepPartial to the object
          : T[P]; // Otherwise, leave the type as-is
};
