import { Request, Response, NextFunction } from "express";

export const validateAuth = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { email, password } = req.body;

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // ⚙️ Kiểm tra mật khẩu:
  // - ít nhất 8 ký tự
  // - có chữ thường, chữ hoa, chữ số, ký tự đặc biệt
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;

  // 🧩 Kiểm tra email
  if (!email || !emailRegex.test(email) || email.length > 60) {
    return res.status(400).json({
      status: 400,
      message:
        "Email không hợp lệ hoặc vượt quá 60 ký tự! Vui lòng nhập đúng định dạng email.",
    });
  }

  // 🧩 Kiểm tra mật khẩu
  if (
    !password ||
    !passwordRegex.test(password) ||
    password.length > 30
  ) {
    return res.status(400).json({
      status: 400,
      message:
        "Mật khẩu phải có ít nhất 8 ký tự, bao gồm chữ hoa, chữ thường, số, ký tự đặc biệt và không vượt quá 30 ký tự.",
    });
  }

  next();
};
