import { Decimal } from 'decimal.js';

const ONE = new Decimal(1)
const TWO = new Decimal(2)

export function laplaceProbDistribution(sensitivity: Decimal, epsilon: Decimal): Decimal {
    const scale = sensitivity.dividedBy(epsilon)
    const symmetricRandom = Decimal.random().minus(0.5)
    const sign = symmetricRandom.greaterThan(0) ? 1 : -1
    return scale.times(sign)
        .times(
            Decimal.log(
                ONE.minus(TWO.times(Decimal.abs(symmetricRandom))),
            ),
        )
}