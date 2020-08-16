import seedrandom from "seedrandom"
import { SequenceView, newArrayView, ArrayView } from "../src/datastructures";

// Seed random values for consistent tests
export const random = seedrandom("42")
export const arrayOfOnes: (elementCount: number) => ArrayView<number> =
    (elementCount) => {
        const els: number[] = []
        for (let i = 0; i < elementCount; i++) {
            els.push(1)
        }
        return newArrayView(els)
    }

export const random0to1Distribution: (elementCount: number) => ArrayView<number> = (elementCount: number) => {
    const els: number[] = []
    for (let i = 0; i < elementCount; i++) {
        els.push(random())
    }
    return newArrayView(els)
}

export const avgFunction: (elements: SequenceView<any, number>) => number = (elements) => {
    let [sum, count] = [0, 0]
    elements.forEach((e) => { sum += e; count++ })
    return sum / count
}

export const maxFunction: (elements: SequenceView<any, number>) => number = (elements) => {
    let max = 0
    elements.forEach((e) => { max = Math.max(max, e) })
    return max
}

export const sumFunction: (elements: SequenceView<any, number>) => number = (elements) => {
    let sum = 0
    elements.forEach((e) => { sum += e })
    return sum
}

export const multiplyFunction: (elements: SequenceView<any, number>) => number = (elements) => {
    let product = 0
    elements.forEach((e) => { product *= e })
    return product
}

export const newPromiseLasting: (ms: number) => Promise<void> =
    (ms) => {
        return new Promise((resolve, reject) => {
            setTimeout(resolve, ms)
        })
    }

export function wrapIteratorInAsyncDelay<T>(msDelay: number, iterator: Iterator<T>): Iterator<Promise<T>> {
    return {
        next: (val) => {
            const next = iterator.next(val)
            return {
                done: next.done,
                value: newPromiseLasting(msDelay)
                    .then(() => next.value)
            }
        }
    }
}