import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

interface JwtPayload {
  _id: string;
  email: string;
}

export const authMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        status: 401,
        message: "Thiếu hoặc sai định dạng token!",
      });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(
      token,
      process.env.ACCESS_PRIVATE_KEY || "secret_key"
    ) as JwtPayload;

    // Gắn vào req.user với kiểu rõ ràng
    req.user = { id: decoded._id, email: decoded.email };

    next();
  } catch (error: any) {
    console.error("❌ Token không hợp lệ:", error);
    res.status(401).json({
      status: 401,
      message: "Token không hợp lệ hoặc đã hết hạn!",
      error: error.message,
    });
  }
};
