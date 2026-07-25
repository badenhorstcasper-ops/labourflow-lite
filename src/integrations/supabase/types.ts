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
      chairperson_bookings: {
        Row: {
          account_owner_id: string
          contact_email: string
          contact_phone: string
          created_at: string
          document_id: string | null
          employee_name: string
          employer_name: string
          id: string
          notes: string | null
          preferred_platform: string
          preferred_slots: Json
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_owner_id: string
          contact_email: string
          contact_phone: string
          created_at?: string
          document_id?: string | null
          employee_name: string
          employer_name: string
          id?: string
          notes?: string | null
          preferred_platform: string
          preferred_slots: Json
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_owner_id?: string
          contact_email?: string
          contact_phone?: string
          created_at?: string
          document_id?: string | null
          employee_name?: string
          employer_name?: string
          id?: string
          notes?: string | null
          preferred_platform?: string
          preferred_slots?: Json
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chairperson_bookings_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "generated_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_calculations: {
        Row: {
          active_subs_count: number
          calendar_month: string
          cancellations_count: number
          created_at: string
          gross_commission_zar: number
          id: string
          notes: string | null
          paid_at: string | null
          paid_by: string | null
          salesperson_id: string
          status: Database["public"]["Enums"]["commission_status"]
          updated_at: string
        }
        Insert: {
          active_subs_count?: number
          calendar_month: string
          cancellations_count?: number
          created_at?: string
          gross_commission_zar?: number
          id?: string
          notes?: string | null
          paid_at?: string | null
          paid_by?: string | null
          salesperson_id: string
          status?: Database["public"]["Enums"]["commission_status"]
          updated_at?: string
        }
        Update: {
          active_subs_count?: number
          calendar_month?: string
          cancellations_count?: number
          created_at?: string
          gross_commission_zar?: number
          id?: string
          notes?: string | null
          paid_at?: string | null
          paid_by?: string | null
          salesperson_id?: string
          status?: Database["public"]["Enums"]["commission_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "commission_calculations_salesperson_id_fkey"
            columns: ["salesperson_id"]
            isOneToOne: false
            referencedRelation: "salespersons"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_line_items: {
        Row: {
          amount_zar: number
          calculation_id: string
          collected_date: string | null
          created_at: string
          id: string
          plan_name: string
          salesperson_id: string
          subscriber_email: string | null
          subscriber_user_id: string | null
          transaction_ref: string | null
        }
        Insert: {
          amount_zar: number
          calculation_id: string
          collected_date?: string | null
          created_at?: string
          id?: string
          plan_name: string
          salesperson_id: string
          subscriber_email?: string | null
          subscriber_user_id?: string | null
          transaction_ref?: string | null
        }
        Update: {
          amount_zar?: number
          calculation_id?: string
          collected_date?: string | null
          created_at?: string
          id?: string
          plan_name?: string
          salesperson_id?: string
          subscriber_email?: string | null
          subscriber_user_id?: string | null
          transaction_ref?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "commission_line_items_calculation_id_fkey"
            columns: ["calculation_id"]
            isOneToOne: false
            referencedRelation: "commission_calculations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_line_items_salesperson_id_fkey"
            columns: ["salesperson_id"]
            isOneToOne: false
            referencedRelation: "salespersons"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_rates: {
        Row: {
          active_from: string
          active_to: string | null
          amount_zar: number
          created_at: string
          id: string
          plan_name: string
        }
        Insert: {
          active_from?: string
          active_to?: string | null
          amount_zar: number
          created_at?: string
          id?: string
          plan_name: string
        }
        Update: {
          active_from?: string
          active_to?: string | null
          amount_zar?: number
          created_at?: string
          id?: string
          plan_name?: string
        }
        Relationships: []
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
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
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
          resolved: boolean
          resolved_at: string | null
          resolved_by: string | null
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
          resolved?: boolean
          resolved_at?: string | null
          resolved_by?: string | null
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
          resolved?: boolean
          resolved_at?: string | null
          resolved_by?: string | null
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
      notification_log: {
        Row: {
          error: string | null
          id: string
          recipient_email: string
          related_month: string | null
          sent_at: string
          status: string
          type: string
        }
        Insert: {
          error?: string | null
          id?: string
          recipient_email: string
          related_month?: string | null
          sent_at?: string
          status?: string
          type: string
        }
        Update: {
          error?: string | null
          id?: string
          recipient_email?: string
          related_month?: string | null
          sent_at?: string
          status?: string
          type?: string
        }
        Relationships: []
      }
      page_views: {
        Row: {
          created_at: string
          id: string
          path: string
          referrer: string | null
          session_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          path: string
          referrer?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          path?: string
          referrer?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      partner_agreements: {
        Row: {
          accepted_at: string
          accepted_full_name: string
          accepted_ip: string | null
          accepted_user_agent: string | null
          agreement_version: string
          applicant_email: string
          clause_flags: Json
          created_at: string
          id: string
          salesperson_id: string | null
        }
        Insert: {
          accepted_at?: string
          accepted_full_name: string
          accepted_ip?: string | null
          accepted_user_agent?: string | null
          agreement_version: string
          applicant_email: string
          clause_flags: Json
          created_at?: string
          id?: string
          salesperson_id?: string | null
        }
        Update: {
          accepted_at?: string
          accepted_full_name?: string
          accepted_ip?: string | null
          accepted_user_agent?: string | null
          agreement_version?: string
          applicant_email?: string
          clause_flags?: Json
          created_at?: string
          id?: string
          salesperson_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partner_agreements_salesperson_id_fkey"
            columns: ["salesperson_id"]
            isOneToOne: false
            referencedRelation: "salespersons"
            referencedColumns: ["id"]
          },
        ]
      }
      payfast_transactions: {
        Row: {
          amount: number
          billing_date: string | null
          created_at: string
          email: string
          id: string
          m_payment_id: string
          payfast_token: string | null
          pf_payment_id: string | null
          plan_name: string
          raw_itn: Json | null
          referral_code: string | null
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          amount: number
          billing_date?: string | null
          created_at?: string
          email: string
          id?: string
          m_payment_id: string
          payfast_token?: string | null
          pf_payment_id?: string | null
          plan_name: string
          raw_itn?: Json | null
          referral_code?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          amount?: number
          billing_date?: string | null
          created_at?: string
          email?: string
          id?: string
          m_payment_id?: string
          payfast_token?: string | null
          pf_payment_id?: string | null
          plan_name?: string
          raw_itn?: Json | null
          referral_code?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
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
      public_holidays: {
        Row: {
          created_at: string
          date: string
          name: string
        }
        Insert: {
          created_at?: string
          date: string
          name: string
        }
        Update: {
          created_at?: string
          date?: string
          name?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          attributed_at: string
          created_at: string
          id: string
          referral_code: string
          salesperson_id: string
          subscriber_email: string | null
          subscriber_user_id: string | null
        }
        Insert: {
          attributed_at?: string
          created_at?: string
          id?: string
          referral_code: string
          salesperson_id: string
          subscriber_email?: string | null
          subscriber_user_id?: string | null
        }
        Update: {
          attributed_at?: string
          created_at?: string
          id?: string
          referral_code?: string
          salesperson_id?: string
          subscriber_email?: string | null
          subscriber_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "referrals_salesperson_id_fkey"
            columns: ["salesperson_id"]
            isOneToOne: false
            referencedRelation: "salespersons"
            referencedColumns: ["id"]
          },
        ]
      }
      salesperson_access_log: {
        Row: {
          created_at: string
          field_viewed: string
          id: string
          salesperson_id: string
          viewer_email: string | null
          viewer_user_id: string | null
        }
        Insert: {
          created_at?: string
          field_viewed: string
          id?: string
          salesperson_id: string
          viewer_email?: string | null
          viewer_user_id?: string | null
        }
        Update: {
          created_at?: string
          field_viewed?: string
          id?: string
          salesperson_id?: string
          viewer_email?: string | null
          viewer_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "salesperson_access_log_salesperson_id_fkey"
            columns: ["salesperson_id"]
            isOneToOne: false
            referencedRelation: "salespersons"
            referencedColumns: ["id"]
          },
        ]
      }
      salespersons: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          banking_details: Json | null
          created_at: string
          demo_revoked_at: string | null
          email: string
          full_name: string
          id: string
          id_number: string | null
          notes: string | null
          notice_end_date: string | null
          phone: string | null
          referral_code: string | null
          status: Database["public"]["Enums"]["salesperson_status"]
          terminated_reason: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          banking_details?: Json | null
          created_at?: string
          demo_revoked_at?: string | null
          email: string
          full_name: string
          id?: string
          id_number?: string | null
          notes?: string | null
          notice_end_date?: string | null
          phone?: string | null
          referral_code?: string | null
          status?: Database["public"]["Enums"]["salesperson_status"]
          terminated_reason?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          banking_details?: Json | null
          created_at?: string
          demo_revoked_at?: string | null
          email?: string
          full_name?: string
          id?: string
          id_number?: string | null
          notes?: string | null
          notice_end_date?: string | null
          phone?: string | null
          referral_code?: string | null
          status?: Database["public"]["Enums"]["salesperson_status"]
          terminated_reason?: string | null
          updated_at?: string
          user_id?: string | null
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
          device_limit: number
          email: string | null
          id: string
          is_demo: boolean
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
          device_limit?: number
          email?: string | null
          id?: string
          is_demo?: boolean
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
          device_limit?: number
          email?: string | null
          id?: string
          is_demo?: boolean
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
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
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
      commission_payout_date: { Args: { _month: string }; Returns: string }
      current_account_owner: { Args: never; Returns: string }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      email_queue_dispatch: { Args: never; Returns: undefined }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      generate_referral_code: { Args: never; Returns: string }
      get_salesperson_sensitive: {
        Args: { _salesperson_id: string }
        Returns: {
          banking_details: Json
          id_number: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      next_document_number: { Args: { _owner: string }; Returns: string }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
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
      commission_status: "pending" | "paid"
      salesperson_status:
        | "pending_approval"
        | "active"
        | "inactive"
        | "rejected"
        | "notice"
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
      commission_status: ["pending", "paid"],
      salesperson_status: [
        "pending_approval",
        "active",
        "inactive",
        "rejected",
        "notice",
      ],
    },
  },
} as const
