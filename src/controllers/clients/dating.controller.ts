// controllers/clients/dating.controller.ts
import { Request, Response } from "express";
import { UserModel } from "../../models/users.model";
import { MatchModel } from "../../models/matches.model";
import { LikeModel } from "../../models/like.model";
import { RoomChatModel, IRoomChat } from "../../models/room-chat.model";
import { IMessage } from "../../models/messages.model";
import mongoose from "mongoose";

interface PopulatedRoomChat extends Omit<IRoomChat, "last_message"> {
  last_message?: IMessage | null; // last_message là IMessage sau khi populate
}

export const getDatingCandidates = async (req: Request, res: Response) => {
  try {
    const user = await UserModel.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const myInterests = user.interests || [];
    const myGender = user.gender;
    const oppositeGender =
      myGender === "male" ? "female" : myGender === "female" ? "male" : "other";

    const blockedIds = [
      ...user.friends,
      ...user.request_to_friend,
      ...user.request_to_me,
      user._id,
    ];

    const candidates = await UserModel.aggregate([
      {
        $match: {
          _id: { $nin: blockedIds.map((id) => id) },
          gender: oppositeGender,
          is_dating: false,
        },
      },
      {
        $addFields: {
          similarity: {
            $let: {
              vars: { myInts: myInterests },
              in: {
                $cond: {
                  if: { $eq: [{ $size: "$$myInts" }, 0] },
                  then: 0,
                  else: {
                    $round: [
                      {
                        $multiply: [
                          100,
                          {
                            $divide: [
                              {
                                $size: {
                                  $setIntersection: ["$interests", "$$myInts"],
                                },
                              },
                              { $size: "$$myInts" },
                            ],
                          },
                        ],
                      },
                      0,
                    ],
                  },
                },
              },
            },
          },
        },
      },
      { $match: { similarity: { $gte: 30 } } },
      { $sort: { similarity: -1 } },
      { $limit: 50 },
      {
        $project: {
          full_name: 1,
          gender: 1,
          birthday: 1,
          address: 1,
          bio: 1,
          interests: { $slice: ["$interests", 10] },
          similarity: 1,
        },
      },
    ]);

    // Kiểm tra ai đã like mình (hiển thị "Người này đã thích bạn")
    const likedMe = await LikeModel.find({ to_user: user._id }).select(
      "from_user"
    );
    const likedMeIds = likedMe.map((l) => l.from_user.toString());
    const myPendingTarget = user.pending_like_target?.toString();

    const result = candidates.map((c) => ({
      ...c,
      _id: c._id.toString(),
      liked_me: likedMeIds.includes(c._id.toString()),
      is_my_pending: c._id.toString() === myPendingTarget,
    }));

    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

export const likeUser = async (req: Request, res: Response) => {
  try {
    const fromUserId = req.user.id;
    const { targetId } = req.body;

    if (!targetId) return res.status(400).json({ message: "Missing targetId" });

    if (fromUserId === targetId)
      return res.status(400).json({ message: "Cannot like yourself" });

    const fromId = new mongoose.Types.ObjectId(fromUserId);
    const toId = new mongoose.Types.ObjectId(targetId);

    const currentUser = await UserModel.findById(fromId);

    // Đang pending một người khác → cấm like
    if (
      currentUser?.pending_like_target &&
      currentUser.pending_like_target.toString() !== targetId
    ) {
      return res.status(400).json({
        message:
          "Bạn đang chờ phản hồi từ người khác. Hãy hủy like trước khi thích người mới!",
        pending_target: currentUser.pending_like_target.toString(),
      });
    }

    // Kiểm tra đã từng like chưa
    const existingLike = await LikeModel.findOne({
      from_user: fromId,
      to_user: toId,
    });

    if (!existingLike) {
      await LikeModel.create({ from_user: fromId, to_user: toId });
    }

    // Lưu pending
    await UserModel.updateOne({ _id: fromId }, { pending_like_target: toId });

    // Kiểm tra like ngược
    const reverseLike = await LikeModel.findOne({
      from_user: toId,
      to_user: fromId,
    });

    if (!reverseLike) {
      return res.json({ match: false });
    }

    // MATCH HAPPENS
    const room = await RoomChatModel.create({
      participants: [fromId, toId],
      type: "match",
      expired_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    const uid1 = fromId.toString();
    const uid2 = toId.toString();

    const user1 = uid1 < uid2 ? fromId : toId;
    const user2 = uid1 < uid2 ? toId : fromId;

    const match = await MatchModel.create({
      user1_id: user1,
      user2_id: user2,
      status: "pending",
      chat_room_id: room._id,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
    await LikeModel.deleteMany({
      $or: [
        { from_user: fromId, to_user: toId },
        { from_user: toId, to_user: fromId },
      ],
    });

    // Reset pending cho cả 2 user
    await UserModel.updateMany(
      { _id: { $in: [fromId, toId] } },
      { current_match: match._id, $unset: { pending_like_target: "" } }
    );

    return res.json({
      match: true,
      match_id: match._id,
      room_id: room._id,
    });
  } catch (error: any) {
    console.error("Like error:", error);
    res.status(500).json({ message: error.message });
  }
};

export const unlikeUser = async (req: Request, res: Response) => {
  try {
    const userId = req.user.id;
    const { targetId } = req.body;

    if (!targetId) return res.status(400).json({ message: "Missing targetId" });

    const user = await UserModel.findById(userId);

    // Không cho un-like lung tung
    if (
      user?.pending_like_target &&
      user.pending_like_target.toString() !== targetId
    ) {
      return res.status(400).json({
        message: "Bạn không pending người này nên không thể hủy.",
      });
    }

    // Xóa like 1 chiều
    await LikeModel.deleteOne({
      from_user: userId,
      to_user: targetId,
    });

    // Xóa pending
    await UserModel.updateOne(
      { _id: userId },
      { $unset: { pending_like_target: "" } }
    );

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

export const getCurrentMatchChat = async (req: Request, res: Response) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.id);

    // 1. Tìm match của user
    const match = await MatchModel.findOne({
      status: { $in: ["pending", "accepted"] },
      $or: [{ user1_id: userId }, { user2_id: userId }],
    })
      .populate("user1_id user2_id", "full_name")
      .lean();

    if (!match) return res.json(null);

    // 2. Xác định partner
    const isUser1 = match.user1_id._id.toString() === userId.toString();
    const partnerId = isUser1 ? match.user2_id : match.user1_id;
    const partner = await UserModel.findById(partnerId).select(
      "full_name status"
    );

    // 3. Xác định trạng thái accept
    const my_accept = isUser1 ? match.user1_accept : match.user2_accept;
    const partner_accept = isUser1 ? match.user2_accept : match.user1_accept;

    // Lấy danh sách phòng chat
    const room = await RoomChatModel.findById(match.chat_room_id)
      .populate<{ last_message: IMessage | null }>("last_message") // Chỉ định kiểu cho last_message
      .lean();

    const data = {
      match_id: match._id,
      room_id: match.chat_room_id,
      partner: {
        _id: partner._id,
        full_name: partner.full_name,
        status: partner.status,
      },
      last_message: room.last_message
        ? {
            _id: room.last_message._id.toString(),
            room_id: room.last_message.room_id.toString(),
            sender_id: room.last_message.sender_id.toString(),
            receiver_id: room.last_message.receiver_id.toString(),
            content: room.last_message.content,
            image_url: room.last_message.image_url,
            type: room.last_message.type,
            is_read: room.last_message.is_read,
            timestamp: room.last_message.timestamp,
          }
        : null,
      status: match.status,
      expires_at : match.expires_at,
      my_accept,
      partner_accept,
      both_accepted: match.status === "accepted",
    };
    // 4. Trả về thông tin match
    res.json({
      data,
    });
  } catch (err: any) {
    console.error("getCurrentMatchChat error:", err);
    res.status(500).json({ message: err.message });
  }
};

export const acceptMatch = async (req: Request, res: Response) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.id);

    const match = await MatchModel.findOne({
      status: "pending",
      $or: [{ user1_id: userId }, { user2_id: userId }],
    });

    if (!match) return res.status(404).json({ message: "No pending match" });

    const isUser1 = match.user1_id.toString() === userId.toString();

    if (isUser1) match.user1_accept = true;
    else match.user2_accept = true;

    const bothAccept = match.user1_accept && match.user2_accept;

    // --- Khi cả hai cùng accept ---
    if (bothAccept) {
      match.status = "accepted";

      const partnerId = isUser1 ? match.user2_id : match.user1_id;

      // Cập nhật trạng thái hẹn hò
      await UserModel.updateOne(
        { _id: userId},
        {
          is_dating: true,
          dating_partner: partnerId,
          $addToSet: { friends: partnerId },
          current_match: null,
        }
      );
      await UserModel.updateOne(
        { _id: partnerId},
        {
          is_dating: true,
          dating_partner: userId,
          $addToSet: { friends: userId },
          current_match: null,
        }
      );

      // Chuyển room match → friend room
      await RoomChatModel.updateOne(
        { _id: match.chat_room_id },
        {
          type: "friend",
          $unset: { expired_at: "" },
        }
      );

      await MatchModel.deleteOne({ _id: match._id });
    }

    await match.save();

    res.json({ success: true, bothAccept });
  } catch (err: any) {
    console.error("acceptMatch error:", err);
    res.status(500).json({ message: err.message });
  }
};

export const rejectMatch = async (req: Request, res: Response) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.id);

    const match = await MatchModel.findOneAndUpdate(
      {
        status: "pending",
        $or: [{ user1_id: userId }, { user2_id: userId }],
      },
      { status: "rejected" },
      { new: true }
    );

    if (match) {
      await UserModel.updateMany(
        { _id: { $in: [match.user1_id, match.user2_id] } },
        { current_match: null }
      );

      // Xoá room match vì đã reject
      await RoomChatModel.deleteOne({ _id: match.chat_room_id });

      await MatchModel.deleteOne({ _id: match._id });
    }

    res.json({ success: true });
  } catch (err: any) {
    console.error("rejectMatch error:", err);
    res.status(500).json({ message: err.message });
  }
};

