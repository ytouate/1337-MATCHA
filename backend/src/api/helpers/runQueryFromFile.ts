
import { Client } from "pg"
import fs from 'fs'
import path = require("path");

async function runQueryFromFile(fileName: string, params: any[]) {
    const filePath =  path.join(__dirname, "../queries", fileName);
    try {
        const client = new Client({
            host: 'db'
        })
        await client.connect()
        const query = fs.readFileSync(filePath, 'utf-8')
        const queryResult = await client.query(query, params)
        client.end()
        return queryResult
    }
    catch (err) {
        throw err
    }
}

export default runQueryFromFile;