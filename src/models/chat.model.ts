import mongoose, { Schema, Document, Types } from "mongoose"

export interface IChat extends Document {
    _id: Types.ObjectId
    user: Types.ObjectId
    meeting: Types.ObjectId
    message: string
    images?: string[]
    createdAt: Date
}

const ChatSchema: Schema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    message: { type: String, required: true },
    meeting: { type: Schema.Types.ObjectId, ref: "Meeting", required: true },
    images: [{ type: String, required: false }],
    createdAt: { type: Date, default: Date.now }
})

export const Chat = mongoose.model<IChat>("Chat",ChatSchema)