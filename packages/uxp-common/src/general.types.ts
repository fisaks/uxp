export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends Array<infer U> // If the property is an array
  ? Array<DeepPartial<U>> // Recursively apply DeepPartial to the array's element type
  : T[P] extends object // If the property is an object
  ? DeepPartial<T[P]> // Recursively apply DeepPartial to the object
  : T[P]; // Otherwise, leave the type as-is
};
// Utility function to ensure all code paths are handled
// usable in switch statements with 'never' type in default case
// ensures exhaustive checks at compile time
export function assertNever(unexpectedValue: never): never {
  throw new Error(`Unexpected object: ${unexpectedValue}`);
}