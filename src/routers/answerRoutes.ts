import { Router } from "express";
import { postAnswer, getAnswer, getAnswers } from "../controllers/answerController";
const router = Router();

router.get("/", getAnswers); // get answer for a particular question
router.get("/:q_id", getAnswer); // get answer for a particular question
router.post("/reply", postAnswer); //post an answer for a question

export default router;