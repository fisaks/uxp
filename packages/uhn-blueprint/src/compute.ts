// compute.ts — Standard compute functions for complex resource tile summaries
import { ComplexComputeFn, ResourceBase, ResourceType } from "./resource";

type ValuesMap = Map<ResourceBase<ResourceType>, boolean | number>;

/* ------------------------------------------------------------------ */
/* Internal helpers                                                    */
/* ------------------------------------------------------------------ */

function numericValues(values: ValuesMap): number[] {
    return [...values.values()].filter((v): v is number => typeof v === "number");
}

function booleanValues(values: ValuesMap): boolean[] {
    return [...values.values()].filter((v): v is boolean => typeof v === "boolean");
}

/* ------------------------------------------------------------------ */
/* Numeric                                                             */
/* ------------------------------------------------------------------ */

/** Sum of all numeric resource values */
export const computeSum: ComplexComputeFn = (values) =>
    numericValues(values).reduce((a, b) => a + b, 0);

/** Average of all numeric resource values */
export const computeAvg: ComplexComputeFn = (values) => {
    const nums = numericValues(values);
    return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
};

/** Minimum of all numeric resource values */
export const computeMin: ComplexComputeFn = (values) => {
    const nums = numericValues(values);
    return nums.length ? Math.min(...nums) : 0;
};

/** Maximum of all numeric resource values */
export const computeMax: ComplexComputeFn = (values) => {
    const nums = numericValues(values);
    return nums.length ? Math.max(...nums) : 0;
};

/* ------------------------------------------------------------------ */
/* Boolean                                                             */
/* ------------------------------------------------------------------ */

/** true when ALL watched resources are on */
export const computeAllOn: ComplexComputeFn = (values) => {
    const bools = booleanValues(values);
    return bools.length > 0 && bools.every(Boolean);
};

/** true when at least ONE watched resource is on */
export const computeAnyOn: ComplexComputeFn = (values) =>
    booleanValues(values).some(Boolean);

/** true when ALL watched resources are off */
export const computeAllOff: ComplexComputeFn = (values) => {
    const bools = booleanValues(values);
    return bools.length > 0 && bools.every(v => !v);
};

/** Returns the count of watched resources that are on */
export const computeOnCount: ComplexComputeFn = (values) =>
    booleanValues(values).filter(Boolean).length;
