import express from 'express'
import dotenv from 'dotenv'
import cors from 'cors'
import { parseCookies } from './api/middlewares/parseCookies'
import runQueryFromFile from './api/helpers/runQueryFromFile'
// * Routers
import authRouter from './api/routes/auth'
import usersRouter from './api/routes/users'
import emailRouter from './api/routes/email'
import passwordRouter from './api/routes/password'
import apiRouter from './api/routes/api'

dotenv.config()

const app = express()
const port = process.env.PORT || 3000
const host = process.env.HOST || 'http://localhost'

app.use(express.json())
app.use(cors())
app.use(parseCookies)


// * Authentication Router
app.use("/auth", authRouter)

// * Users Router
app.use('/users', usersRouter)

// * Email
app.use('/email', emailRouter)

// * Password
app.use('/password', passwordRouter)

// * API
app.use('/api', apiRouter)


app.listen(port, () => {
    console.log(`server is listening on ${host}:${port}`)
    // * Create All Tables & Load hardcoded data
    runQueryFromFile('/createTables.sql', [])
    // runQueryFromFile('/loadInterests.sql', [])
})