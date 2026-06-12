import { StreamChat } from "stream-chat";
import dotenv from "dotenv";

dotenv.config();

const apiKey = (
  process.env.STREAM_API_KEY ||
  process.env.STREAM_CHAT_API_KEY ||
  ""
).trim();

const apiSecret = (
  process.env.STREAM_API_SECRET ||
  process.env.STREAM_CHAT_API_SECRET ||
  ""
).trim();

const isStreamConfigured = Boolean(apiKey && apiSecret);

export const serverClient = isStreamConfigured
  ? StreamChat.getInstance(apiKey, apiSecret)
  : null;

export const isStreamServiceConfigured = () => isStreamConfigured;
