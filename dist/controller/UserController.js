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
exports.userLogin = exports.userRegister = exports.acceptFriend = exports.addFriend = exports.addUserList = exports.acceptPendingList = exports.exportCardInfo = exports.healtCheck = void 0;
const client_1 = require("@prisma/client");
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma = new client_1.PrismaClient();
const healtCheck = (req, res) => {
    res.status(200).json({ status: 'ok' });
};
exports.healtCheck = healtCheck;
const exportCardInfo = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id, username } = req.user || {};
        const myUsername = username !== undefined ? username : [];
        const myId = id !== undefined ? id : undefined;
        if (myId === undefined) {
            return res.status(400).json({ error: "User ID is required" });
        }
        const myFriends = yield prisma.friend.findMany({
            where: {
                status: 'accepted',
                OR: [
                    { requesterId: myId },
                    { receiverId: myId }
                ]
            },
            include: {
                requester: { select: { username: true } },
                receiver: { select: { username: true } }
            }
        });
        const friendChatRooms = myFriends.map((friend) => friend.chatRoom);
        const filteredChatRooms = friendChatRooms.filter((chatRoom) => { return chatRoom != null; });
        const chatRooms = yield prisma.message.findMany({
            where: {
                chatRoom: {
                    in: filteredChatRooms
                }
            },
            orderBy: {
                createdAt: 'desc'
            },
            distinct: ['chatRoom'],
            include: {
                sender: {
                    select: {
                        username: true
                    }
                }
            }
        });
        const result = myFriends.map(friend => {
            const eachCard = chatRooms.find(msg => msg.chatRoom === friend.chatRoom);
            return {
                friendId: friend.requesterId === id ? friend.receiverId : friend.requesterId,
                friendName: friend.requesterId === id ? friend.receiver.username : friend.requester.username,
                chatRoomId: friend.chatRoom,
                latestMessage: eachCard ? eachCard.content : 'Click to send Messages',
                timestamp: eachCard ? eachCard.createdAt : null
            };
        });
        const chatRoomIds = result.map(r => r.chatRoomId);
        res.status(200).json({ myFriends, myUsername, result, chatRoomIds });
    }
    catch (err) {
        console.error("Error fetching users: ", err);
        res.status(500).json({ error: "Internal server error" });
    }
});
exports.exportCardInfo = exportCardInfo;
const acceptPendingList = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id, username: myName } = req.user || {};
        const myId = id !== undefined ? [id] : [];
        const acceptedUser = yield prisma.friend.findMany({
            where: {
                status: 'accepted', requesterId: {
                    in: myId
                }
            },
            select: { receiverId: true }
        });
        const pendingUsers = yield prisma.friend.findMany({
            where: { receiverId: id, status: 'pending' },
            select: { requesterId: true }
        });
        console.log('friend', acceptedUser);
        const acceptedReceiverIds = acceptedUser.map(user => user.receiverId);
        const excludedIds = [...myId, ...acceptedReceiverIds];
        const users = yield prisma.users.findMany({
            where: {
                id: {
                    notIn: excludedIds
                }
            },
            select: {
                id: true,
                username: true,
            }
        });
        res.status(200).json({ users, pendingUsers, myId });
    }
    catch (err) {
        console.error("Error fetching users: ", err);
        res.status(500).json({ error: "Internal server error" });
    }
});
exports.acceptPendingList = acceptPendingList;
const addUserList = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id, username: myName } = req.user || {};
        const myId = id !== undefined ? [id] : [];
        const acceptedUser = yield prisma.friend.findMany({
            where: {
                status: 'accepted',
                OR: [{ receiverId: id }, { requesterId: id }]
            },
            select: {
                receiverId: true, requesterId: true
            }
        });
        const pendingUsers = yield prisma.friend.findMany({
            where: { requesterId: id, status: 'pending' },
            select: { receiverId: true, requesterId: true }
        });
        const sendReqUser = yield prisma.friend.findMany({
            where: { receiverId: id, status: 'pending' },
            select: { receiverId: true, requesterId: true }
        });
        console.log('friend', acceptedUser);
        const acceptedReceiverIds = acceptedUser.map(user => user.receiverId);
        const acceptedRequesterIds = acceptedUser.map(user => user.requesterId);
        const sendReqUsers = sendReqUser.map(user => user.requesterId);
        const excludedIds = [...myId, ...acceptedReceiverIds, ...sendReqUsers, ...acceptedRequesterIds];
        const users = yield prisma.users.findMany({
            where: {
                id: {
                    notIn: excludedIds
                }
            },
            select: {
                id: true,
                username: true,
            }
        });
        res.status(200).json({ users, pendingUsers });
    }
    catch (err) {
        console.error("Error fetching users: ", err);
        res.status(500).json({ error: "Internal server error" });
    }
});
exports.addUserList = addUserList;
const addFriend = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log('Full req.user:', req.user);
        console.log('Full req.body:', req.body);
        const { id: requesterId, username: requesterName } = req.user || {};
        const { id: receiverId, username: receiverName } = req.body;
        console.log('Destructured values:', receiverId, receiverName, requesterId, requesterName);
        const status = receiverId == 1 ? 'accepted' : 'pending';
        const data = {
            receiverId,
            status,
            chatRoom: String(requesterId) + String(receiverId),
        };
        if (typeof requesterId !== 'undefined') {
            data.requesterId = requesterId;
        }
        const newRequest = yield prisma.friend.create({
            data
        });
        console.log('new request', newRequest);
        if (receiverId == 1) {
            const additionalData = {
                specialMessage: 'This is a special response for receiver 1!'
            };
            return res.status(200).json({ newRequest, additionalData });
        }
        res.status(200).json(newRequest);
    }
    catch (err) {
        console.error("Error fetching users: ", err);
        res.status(500).json({ error: "Internal server error" });
    }
});
exports.addFriend = addFriend;
const acceptFriend = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const myId = req.body.receiverId;
        const requesterId = req.body.requesterId;
        const existingRequest = yield prisma.friend.findFirst({
            where: {
                receiverId: requesterId,
                requesterId: myId,
                status: 'pending',
            },
        });
        if (!existingRequest) {
            return res.status(404).json({ error: "Friend request not found" });
        }
        const updateFriend = yield prisma.friend.update({
            where: {
                id: existingRequest.id,
            },
            data: {
                status: 'accepted',
            },
        });
        console.log(updateFriend);
        res.status(200).json({ updateFriend });
    }
    catch (err) {
        console.error("Error fetching users: ", err);
        res.status(500).json({ error: "Internal server error" });
    }
});
exports.acceptFriend = acceptFriend;
exports.userRegister = [
    (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
        const { username, email, password } = req.body;
        try {
            const existingUsername = yield prisma.users.findUnique({
                where: {
                    username,
                }
            });
            const existingEmail = yield prisma.users.findUnique({
                where: {
                    email,
                }
            });
            if (existingUsername) {
                return res.status(400).json({ error: 'Username is already taken' });
            }
            if (existingEmail) {
                return res.status(400).json({ error: 'Email is already in use' });
            }
            const hashed = yield bcrypt_1.default.hash(password, 10);
            const newUser = yield prisma.users.create({
                data: {
                    username,
                    password: hashed,
                    email
                }
            });
            return res.status(200).json(newUser);
        }
        catch (error) {
            if (error instanceof Error) {
                const payload = {
                    errorMessage: error.message
                };
                return res.status(500).json(payload);
            }
            throw error;
        }
    })
];
exports.userLogin = [
    (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
        const { username, password } = req.body;
        const user = yield prisma.users.findUnique({
            where: {
                username,
            }
        });
        try {
            if (user == null) {
                return res.status(500).json({ message: 'No username found' });
            }
            const hashed = user.password;
            const passwordMatches = yield bcrypt_1.default.compare(password, hashed);
            if (!passwordMatches) {
                return res.status(401).json({ message: 'Invalid password' });
            }
            const token = jsonwebtoken_1.default.sign(user, process.env.JWT_SECRET);
            res.json({ token });
        }
        catch (err) {
            console.error("Error fetching users: ", err);
            res.status(500).json({ error: "Internal server error" });
        }
    })
];
