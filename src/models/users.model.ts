import mongoose, { Schema, Document, Model } from "mongoose";

export interface IUser extends Document {
  email: string;
  full_name: string;
  password: string;
  birthday: string;
  avatar_url: string;
  address: string;
  phone: string;
  bio: string;
  interests: string[];
  gender: "male" | "female" | "other";

  // 🔍 Tiêu chí ghép đôi (thay cho desired_topics + partner_requirements)
  match_preferences: {
    gender?: "male" | "female" | "other";
    age_range?: { min: number; max: number };
    distance_km?: number;
    interests?: string[];
    location_preference?: string;
  };

  location: {
    type: "Point";
    coordinates: [number, number]; // [longitude, latitude]
  };

  friends: mongoose.Types.ObjectId[];
  request_to_friend: mongoose.Types.ObjectId[];
  request_to_me: mongoose.Types.ObjectId[];
  current_match: mongoose.Types.ObjectId | null;
  ready_to_match: {
    is_ready: boolean;
    requested_at: Date | null;
    max_wait_time: number;
  };
  status: "online" | "offline" | "busy";
  socketId: string;
  last_active: Date;
  created_at: Date;
  updated_at: Date;
}

const userSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true },
    full_name: { type: String, required: true },
    password: { type: String, required: true },
    birthday: { type: String, required: true },
    avatar_url: { type: String },
    address: { type: String, required: true },
    phone: { type: String, required: true },
    bio: { type: String },
    interests: { type: [String], default: [] },
    gender: { type: String, enum: ["male", "female", "other"], required: true },

    match_preferences: {
      gender: {
        type: String,
        enum: ["male", "female", "other"],
        default: "other",
      },
      age_range: {
        min: { type: Number, default: 18 },
        max: { type: Number, default: 50 },
      },
      distance_km: { type: Number, default: 50 },
      interests: { type: [String], default: [] },
      location_preference: { type: String, default: "" },
    },

    location: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], required: true },
    },

    friends: [{ type: Schema.Types.ObjectId, ref: "User" }],
    request_to_friend: [{ type: Schema.Types.ObjectId, ref: "User" }],
    request_to_me: [{ type: Schema.Types.ObjectId, ref: "User" }],
    current_match: { type: Schema.Types.ObjectId, ref: "Match", default: null },

    ready_to_match: {
      is_ready: { type: Boolean, default: false },
      requested_at: { type: Date, default: null },
      max_wait_time: { type: Number, default: 3600 },
    },

    status: {
      type: String,
      enum: ["online", "offline", "busy"],
      default: "online",
    },
    socketId: { type: String },
    last_active: { type: Date, default: Date.now },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

// ✅ Indexes cho truy vấn nhanh
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ location: "2dsphere" });
userSchema.index({ interests: "text" });
userSchema.index({ current_match: 1 });
userSchema.index({
  "ready_to_match.is_ready": 1,
  gender: 1,
  location: "2dsphere",
});

userSchema.index({ friends: 1 });
userSchema.index({ request_to_friend: 1 });
userSchema.index({ request_to_me: 1 });

export const UserModel: Model<IUser> = mongoose.model<IUser>(
  "User",
  userSchema,
  "users"
);
