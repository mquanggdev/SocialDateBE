import mongoose, { Schema, Document, Model } from 'mongoose';


interface IMatch extends Document {
  user1_id: mongoose.Types.ObjectId; // ID người dùng 1 trong cặp match
  user2_id: mongoose.Types.ObjectId; // ID người dùng 2 trong cặp match
  start_date: Date; // Thời gian bắt đầu match (khi ghép đôi thành công)
  end_date: Date; // Thời gian kết thúc match (sau 7 ngày)
  status: string; // Trạng thái: active, accepted (kết bạn), canceled (hủy)
  accepted_by: mongoose.Types.ObjectId[]; // Danh sách ID người chấp nhận match
  canceled_by: mongoose.Types.ObjectId | null; // ID người hủy match (nếu có)
  created_at: Date; // Thời gian tạo match
}

// Schema cho Matches
const matchSchema: Schema<IMatch> = new Schema<IMatch>({
  user1_id: { type: Schema.Types.ObjectId, ref: 'User', required: true }, // Người dùng 1
  user2_id: { type: Schema.Types.ObjectId, ref: 'User', required: true }, // Người dùng 2
  start_date: { type: Date, required: true }, // Bắt đầu match
  end_date: { type: Date, required: true }, // Kết thúc sau 7 ngày
  status: { type: String, enum: ['active', 'accepted', 'canceled'], default: 'active' }, // Trạng thái match
  accepted_by: [{ type: Schema.Types.ObjectId, ref: 'User' }], // Người chấp nhận (cả hai để kết bạn)
  canceled_by: { type: Schema.Types.ObjectId, ref: 'User', default: null }, // Người hủy (nếu có)
  created_at: { type: Date, default: Date.now } // Thời gian tạo
});

// Indexes cho Matches
matchSchema.index({ user1_id: 1, user2_id: 1 }, { unique: true }); // Ngăn match trùng lặp
matchSchema.index({ start_date: 1 }); // Hỗ trợ kiểm tra thời hạn 7 ngày
matchSchema.index({ status: 1 }); // Tăng tốc lọc match active

// Model cho Matches
export const MatchModel: Model<IMatch> = mongoose.model<IMatch>('Match', matchSchema);