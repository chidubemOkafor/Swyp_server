import * as z from "zod"
import { MeetingType } from "../models/meeting.models"
// import { IMeeting } from "../models/meeting.models"

// const { title, description, scheduledStartTime, duration, type, scheduledParticipants, isScheduledMeeting } = this.req.body;

export const ScheduledMeeting = z.object({
    title: z.string().min(1, "title is required"),
    description:  z.string().min(1, "description is required"),
    scheduledStartTime: z
    .preprocess((arg) => {
      return typeof arg === "string" || typeof arg === "number"
        ? new Date(arg)
        : arg;
    }, z.date())
    .refine((date) => date > new Date(), {
      message: "Scheduled start time must be in the future",
    }),
    duration: z.number().min(5, "duration cannot be less that 5min"),
    type: z.enum([MeetingType.closed, MeetingType.open]),
    scheduledParticipants: z.array(z.string().min(1, "userId is required")).optional(),
})

export const InstantMeeting = z.object({
    title: z.string().min(1, "title is required"),
    description: z.string().min(1, "description is required")
})

export const create_ = z.object({
  isSheduledMeeting: z.boolean()
})