import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import cron from 'node-cron';
import { indexDrepsToSupabase } from './services/drepIndexer';
import userRoutes from "./routers/userRoute";
import drepRoutes from "./routers/drepRoute";
import questionRoutes from "./routers/questionRoutes";
import answerRoutes from "./routers/answerRoutes";
import notificationRoutes from "./routers/notificationRoutes";
import supabase from "./supabase/db";

const app = express();

app.use(express.json({ limit: '1gb' }));
app.use(express.urlencoded({ extended: true, limit: '1gb' }));

app.use(cookieParser());
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use("/api/v1/user", userRoutes);
app.use("/api/v1/drep", drepRoutes);
app.use("/api/v1/questions", questionRoutes);
app.use("/api/v1/answers", answerRoutes);
app.use("/api/v1/notifications", notificationRoutes);

app.get('/test', (req, res) => {
  console.log('Test endpoint hit at:', new Date().toISOString());
  res.json({ message: 'Server is working!', timestamp: new Date().toISOString() });
});

console.log('Setting up DREP indexing cron job...');
cron.schedule('0 0,12 * * *', async () => {
  console.log(`[${new Date().toISOString()}] Running scheduled DREP indexing job...`);
  try {
    await indexDrepsToSupabase();
    console.log(`[${new Date().toISOString()}] Scheduled DREP indexing job finished successfully.`);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error during scheduled DREP indexing job:`, error);
  }
}, {
  scheduled: true,
  timezone: "UTC" 
});
console.log('DREP indexing cron job scheduled to run at 00:00 and 12:00 UTC.');

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

export default app;
