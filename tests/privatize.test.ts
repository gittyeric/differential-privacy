import { PrivatizeOptions } from "../src/types"
import { privatize, ArrayView, newArrayView, newKeyValueView } from "../src/index"
import { avgFunction, newPromiseLasting, random0to1Distribution, wrapIteratorInAsyncDelay } from "./util"

describe("privatize", () => {
    const array1To5 = [1, 2, 3, 4, 5]
    const dataset1To5 = newArrayView(array1To5)

    const idMap1To5 = {"1": 1, "2": 2, "3": 3, "4": 4, "5": 5}
    const datasetIdMap1To5 = newKeyValueView(idMap1To5)

    it("should work with minimimal options", async () => {
        const options = {
            maxEpsilon: Number.MAX_SAFE_INTEGER, // allow ~Infinite data leakage
            newShadowIterator: dataset1To5.newShadowIterator,
        }
        const privateFunc = privatize(avgFunction, options)
        // Avg should be 3
        const result = await privateFunc(dataset1To5)

        expect(result.epsilonBudgetUsed).toEqual(options.maxEpsilon)
        expect(result.percentBudgetUsed).toEqual(1)

        // The true resulting average is 3.0
        expect(result.result).toBeGreaterThan(2.9999999999)
        expect(result.result).toBeLessThan(3.00000000001)

        // Should fail on 2nd call since maxCallCount defaults to 1
        expect(privateFunc(dataset1To5)).rejects.toThrowError()
    })
    it("should work with all options", async () => {
        const options = {
            debugDangerously: true as true,
            maxEpsilon: Number.MAX_SAFE_INTEGER, // allow ~Infinite data leakage
            newShadowIterator: datasetIdMap1To5.newShadowIterator,
            maxCallCount: 2,
        }
        const privateFunc = privatize(avgFunction, options)
        // Avg should be 3
        const result = await privateFunc(datasetIdMap1To5)

        expect(result.epsilonBudgetUsed).toEqual(options.maxEpsilon/2)
        expect(result.percentBudgetUsed).toEqual(0.5)

        // The true resulting average is 3.0
        expect(result.result).toBeGreaterThan(2.9999999999)
        expect(result.result).toBeLessThan(3.00000000001)

        // Private fields should show up due to options
        expect(Math.abs(result.noiseAdded)).toBeLessThan(0.00000000001)
        expect(Math.abs(result.noiseAdded)).toBeGreaterThan(-0.00000000001)
        expect(result.privateResult).toEqual(3.0)

        // Should fail on 3nd call
        expect(privateFunc(dataset1To5)).resolves.toBeDefined()
        expect(privateFunc(dataset1To5)).rejects.toThrowError()
    })
    it("should add little noise for large datasets", async () => {
        const lotsaRandoms = random0to1Distribution(5000)
        const options = {
            maxEpsilon: 1,
            newShadowIterator: lotsaRandoms.newShadowIterator,
            debugDangerously: true as true,
        }
        const privateFunc = privatize(avgFunction, options)
        // Avg should be ~0.5
        const result = await privateFunc(lotsaRandoms)

        // Noised result should be roughly accurate as
        // DATASET cardinality approaches Infinity
        expect(result.result).toBeGreaterThan(0.49)
        expect(result.result).toBeLessThan(0.51)

        const maxExpectedNoise = 0.001
        expect(Math.abs(result.noiseAdded)).toBeLessThan(maxExpectedNoise)
        expect(Math.abs(result.noiseAdded)).toBeGreaterThan(-maxExpectedNoise)
    })
    it("should basically be random for low epsilon and high maxCallCount", async () => {
        const lotsaRandoms = random0to1Distribution(5)
        const options = {
            maxEpsilon: 0.0000001,
            maxCallCount: 99999999,
            newShadowIterator: lotsaRandoms.newShadowIterator,
            debugDangerously: true as true,
        }
        const privateFunc = privatize(avgFunction, options)
        // Avg should be nowhere near avgFunction's range
        const result = await privateFunc(lotsaRandoms)

        // Noised result should be roughly infinite as
        // epsilon approaches zero
        expect(Math.abs(result.result)).toBeGreaterThan(999)
        expect(Math.abs(result.noiseAdded)).toBeGreaterThan(999)
    })
    it("should work on asyncronous sensitive functions", async () => {
        const options = {
            maxEpsilon: Number.MAX_SAFE_INTEGER,
            newShadowIterator: dataset1To5.newShadowIterator,
        }
        const asyncAvg = (d: ArrayView<number>) => {
            return newPromiseLasting(1).then(() => avgFunction(d))
        }
        const privateFunc = privatize(asyncAvg, options)
        const result = await privateFunc(dataset1To5)
        expect(result.result).toBeGreaterThan(2.9999999999)
        expect(result.result).toBeLessThan(3.00000000001)
    })
    it("should work as fast as possible on asyncronous subset iterators", async () => {
        const singleIterDelayMs = 5
        const rawIter = dataset1To5.newShadowIterator()
        const asyncIter = wrapIteratorInAsyncDelay(singleIterDelayMs, rawIter)
        const options: PrivatizeOptions<ArrayView<number>> = {
            maxEpsilon: Number.MAX_SAFE_INTEGER,
            newShadowIterator: () => asyncIter,
            maxConcurrentCalls: 5,
        }
        
        const privateFunc = privatize(avgFunction, options)

        const startMs = (new Date()).getTime()
        const result = await privateFunc(dataset1To5)
        const stopMs = (new Date()).getTime()

        expect(stopMs - startMs).toBeLessThan(singleIterDelayMs * 3)
        expect(result.result).toBeGreaterThan(2.9999999999)
        expect(result.result).toBeLessThan(3.00000000001)
    })
    it("should work as slow as required on asyncronous subset iterators", async () => {
        const singleIterDelayMs = 5
        const rawIter = dataset1To5.newShadowIterator()
        const asyncIter = wrapIteratorInAsyncDelay(singleIterDelayMs, rawIter)
        const options: PrivatizeOptions<ArrayView<number>> = {
            maxEpsilon: Number.MAX_SAFE_INTEGER,
            newShadowIterator: () => asyncIter,
            maxConcurrentCalls: 1,
        }
        
        const privateFunc = privatize(avgFunction, options)

        const startMs = (new Date()).getTime()
        const result = await privateFunc(dataset1To5)
        const stopMs = (new Date()).getTime()

        expect(stopMs - startMs).toBeGreaterThanOrEqual(singleIterDelayMs * 5)
        expect(result.result).toBeGreaterThan(2.9999999999)
        expect(result.result).toBeLessThan(3.00000000001)
    })

    // Boring Options Validation

    it("should not accept options without required fields", () => {
        const missingEpsilon = {
            newShadowIterator: dataset1To5.newShadowIterator,
        }
        expect(() => 
            privatize(avgFunction, missingEpsilon as any))
            .toThrow()
        
        const missingIterator = {
            maxEpsilon: 1,
        }
        expect(() => 
            privatize(avgFunction, missingIterator as any))
            .toThrow()
    })
    it("should not accept optional fields with invalid values", () => {
        const required = {
            maxEpsilon: 1,
            newShadowIterator: dataset1To5.newShadowIterator,
        }
        
        const badmaxCallCount = {
            ...required,
            maxCallCount: "5",
        }
        expect(() => 
            privatize(avgFunction, badmaxCallCount as any))
            .toThrow()
        
        const badMaxConcurrentCalls = {
            ...required,
            maxConcurrentCalls: -1
        }
        expect(() =>
            privatize(avgFunction, badMaxConcurrentCalls as any))
            .toThrow()
    })
})