import { Request, Response, NextFunction } from "express";
import { verifyJwt } from "../utils/jwt";

export function authenticateJwt(
    req: Request,
    res: Response,
    next: NextFunction
  ): void {
    const authHeader = req.headers.authorization;
  
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ message: "No token provided" });
      return;
    }
  
    const token = authHeader.split(" ")[1];
    const decoded = verifyJwt(token)
  
    if (!decoded) {
      res.status(401).json({ message: "Invalid or expired token" });
      return;
    }

    if (
        !decoded ||
        typeof decoded === "string" ||
        !("userId" in decoded && "username" in decoded)
    ) {
        res.status(401).json({ message: "Invalid or expired token" });
        return;
    }
    
    req.user = {
        userId: decoded.userId,
        username: decoded.username,
    };
    next();
}