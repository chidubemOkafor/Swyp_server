import { Response, Router, Request, request } from "express";
import { Meeting } from "../services/meeting/meeting.service";
import { body_guard } from "../middlewares/body_guard.middleware";

const router = Router()

router.post("/create",body_guard, (req: Request, res: Response) => {
    const meeting = new Meeting(req, res);
    meeting.create();
  });

router.post("/join", (req: Request, res: Response) => {
    const meeting = new Meeting(req,res)
    meeting.join()
})

router.delete("/close", (req: Request, res: Response) => {
  const meeting = new Meeting(req, res)
  meeting.closeMeeting()
})
  
export default router