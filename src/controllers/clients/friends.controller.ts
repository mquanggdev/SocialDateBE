import { Request, Response } from "express";
import { UserModel } from "../../models/users.model";
import { RoomChatModel } from "../../models/room-chat.model";

// GET /friends/list-recomendation
export const listRecomendation = async (req: Request, res: Response) => {
  try {
    const { id } = req.user;

    // Lấy thông tin người dùng hiện tại để loại trừ bạn bè và lời mời
    const currentUser = await UserModel.findById(id).select(
      "friends request_to_me request_to_friend"
    );

    if (!currentUser) {
      return res.status(404).json({
        status: 404,
        message: "Không tìm thấy người dùng hiện tại!",
      });
    }

    // Lấy danh sách người dùng gợi ý
    const listPerson = await UserModel.find({
      $and: [
        { _id: { $ne: id } },
        { _id: { $nin: currentUser.request_to_me } },
        { _id: { $nin: currentUser.request_to_friend } },
        { _id: { $nin: currentUser.friends } },
      ],
    })
      .select("full_name avatar_url status") // Chỉ lấy các trường cần thiết
      .limit(10); // Giới hạn 10 gợi ý

    res.status(200).json({
      status: 200,
      message: "Lấy danh sách người dùng gợi ý thành công!",
      listPerson,
    });
  } catch (error: any) {
    console.error("❌ Lỗi lấy danh sách gợi ý:", error);
    res.status(500).json({
      status: 500,
      message: "Lỗi server khi lấy danh sách gợi ý!",
      error: error.message,
    });
  }
};

export const listFriends = async (req: Request, res: Response) => {
  try {
    const { id } = req.user;

    const currentUser = await UserModel.findById(id).select("friends");
    if (!currentUser) {
      return res.status(404).json({
        status: 404,
        message: "Không tìm thấy người dùng hiện tại!",
      });
    }

    const listPerson = await UserModel.find({
      _id: { $in: currentUser.friends },
    })
      .select("full_name email avatar_url status")
      .limit(50)
      .lean();

    // Lấy roomChat cho mỗi bạn bè
    const roomChats = await RoomChatModel.find({
      type: "friend",
      participants: {$all : [id]},
    }).lean();

    const usersWithRoomChat = listPerson.map((user) => {
      const roomChat = roomChats.find((rc) =>
        rc.participants.some((p: any) => p.toString() === user._id)
      );
      return { ...user, roomChat: roomChat ? roomChat._id : null };
    });

    res.status(200).json({
      status: 200,
      message: "Lấy danh sách bạn bè thành công!",
      listPerson: usersWithRoomChat,
    });
  } catch (error: any) {
    console.error("❌ Lỗi lấy danh sách bạn bè:", error);
    res.status(500).json({
      status: 500,
      message: "Lỗi server khi lấy danh sách bạn bè!",
      error: error.message,
    });
  }
};


// GET /friends/requests
export const listFriendRequests = async (req: Request, res: Response) => {
  try {
    const { id } = req.user;

    const currentUser = await UserModel.findById(id).select("request_to_me");
    if (!currentUser) {
      return res.status(404).json({
        status: 404,
        message: "Không tìm thấy người dùng hiện tại!",
      });
    }

    const listPerson = await UserModel.find({
      _id: { $in: currentUser.request_to_me },
    })
      .select("full_name email avatar_url status")
      .limit(50);

    res.status(200).json({
      status: 200,
      message: "Lấy danh sách lời mời kết bạn thành công!",
      listPerson,
    });
  } catch (error: any) {
    console.error("❌ Lỗi lấy danh sách lời mời:", error);
    res.status(500).json({
      status: 500,
      message: "Lỗi server khi lấy danh sách lời mời!",
      error: error.message,
    });
  }
};

// GET /friends/sent-requests
export const listSentRequests = async (req: Request, res: Response) => {
  try {
    const { id } = req.user;

    const currentUser = await UserModel.findById(id).select("request_to_friend");
    if (!currentUser) {
      return res.status(404).json({
        status: 404,
        message: "Không tìm thấy người dùng hiện tại!",
      });
    }

    const listPerson = await UserModel.find({
      _id: { $in: currentUser.request_to_friend },
    })
      .select("full_name email avatar_url status")
      .limit(50);

    res.status(200).json({
      status: 200,
      message: "Lấy danh sách yêu cầu kết bạn đã gửi thành công!",
      listPerson,
    });
  } catch (error: any) {
    console.error("❌ Lỗi lấy danh sách yêu cầu đã gửi:", error);
    res.status(500).json({
      status: 500,
      message: "Lỗi server khi lấy danh sách yêu cầu đã gửi!",
      error: error.message,
    });
  }
};






