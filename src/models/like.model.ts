// models/Like.ts
import mongoose from "mongoose";

const likeSchema = new mongoose.Schema({
  from_user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  to_user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  created_at: { type: Date, default: Date.now },
}, { timestamps: false });

likeSchema.index({ from_user: 1, to_user: 1 }, { unique: true });

export const LikeModel = mongoose.model("Like", likeSchema);