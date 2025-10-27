import { Request, Response, NextFunction } from "express";
import { streamUpload } from "../../helpers/streamUpload.helper";

// ✅ Tự mở rộng interface Request ngay trong file này
interface MulterRequest extends Request {
  file?: Express.Multer.File;
}

/**
 * Middleware upload 1 file duy nhất lên Cloudinary.
 * Nếu có req.file thì upload và gán link vào req.body[fieldname].
 */
export const uploadSingle = async (
  req: MulterRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (req.file) {
      const result = await streamUpload(req.file.buffer);
      req.body[req.file.fieldname] = result.url;
    }
    next();
  } catch (error) {
    next(error);
  }
};
