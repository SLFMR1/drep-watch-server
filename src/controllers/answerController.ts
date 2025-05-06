import type { Request, Response } from "express";
import { Answer, AnswerModel } from "../models/Answer";
import supabase from "../supabase/db";
import { QuestionModel } from "../models/Question";
import DrepModel from "../models/Drep";

export const postAnswer = async (req: Request, res: Response) => {
  try {
    const answerBody: Answer = req.body;
    
    if (answerBody.drep_id) {
      try {
        const drepMetadata = await DrepModel.getDrep(answerBody.drep_id);
        if (drepMetadata && drepMetadata.body && drepMetadata.body.givenName) {
          if (typeof drepMetadata.body.givenName === 'string') {
            answerBody.drep_name = drepMetadata.body.givenName;
          } else if (drepMetadata.body.givenName["@value"] && 
                    typeof drepMetadata.body.givenName["@value"] === 'string') {
            answerBody.drep_name = drepMetadata.body.givenName["@value"];
          }
        }
      } catch (metadataErr) {
        console.log("Error fetching drep metadata:", metadataErr);
      }
    }
    
    const answer = new AnswerModel(answerBody);
    const savedAnswer = await answer.save();
    if (!savedAnswer)
      throw { status: 400, message: "Failed to save the answer" };

    const question = await QuestionModel.getQuestionById(
      savedAnswer.uuid as unknown as string
    );
    if (!question) throw { status: 400, message: "Invalid questionId" };
    const { error } = await supabase
      .from("notifications")
      .insert({
        role: "User",
        uuid: savedAnswer.uuid,
        drep: savedAnswer.drep_id,
        opened: false,
        user: question.wallet_address,
      })
      .single();
    if (error) throw { status: 400, message: error.message };
    res.status(201).json({ savedAnswer });
  } catch (err: any) {
    res.status(err.status).json({ message: err.message });
  }
};
export const getAnswer = async (req: Request, res: Response) => {
  try {
    const questionId = req.params.q_id;
    const answer = await AnswerModel.getAnswerByQuestionId(questionId);
    if (!answer) {
      return res.status(200).json({ 
        answer: "",
        uuid: questionId,
        drep_id: "",
        drep_name: "" 
      });
    }
    
    if (answer.drep_id) {
      try {
        const drepMetadata = await DrepModel.getDrep(answer.drep_id);
        if (drepMetadata && drepMetadata.body && drepMetadata.body.givenName) {
          if (typeof drepMetadata.body.givenName === 'string') {
            answer.drep_name = drepMetadata.body.givenName;
          } else if (drepMetadata.body.givenName["@value"] && 
                    typeof drepMetadata.body.givenName["@value"] === 'string') {
            answer.drep_name = drepMetadata.body.givenName["@value"];
          }
        }
      } catch (metadataErr) {
        console.log("Error fetching drep metadata:", metadataErr);
      }
    }
    
    res.status(200).json(answer);
  } catch (err: any) {
    res.status(err.status || 500).json({ message: err.message });
  }
};
export const getAnswers = async (req: Request, res: Response) => {
  try {
    // console.log(req.params);
    const isLatest = (req.query.latest as string) === "true";
    if (!isLatest) {
      throw {
        status: 400,
        message: `latest param not true`,
      };
    }
    
    const answers = await AnswerModel.getLatestDrepAnswers();
    if (!answers)
      throw {
        status: 400,
        message: `Could not fetch latest questions`,
      };
    
    for (const answer of answers) {
      if (answer.drep_id) {
        try {
          const drepMetadata = await DrepModel.getDrep(answer.drep_id);
          if (drepMetadata && drepMetadata.body && drepMetadata.body.givenName) {
            if (typeof drepMetadata.body.givenName === 'string') {
              answer.drep_name = drepMetadata.body.givenName;
            } else if (drepMetadata.body.givenName["@value"] && 
                      typeof drepMetadata.body.givenName["@value"] === 'string') {
              answer.drep_name = drepMetadata.body.givenName["@value"];
            }
          }
        } catch (metadataErr) {
          console.log("Error fetching drep metadata:", metadataErr);        }
      }
    }
    
    res.status(200).json({ answers });
  } catch (err: any) {
    res.status(err.status).json({ message: err.message });
  }
};
