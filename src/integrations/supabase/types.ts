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
      audit_log: {
        Row: {
          action: string
          created_at: string
          details: string | null
          id: string
          ticket_id: string
          user_name: string
        }
        Insert: {
          action: string
          created_at?: string
          details?: string | null
          id?: string
          ticket_id: string
          user_name: string
        }
        Update: {
          action?: string
          created_at?: string
          details?: string | null
          id?: string
          ticket_id?: string
          user_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      csat_responses: {
        Row: {
          comment: string | null
          created_at: string
          customer_id: string
          id: string
          rating: number | null
          submitted_at: string | null
          ticket_id: string
          token: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          customer_id: string
          id?: string
          rating?: number | null
          submitted_at?: string | null
          ticket_id: string
          token?: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          customer_id?: string
          id?: string
          rating?: number | null
          submitted_at?: string | null
          ticket_id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "csat_responses_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "csat_responses_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          auth_user_id: string | null
          company: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          notes: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          auth_user_id?: string | null
          company?: string | null
          created_at?: string
          email: string
          full_name: string
          id?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          auth_user_id?: string | null
          company?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      email_inbound_events: {
        Row: {
          content_type: string | null
          created_at: string
          customer_id: string | null
          error_message: string | null
          id: string
          in_reply_to: string | null
          message_id: string | null
          raw_headers: Json | null
          sender_email: string | null
          sender_name: string | null
          status: string
          subject: string | null
          ticket_id: string | null
        }
        Insert: {
          content_type?: string | null
          created_at?: string
          customer_id?: string | null
          error_message?: string | null
          id?: string
          in_reply_to?: string | null
          message_id?: string | null
          raw_headers?: Json | null
          sender_email?: string | null
          sender_name?: string | null
          status?: string
          subject?: string | null
          ticket_id?: string | null
        }
        Update: {
          content_type?: string | null
          created_at?: string
          customer_id?: string | null
          error_message?: string | null
          id?: string
          in_reply_to?: string | null
          message_id?: string | null
          raw_headers?: Json | null
          sender_email?: string | null
          sender_name?: string | null
          status?: string
          subject?: string | null
          ticket_id?: string | null
        }
        Relationships: []
      }
      kb_articles: {
        Row: {
          author_id: string
          category_id: string
          content: string
          created_at: string
          id: string
          is_public: boolean
          last_edited_by: string | null
          search_vector: unknown
          slug: string
          status: Database["public"]["Enums"]["article_status"]
          title: string
          updated_at: string
          view_count: number
        }
        Insert: {
          author_id: string
          category_id: string
          content?: string
          created_at?: string
          id?: string
          is_public?: boolean
          last_edited_by?: string | null
          search_vector?: unknown
          slug: string
          status?: Database["public"]["Enums"]["article_status"]
          title: string
          updated_at?: string
          view_count?: number
        }
        Update: {
          author_id?: string
          category_id?: string
          content?: string
          created_at?: string
          id?: string
          is_public?: boolean
          last_edited_by?: string | null
          search_vector?: unknown
          slug?: string
          status?: Database["public"]["Enums"]["article_status"]
          title?: string
          updated_at?: string
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "kb_articles_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kb_articles_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "kb_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kb_articles_last_edited_by_fkey"
            columns: ["last_edited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      kb_categories: {
        Row: {
          description: string | null
          id: string
          name: string
          slug: string
          sort_order: number
        }
        Insert: {
          description?: string | null
          id?: string
          name: string
          slug: string
          sort_order?: number
        }
        Update: {
          description?: string | null
          id?: string
          name?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      kb_conversation_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: string
          sources: Json
        }
        Insert: {
          content?: string
          conversation_id: string
          created_at?: string
          id?: string
          role: string
          sources?: Json
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
          sources?: Json
        }
        Relationships: [
          {
            foreignKeyName: "kb_conversation_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "kb_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      kb_conversations: {
        Row: {
          created_at: string
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      live_chat_messages: {
        Row: {
          attachment_name: string | null
          attachment_path: string | null
          attachment_size: number | null
          attachment_type: string | null
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          id: string
          message: string | null
          sender_name: string | null
          sender_type: string
          ticket_id: string
        }
        Insert: {
          attachment_name?: string | null
          attachment_path?: string | null
          attachment_size?: number | null
          attachment_type?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          message?: string | null
          sender_name?: string | null
          sender_type: string
          ticket_id: string
        }
        Update: {
          attachment_name?: string | null
          attachment_path?: string | null
          attachment_size?: number | null
          attachment_type?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          message?: string | null
          sender_name?: string | null
          sender_type?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_chat_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          link: string | null
          read_at: string | null
          ticket_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          ticket_id?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          ticket_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      priority_rules: {
        Row: {
          created_at: string
          id: string
          intent_description: string
          is_active: boolean
          keywords: string[]
          priority: Database["public"]["Enums"]["ticket_priority"]
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          intent_description?: string
          is_active?: boolean
          keywords?: string[]
          priority: Database["public"]["Enums"]["ticket_priority"]
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          intent_description?: string
          is_active?: boolean
          keywords?: string[]
          priority?: Database["public"]["Enums"]["ticket_priority"]
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          is_active: boolean
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name: string
          id: string
          is_active?: boolean
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: []
      }
      settings: {
        Row: {
          ai_auto_first_response: boolean
          ai_classify_priority: boolean
          ai_priority_min_confidence: number
          app_base_url: string | null
          business_days: number[]
          business_hours_end: string
          business_hours_start: string
          company_logo_url: string | null
          company_name: string
          created_at: string
          id: string
          primary_color: string
          resend_api_key: string | null
          resend_api_key_masked: string | null
          resend_from_email: string | null
          resend_webhook_secret: string | null
          resend_webhook_secret_masked: string | null
          support_email: string
          timezone: string
          updated_at: string
          zendesk_agent_email: string | null
          zendesk_api_token: string | null
          zendesk_api_token_masked: string | null
          zendesk_subdomain: string | null
          zendesk_webhook_enabled: boolean
          zendesk_webhook_secret: string | null
          zendesk_webhook_secret_masked: string | null
        }
        Insert: {
          ai_auto_first_response?: boolean
          ai_classify_priority?: boolean
          ai_priority_min_confidence?: number
          app_base_url?: string | null
          business_days?: number[]
          business_hours_end?: string
          business_hours_start?: string
          company_logo_url?: string | null
          company_name?: string
          created_at?: string
          id?: string
          primary_color?: string
          resend_api_key?: string | null
          resend_api_key_masked?: string | null
          resend_from_email?: string | null
          resend_webhook_secret?: string | null
          resend_webhook_secret_masked?: string | null
          support_email?: string
          timezone?: string
          updated_at?: string
          zendesk_agent_email?: string | null
          zendesk_api_token?: string | null
          zendesk_api_token_masked?: string | null
          zendesk_subdomain?: string | null
          zendesk_webhook_enabled?: boolean
          zendesk_webhook_secret?: string | null
          zendesk_webhook_secret_masked?: string | null
        }
        Update: {
          ai_auto_first_response?: boolean
          ai_classify_priority?: boolean
          ai_priority_min_confidence?: number
          app_base_url?: string | null
          business_days?: number[]
          business_hours_end?: string
          business_hours_start?: string
          company_logo_url?: string | null
          company_name?: string
          created_at?: string
          id?: string
          primary_color?: string
          resend_api_key?: string | null
          resend_api_key_masked?: string | null
          resend_from_email?: string | null
          resend_webhook_secret?: string | null
          resend_webhook_secret_masked?: string | null
          support_email?: string
          timezone?: string
          updated_at?: string
          zendesk_agent_email?: string | null
          zendesk_api_token?: string | null
          zendesk_api_token_masked?: string | null
          zendesk_subdomain?: string | null
          zendesk_webhook_enabled?: boolean
          zendesk_webhook_secret?: string | null
          zendesk_webhook_secret_masked?: string | null
        }
        Relationships: []
      }
      sla_policies: {
        Row: {
          created_at: string
          first_response_minutes: number
          id: string
          priority: Database["public"]["Enums"]["ticket_priority"]
          resolution_minutes: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          first_response_minutes: number
          id?: string
          priority: Database["public"]["Enums"]["ticket_priority"]
          resolution_minutes: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          first_response_minutes?: number
          id?: string
          priority?: Database["public"]["Enums"]["ticket_priority"]
          resolution_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      tags: {
        Row: {
          color: string
          id: string
          name: string
        }
        Insert: {
          color?: string
          id?: string
          name: string
        }
        Update: {
          color?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      ticket_ai_suggestions: {
        Row: {
          confidence: number
          created_at: string
          id: string
          kind: string
          reasoning: string
          resolved_at: string | null
          resolved_by: string | null
          status: string
          suggested_priority:
            | Database["public"]["Enums"]["ticket_priority"]
            | null
          suggested_status: Database["public"]["Enums"]["ticket_status"] | null
          ticket_id: string
        }
        Insert: {
          confidence: number
          created_at?: string
          id?: string
          kind?: string
          reasoning: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          suggested_priority?:
            | Database["public"]["Enums"]["ticket_priority"]
            | null
          suggested_status?: Database["public"]["Enums"]["ticket_status"] | null
          ticket_id: string
        }
        Update: {
          confidence?: number
          created_at?: string
          id?: string
          kind?: string
          reasoning?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          suggested_priority?:
            | Database["public"]["Enums"]["ticket_priority"]
            | null
          suggested_status?: Database["public"]["Enums"]["ticket_status"] | null
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_ai_suggestions_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_attachments: {
        Row: {
          content_type: string
          file_name: string
          file_size: number
          file_url: string
          id: string
          ticket_message_id: string
        }
        Insert: {
          content_type?: string
          file_name: string
          file_size?: number
          file_url: string
          id?: string
          ticket_message_id: string
        }
        Update: {
          content_type?: string
          file_name?: string
          file_size?: number
          file_url?: string
          id?: string
          ticket_message_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_attachments_ticket_message_id_fkey"
            columns: ["ticket_message_id"]
            isOneToOne: false
            referencedRelation: "ticket_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_email_messages: {
        Row: {
          created_at: string
          direction: string
          id: string
          message_id: string
          ticket_id: string
        }
        Insert: {
          created_at?: string
          direction: string
          id?: string
          message_id: string
          ticket_id: string
        }
        Update: {
          created_at?: string
          direction?: string
          id?: string
          message_id?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_email_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_messages: {
        Row: {
          body: string
          created_at: string
          id: string
          message_type: Database["public"]["Enums"]["message_type"]
          sender_avatar: string | null
          sender_id: string | null
          sender_name: string
          sender_type: Database["public"]["Enums"]["message_sender_type"]
          ticket_id: string
          zendesk_comment_id: number | null
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          message_type?: Database["public"]["Enums"]["message_type"]
          sender_avatar?: string | null
          sender_id?: string | null
          sender_name: string
          sender_type: Database["public"]["Enums"]["message_sender_type"]
          ticket_id: string
          zendesk_comment_id?: number | null
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          message_type?: Database["public"]["Enums"]["message_type"]
          sender_avatar?: string | null
          sender_id?: string | null
          sender_name?: string
          sender_type?: Database["public"]["Enums"]["message_sender_type"]
          ticket_id?: string
          zendesk_comment_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_participants: {
        Row: {
          added_at: string
          added_by: string | null
          ticket_id: string
          user_id: string
        }
        Insert: {
          added_at?: string
          added_by?: string | null
          ticket_id: string
          user_id: string
        }
        Update: {
          added_at?: string
          added_by?: string | null
          ticket_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_participants_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_tags: {
        Row: {
          tag_id: string
          ticket_id: string
        }
        Insert: {
          tag_id: string
          ticket_id: string
        }
        Update: {
          tag_id?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_tags_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          ai_summary: string | null
          assigned_agent_id: string | null
          channel: Database["public"]["Enums"]["ticket_channel"]
          chat_status: string | null
          chat_token: string | null
          closed_at: string | null
          created_at: string
          customer_id: string
          description: string
          email_message_id: string | null
          first_response_at: string | null
          id: string
          internal_title: string | null
          number: number
          priority: Database["public"]["Enums"]["ticket_priority"]
          resolved_at: string | null
          sla_first_response_due: string | null
          sla_resolution_due: string | null
          sla_status: string
          status: Database["public"]["Enums"]["ticket_status"]
          subject: string
          updated_at: string
          zendesk_ticket_id: string | null
        }
        Insert: {
          ai_summary?: string | null
          assigned_agent_id?: string | null
          channel?: Database["public"]["Enums"]["ticket_channel"]
          chat_status?: string | null
          chat_token?: string | null
          closed_at?: string | null
          created_at?: string
          customer_id: string
          description?: string
          email_message_id?: string | null
          first_response_at?: string | null
          id?: string
          internal_title?: string | null
          number?: number
          priority?: Database["public"]["Enums"]["ticket_priority"]
          resolved_at?: string | null
          sla_first_response_due?: string | null
          sla_resolution_due?: string | null
          sla_status?: string
          status?: Database["public"]["Enums"]["ticket_status"]
          subject: string
          updated_at?: string
          zendesk_ticket_id?: string | null
        }
        Update: {
          ai_summary?: string | null
          assigned_agent_id?: string | null
          channel?: Database["public"]["Enums"]["ticket_channel"]
          chat_status?: string | null
          chat_token?: string | null
          closed_at?: string | null
          created_at?: string
          customer_id?: string
          description?: string
          email_message_id?: string | null
          first_response_at?: string | null
          id?: string
          internal_title?: string | null
          number?: number
          priority?: Database["public"]["Enums"]["ticket_priority"]
          resolved_at?: string | null
          sla_first_response_due?: string | null
          sla_resolution_due?: string | null
          sla_status?: string
          status?: Database["public"]["Enums"]["ticket_status"]
          subject?: string
          updated_at?: string
          zendesk_ticket_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tickets_assigned_agent_id_fkey"
            columns: ["assigned_agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      settings_public: {
        Row: {
          app_base_url: string | null
          business_days: number[] | null
          business_hours_end: string | null
          business_hours_start: string | null
          company_logo_url: string | null
          company_name: string | null
          created_at: string | null
          id: string | null
          primary_color: string | null
          resend_api_key_masked: string | null
          resend_from_email: string | null
          resend_webhook_secret_masked: string | null
          support_email: string | null
          timezone: string | null
          updated_at: string | null
        }
        Insert: {
          app_base_url?: string | null
          business_days?: number[] | null
          business_hours_end?: string | null
          business_hours_start?: string | null
          company_logo_url?: string | null
          company_name?: string | null
          created_at?: string | null
          id?: string | null
          primary_color?: string | null
          resend_api_key_masked?: string | null
          resend_from_email?: string | null
          resend_webhook_secret_masked?: string | null
          support_email?: string | null
          timezone?: string | null
          updated_at?: string | null
        }
        Update: {
          app_base_url?: string | null
          business_days?: number[] | null
          business_hours_end?: string | null
          business_hours_start?: string | null
          company_logo_url?: string | null
          company_name?: string | null
          created_at?: string | null
          id?: string | null
          primary_color?: string | null
          resend_api_key_masked?: string | null
          resend_from_email?: string | null
          resend_webhook_secret_masked?: string | null
          support_email?: string | null
          timezone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      get_my_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["user_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_agent: { Args: never; Returns: boolean }
      search_kb_articles: {
        Args: { max_results?: number; query: string }
        Returns: {
          author_id: string
          category_id: string
          content: string
          created_at: string
          id: string
          is_public: boolean
          last_edited_by: string
          rank: number
          slug: string
          status: Database["public"]["Enums"]["article_status"]
          title: string
          updated_at: string
          view_count: number
        }[]
      }
    }
    Enums: {
      article_status: "draft" | "published" | "archived"
      message_sender_type: "agent" | "customer" | "system"
      message_type: "public_reply" | "internal_note" | "system"
      ticket_channel: "email" | "chat" | "phone" | "api"
      ticket_priority: "low" | "medium" | "high" | "urgent"
      ticket_status: "open" | "pending" | "resolved"
      user_role: "admin" | "agent"
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
      article_status: ["draft", "published", "archived"],
      message_sender_type: ["agent", "customer", "system"],
      message_type: ["public_reply", "internal_note", "system"],
      ticket_channel: ["email", "chat", "phone", "api"],
      ticket_priority: ["low", "medium", "high", "urgent"],
      ticket_status: ["open", "pending", "resolved"],
      user_role: ["admin", "agent"],
    },
  },
} as const
