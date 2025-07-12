import mongoose from "mongoose"
import logger from "../utils/logger"
import dotenv from "dotenv"
dotenv.config()

mongoose.connect(process.env.MONGODB_URL as string, {
    tls: true,
    tlsAllowInvalidCertificates: false,
})

const db = mongoose.connection;
db.on('error', (error) => {
  logger.error('MongoDB connection error:', error);
});
db.once('open', () => {
  logger.info('Connected to MongoDB');
});

process.on('SIGINT', () => {
    mongoose.connection.close = () => {
      logger.info('Mongoose connection closed through app termination');
      process.exit(0);
    };
});