import { Router } from "express";
import { fetchSuggestedProfiles } from "../controllers/apiController";
import { verifyToken } from "../middlewares/verifyToken";
import { getAllInterests } from "../controllers/interestsController";

const router = Router()

router.get('/interests', verifyToken, getAllInterests)
router.get('/suggested', verifyToken, fetchSuggestedProfiles)


export default router