import express from 'express'
import {
    signin,
    signup,
    logout
} from '../controllers/authController'
import { verifyToken } from '../middlewares/verifyToken'
import { rateLimit } from 'express-rate-limit'

const signinLimit = rateLimit({
    windowMs: 1 * 60 * 1000, // 15 min
    limit: 3,
})

const router = express.Router()

router.post('/signin', signinLimit, signin)
router.post('/signup', signup)
router.post('/logout', verifyToken, logout)

export default router