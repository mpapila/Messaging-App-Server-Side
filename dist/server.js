"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const http_1 = __importDefault(require("http"));
const socket_io_1 = require("socket.io");
const client_1 = require("@prisma/client");
const routes_1 = __importDefault(require("./routes/routes"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
const server = http_1.default.createServer(app);
const io = new socket_io_1.Server(server, {
    cors: {
        origin: 'http://localhost:5173',
        methods: ["GET", "POST"]
    }
});
const prisma = new client_1.PrismaClient();
app.use(express_1.default.json()); //It is important put cors and express before roter
app.use('/', routes_1.default);
io.on('connection', (socket) => __awaiter(void 0, void 0, void 0, function* () {
    console.log('A user connected with socket ID:', socket.id);
    // const userId = Math.random()
    const token = socket.handshake.query.token;
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
    const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
    console.log('decoded', decoded);
    let backendUserId = decoded.id;
    const myFriends = yield prisma.friend.findMany({
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
    });
    const friendChatRooms = myFriends.map((friend) => friend.chatRoom);
    const filteredChatRooms = friendChatRooms.filter((chatRoom) => { return chatRoom != null; });
    console.log('filteredChatRooms', filteredChatRooms);
    filteredChatRooms.forEach((chatRoom) => {
        socket.join(chatRoom);
    });
    // userId = socket.id
    // Step 1: Get messages from DB
    const messages = yield prisma.message.findMany({
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
    });
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
    };
    console.log('emitting initial...', initialData);
    socket.emit('initial', initialData);
    // David: Right now, the intial data is just the user ID:
    console.log('emitted initial!', backendUserId);
    // David: But, it needs to be the user ID and the messages, like:
    // --- const initial = { userId, messages }
    // --- socket.emit('initial', initial);
    // Step 3: Send all of initial data to client, not just userId
    // This needs to receive an object like:
    // { text: 'Hello, world!', chatRoom: '1234' }
    socket.on('chat message', (messageInput) => __awaiter(void 0, void 0, void 0, function* () {
        console.log('message received', messageInput);
        // Step 1
        // Save message to DB to get the id
        const savedMessage = yield prisma.message.create({
            data: {
                content: messageInput.text,
                chatRoom: messageInput.chatRoomId,
                senderId: backendUserId
            }
        });
        // Step 2
        const messageData = {
            // Add the message ID from the database to the message data sent to the users
            messageId: savedMessage.id,
            backendUserId,
            chatRoom: messageInput.chatRoomId,
            text: messageInput.text
        };
        console.log('emitting messageData:', messageData);
        io.to(messageInput.chatRoomId).emit('chat message', messageData);
    }));
    socket.on('disconnect', () => {
        console.log('A user disconnected');
    });
}));
app.use(express_1.default.static('public'));
server.listen('3000', () => {
    console.log(`server is running at 3000`);
});
