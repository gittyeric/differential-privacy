import { SensitiveFunction, NewDatasetSubsetIterator } from './types';
import Decimal from 'decimal.js';

/**
 * Calculate sensitivity as quickly as possible but do not run func
 * beyond maxConcurrencyCount at any 1 time.
 *
 * @export
 * @template DATASET
 * @param {SensitiveFunction<DATASET>} func
 * @param {NewDatasetSubsetIterator<DATASET>} newSubsetIter
 * @param {DATASET} dataset
 * @param {number} maxConcurrencyCount
 * @returns {Promise<Decimal>}
 */
export async function calculateSensitivity<DATASET>
    (
        func: SensitiveFunction<DATASET>,
        newSubsetIter: NewDatasetSubsetIterator<DATASET>,
        dataset: DATASET,
        maxConcurrencyCount: number,
): Promise<Decimal> {

    const concurrency = Math.max(1, Math.min(maxConcurrencyCount, 9999))
    const pendingDatasetIter = newSubsetIter(dataset)
    const datasetIter = pendingDatasetIter instanceof Promise ?
        (await pendingDatasetIter) :
        pendingDatasetIter
    let minOutput = new Decimal(Number.POSITIVE_INFINITY)
    let maxOutput = new Decimal(Number.NEGATIVE_INFINITY)
    const pendingCalculations: Promise<any>[] = []
    for (let curIter = datasetIter.next();
        true;
        curIter = datasetIter.next()) {

        const curValue = curIter.value
        const minMaxCalculation = runOnModifiedDataset(func, curValue)
            .then((modResult) => {
                const removeIndex = pendingCalculations
                    .findIndex((pc) => pc === minMaxCalculation)
                pendingCalculations.splice(removeIndex, 1)
                if (modResult !== undefined) {
                    minOutput = Decimal.min(minOutput, modResult)
                    maxOutput = Decimal.max(maxOutput, modResult)
                }
            })
        pendingCalculations.push(minMaxCalculation)

        // Wait on the oldest calculation if right at maxConcurrencyCount
        if (pendingCalculations.length >= concurrency) {
            await pendingCalculations[0]
        }
        if (curIter.done) {
            break;
        }
    }

    // Ensure all async calculations are done
    await Promise.all(pendingCalculations)
    return maxOutput.minus(minOutput)
}

async function runOnModifiedDataset<D>(func: SensitiveFunction<D>, next: D | Promise<D> | undefined): Promise<Decimal | undefined> {
    const innerResult = (next instanceof Promise) ? (await next) : next
    if (next === undefined || innerResult === undefined) {
        return undefined
    }
    const funcRun = func(innerResult)
    const funcVal = (funcRun instanceof Promise) ? (await funcRun) : funcRun
    return new Decimal(funcVal)
}
