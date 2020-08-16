import { newArrayView, ArrayView, KeyValueView, newKeyValueView } from "../src";

describe("ArrayView", () => {
    const asArray = <T>(view: ArrayView<T>) => view.map((e) => e)

    const testAccessors = (src: number[], view: ArrayView<number>) => {
        // .forEach
        let unseenForeach = [...src]
        view.forEach((e) => {
            expect(unseenForeach).toContain(e)
            unseenForeach = unseenForeach.filter((u) => u !== e)
        })
        expect(unseenForeach).toEqual([])

        // .map
        expect(view.map((e) => e)).toEqual(src)

        // .get
        src.forEach((e, i) => expect(e).toEqual(view.get(i)))
        
        // .newShadowIterator
        view.newShadowIterator().next()
    }

    it("should handle empty arrays", () => {
        const emptyView = newArrayView([])
        const iter = emptyView.newShadowIterator()
        const next = iter.next()
        expect(next.done).toBe(true)
        expect(next.value).toBeUndefined()
    })
    it("Accessor methods should work", () => {
        const src = [1, 2]
        const view = newArrayView(src)
        testAccessors(src, view)
    })
    it("should properly iterate over subsets", () => {
        const src = [1, 2, 3]
        const view = newArrayView(src)
        const iter = view.newShadowIterator()

        const first = iter.next()
        expect(first.done).toBe(false)
        expect(asArray(first.value)).toEqual([2, 3])

        const mid = iter.next()
        expect(mid.done).toBe(false)
        expect(asArray(mid.value)).toEqual([1, 3])

        const last = iter.next()
        expect(last.done).toBe(true)
        expect(asArray(last.value)).toEqual([1, 2])

        const empty = iter.next()
        expect(empty.done).toBe(true)
        expect(empty.value).toBeUndefined()

        testAccessors([1, 3], mid.value)
    })
})

describe("KeyValueView", () => {
    const asKeyValues: <T>(view: KeyValueView<T>) => { [key: string]: T } =
        <T>(view: KeyValueView<T>) => {
            const keyValues: { [key: string]: T } = {}
            view.forEach((val, key) => {
                keyValues[key] = val
            })
            return keyValues
        }

    const testAccessors = (src: {[key: string]: number}, view: KeyValueView<number>) => {
        // .forEach
        let unseenForeach: {[k: string]: number} = { ...src }
        view.forEach((val, key) => {
            expect(unseenForeach[key]).toEqual(val)
            delete unseenForeach[key]
        })
        expect(Object.keys(unseenForeach)).toEqual([])

        // .map
        const values = view.map((el) => el)
        values.sort()
        const srcValues = Object.values(src)
        srcValues.sort()
        expect(values).toEqual(srcValues)

        // .get
        view.forEach((e, i) => expect(e).toEqual(view.get(i)))

        // .newShadowIterator
        view.newShadowIterator().next()
    }

    it("should handle empty associative arrays", () => {
        const emptyView = newKeyValueView({})
        const iter = emptyView.newShadowIterator()
        const next = iter.next()
        expect(next.done).toBe(true)
        expect(next.value).toBeUndefined()
    })
    it("Accessor methods should work", () => {
        const src = { "1": 1, "2": 2 }
        const view = newKeyValueView(src)
        testAccessors(src, view)
    })
    it("should properly iterate over subsets", () => {
        const src = { "1": 1, "2": 2 }
        const view = newKeyValueView(src)
        const iter = view.newShadowIterator()

        const next = iter.next()
        expect(next.done).toBe(false)
        expect(asKeyValues(next.value)).toEqual({ "2": 2 })

        const last = iter.next()
        expect(last.done).toBe(true)
        expect(asKeyValues(last.value)).toEqual({ "1": 1 })

        const empty = iter.next()
        expect(empty.done).toBe(true)
        expect(empty.value).toBeUndefined()

        testAccessors({"2": 2}, next.value)
    })
})