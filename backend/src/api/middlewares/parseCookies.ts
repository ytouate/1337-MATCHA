import { Request, Response, NextFunction } from "express";
import { CookiesData } from "../../types";

export function parseCookies(req: Request, res: Response, next: NextFunction) {
    let cookiesObject: CookiesData = {}
    const cookiesArray = req.headers.cookie?.split("; ");
    if (cookiesArray) {
        for (const cookie of cookiesArray) {
            const [key, value] = cookie.split('=');
            cookiesObject[key] = value;
        }
        req.cookies = cookiesObject;
    }
    next();
}