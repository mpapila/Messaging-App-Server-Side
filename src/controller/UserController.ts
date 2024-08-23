import { PrismaClient } from "@prisma/client";
import { Request, Response, NextFunction } from "express"
import bcrypt from 'bcrypt'
import jwt from "jsonwebtoken";


const prisma = new PrismaClient();


export const healtCheck = (req: Request, res: Response) => {
    res.status(200).json({ status: 'ok' })
}

export const exportCardInfo = async (req: Request, res: Response) => {
    try {
        const { id, username } = req.user || {};
        const myUsername = username !== undefined ? username : [];
        const myId = id !== undefined ? id : undefined;
        if (myId === undefined) {
            return res.status(400).json({ error: "User ID is required" });
        }

        const myFriends = await prisma.friend.findMany({
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
        })
        const friendChatRooms = myFriends.map((friend) => friend.chatRoom)
        const filteredChatRooms = friendChatRooms.filter((chatRoom) => { return chatRoom != null })
        const chatRooms = await prisma.message.findMany({
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
        })
        const result = myFriends.map(friend => {
            const eachCard = chatRooms.find(msg => msg.chatRoom === friend.chatRoom)
            return {
                friendId: friend.requesterId === id ? friend.receiverId : friend.requesterId,
                friendName: friend.requesterId === id ? friend.receiver.username : friend.requester.username,
                chatRoomId: friend.chatRoom,
                latestMessage: eachCard ? eachCard.content : 'Click to send Messages',
                timestamp: eachCard ? eachCard.createdAt : null
            }
        })
        const chatRoomIds = result.map(r => r.chatRoomId);


        res.status(200).json({ myFriends, myUsername, result, chatRoomIds });

    } catch (err) {
        console.error("Error fetching users: ", err);
        res.status(500).json({ error: "Internal server error" });
    }
}

export const acceptPendingList = async (req: Request, res: Response) => {
    try {
        const { id, username: myName } = req.user || {};
        const myId = id !== undefined ? [id] : [];
        const acceptedUser = await prisma.friend.findMany({
            where: { status: 'accepted' },
            select: { receiverId: true }
        })
        const pendingUsers = await prisma.friend.findMany({
            where: { receiverId: id, status: 'pending' },
            select: { requesterId: true }
        })
        console.log('friend', acceptedUser)
        const acceptedReceiverIds = acceptedUser.map(user => user.receiverId);
        const excludedIds = [...myId, ...acceptedReceiverIds]
        const users = await prisma.users.findMany({
            where: {
                id: {
                    notIn: excludedIds
                }
            },
            select: {
                id: true,
                username: true,
            }
        })
        res.status(200).json({ users, pendingUsers, myId });
    } catch (err) {
        console.error("Error fetching users: ", err);
        res.status(500).json({ error: "Internal server error" });
    }
}

export const addUserList = async (req: Request, res: Response) => {
    try {
        const { id, username: myName } = req.user || {};
        const myId = id !== undefined ? [id] : [];

        const acceptedUser = await prisma.friend.findMany({
            where: {
                status: 'accepted',
                OR: [{ receiverId: id }, { requesterId: id }]
            },
            select: {
                receiverId: true, requesterId: true
            }
        });
        const pendingUsers = await prisma.friend.findMany({
            where: { requesterId: id, status: 'pending' },
            select: { receiverId: true, requesterId: true }
        })
        const sendReqUser = await prisma.friend.findMany({
            where: { receiverId: id, status: 'pending' },
            select: { receiverId: true, requesterId: true }
        })
        console.log('friend', acceptedUser)
        const acceptedReceiverIds = acceptedUser.map(user => user.receiverId);
        const acceptedRequesterIds = acceptedUser.map(user => user.requesterId);
        const sendReqUsers = sendReqUser.map(user => user.requesterId)
        const excludedIds = [...myId, ...acceptedReceiverIds, ...sendReqUsers, ...acceptedRequesterIds]
        const users = await prisma.users.findMany({
            where: {
                id: {
                    notIn: excludedIds
                }
            },
            select: {
                id: true,
                username: true,
            }
        })
        res.status(200).json({ users, pendingUsers });
    } catch (err) {
        console.error("Error fetching users: ", err);
        res.status(500).json({ error: "Internal server error" });
    }
}

export const addFriend = async (req: Request, res: Response) => {
    try {
        console.log('Full req.user:', req.user);
        console.log('Full req.body:', req.body);
        const { id: requesterId, username: requesterName } = req.user || {};
        const { id: receiverId, username: receiverName } = req.body;
        console.log('Destructured values:', receiverId, receiverName, requesterId, requesterName);
        const status = receiverId == 1 ? 'accepted' : 'pending';
        const data: any = {
            receiverId,
            status,
            chatRoom: String(requesterId) + String(receiverId),
        };

        if (typeof requesterId !== 'undefined') {
            data.requesterId = requesterId;
        }

        const newRequest = await prisma.friend.create({
            data
        });

        console.log('new request', newRequest)

        if (receiverId == 1) {
            const additionalData = {
                specialMessage: 'This is a special response for receiver 1!'
            };
            return res.status(200).json({ newRequest, additionalData });
        }
        res.status(200).json(newRequest);
    } catch (err) {
        console.error("Error fetching users: ", err);
        res.status(500).json({ error: "Internal server error" });
    }
}

export const acceptFriend = async (req: Request, res: Response) => {
    try {
        const myId = req.body.receiverId
        const requesterId = req.body.requesterId

        const existingRequest = await prisma.friend.findFirst({
            where: {
                receiverId: requesterId,
                requesterId: myId,
                status: 'pending',
            },
        });

        if (!existingRequest) {
            return res.status(404).json({ error: "Friend request not found" });
        }
        const updateFriend = await prisma.friend.update({
            where: {
                id: existingRequest.id,
            },
            data: {
                status: 'accepted',
            },
        });
        console.log(updateFriend)
        res.status(200).json({ updateFriend })
    } catch (err) {
        console.error("Error fetching users: ", err);
        res.status(500).json({ error: "Internal server error" });
    }
}

export const userRegister = [
    async (req: Request, res: Response, next: NextFunction) => {
        const { username, email, password } = req.body

        try {
            const existingUsername = await prisma.users.findUnique({
                where: {
                    username,
                }
            })
            const existingEmail = await prisma.users.findUnique({
                where: {
                    email,
                }
            })
            if (existingUsername) {
                return res.status(400).json({ error: 'Username is already taken' });
            }

            if (existingEmail) {
                return res.status(400).json({ error: 'Email is already in use' });
            }

            const hashed = await bcrypt.hash(password, 10)

            const newUser = await prisma.users.create({
                data: {
                    username,
                    password: hashed,
                    email
                }
            })
            return res.status(200).json(newUser)
        } catch (error) {
            if (error instanceof Error) {
                const payload = {
                    errorMessage: error.message
                }
                return res.status(500).json(payload)
            }
            throw error
        }

    }

]


export const userLogin = [


    async (req: Request, res: Response, next: NextFunction) => {
        const { username, password } = req.body
        const user = await prisma.users.findUnique({
            where: {
                username,
            }
        })

        try {
            if (user == null) {
                return res.status(500).json({ message: 'No username found' })
            }
            const hashed = user.password
            const passwordMatches = await bcrypt.compare(password, hashed)
            if (!passwordMatches) {
                return res.status(401).json({ message: 'Invalid password' });
            }
            const token = jwt.sign(user, process.env.JWT_SECRET as string)
            res.json({ token })
        } catch (err) {
            console.error("Error fetching users: ", err);
            res.status(500).json({ error: "Internal server error" });
        }
    }
]