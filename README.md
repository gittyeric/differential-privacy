# Differential Privacy

[![Coverage Status](https://coveralls.io/repos/github/gittyeric/differential-privacy/badge.svg?branch=master)](https://coveralls.io/github/gittyeric/differential-privacy?branch=master)
[![npm version](https://badge.fury.io/js/differential-privacy.svg)](https://badge.fury.io/js/differential-privacy)
![Build Passing](https://github.com/gittyeric/differential-privacy/actions/workflows/job.yaml/badge.svg)


This NPM library implements the secure [Laplace mechanism](https://programming-dp.com/notebooks/ch3.html#the-laplace-mechanism) for Global Differential Privacy that allows you to protect the privacy of any users (or entities) in some data set while still allowing untrusted aggregations over their private data.  Differential attacks are ways to steal data from APIs and derive information about individual users through only aggregate information.  Differential privacy helps to prevent this while also providing an anonymization scheme with mathematical guarantees.

# Features

- Works for any JS or TS function that operates on a countable datastructure and returns a number!
- Built-in Dataset implementations for arrays and associative arrays
- Plugs for custom Datasets
- 100% Code Coverage in Tests!

# Definitions

**Identity**: A unique identity of someone/something whose values need to be private.

**DATASET**: Any set of data containing more than 1 Identity whose individual values need to be private.  The DATASET can be any structure which can be efficiently iterated over using the newShadowIterator function.

**Shadow DATASET**: A copy of a DATASET with some 1 unique Identity removed.

**Shadow Iterator**: An iterator on a DATASET that returns every possible "Shadow DATASET", each having a unique Identity removed.

**SensitiveFunction**: Any sensitive function whose numeric return value needs to be protected with noise so individual element values in DATASET cannot be fully determined.

**PrivatizedFunction**: A privatized sensitive function whose return value has sufficient noise added to become "epsilon differentially private".

**Epsilon**: A measure of how much information about an Identity you're willing to leak to query consumers.  This definition comes straight out of the definition of ["Epsilon-Differential Privacy"]("https://en.wikipedia.org/wiki/Differential_privacy#Definition_of_%CE%B5-differential_privacy").

# API

`privatize(sensitiveFunction: (dataset: any) => number | Promise<number>, options: PrivatizeOptions)`

**sensitiveFunction**: Any function that operates on some dataset and returns either a resulting number or a Promise for a number.

**options**: 

```
{
    maxEpsilon: number. (Required) A number > 0 that indicates the maximum amount of data you're willing to leak (according to the difinition of Epsilon-Differential Privacy).  The actual epsilon
    used per privatizedFunction run is maxEpsilon/maxCallCount.

    newShadowIterator: (datastore: DATASET) => Iterator<DATASET> | Iterator<Promise<DATASET>>. (Required) A function that takes an unaltered DATASET and returns an Iterator<DATASET> that iterates over every possible subset of DATASET such that each subset has all elements related to a unique identity removed.  For example, an Array might splice out a different index upon every iteration if each index represents a user.  See the "Generic SubsetIterators" section for implementations on common datastructures.

    maxCallCount?: number. (Optional) The maximum number of calls a privaitzedFunction instance can make before throwing a PrivacyBudgetExceededError.

    maxConcurrentCalls?: number (Optional) The maximum number of sensitiveFunction calls that will be executed simultaneously.  Defaults to 4 to avoid accidently exhausting databases or similar downstream resources.  If there is no potential to bottleneck downstream resources, it's safe to set this to Number.MAX_NUMBER for the best performance.

    debugDangerously?: boolean (Optional) If enabled, adds the "privateResult" and "noiseAdded" fields to the PrivatizedFunction result.  These fields should ONLY be used to find a good maxEpsilon for your consumers.

}
```
**Returns**: _(dataset) => PrivatizedResult_. A PrivatizedFunction that when called with a DATASET returns a PrivatizedResult:

```
{
    result: number. The private result of the sensitive function with sufficient noise added to be safe for sharing.

    epsilonBudgetUsed: number. The epsilon used for this individual function call.

    percentBudgetUsed: number. Same as epsilonBudgetUsed but expressed as a percentage from 0 to 1.

    privateResult?: number. The private, true result of the sensitiveFunction. This obviously should not be shared and does not exist unless debugDangerously is true in PrivatizeOptions.

    noiseAdded?: number. The amount of noise added to the "privateResult" to obtain the public "result". When combined with the "result", figuring out "privateResult" becomes trivial, so this should not be shared and is not even set unless the debugDangerously option is true.
}
```

**throws** PrivacyBudgetExceededError if maxEpsilon privacy budget is used up or maxCallCount is exceeded per PrivatizedFunction instance.

# Example Usage

## Make individual array values private for an Averaging function

```

const differentialPrivacy = require("differential-privacy");
const { newArrayView, privatize } = differentialPrivacy;

// DATASET definitions
const array1To5 = [1, 2, 3, 4, 5];
// Wrap array in efficient ArrayView to get a fast shadow iterator
const dataset1To5 = newArrayView(array1To5);

// Sensitive Function definition
const avgFunction = (view) => {
    let [sum, count] = [0, 0];
    view.forEach((el) => { sum += el; count++; });
    return sum / count;
}

const protectedAvg = privatize(avgFunction, {
    maxEpsilon: 1,
    newShadowIterator: dataset1To5.newShadowIterator,
});
const privatizedResult = await protectedAvg(dataset1To5);

// Avgerage is 3 but with noise added to hide individual values.
// Since DATASET.length is small and maxEpsilon is low, the noisy
// result will likely be far from 3.0 but still centered around it.
console.log(privatizedResult.result);
```

See the built-in `newArrayView` and `newKeyValueView` functions for efficient native array and associative array DATASET implementations.

## SQL: Get average age while protecting individual birthdays

See [examples/custom-mysql.ts](examples/custom-mysql.ts)

# NPM Installation

```
npm install differential-privacy
```

You can now import everything you need for the example above:
```
import {
    privatize, newArrayView, newKeyValueView
} from 'differential-privacy';
```

# Performance Considerations

If the Big-O runtime of your sensitiveFunction is O(X) and you have a constant time Shadow Iterator for your DATASET, you can expect the privatizedFunction to run in O(|DATASET| * X).

## Performance Tips

- Set maxConcurrentCalls in options to a high number if downstream bottlenecks are not an issue for your use-case.
- Ensure your newShadowIterator implementation does not literally create new copies of the original DATASET on each iteration.  Instead, since you have a lot of freedom in the type of DATASET, you can define it as a function and wrap middleware inbetween to artifically create a cloned DATASET without the cost of a new copy.  See /examples for efficient examples that iterate over subsets without making copies.

## Balancing Privacy vs. Accuracy

Finding a good maxEpsilon is currently not the easiest task.  You can turn on the debugDangerously flag in options to help determine a good tradeoff between a high epsilon for user privacy vs a low epsilon for lots of accurate queries.  Better tooling for finding good maxEpsilons is planned in the future.

# Security / decimal.js Note

This lib implements all real number operations using fixed-precision values from decimal.js.  This prevents known IEEE floating point attacks on the Laplace Mechanism.  If you're using decimal.js, beware that this library needs to mutate some decimal.js settings globally!  See src/index.ts for more.

# Feature Wish List

Hey! Come contribute with a Pull Request!  Here's some ideas:

- Better tooling for finding good maxEpsilons per use-case
- Support for Local Differential Privacy
- More accurate measurement of epsilon used per query + dynamic maxCallCount count
- Add support for sensitiveFunctions that return number[] (or maybe just a `combine(privatized1, privatized2)` util?).
- Support for more distribution functions other than Laplace
- Some form of sampling to avoid O(|DATASET|) extra time complexity per call at the cost of epsilon accuracy

# Installation for Development and Modification

Make sure you have Git and Node.js version >= 10 installed with npm as well.
Run the following command line:

```
git clone https://github.com/gittyeric/differential-privacy.git
npm install
npm run build
```

If you'd like to contribute, commit your work on a new branch and run the following:

```
npm run deploy-dry
```

If lint and tests pass, send a Pull Request in GitHub!