import mongoose, { Schema, Document, Model } from "mongoose";

export interface IRoomChat extends Document {
  participants: mongoose.Types.ObjectId[]; // 2 người trong phòng chat
  type: "friend" | "match"; // Loại chat: bạn bè hoặc match
  match_id?: mongoose.Types.ObjectId; // Nếu là match, lưu lại match_id
  expired_at?: Date; // Thời hạn (chỉ có nếu type = "match")
  last_message?: mongoose.Types.ObjectId; // Tin nhắn cuối cùng (hiển thị preview)
  created_at: Date;
  updated_at: Date;
}

const roomChatSchema = new Schema<IRoomChat>(
  {
    participants: {
      type: [{ type: Schema.Types.ObjectId, ref: "User" }],
      validate: [
        (arr: mongoose.Types.ObjectId[]) => arr.length === 2,
        "Room 1-1 phải có đúng 2 người",
      ],
      required: true,
    },
    type: {
      type: String,
      enum: ["friend", "match"],
      required: true,
    },
    match_id: {
      type: Schema.Types.ObjectId,
      ref: "Match",
      required: function () {
        return this.type === "match";
      },
    },
    expired_at: {
      type: Date,
      required: function () {
        return this.type === "match";
      },
    },
    last_message: {
      type: Schema.Types.ObjectId,
      ref: "Message",
    },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

// ✅ Index để tối ưu truy vấn
roomChatSchema.index({ participants: 1 });
roomChatSchema.index({ expired_at: 1 }, { expireAfterSeconds: 0 }); // tự xóa khi hết hạn (nếu type=match)

export const RoomChatModel: Model<IRoomChat> = mongoose.model<IRoomChat>(
  "RoomChat",
  roomChatSchema
);
