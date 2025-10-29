import { Request, Response } from "express";
import { IRoomChat, RoomChatModel } from "../../models/room-chat.model";
import { UserModel } from "../../models/users.model";
import { IMessage, MessageModel } from "../../models/messages.model";

interface PopulatedRoomChat extends Omit<IRoomChat, "last_message"> {
  last_message?: IMessage | null; // last_message là IMessage sau khi populate
}

export const getRoom = async (req: Request, res: Response) => {
  try {
    const userId = req.user.id;
    if (!userId) {
      return res.status(401).json({ message: "Vui lòng đăng nhập" });
    }

    // Lấy danh sách phòng chat
    const roomChats = await RoomChatModel.find({
      participants: userId,
      type: "friend", // Chỉ lấy phòng chat bạn bè
    })
      .populate<{ last_message: IMessage | null }>("last_message") // Chỉ định kiểu cho last_message
      .sort({ updated_at: -1 })
      .limit(50)
      .lean();
    // Lấy thông tin bạn bè
    const friendsData = await Promise.all(
      roomChats.map(async (room) => {
        const friendId = room.participants.find(
          (id) => id.toString() !== userId
        );
        const friend = await UserModel.findById(friendId)
          .select("full_name avatar_url status")
          .lean();
        if (!friend) return null;

        return {
          room_id: room._id.toString(),
          friend: {
            _id: friend._id.toString(),
            full_name: friend.full_name,
            avatar_url: friend.avatar_url,
            status: friend.status || "offline",
          },
          last_message: room.last_message
            ? {
                _id: room.last_message._id.toString(),
                room_id: room.last_message.room_id.toString(),
                sender_id: room.last_message.sender_id.toString(),
                receiver_id: room.last_message.receiver_id.toString(),
                content: room.last_message.content,
                type: room.last_message.type,
                is_read: room.last_message.is_read,
                timestamp: room.last_message.timestamp,
              }
            : null,
        };
      })
    );

    const validFriendsData = friendsData.filter((data) => data !== null);

    res.status(200).json({ rooms: validFriendsData });
  } catch (error: any) {
    console.error("Lỗi get chats:", error);
    return res
      .status(500)
      .json({ message: "Lỗi server khi lấy danh sách phòng chat" });
  }
};

export const getMessage = async (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;
    if (!roomId || typeof roomId !== "string") {
      res.status(400).json({ message: "ID phòng chat không hợp lệ" });
    }

    const messages = await MessageModel.find({
      room_id: roomId,
      is_recalled: false,
    })
      .sort({ timestamp: 1 })
      .limit(100)
      .lean();
    res.status(200).json({ messages });
  } catch (error: any) {
    console.error("Lỗi get messages:", error);
    res.status(500).json({ message: "Lỗi server khi lấy tin nhắn" });
  }
};
