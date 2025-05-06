export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      answers: {
        Row: {
          answer: string
          drep_id: string | null
          id: number
          uuid: string | null
        }
        Insert: {
          answer: string
          drep_id?: string | null
          id?: number
          uuid?: string | null
        }
        Update: {
          answer?: string
          drep_id?: string | null
          id?: number
          uuid?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "public_answers_drep_id_fkey"
            columns: ["drep_id"]
            isOneToOne: false
            referencedRelation: "dreps"
            referencedColumns: ["drep_id"]
          },
          {
            foreignKeyName: "public_answers_question_id_fkey"
            columns: ["uuid"]
            isOneToOne: true
            referencedRelation: "questions"
            referencedColumns: ["uuid"]
          },
        ]
      }
      dreps: {
        Row: {
          created_at: string
          drep_id: string
          email: string | null
          name: string
          wallet_address: string | null
        }
        Insert: {
          created_at?: string
          drep_id?: string
          email?: string | null
          name: string
          wallet_address?: string | null
        }
        Update: {
          created_at?: string
          drep_id?: string
          email?: string | null
          name?: string
          wallet_address?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          drep: string | null
          id: string
          opened: boolean | null
          role: Database["public"]["Enums"]["NotificationRole"] | null
          user: string | null
          uuid: string | null
        }
        Insert: {
          created_at?: string
          drep?: string | null
          id?: string
          opened?: boolean | null
          role?: Database["public"]["Enums"]["NotificationRole"] | null
          user?: string | null
          uuid?: string | null
        }
        Update: {
          created_at?: string
          drep?: string | null
          id?: string
          opened?: boolean | null
          role?: Database["public"]["Enums"]["NotificationRole"] | null
          user?: string | null
          uuid?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "public_notifications_drep_fkey"
            columns: ["drep"]
            isOneToOne: false
            referencedRelation: "dreps"
            referencedColumns: ["drep_id"]
          },
          {
            foreignKeyName: "public_notifications_question_id_fkey"
            columns: ["uuid"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["uuid"]
          },
          {
            foreignKeyName: "public_notifications_user_fkey"
            columns: ["user"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["wallet_address"]
          },
        ]
      }
      proposals: {
        Row: {
          ada_amount: string | null
          agreed: string[] | null
          catalyst_link: string | null
          category: string | null
          created_at: string
          description: string | null
          fund_no: number | null
          id: string
          not_agreed: string[] | null
          title: string | null
        }
        Insert: {
          ada_amount?: string | null
          agreed?: string[] | null
          catalyst_link?: string | null
          category?: string | null
          created_at?: string
          description?: string | null
          fund_no?: number | null
          id?: string
          not_agreed?: string[] | null
          title?: string | null
        }
        Update: {
          ada_amount?: string | null
          agreed?: string[] | null
          catalyst_link?: string | null
          category?: string | null
          created_at?: string
          description?: string | null
          fund_no?: number | null
          id?: string
          not_agreed?: string[] | null
          title?: string | null
        }
        Relationships: []
      }
      questions: {
        Row: {
          drep_id: string
          id: number
          question_description: string
          question_title: string
          theme: string
          uuid: string
          wallet_address: string | null
        }
        Insert: {
          drep_id: string
          id?: number
          question_description: string
          question_title: string
          theme: string
          uuid?: string
          wallet_address?: string | null
        }
        Update: {
          drep_id?: string
          id?: number
          question_description?: string
          question_title?: string
          theme?: string
          uuid?: string
          wallet_address?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "public_questions_drep_id_fkey"
            columns: ["drep_id"]
            isOneToOne: false
            referencedRelation: "dreps"
            referencedColumns: ["drep_id"]
          },
          {
            foreignKeyName: "public_questions_wallet_address_fkey"
            columns: ["wallet_address"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["wallet_address"]
          },
        ]
      }
      users: {
        Row: {
          email: string | null
          name: string | null
          wallet_address: string
        }
        Insert: {
          email?: string | null
          name?: string | null
          wallet_address: string
        }
        Update: {
          email?: string | null
          name?: string | null
          wallet_address?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      NotificationRole: "User" | "Admin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never
