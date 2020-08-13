import { newArrayView, privatize, newKeyValueView, SequenceView } from "../src";

async function simpleArrayExample(): Promise<number> {
    // Each element in the array is an "Identity"
    // whose individual value will be protected
    const srcArrToHide = [1, 2, 3, 4, 5]

    // This lib provides the newArrayView() function
    // which efficiently wraps JS Arrays
    const toHideAsView = newArrayView(srcArrToHide)

    // Let's define a sensitive function that we
    // want to add just enough noise to in order
    // to guarantee epsilon-differential privacy
    const sensitiveFunction = avgFunction
    const privateAvg = privatize(sensitiveFunction, {
        maxEpsilon: 1,
        /*
        * Spread out maxEpsilon information over this many 
        * valid private function invokations. After 10
        * private function calls, a PrivacyBudgetExceededError
        * will be thrown, preventing excess data leakage.
        */
        maxCallCount: 10, 
        newSubsetIterator: toHideAsView.newSubsetIterator,
    })

    const privateResult = await privateAvg(toHideAsView)

    // Result will be centered around 3.0 with lots of noise added
    return privateResult.result
}

async function simpleAssociativeArrayExample(): Promise<number> {
    // Each key in the associative array is an "Identity"
    // whose individual value will be protected
    const srcArrToHide = {"1": 1, "2": 2, "3": 3, "4": 4, "5": 5}

    // This lib provides the newKeyValueView() function
    // which efficiently wraps JS Associative Arrays
    const toHideAsView = newKeyValueView(srcArrToHide)

    // Let's define a sensitive function that we
    // want to add just enough noise to in order
    // to guarantee epsilon-differential privacy
    const sensitiveFunction = avgFunction
    const privateAvg = privatize(sensitiveFunction, {
        maxEpsilon: 1,
        /*
        * Spread out maxEpsilon information over this many 
        * valid private function invokations. After 10
        * private function calls, a PrivacyBudgetExceededError
        * will be thrown, preventing excess data leakage.
        */
        maxCallCount: 10, 
        newSubsetIterator: toHideAsView.newSubsetIterator,
    })

    const privateResult = await privateAvg(toHideAsView)

    // Result will be centered around 3.0 with lots of noise added
    return privateResult.result
}

const avgFunction: (elements: SequenceView<any, number>) => number = (elements) => {
    let sum = 0
    let count = 0
    elements.forEach((e) => { sum += e; count++ })
    return sum / count
}

(async () => {
    console.log("simpleArrayExample:" + await simpleArrayExample())
    console.log("simpleKeyValuesExample:" + await simpleAssociativeArrayExample())
})()
