export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      adherance_logs: {
        Row: {
          device_id: string | null
          event: string | null
          id: number
          timestamp: string | null
        }
        Insert: {
          device_id?: string | null
          event?: string | null
          id?: number
          timestamp?: string | null
        }
        Update: {
          device_id?: string | null
          event?: string | null
          id?: number
          timestamp?: string | null
        }
        Relationships: []
      }
      med_events: {
        Row: {
          created_at: string | null
          event_time: string
          event_type: string
          id: number
          medication_id: number
          metadata: Json | null
          source: string | null
          user_key: string
        }
        Insert: {
          created_at?: string | null
          event_time?: string
          event_type: string
          id?: number
          medication_id: number
          metadata?: Json | null
          source?: string | null
          user_key: string
        }
        Update: {
          created_at?: string | null
          event_time?: string
          event_type?: string
          id?: number
          medication_id?: number
          metadata?: Json | null
          source?: string | null
          user_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "med_events_medication_id_fkey"
            columns: ["medication_id"]
            isOneToOne: false
            referencedRelation: "medications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "med_events_user_key_fkey"
            columns: ["user_key"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_key"]
          },
        ]
      }
      medications: {
        Row: {
          created_at: string | null
          drug_name: string | null
          frequency_text: string | null
          id: number
          instruction: string | null
          is_active: boolean | null
          medication_key: string | null
          qty_text: string | null
          refills_text: string | null
          route: string | null
          strength: string | null
          updated_at: string | null
          user_key: string
        }
        Insert: {
          created_at?: string | null
          drug_name?: string | null
          frequency_text?: string | null
          id?: number
          instruction?: string | null
          is_active?: boolean | null
          medication_key?: string | null
          qty_text?: string | null
          refills_text?: string | null
          route?: string | null
          strength?: string | null
          updated_at?: string | null
          user_key: string
        }
        Update: {
          created_at?: string | null
          drug_name?: string | null
          frequency_text?: string | null
          id?: number
          instruction?: string | null
          is_active?: boolean | null
          medication_key?: string | null
          qty_text?: string | null
          refills_text?: string | null
          route?: string | null
          strength?: string | null
          updated_at?: string | null
          user_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "medications_user_key_fkey"
            columns: ["user_key"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_key"]
          },
        ]
      }
      user_profiles: {
        Row: {
          age: number | null
          created_at: string | null
          gender: string | null
          id: number
          nickname: string | null
          updated_at: string | null
          user_key: string
        }
        Insert: {
          age?: number | null
          created_at?: string | null
          gender?: string | null
          id?: number
          nickname?: string | null
          updated_at?: string | null
          user_key: string
        }
        Update: {
          age?: number | null
          created_at?: string | null
          gender?: string | null
          id?: number
          nickname?: string | null
          updated_at?: string | null
          user_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_profiles_user_key_fkey"
            columns: ["user_key"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["user_key"]
          },
        ]
      }
      user_settings: {
        Row: {
          confirmation_window_minutes: number | null
          created_at: string | null
          id: number
          updated_at: string | null
          use_rfid_confirmation: boolean | null
          user_key: string
        }
        Insert: {
          confirmation_window_minutes?: number | null
          created_at?: string | null
          id?: number
          updated_at?: string | null
          use_rfid_confirmation?: boolean | null
          user_key: string
        }
        Update: {
          confirmation_window_minutes?: number | null
          created_at?: string | null
          id?: number
          updated_at?: string | null
          use_rfid_confirmation?: boolean | null
          user_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_settings_user_key_fkey"
            columns: ["user_key"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["user_key"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string | null
          display_name: string | null
          email: string | null
          first_name: string | null
          id: number
          last_name: string | null
          updated_at: string | null
          user_key: string
        }
        Insert: {
          created_at?: string | null
          display_name?: string | null
          email?: string | null
          first_name?: string | null
          id?: number
          last_name?: string | null
          updated_at?: string | null
          user_key: string
        }
        Update: {
          created_at?: string | null
          display_name?: string | null
          email?: string | null
          first_name?: string | null
          id?: number
          last_name?: string | null
          updated_at?: string | null
          user_key?: string
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
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
