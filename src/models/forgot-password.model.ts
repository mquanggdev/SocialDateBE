import mongoose, { Schema, Document, Model } from "mongoose";

interface IForgotPassword extends Document {
  email: string;
  otp: string;
  expire_at: Date;
  created_at: Date;
  updated_at: Date;
}

// Schema cho ForgotPassword
const forgotPasswordSchema: Schema<IForgotPassword> = new Schema<IForgotPassword>({
  email: { type: String, required: [true, 'Email là bắt buộc'], trim: true, lowercase: true },
  otp: { type: String, required: [true, 'OTP là bắt buộc'], minlength: [6, 'OTP phải có ít nhất 6 ký tự'] },
  expire_at: {
    type: Date,
    required: [true, 'Thời gian hết hạn là bắt buộc'],
    expires: '3m'  // TTL index: Tự động xóa document sau 3 phút
  },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

// Indexes cho ForgotPassword (hỗ trợ TTL và tìm kiếm nhanh)
forgotPasswordSchema.index({ email: 1 });
forgotPasswordSchema.index({ expire_at: 1 }, { expireAfterSeconds: 0 });

// Model cho ForgotPassword
export const ForgotPasswordModel: Model<IForgotPassword> = mongoose.model<IForgotPassword>(
  "ForgotPassword",
  forgotPasswordSchema,
  "forgot-password"
);