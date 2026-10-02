export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

type NewTable<T> = { Row: T; Insert: Partial<T>; Update: Partial<T>; Relationships: [] }
export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      communities: NewTable<{ id: string; name: string; slug: string; description: string | null; visibility: string; created_by: string; created_at: string; updated_at: string }>
      community_members: NewTable<{ community_id: string; user_id: string; role: string; status: string; joined_at: string }>
      projects: NewTable<{ id: string; title: string; slug: string; description: string | null; status: string; visibility: string; created_by_user_id: string; community_id: string | null; university_id: string | null; company_id: string | null; created_at: string; updated_at: string }>
      project_members: NewTable<{ project_id: string; user_id: string; role: string; status: string; joined_at: string }>
      founder_profiles: NewTable<{ user_id: string; headline: string | null; bio: string | null; location: string | null; linkedin_url: string | null; website_url: string | null; created_at: string; updated_at: string }>
      mentor_profiles: NewTable<{ user_id: string; headline: string | null; bio: string | null; current_position: string | null; company: string | null; expertise: string[]; availability_status: string; created_at: string; updated_at: string }>
      university_student_invitations: NewTable<{ id: string; university_id: string; email: string; token_hash: string; status: Database["public"]["Enums"]["university_invitation_status"]; student_name: string | null; student_identifier: string | null; program: string | null; department: string | null; expires_at: string; created_by: string; accepted_by_user_id: string | null; accepted_at: string | null; created_at: string; updated_at: string }>
      university_student_memberships: NewTable<{ id: string; university_id: string; student_user_id: string; status: Database["public"]["Enums"]["university_membership_status"]; student_identifier: string | null; program: string | null; department: string | null; enrolled_by: string | null; invitation_id: string | null; joined_at: string; verified_at: string; created_at: string; updated_at: string }>
      organizations: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          logo_url: string | null
          name: string
          type: Database["public"]["Enums"]["organization_type"]
          updated_at: string
          verified: boolean
          website: string | null
          slug: string | null
          official_account: boolean
          country: string | null
          city: string | null
          email_domain: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          logo_url?: string | null
          name: string
          type: Database["public"]["Enums"]["organization_type"]
          updated_at?: string
          verified?: boolean
          website?: string | null
          slug?: string | null
          official_account?: boolean
          country?: string | null
          city?: string | null
          email_domain?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          type?: Database["public"]["Enums"]["organization_type"]
          updated_at?: string
          verified?: boolean
          website?: string | null
          slug?: string | null
          official_account?: boolean
          country?: string | null
          city?: string | null
          email_domain?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organizations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          organization_id: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["post_status"]
          title: string
          updated_at: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          id?: string
          organization_id?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["post_status"]
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          organization_id?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["post_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          headline: string | null
          id: string
          primary_role: Database["public"]["Enums"]["primary_account_role"] | null
          onboarding_completed: boolean
          account_status: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          headline?: string | null
          id: string
          primary_role?: Database["public"]["Enums"]["primary_account_role"] | null
          onboarding_completed?: boolean
          account_status?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          headline?: string | null
          id?: string
          primary_role?: Database["public"]["Enums"]["primary_account_role"] | null
          onboarding_completed?: boolean
          account_status?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: []
      }
      student_details: {
        Row: {
          created_at: string
          degree_level: string | null
          field_of_study: string | null
          graduation_year: number | null
          profile_id: string
          bio: string | null
          country: string | null
          city: string | null
          interests: string[]
          portfolio_url: string | null
          linkedin_url: string | null
          github_url: string | null
          skills: string[]
          university: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          degree_level?: string | null
          field_of_study?: string | null
          graduation_year?: number | null
          profile_id: string
          bio?: string | null
          country?: string | null
          city?: string | null
          interests?: string[]
          portfolio_url?: string | null
          linkedin_url?: string | null
          github_url?: string | null
          skills?: string[]
          university?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          degree_level?: string | null
          field_of_study?: string | null
          graduation_year?: number | null
          profile_id?: string
          bio?: string | null
          country?: string | null
          city?: string | null
          interests?: string[]
          portfolio_url?: string | null
          linkedin_url?: string | null
          github_url?: string | null
          skills?: string[]
          university?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_details_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      finish_onboarding: { Args: { p_role: Database["public"]["Enums"]["primary_account_role"]; p_name: string; p_headline?: string | null; p_organization_name?: string | null; p_website?: string | null; p_field_of_study?: string | null; p_degree?: string | null; p_skills?: string[]; p_interests?: string[]; p_portfolio_url?: string | null; p_linkedin_url?: string | null; p_github_url?: string | null; p_expertise?: string[] }; Returns: undefined }
      can_manage_university: { Args: { p_university_id: string }; Returns: boolean }
      enroll_university_student: { Args: { p_university_id: string; p_email: string; p_token_hash: string; p_student_name?: string | null; p_student_identifier?: string | null; p_program?: string | null; p_department?: string | null }; Returns: string }
      eco_campus_invite: { Args: { p_university_id: string; p_email: string; p_token_hash: string; p_student_name?: string | null; p_student_identifier?: string | null; p_program?: string | null; p_department?: string | null }; Returns: string }
      eco_invite: { Args: { p_kind: string; p_id: string; p_email: string; p_role?: string }; Returns: string }
      accept_university_invitation: { Args: { p_token_hash: string }; Returns: string }
      revoke_university_student: { Args: { p_university_id: string; p_student_user_id: string }; Returns: undefined }
      cancel_university_invitation: { Args: { p_university_id: string; p_invitation_id: string }; Returns: undefined }
      list_university_students: { Args: { p_university_id: string }; Returns: { student_user_id: string; full_name: string | null; email: string; program: string | null; department: string | null; student_identifier: string | null; status: Database["public"]["Enums"]["university_membership_status"]; joined_at: string }[] }
      is_community_captain: { Args: { p_community_id: string }; Returns: boolean }
      list_space_member_names: { Args: { p_kind: string; p_space_id: string }; Returns: { user_id: string; full_name: string | null }[] }
      create_community: { Args: { p_name: string; p_slug: string; p_description?: string | null }; Returns: string }
      assign_community_member: { Args: { p_community_id: string; p_user_id: string; p_role: string }; Returns: undefined }
      assign_community_member_by_email: { Args: { p_community_id: string; p_email: string; p_role: string }; Returns: string }
      is_project_head: { Args: { p_project_id: string }; Returns: boolean }
      create_project: { Args: { p_title: string; p_slug: string; p_description?: string | null }; Returns: string }
      assign_project_member: { Args: { p_project_id: string; p_user_id: string; p_role: string }; Returns: undefined }
      assign_project_member_by_email: { Args: { p_project_id: string; p_email: string; p_role: string }; Returns: string }
      is_platform_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      primary_account_role: "student" | "founder" | "university" | "company" | "mentor"
      university_membership_status: "active" | "revoked" | "graduated"
      university_invitation_status: "pending" | "accepted" | "cancelled"
      organization_type:
        | "startup"
        | "company"
        | "university"
        | "student_organization"
        | "community"
        | "nonprofit"
      post_status: "pending" | "approved" | "rejected"
      user_role:
        | "student"
        | "founder"
        | "mentor"
        | "professional"
        | "company_representative"
        | "university_representative"
        | "community_coordinator"
        | "platform_admin"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      primary_account_role: ["student", "founder", "university", "company", "mentor"],
      university_membership_status: ["active", "revoked", "graduated"],
      university_invitation_status: ["pending", "accepted", "cancelled"],
      organization_type: [
        "startup",
        "company",
        "university",
        "student_organization",
        "community",
        "nonprofit",
      ],
      post_status: ["pending", "approved", "rejected"],
      user_role: [
        "student",
        "founder",
        "mentor",
        "professional",
        "company_representative",
        "university_representative",
        "community_coordinator",
        "platform_admin",
      ],
    },
  },
} as const
