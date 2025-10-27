import mongoose from "mongoose";

export const connectDatabase = async () => {
  const mongoUrl = process.env.MONGO_URL;

  if (!mongoUrl) {
    console.error("❌ MONGO_URL is undefined! Please check your .env file.");
    process.exit(1);
  }

  try {
    await mongoose.connect(mongoUrl);
    console.log("✅ Connect Success!");
  } catch (error) {
    console.error("❌ Connect Error!", error);
  }
};
