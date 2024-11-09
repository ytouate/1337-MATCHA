import { Router } from "express";
import { verifyToken } from "../middlewares/verifyToken";
import { sendVerificationEmail, verifyEmail } from "../controllers/emailController";

const router = Router()

router.get('/verify/', verifyToken, sendVerificationEmail)
router.get('/verify/:id/:token', verifyToken, verifyEmail)

export default router