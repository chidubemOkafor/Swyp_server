import { User } from "../user/user";

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}
