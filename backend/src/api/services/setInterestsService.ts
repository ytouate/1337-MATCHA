
import runQueryFromFile from "../helpers/runQueryFromFile"

export default async function setInterestService(interests: string[], id: number) {
    for (const interest of interests) {
        const queryResult = (await runQueryFromFile(
            'getUserInterestById.sql',
            [id.toString(), interest])
        ).rowCount
        if (queryResult == 0) {
            await runQueryFromFile('addUserInterest.sql', [id.toString(), interest])
        }
    }
}