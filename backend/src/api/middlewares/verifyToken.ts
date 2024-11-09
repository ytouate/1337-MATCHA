import { NextFunction, Request, Response } from "express";
import jwt, { JwtPayload } from 'jsonwebtoken'

export async function verifyToken(req: Request, res: Response, next: NextFunction) {
    const accessToken = req.cookies?.token;
    if (!accessToken) {
        return res.status(403).json({ error: "user not authenticated" })
    }
    try {
        const payload = await jwt.verify(accessToken, process.env.SECRET_KEY || "secret") as JwtPayload
        req.user = { "id": payload.id, "email": payload.email }
        return next()
    }
    catch (error: any) {
        if (error.name == "TokenExpiredError") {
            const { refreshToken: token } = req.cookies
            try {
                const payload = await jwt.verify(token, process.env.REFRESH_TOKEN_KEY || "refreshSecret") as JwtPayload
                jwt.sign({ id: payload.id, email: payload.email }, process.env.SECRET_KEY || "secret",
                    { expiresIn: '5s', audience: payload.id.toString() },
                    (error: Error | null, token: string | undefined) => {
                        if (error) {
                            console.log("error: ", error)
                            return res.status(500).json({ error: "Internal Server Error" })
                        }
                        req.user = { "id": payload.id, "email": payload.email }
                        res.cookie("token", token, { httpOnly: true, secure: true, sameSite: true })
                        return next();
                    })
            }
            catch {
                return res.sendStatus(403)
            }
        }
        else {
            return res.status(403).json({ error: "Invalid access token" })
        }
    }
}