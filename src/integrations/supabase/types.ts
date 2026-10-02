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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      data_requests: {
        Row: {
          created_at: string
          dataset_id: string
          email: string
          id: string
          institution: string | null
          name: string
          purpose: string
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
        }
        Insert: {
          created_at?: string
          dataset_id: string
          email: string
          id?: string
          institution?: string | null
          name: string
          purpose: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          dataset_id?: string
          email?: string
          id?: string
          institution?: string | null
          name?: string
          purpose?: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "data_requests_dataset_id_fkey"
            columns: ["dataset_id"]
            isOneToOne: false
            referencedRelation: "datasets"
            referencedColumns: ["id"]
          },
        ]
      }
      datasets: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          downloads: number
          file_name: string | null
          file_url: string | null
          format: string
          frequency: string | null
          id: string
          license: string
          organization_id: string
          published_at: string | null
          review_note: string | null
          sample_data: Json | null
          slug: string
          status: Database["public"]["Enums"]["dataset_status"]
          tags: string[]
          title: string
          topic_id: string | null
          updated_at: string
          views: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          downloads?: number
          file_name?: string | null
          file_url?: string | null
          format?: string
          frequency?: string | null
          id?: string
          license?: string
          organization_id: string
          published_at?: string | null
          review_note?: string | null
          sample_data?: Json | null
          slug: string
          status?: Database["public"]["Enums"]["dataset_status"]
          tags?: string[]
          title: string
          topic_id?: string | null
          updated_at?: string
          views?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          downloads?: number
          file_name?: string | null
          file_url?: string | null
          format?: string
          frequency?: string | null
          id?: string
          license?: string
          organization_id?: string
          published_at?: string | null
          review_note?: string | null
          sample_data?: Json | null
          slug?: string
          status?: Database["public"]["Enums"]["dataset_status"]
          tags?: string[]
          title?: string
          topic_id?: string | null
          updated_at?: string
          views?: number
        }
        Relationships: [
          {
            foreignKeyName: "datasets_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "datasets_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          acronym: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          slug: string
        }
        Insert: {
          acronym?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          slug: string
        }
        Update: {
          acronym?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      portal_settings: {
        Row: {
          address: string | null
          bupati_name: string | null
          bupati_photo_url: string | null
          bupati_title: string | null
          contact_email: string | null
          contact_phone: string | null
          facebook_url: string | null
          hero_description: string | null
          hero_kicker: string | null
          hero_title: string | null
          id: number
          instagram_url: string | null
          logo_url: string | null
          portal_name: string
          region_label: string | null
          tagline: string | null
          updated_at: string
          wabup_name: string | null
          wabup_photo_url: string | null
          wabup_title: string | null
          welcome_body: string | null
          welcome_title: string | null
          youtube_url: string | null
        }
        Insert: {
          address?: string | null
          bupati_name?: string | null
          bupati_photo_url?: string | null
          bupati_title?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          facebook_url?: string | null
          hero_description?: string | null
          hero_kicker?: string | null
          hero_title?: string | null
          id?: number
          instagram_url?: string | null
          logo_url?: string | null
          portal_name?: string
          region_label?: string | null
          tagline?: string | null
          updated_at?: string
          wabup_name?: string | null
          wabup_photo_url?: string | null
          wabup_title?: string | null
          welcome_body?: string | null
          welcome_title?: string | null
          youtube_url?: string | null
        }
        Update: {
          address?: string | null
          bupati_name?: string | null
          bupati_photo_url?: string | null
          bupati_title?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          facebook_url?: string | null
          hero_description?: string | null
          hero_kicker?: string | null
          hero_title?: string | null
          id?: number
          instagram_url?: string | null
          logo_url?: string | null
          portal_name?: string
          region_label?: string | null
          tagline?: string | null
          updated_at?: string
          wabup_name?: string | null
          wabup_photo_url?: string | null
          wabup_title?: string | null
          welcome_body?: string | null
          welcome_title?: string | null
          youtube_url?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          organization_id: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          organization_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          organization_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      topics: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_dataset_stat: {
        Args: { _id: string; _kind: string }
        Returns: undefined
      }
      user_org: { Args: { _user_id: string }; Returns: string }
    }
    Enums: {
      app_role: "admin" | "wali_data" | "produsen"
      dataset_status: "draft" | "pending" | "published" | "rejected"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "wali_data", "produsen"],
      dataset_status: ["draft", "pending", "published", "rejected"],
    },
  },
} as const
