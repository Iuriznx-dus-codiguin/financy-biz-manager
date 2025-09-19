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
      auth_rate_limits: {
        Row: {
          attempts: number | null
          blocked_until: string | null
          created_at: string | null
          id: string
          identifier: string
          window_start: string | null
        }
        Insert: {
          attempts?: number | null
          blocked_until?: string | null
          created_at?: string | null
          id?: string
          identifier: string
          window_start?: string | null
        }
        Update: {
          attempts?: number | null
          blocked_until?: string | null
          created_at?: string | null
          id?: string
          identifier?: string
          window_start?: string | null
        }
        Relationships: []
      }
      categorias_personalizadas: {
        Row: {
          ativo: boolean
          cor: string
          created_at: string
          dashboard_id: string | null
          icone: string | null
          id: string
          nome: string
          tipo: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ativo?: boolean
          cor?: string
          created_at?: string
          dashboard_id?: string | null
          icone?: string | null
          id?: string
          nome: string
          tipo: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ativo?: boolean
          cor?: string
          created_at?: string
          dashboard_id?: string | null
          icone?: string | null
          id?: string
          nome?: string
          tipo?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
          configuracao_recorrencia: Json | null
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
          configuracao_recorrencia?: Json | null
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
          configuracao_recorrencia?: Json | null
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
      equipe_membros: {
        Row: {
          cargo: string
          created_at: string
          dashboard_id: string | null
          data_admissao: string
          email: string
          id: string
          nome: string
          periodicidade: string
          permissoes: Json | null
          salario: number
          status: string
          telefone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cargo: string
          created_at?: string
          dashboard_id?: string | null
          data_admissao?: string
          email: string
          id?: string
          nome: string
          periodicidade?: string
          permissoes?: Json | null
          salario?: number
          status?: string
          telefone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cargo?: string
          created_at?: string
          dashboard_id?: string | null
          data_admissao?: string
          email?: string
          id?: string
          nome?: string
          periodicidade?: string
          permissoes?: Json | null
          salario?: number
          status?: string
          telefone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipe_membros_dashboard_id_fkey"
            columns: ["dashboard_id"]
            isOneToOne: false
            referencedRelation: "user_dashboards"
            referencedColumns: ["id"]
          },
        ]
      }
      equipe_membros_audit: {
        Row: {
          action: string
          created_at: string
          id: string
          ip_address: string | null
          member_id: string | null
          new_data: Json | null
          old_data: Json | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          ip_address?: string | null
          member_id?: string | null
          new_data?: Json | null
          old_data?: Json | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          member_id?: string | null
          new_data?: Json | null
          old_data?: Json | null
          user_agent?: string | null
          user_id?: string
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
      notificacoes: {
        Row: {
          created_at: string
          data_vencimento: string | null
          id: string
          lida: boolean | null
          mensagem: string
          metadata: Json | null
          tipo: string
          titulo: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data_vencimento?: string | null
          id?: string
          lida?: boolean | null
          mensagem: string
          metadata?: Json | null
          tipo: string
          titulo: string
          user_id: string
        }
        Update: {
          created_at?: string
          data_vencimento?: string | null
          id?: string
          lida?: boolean | null
          mensagem?: string
          metadata?: Json | null
          tipo?: string
          titulo?: string
          user_id?: string
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
          telefone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id: string
          nome_completo?: string | null
          settings?: Json | null
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          nome_completo?: string | null
          settings?: Json | null
          telefone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      query_cache: {
        Row: {
          cached_data: Json
          created_at: string | null
          expires_at: string
          id: string
          query_key: string
          user_id: string
        }
        Insert: {
          cached_data: Json
          created_at?: string | null
          expires_at?: string
          id?: string
          query_key: string
          user_id: string
        }
        Update: {
          cached_data?: Json
          created_at?: string | null
          expires_at?: string
          id?: string
          query_key?: string
          user_id?: string
        }
        Relationships: []
      }
      receitas: {
        Row: {
          categoria: string
          categoria_personalizada: string | null
          cliente: string | null
          configuracao_recorrencia: Json | null
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
          configuracao_recorrencia?: Json | null
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
          configuracao_recorrencia?: Json | null
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
      security_audit_logs: {
        Row: {
          action: string
          id: string
          ip_address: unknown | null
          new_values: Json | null
          old_values: Json | null
          record_id: string | null
          risk_level: string | null
          table_name: string
          timestamp: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action: string
          id?: string
          ip_address?: unknown | null
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          risk_level?: string | null
          table_name: string
          timestamp?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          action?: string
          id?: string
          ip_address?: unknown | null
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          risk_level?: string | null
          table_name?: string
          timestamp?: string | null
          user_agent?: string | null
          user_id?: string
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
      user_tour_progress: {
        Row: {
          completed: boolean | null
          created_at: string
          id: string
          step_completed: number | null
          tour_name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed?: boolean | null
          created_at?: string
          id?: string
          step_completed?: number | null
          tour_name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed?: boolean | null
          created_at?: string
          id?: string
          step_completed?: number | null
          tour_name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      despesas_masked: {
        Row: {
          categoria: string | null
          categoria_personalizada: string | null
          created_at: string | null
          dashboard_id: string | null
          data: string | null
          descricao: string | null
          forma_pagamento: string | null
          fornecedor: string | null
          id: number | null
          recorrente: boolean | null
          status: string | null
          user_id: string | null
          valor: number | null
        }
        Insert: {
          categoria?: string | null
          categoria_personalizada?: string | null
          created_at?: string | null
          dashboard_id?: string | null
          data?: string | null
          descricao?: string | null
          forma_pagamento?: string | null
          fornecedor?: string | null
          id?: number | null
          recorrente?: boolean | null
          status?: string | null
          user_id?: string | null
          valor?: number | null
        }
        Update: {
          categoria?: string | null
          categoria_personalizada?: string | null
          created_at?: string | null
          dashboard_id?: string | null
          data?: string | null
          descricao?: string | null
          forma_pagamento?: string | null
          fornecedor?: string | null
          id?: number | null
          recorrente?: boolean | null
          status?: string | null
          user_id?: string | null
          valor?: number | null
        }
        Relationships: []
      }
      receitas_masked: {
        Row: {
          categoria: string | null
          categoria_personalizada: string | null
          cliente: string | null
          created_at: string | null
          dashboard_id: string | null
          data: string | null
          descricao: string | null
          forma_pagamento: string | null
          id: number | null
          recorrente: boolean | null
          status: string | null
          user_id: string | null
          valor: number | null
        }
        Insert: {
          categoria?: string | null
          categoria_personalizada?: string | null
          cliente?: string | null
          created_at?: string | null
          dashboard_id?: string | null
          data?: string | null
          descricao?: string | null
          forma_pagamento?: string | null
          id?: number | null
          recorrente?: boolean | null
          status?: string | null
          user_id?: string | null
          valor?: number | null
        }
        Update: {
          categoria?: string | null
          categoria_personalizada?: string | null
          cliente?: string | null
          created_at?: string | null
          dashboard_id?: string | null
          data?: string | null
          descricao?: string | null
          forma_pagamento?: string | null
          id?: number | null
          recorrente?: boolean | null
          status?: string | null
          user_id?: string | null
          valor?: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      calcular_proxima_data: {
        Args: { data_atual: string; tipo: string }
        Returns: string
      }
      check_auth_rate_limit: {
        Args: {
          p_block_minutes?: number
          p_identifier: string
          p_max_attempts?: number
          p_window_minutes?: number
        }
        Returns: boolean
      }
      check_financial_query_rate_limit: {
        Args: { p_user_id: string }
        Returns: boolean
      }
      encrypt_sensitive_data: {
        Args: { data: string; salt?: string }
        Returns: string
      }
      get_dashboard_data: {
        Args: {
          p_dashboard_id: string
          p_use_cache?: boolean
          p_user_id: string
        }
        Returns: Json
      }
      get_user_profile_data: {
        Args: { user_id: string }
        Returns: {
          nome_preferido: string
          subscription_tier: string
          user_type: string
        }[]
      }
      log_bulk_financial_query: {
        Args: { p_query_type: string; p_table_name: string; p_user_id: string }
        Returns: undefined
      }
      log_financial_data_access: {
        Args: {
          p_action: string
          p_record_id: string
          p_sensitive_fields?: Json
          p_table_name: string
          p_user_id: string
        }
        Returns: undefined
      }
      log_security_event: {
        Args: {
          p_action: string
          p_new_values?: Json
          p_old_values?: Json
          p_record_id?: string
          p_risk_level?: string
          p_table_name: string
          p_user_id: string
        }
        Returns: undefined
      }
      mask_sensitive_data: {
        Args: { input_text: string; mask_type?: string }
        Returns: string
      }
      processar_despesas_recorrentes: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      processar_receitas_recorrentes: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      user_has_dashboard_access: {
        Args: { p_dashboard_id: string; p_user_id: string }
        Returns: boolean
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
