import { calculateSensitivity } from "../src/sensitivity"
import { sumFunction, random0to1Distribution, arrayOfOnes, avgFunction, newPromiseLasting, wrapIteratorInAsyncDelay } from "./util"
import Decimal from "decimal.js";
import { newArrayView, ArrayView } from "../src/datastructures";

describe("Sensitivity", () => {
    it("should handle empty datasets", async () => {
        const dataset0 = random0to1Distribution(0)
        const sensitivity = await calculateSensitivity(sumFunction, dataset0.newShadowIterator, dataset0, 1)
        expect(sensitivity.abs().toNumber()).toEqual(Number.POSITIVE_INFINITY)
    })
    it("should be 0 for sum function over always 1-valued fields", async () => {
        const dataset100 = arrayOfOnes(100)
        const sensitivity = await calculateSensitivity(sumFunction, dataset100.newShadowIterator, dataset100, 1)
        expect(sensitivity.toNumber()).toEqual(0)
    })
    it("should be 1 for sum function over always 0 (except 1) valued fields", async () => {
        const dataset1s = arrayOfOnes(100)
        const swapArr = dataset1s.map((e) => e)
        swapArr[0] = 0
        const dataset1sWithZero = newArrayView(swapArr)
        const sensitivity = await calculateSensitivity(sumFunction, dataset1sWithZero.newShadowIterator, dataset1sWithZero, 1)
        expect(sensitivity.toNumber()).toEqual(1)
    })
    it("should work for async sensitive functions", async () => {
        const dataset1s = arrayOfOnes(100)
        const swapArr = dataset1s.map((e) => e)
        swapArr[0] = 0
        const dataset1sWithZero = newArrayView(swapArr)
        const asyncSum = (nums: ArrayView<number>) =>
            newPromiseLasting(1).then(() => sumFunction(nums))
        const sensitivity = await calculateSensitivity(asyncSum, dataset1sWithZero.newShadowIterator, dataset1sWithZero, 1)
        expect(sensitivity.toNumber()).toEqual(1)
    })
    it("should strictly decrease as uniform dataset size increases", async () => {
        let lastSensitivity = new Decimal(Number.MAX_VALUE)
        const src = [99] // Converges to [99, 1, 1, 1 ...]
        for (let i = 0; i < 10; i++) {
            src.push(1)
            const dataset = newArrayView(src)
            const sensitivity = await calculateSensitivity(avgFunction, dataset.newShadowIterator, dataset, 1)
            expect(sensitivity.toNumber()).toBeLessThan(lastSensitivity.toNumber())
            lastSensitivity = sensitivity
        }
    })
    it("should run as many concurrent evaluations as possible", async () => {
        const count = 4
        const singleIterDelayMs = 5
        const dataset = arrayOfOnes(count)
        const iter = dataset.newShadowIterator()
        const asyncIter = wrapIteratorInAsyncDelay(singleIterDelayMs, iter)

        const startMs = (new Date()).getTime()
        await calculateSensitivity(sumFunction, () => asyncIter, dataset, count)
        const stopMs = (new Date()).getTime()

        expect(stopMs - startMs).toBeLessThan(singleIterDelayMs * 2)
    })
    it("should handle top-level async case of NetSubsetIterator", async () => {
        const dataset = arrayOfOnes(4)
        const iter = dataset.newShadowIterator()
        const asyncIter = async () => 
            newPromiseLasting(1).then(() => iter)

        const result = await calculateSensitivity(avgFunction, asyncIter, dataset, 4)
        expect(result.toNumber()).toEqual(0)
    })
    it("should respect maxConcurrency", async () => {
        const count = 4
        const singleIterDelayMs = 5
        const dataset = arrayOfOnes(count)
        const iter = dataset.newShadowIterator()
        const asyncIter = wrapIteratorInAsyncDelay(singleIterDelayMs, iter)

        const startMs = (new Date()).getTime()
        await calculateSensitivity(sumFunction, () => asyncIter, dataset, 1)
        const stopMs = (new Date()).getTime()

        expect(stopMs - startMs).toBeGreaterThanOrEqual(singleIterDelayMs * count)
    })
})