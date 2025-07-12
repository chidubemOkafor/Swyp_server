import mongoose, { Schema, Document, Types } from "mongoose";

export interface IMeeting extends Document {
    title: string;
    displayName: string;
    creator: Types.ObjectId;
    participants?: Types.ObjectId[];
    chat: Types.ObjectId[];
    meetingId: string;
    createdAt: Date;
}

const MeetingSchema: Schema = new Schema({
    title: { type: String, required: true },
    displayName: { type: String, required: true },
    creator: { type: Schema.Types.ObjectId, ref: "User", required: true },
    participants: [{ type: Schema.Types.ObjectId, ref: "User" }],
    chat: [{ type: Schema.Types.ObjectId, ref: "Chat" }],
    meetingId: { type: String, required: true, unique: true },
    createdAt: { type: Date, default: Date.now }
});

export const Meeting = mongoose.model<IMeeting>("Meeting", MeetingSchema);
