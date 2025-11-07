// models/posts.model.ts
import mongoose, { Schema, Document, Model } from "mongoose";

export interface IPost extends Document {
  user_id: mongoose.Types.ObjectId;
  image_url: string;
  status?: string;
  tags: string[]; // AI-generated
  deleted: boolean;
  created_at: Date;
}

const postSchema = new Schema<IPost>({
  user_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
  image_url: { type: String, required: true },
  status: String,
  tags: { type: [String], default: [] }, // AI sẽ điền
  deleted: { type: Boolean, default: false },
  created_at: { type: Date, default: Date.now },
});

// Indexes
postSchema.index({ user_id: 1 });
postSchema.index({ created_at: -1 });
postSchema.index({ tags: 1 }); // Dùng cho lọc theo tag
postSchema.index({ tags: "text" }); // Dùng cho tìm kiếm tag (nếu cần)

export const PostModel = mongoose.model<IPost>("Post", postSchema, "posts");