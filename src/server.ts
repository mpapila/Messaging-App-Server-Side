import express from 'express';
import cors from 'cors'
import http from 'http';
import { Server } from 'socket.io';
import { PrismaClient } from '@prisma/client';
import router from './routes/routes';
import jwt, { JwtPayload } from 'jsonwebtoken';
import compression from 'compression'
import helmet from 'helmet';



const app = express();
app.use(cors());
app.use(compression());
app.use(
    helmet.contentSecurityPolicy({
        directives: {
            "script-src": ["'self' 'unsafe-inline'", "code.jquery.com", "cdn.jsdelivr.net"],
        },
    }),
);
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: process.env.REACT_APP_BASE_URL,
        methods: ["GET", "POST"]
    }
});

const prisma = new PrismaClient()



app.use(express.json());      //It is important put cors and express before roter
app.use('/', router)



io.on('connection', async (socket) => {
    console.log('A user connected with socket ID:', socket.id)
    // const userId = Math.random()

    const token = socket.handshake.query.token
    // console.log('token', token)
    if (typeof token !== 'string') {
        console.error('Invalid token type:', typeof token);
        socket.disconnect(true);
        return;
    }
    if (!process.env.JWT_SECRET) {
        console.error('Invalid secret');
        socket.disconnect(true);
        return;
    }


    const decoded = jwt.verify(token, process.env.JWT_SECRET) as JwtPayload

    console.log('decoded', decoded)

    let backendUserId = decoded.id


    const myFriends = await prisma.friend.findMany({
        where: {
            status: 'accepted',
            OR: [
                { requesterId: backendUserId },
                { receiverId: backendUserId }
            ]
        },
        include: {
            requester: { select: { username: true } },
            receiver: { select: { username: true } }
        }
    })
    const friendChatRooms = myFriends.map((friend) => friend.chatRoom)
    const filteredChatRooms = friendChatRooms.filter((chatRoom) => { return chatRoom != null })
    console.log('filteredChatRooms', filteredChatRooms)
    filteredChatRooms.forEach((chatRoom) => {
        socket.join(chatRoom)
    })

    // userId = socket.id

    // Step 1: Get messages from DB
    const messages = await prisma.message.findMany({
        where: {
            chatRoom: {
                in: filteredChatRooms
            },
        },
        orderBy: {
            createdAt: 'asc'
        },
        include: {
            sender: {
                select: {
                    username: true,
                }
            }
        }
    })

    // Step 2: Add messages to initial data
    // const initial = { userId, messages }
    const initialData = {
        userId: backendUserId,
        messages: messages.map((message) => ({
            id: message.id,
            content: message.content,
            chatRoom: message.chatRoom,
            createdAt: message.createdAt,
            senderId: message.senderId
        }))
    }

    console.log('emitting initial...', initialData)
    socket.emit('initial', initialData);
    // David: Right now, the intial data is just the user ID:
    console.log('emitted initial!', backendUserId)
    // David: But, it needs to be the user ID and the messages, like:
    // --- const initial = { userId, messages }
    // --- socket.emit('initial', initial);

    // Step 3: Send all of initial data to client, not just userId
    // This needs to receive an object like:
    // { text: 'Hello, world!', chatRoom: '1234' }
    socket.on('chat message', async (messageInput) => {
        console.log('message received', messageInput)
        // Step 1
        // Save message to DB to get the id
        const savedMessage = await prisma.message.create({
            data: {
                content: messageInput.text,
                chatRoom: messageInput.chatRoomId,
                senderId: backendUserId
            }
        })

        // Step 2
        const messageData = {
            // Add the message ID from the database to the message data sent to the users
            messageId: savedMessage.id,
            backendUserId,
            chatRoom: messageInput.chatRoomId,
            text: messageInput.text
        }
        console.log('emitting messageData:', messageData)
        io.to(messageInput.chatRoomId).emit('chat message', messageData);
    })

    socket.on('disconnect', () => {
        console.log('A user disconnected')
    })

})

app.use(express.static('public'));


server.listen('3000', () => {
    console.log(`server is running at 3000`)
})
