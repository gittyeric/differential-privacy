export interface PrivatizeOptions<DATASET> {
    maxEpsilon: number,
    newShadowIterator: NewShadowDatasetIterator<DATASET>,
    /**
     * The max number of privatized function invokations before maxEpsilon information is leaked.
     * Calling the privated function after maxCallCount invokations will throw a PrivacyBudgetExceededError.
     * Defaults to just 1.
     *
     * @type {number}
     * @memberof PrivatizeOptions
     */
    maxCallCount?: number,

    /**
     * The max number of concurrent sensitive function calls that can stem 
     * from a caller's individual privatized function call. Cranking this up
     * too high could, say, crash your database for example. Defaults to 4.
     *
     * @type {number}
     * @memberof PrivatizeOptions
     */
    maxConcurrentCalls?: number,

    /**
     * Enables the "privateResult" and "noiseAdded" fields to all subsequent 
     * PrivatizedFunctionResults.  These fields should ONLY be used for debugging
     * and finding good epsilon bounds for your use-case.
     *
     * @type {boolean}
     * @memberof PrivatizeOptions
     */
    debugDangerously?: boolean,
}

export type IteratorValue<DATASET> = DATASET | undefined

export type SubsetIterator<DATASET> =
    Iterator<DATASET | undefined> |
    Iterator<Promise<DATASET | undefined>> |
    Promise<Iterator<DATASET | undefined>> |
    Promise<Iterator<Promise<DATASET | undefined>>>
/**
 * Returns an iterator that gives every possible subset of DATASET where
 * each subset (shadow dataset) has a unique Identity removed from the DATASET.
 * Removing each Identity must remove at least 1 unique element from the original DATASET
 * Performance tip: DO NOT actually clone the original dataset each time and remove an identity,
 * but ideally pass a thin wrapper that excludes the identity from the original reference.
 * See README.md's performance section for examples.
 */
export type NewShadowDatasetIterator<DATASET> =
    (originalDataset: DATASET) =>
        SubsetIterator<DATASET>

/**
 * The result returned from a sensitive function that's been protected with privatize()
 *
 * @export
 * @interface PrivatizedResult
 */
export interface PrivatizedResult {
    /**
     * The inner result of the private function but with noise added.
     * This is the ONLY information that's safe to give back to unstrusted consumers!
     *
     * @type {number}
     * @memberof PrivatizedFunctionResult
     */
    result: number,

    /**
     * Returns how much budget was used, guaranteed to be <= maxEpsilon.
     * Do not leak this information to untrusted consumers.
     *
     * @type {number}
     * @memberof PrivatizedFunctionResult
     */
    epsilonBudgetUsed: number,

    /**
     * Returns how much budget was used as a percentage (0-1) of maxEpsilon.
     * Do not leak this information to untrusted consumers.
     *
     * @type {number}
     * @memberof PrivatizedFunctionResult
     */
    percentBudgetUsed: number,

}

/**
 * Same as PrivatizedFunctionResult but adds dangerous fields that definately
 * should not be shared.
 *
 * @export
 * @interface DangerousPrivatizedFunctionResult
 */
export interface DangerousResult extends PrivatizedResult {
    /**
     * The private, true result of the sensitive function. This obviously
     * should not be shared and is not even set unless the debugDangerously 
     * option is true
     *
     * @type {number}
     * @memberof PrivatizedFunctionResult
     */
    privateResult: number,

    /**
     * The amount of noise added to the "privateResult" to obtain the 
     * public "result". Combined with the "result" figuring out "privateResult"
     * becomes trivial, so this should not be shared and is not even set unless
     * the debugDangerously option is true
     *
     * @type {number}
     * @memberof PrivatizedFunctionResult
     */
    noiseAdded: number,
}

export interface DangerousOptions {
    debugDangerously: true,
}

// Resolve the exact PrivatizedResult based on OPTIONS subtype
export type PrivatizedFunctionResult<OPTIONS extends PrivatizeOptions<any>> =
    OPTIONS extends DangerousOptions ?
    DangerousResult :
    PrivatizedResult

export type PrivatizedFunction<DATASET, PFR extends PrivatizedResult> =
    (datastore: DATASET) => Promise<PFR>

export type Privatizer<DATASET, OPTIONS extends PrivatizeOptions<DATASET>> = (
    sensitiveFunction: SensitiveFunction<DATASET>,
    options: OPTIONS,
) => PrivatizedFunction<
    DATASET,
    PrivatizedFunctionResult<OPTIONS>
>

export type SensitiveSyncFunction<D> = (dataset: D) => number
export type SensitiveAsyncFunction<D> = (dataset: D) => Promise<number>
export type SensitiveFunction<D> = SensitiveSyncFunction<D> | SensitiveAsyncFunction<D>
export type SensitiveOutput = number | Promise<number>

/**
 * The error returned when calling a privatized function too many times
 *
 * @export
 * @class PrivacyBudgetExceededError
 * @extends {Error}
 */
export class PrivacyBudgetExceededError extends Error { }
