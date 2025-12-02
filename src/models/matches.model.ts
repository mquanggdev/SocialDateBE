// models/Match.ts
import mongoose, { Schema, Document, Model } from "mongoose";

export interface IMatch extends Document {
  user1_id: mongoose.Types.ObjectId;
  user2_id: mongoose.Types.ObjectId;
  status: "pending" | "accepted" | "rejected" | "expired";
  user1_accept: boolean;
  user2_accept: boolean;
  chat_room_id: mongoose.Types.ObjectId; // ref RoomChat
  created_at: Date;
  expires_at: Date; // 7 ngày
}

const matchSchema = new Schema<IMatch>({
  user1_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
  user2_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
  status: {
    type: String,
    enum: ["pending", "accepted", "rejected", "expired"],
    default: "pending",
  },
  user1_accept: { type: Boolean, default: false },
  user2_accept: { type: Boolean, default: false },
  chat_room_id: {
    type: Schema.Types.ObjectId,
    ref: "RoomChat",
    required: true,
  },
  created_at: { type: Date, default: Date.now },
  expires_at: { type: Date, required: true }, // 7 ngày sau
});

// TỰ ĐỘNG XÓA SAU 7 NGÀY
matchSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });

// TRÁNH GHÉP ĐÔI 2 LẦN
matchSchema.index({ user1_id: 1, user2_id: 1 }); // không unique
matchSchema.index({ user2_id: 1, user1_id: 1 }); // tìm ngược

// TÌM NHANH MATCH ĐANG CHỜ
matchSchema.index({ status: 1, user1_id: 1 });
matchSchema.index({ status: 1, user2_id: 1 });

export const MatchModel: Model<IMatch> = mongoose.model<IMatch>(
  "Match",
  matchSchema
);
