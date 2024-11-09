import Joi from "joi";
import runQueryFromFile from "../helpers/runQueryFromFile";
import { Request, Response } from "express";
import jwt, {JwtPayload} from 'jsonwebtoken'
import bcrypt from 'bcrypt'
import { sendMail } from "../helpers/sendMail";

export const forgotPassword = async (req: Request, res: Response) => {
    const emailValidator = Joi.object({
        email: Joi.string().email().required()
    })
    const { error, value } = emailValidator.validate(req.body);
    if (error) {
        // invalid payload
        return res.status(400).json({
            error: "Invalid Payload",
            details: error.details.map(detail => detail.message)
        })
    }
    const user = (await runQueryFromFile('/getUserByEmail.sql', [value.email])).rows[0]
    if (!user) {
        // No user with such email
        return res.status(400).json({
            error: "User Not registered"
        })
    }
    try {
        const secret = process.env.SECRET_KEY || "secretKey"
        const payload = {
            email: user.email,
            id: user.id
        };
        const token = await jwt.sign(payload, secret, { expiresIn: "30m", audience: payload.id.toString() })
        const link = `${process.env.BASE_URL}/password/reset-password/${user.id}/${token}`;
        sendMail(
            "Reset Password For Matcha Account",
            "To change your password please click the following",
            user,
            { link: link }
        )
        return res.status(200).json({ error: "an email is sent" })
    }
    catch (e: any) {
        res.status(500).json(e.toString())
    }
}

export const resetPasswordRedirect = async (req: Request, res: Response) => {
    const { id, token } = req.params
    const user = (await runQueryFromFile("/getUserById.sql", [id.toString()])).rows[0]
    if (!user) {
        // user not found
        return res.status(400).json({ error: "user not found" })
    }
    const secret = process.env.SECRET_KEY || "secretKey"

    try {
        const payload = await jwt.verify(token, secret) as JwtPayload
        console.log('here')
        return res.redirect(process.env.REDIRECT_URL + `?token=${token}` || "")
    }
    catch (e: any) {
        console.log(e)
        return res.status(400).json({ error: "invalid token", details: e.toString() })
    }

}

export const resetPassword = async (req: Request, res: Response) => {
    const passwordSchema = Joi.object({
        password: Joi.string().required().min(3).max(100),
        repeat_password: Joi.ref("password")
    })
    const { error, value } = passwordSchema.validate(req.body)
    if (error) {
        // invalid payload
        return res.status(400).json({
            error: "Invalid Payload",
            details: error.details.map(detail => detail.message)
        })
    }
    if (!value.repeat_password) {
        // Repeated password is missing
        return res.status(400).json({
            error: "missing repeated password",
        })
    }
    try {
        const { token }: any = req.query
        const payload = await jwt.verify(token, process.env.SECRET_KEY || "secretKey") as JwtPayload
        const hash = await bcrypt.hash(value.password, 13);
        await runQueryFromFile('/changeUserPassword.sql', [payload.id.toString(), hash]);
        return res.json({ message: "password changed" })
    }
    catch (e: any) {
        return res.status(500).json(e.toString())
    }
}