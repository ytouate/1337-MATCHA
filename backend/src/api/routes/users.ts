import { Router } from "express";
import {
    getUserById,
    me,
    getAllUsers,
    userInitialization,
    setBio,
    viewUser,
    getProfileLikes,
    getProfileViews
} from "../controllers/usersController";
import { verifyToken } from "../middlewares/verifyToken";
import { deleteInterest, setInterests } from "../controllers/interestsController";

const router = Router()

router.get('/me', verifyToken, me)
router.put('/me', verifyToken, me)
router.get('/me/views', verifyToken, getProfileViews)
router.get('/me/likes', verifyToken, getProfileLikes)
router.get('/:id', verifyToken, getUserById)
router.post('/view/:id', verifyToken, viewUser)
router.post('/me/init', verifyToken, userInitialization)
router.get('', verifyToken, getAllUsers)
router.post('/me/bio', verifyToken, setBio)
router.post('/me/interests', verifyToken, setInterests)
router.delete('/me/interests', verifyToken, deleteInterest)

export default router