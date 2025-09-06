import { dateToLocalTime } from '../utils/localtime';
import { Socket } from 'socket.io';
import { ChatService } from '../services/chat/chat.service';
import logger from '../utils/logger';
import { io } from '../app';
import dotenv from "dotenv";
import { verifyJwt } from '../utils/jwt';
import { exitMeeting, getAllMessages, getMeetingPeers, joinMeeting, peerType } from '../services/meeting/meeting.function';
import { createWebRtcTransport, createWorker } from '../mediasoup/mediasoup';
import { mediaCodecs } from '../utils/mediaCodecs';
import { WebRtcTransport } from 'mediasoup/node/lib/WebRtcTransportTypes';
import { AppData, Consumer, Producer, Router, Worker } from 'mediasoup/node/lib/types';
import { transport } from 'pino';
import mongoose from 'mongoose';
dotenv.config()

let worker: Worker
let router: Router

const setupMediasoup = async () => {
    worker = await createWorker();
    router = await worker.createRouter({ mediaCodecs });
};

interface PeerInfo {
  producerTransport?: WebRtcTransport<AppData>;
  consumerTransport?: WebRtcTransport<AppData>;
  producers: Map<string, Producer<AppData>>; // key: kind or label
  consumers: Map<string, Consumer<AppData>>; // key: producerId
}

const peers = new Map<string, PeerInfo>();

const fetchPeer = (userId: string, callback: any): PeerInfo => {
    const peer = peers.get(userId);
    if (!peer) {
        callback({ error: 'peer not joined' });
        throw new Error("Peer not joined");
    }
    return peer;
};

setupMediasoup();
io.use((socket, next) => {
    if (mongoose.connection.readyState !== 1) return;

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

    peers.set(userId, {
        producerTransport: undefined,
        consumerTransport: undefined,
        producers: new Map(),
        consumers: new Map()
    });

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

    socket.on('getRtpCapabilities', (callback) => {
        const rtpCapabilities = router.rtpCapabilities
        console.log("router rtp capabilities", rtpCapabilities)
        callback({ rtpCapabilities })
    })

    socket.on('createWebRtcTransport', async({ sender }, callback) => {
        const peer = fetchPeer(userId, callback)
        if(sender){
            peer.producerTransport = await createWebRtcTransport(callback, router, sender)
        } else {
            peer.consumerTransport = await createWebRtcTransport(callback, router, sender)
        }
    })

    socket.on('transport-connect', async({ dtlsParameters }, callback) => {
        const peer = fetchPeer(userId, callback)
        console.log('DTLS PARAMS...', { dtlsParameters })
        await peer.producerTransport?.connect({ dtlsParameters })
    })

    socket.on('transport-produce', async({
        kind,
        rtpParameters,
        appData,
    }, callback) => {
        const peer = fetchPeer(userId, callback)
        const newProducer = await peer.producerTransport?.produce({ kind, rtpParameters });
        if (!newProducer) return
        peer.producers.set(newProducer.kind, newProducer);
        
        console.log('Producer ID: ', newProducer!.id, newProducer.kind)
        
        newProducer.on('transportclose', () => {
            console.log('transport for this producer closed')
            newProducer.close()
        })

        callback({
            id: newProducer.id
        })

        console.log('1')

        socket.to(meetingId).emit('new-producer', {
            userId,
            username,
            kind: newProducer.kind,
            producerId: newProducer.id
        });

        console.log('2')

        console.log("producers has been created successfully")
    })

    socket.on('transport-recv-connect', async ({ dtlsParameters }, callback) => {
        const peer = fetchPeer(userId, callback)
        console.log(`DTLS PARAMS: ${dtlsParameters}`)
        console.log("consumeers22")
        await peer.consumerTransport?.connect({ dtlsParameters })
    })

    socket.on('consume', async ({ rtpCapabilities }, callback) => {
        try {
            const peer = fetchPeer(userId, callback);
            if (!peer.consumerTransport) {
                return callback({ error: 'No consumer transport' });
            }
            const consumers: any[] = [];

            for (const [peerId, remotePeer] of peers.entries()) {
                if (peerId === userId) continue;

                for (const producer of remotePeer.producers.values()) {
                    if (!router.canConsume({ producerId: producer.id, rtpCapabilities })) {
                        console.warn(`Cannot consume producer ${producer.id}`);
                        continue;
                    }

                    const consumer = await peer.consumerTransport!.consume({
                        producerId: producer.id,
                        rtpCapabilities,
                        paused: false
                    });

                    peer.consumers.set(producer.id, consumer);

                    // Cleanup
                    consumer.on('transportclose', () => {
                        peer.consumers.delete(producer.id);
                    });

                    consumer.on('@producerclose', () => {
                        peer.consumers.delete(producer.id);
                    });

                    consumers.push({
                        id: consumer.id,
                        producerId: producer.id,
                        kind: consumer.kind,
                        rtpParameters: consumer.rtpParameters
                    });
                }
            }

            if (consumers.length === 0) {
                return callback({ error: 'No available producers to consume' });
            }

            callback({ consumers });
        } catch (err: any) {
            console.error(err);
            callback({ error: err.message });
        }
    });

    socket.on('consumer-resume', async ({producerId}, callback) => {
        const peer = fetchPeer(userId, callback)
        const consumer = peer.consumers.get(producerId)
        console.log('consumer-resumed')
        await consumer?.resume()
    })

    socket.on("exit-meeting", async () => {
        await exitMeeting(meetingId, userId)
        logger.info(`{peer: ${socket.id}, username: ${username}} exited meeting successfully`)

        socket.to(meetingId).emit("peer-left", {
            userId
        });
    })

    socket.on('join-room', async () => {
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
    let handRaisedArray: string[] = []

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
    
    socket.on('disconnect', async() => {
        logger.info(`{peer: ${socket.id}, username: ${username}} disconnected`)
        await exitMeeting(meetingId, userId)
        logger.info(`{peer: ${socket.id}, username: ${username}} exited meeting successfully`)

        socket.to(meetingId).emit("peer-left", {
            userId
        });
    })
})