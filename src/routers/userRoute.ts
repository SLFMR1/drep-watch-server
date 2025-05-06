import { Router } from "express";
import { createUser, getUser } from "../controllers/userController";

const userRoutes = Router();

userRoutes.post("/create", createUser);
userRoutes.post("/", getUser);

export default userRoutes;
