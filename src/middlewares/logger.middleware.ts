import { Express, NextFunction, Request, Response } from "express";
import logger from "../utils/logger";

export function initializeLogger() {
    return (req: Request, res: Response, next: NextFunction) =>{
        logger.info(`${req.method} ${req.url}`);
        next();
    }
    
}