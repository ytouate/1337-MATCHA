import runQueryFromFile from "../helpers/runQueryFromFile";
import { Request, Response, query } from "express";
import { InterestsSchema } from "../validators/validators";

export const getAllInterests = async (req: Request, res: Response) => {
    console.log('haaaana')
    const queryResult = (await runQueryFromFile('getAllInterests.sql', [])).rows
    return res.json(queryResult)
}

export const setInterests = async (req: Request, res: Response) => {
    const { error, value } = InterestsSchema.validate(req.body)
    if (error) {
        return res.status(400).json({ 'error': error.details[0].message })
    }
    for (const interest of value.interests) {
        try {
            const queryResult = (await runQueryFromFile(
                'getUserInterestById.sql',
                [req.user.id, interest])
            ).rowCount
            if (queryResult == 0) {
                await runQueryFromFile('addUserInterest.sql', [req.user.id, interest])
            }
        }
        catch {
            return res.status(500).json({ 'error': 'failed to set interests' })
        }
    }
    return res.json({ 'message': 'success' })
}

export const deleteInterest = async (req: Request, res: Response) => {
    const { error, value } = InterestsSchema.validate(req.body)
    if (error) {
        return res.status(400).json({ 'error': error.details[0].message })
    }
    for (const interest of value.interests) {
        try {
            const queryResult = (await runQueryFromFile(
                'getUserInterestById.sql',
                [req.user.id, interest])
            ).rowCount
            if (queryResult == 1) {
                await runQueryFromFile('deleteUserInterest.sql', [req.user.id, interest])
            }
        }
        catch {
            return res.status(500).json({ 'error': 'failed to delete interests' })
        }
    }
    return res.json({ 'message': 'success' })
}

