import { Router } from "express";
import { forgotPassword, resetPassword, resetPasswordRedirect } from "../controllers/passwordController";
const router = Router()

router.post('/forgot-password', forgotPassword)
router.get('/reset-password/:id/:token', resetPasswordRedirect)
router.patch('/reset-password', resetPassword)

export default router