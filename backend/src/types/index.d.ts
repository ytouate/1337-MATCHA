import { Session } from "inspector";

interface JwtData {
    email: string,
    id: number
}
declare global {
    namespace Express {
        interface Request {
            token?: string,
            user: JwtData
        }
    }
}

interface User {
    first_name: string,
    id: number,
    last_name: string,
    username: string,
    email: string,
    password?: string,
    token: string,
    is_email_verified: boolean
}

interface CookiesData {
    [key: string]: any
}

interface PostgresError {
    length: number,
    name: string,
    severity: string,
    code: string,
    detail: string,
    schema: string,
    table: string,
    constraint: string,
    file: string,
    line: string,
    routine: string
}