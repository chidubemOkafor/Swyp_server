import { Router } from "express";
import meeting from "./meeting.controller"
import auth from "./auth.controller"
import { authenticateJwt } from "../middlewares/auth.middleware";
import { body_guard } from "../middlewares/body_guard.middleware";

export const router = Router()

router.use("/auth", auth)
router.use("/meeting", authenticateJwt, meeting);

export default router