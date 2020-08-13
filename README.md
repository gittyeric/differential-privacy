# WIP! DO NOT USE!  Wait a week or so :-)

# Differential Privacy

This library implements Global Differential Privacy that allows you to protect the privacy of any users (or entities) in some data set while still running any aggregations over their private data.  Differential attacks are ways to steal data from APIs and derive information about individual users through only aggregate information.  Differential privacy helps to prevent this while also enabling TRUE anonymization for sensitive user data.

## Features

- Works for any JS or TS function that operates on a countable datastructure and returns a number!
- Includes batteries, specify how much information you want to give away in terms of the probability of learning a row value for some specific user in the data set
- Split up a finite privacy budget for a 3rd party into an arbitrary number of max lifetime queries automatically

## Usage

`privatize(aggFunction: (dataset: any) => number | Promise<number>, options: PrivatizeOptions)`

sensitiveFunction: Any function that operates on some dataset and returns either a resulting number or a Promise containing a number.

options: 

```
{
    maxCertaintyOfMemberValue: number. (Required) A number between 0 and 1 that indicates the probability of a differential query attack could reveal the value of some member of the dataset.  A probability of 1 means the attacker will get perfect accurracy every query and unlimited query attempts.  Probability near zero would give highly randomized results to the attacker even with only few query attempts.


    newSubsetIterator: (datastore: DATASET) => Iterator<DATASET> | Iterator<Promise<DATASET>>. (Required) A function that takes an unaltered DATASET and returns an Iterator<DATASET> that iterates over every possible subset of DATASET such that each subset has all elements related to a unique identity removed.  For example, an Array might splice out a different index upon every iteration if each index represents a user.  See the "Generic SubsetIterators" section for implementations on common datastructures.


    datasetIsImmutable?: boolean. (Optional) If the instance of DATASET will never change and your sensitiveFunction does not produce side-effects (mutation), set this to true to get huge performance benefits.  When true, the running time of the privatized function versus the raw sensitiveFunction is nearly identical after the first privatized function invokation.  Defaults to false.


    maxConcurrentFunctionCalls?: number (Optional) The maximum number of sensitiveFunction calls that will be executed simultaneously.  Defaults to 4 to avoid accidently beating up databases or similar downstream resources.  If there is no potential to bottleneck downstream resources, it's safe to set this to Number.MAX_NUMBER for max performance.


}
```

## Example Usage

See /examples for built-in primitive wrappers for primitives and custom DATASET implementations like SQL.

### Wrap your naked database! Protect the age of all your users while getting the average age

Without modification to your current raw database, this library could layer on top, just before actually running the query, and rigorously fuzz the resulting average age just enough to not reveal the actual ages of anyone in the actual dataset beyond some low certainty threshold:

## Performance Tips

- Set maxConcurrentFunctionCalls in options to a high number if upstream bottlenecks are not an issue for your use-case.
- Ensure your newSubsetIterator implementation does not literally create new copies of the original DATASET on each iteration.  Instead, since you have a lot of freedom in the type of DATASET, you can define it as a function and wrap middleware inbetween to artifically create a cloned DATASET without the cost of a new copy.  See /examples for efficient examples that iterate over subsets without making copies.

## Accuracy Tips

It's highly recommended to go for a straightforward implementation, then review the number of privatized function calls you can perform before receiving a PrivacyBudgetExceededError.

## Feature Wish List

Hey! Come contribute with a Pull Request!  Here's some ideas:

- Better tooling for finding good maxEpsilons per use-case
- Support for Local Differential Privacy
- More accurate measurement of epsilon used per query + dynamic maxCalls count
- Support for more distribution functions other than Laplace
- Some form of sampling to avoid O(|DATASET|) extra time complexity per call at the cost of epsilon accuracy