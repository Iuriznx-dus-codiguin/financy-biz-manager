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
      despesas: {
        Row: {
          categoria: string
          created_at: string | null
          data: string
          descricao: string
          forma_pagamento: string
          fornecedor: string | null
          id: number
          user_id: string
          valor: number
        }
        Insert: {
          categoria: string
          created_at?: string | null
          data: string
          descricao: string
          forma_pagamento: string
          fornecedor?: string | null
          id?: number
          user_id: string
          valor: number
        }
        Update: {
          categoria?: string
          created_at?: string | null
          data?: string
          descricao?: string
          forma_pagamento?: string
          fornecedor?: string | null
          id?: number
          user_id?: string
          valor?: number
        }
        Relationships: []
      }
      impostos: {
        Row: {
          created_at: string | null
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
          revenue_range: string | null
          salary_range: string | null
          user_id: string
          user_type: string
        }
        Insert: {
          created_at?: string
          how_did_you_know: string
          id?: string
          revenue_range?: string | null
          salary_range?: string | null
          user_id: string
          user_type: string
        }
        Update: {
          created_at?: string
          how_did_you_know?: string
          id?: string
          revenue_range?: string | null
          salary_range?: string | null
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
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id: string
          nome_completo?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          nome_completo?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      receitas: {
        Row: {
          categoria: string
          cliente: string | null
          created_at: string | null
          data: string
          descricao: string
          forma_pagamento: string
          id: number
          user_id: string
          valor: number
        }
        Insert: {
          categoria: string
          cliente?: string | null
          created_at?: string | null
          data: string
          descricao: string
          forma_pagamento: string
          id?: number
          user_id: string
          valor: number
        }
        Update: {
          categoria?: string
          cliente?: string | null
          created_at?: string | null
          data?: string
          descricao?: string
          forma_pagamento?: string
          id?: number
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

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
