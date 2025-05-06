import { Router } from "express";
import {
  createQuestion,
  getQuestion,
  getQuestionByUser,
  getQuestionsByTheme,
  getLatestQuestions,
} from "../controllers/questionController";

const router = Router();

router.get("/latest", getLatestQuestions);
router.post("/ask-question", createQuestion);
router.get("/:id", getQuestion);
router.get("/",getQuestionByUser);//pass the wallet_address or drep_id in query params
router.get("/theme/:theme", getQuestionsByTheme);

export default router;