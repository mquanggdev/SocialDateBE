import mongoose, { Schema, Document, Model } from 'mongoose';

interface IReport extends Document {
  reporter_id: mongoose.Types.ObjectId; // ID người báo cáo
  reported_id: mongoose.Types.ObjectId; // ID của user, match, photo, hoặc message bị báo cáo
  reason: string; // Lý do báo cáo (e.g., "offensive content")
  type: string; // Loại báo cáo: photo, message, user
  created_at: Date; // Thời gian tạo báo cáo
}

// Schema cho Reports
const reportSchema: Schema<IReport> = new Schema<IReport>({
  reporter_id: { type: Schema.Types.ObjectId, ref: 'User', required: true }, // Người báo cáo
  reported_id: { type: Schema.Types.ObjectId, required: true }, // Entity bị báo cáo (User, Match, Photo, Message)
  reason: { type: String, required: true }, // Lý do báo cáo
  type: { type: String, enum: ['photo', 'message', 'user'], required: true }, // Loại báo cáo
  created_at: { type: Date, default: Date.now } // Thời gian tạo
});

// Indexes cho Reports
reportSchema.index({ reported_id: 1 }); // Tăng tốc truy vấn báo cáo theo entity
reportSchema.index({ type: 1 }); // Tăng tốc lọc báo cáo theo loại

// Model cho Reports
export const ReportModel: Model<IReport> = mongoose.model<IReport>('Report', reportSchema);