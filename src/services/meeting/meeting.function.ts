import { Meeting as MeetingModel } from "../../models/meeting.models"
import { IUser, User as UserModel } from "../../models/auth.models"
import { Types } from "mongoose"
import { Chat as ChatModel } from "../../models/chat.model"
import { dateToLocalTime } from "../../utils/localtime"

export interface peerType {
    username: string | undefined;
    role: string;
    userId: Types.ObjectId;
    isYou: boolean;
}
export async function getMeetingPeers(meetingId: string, userId: string): Promise<peerType[] | {
    message: string;
}> {
    try {
        console.log(meetingId)
        const meeting = await MeetingModel.findOne({meetingId})
        if (!meeting) {
            return {
                message: "meeting not found"
            }
        }

        if(!meeting.participants) {
            return {
                message: "no participants"
            }
        }

        const userPromises = meeting.participants.map(async (user_id_obj: Types.ObjectId) => {
            const user = await UserModel.findById(user_id_obj);
            return {
              username: user_id_obj.equals(userId) ? `${user?.username}(you)` : user?.username,
              role: user_id_obj.equals(meeting.creator) ? 'Host' : 'Participants',
              userId: user_id_obj,
              isYou: user_id_obj.equals(userId) || false
            };
          });
          
          return await Promise.all(userPromises);
    } catch (error) {
        throw error
    }
}

export async function exitMeeting(meetingId: string, userId: string) {
    try {
      const result = await MeetingModel.updateOne(
        { meetingId },
        { $pull: { participants: new Types.ObjectId(userId) } }
      );
  
      if (result.modifiedCount === 0) {
        return { message: "USER_NOT_IN_MEETING" };
      }
  
      return { message: "REMOVED_USER_SUCCESSFULLY" };
    } catch (error) {
      console.error("Error in exitMeeting:", error);
      throw new Error("EXIT_MEETING_FAILED");
    }
}

export async function joinMeeting(meetingId: string, userId: string) {
    try {
      const meeting = await MeetingModel.findOne({ meetingId });
      if (!meeting) {
        return { message: "MEETING_NOT_FOUND" };
      }
  
      const userIdObj = new Types.ObjectId(userId);
  
      const updateResult = await MeetingModel.updateOne(
        { _id: meeting._id, participants: { $ne: userIdObj } },
        { $push: { participants: userIdObj } }
      );
  
      if (updateResult.modifiedCount === 0) {
        return { message: "USER_ALREADY_IN_MEETING" };
      }
  
      return { message: "ADDED_USER_SUCCESSFULLY" };
    } catch (error) {
      console.error("Error in joinMeeting:", error);
      throw new Error("JOIN_MEETING_FAILED");
    }
  }

export async function getAllMessages(meetingId: string, userId: string) {
    try {
        const meeting = await MeetingModel.findOne({meetingId})
        if(!meeting) {
            return {
                message: "MEETING_NOT_FOUND"
            }
        }

        const messages = await ChatModel.find({ meeting: meeting._id })
        .sort({ createdAt: 1 })
        .populate('user', 'username createdAt');
    
        return messages.map((message) => {
            const user = message.user as any;
            return {
                message: message.message,
                createdAt: dateToLocalTime(message.createdAt),
                user: {
                    username: (user._id as Types.ObjectId).equals(userId) ? `${user.username} (you)` : user.username,
                    userId: user._id,
                    createdAt: user.createdAt
                }
            }
        });
    } catch (error) {
        throw error
    }
}
