import { laplaceProbDistribution } from "../src/laplace";
import Decimal from "decimal.js";

// Get the rough maximum value of Laplace for the given sensitivity/epsilon.
// Run Laplace sampleCount times
const sampleAbsMax: (sampleCount: number, sensitivity: Decimal, epsilon: Decimal) => Decimal =
(sampleCount, sensitivity, epsilon) => {
    let max = new Decimal(0)
    for (let i = 0; i < sampleCount; i++) {
        max = Decimal.max(max.abs(), laplaceProbDistribution(sensitivity, epsilon).abs())
    }
    return max
}

describe("Laplace Probability Distribution", () => {
    it("should add more noise as sensitivity increases", () => {
        const epsilon = new Decimal(0.5)
        let lastMax = new Decimal(0)
        for (let i = 0; i < 15; i++) {
            const newMax = sampleAbsMax(8000, Decimal.pow(2, i).times(i+1), epsilon)
            expect(lastMax.abs().toNumber()).toBeLessThan(newMax.abs().toNumber())
            lastMax = newMax
        }
    })
    it("should approach zero noise as epsilon increases", () => {
        const sensitivity = new Decimal(1)
        let lastMax = new Decimal(Number.MAX_VALUE)
        for (let i = 0; i < 15; i++) {
            const newMax = sampleAbsMax(8000, sensitivity, Decimal.pow(2, i).times(i+1))
            expect(lastMax.abs().toNumber()).toBeGreaterThan(newMax.abs().toNumber())
            lastMax = newMax
        }
    })
})