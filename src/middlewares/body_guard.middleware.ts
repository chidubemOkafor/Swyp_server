import { Request, Response, NextFunction } from "express";


export function body_guard(req: Request, res: Response, next: NextFunction) {
  if (
    req.method === "POST" &&
    req.headers["content-type"]?.includes("application/json") &&
    !req.body
  ) {
    console.log(1)
    console.log("cooking...")
    res.status(400).json({ message: "Empty JSON body." });
    return 
  }
  next();
}