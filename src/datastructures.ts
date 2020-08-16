// Base def for all View types.
// A "View" is a read-only view into a
// datastructure that can emulate creating
// copies with elements removed, and enables
// efficient subset iterators to avoid 
// datastructure cloning while providing
// a convenient API for consumption
// by SensitiveFunction<SequenceView>'s
export interface SequenceView<KEY, VAL> {
    /**
     * Same as Array.forEach. This is the most efficient way
     * to traverse the inner datastructure as no new memory
     * is allocated.
     *
     * @memberof SequenceView
     */
    forEach: (callback: (el: VAL, index: KEY) => void) => void,

    /**
     * Gets value by index from the underlying datastructure.
     *
     * @memberof SequenceView
     */
    get: (index: KEY) => VAL,

    /**
     * Same as Array.map but adds the key as second argument. WARNING: this
     * function returns an actual (potentially huge) array, consider using
     * foreach instead for performance reasons if possible.
     *
     * @memberof SequenceView
     */
    map: <NEW_T>(callback: (el: VAL, index: KEY) => NEW_T) => NEW_T[],

    /**
     * Creates an iterator that returns every subset of the SequenceView that
     * has 1 unique element removed.  Iterators from this method are guaranteed
     * to make only 1 copy of the inner datastructure as a snapshot of state when
     * the iterator was created. Other than the initial clone, no additional
     * memory will be consumed per iteration.
     *
     * @memberof SequenceView
     */
    newShadowIterator: () => Iterator<SequenceView<KEY, VAL> | undefined>,
}

export interface ArrayView<EL> extends SequenceView<number, EL> { }
export interface KeyValueView<EL> extends SequenceView<string, EL> { }

/**
 * A thin, efficient wrapper for a flat array that increases privatized 
 * function performance substantially over plain arrays
 *
 * @export
 * @template EL
 * @param {EL[]} srcArray
 * @returns {ArrayView<EL>}
 */
export function newArrayView<EL>(srcArray: EL[]): ArrayView<EL> {
    const lazyArray: ArrayView<EL> = {
        forEach: (callback) => {
            srcArray.forEach((val, index) => {
                callback(val, index)
            })
        },
        get: (index: number) => {
            return srcArray[index]
        },
        map: (callback) => {
            return srcArray
                .map((el, index) => callback(el, index))
        },
        newShadowIterator: () => newArrayViewSubsetIterator(lazyArray),
    }
    return lazyArray
}

/**
 * A thin, efficient wrapper for associative arrays that increases privatized 
 * function performance substantially over plain associative arrays
 *
 * @export
 * @template VAL
 * @param {{ [key: string]: VAL }} srcKeyVals
 * @returns {KeyValueView<VAL>}
 */
export function newKeyValueView<VAL>(srcKeyVals: { [key: string]: VAL }): KeyValueView<VAL> {
    const lazyKeyValues: KeyValueView<VAL> = {
        forEach: (callback) => {
            for (const key in srcKeyVals) {
                    callback(srcKeyVals[key], key)
            }
        },
        get: (index: string) => {
            return srcKeyVals[index]
        },
        map: <NEW_T>(callback: (value: VAL, key: string) => NEW_T) => {
            const mapped: NEW_T[] = []
            for (const key in srcKeyVals) {
                    mapped.push(callback(srcKeyVals[key], key))
            }
            return mapped
        },
        newShadowIterator: () => newKeyValueViewSubsetIterator(lazyKeyValues),
    }
    return lazyKeyValues
}

// Same as ArrayView but can ignore 1 element
function newIgnoreIndexArrayView<EL>(srcArray: ArrayView<EL>, ignoreIndex: number): ArrayView<EL> {
    const lazyArray: ArrayView<EL> = {
        forEach: (callback) => {
            srcArray.forEach((val, index) => {
                if (index !== ignoreIndex) {
                    callback(val, index - (index >= ignoreIndex ? 1 : 0))
                }
            })
        },
        get: (index: number) => {
            const trueIndex = index < ignoreIndex ? index : (index + 1)
            return srcArray.get(trueIndex)
        },
        map: <NEW_T>(callback: (el: EL, index: number) => NEW_T) => {
            const mapped: NEW_T[] = []
            srcArray.forEach((el, index) => {
                if (index !== ignoreIndex) {
                    mapped.push(callback(el, index - (index >= ignoreIndex ? 1 : 0)))
                }
            })
            return mapped
        },
        newShadowIterator: () => newArrayViewSubsetIterator(lazyArray),
    }
    return lazyArray
}

// Same as KeyValuesView but can ignore 1 key/value
function newIgnoreKeyKeyValueView<VAL>(srcKV: KeyValueView<VAL>, ignoreKey: string): KeyValueView<VAL> {
    const lazyKeyValues: KeyValueView<VAL> = {
        forEach: (callback) => {
            srcKV.forEach((value, key) => {
                if (key !== ignoreKey) {
                    callback(value, key)
                }
            })
        },
        get: (index: string) => srcKV.get(index),
        map: <NEW_T>(callback: (value: VAL, key: string) => NEW_T) => {
            const mapped: NEW_T[] = []
            srcKV.forEach((value, key) => {
                if (key !== ignoreKey) {
                    mapped.push(callback(value, key))
                }
            })
            return mapped
        },
        newShadowIterator: () => newKeyValueViewSubsetIterator(lazyKeyValues),
    }
    return lazyKeyValues
}

/**
 * 
 * Efficiently returns every subset of views where 1 unique index is removed per view/iteration
 *
 * @export
 * @template VAL
 * @param {ArrayView<VAL>} dataset
 * @returns {Iterator<ArrayView<VAL> | undefined>}
 */
function newArrayViewSubsetIterator<VAL>(dataset: ArrayView<VAL>): Iterator<ArrayView<VAL> | undefined> {
    let index = -1
    const dataCopy = dataset.map((el) => el)
    const datasetCopy = newArrayView(dataCopy)
    return {
        next: () => {
            index++
            const isDone = index >= (dataCopy.length - 1)
            const dynamicArr = index >= dataCopy.length ? undefined : newIgnoreIndexArrayView(datasetCopy, index)
            return {
                done: isDone,
                value: dynamicArr,
            }
        },
    }
}

/**
 * 
 * Efficiently returns every subset of views where 1 unique key is removed per view/iteration
 *
 * @export
 * @template VAL
 * @param {KeyValueView<VAL>} dataset
 * @returns {Iterator<KeyValueView<VAL> | undefined>}
 */
function newKeyValueViewSubsetIterator<VAL>(dataset: KeyValueView<VAL>): Iterator<KeyValueView<VAL> | undefined> {
    const dataCopy: { [key: string]: VAL } = {}
    dataset.forEach((val, key) => dataCopy[key] = val)
    const keys = Object.keys(dataCopy)
    const datasetCopy = newKeyValueView(dataCopy)

    let index = -1
    return {
        next: () => {
            index++
            const isDone = index >= (keys.length - 1)
            const dynamicArr = index >= keys.length ? undefined : newIgnoreKeyKeyValueView(datasetCopy, keys[index])
            return {
                done: isDone,
                value: dynamicArr,
            }
        },
    }
}
