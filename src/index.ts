
import { httpServer } from "./app";
import "./ws/ws";
import dotenv from 'dotenv';
import logger from "./utils/logger";

dotenv.config();

const port = process.env.PORT || 8989;

import "./config/mongoose.config";

httpServer.listen(port, () => {
    logger.info(`Server running on port: ${port}`);
});

process.on("SIGINT", () => {
    console.log("Shutting down server...");
    httpServer.close(() => {
      console.log("Server closed.");
      process.exit(0);
    });
});
  