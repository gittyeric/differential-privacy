import { NewShadowDatasetIterator, privatize } from "../src";

// A mock SQL query function, replace this with your own
let sqlQuery: (query: string) => Promise<number> =
    (query) => Promise.resolve(Math.random());

function sqlAvg(whereFilter: string): Promise<number> {
    return sqlQuery(`SELECT AVG(age) FROM Users ${whereFilter}`)
}

// Bare down for the hard part!
// Runs a query over every shadow "subset" of the SQL database where
// each subset removes 1 unique Identity. This simple iterator assumes the
// Users SQL table does not change over time.
function newSqlLikeShadowIterator(): NewShadowDatasetIterator<string> {
    const pendingUserCount = sqlQuery("SELECT COUNT(*) FROM Users")
    let i = 0
    return async () => {
        const userCount = await pendingUserCount
        return {
            // Exclude a different user for every subset
            next: () => {
                const isDone = i >= userCount
                i++
                return {
                    done: isDone,
                    // Remove user i to form the subset
                    value: isDone ?
                        undefined :
                        `WHERE id != ${i}`
                }
            }
        }
    }
}

async function customDatasetExample() {
    const privatizedAvg = privatize(sqlAvg, {
        maxEpsilon: 1,
        maxCallCount: 100,
        // Let's not stress out the database too much,
        // max of 4 concurrent queries per privatizedAvg call
        maxConcurrentCalls: 4,
        newShadowIterator: newSqlLikeShadowIterator(),
    })

    // Run empty where clause to get the overall average age for all users,
    // and add enough noise to ensure epsilon-differential privacy
    const noisedResult = await privatizedAvg("")

    // The final, privatized averge age as a number
    const noisedAvgAge = noisedResult.result
    console.log(noisedAvgAge)
}

customDatasetExample()