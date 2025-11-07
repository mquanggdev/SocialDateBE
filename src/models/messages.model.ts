import mongoose, { Schema, Document, Model } from "mongoose";

export interface IMessage extends Document {
  room_id: mongoose.Types.ObjectId; // ID phòng chat
  sender_id: mongoose.Types.ObjectId; // Người gửi
  receiver_id: mongoose.Types.ObjectId; // Người nhận
  content?: string; // Nội dung tin nhắn (tùy chọn, dùng cho chú thích)
  image_url?: string; // Mảng URL của các hình ảnh (tùy chọn)
  type: "text" | "image" | "both"; // Loại tin nhắn
  is_read: boolean; // Đã đọc hay chưa
  is_recalled: boolean; // Đã thu hồi hay chưa
  timestamp: Date; // Thời điểm gửi
}

const messageSchema = new Schema<IMessage>({
  room_id: { type: Schema.Types.ObjectId, ref: "RoomChat", required: true },
  sender_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
  receiver_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
  content: { type: String, required: false }, // Không bắt buộc
  image_url: { type: String, required: false },
  type: { type: String, enum: ["text", "both", "image"], default: "text" }, // Thêm image
  is_read: { type: Boolean, default: false },
  is_recalled: { type: Boolean, default: false },
  timestamp: { type: Date, default: Date.now },
});

messageSchema.index({ room_id: 1, timestamp: 1 });

export const MessageModel: Model<IMessage> = mongoose.model<IMessage>(
  "Message",
  messageSchema
);