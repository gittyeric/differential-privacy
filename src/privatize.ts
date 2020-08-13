import { isFunction, isNumber } from 'util';
import { calculateSensitivity } from './sensitivity';
import { PrivacyBudgetExceededError, PrivateResult, PrivatizedFunction, PrivatizeOptions, Privatizer, PrivateFunctionResult, SensitiveFunction, NewDatasetSubsetIterator } from './types';
import Decimal from 'decimal.js';

export type ProbabilityDistribution =
    (sensitivity: Decimal, epsilon: Decimal, delta?: Decimal) => Decimal

export function privatizeFactory
<DATASET, OPTIONS extends PrivatizeOptions<DATASET>>
    (probDistFunc: ProbabilityDistribution): Privatizer<DATASET, OPTIONS> {

    return function(
        sensitiveFunction: SensitiveFunction<DATASET>,
        userOptions: OPTIONS): 
        PrivatizedFunction<DATASET, PrivateFunctionResult<OPTIONS>> {
        const validatedOptions = validateOptions(userOptions)
        const options = fillDefaultOptions(validatedOptions)

        const maxEpsilon = new Decimal(options.maxEpsilon)
        const epsilon = maxEpsilon.dividedBy(options.maxCallCount)
        const epsilonAsNumber = epsilon.toNumber()

        let epsilonSoFar = new Decimal(0)
        return async (dataset: DATASET) => {
            epsilonSoFar = epsilonSoFar.plus(epsilon)
            if (epsilonSoFar.greaterThan(maxEpsilon)) {
                throw new PrivacyBudgetExceededError(
                    `Exceeded max privacy budget`)
            }
            const sensitivity =
                await calculateSensitivity(sensitiveFunction,
                    options.newSubsetIterator, dataset, 
                    options.maxConcurrentFunctionCalls)

            // Call and unwrap sensitiveFunction
            const rawResult = sensitiveFunction(dataset)
            const sensitiveResult = new Decimal(
                (rawResult instanceof Promise) ? 
                    (await rawResult) : 
                    rawResult)

            // Add noise to result
            const noise = probDistFunc(sensitivity, epsilon)
            const noisyResult = sensitiveResult.plus(noise)

            const result: PrivateResult = {
                epsilonBudgetUsed: epsilonAsNumber,
                percentBudgetUsed: 1.0 / options.maxCallCount,
                result: noisyResult.toNumber(),
            }

            return (options.debugDangerously === true ? {
                epsilonBudgetUsed: result.epsilonBudgetUsed,
                percentBudgetUsed: result.percentBudgetUsed,
                noiseAdded: noise.toNumber(),
                privateResult: sensitiveResult.toNumber(),
                result: result.result,
            } : result) as PrivateFunctionResult<OPTIONS>
        }
    }
}

type FilledOptions
    <D, 
    USEROPTS extends PrivatizeOptions<D>, 
    TYPED extends TypedOptions<D, USEROPTS>> = 
    {
        [K in keyof Required<TYPED>]: (K extends "debugDangerously" ? 
            (true | undefined) : 
            NonNullable<TYPED[K]>
    )}

function fillDefaultOptions<D, USEROPTS extends PrivatizeOptions<D>>(options: USEROPTS): FilledOptions<D, USEROPTS, TypedOptions<D, USEROPTS>> {
    const filled = {
        maxEpsilon: options.maxEpsilon,
        newSubsetIterator: options.newSubsetIterator,
        maxCallCount: isNumber(options.maxCallCount) ? options.maxCallCount : 1,
        maxConcurrentFunctionCalls: 
            isNumber(options.maxConcurrentFunctionCalls) ? 
                options.maxConcurrentFunctionCalls : 4,
        debugDangerously: options.debugDangerously === true,
    } as FilledOptions<D, USEROPTS, TypedOptions<D, USEROPTS>>
    if (options.debugDangerously === true) {
        filled.debugDangerously = true as (true | undefined)
    }
    return filled
}

type TypedOptions<D, USEROPTS extends PrivatizeOptions<D>> = 
    {
        [K in keyof USEROPTS]: K extends "debugDangerously" ? 
            (USEROPTS[K] extends true ? true : undefined) : 
            USEROPTS[K]
    }

function validateOptions<D, USEROPTS extends PrivatizeOptions<D>>(
    options: Partial<USEROPTS>): TypedOptions<D, USEROPTS> {
    if (!isNumber(options.maxEpsilon) || options.maxEpsilon <= 0) {
        throw new Error("maxEpsilon must be a number > 0")
    }
    if (!isFunction(options.newSubsetIterator)) {
        throw new Error("Must provide a newSubsetIterator function, please see docs")
    }
    if (options.maxCallCount !== undefined) {
        if (!isNumber(options.maxCallCount) || options.maxCallCount < 1) {
            throw new Error("Please get a valid integer >= 1 for maxCallCount")
        }
    }
    if (options.maxConcurrentFunctionCalls !== undefined) {
        if (!isNumber(options.maxConcurrentFunctionCalls) || options.maxConcurrentFunctionCalls < 1) {
            throw new Error("Please give a valid integer >= 1 for maxConcurrentFunctionCalls")
        }
    }

    const parsed = {
        maxEpsilon: options.maxEpsilon as number,
        newSubsetIterator: options.newSubsetIterator as NewDatasetSubsetIterator<D>,
        maxCallCount: options.maxCallCount,
        maxConcurrentFunctionCalls: options.maxConcurrentFunctionCalls,
        debugDangerously: (options.debugDangerously === true ? true : undefined),
    } as TypedOptions<D, USEROPTS>

    return parsed
}