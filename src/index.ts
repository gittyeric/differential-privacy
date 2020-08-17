import { Decimal } from 'decimal.js';
import { laplaceProbDistribution } from './laplace';
import { privatizeFactory } from './privatize';
import { PrivatizedFunctionResult, PrivatizedFunction, PrivatizeOptions, SensitiveFunction } from './types';
import crypto from "crypto"

// Need to set precision high enough to avoid IEEE floating point
// attacks, and use secure random numbers.
// If you also use the Decimal library, you might have colliding
// settings here, sorry!  Not much that can be done about it given
// a mutative setter!
(global as any).crypto = crypto
Decimal.set({ precision: 25, rounding: 4, crypto: true })

export const privatize:
    <DATASET, OPTIONS extends PrivatizeOptions<DATASET>>(fnc: SensitiveFunction<DATASET>, options: OPTIONS)
        => PrivatizedFunction<DATASET, PrivatizedFunctionResult<OPTIONS>> =
    privatizeFactory(laplaceProbDistribution)

export * from "./datastructures";
export * from "./types";