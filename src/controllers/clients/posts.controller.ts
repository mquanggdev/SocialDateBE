// controllers/clients/posts.controller.ts
import { Request, Response } from "express";
import mongoose from "mongoose";
import { PostModel } from "../../models/posts.model";
import { UserModel } from "../../models/users.model";
import { detectNSFW } from "../../utils/ai";
import { uploadToCloudinaryWithTags } from "../../helpers/streamUpload.helper";

// controllers/clients/posts.controller.ts
export const getPosts = async (req: Request, res: Response) => {
  try {
    // === 1. Xác thực user ===
    if (!req.user?.id) {
      return res.status(401).json({ success: false, message: "Thiếu thông tin người dùng" });
    }

    const myId = new mongoose.Types.ObjectId(req.user.id);

    // === 2. Query params ===
    const {
      type = "all",
      search = "",
      tags = "",
      limit = "10",
      skip = "0",
    } = req.query;

    const limitNum = Math.min(parseInt(limit as string, 10) || 10, 50);
    const skipNum = parseInt(skip as string, 10) || 0;

    // === 3. Lấy danh sách bạn bè ===
    const myUser = await UserModel.findById(myId).select("friends");
    if (!myUser) {
      return res.status(404).json({ success: false, message: "User không tồn tại" });
    }

    const friendIds = Array.isArray(myUser.friends)
      ? myUser.friends.map(id => new mongoose.Types.ObjectId(id.toString()))
      : [];

    // === 4. Tìm kiếm theo tên (nếu có) ===
    let searchUserIds = [];
    if (search) {
      const users = await UserModel.find({
        _id: { $in: [myId, ...friendIds] },
        full_name: { $regex: search as string, $options: "i" },
      }).select("_id");
      searchUserIds = users.map(u => u._id);
    }

    // === 5. Lọc theo tags ===
    let tagFilter: any = {};
    if (tags) {
      const tagArray = (tags as string)
        .split(",")
        .map(t => t.trim())
        .filter(Boolean);
      if (tagArray.length > 0) {
        tagFilter = { tags: { $in: tagArray } };
      }
    }

    // === 6. Xây query ===
    let query: any = {
      deleted: false,
      ...tagFilter,
    };

    if (searchUserIds.length > 0) {
      query.user_id = { $in: searchUserIds };
    } else if (type === "myself") {
      query.user_id = myId;
    } else if (type === "friends") {
      query.user_id = { $in: friendIds };
    } else {
      query.user_id = { $in: [myId, ...friendIds] };
    }

    // === 7. Lấy bài viết ===
    const posts = await PostModel.find(query)
      .populate("user_id", "full_name avatar_url")
      .sort({ created_at: -1 })
      .skip(skipNum)
      .limit(limitNum)
      .exec();

    // === 8. CHUYỂN ĐỔI THEO ĐÚNG TYPE FE MỚI ===
    const data = posts.map((post: any) => {
      const user = post.user_id;
      const isOwner = user._id.toString() === myId.toString();

      // Chỉ chủ bài thấy danh sách ID thả tim
      const heartIds: string[] = isOwner
        ? (post.reactions?.heart || []).map((id: any) => id.toString())
        : [];

      return {
        _id: post._id.toString(),
        user_id: {
          _id: user._id.toString(),
          full_name: user.full_name || "Người dùng",
          avatar_url: user.avatar_url || "",
          status: "offline" as const, // Không có status → mặc định
        },
        image_url: post.image_url,
        status: post.status || "",
        tags: post.tags || [],
        reactions: {
          heart: heartIds,
          heart_count: (post.reactions?.heart || []).length,
        },
        created_at: new Date(post.created_at).toISOString(),
      };
    });

    // === 9. Tính hasMore ===
    const total = await PostModel.countDocuments(query);

    // === 10. Trả về đúng GetPostsResponse ===
    return res.status(200).json({
      success: true,
      message: "Lấy danh sách bài viết thành công",
      total,
      data,
      hasMore: skipNum + limitNum < total,
    });

  } catch (error: any) {
    console.error("Lỗi getPosts:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi server",
      error: error.message,
    });
  }
};
export const createPost = async (req: Request, res: Response) => {
  try {
    const myId = new mongoose.Types.ObjectId(req.user.id);
    const { status } = req.body;

    if (!req.file?.buffer) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng tải lên một ảnh hợp lệ.",
      });
    }

    const imageBuffer = req.file.buffer;

    // NSFW Detection
    let isNSFW = false;
    try {
      isNSFW = await detectNSFW(imageBuffer);
      if (isNSFW) {
  return res.status(400).json({
          success: false,
          message: "Hình ảnh chứa nội dung không phù hợp.",
        });
      }
    } catch (error: any) {
      console.warn("NSFW detection failed:", error.message);
    }

    // Upload + Tags
    let imageUrl: string;
    let tags: string[] = [];
    try {
      const result = await uploadToCloudinaryWithTags(imageBuffer);
      imageUrl = result.url;
      tags = result.tags;
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: "Lỗi upload ảnh.",
        error: error.message,
      });
    }

    // Tạo bài
    const newPost = new PostModel({
      user_id: myId,
      image_url: imageUrl,
      status: status?.trim() || "",
      tags,
    });

    await newPost.save();

    // Populate
    const populatedPost = await PostModel.findById(newPost._id)
      .populate("user_id", "full_name avatar_url")
      .exec();

    if (!populatedPost) throw new Error("Không lấy được bài viết");

    const user = populatedPost.user_id as any;

    const postResponse = {
      _id: populatedPost._id.toString(),
      user_id: {
        _id: user._id.toString(),
        full_name: user.full_name || "Người dùng",
        avatar_url: user.avatar_url || "",
        status: "offline" as const,
      },
      image_url: populatedPost.image_url,
      status: populatedPost.status || "",
      tags: populatedPost.tags || [],
      created_at: populatedPost.created_at.toISOString(),
    };

    return res.status(201).json({
      success: true,
      message: "Đăng bài thành công!",
      data: postResponse,
    });

  } catch (error: any) {
    console.error("Lỗi createPost:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi server",
      error: error.message,
    });
  }
};


export const deletePost = async (req: Request, res: Response) => {
  try {
    const { postId } = req.params;
    const myId = new mongoose.Types.ObjectId(req.user.id);

    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({ success: false, message: "ID bài viết không hợp lệ" });
    }

    const post = await PostModel.findById(postId);
    if (!post) {
      return res.status(404).json({ success: false, message: "Bài viết không tồn tại" });
    }

    // CHỈ CHỦ BÀI MỚI ĐƯỢC XÓA
    if (post.user_id.toString() !== myId.toString()) {
      return res.status(403).json({ success: false, message: "Bạn không có quyền xóa bài này" });
    }

    // SOFT DELETE
    post.deleted = true;
    await post.save();

    return res.status(200).json({
      success: true,
      message: "Xóa bài viết thành công",
    });
  } catch (error: any) {
    console.error("Lỗi deletePost:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi server",
      error: error.message,
    });
  }
};