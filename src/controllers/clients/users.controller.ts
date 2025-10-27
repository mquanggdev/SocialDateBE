import { Request, Response } from "express";
import md5 from "md5";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { z } from "zod";
import { UserModel } from "../../models/users.model";
import { generateRandomNumber } from "../../helpers/generate.helper";
import { sendEmail } from "../../helpers/sendEmail.helper";
import { ForgotPasswordModel } from "../../models/forgot-password.model";


// POST /users/login
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Tìm người dùng
    const user = await UserModel.findOne({ email }).select('+password');
    if (!user) {
      return res.status(404).json({
        status: 404,
        message: 'Email không tồn tại',
      });
    }

    // So sánh mật khẩu
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        status: 401,
        message: 'Mật khẩu không chính xác',
      });
    }

    // Kiểm tra khóa bí mật JWT
    const jwtSecret = process.env.ACCESS_PRIVATE_KEY;
    if (!jwtSecret) {
      console.error('Khóa bí mật JWT không được cấu hình');
      return res.status(500).json({
        status: 500,
        message: 'Lỗi server: Cấu hình không hợp lệ',
      });
    }

    // Cập nhật trạng thái người dùng
    user.last_active = new Date();
    user.status = 'online';
    await user.save();

    // Tạo JWT token
    const token = jwt.sign(
      { _id: user._id, email: user.email },
      jwtSecret,
      { expiresIn: '7d' }
    );

    // Trả về thông tin người dùng
    const userResponse = {
      _id: user._id,
      email: user.email,
      full_name: user.full_name,
      birthday: user.birthday,
      address: user.address,
      phone: user.phone,
      gender: user.gender,
      avatar_url: user.avatar_url,
      bio: user.bio,
      interests: user.interests,
      match_preferences: user.match_preferences,
      location: user.location,
      friends:user.friends,
      request_to_friend:user.request_to_friend,
      request_to_me:user.request_to_me,
      status: user.status,
      last_active: user.last_active,
      created_at: user.created_at,
      updated_at: user.updated_at,
    };

    return res.status(200).json({
      status: 200,
      message: 'Đăng nhập thành công',
      user: userResponse,
      token,
    });
  } catch (error) {
    console.error('Lỗi khi đăng nhập:', error);
    return res.status(500).json({
      status: 500,
      message: 'Lỗi server: Không thể đăng nhập',
    });
  }
};

// POST /users/register
export const register = async (req: Request, res: Response) => {
  try {
    const {
      email,
      password,
      full_name = `User${Date.now()}`,
      birthday = '1970-01-01',
      address = 'Vietnam',
      phone = '0000000000',
      gender = 'other',
      avatar_url = 'default-avatar.jpg',
      bio = '',
      interests = [],
      match_preferences = {
        gender: 'other',
        age_range: { min: 18, max: 50 },
        distance_km: 50,
        interests: [],
        location_preference: '',
      },
      location = { type: 'Point', coordinates: [0, 0] },
    } = req.body;

    // Kiểm tra email đã tồn tại
    const existingUser = await UserModel.findOne({ email }).lean();
    if (existingUser) {
      return res.status(400).json({
        status: 400,
        message: 'Email đã được đăng ký trước đó',
      });
    }

    // Mã hóa mật khẩu
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Tạo người dùng mới
    const newUser = new UserModel({
      email,
      password: hashedPassword,
      full_name,
      birthday,
      address,
      phone,
      gender,
      avatar_url,
      bio,
      interests,
      match_preferences,
      location,
      friends: [],
      request_to_friend:[],
      request_to_me : [],
      current_match: null,
      ready_to_match: { 
        is_ready: false,
        requested_at: null,
        max_wait_time: 3600,
      },
      status: 'online',
      last_active: new Date(),
      created_at: new Date(),
      updated_at: new Date(),
    });

    // Lưu người dùng
    await newUser.save();

  
    const userResponse = {
      _id: newUser._id,
      email: newUser.email,
      full_name: newUser.full_name,
      birthday: newUser.birthday,
      address: newUser.address,
      phone: newUser.phone,
      gender: newUser.gender,
      avatar_url: newUser.avatar_url,
      bio: newUser.bio,
      interests: newUser.interests,
      match_preferences: newUser.match_preferences,
      location: newUser.location,
      friends:newUser.friends,
      request_to_friend:newUser.request_to_friend,
      request_to_me:newUser.request_to_me,
      status: newUser.status,
      created_at: newUser.created_at,
      updated_at: newUser.updated_at,
    };

    return res.status(201).json({
      status: 201,
      message: 'Đăng ký thành công',
      user: userResponse,
    });
  } catch (error) {
    console.error('Lỗi khi đăng ký:', error);
    return res.status(500).json({
      status: 500,
      message: 'Lỗi server: Không thể đăng ký',
    });
  }
};

