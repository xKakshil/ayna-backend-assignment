import { Server, Socket } from "socket.io";
import jwt from "jsonwebtoken";

interface MessageData {
  text: string;
  sessionId: string;
}

interface User {
  id: number;
}

module.exports = {
  register() {},

  bootstrap() {
    const io = new Server(strapi.server.httpServer, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"],
        credentials: true,
      },
    });

    io.on("connection", function (socket: Socket) {
      const token = socket.handshake.auth.token
        ? socket.handshake.auth.token
        : socket.handshake.headers.token;
      const jwtSecret = process.env.JWT_SECRET;

      if (token) {
        jwt.verify(
          token,
          jwtSecret,
          async (err: jwt.JsonWebTokenError | null, decoded: any) => {
            if (err) {
              console.log(err);
              socket.disconnect();
              return;
            }

            const user: User | null = await strapi
              .query("plugin::users-permissions.user")
              .findOne({
                where: { id: decoded.id },
              });

            if (user) {
              (socket as any).user = user;

              socket.on("join", ({ sessionId }: { sessionId: string }) => {
                console.log("Joined: ", sessionId);
                socket.join(sessionId);
              });

              socket.on("test_event", (data) => {
                console.log("test event", data);
                socket.emit("test_event", data);
              });

              socket.on("leave", ({ sessionId }) => {
                socket.leave(sessionId);
                console.log(`Socket ${socket.id} left room ${sessionId}`);
              });

              socket.on("sendMessage", async (data: MessageData) => {
                try {
                  const createdUserMessage = await strapi
                    .documents("api::message.message")
                    .create({
                      data: {
                        senderType: "USER",
                        text: data.text,
                        session: data.sessionId,
                        user: (socket as any).user.id,
                      },
                      status: "published",
                    });

                  socket.broadcast
                    .to(data.sessionId)
                    .emit("receive_message", createdUserMessage);

                  const createdServerMessage = await strapi
                    .documents("api::message.message")
                    .create({
                      data: {
                        senderType: "SERVER",
                        text: data.text,
                        session: data.sessionId,
                        user: (socket as any).user.id,
                      },
                      status: "published",
                    });

                  socket.broadcast
                    .to(data.sessionId)
                    .emit("receive_message", createdServerMessage);

                  await strapi.documents("api::session.session").update({
                    documentId: data.sessionId,
                    data: {
                      lastMessage: data.text,
                    },
                    status: "published",
                  });
                } catch (e: any) {
                  console.log("Error saving message:", e.message);
                }
              });
            } else {
              console.log("User not found. Disconnecting...");
              socket.disconnect();
            }
          }
        );
      } else {
        console.log("Token not found. Disconnecting...");
        socket.disconnect();
      }
    });
  },
};
