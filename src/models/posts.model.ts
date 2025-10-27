
import mongoose, { Schema, Document, Model } from 'mongoose';



interface IPost extends Document {
  user_id: mongoose.Types.ObjectId; // ID người dùng đăng ảnh
  image_url: string; // URL ảnh từ Cloudinary
  status: string; // Status nhỏ đi kèm ảnh (vài dòng chữ)
  tags: string[]; // Tag tự động từ AI (e.g., ["beach", "travel"])
  visibility: mongoose.Types.ObjectId[]; // Danh sách ID bạn bè được xem ảnh
  reactions: {
    like: mongoose.Types.ObjectId[]; // ID người dùng thả like
    heart: mongoose.Types.ObjectId[]; // ID người dùng thả heart
  };
  created_at: Date; // Thời gian đăng ảnh, hỗ trợ giới hạn 1 ảnh/ngày
}

const postSchema: Schema<IPost> = new Schema<IPost>({
  user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true }, // Liên kết với người đăng
  image_url: { type: String, required: true }, // URL ảnh lưu trên Cloudinary
  status: String, // Status nhỏ, hiển thị cùng ảnh
  tags: [String], // Tag từ Google Cloud Vision, dùng cho gợi ý matching
  visibility: [{ type: Schema.Types.ObjectId, ref: 'User' }], // Bạn bè được phép xem
  reactions: {
    like: [{ type: Schema.Types.ObjectId, ref: 'User' }], // Danh sách người thả like
    heart: [{ type: Schema.Types.ObjectId, ref: 'User' }] // Danh sách người thả heart
  },
  created_at: { type: Date, default: Date.now } // Thời gian đăng, dùng để giới hạn ảnh/ngày
});

// Indexes cho Photos
postSchema.index({ user_id: 1 }); // Tăng tốc truy vấn ảnh theo người dùng
postSchema.index({ created_at: 1 }); // Hỗ trợ giới hạn 1 ảnh/ngày và sắp xếp
postSchema.index({ tags: 'text' }); // Hỗ trợ tìm kiếm tag cho gợi ý AI

// Model cho Photos
export const PostModel: Model<IPost> = mongoose.model<IPost>('Post', postSchema,"posts");