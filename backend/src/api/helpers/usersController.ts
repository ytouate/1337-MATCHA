import { Request, Response } from "express";
import runQueryFromFile from "../helpers/runQueryFromFile";
import { bioSchema, updateUserSchema, userInitializationSchema } from "../validators/validators";
import setInterestService from "../services/setInterestsService";
import setBioService from "../services/setBioService";
import { PostgresError } from "../../types";

export const me = async (req: Request, res: Response) => {
    const { id } = req.user
    if (req.method == "GET") {
        const queryResult = (await runQueryFromFile('/getUserById.sql', [id.toString()])).rows
        return res.json(...queryResult)
    }
    else if (req.method == "PUT") {
        const { error, value } = updateUserSchema.validate(req.body)
        if (error) {
            return res.status(400).json({ error: error.details[0].message })
        }
        try {
            // check if the given email already exist
            if (value.email != req.user.email) {
                const queryResult = (await runQueryFromFile('getUserByEmail.sql', [value.email])).rowCount
                if (queryResult != 0)
                    return res.status(400).json({ 'error': 'email already used by other user' })
            }
            await runQueryFromFile('updateUser.sql', [value.first_name, value.last_name, value.username, value.email, value.bio, req.user.id])
            if (value.email != req.user.email) {
                await runQueryFromFile('alterEmailVerification.sql', [req.user.id, 0])
                // set email as not verified
            }
            setInterestService(value.interests, req.user.id)
            return res.json({ message: "success" })
        }
        catch (e) {
            return res.status(500).json({ "error": e })
        }
    }
    else if (req.method == "DELETE") {

    }
}

export const getUserById = async (req: Request, res: Response) => {
    const { id } = req.params
    const queryResult = (await runQueryFromFile('/getUserById.sql', [id])).rows[0]
    if (!queryResult) {
        return res.status(400).json({ error: 'No user found with such id' })
    }

    return res.json({ ...queryResult })
}

export const getAllUsers = async (req: Request, res: Response) => {
    const queryResult = (await runQueryFromFile('/getAllUsers.sql', [])).rows
    return res.json(queryResult)
}

export const userInitialization = async (req: Request, res: Response) => {
    const { error, value } = userInitializationSchema.validate(req.body)
    if (error) {
        return res.status(400).json({ 'error': error.details[0].message })
    }

    // set interests
    try {
        setInterestService(value.interests, req.user.id)
    }
    catch (e) {
        return res.status(500).json({ 'error': 'failed to set interests' })
    }

    // set bio
    try {
        setBioService(value.bio, req.user.id)
    }
    catch (e) {
        return res.status(500).json({ 'error': 'failed to set bio' })
    }
    return res.json({ error, value })
}

export const setBio = async (req: Request, res: Response) => {
    const { error, value } = bioSchema.validate(req.body)
    if (error) {
        return res.status(400).json({ 'error': error.details[0].message })
    }
    try {
        await runQueryFromFile('setUserBio.sql', [value.bio, req.user.id])
    }
    catch (e) {
        console.log(e)
        return res.status(500).json({ 'error': 'failed to set bio' })
    }
    return res.json({ 'message': 'success' })
}

export const viewUser = async (req: Request, res: Response) => {
    const { id } = req.params
    if (id != req.user.id.toString()) {
        try {
            await runQueryFromFile('viewUser.sql', [req.user.id, id])
            return res.json({ message: 'success' })
        }
        catch (e: any) {
            const error: PostgresError = e
            if (error.code == '23503') {
                // send notification
                return res.status(404).json({ error: 'not user found with such id' })
            }
            if (error.code == '23505') {
                // send notification
                return res.status(204).json({ 'message': 'success' })
            }
            return res.status(500).json({ error })
        }
    }
    return res.end()
}

export const likeUser = async (req: Request, res: Response) => {
    const { id } = req.params
    if (id != req.user.id.toString()) {
        try {
            await runQueryFromFile('likeUser.sql', [req.user.id, id])
            return res.json({ message: 'success' })
        }
        catch (e: any) {
            const error: PostgresError = e
            if (error.code == '23503') {
                // send notification
                return res.status(404).json({ error: 'not user found with such id' })
            }
            if (error.code == '23505') {
                // send notification
                return res.status(204).json({ 'message': 'success' })
            }
            return res.status(500).json({ error })
        }
    }
    return res.end()
}

export const getProfileViews = async (req: Request, res: Response) => {
    try {
        const queryResult = await runQueryFromFile('/getUserViews.sql', [req.user.id])
        return res.json(queryResult.rows)
    }
    catch (e) {
        return res.status(500).json({ error: e })
    }
}

export const getProfileLikes = async (req: Request, res: Response) => {
    try {
        const queryResult = await runQueryFromFile('/getUserLikes.sql', [req.user.id])
        return res.json(queryResult.rows)
    }
    catch (e) {
        return res.status(500).json({ error: e })
    }
}