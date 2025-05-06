import supabase from "../supabase/db";

interface Answer {
  answer: string;
  uuid: string;
  drep_id: string;
  drep_name?: string | undefined;
}
class AnswerModel {
  private answer: string;
  private uuid: string;
  private drep_id: string;
  constructor({ answer, uuid, drep_id }: Answer) {
    this.answer = answer;
    this.uuid = uuid;
    this.drep_id = drep_id;
  }
  async save(): Promise<
    | {
        answer: string;
        drep_id: string | null;
        id: number;
        uuid: string | null;
      }
    | undefined
  > {
    try {
      const { data, error } = await supabase
        .from("answers")
        .upsert(
          {
            answer: this.answer,
            drep_id: this.drep_id,
            uuid: this.uuid,
          },
          {
            onConflict: "uuid",
          }
        )
        .select()
        .single();
      if (error) throw error;
      return data;
    } catch (err: any) {
      return err;
    }
  }
  //method to get answer by questionId
  static async getAnswerByQuestionId(
    questionId: string
  ): Promise<(Answer & { id: number }) | undefined> {
    try {
      const { data, error } = await supabase
        .from("answers")
        .select("*")
        .eq("uuid", questionId)
        .maybeSingle();

      if (error) throw error;
      if (!data?.drep_id) return undefined;

      return { ...data, drep_name: data.drep_id } as Answer & {
        id: number;
      };
    } catch (err: any) {
      return err;
    }
  }
  //Method to fetch the number of answers provided by a drep
  static async getDrepAnswers(id: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from("answers")
        .select("", { count: "exact", head: true })
        .eq("drep_id", id);

      if (error) {
        console.error(`Error counting answers for drep_id ${id}:`, error);
        return 0;
      }

      return count ?? 0;
    } catch (err: any) {
      console.error(`Exception in getDrepAnswers for drep_id ${id}:`, err);
      return 0;
    }
  }
  static async getLatestDrepAnswers(
    limit = 10
  ): Promise<(Answer & { id: number })[] | undefined> {
    try {
      const { data, error } = await supabase
        .from("answers")
        .select("*")
        .order("id", { ascending: false });

      if (error) throw error;
      if (!data) return undefined;

      const answers: (Answer & { id: number })[] = [];

      for (const item of data) {
        if (!item.drep_id || !item.uuid) continue;

        answers.push({
          id: item.id,
          answer: item.answer,
          uuid: item.uuid,
          drep_id: item.drep_id,
          drep_name: item.drep_id,
        });
      }

      return answers;
    } catch (err: any) {
      return err;
    }
  }
}
export { Answer, AnswerModel };
