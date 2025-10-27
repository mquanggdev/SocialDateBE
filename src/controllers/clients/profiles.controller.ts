import { Request, Response } from "express";
import { UserModel } from "../../models/users.model";

interface AuthenticatedRequest extends Request {
  user?: { id: string; email: string }; // Định nghĩa kiểu cho req.user
}

export const profileGET = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id, email } = req.user || {};

    if (!id || !email) {
      return res.status(401).json({
        status: 401,
        message: "Không tìm thấy thông tin xác thực người dùng",
      });
    }

    const user = await UserModel.findOne(
      { _id: id, email },
      { password: 0, __v: 0 }
    ).lean();

    if (!user) {
      return res.status(404).json({
        status: 404,
        message: "Không tìm thấy người dùng",
      });
    }

    // Normalize match_preferences
    user.match_preferences = {
      gender: user.match_preferences?.gender ?? "other",
      age_range: user.match_preferences?.age_range ?? { min: 18, max: 50 },
      distance_km: user.match_preferences?.distance_km ?? 50,
      interests: user.match_preferences?.interests ?? [],
      location_preference: user.match_preferences?.location_preference ?? "",
    };

    return res.status(200).json({
      status: 200,
      message: "Tải hồ sơ thành công",
      user: user,
    });
  } catch (error) {
    console.error("Lỗi khi tải hồ sơ:", error);
    return res.status(500).json({
      status: 500,
      message: "Lỗi server: Không thể tải hồ sơ",
    });
  }
};

export const profileUPDATE = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const { id, email } = req.user || {};

    if (!id || !email) {
      return res.status(401).json({
        status: 401,
        message: "Không tìm thấy thông tin xác thực người dùng",
      });
    }

    // Parse user field from FormData
    let updateData: any = {};
    if (req.body.user) {
      try {
        updateData = JSON.parse(req.body.user);
      } catch (error) {
        return res.status(400).json({
          status: 400,
          message: "Dữ liệu user không hợp lệ",
        });
      }
    }

    const user = await UserModel.findOne({ _id: id, email });
    if (!user) {
      return res.status(404).json({
        status: 404,
        message: "Không tìm thấy người dùng",
      });
    }

    // Update direct fields
    const directFields: (keyof typeof updateData)[] = [
      "full_name",
      "birthday",
      "avatar_url",
      "address",
      "phone",
      "bio",
      "interests",
      "gender",
      "location",
    ];

    for (const field of directFields) {
      if (updateData[field] !== undefined) {
        (user as any)[field] = updateData[field];
      }
    }
    if (req.body.avatar_url) {
      user.avatar_url = req.body.avatar_url;
    }

    // Update match_preferences
    if (updateData.match_preferences) {
      user.match_preferences = {
        gender:
          updateData.match_preferences.gender ??
          user.match_preferences?.gender ??
          "other",
        age_range: updateData.match_preferences.age_range ??
          user.match_preferences?.age_range ?? { min: 18, max: 50 },
        distance_km:
          updateData.match_preferences.distance_km ??
          user.match_preferences?.distance_km ??
          50,
        interests:
          updateData.match_preferences.interests ??
          user.match_preferences?.interests ??
          [],
        location_preference:
          updateData.match_preferences.location_preference ??
          user.match_preferences?.location_preference ??
          "",
      };
    }

    // Save changes
    await user.save();

    // Return updated user
    const updatedUser = await UserModel.findOne(
      { _id: id, email },
      { password: 0, __v: 0 }
    ).lean();

    if (!updatedUser) {
      return res.status(404).json({
        status: 404,
        message: "Không tìm thấy người dùng sau khi cập nhật",
      });
    }

    // Normalize match_preferences in response
    updatedUser.match_preferences = {
      gender: updatedUser.match_preferences?.gender ?? "other",
      age_range: updatedUser.match_preferences?.age_range ?? {
        min: 18,
        max: 50,
      },
      distance_km: updatedUser.match_preferences?.distance_km ?? 50,
      interests: updatedUser.match_preferences?.interests ?? [],
      location_preference:
        updatedUser.match_preferences?.location_preference ?? "",
    };

    return res.status(200).json({
      status: 200,
      message: "Cập nhật hồ sơ thành công",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Lỗi khi cập nhật hồ sơ:", error);
    return res.status(500).json({
      status: 500,
      message: "Lỗi server: Không thể cập nhật hồ sơ",
    });
  }
};