export const cancelDating = async (req: Request, res: Response) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.id);
    const user = await UserModel.findById(userId);

    if (!user?.is_dating)
      return res.status(400).json({ message: "Not dating" });

    const partnerId = user.dating_partner;

    // Reset trạng thái hẹn hò
    await UserModel.updateOne(
      { _id: userId },
      {
        is_dating: false,
        $unset: { dating_partner: "" },
        $pull: { friends: partnerId },
      }
    );
    await UserModel.updateOne(
      { _id: partnerId },
      {
        is_dating: false,
        $unset: { dating_partner: "" },
        $pull: { friends: userId },
      }
    );

    // Xoá tất cả match giữa 2 người
    await MatchModel.deleteMany({
      $or: [
        { user1_id: userId, user2_id: partnerId },
        { user1_id: partnerId, user2_id: userId },
      ],
    });

    // Xoá room chat friend
    await RoomChatModel.deleteMany({
      participants: { $all: [userId, partnerId] },
      type: "friend",
    });

    await LikeModel.deleteMany({
      $or: [
        { from_user: userId, to_user: partnerId },
        { from_user: partnerId, to_user: userId },
      ],
    });

    res.json({ success: true });
  } catch (err: any) {
    console.error("cancelDating error:", err);
    res.status(500).json({ message: err.message });
  }
};
