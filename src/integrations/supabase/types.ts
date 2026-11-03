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
      admins: {
        Row: {
          created_at: string
          email: string
          id: string
          role: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          role?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          role?: string
          user_id?: string | null
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          key: string
          value: string
        }
        Insert: {
          key: string
          value: string
        }
        Update: {
          key?: string
          value?: string
        }
        Relationships: []
      }
      bus_locations: {
        Row: {
          bus_id: string
          gps_time: string
          heading: number
          lat: number
          lng: number
          received_at: string
          satellites: number
          speed_kmh: number
        }
        Insert: {
          bus_id: string
          gps_time: string
          heading?: number
          lat: number
          lng: number
          received_at?: string
          satellites?: number
          speed_kmh?: number
        }
        Update: {
          bus_id?: string
          gps_time?: string
          heading?: number
          lat?: number
          lng?: number
          received_at?: string
          satellites?: number
          speed_kmh?: number
        }
        Relationships: [
          {
            foreignKeyName: "bus_locations_bus_id_fkey"
            columns: ["bus_id"]
            isOneToOne: true
            referencedRelation: "buses"
            referencedColumns: ["id"]
          },
        ]
      }
      bus_stops: {
        Row: {
          id: string
          is_terminal: boolean
          lat: number
          lng: number
          name: string
          route_id: string
          sequence: number
        }
        Insert: {
          id?: string
          is_terminal?: boolean
          lat: number
          lng: number
          name: string
          route_id: string
          sequence: number
        }
        Update: {
          id?: string
          is_terminal?: boolean
          lat?: number
          lng?: number
          name?: string
          route_id?: string
          sequence?: number
        }
        Relationships: [
          {
            foreignKeyName: "bus_stops_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "routes"
            referencedColumns: ["id"]
          },
        ]
      }
      buses: {
        Row: {
          bus_code: string
          created_at: string
          id: string
          is_public: boolean
          plate_number: string
          route_id: string | null
        }
        Insert: {
          bus_code: string
          created_at?: string
          id?: string
          is_public?: boolean
          plate_number?: string
          route_id?: string | null
        }
        Update: {
          bus_code?: string
          created_at?: string
          id?: string
          is_public?: boolean
          plate_number?: string
          route_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "buses_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "routes"
            referencedColumns: ["id"]
          },
        ]
      }
      gps_devices: {
        Row: {
          bus_id: string | null
          created_at: string
          device_code: string
          id: string
          last_seen: string | null
          token_hash: string
        }
        Insert: {
          bus_id?: string | null
          created_at?: string
          device_code: string
          id?: string
          last_seen?: string | null
          token_hash?: string
        }
        Update: {
          bus_id?: string | null
          created_at?: string
          device_code?: string
          id?: string
          last_seen?: string | null
          token_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "gps_devices_bus_id_fkey"
            columns: ["bus_id"]
            isOneToOne: true
            referencedRelation: "buses"
            referencedColumns: ["id"]
          },
        ]
      }
      gps_request_logs: {
        Row: {
          bus_code: string | null
          bus_id: string | null
          http_status: number
          id: string
          lat: number | null
          lng: number | null
          received_at: string
        }
        Insert: {
          bus_code?: string | null
          bus_id?: string | null
          http_status: number
          id?: string
          lat?: number | null
          lng?: number | null
          received_at?: string
        }
        Update: {
          bus_code?: string | null
          bus_id?: string | null
          http_status?: number
          id?: string
          lat?: number | null
          lng?: number | null
          received_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gps_request_logs_bus_id_fkey"
            columns: ["bus_id"]
            isOneToOne: false
            referencedRelation: "buses"
            referencedColumns: ["id"]
          },
        ]
      }
      routes: {
        Row: {
          created_at: string
          description: string
          end_terminal: string
          id: string
          is_active: boolean
          name: string
          path: Json
          start_terminal: string
        }
        Insert: {
          created_at?: string
          description?: string
          end_terminal: string
          id?: string
          is_active?: boolean
          name: string
          path?: Json
          start_terminal: string
        }
        Update: {
          created_at?: string
          description?: string
          end_terminal?: string
          id?: string
          is_active?: boolean
          name?: string
          path?: Json
          start_terminal?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      claim_admin: { Args: never; Returns: boolean }
      is_admin: { Args: never; Returns: boolean }
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
    Enums: {},
  },
} as const
