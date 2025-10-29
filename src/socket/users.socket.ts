import { Request, Response } from "express";
import { UserModel } from "../models/users.model";
import { RoomChatModel } from "../models/room-chat.model";
import { MessageModel } from "../models/messages.model";

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
              targetInfo: targetInfo,
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

    // Chat SOCKET
    socket.on("CLIENT_SEND_MESSAGE", async (message: { room_id: string; sender_id: string; receiver_id: string; content: string; type: "text" | "call" }) => {
      try {
        console.log(`Message received: room_id=${message.room_id}, sender_id=${message.sender_id}, receiver_id=${message.receiver_id}`);
        const { ObjectId } = require("mongoose").Types;

        if (!ObjectId.isValid(message.room_id) || !ObjectId.isValid(message.sender_id) || !ObjectId.isValid(message.receiver_id)) {
          console.log("Invalid ObjectId:", { room_id: message.room_id, sender_id: message.sender_id, receiver_id: message.receiver_id });
          socket.emit("error", {
            status: 400,
            message: "ID không hợp lệ!",
          });
          return;
        }

        if (!message.content.trim()) {
          socket.emit("error", {
            status: 400,
            message: "Nội dung tin nhắn không được để trống!",
          });
          return;
        }

        // Lưu tin nhắn
        const newMessage = await MessageModel.create({
          room_id: message.room_id,
          sender_id: message.sender_id,
          receiver_id: message.receiver_id,
          content: message.content,
          type: message.type,
          is_read: false,
          timestamp: new Date(),
        });

        // Cập nhật last_message và updated_at
        await RoomChatModel.updateOne(
          { _id: message.room_id },
          { last_message: newMessage._id, updated_at: new Date() }
        );

        // Gửi tin nhắn đến cả hai người
        const roomChat = await RoomChatModel.findById(message.room_id).lean();
        if (!roomChat) {
          socket.emit("error", {
            status: 404,
            message: "Không tìm thấy phòng chat!",
          });
          return;
        }

        const participants = roomChat.participants;
        for (const userId of participants) {
          const user = await UserModel.findById(userId).lean();
          if (user?.socketId) {
            io.to(user.socketId).emit("SERVER_RETURN_MESSAGE", newMessage);
          }
        }
      } catch (error: any) {
        console.error(`Lỗi CLIENT_SEND_MESSAGE (room_id=${message.room_id}, sender_id=${message.sender_id}):`, error);
        socket.emit("error", {
          status: 500,
          message: "Lỗi server khi gửi tin nhắn!",
        });
      }
    });

    socket.on("CLIENT_MARK_MESSAGES_READ", async ({ room_id, user_id }: { room_id: string; user_id: string }) => {
      try {
        console.log(`Mark messages read: room_id=${room_id}, user_id=${user_id}`);
        const { ObjectId } = require("mongoose").Types;

        if (!ObjectId.isValid(room_id) || !ObjectId.isValid(user_id)) {
          console.log("Invalid ObjectId:", { room_id, user_id });
          socket.emit("error", {
            status: 400,
            message: "ID không hợp lệ!",
          });
          return;
        }

        // Đánh dấu tin nhắn chưa đọc là đã đọc
        await MessageModel.updateMany(
          { room_id, receiver_id: user_id, is_read: false },
          { is_read: true }
        );

        // Thông báo đến người gửi
        const roomChat = await RoomChatModel.findById(room_id).lean();
        if (!roomChat) return;

        const participants = roomChat.participants;
        for (const participantId of participants) {
          if (participantId.toString() !== user_id) {
            const user = await UserModel.findById(participantId).lean();
            if (user?.socketId) {
              io.to(user.socketId).emit("SERVER_RETURN_MESSAGES_READ", { room_id, user_id });
            }
          }
        }
      } catch (error: any) {
        console.error(`Lỗi CLIENT_MARK_MESSAGES_READ (room_id=${room_id}, user_id=${user_id}):`, error);
        socket.emit("error", {
          status: 500,
          message: "Lỗi server khi đánh dấu tin nhắn đã đọc!",
        });
      }
    });


    socket.on("CLIENT_RECALL_MESSAGE", async ({ room_id, message_id, user_id }: { room_id: string; message_id: string; user_id: string }) => {
      try {
        console.log(`Recall message: room_id=${room_id}, message_id=${message_id}, user_id=${user_id}`);
        const { ObjectId } = require("mongoose").Types;

        if (!ObjectId.isValid(room_id) || !ObjectId.isValid(message_id) || !ObjectId.isValid(user_id)) {
          console.log("Invalid ObjectId:", { room_id, message_id, user_id });
          socket.emit("error", {
            status: 400,
            message: "ID không hợp lệ!",
          });
          return;
        }

        // Kiểm tra tin nhắn
        const message = await MessageModel.findById(message_id).lean();
        if (!message) {
          socket.emit("error", {
            status: 404,
            message: "Không tìm thấy tin nhắn!",
          });
          return;
        }

        // Kiểm tra quyền thu hồi (chỉ sender_id được thu hồi)
        if (message.sender_id.toString() !== user_id) {
          socket.emit("error", {
            status: 403,
            message: "Bạn không có quyền thu hồi tin nhắn này!",
          });
          return;
        }

        // Cập nhật tin nhắn thành đã thu hồi
        await MessageModel.updateOne(
          { _id: message_id },
          { is_recalled: true, content: "Tin nhắn đã bị thu hồi" }
        );

        // Kiểm tra và cập nhật last_message trong RoomChatModel
        const roomChat = await RoomChatModel.findById(room_id).lean();
        if (roomChat && roomChat.last_message?.toString() === message_id) {
          await RoomChatModel.updateOne(
            { _id: room_id },
            {
              last_message: await MessageModel.findById(message_id).lean(),
              updated_at: new Date(),
            }
          );
        }

        // Gửi sự kiện thu hồi đến cả hai người
        const participants = roomChat.participants;
        for (const participantId of participants) {
          const user = await UserModel.findById(participantId).lean();
          if (user?.socketId) {
            io.to(user.socketId).emit("SERVER_RETURN_RECALL_MESSAGE", {
              message_id,
              room_id,
            });
          }
        }
      } catch (error: any) {
        console.error(`Lỗi CLIENT_RECALL_MESSAGE (room_id=${room_id}, message_id=${message_id}):`, error);
        socket.emit("error", {
          status: 500,
          message: "Lỗi server khi thu hồi tin nhắn!",
        });
      }
    });


    socket.on("CLIENT_TYPING", async ({ room_id, user_id }: { room_id: string; user_id: string }) => {
      try {
        console.log(`Typing: room_id=${room_id}, user_id=${user_id}`);
        const { ObjectId } = require("mongoose").Types;

        if (!ObjectId.isValid(room_id) || !ObjectId.isValid(user_id)) {
          console.log("Invalid ObjectId:", { room_id, user_id });
          socket.emit("error", {
            status: 400,
            message: "ID không hợp lệ!",
          });
          return;
        }

        const roomChat = await RoomChatModel.findById(room_id).lean();
        if (!roomChat) {
          socket.emit("error", {
            status: 404,
            message: "Không tìm thấy phòng chat!",
          });
          return;
        }

        const participants = roomChat.participants;
        for (const participantId of participants) {
          if (participantId.toString() !== user_id) {
            const user = await UserModel.findById(participantId).lean();
            if (user?.socketId) {
              io.to(user.socketId).emit("SERVER_RETURN_TYPING", { room_id, user_id });
            }
          }
        }
      } catch (error: any) {
        console.error(`Lỗi CLIENT_TYPING (room_id=${room_id}, user_id=${user_id}):`, error);
        socket.emit("error", {
          status: 500,
          message: "Lỗi server khi xử lý typing!",
        });
      }
    });

    socket.on("CLIENT_STOP_TYPING", async ({ room_id, user_id }: { room_id: string; user_id: string }) => {
      try {
        console.log(`Stop typing: room_id=${room_id}, user_id=${user_id}`);
        const { ObjectId } = require("mongoose").Types;

        if (!ObjectId.isValid(room_id) || !ObjectId.isValid(user_id)) {
          console.log("Invalid ObjectId:", { room_id, user_id });
          socket.emit("error", {
            status: 400,
            message: "ID không hợp lệ!",
          });
          return;
        }

        const roomChat = await RoomChatModel.findById(room_id).lean();
        if (!roomChat) {
          socket.emit("error", {
            status: 404,
            message: "Không tìm thấy phòng chat!",
          });
          return;
        }

        const participants = roomChat.participants;
        for (const participantId of participants) {
          if (participantId.toString() !== user_id) {
            const user = await UserModel.findById(participantId).lean();
            if (user?.socketId) {
              io.to(user.socketId).emit("SERVER_RETURN_STOP_TYPING", { room_id, user_id });
            }
          }
        }
      } catch (error: any) {
        console.error(`Lỗi CLIENT_STOP_TYPING (room_id=${room_id}, user_id=${user_id}):`, error);
        socket.emit("error", {
          status: 500,
          message: "Lỗi server khi xử lý stop typing!",
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
