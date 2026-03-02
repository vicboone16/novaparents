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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      academy_module_assignments: {
        Row: {
          agency_id: string | null
          assigned_by: string | null
          coach_user_id: string
          created_at: string
          due_date: string | null
          id: string
          learner_id: string | null
          module_id: string
          module_version_id: string | null
          note_to_coach: string | null
          reminder_cadence: string | null
          status: string
          updated_at: string
        }
        Insert: {
          agency_id?: string | null
          assigned_by?: string | null
          coach_user_id: string
          created_at?: string
          due_date?: string | null
          id?: string
          learner_id?: string | null
          module_id: string
          module_version_id?: string | null
          note_to_coach?: string | null
          reminder_cadence?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          agency_id?: string | null
          assigned_by?: string | null
          coach_user_id?: string
          created_at?: string
          due_date?: string | null
          id?: string
          learner_id?: string | null
          module_id?: string
          module_version_id?: string | null
          note_to_coach?: string | null
          reminder_cadence?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "academy_module_assignments_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "academy_modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academy_module_assignments_module_version_id_fkey"
            columns: ["module_version_id"]
            isOneToOne: false
            referencedRelation: "academy_module_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      academy_module_progress: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          module_id: string
          module_version_id: string | null
          practice_results: Json | null
          reflection_response: string | null
          screens_viewed: string[] | null
          started_at: string | null
          status: string
          updated_at: string
          user_id: string
          xp_earned: number | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          module_id: string
          module_version_id?: string | null
          practice_results?: Json | null
          reflection_response?: string | null
          screens_viewed?: string[] | null
          started_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
          xp_earned?: number | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          module_id?: string
          module_version_id?: string | null
          practice_results?: Json | null
          reflection_response?: string | null
          screens_viewed?: string[] | null
          started_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          xp_earned?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "academy_module_progress_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "academy_modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academy_module_progress_module_version_id_fkey"
            columns: ["module_version_id"]
            isOneToOne: false
            referencedRelation: "academy_module_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      academy_module_rules: {
        Row: {
          agency_id: string | null
          coach_user_id: string | null
          created_at: string
          created_by: string | null
          id: string
          learner_id: string | null
          min_lab_games_completed: number | null
          min_modules_completed: number | null
          min_translator_runs: number | null
          module_id: string
          requirement_override: string | null
          updated_at: string
          visibility: string
        }
        Insert: {
          agency_id?: string | null
          coach_user_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          learner_id?: string | null
          min_lab_games_completed?: number | null
          min_modules_completed?: number | null
          min_translator_runs?: number | null
          module_id: string
          requirement_override?: string | null
          updated_at?: string
          visibility?: string
        }
        Update: {
          agency_id?: string | null
          coach_user_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          learner_id?: string | null
          min_lab_games_completed?: number | null
          min_modules_completed?: number | null
          min_translator_runs?: number | null
          module_id?: string
          requirement_override?: string | null
          updated_at?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "academy_module_rules_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "academy_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      academy_module_versions: {
        Row: {
          content: Json
          created_at: string
          created_by: string | null
          id: string
          module_id: string
          status: string
          updated_at: string
          version_num: number
        }
        Insert: {
          content?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          module_id: string
          status?: string
          updated_at?: string
          version_num?: number
        }
        Update: {
          content?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          module_id?: string
          status?: string
          updated_at?: string
          version_num?: number
        }
        Relationships: [
          {
            foreignKeyName: "academy_module_versions_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "academy_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      academy_modules: {
        Row: {
          agency_id: string | null
          audience: string
          canonical_key: string | null
          created_at: string
          created_by: string | null
          est_minutes: number
          id: string
          scope: string
          short_description: string | null
          skill_tags: string[] | null
          status: string
          suggested_tool: string | null
          title: string
          updated_at: string
        }
        Insert: {
          agency_id?: string | null
          audience?: string
          canonical_key?: string | null
          created_at?: string
          created_by?: string | null
          est_minutes?: number
          id?: string
          scope?: string
          short_description?: string | null
          skill_tags?: string[] | null
          status?: string
          suggested_tool?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          agency_id?: string | null
          audience?: string
          canonical_key?: string | null
          created_at?: string
          created_by?: string | null
          est_minutes?: number
          id?: string
          scope?: string
          short_description?: string | null
          skill_tags?: string[] | null
          status?: string
          suggested_tool?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      academy_path_modules: {
        Row: {
          created_at: string
          id: string
          module_id: string
          path_id: string
          prereq_module_id: string | null
          requirement: string
          sort_order: number
          unlocks_tool: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          module_id: string
          path_id: string
          prereq_module_id?: string | null
          requirement?: string
          sort_order?: number
          unlocks_tool?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          module_id?: string
          path_id?: string
          prereq_module_id?: string | null
          requirement?: string
          sort_order?: number
          unlocks_tool?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "academy_path_modules_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "academy_modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academy_path_modules_path_id_fkey"
            columns: ["path_id"]
            isOneToOne: false
            referencedRelation: "academy_paths"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academy_path_modules_prereq_module_id_fkey"
            columns: ["prereq_module_id"]
            isOneToOne: false
            referencedRelation: "academy_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      academy_paths: {
        Row: {
          agency_id: string | null
          created_at: string
          created_by: string | null
          id: string
          path_type: string
          status: string
          target_coach_id: string | null
          target_learner_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          agency_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          path_type?: string
          status?: string
          target_coach_id?: string | null
          target_learner_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          agency_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          path_type?: string
          status?: string
          target_coach_id?: string | null
          target_learner_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      agency_invite_codes: {
        Row: {
          agency_id: string
          code: string
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          is_active: boolean
          max_uses: number
          role: string
          updated_at: string
          uses: number
        }
        Insert: {
          agency_id: string
          code: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number
          role?: string
          updated_at?: string
          uses?: number
        }
        Update: {
          agency_id?: string
          code?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number
          role?: string
          updated_at?: string
          uses?: number
        }
        Relationships: []
      }
      app_handshake: {
        Row: {
          app_slug: string
          environment_name: string
          id: number
          updated_at: string | null
        }
        Insert: {
          app_slug: string
          environment_name: string
          id?: number
          updated_at?: string | null
        }
        Update: {
          app_slug?: string
          environment_name?: string
          id?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      behavior_lab_attempts: {
        Row: {
          completed_at: string | null
          created_at: string
          game_id: string
          id: string
          mistakes_summary: Json | null
          score_percent: number
          started_at: string
          streak_count: number | null
          user_id: string
          xp_earned: number
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          game_id: string
          id?: string
          mistakes_summary?: Json | null
          score_percent?: number
          started_at?: string
          streak_count?: number | null
          user_id: string
          xp_earned?: number
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          game_id?: string
          id?: string
          mistakes_summary?: Json | null
          score_percent?: number
          started_at?: string
          streak_count?: number | null
          user_id?: string
          xp_earned?: number
        }
        Relationships: [
          {
            foreignKeyName: "behavior_lab_attempts_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "behavior_lab_games"
            referencedColumns: ["id"]
          },
        ]
      }
      behavior_lab_games: {
        Row: {
          agency_id: string | null
          content: Json
          created_at: string
          created_by: string | null
          difficulty: string
          est_seconds: number
          game_key: string | null
          id: string
          scope: string
          short_description: string | null
          skill_tags: string[] | null
          stage: number
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          agency_id?: string | null
          content?: Json
          created_at?: string
          created_by?: string | null
          difficulty?: string
          est_seconds?: number
          game_key?: string | null
          id?: string
          scope?: string
          short_description?: string | null
          skill_tags?: string[] | null
          stage?: number
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          agency_id?: string | null
          content?: Json
          created_at?: string
          created_by?: string | null
          difficulty?: string
          est_seconds?: number
          game_key?: string | null
          id?: string
          scope?: string
          short_description?: string | null
          skill_tags?: string[] | null
          stage?: number
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      evidence_packets: {
        Row: {
          behavior_logs_count: number
          billing_eligible: boolean
          created_at: string
          duration_logs_count: number
          feedback_message: string | null
          flags_summary: Json | null
          followup_items: Json | null
          frequency_logs_count: number
          id: string
          implementation_logs_count: number
          integrity_score: number
          lessons_completed: Json | null
          pages_visited: Json | null
          quiz_scores: Json | null
          reflections_submitted: number
          status: string
          submitted_at: string | null
          total_active_time_sec: number
          user_id: string
        }
        Insert: {
          behavior_logs_count?: number
          billing_eligible?: boolean
          created_at?: string
          duration_logs_count?: number
          feedback_message?: string | null
          flags_summary?: Json | null
          followup_items?: Json | null
          frequency_logs_count?: number
          id?: string
          implementation_logs_count?: number
          integrity_score?: number
          lessons_completed?: Json | null
          pages_visited?: Json | null
          quiz_scores?: Json | null
          reflections_submitted?: number
          status?: string
          submitted_at?: string | null
          total_active_time_sec?: number
          user_id: string
        }
        Update: {
          behavior_logs_count?: number
          billing_eligible?: boolean
          created_at?: string
          duration_logs_count?: number
          feedback_message?: string | null
          flags_summary?: Json | null
          followup_items?: Json | null
          frequency_logs_count?: number
          id?: string
          implementation_logs_count?: number
          integrity_score?: number
          lessons_completed?: Json | null
          pages_visited?: Json | null
          quiz_scores?: Json | null
          reflections_submitted?: number
          status?: string
          submitted_at?: string | null
          total_active_time_sec?: number
          user_id?: string
        }
        Relationships: []
      }
      invite_codes: {
        Row: {
          agency_id: string
          app_context: string | null
          client_id: string | null
          code: string
          created_at: string
          created_by: string | null
          expires_at: string | null
          group_id: string | null
          invite_id: string
          invite_scope: string | null
          max_uses: number
          permissions: Json | null
          revoked_at: string | null
          revoked_by: string | null
          role_slug: string | null
          status: string
          uses_count: number
        }
        Insert: {
          agency_id: string
          app_context?: string | null
          client_id?: string | null
          code: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          group_id?: string | null
          invite_id?: string
          invite_scope?: string | null
          max_uses?: number
          permissions?: Json | null
          revoked_at?: string | null
          revoked_by?: string | null
          role_slug?: string | null
          status?: string
          uses_count?: number
        }
        Update: {
          agency_id?: string
          app_context?: string | null
          client_id?: string | null
          code?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          group_id?: string | null
          invite_id?: string
          invite_scope?: string | null
          max_uses?: number
          permissions?: Json | null
          revoked_at?: string | null
          revoked_by?: string | null
          role_slug?: string | null
          status?: string
          uses_count?: number
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          created_at: string
          daily_reminder: boolean
          id: string
          reminder_hour: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          daily_reminder?: boolean
          id?: string
          reminder_hour?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          daily_reminder?: boolean
          id?: string
          reminder_hour?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_agency_access: {
        Row: {
          agency_id: string
          client_id: string | null
          created_at: string
          id: string
          linked_via_invite_id: string | null
          redeemed_at: string | null
          redeemed_from: string | null
          role: string
          user_id: string
        }
        Insert: {
          agency_id: string
          client_id?: string | null
          created_at?: string
          id?: string
          linked_via_invite_id?: string | null
          redeemed_at?: string | null
          redeemed_from?: string | null
          role?: string
          user_id: string
        }
        Update: {
          agency_id?: string
          client_id?: string | null
          created_at?: string
          id?: string
          linked_via_invite_id?: string | null
          redeemed_at?: string | null
          redeemed_from?: string | null
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_agency_access_linked_via_invite_id_fkey"
            columns: ["linked_via_invite_id"]
            isOneToOne: false
            referencedRelation: "invite_codes"
            referencedColumns: ["invite_id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_streaks: {
        Row: {
          created_at: string
          current_streak: number
          id: string
          last_activity_date: string | null
          longest_streak: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_streak?: number
          id?: string
          last_activity_date?: string | null
          longest_streak?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_streak?: number
          id?: string
          last_activity_date?: string | null
          longest_streak?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      redeem_agency_invite_code: { Args: { _code: string }; Returns: Json }
      redeem_invite_code: {
        Args: { _code: string; _redeemed_from?: string }
        Returns: Json
      }
    }
    Enums: {
      app_role: "agency_admin" | "coach" | "super_admin" | "supervisor"
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
    Enums: {
      app_role: ["agency_admin", "coach", "super_admin", "supervisor"],
    },
  },
} as const
