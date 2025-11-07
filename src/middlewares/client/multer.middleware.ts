import multer from "multer";
import path from "path";

// === CẤU HÌNH MULTER ===
const storage = multer.memoryStorage();

const fileFilter = (
  req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const allowedExt = [".jpg", ".jpeg", ".png", ".webp"];
  if (!allowedExt.includes(ext)) {
    return cb(new Error("Chỉ chấp nhận file ảnh (.jpg, .jpeg, .png, .webp)"));
  }
  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
});

// === WRAPPER: DÙNG CHO ROUTE ===
export const uploadSingleImage = (fieldName: string) => {
  const middleware = upload.single(fieldName);

  return (req: any, res: any, next: any) => {
    middleware(req, res, (err: any) => {
      if (err instanceof multer.MulterError) {
        // Lỗi của Multer (vd: vượt dung lượng)
        return res.status(400).json({
          success: false,
          message: err.code === "LIMIT_FILE_SIZE"
            ? "Ảnh vượt quá kích thước cho phép (5MB)"
            : `Lỗi upload file: ${err.message}`,
        });
      } else if (err) {
        // Lỗi khác (vd: fileFilter)
        return res.status(400).json({
          success: false,
          message: err.message || "Lỗi không xác định khi upload file",
        });
      }
      next();
    });
  };
};
