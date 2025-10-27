import mongoose, { Schema, Document, Model } from "mongoose";

export interface IMessage extends Document {
  room_id: mongoose.Types.ObjectId; // ID phòng chat
  sender_id: mongoose.Types.ObjectId; // Người gửi
  receiver_id: mongoose.Types.ObjectId; // Người nhận
  content: string; // Nội dung tin nhắn
  type: "text" | "call"; // Loại tin nhắn
  is_read: boolean; // Đã đọc hay chưa
  timestamp: Date; // Thời điểm gửi
}

const messageSchema = new Schema<IMessage>({
  room_id: { type: Schema.Types.ObjectId, ref: "RoomChat", required: true },
  sender_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
  receiver_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
  content: { type: String, required: true },
  type: { type: String, enum: ["text", "call"], default: "text" },
  is_read: { type: Boolean, default: false },
  timestamp: { type: Date, default: Date.now },
});

messageSchema.index({ room_id: 1, timestamp: 1 });

export const MessageModel: Model<IMessage> = mongoose.model<IMessage>(
  "Message",
  messageSchema
);
