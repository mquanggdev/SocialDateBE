import {
  v2 as cloudinary,
  UploadApiResponse,
  UploadApiErrorResponse,
} from "cloudinary";
import streamifier from "streamifier";

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_KEY,
  api_secret: process.env.CLOUD_SECRET,
});

console.log("Cloudinary config:", {
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_KEY ? "SET" : "MISSING",
  api_secret: process.env.CLOUD_SECRET ? "SET" : "MISSING",
});

export const streamUpload = async (
  buffer: Buffer,
  folder: string = "uploads"
): Promise<UploadApiResponse> => {
  if (!buffer || buffer.length === 0) {
    throw new Error("Buffer không hợp lệ hoặc rỗng");
  }

  console.log("📦 Kích thước file:", (buffer.length / 1024 / 1024).toFixed(2), "MB");

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "auto",
        timeout: 180000, // 3 phút
      },
      (error?: UploadApiErrorResponse, result?: UploadApiResponse) => {
        if (error) {
          console.error("❌ Cloudinary error:", error);
          reject(error);
        } else if (result) {
          console.log("✅ Upload thành công:", result.secure_url);
          resolve(result);
        } else {
          reject(new Error("Không nhận được phản hồi từ Cloudinary"));
        }
      }
    );

    uploadStream.on("finish", () => console.log("📤 Stream hoàn tất gửi dữ liệu"));
    uploadStream.on("error", (err) => {
      console.error("⚠️ Lỗi stream:", err);
      reject(err);
    });

    // Pipe dữ liệu
    streamifier.createReadStream(buffer).pipe(uploadStream);
  });
};


export const uploadToCloudinaryWithTags= (
  buffer: Buffer
): Promise<{ url: string; tags: string[] }> => {
  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        {
          resource_type: "image",
          auto_tagging: 0.75,
          categorization: "google_tagging",
          max_results: 5,
        },
        (error, result) => {
          if (error || !result) return reject(error || new Error("Upload failed"));
          const tags = (result.tags || []).map((t: string) =>
            t.toLowerCase().trim()
          );
          resolve({
            url: result.secure_url,
            tags,
          });
        }
      )
      .end(buffer);
  });
};