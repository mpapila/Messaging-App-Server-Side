import express from "express";

declare global {
    namespace Express {
        interface User {
            username?: string;
            id?: number;
        }

        interface Request {
            user?: User;
        }
    }
}

export interface CustomRequest extends Request {
    token?: string | JwtPayload | DecodedToken;
    user?: users
}