// POST/users/password/forgot
export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email || typeof email !== "string" || email.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhập email hợp lệ!",
      });
    }

    const user = await UserModel.findOne({
      email: email,
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Email không tồn tại trong hệ thống!",
      });
    }
    // Generate OTP và expire time
    const otp = generateRandomNumber(6);
    const expireAt = Date.now() + 3 * 60 * 1000; // 3 phút

    const objectOtp = {
      email: email.trim(),
      otp,
      expireAt,
    };

    // Gửi OTP qua email (async)
    const subject = "Mã OTP lấy lại mật khẩu.";
    const htmlSendMail = `Mã OTP xác thực của bạn là <b style="color: green;">${otp}</b>. Mã OTP có hiệu lực trong 3 phút. Vui lòng không cung cấp mã OTP cho người khác.`;
    await sendEmail(email.trim(), subject, htmlSendMail);

    // Lưu vào DB
    const newObjectForgotPassword = new ForgotPasswordModel(objectOtp);
    await newObjectForgotPassword.save();

    // Success response
    res.status(200).json({
      success: true,
      message: "Mã OTP đã được gửi qua email! Vui lòng kiểm tra hộp thư.",
    });
  } catch (error) {
    console.error("❌ Lỗi khi gửi:", error);
    return res.status(500).json({
      status: 500,
      message: "Đã xảy ra lỗi máy chủ!",
      error: error.message,
    });
  }
};
// POST/users/password/otp
export const enterOtp = async (req: Request, res: Response) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: "Thiếu email hoặc OTP!" });
    }

    const record = await ForgotPasswordModel.findOne({ email, otp });

    if (!record) {
      return res.status(400).json({ message: "OTP không hợp lệ!" });
    }

    if (record.expire_at < new Date()) {
      return res.status(400).json({ message: "OTP đã hết hạn!" });
    }

    // ✅ Sinh token tạm cho reset password
    const resetToken = jwt.sign({ email }, process.env.ACCESS_PRIVATE_KEY!, {
      expiresIn: "10m", // chỉ sống 10 phút
    });

    return res.status(200).json({
      message: "OTP hợp lệ!",
      resetToken,
    });
  } catch (error: any) {
    console.error("❌ Lỗi khi xác thực OTP:", error);
    return res.status(500).json({
      status: 500,
      message: "Đã xảy ra lỗi máy chủ!",
      error: error.message,
    });
  }
};
//PATCH/users/password/reset
export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { newPassword, token } = req.body;

    if (!newPassword || !token) {
      return res
        .status(400)
        .json({ message: "Thiếu mật khẩu mới hoặc token!" });
    }

    // ✅ Giải mã token để lấy email
    const decoded = jwt.verify(token, process.env.ACCESS_PRIVATE_KEY!) as {
      email: string;
    };

    const user = await UserModel.findOne({ email: decoded.email });

    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy người dùng!" });
    }

    // ✅ Hash mật khẩu mới
    user.password = md5(newPassword);
    await user.save();

    return res.status(200).json({ message: "Đặt lại mật khẩu thành công!" });
  } catch (err: any) {
    console.error("Lỗi khi reset password:", err);
    if (err.name === "TokenExpiredError") {
      return res
        .status(401)
        .json({ message: "Token đã hết hạn, vui lòng xác minh OTP lại!" });
    }
    return res.status(500).json({
      message: "Lỗi hệ thống khi đặt lại mật khẩu!",
      error: err.message,
    });
  }
};

// GET /users/me
export const currentUser = async (req: Request, res: Response) => {
  try {
    // ✅ Kiểm tra userId từ middleware xác thực
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        message: "Không có thông tin xác thực người dùng!",
      });
    }

    // ✅ Truy vấn user theo ID
    const user = await UserModel.findById(userId).select("-password"); // bỏ password

    if (!user) {
      return res.status(404).json({
        message: "Không tìm thấy người dùng!",
      });
    }

    // ✅ Thành công
    return res.status(200).json({
      message: "Lấy thông tin người dùng thành công!",
      user,
    });
  } catch (err: any) {
    console.error("Lỗi khi lấy thông tin người dùng:", err);
    return res.status(500).json({
      message: "Lỗi hệ thống khi lấy thông tin người dùng!",
      error: err.message,
    });
  }
};
