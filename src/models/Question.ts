import supabase from "../supabase/db";


interface Question {
  theme: string;
  question_title: string;
  question_description: string;
  wallet_address: string | null;
  drep_id: string;
}
class QuestionModel {
  private theme: string;
  private question_title: string;
  private question_description: string;
  private wallet_address: string | null;
  private drep_id: string;

  constructor({
    theme,
    question_title,
    question_description,
    wallet_address,
    drep_id,
  }: Question) {
    this.theme = theme;
    this.question_title = question_title;
    this.question_description = question_description;
    this.wallet_address = wallet_address;
    this.drep_id = drep_id;
  }
  async save(): Promise<null | (Question & { uuid: string })> {
    try {
      const newQuestion = {
        theme: this.theme,
        question_title: this.question_title,
        question_description: this.question_description,
        wallet_address: this.wallet_address,
        drep_id: this.drep_id,
      };
      const { data, error } = await supabase
        .from("questions")
        .insert(newQuestion)
        .select()
        .single();
      if (error) throw error;
      return data;
    } catch (err: any) {
      return err;
    }
  }
  //method to get a question by uuid
  static async getQuestionById(uuid: string): Promise<Question | undefined> {
    try {
      const { data, error } = await supabase
        .from("questions")
        .select("*")
        .eq("uuid", uuid)
        .single();

      if (error) throw error;
      if (!data) return undefined;
      const question = {
        theme: data.theme,
        question_title: data.question_title,
        question_description: data.question_description,
        wallet_address: data.wallet_address,
        drep_id: data.drep_id,
      };
      return question as Question;
    } catch (err: any) {
      return err;
    }
  }
  //method to fetch the number of questions asked to a drep provided its drep_id
  static async getDrepQuestions(id: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from("questions")
        .select("", { count: "exact", head: true })
        .eq("drep_id", id);

      if (error) {
        console.error(`Error counting questions for drep_id ${id}:`, error);
        return 0;
      }

      return count ?? 0;

    } catch (err: any) {
      console.error(`Exception in getDrepQuestions for drep_id ${id}:`, err);
      return 0;
    }
  }
  static async getQuestionByTheme(
    theme: string
  ): Promise<Question[] | undefined> {
    try {
      const { data, error } = await supabase
        .from("questions")
        .select("*")
        .eq("theme", theme)
        .order("id", { ascending: false });

      if (error) throw error;
      if (!data) return undefined;
      const questions: (Question & { uuid: string })[] = data.map((item) => {
        return {
          uuid: item.uuid as string,
          theme: item.theme,
          question_title: item.question_title,
          question_description: item.question_description,
          wallet_address: item.wallet_address,
          drep_id: item.drep_id,
        };
      });
      return questions;
    } catch (err: any) {
      console.log(err);
      return err;
    }
  }
  static async getLatestQuestions(
    limit: number = 20
  ): Promise<Question[] | undefined> {
    try {
      const { data, error } = await supabase
        .from("questions")
        .select("*")
        .order("id", { ascending: false });
      // .limit(limit);

      if (error) throw error;
      if (!data) return undefined;
      const questions: (Question & { uuid: string })[] = data.map((item) => {
        return {
          uuid: item.uuid as string,
          theme: item.theme,
          question_title: item.question_title,
          question_description: item.question_description,
          wallet_address: item.wallet_address,
          drep_id: item.drep_id,
        };
      });
      return questions;
    } catch (err: any) {
      return err;
    }
  }
  static async getQuestionsByUserId(
    wallet_address: string
  ): Promise<Question[] | undefined> {
    try {
      const { data, error } = await supabase
        .from("questions")
        .select("*")
        .eq("wallet_address", wallet_address)
        .order("id", { ascending: false });
      if (error) throw error;
      const questions: Question[] = data.map((item) => {
        return {
          theme: item.theme,
          question_title: item.question_title,
          question_description: item.question_description,
          wallet_address: item.wallet_address,
          drep_id: item.drep_id,
          uuid: item.uuid as string,
        };
      });
      return questions;
    } catch (err: any) {
      console.log(err);
      return err;
    }
  }
  static async getQuestionsForDrepId(
    drep_id: string
  ): Promise<Question[] | undefined> {
    try {
      const { data, error } = await supabase
        .from("questions")
        .select("*")
        .eq("drep_id", drep_id)
        .order("id", { ascending: false });
      if (error) throw error;
      const questions: Question[] = data.map((item) => {
        return {
          theme: item.theme,
          question_title: item.question_title,
          question_description: item.question_description,
          wallet_address: item.wallet_address,
          drep_id: item.drep_id,
          uuid: item.uuid as string,
        };
      });
      return questions;
    } catch (err: any) {
      console.log(err);
      return err;
    }
  }
}

export { Question, QuestionModel };
