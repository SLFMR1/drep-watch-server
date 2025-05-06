import type { Request, Response } from "express";
import supabase from "../supabase/db";

interface Notification {
  id: string;
  created_at: string;
  opened: boolean;
  role: string;
  uuid: string;
  user: string;
  drep: string;
  questions: {
    uuid: string;
    question_title: string;
  };
}

export const getNotifications = async (req: Request, res: Response) => {
  try {
    const { userId, drepId } = req.query;
    if (!userId && !drepId) {
      throw {
        status: 400,
        message: "Either user_id or drep_id must be provided",
      };
    }

    const query = supabase.from("notifications").select(`
      *,
      questions (
        uuid,
        question_title
      )
  `);

    if (userId) {
      query.eq("user", userId as string).eq("role", "User");
    }

    if (drepId) {
      query.eq("drep", drepId as string).eq("role", "Admin");
    }

    const { data, error } = await query
      .order("created_at", {
        ascending: false,
      })
      .returns<Notification[]>();
    console.log(data?.length);
    if (!data || error)
      throw {
        status: 400,
        message: `Could not fetch drep notifications ${error.message}`,
      };

    const { data: answers } = await supabase
      .from("answers")
      .select("answer, uuid")
      .in("uuid", data.map((notification) => notification.uuid));

    res.status(200).json({
      notifications: data.map((item1) => {
        const match = (answers ?? []).find(
          (item2) => item2?.uuid === item1?.uuid
        );
        return { ...item1, ...match };
      }),
    });
  } catch (err: any) {
    res.status(err.status).json({ message: err.message });
  }
};

export const markNotificationAsOpened = async (req: Request, res: Response) => {
  try {
    const notificationId = req.params.notificationId as string;
    const { error } = await supabase
      .from("notifications")
      .update({ opened: true })
      .eq("id", notificationId);

    if (error) {
      throw {
        status: 500,
        message: "Failed to mark notification as opened",
      };
    }
    res.status(200).json({
      message: `Notification marked as opened successfully for ID: ${notificationId}`,
    });
  } catch (err: any) {
    res.status(err.status).json({ message: err.message });
  }
};
