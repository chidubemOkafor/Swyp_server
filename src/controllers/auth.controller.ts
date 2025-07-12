import { Router, Request, Response } from "express"
import { LocalAuth } from "../services/auth/auth.service";
import logger from "../utils/logger";

const router = Router()

router.post("/create", (req: Request, res: Response) => {
    logger.info("creating an account")
    const auth = new LocalAuth(req, res);
    auth.create();
});

router.post("/signin", (req: Request, res: Response) => {
    logger.info("logging in")
    const auth = new LocalAuth(req, res);
    auth.signIn();
});


export default router