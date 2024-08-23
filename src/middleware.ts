import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { DecodedToken } from './type'
import { users } from "@prisma/client";
import { CustomRequest } from "./types/express";


export function verifyToken(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers['authorization']
    const token = req.headers['authorization']?.split(' ')[1] || '';
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as DecodedToken
        (req as unknown as CustomRequest).token = decoded;
        (req as unknown as CustomRequest).user = decoded as unknown as users;
        next();
    } catch (err) {
        return res.status(403).json({ error: 'Invalid token.' });
    }
}