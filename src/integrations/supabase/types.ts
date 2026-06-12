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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      bug_reports: {
        Row: {
          created_at: string
          description: string
          email: string | null
          id: string
          last_error_id: string | null
          route: string | null
          status: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          description: string
          email?: string | null
          id?: string
          last_error_id?: string | null
          route?: string | null
          status?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string
          email?: string | null
          id?: string
          last_error_id?: string | null
          route?: string | null
          status?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bug_reports_last_error_id_fkey"
            columns: ["last_error_id"]
            isOneToOne: false
            referencedRelation: "error_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      company_profiles: {
        Row: {
          accent_color: string
          address_line1: string | null
          address_line2: string | null
          city: string | null
          company_name: string
          contact_email: string | null
          contact_phone: string | null
          country: string | null
          created_at: string
          doc_counter: number
          id: string
          logo_url: string | null
          owner_user_id: string
          postal_code: string | null
          registration_number: string | null
          signatory_name: string | null
          signatory_title: string | null
          trading_name: string | null
          updated_at: string
          vat_number: string | null
          website: string | null
        }
        Insert: {
          accent_color?: string
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          company_name?: string
          contact_email?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string
          doc_counter?: number
          id?: string
          logo_url?: string | null
          owner_user_id: string
          postal_code?: string | null
          registration_number?: string | null
          signatory_name?: string | null
          signatory_title?: string | null
          trading_name?: string | null
          updated_at?: string
          vat_number?: string | null
          website?: string | null
        }
        Update: {
          accent_color?: string
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          company_name?: string
          contact_email?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string
          doc_counter?: number
          id?: string
          logo_url?: string | null
          owner_user_id?: string
          postal_code?: string | null
          registration_number?: string | null
          signatory_name?: string | null
          signatory_title?: string | null
          trading_name?: string | null
          updated_at?: string
          vat_number?: string | null
          website?: string | null
        }
        Relationships: []
      }
      contact_messages: {
        Row: {
          created_at: string
          email: string
          id: string
          ip_hash: string | null
          message: string
          name: string
          plan_interest: string | null
          subject: string | null
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          ip_hash?: string | null
          message: string
          name: string
          plan_interest?: string | null
          subject?: string | null
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          ip_hash?: string | null
          message?: string
          name?: string
          plan_interest?: string | null
          subject?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      error_logs: {
        Row: {
          context: Json | null
          created_at: string
          email: string | null
          id: string
          message: string
          route: string | null
          severity: string
          short_id: string
          stack: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          context?: Json | null
          created_at?: string
          email?: string | null
          id?: string
          message: string
          route?: string | null
          severity?: string
          short_id?: string
          stack?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          context?: Json | null
          created_at?: string
          email?: string | null
          id?: string
          message?: string
          route?: string | null
          severity?: string
          short_id?: string
          stack?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      generated_documents: {
        Row: {
          created_at: string
          created_by_user_id: string
          doc_number: string
          doc_type: string
          docx_path: string | null
          id: string
          owner_user_id: string
          pdf_path: string | null
          revoked_at: string | null
          share_expires_at: string
          share_token: string
          title: string
        }
        Insert: {
          created_at?: string
          created_by_user_id: string
          doc_number: string
          doc_type: string
          docx_path?: string | null
          id?: string
          owner_user_id: string
          pdf_path?: string | null
          revoked_at?: string | null
          share_expires_at?: string
          share_token?: string
          title: string
        }
        Update: {
          created_at?: string
          created_by_user_id?: string
          doc_number?: string
          doc_type?: string
          docx_path?: string | null
          id?: string
          owner_user_id?: string
          pdf_path?: string | null
          revoked_at?: string | null
          share_expires_at?: string
          share_token?: string
          title?: string
        }
        Relationships: []
      }
      payfast_webhook_log: {
        Row: {
          amount_gross: number | null
          created_at: string
          id: string
          m_payment_id: string | null
          matched_email: string | null
          matched_user_id: string | null
          merchant_id: string | null
          outcome: string
          payload: Json | null
          payment_status: string | null
          pf_payment_id: string | null
          plan_name: string | null
          reason: string | null
          source_ip: string | null
        }
        Insert: {
          amount_gross?: number | null
          created_at?: string
          id?: string
          m_payment_id?: string | null
          matched_email?: string | null
          matched_user_id?: string | null
          merchant_id?: string | null
          outcome: string
          payload?: Json | null
          payment_status?: string | null
          pf_payment_id?: string | null
          plan_name?: string | null
          reason?: string | null
          source_ip?: string | null
        }
        Update: {
          amount_gross?: number | null
          created_at?: string
          id?: string
          m_payment_id?: string | null
          matched_email?: string | null
          matched_user_id?: string | null
          merchant_id?: string | null
          outcome?: string
          payload?: Json | null
          payment_status?: string | null
          pf_payment_id?: string | null
          plan_name?: string | null
          reason?: string | null
          source_ip?: string | null
        }
        Relationships: []
      }
      security_findings: {
        Row: {
          affected_object: string | null
          created_at: string
          description: string
          id: string
          ignored_at: string | null
          ignored_by: string | null
          ignored_reason: string | null
          remediation: string | null
          rule_id: string
          scan_id: string
          severity: string
          state: string
          title: string
          updated_at: string
        }
        Insert: {
          affected_object?: string | null
          created_at?: string
          description: string
          id?: string
          ignored_at?: string | null
          ignored_by?: string | null
          ignored_reason?: string | null
          remediation?: string | null
          rule_id: string
          scan_id: string
          severity: string
          state?: string
          title: string
          updated_at?: string
        }
        Update: {
          affected_object?: string | null
          created_at?: string
          description?: string
          id?: string
          ignored_at?: string | null
          ignored_by?: string | null
          ignored_reason?: string | null
          remediation?: string | null
          rule_id?: string
          scan_id?: string
          severity?: string
          state?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "security_findings_scan_id_fkey"
            columns: ["scan_id"]
            isOneToOne: false
            referencedRelation: "security_scans"
            referencedColumns: ["id"]
          },
        ]
      }
      security_scans: {
        Row: {
          created_at: string
          critical_count: number
          finished_at: string | null
          high_count: number
          id: string
          low_count: number
          medium_count: number
          notes: string | null
          started_at: string
          status: string
          total_count: number
          trigger_type: string
          triggered_by: string | null
          triggered_by_email: string | null
        }
        Insert: {
          created_at?: string
          critical_count?: number
          finished_at?: string | null
          high_count?: number
          id?: string
          low_count?: number
          medium_count?: number
          notes?: string | null
          started_at?: string
          status?: string
          total_count?: number
          trigger_type?: string
          triggered_by?: string | null
          triggered_by_email?: string | null
        }
        Update: {
          created_at?: string
          critical_count?: number
          finished_at?: string | null
          high_count?: number
          id?: string
          low_count?: number
          medium_count?: number
          notes?: string | null
          started_at?: string
          status?: string
          total_count?: number
          trigger_type?: string
          triggered_by?: string | null
          triggered_by_email?: string | null
        }
        Relationships: []
      }
      share_access_log: {
        Row: {
          created_at: string
          document_id: string
          id: string
          ip_hash: string | null
          outcome: string
          share_token_prefix: string
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          document_id: string
          id?: string
          ip_hash?: string | null
          outcome: string
          share_token_prefix: string
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          document_id?: string
          id?: string
          ip_hash?: string | null
          outcome?: string
          share_token_prefix?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          created_at: string
          email: string | null
          id: string
          payfast_token: string | null
          pf_payment_id: string | null
          plan_name: string
          status: string
          trial_ends_at: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          payfast_token?: string | null
          pf_payment_id?: string | null
          plan_name: string
          status?: string
          trial_ends_at?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          payfast_token?: string | null
          pf_payment_id?: string | null
          plan_name?: string
          status?: string
          trial_ends_at?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      team_members: {
        Row: {
          accepted_at: string | null
          id: string
          invite_token: string
          invited_at: string
          joined_at: string | null
          member_email: string
          member_user_id: string | null
          owner_user_id: string
          status: string
        }
        Insert: {
          accepted_at?: string | null
          id?: string
          invite_token?: string
          invited_at?: string
          joined_at?: string | null
          member_email: string
          member_user_id?: string | null
          owner_user_id: string
          status?: string
        }
        Update: {
          accepted_at?: string | null
          id?: string
          invite_token?: string
          invited_at?: string
          joined_at?: string | null
          member_email?: string
          member_user_id?: string | null
          owner_user_id?: string
          status?: string
        }
        Relationships: []
      }
      user_devices: {
        Row: {
          created_at: string
          device_id: string
          id: string
          label: string | null
          last_seen_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          device_id: string
          id?: string
          label?: string | null
          last_seen_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          device_id?: string
          id?: string
          label?: string | null
          last_seen_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      _sec_scan_collect: {
        Args: never
        Returns: {
          detail: string
          kind: string
          obj: string
        }[]
      }
      accept_team_invite: { Args: { _token: string }; Returns: Json }
      current_account_owner: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      next_document_number: { Args: { _owner: string }; Returns: string }
      register_device: {
        Args: { _device_id: string; _label?: string; _ua?: string }
        Returns: {
          created_at: string
          device_id: string
          id: string
          label: string | null
          last_seen_at: string
          user_agent: string | null
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "user_devices"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
