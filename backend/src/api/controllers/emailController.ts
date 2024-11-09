import { Request, Response } from "express";
import jwt, {JwtPayload} from 'jsonwebtoken'
import runQueryFromFile from "../helpers/runQueryFromFile";
import { sendMail } from "../helpers/sendMail";
import { User } from "../../types";

export const sendVerificationEmail = async (req: Request, res: Response) => {
    const { id } = req.user;
    const user = await (await runQueryFromFile('/getUserById.sql',
        [id.toString()])).rows[0] as User
    if (user.is_email_verified) return res.status(200).json({ message: "email already verified" })

    try {
        const token = await jwt.sign(
            { email: user.email, id: user.id },
            process.env.SECRET_KEY || "secretKey",
            { expiresIn: "30m", audience: user.id.toString() }
        )
        const link = `${process.env.BASE_URL}/email/verify/${user.id.toString()}/${token}`
        sendMail(
            "Matcha Email Vefication",
            "Please Verify your email by clicking the following link",
            user,
            { link: link }
        )
        return res.status(200).json({ message: "sent" })
    }
    catch {
        return res.status(500).json({ message: "Failed to send verification mail" })
    }
}

export const verifyEmail = async (req: Request, res: Response) => {
    const { id, token } = req.params;
    const user = (await runQueryFromFile('/getUserById.sql', [id])).rows[0]
    if (!user) {
        return res.send({ error: "User Not Found" }).status(404)
    }
    try {
        const payload = await jwt.verify(token, process.env.SECRET_KEY || "secretKey") as JwtPayload
        await runQueryFromFile('/alterEmailVerification.sql', [payload.id, 1])
        return res.status(200).json({ message: "email verified succefully" })
    }
    catch (e) {
        return res.status(400).send({ "error": "invalid token" })
    }
}