import { signinSchema, signUpSchema } from "../validators/validators"
import { Request, Response } from "express";
import runQueryFromFile from "../helpers/runQueryFromFile";
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'

export const signin = async (req: Request, res: Response) => {
    const { error, value } = signinSchema.validate(req.body)
    if (error) {
        // Validation Error
        res.status(400)
        return res.json({
            error: "Validation Error",
            details: error.details.map(detail => detail.message)
        })
    }

    const user = (await runQueryFromFile('/getUserByEmail.sql', [value.email])).rows[0];
    if (!user) {
        // User not found
        return res.status(401).json({ error: "User not found" })
    }

    const isPasswordValid = await bcrypt.compare(value.password, user.password)
    if (!isPasswordValid) {
        // Incorrect password
        return res.status(401).json({ error: "Incorrect password" })
    }

    const { password, ...userData } = user;

    // refresh token
    jwt.sign({ id: userData.id, email: userData.email }, process.env.REFRESH_TOKEN_KEY || "refreshSecret",
        { audience: userData.id.toString() },
        (error: Error | null, token: string | undefined) => {
            if (error) {
                return res.status(500).json({ error: "Internal Server Error" })
            }
            res.cookie("refreshToken", token, { httpOnly: true, secure: true, sameSite: true })
        })
    // access token
    jwt.sign({ id: userData.id, email: userData.email }, process.env.SECRET_KEY || "secret",
        { expiresIn: '5s', audience: userData.id.toString() },
        (error: Error | null, token: string | undefined) => {
            if (error) {
                console.log('error: ', error)
                return res.status(500).json({ error: "Internal Server Error" })
            }
            res.cookie("token", token, { httpOnly: true, secure: true, sameSite: true })
            res.status(200).json({ token })
        })
}

export const signup = async (req: Request, res: Response) => {
    const { error, value } = signUpSchema.validate(req.body)
    if (error) {
        res.status(400)
        return res.json({
            error: "Validation Error",
            details: error.details.map(detail => detail.message)
        })
    }

    const { repeat_password, ...values } = value
    values.password = await bcrypt.hash(values.password, 13);

    let queryResult = await runQueryFromFile(
        '/addUser.sql',
        Object.values(values)
    )
    if (!queryResult.rowCount) {
        res.status(400)
        return res.json({
            error: "Email already registered"
        })
    }

    return res.status(200).json({ message: "registered" })
}

export const logout = async (req: Request, res: Response) => {
    res.clearCookie("token");
    res.status(200).json({ "message": "success" })
}