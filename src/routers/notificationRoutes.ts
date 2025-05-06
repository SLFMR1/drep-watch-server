import { Router } from "express";
import {
  getNotifications,
  markNotificationAsOpened,
} from "../controllers/notificationController";

const notificationRoutes = Router();

notificationRoutes.get("/", getNotifications);
notificationRoutes.post("/:notificationId/opened", markNotificationAsOpened);

export default notificationRoutes;
