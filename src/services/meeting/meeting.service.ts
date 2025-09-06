import createError from "http-errors";
import { Request, Response } from "express";
import { IMeeting, Meeting as MeetingModel, MeetingType } from "../../models/meeting.models";
import { User } from "../../types/user/user";
import { Types } from "mongoose";
import { User as UserModel } from "../../models/auth.models";
import logger from "../../utils/logger";
import { generateMeetingId } from "../../utils/generateMeetingId";
import { create_, InstantMeeting, ScheduledMeeting } from "../../dtos/meeting";

export class Meeting {
    constructor(private readonly req: Request, private readonly res: Response) {}

    async create() {
        const { isSheduledMeeting } = create_.parse(this.req.body)
        try {
            isSheduledMeeting ? this.createScheduledMeeting() : this.createInstantMeeting()
        } catch (error) {
            return this.res
                .status(new createError.InternalServerError().statusCode)
                .json({ message: "Something went wrong", error });
        }
    }

    async createInstantMeeting() {
        const user = this.isUser() as User
        const { title, description } = InstantMeeting.parse(this.req.body)

        const meetingOption: Partial<IMeeting> = {
            creator: new Types.ObjectId(user.userId),
            title,
            description,
            type: MeetingType.open,
            scheduledStartTime: new Date(),
            meetingId: generateMeetingId()
        }

        const newMeeting = new MeetingModel(meetingOption);

        try {
            const savedMeeting = await newMeeting.save();
            return this.res.status(201).json(savedMeeting);

        } catch (error) {
            throw error
        }
    }

    async createScheduledMeeting() {
        const user = this.isUser() as User
        const { title, description, scheduledStartTime, duration, type, scheduledParticipants } = ScheduledMeeting.parse(this.req.body);

        let meetingOption: Partial<IMeeting> = {
            creator: new Types.ObjectId(user.userId),
            title,
            description,
            type,
            duration,
            scheduledStartTime,
            meetingId: generateMeetingId()
        }

        if (type === "closed"){
            if(!scheduledParticipants) {
                return this.res
                    .status(new createError.NotAcceptable().statusCode)
                    .json({ message: "You need participants in a closed meeting"})
            }
            meetingOption.scheduledParticipants = [...this.parseStringIdToObjectId(scheduledParticipants), new Types.ObjectId(user.userId)]
        } 

        const newMeeting = new MeetingModel(meetingOption)

        try {
            const savedMeeting = await newMeeting.save();
            return this.res.status(201).json(savedMeeting);

        } catch (error) {
            throw error
        }
    }

    private parseStringIdToObjectId(userIds: string[]) {
        return userIds.map((userId) => new Types.ObjectId(userId))
    }

    private isUser() {
        const { user } = this.req
        if (!user) {
            return this.res
                .status(new createError.NotAcceptable().statusCode)
                .json({ message: "User is not in the token" });
        } else {
            return user
        }
    }

    async isMeetingExisting(user: User): Promise<string | null> {
        try {
            const meeting = await MeetingModel.findOne({ creator: user.userId });
    
            return meeting?.meetingId || null;
        } catch (error) {
            throw error;
        }
    }
    
    async join() {
        logger.info("joining meeting");
      
        const { room_name, meetingId, viewSettings } = this.req.body;

        console.log("settings: ",viewSettings)

        const user = this.req.user;
      
        if (!user) {
          return this.res
            .status(new createError.NotFound().statusCode)
            .json({ message: "User is not in the token" });
        }
      
        try {
          const meeting = await MeetingModel.findOne({ meetingId });
      
          if (!meeting) {
            return this.res
              .status(new createError.NotFound().statusCode)
              .json({ message: "Meeting was not found" });
          }
      
          if (!Array.isArray(meeting.participants)) {
            meeting.participants = [];
          }

          const userId = new Types.ObjectId(user.userId)
          const alreadyJoined = meeting.participants.find(participant => (participant).equals(userId))
      
          if (!alreadyJoined) {
            meeting.participants.push(userId);
            await meeting.save();
            return this.res
              .status(200)
              .json({ message: "Joined the meeting successfully", meeting });
          }
      
          return this.res
            .status(200)
            .json({ message: "User already joined the meeting", meeting });
        } catch (error) {
          logger.error("Join meeting failed", error);
          return this.res
            .status(new createError.InternalServerError().statusCode)
            .json({ message: "Something went wrong", error });
        }
      }
      

    async closeMeeting() {
        const { meetingId } = this.req.body
        try {
            const meeting = await MeetingModel.findOne({meetingId})

            if (!meeting) {
                return this.res
                    .status(new createError.NotFound().statusCode)
                    .json({ message: "meeting was not found" });
            }

            await MeetingModel.deleteOne({ meetingId })
            
            return this.res.status(200).json({ message: "meeting closed"})
        } catch (error) {
            return this.res
                .status(new createError.InternalServerError().statusCode)
                .json({ message: "Something went wrong", error });
        }
    }
}
