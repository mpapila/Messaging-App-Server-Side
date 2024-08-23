import { users } from "@prisma/client";
import { Request } from "express"
import { JwtPayload } from "jsonwebtoken"


export interface User {
    requesterName: string;
    requesterId: string;
}

export interface DecodedToken {
    [x: string]: any;
    _id: string
}
