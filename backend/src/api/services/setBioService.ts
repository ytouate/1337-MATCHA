import runQueryFromFile from "../helpers/runQueryFromFile";


export default async function setBioService(bio: string, id: number) {
    await runQueryFromFile('setUserBio.sql', [bio, id.toString()])
}