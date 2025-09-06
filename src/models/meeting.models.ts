import mongoose, { Schema, Document, Types } from "mongoose";

export enum MeetingType {
    closed = "closed",
    open = "open"
}

export interface IMeeting extends Document {
    title: string;
    description: string;
    creator: Types.ObjectId;
    scheduledParticipants: Types.ObjectId[];
    type: MeetingType;
    scheduledStartTime: Date;
    duration?: number;
    participants?: Types.ObjectId[];
    chat: Types.ObjectId[];
    meetingId: string;
    createdAt: Date;
}

const MeetingSchema: Schema = new Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    creator: { type: Schema.Types.ObjectId, ref: "User", required: true },
    scheduledParticipants: [{ type: Schema.Types.ObjectId, ref: "User" }],
    type: { type: String, enum: Object.values(MeetingType), required: true },
    scheduledStartTime: { type: Date, required: true },
    duration: { type: Number },
    participants: [{ type: Schema.Types.ObjectId, ref: "User" }],
    chat: [{ type: Schema.Types.ObjectId, ref: "Chat" }],
    meetingId: { type: String, required: true, unique: true },
    createdAt: { type: Date, default: Date.now }
});

export const Meeting = mongoose.model<IMeeting>("Meeting", MeetingSchema);
