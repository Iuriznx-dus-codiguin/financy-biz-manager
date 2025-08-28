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
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      ai_conversations: {
        Row: {
          agent_type: string
          created_at: string
          id: string
          message: string
          metadata: Json | null
          response: string
          user_id: string
        }
        Insert: {
          agent_type: string
          created_at?: string
          id?: string
          message: string
          metadata?: Json | null
          response: string
          user_id: string
        }
        Update: {
          agent_type?: string
          created_at?: string
          id?: string
          message?: string
          metadata?: Json | null
          response?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_recognized_transactions: {
        Row: {
          amount: number
          category: string
          confirmed: boolean | null
          conversation_id: string | null
          created_at: string
          date: string
          description: string
          id: string
          saved_to_platform: boolean | null
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          category: string
          confirmed?: boolean | null
          conversation_id?: string | null
          created_at?: string
          date?: string
          description: string
          id?: string
          saved_to_platform?: boolean | null
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          category?: string
          confirmed?: boolean | null
          conversation_id?: string | null
          created_at?: string
          date?: string
          description?: string
          id?: string
          saved_to_platform?: boolean | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_recognized_transactions_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_subscriptions: {
        Row: {
          amount: number
          billing_period: string
          cakto_subscription_id: string | null
          created_at: string
          email: string
          expires_at: string | null
          id: string
          payment_method: string | null
          plan_id: string
          plan_name: string
          plan_type: string
          started_at: string
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          amount: number
          billing_period: string
          cakto_subscription_id?: string | null
          created_at?: string
          email: string
          expires_at?: string | null
          id?: string
          payment_method?: string | null
          plan_id: string
          plan_name: string
          plan_type: string
          started_at?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          amount?: number
          billing_period?: string
          cakto_subscription_id?: string | null
          created_at?: string
          email?: string
          expires_at?: string | null
          id?: string
          payment_method?: string | null
          plan_id?: string
          plan_name?: string
          plan_type?: string
          started_at?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      despesas: {
        Row: {
          categoria: string
          categoria_personalizada: string | null
          created_at: string | null
          dashboard_id: string | null
          data: string
          descricao: string
          forma_pagamento: string
          fornecedor: string | null
          id: number
          proxima_data: string | null
          recorrente: boolean | null
          status: string
          tipo_recorrencia: string | null
          user_id: string
          valor: number
        }
        Insert: {
          categoria: string
          categoria_personalizada?: string | null
          created_at?: string | null
          dashboard_id?: string | null
          data: string
          descricao: string
          forma_pagamento: string
          fornecedor?: string | null
          id?: number
          proxima_data?: string | null
          recorrente?: boolean | null
          status?: string
          tipo_recorrencia?: string | null
          user_id: string
          valor: number
        }
        Update: {
          categoria?: string
          categoria_personalizada?: string | null
          created_at?: string | null
          dashboard_id?: string | null
          data?: string
          descricao?: string
          forma_pagamento?: string
          fornecedor?: string | null
          id?: number
          proxima_data?: string | null
          recorrente?: boolean | null
          status?: string
          tipo_recorrencia?: string | null
          user_id?: string
          valor?: number
        }
        Relationships: []
      }
      impostos: {
        Row: {
          created_at: string | null
          dashboard_id: string | null
          descricao: string
          id: number
          pago: boolean | null
          recorrente: boolean | null
          tipo: string
          user_id: string
          valor: number
          vencimento: string
        }
        Insert: {
          created_at?: string | null
          dashboard_id?: string | null
          descricao: string
          id?: number
          pago?: boolean | null
          recorrente?: boolean | null
          tipo: string
          user_id: string
          valor: number
          vencimento: string
        }
        Update: {
          created_at?: string | null
          dashboard_id?: string | null
          descricao?: string
          id?: number
          pago?: boolean | null
          recorrente?: boolean | null
          tipo?: string
          user_id?: string
          valor?: number
          vencimento?: string
        }
        Relationships: []
      }
      metas: {
        Row: {
          categoria: string
          cor: string
          created_at: string
          dashboard_id: string | null
          id: string
          prazo: string
          progresso: number
          status: string
          titulo: string
          updated_at: string
          user_id: string
          valor_atual: number
          valor_meta: number
        }
        Insert: {
          categoria: string
          cor?: string
          created_at?: string
          dashboard_id?: string | null
          id?: string
          prazo: string
          progresso?: number
          status?: string
          titulo: string
          updated_at?: string
          user_id: string
          valor_atual?: number
          valor_meta: number
        }
        Update: {
          categoria?: string
          cor?: string
          created_at?: string
          dashboard_id?: string | null
          id?: string
          prazo?: string
          progresso?: number
          status?: string
          titulo?: string
          updated_at?: string
          user_id?: string
          valor_atual?: number
          valor_meta?: number
        }
        Relationships: []
      }
      onboarding_data: {
        Row: {
          created_at: string
          how_did_you_know: string
          id: string
          nome_preferido: string | null
          revenue_range: string | null
          salary_range: string | null
          termos_aceitos: boolean | null
          user_id: string
          user_type: string
        }
        Insert: {
          created_at?: string
          how_did_you_know: string
          id?: string
          nome_preferido?: string | null
          revenue_range?: string | null
          salary_range?: string | null
          termos_aceitos?: boolean | null
          user_id: string
          user_type: string
        }
        Update: {
          created_at?: string
          how_did_you_know?: string
          id?: string
          nome_preferido?: string | null
          revenue_range?: string | null
          salary_range?: string | null
          termos_aceitos?: boolean | null
          user_id?: string
          user_type?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          id: string
          nome_completo: string | null
          settings: Json | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id: string
          nome_completo?: string | null
          settings?: Json | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          nome_completo?: string | null
          settings?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      receitas: {
        Row: {
          categoria: string
          categoria_personalizada: string | null
          cliente: string | null
          created_at: string | null
          dashboard_id: string | null
          data: string
          descricao: string
          forma_pagamento: string
          id: number
          proxima_data: string | null
          recorrente: boolean | null
          status: string
          tipo_recorrencia: string | null
          user_id: string
          valor: number
        }
        Insert: {
          categoria: string
          categoria_personalizada?: string | null
          cliente?: string | null
          created_at?: string | null
          dashboard_id?: string | null
          data: string
          descricao: string
          forma_pagamento: string
          id?: number
          proxima_data?: string | null
          recorrente?: boolean | null
          status?: string
          tipo_recorrencia?: string | null
          user_id: string
          valor: number
        }
        Update: {
          categoria?: string
          categoria_personalizada?: string | null
          cliente?: string | null
          created_at?: string | null
          dashboard_id?: string | null
          data?: string
          descricao?: string
          forma_pagamento?: string
          id?: number
          proxima_data?: string | null
          recorrente?: boolean | null
          status?: string
          tipo_recorrencia?: string | null
          user_id?: string
          valor?: number
        }
        Relationships: []
      }
      subscribers: {
        Row: {
          created_at: string
          email: string
          id: string
          stripe_customer_id: string | null
          subscribed: boolean
          subscription_end: string | null
          subscription_tier: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          stripe_customer_id?: string | null
          subscribed?: boolean
          subscription_end?: string | null
          subscription_tier?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          stripe_customer_id?: string | null
          subscribed?: boolean
          subscription_end?: string | null
          subscription_tier?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      user_dashboards: {
        Row: {
          created_at: string
          id: string
          is_default: boolean
          name: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_default?: boolean
          name: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_default?: boolean
          name?: string
          type?: string
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
      calcular_proxima_data: {
        Args: { data_atual: string; tipo: string }
        Returns: string
      }
      get_user_profile_data: {
        Args: { user_id: string }
        Returns: {
          nome_preferido: string
          subscription_tier: string
          user_type: string
        }[]
      }
      processar_despesas_recorrentes: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      processar_receitas_recorrentes: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
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
