import { Request, Response } from "express";
import { UserModel } from "../models/users.model";
import { RoomChatModel } from "../models/room-chat.model";

export const setupSocket = (io: any) => {
  io.on("connection", (socket: any) => {
    console.log("Client connected:", socket.id);

    // Sự kiện khi người dùng đăng nhập
    socket.on(
      "userLogin",
      async ({ userId, token }: { userId: string; token: string }) => {
        try {
          const user = await UserModel.findOne({ _id: userId });
          if (!user) {
            socket.emit("error", {
              status: 401,
              message: "Người dùng không tồn tại!",
            });
            return;
          }
          // Cập nhật socketId và trạng thái online
          await UserModel.updateOne(
            { _id: userId },
            { socketId: socket.id, status: "online", last_active: new Date() }
          );
          // Thông báo trạng thái online đến các bạn bè
          const friends = await UserModel.find({ _id: { $in: user.friends } });
          friends.forEach((friend) => {
            if (friend.socketId) {
              io.to(friend.socketId).emit("SERVER_RETURN_USER_ONLINE", {
                status: "online",
                userId: userId,
              });
            }
          });
        } catch (error: any) {
          socket.emit("error", {
            status: 500,
            message: "Lỗi server khi đăng nhập!",
          });
        }
      }
    );

    // Sự kiện gửi lời mời kết bạn
    socket.on("CLIENT_SEND_REQUEST_ADD_FRIEND", async ({ myId, friendId }) => {
      try {
        const currentUser = await UserModel.findById(myId);
        const targetUser = await UserModel.findById(friendId);

        if (!currentUser || !targetUser) {
          socket.emit("error", {
            status: 404,
            message: "Không tìm thấy người dùng!",
          });
          return;
        }

        if (myId === friendId) {
          socket.emit("error", {
            status: 400,
            message: "Không thể gửi lời mời cho chính mình!",
          });
          return;
        }

        if (currentUser.friends.includes(friendId)) {
          socket.emit("error", {
            status: 400,
            message: "Người dùng đã là bạn bè!",
          });
          return;
        }

        if (currentUser.request_to_friend.includes(friendId)) {
          socket.emit("error", {
            status: 400,
            message: "Đã gửi lời mời kết bạn trước đó!",
          });
          return;
        }

        if (currentUser.request_to_me.includes(friendId)) {
          socket.emit("error", {
            status: 400,
            message: "Người dùng này đã gửi lời mời kết bạn cho bạn!",
          });
          return;
        }

        // Thêm friendId vào request_to_friend của currentUser
        await UserModel.updateOne(
          { _id: myId },
          { $push: { request_to_friend: friendId } }
        );

        // Thêm myId vào request_to_me của targetUser
        await UserModel.updateOne(
          { _id: friendId },
          { $push: { request_to_me: myId } }
        );

        // Gửi thông tin của currentUser đến targetUser
        const myInfo = await UserModel.findById(myId)
          .select("full_name email avatar_url status")
          .lean();
        if (targetUser.socketId) {
          io.to(targetUser.socketId).emit("SERVER_RETURN_REQUEST_ADD_FRIEND", {
            infoUser: myInfo,
            friendId: friendId,
          });
        }
      } catch (error: any) {
        socket.emit("error", {
          status: 500,
          message: "Lỗi server khi gửi lời mời kết bạn!",
        });
      }
    });

    // Sự kiện chấp nhận lời mời kết bạn
    socket.on(
      "CLIENT_ACCEPT_FRIEND_REQUEST",
      async ({ acceptorID, requesterId }) => {
        try {
          const currentUser = await UserModel.findById(acceptorID);
          const targetUser = await UserModel.findById(requesterId);

          if (!currentUser || !targetUser) {
            socket.emit("error", {
              status: 404,
              message: "Không tìm thấy người dùng!",
            });
            return;
          }

          if (!currentUser.request_to_me.includes(requesterId)) {
            socket.emit("error", {
              status: 400,
              message: "Không có lời mời kết bạn từ người dùng này!",
            });
            return;
          }

          // Tạo phòng chat
          const roomChat = new RoomChatModel({
            participants: [acceptorID, requesterId],
            type: "friend",
          });
          await roomChat.save();

          // Thêm vào danh sách bạn bè của cả hai
          await UserModel.updateOne(
            { _id: acceptorID },
            {
              $push: { friends: requesterId },
              $pull: { request_to_me: requesterId },
            }
          );
          await UserModel.updateOne(
            { _id: requesterId },
            {
              $push: { friends: acceptorID },
              $pull: { request_to_friend: acceptorID },
            }
          );

          // Gửi thông tin đến targetUser
          const myInfo = await UserModel.findById(acceptorID)
            .select("full_name email avatar_url status")
            .lean();
          if (targetUser.socketId) {
            io.to(targetUser.socketId).emit(
              "SERVER_RETURN_REQUEST_ACCEPT_FRIEND",
              {
                infoUser: myInfo,
                friendId: requesterId,
                roomChatId: roomChat._id,
              }
            );
          }

          // Gửi thông tin đến currentUser
          const friendInfo = await UserModel.findById(requesterId)
            .select("full_name email avatar_url status")
            .lean();
          socket.emit("SERVER_RETURN_REQUEST_ACCEPT_FRIEND", {
            infoUser: friendInfo,
            friendId: acceptorID,
            roomChatId: roomChat._id,
          });
        } catch (error: any) {
          socket.emit("error", {
            status: 500,
            message: "Lỗi server khi chấp nhận lời mời!",
          });
        }
      }
    );

    // Sự kiện từ chối lời mời kết bạn
    socket.on("CLIENT_REJECT_FRIEND_REQUEST", async ({ myId, friendId }) => {
      try {
        const currentUser = await UserModel.findById(myId);
        const targetUser = await UserModel.findById(friendId);

        if (!currentUser || !targetUser) {
          socket.emit("error", {
            status: 404,
            message: "Không tìm thấy người dùng!",
          });
          return;
        }

        if (!currentUser.request_to_me.includes(friendId)) {
          socket.emit("error", {
            status: 400,
            message: "Không có lời mời kết bạn từ người dùng này!",
          });
          return;
        }

        // Xóa lời mời ở cả hai phía
        await UserModel.updateOne(
          { _id: myId },
          { $pull: { request_to_me: friendId } }
        );
        await UserModel.updateOne(
          { _id: friendId },
          { $pull: { request_to_friend: myId } }
        );

        const myInfo = await UserModel.findById(myId)
          .select("full_name email avatar_url status")
          .lean();
        // Gửi thông báo đến người gửi (B)
        if (targetUser.socketId) {
          io.to(targetUser.socketId).emit(
            "SERVER_RETURN_ID_REQUEST_REFUSE_FRIEND",
            {
              myId, // người từ chối
              friendId, // người gửi,
              infoUser: myInfo,
            }
          );
        }
      } catch (error: any) {
        socket.emit("error", {
          status: 500,
          message: "Lỗi server khi từ chối lời mời!",
        });
      }
    });

    // Sự kiện thu hồi lời mời kết bạn
    socket.on("CLIENT_CANCEL_FRIEND_REQUEST", async ({ myId, friendId }) => {
      try {
        const currentUser = await UserModel.findById(myId);
        const targetUser = await UserModel.findById(friendId);

        if (!currentUser || !targetUser) {
          socket.emit("error", {
            status: 404,
            message: "Không tìm thấy người dùng!",
          });
          return;
        }

        if (!currentUser.request_to_friend.includes(friendId)) {
          socket.emit("error", {
            status: 400,
            message: "Không có lời mời kết bạn đã gửi!",
          });
          return;
        }

        // Xóa lời mời
        await UserModel.updateOne(
          { _id: myId },
          { $pull: { request_to_friend: friendId } }
        );
        await UserModel.updateOne(
          { _id: friendId },
          { $pull: { request_to_me: myId } }
        );

        // Thông báo thu hồi đến targetUser
        if (targetUser.socketId) {
          io.to(targetUser.socketId).emit(
            "SERVER_RETURN_ID_REQUEST_CANCEL_FRIEND",
            {
              myId: myId,
              friendId: friendId,
            }
          );
        }
        const targetInfo = await UserModel.findById(friendId).select(
          "full_name email avatar_url status "
        );
        socket.emit("SERVER_RETURN_ID_REQUEST_CANCEL_FRIEND", {
          myId: myId,
          friendId: friendId,
          targetInfo: targetInfo,
        });
      } catch (error: any) {
        socket.emit("error", {
          status: 500,
          message: "Lỗi server khi thu hồi lời mời!",
        });
      }
    });

    // Sự kiện xóa bạn bè
    socket.on("CLIENT_REMOVE_FRIEND", async ({ myId, friendId }) => {
      try {
        const currentUser = await UserModel.findById(myId);
        const targetUser = await UserModel.findById(friendId);

        if (!currentUser || !targetUser) {
          socket.emit("error", {
            status: 404,
            message: "Không tìm thấy người dùng!",
          });
          return;
        }

        if (!currentUser.friends.includes(friendId)) {
          socket.emit("error", {
            status: 400,
            message: "Người dùng không phải bạn bè!",
          });
          return;
        }

        // Xóa bạn bè
        await UserModel.updateOne(
          { _id: myId },
          { $pull: { friends: friendId } }
        );
        await UserModel.updateOne(
          { _id: friendId },
          { $pull: { friends: myId } }
        );

        // Xóa phòng chat
        await RoomChatModel.deleteOne({
          type: "friend",
          participants: { $all: [myId, friendId] },
        });
        const myInfo = await UserModel.findById(myId).select(
          "full_name email avatar_url status "
        );
        const targetInfo = await UserModel.findById(friendId).select(
          "full_name email avatar_url status "
        );
        // Thông báo xóa bạn bè đến targetUser
        if (targetUser.socketId) {
          io.to(targetUser.socketId).emit(
            "SERVER_RETURN_REQUEST_REMOVE_FRIEND",
            {
              myId: myId,
              friendId: friendId,
              myInfo: myInfo,
              targetInfo : targetInfo
            }
          );
        }
        
      } catch (error: any) {
        socket.emit("error", {
          status: 500,
          message: "Lỗi server khi xóa bạn bè!",
        });
      }
    });

    // Sự kiện ngắt kết nối
    socket.on("disconnect", async () => {
      try {
        const user = await UserModel.findOneAndUpdate(
          { socketId: socket.id },
          { status: "offline", socketId: null, last_active: new Date() }
        );
        if (user) {
          const friends = await UserModel.find({ _id: { $in: user.friends } });
          friends.forEach((friend) => {
            if (friend.socketId) {
              io.to(friend.socketId).emit("SERVER_RETURN_USER_ONLINE", {
                status: "offline",
                userId: user._id,
              });
            }
          });
        }
      } catch (error: any) {
        console.error("❌ Lỗi disconnect:", error);
      }
    });
  });
};
