import { Request, Response } from "express";
import { User } from "../../models/auth.models";
import createError from 'http-errors';
import logger from "../../utils/logger";
import { signJwt } from "../../utils/jwt";

export class LocalAuth {
    constructor (
        private readonly req: Request,
        private readonly res: Response
        
    ) {}

    async create() {
        const { username,  password } = this.req.body
        if(!username || !password || username.length === 0 || password.length === 0) {
            return this.res.status(new createError.NotAcceptable().statusCode).json({message: "username or password is not valid"})
        }
        try {
            const usernameExist = await User.findOne({ username })
            if(usernameExist) {
                return this.res.status(new createError.Conflict().statusCode).json({ message: "username already exists" });
            }

            const auth = new User({
                username,
                password,
            })
    
            await auth.save()
            const response = {
                message: "successfully created account proceed to login",
            }

            return this.res.status(201).json( response )
        } catch (error) {
            logger.error(`something went wrong: ${error}`)
            throw new createError.InternalServerError(`something went wrong; ${error}`)
        }
    }

    async signIn() {
        const { username,  password } = this.req.body
        if(!username || !password || username.length === 0 || password.length === 0) {
            return this.res.status(new createError.NotAcceptable().statusCode).json({message: "username or password is not valid"})
        }
        try {
            const user = await User.findOne({username})
            if (!user || user.password !== password) {
                return this.res.status(new createError.NotAcceptable().statusCode).json({ message: "Invalid credentials" });
              }

            const jwt =  signJwt({userId: user._id.toString(), username: user.username})

            return this.res.status(201).json({ jwt, username })
        } catch (error) {
            if(error) {
                throw error
            }
            logger.error(`something went wrong: ${error}`)
        }
    }
}