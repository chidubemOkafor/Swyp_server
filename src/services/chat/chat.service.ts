import { Types } from "mongoose"
import { Chat as ChatModal } from "../../models/chat.model"
import { User } from "../../models/auth.models"
import { Meeting } from "../../models/meeting.models"

export class ChatService {
    constructor() {}

    async sendMessage({userId, meetingId, message}: {userId: string, meetingId: string, message: string}): Promise< {
        message: any,
        createdAt?: Date,
    user?: {
        username: string,
        userId: Types.ObjectId,
        createdAt?: Date
    }}> {
        if(message === "") {
            return {
                message: "MESSAGEEMPT"
            }
        }

        try {
            const user = await this.getUser(userId)

            if (!user) {
                return {
                    message: "USERNOTFND"
                }
            }

            const meeting = await Meeting.findOne({meetingId})
            if(!meeting) {
                return {
                    message: "INVALID MEETING ID"
                }
            }

            const response = new ChatModal({
                user: new Types.ObjectId(userId),
                meeting: meeting._id,
                message,
            })

            const saveChat = await response.save()

            return {
                message: saveChat.message,
                createdAt: saveChat.createdAt,
                user: {
                    username: user?.username,
                    userId: user?._id,
                    createdAt: user?.createdAt
                }
            }
        } catch (error) {
            throw error
        }
    }

    private async getUser(userId: string) {
       return await User.findOne({_id: userId})
    }
}