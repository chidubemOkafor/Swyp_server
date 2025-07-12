import { dateToLocalTime } from '../utils/localtime';
import { Socket } from 'socket.io';
import { ChatService } from '../services/chat/chat.service';
import logger from '../utils/logger';
import { io } from '../app';
import dotenv from "dotenv";
import { verifyJwt } from '../utils/jwt';
import { exitMeeting, getAllMessages, getMeetingPeers, joinMeeting } from '../services/meeting/meeting.function';
dotenv.config()

let handRaisedArray: string[] = []

io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    const meetingId = socket.handshake.query.meetingId as string
    if (!token) {
    return next(new Error("Authentication error: No token provided"));
    }

    try {
        const decoded = verifyJwt(token);
        if (!decoded || typeof decoded === "string" || 
            !("userId" in decoded && "username" in decoded)) {
            return next(new Error("Authentication error: Invalid token"));
        }
        socket.user = {
            userId: decoded.userId,
            username: decoded.username,
            meetingId
        };
        next();
    } catch (error) {
        return next(new Error("Authentication error: Token verification failed"));
    }
});
  
io.on('connection', async(socket:Socket) => {
    logger.info(`{client: ${socket.id} username: ${socket.user?.username}} connected successfully`)

    const userId = socket.user?.userId as string
    const meetingId = socket.user?.meetingId as string
    const username = socket.user?.username as string

    // meeting
    socket.on("join-meeting", async () => {
        await joinMeeting(meetingId, userId);
        
        socket.join(meetingId)

        logger.info(`{peer: ${socket.id}, username: ${username}} joined meeting successfully`);
      
        socket.emit('join-meeting', { success: true });
      
        socket.to(meetingId).emit("peer-joined", {
          userId,
          username,
          role: "Participant",
        });
      });

    socket.on("exit-meeting", async () => {
        await exitMeeting(meetingId, userId)
        logger.info(`{peer: ${socket.id}, username: ${username}} exited meeting successfully`)

        socket.to(meetingId).emit("peer-left", {
            userId
        });
    })

    socket.on('join-room', () => {
        socket.join(meetingId)
    })

    // chat
    socket.on("get-all-messages", async() => {
        socket.emit("get-all-messages", {
            messages: await getAllMessages(meetingId, userId)
        })
    })

    socket.on('chat-message', async ({ message }: {message: string, meetingId: string}) => {
        const chat = new ChatService()
        const response = await chat.sendMessage({ message, meetingId, userId})

        if (response.message === "MESSAGEEMPT") {
            socket.emit("error", {
                error: "message cannot be empty"
            })
        } else if (response.message === "USERNOTFND") {
            socket.emit("error", {
                error: "invalid userId; user not found"
            })
        }

        const value = {
            ...response,
            createdAt: dateToLocalTime(response.createdAt as Date)
        }

        socket.to(meetingId).emit('chat-message', value); 
        socket.emit('my-message', value)
    })

    socket.on("chat-typing", () => {
        socket.broadcast.emit("chat-typing", `${username} is typing...`);
    })

    // peers
    socket.on("get-peers", async () => {
        if (!meetingId && meetingId === "") {
            logger.error("meetingId cannot be empty");
            socket.emit("get-peers-error", {
                error: "meetingId cannot be empty"
            });
            return;
        }
            
        try {
            const peers = await getMeetingPeers(meetingId, userId);

            if (!Array.isArray(peers)) {
                logger.error(`getMeetingPeers error: ${peers.message}`);
                socket.emit("get-peers-error", {
                    error: peers.message
                });
                return;
            }
    
            socket.emit("get-peers", {
                peers
            });
    
        } catch (err) {
            logger.error(`Unexpected error: ${err}`);
            socket.emit("get-peers-error", {
                error: "UNEXPECTED_ERROR"
            });
        }
    });

    // for handlRaised function
    socket.on("raise_hand", () => {
        if(!handRaisedArray.includes(userId)) {
            handRaisedArray.push(userId)
            console.log("hand raised")
            console.log(handRaisedArray)
            io.to(meetingId).emit("raise_hand", { handRaisedArray })
        }
    })

    socket.on('hand_down', () => {
        if(handRaisedArray.includes(userId)) {
            handRaisedArray = handRaisedArray.filter(id => id !== userId);
            console.log("hand dropped")
            console.log(handRaisedArray)
            io.to(meetingId).emit("hand_down", { handRaisedArray })
        }
    })

    // for toggling emoji
    socket.on("emoji", (emoji: {emoji: string}) => {
        io.to(meetingId).emit("emoji", {
            emoji,
            username
        })
    })

    //signalling
    socket.on("webrtc:signal", (value) => {
        if (value.offer) {
            console.log(value)
            socket.to(meetingId).emit("webrtc:offer", value)
        } 
        if (value.answer) {
            console.log(value)
            socket.to(meetingId).emit("webrtc:answer", value)
        }
        if (value["new-ice-candidate"]) {
            console.log(value)
            socket.to(meetingId).emit("webrtc:ice-candidate", {
                iceCandidate: value["new-ice-candidate"]
            })
        }
    })
    
    socket.on('disconnect', async() => {
        logger.info(`{peer: ${socket.id}, username: ${username}} disconnected`)
        await exitMeeting(meetingId, userId)
        logger.info(`{peer: ${socket.id}, username: ${username}} exited meeting successfully`)

        socket.to(meetingId).emit("peer-left", {
            userId
        });
    })
})