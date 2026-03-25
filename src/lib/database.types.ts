export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

interface DatabaseGenerated {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string
          full_name: string
          phone: string | null
          profile_photo_url: string | null
          user_type: 'PASSENGER' | 'DRIVER' | 'ADMIN'
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          full_name: string
          phone?: string | null
          profile_photo_url?: string | null
          user_type: 'PASSENGER' | 'DRIVER' | 'ADMIN'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          full_name?: string
          phone?: string | null
          profile_photo_url?: string | null
          user_type?: 'PASSENGER' | 'DRIVER' | 'ADMIN'
          created_at?: string
          updated_at?: string
        }
      }
      passengers: {
        Row: {
          id: string
          user_id: string
          preferred_payment_method: string | null
          saved_addresses: Json
          trust_mode_enabled: boolean
          total_trips: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          preferred_payment_method?: string | null
          saved_addresses?: Json
          trust_mode_enabled?: boolean
          total_trips?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          preferred_payment_method?: string | null
          saved_addresses?: Json
          trust_mode_enabled?: boolean
          total_trips?: number
          created_at?: string
          updated_at?: string
        }
      }
      drivers: {
        Row: {
          id: string
          user_id: string
          vehicle_brand: string | null
          vehicle_model: string | null
          vehicle_year: number | null
          vehicle_color: string | null
          vehicle_plate: string | null
          vehicle_photo_url: string | null
          driver_license_number: string | null
          driver_license_expiry: string | null
          driver_license_photo_url: string | null
          vehicle_registration_photo_url: string | null
          insurance_photo_url: string | null
          documents_validated: boolean
          documents_validated_at: string | null
          documents_validated_by: string | null
          mp_seller_id: string | null
          mp_account_email: string | null
          mp_linked_at: string | null
          mp_status: 'PENDING' | 'LINKED' | 'SUSPENDED' | 'REJECTED'
          score: number
          total_trips: number
          total_ratings: number
          average_rating: number
          status: 'PENDING_APPROVAL' | 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'REJECTED'
          is_online: boolean
          is_on_trip: boolean
          current_location: string | null
          last_location_update: string | null
          can_receive_trips: boolean
          total_earnings: number
          created_at: string
          updated_at: string
          approved_at: string | null
          approved_by: string | null
          rejection_reason: string | null
          mp_oauth_status: 'PENDING' | 'AUTHORIZED' | 'EXPIRED' | 'REVOKED'
          mp_oauth_connected_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          vehicle_brand?: string | null
          vehicle_model?: string | null
          vehicle_year?: number | null
          vehicle_color?: string | null
          vehicle_plate?: string | null
          vehicle_photo_url?: string | null
          driver_license_number?: string | null
          driver_license_expiry?: string | null
          driver_license_photo_url?: string | null
          vehicle_registration_photo_url?: string | null
          insurance_photo_url?: string | null
          documents_validated?: boolean
          documents_validated_at?: string | null
          documents_validated_by?: string | null
          mp_seller_id?: string | null
          mp_account_email?: string | null
          mp_linked_at?: string | null
          mp_status?: 'PENDING' | 'LINKED' | 'SUSPENDED' | 'REJECTED'
          score?: number
          total_trips?: number
          total_ratings?: number
          average_rating?: number
          status?: 'PENDING_APPROVAL' | 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'REJECTED'
          is_online?: boolean
          is_on_trip?: boolean
          current_location?: string | null
          last_location_update?: string | null
          can_receive_trips?: boolean
          total_earnings?: number
          created_at?: string
          updated_at?: string
          approved_at?: string | null
          approved_by?: string | null
          rejection_reason?: string | null
          mp_oauth_status?: 'PENDING' | 'AUTHORIZED' | 'EXPIRED' | 'REVOKED'
          mp_oauth_connected_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          vehicle_brand?: string | null
          vehicle_model?: string | null
          vehicle_year?: number | null
          vehicle_color?: string | null
          vehicle_plate?: string | null
          vehicle_photo_url?: string | null
          driver_license_number?: string | null
          driver_license_expiry?: string | null
          driver_license_photo_url?: string | null
          vehicle_registration_photo_url?: string | null
          insurance_photo_url?: string | null
          documents_validated?: boolean
          documents_validated_at?: string | null
          documents_validated_by?: string | null
          mp_seller_id?: string | null
          mp_account_email?: string | null
          mp_linked_at?: string | null
          mp_status?: 'PENDING' | 'LINKED' | 'SUSPENDED' | 'REJECTED'
          score?: number
          total_trips?: number
          total_ratings?: number
          average_rating?: number
          status?: 'PENDING_APPROVAL' | 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'REJECTED'
          is_online?: boolean
          is_on_trip?: boolean
          current_location?: string | null
          last_location_update?: string | null
          can_receive_trips?: boolean
          total_earnings?: number
          created_at?: string
          updated_at?: string
          approved_at?: string | null
          approved_by?: string | null
          rejection_reason?: string | null
          mp_oauth_status?: 'PENDING' | 'AUTHORIZED' | 'EXPIRED' | 'REVOKED'
          mp_oauth_connected_at?: string | null
        }
      }
      trips: {
        Row: {
          id: string
          passenger_id: string
          driver_id: string | null
          origin_address: string
          origin_location: string
          origin_latitude: number | null
          origin_longitude: number | null
          destination_address: string
          destination_location: string
          destination_latitude: number | null
          destination_longitude: number | null
          status: 'REQUESTED' | 'ACCEPTED' | 'DRIVER_ARRIVING' | 'DRIVER_ARRIVED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED_BY_PASSENGER' | 'CANCELLED_BY_DRIVER' | 'CANCELLED_BY_SYSTEM'
          estimated_distance_km: number | null
          estimated_duration_minutes: number | null
          estimated_fare: number | null
          actual_distance_km: number | null
          actual_duration_minutes: number | null
          final_fare: number | null
          surge_multiplier: number
          requested_at: string
          accepted_at: string | null
          driver_arrived_at: string | null
          started_at: string | null
          completed_at: string | null
          cancelled_at: string | null
          cancellation_reason: string | null
          rating_id: string | null
          cancelled_by_admin_id: string | null
          admin_notes: string | null
          matching_score: number | null
          wait_time_seconds: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          passenger_id: string
          driver_id?: string | null
          origin_address: string
          origin_location: string
          origin_latitude?: number | null
          origin_longitude?: number | null
          destination_address: string
          destination_location: string
          destination_latitude?: number | null
          destination_longitude?: number | null
          status?: 'REQUESTED' | 'ACCEPTED' | 'DRIVER_ARRIVING' | 'DRIVER_ARRIVED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED_BY_PASSENGER' | 'CANCELLED_BY_DRIVER' | 'CANCELLED_BY_SYSTEM'
          estimated_distance_km?: number | null
          estimated_duration_minutes?: number | null
          estimated_fare?: number | null
          actual_distance_km?: number | null
          actual_duration_minutes?: number | null
          final_fare?: number | null
          surge_multiplier?: number
          requested_at?: string
          accepted_at?: string | null
          driver_arrived_at?: string | null
          started_at?: string | null
          completed_at?: string | null
          cancelled_at?: string | null
          cancellation_reason?: string | null
          rating_id?: string | null
          cancelled_by_admin_id?: string | null
          admin_notes?: string | null
          matching_score?: number | null
          wait_time_seconds?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          passenger_id?: string
          driver_id?: string | null
          origin_address?: string
          origin_location?: string
          origin_latitude?: number | null
          origin_longitude?: number | null
          destination_address?: string
          destination_location?: string
          destination_latitude?: number | null
          destination_longitude?: number | null
          status?: 'REQUESTED' | 'ACCEPTED' | 'DRIVER_ARRIVING' | 'DRIVER_ARRIVED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED_BY_PASSENGER' | 'CANCELLED_BY_DRIVER' | 'CANCELLED_BY_SYSTEM'
          estimated_distance_km?: number | null
          estimated_duration_minutes?: number | null
          estimated_fare?: number | null
          actual_distance_km?: number | null
          actual_duration_minutes?: number | null
          final_fare?: number | null
          surge_multiplier?: number
          requested_at?: string
          accepted_at?: string | null
          driver_arrived_at?: string | null
          started_at?: string | null
          completed_at?: string | null
          cancelled_at?: string | null
          cancellation_reason?: string | null
          rating_id?: string | null
          cancelled_by_admin_id?: string | null
          admin_notes?: string | null
          matching_score?: number | null
          wait_time_seconds?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      admin_users: {
        Row: {
          id: string
          user_id: string
          role: 'SUPER_ADMIN' | 'OPERATIONS_ADMIN' | 'SUPPORT_ADMIN' | 'FINANCE_ADMIN'
          permissions: Json
          is_active: boolean
          last_login: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          role?: 'SUPER_ADMIN' | 'OPERATIONS_ADMIN' | 'SUPPORT_ADMIN' | 'FINANCE_ADMIN'
          permissions?: Json
          is_active?: boolean
          last_login?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          role?: 'SUPER_ADMIN' | 'OPERATIONS_ADMIN' | 'SUPPORT_ADMIN' | 'FINANCE_ADMIN'
          permissions?: Json
          is_active?: boolean
          last_login?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      incidents: {
        Row: {
          id: string
          reported_by_user_id: string
          assigned_to_admin_id: string | null
          incident_type: string
          severity: string
          status: string
          title: string
          description: string
          trip_id: string | null
          driver_id: string | null
          passenger_id: string | null
          metadata: Json | null
          resolution_notes: string | null
          resolved_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          reported_by_user_id: string
          assigned_to_admin_id?: string | null
          incident_type: string
          severity?: string
          status?: string
          title: string
          description: string
          trip_id?: string | null
          driver_id?: string | null
          passenger_id?: string | null
          metadata?: Json | null
          resolution_notes?: string | null
          resolved_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          reported_by_user_id?: string
          assigned_to_admin_id?: string | null
          incident_type?: string
          severity?: string
          status?: string
          title?: string
          description?: string
          trip_id?: string | null
          driver_id?: string | null
          passenger_id?: string | null
          metadata?: Json | null
          resolution_notes?: string | null
          resolved_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      incident_actions: {
        Row: {
          id: string
          incident_id: string
          admin_id: string
          action_type: string
          notes: string | null
          action_data: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          incident_id: string
          admin_id: string
          action_type: string
          notes?: string | null
          action_data?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          incident_id?: string
          admin_id?: string
          action_type?: string
          notes?: string | null
          action_data?: Json | null
          created_at?: string
        }
      }
      audit_logs: {
        Row: {
          id: string
          admin_id: string
          action: string
          entity_type: string
          entity_id: string | null
          old_values: Json | null
          new_values: Json | null
          metadata: Json | null
          ip_address: string | null
          user_agent: string | null
          created_at: string
        }
        Insert: {
          id?: string
          admin_id: string
          action: string
          entity_type: string
          entity_id?: string | null
          old_values?: Json | null
          new_values?: Json | null
          metadata?: Json | null
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          admin_id?: string
          action?: string
          entity_type?: string
          entity_id?: string | null
          old_values?: Json | null
          new_values?: Json | null
          metadata?: Json | null
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
      }
      driver_verification_history: {
        Row: {
          id: string
          driver_id: string
          admin_id: string
          action: string
          previous_status: string | null
          new_status: string
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          driver_id: string
          admin_id: string
          action: string
          previous_status?: string | null
          new_status: string
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          driver_id?: string
          admin_id?: string
          action?: string
          previous_status?: string | null
          new_status?: string
          notes?: string | null
          created_at?: string
        }
      }
      driver_scores: {
        Row: {
          id: string
          driver_id: string
          score: number
          metrics: Json
          calculated_at: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          driver_id: string
          score?: number
          metrics?: Json
          calculated_at?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          driver_id?: string
          score?: number
          metrics?: Json
          calculated_at?: string
          created_at?: string
          updated_at?: string
        }
      }
      matching_config: {
        Row: {
          id: string
          city: string
          max_search_radius_km: number
          max_wait_time_seconds: number
          score_weights: Json
          trust_mode_bonus: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          city?: string
          max_search_radius_km?: number
          max_wait_time_seconds?: number
          score_weights?: Json
          trust_mode_bonus?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          city?: string
          max_search_radius_km?: number
          max_wait_time_seconds?: number
          score_weights?: Json
          trust_mode_bonus?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      trip_demand_analytics: {
        Row: {
          id: string
          zone_name: string
          demand_level: number
          active_drivers: number
          requested_trips: number
          avg_wait_time_seconds: number
          timestamp_hour: string
          created_at: string
        }
        Insert: {
          id?: string
          zone_name: string
          demand_level?: number
          active_drivers?: number
          requested_trips?: number
          avg_wait_time_seconds?: number
          timestamp_hour?: string
          created_at?: string
        }
        Update: {
          id?: string
          zone_name?: string
          demand_level?: number
          active_drivers?: number
          requested_trips?: number
          avg_wait_time_seconds?: number
          timestamp_hour?: string
          created_at?: string
        }
      }
      intelligent_alerts: {
        Row: {
          id: string
          alert_type: string
          severity: string
          entity_type: string
          entity_id: string
          title: string
          description: string
          data: Json | null
          is_resolved: boolean
          resolved_at: string | null
          resolved_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          alert_type: string
          severity?: string
          entity_type: string
          entity_id: string
          title: string
          description: string
          data?: Json | null
          is_resolved?: boolean
          resolved_at?: string | null
          resolved_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          alert_type?: string
          severity?: string
          entity_type?: string
          entity_id?: string
          title?: string
          description?: string
          data?: Json | null
          is_resolved?: boolean
          resolved_at?: string | null
          resolved_by?: string | null
          created_at?: string
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          type: string
          title: string
          message: string
          data: Json | null
          is_read: boolean
          read_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: string
          title: string
          message: string
          data?: Json | null
          is_read?: boolean
          read_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: string
          title?: string
          message?: string
          data?: Json | null
          is_read?: boolean
          read_at?: string | null
          created_at?: string
        }
      }
      notification_settings: {
        Row: {
          id: string
          user_id: string
          email_enabled: boolean
          push_enabled: boolean
          sms_enabled: boolean
          trip_updates: boolean
          promotions: boolean
          support_messages: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          email_enabled?: boolean
          push_enabled?: boolean
          sms_enabled?: boolean
          trip_updates?: boolean
          promotions?: boolean
          support_messages?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          email_enabled?: boolean
          push_enabled?: boolean
          sms_enabled?: boolean
          trip_updates?: boolean
          promotions?: boolean
          support_messages?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      service_zones: {
        Row: {
          id: string
          name: string
          description: string | null
          city: string
          polygon: Json
          is_active: boolean
          priority: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          city?: string
          polygon: Json
          is_active?: boolean
          priority?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          city?: string
          polygon?: Json
          is_active?: boolean
          priority?: number
          created_at?: string
          updated_at?: string
        }
      }
      system_settings: {
        Row: {
          id: string
          setting_key: string
          setting_value: Json
          description: string | null
          category: string
          is_public: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          setting_key: string
          setting_value: Json
          description?: string | null
          category?: string
          is_public?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          setting_key?: string
          setting_value?: Json
          description?: string | null
          category?: string
          is_public?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      support_departments_new: {
        Row: {
          id: string
          name: string
          description: string | null
          color: string
          icon: string
          is_active: boolean
          avg_response_time_minutes: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          color?: string
          icon?: string
          is_active?: boolean
          avg_response_time_minutes?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          color?: string
          icon?: string
          is_active?: boolean
          avg_response_time_minutes?: number
          created_at?: string
          updated_at?: string
        }
      }
      support_categories_new: {
        Row: {
          id: string
          name: string
          slug: string | null
          description: string | null
          department_id: string | null
          requires_urgent_attention: boolean
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug?: string | null
          description?: string | null
          department_id?: string | null
          requires_urgent_attention?: boolean
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string | null
          description?: string | null
          department_id?: string | null
          requires_urgent_attention?: boolean
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      support_conversations: {
        Row: {
          id: string
          conversation_number: string
          user_id: string
          user_type: 'PASSENGER' | 'DRIVER'
          category_id: string | null
          department_id: string | null
          assigned_agent_id: string | null
          subject: string
          description: string | null
          status: 'OPEN' | 'IN_PROGRESS' | 'WAITING_RESPONSE' | 'RESOLVED' | 'CLOSED'
          priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT' | 'CRITICAL'
          channel: 'CHAT' | 'TICKET'
          escalated_from_chat: boolean
          chat_started_at: string
          escalated_at: string | null
          rating: number | null
          rating_comment: string | null
          first_response_at: string | null
          resolved_at: string | null
          closed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          conversation_number?: string
          user_id: string
          user_type: 'PASSENGER' | 'DRIVER'
          category_id?: string | null
          department_id?: string | null
          assigned_agent_id?: string | null
          subject: string
          description?: string | null
          status?: 'OPEN' | 'IN_PROGRESS' | 'WAITING_RESPONSE' | 'RESOLVED' | 'CLOSED'
          priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT' | 'CRITICAL'
          channel?: 'CHAT' | 'TICKET'
          escalated_from_chat?: boolean
          chat_started_at?: string
          escalated_at?: string | null
          rating?: number | null
          rating_comment?: string | null
          first_response_at?: string | null
          resolved_at?: string | null
          closed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          conversation_number?: string
          user_id?: string
          user_type?: 'PASSENGER' | 'DRIVER'
          category_id?: string | null
          department_id?: string | null
          assigned_agent_id?: string | null
          subject?: string
          description?: string | null
          status?: 'OPEN' | 'IN_PROGRESS' | 'WAITING_RESPONSE' | 'RESOLVED' | 'CLOSED'
          priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT' | 'CRITICAL'
          channel?: 'CHAT' | 'TICKET'
          escalated_from_chat?: boolean
          chat_started_at?: string
          escalated_at?: string | null
          rating?: number | null
          rating_comment?: string | null
          first_response_at?: string | null
          resolved_at?: string | null
          closed_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      support_conversation_messages: {
        Row: {
          id: string
          conversation_id: string
          sender_id: string
          sender_type: 'PASSENGER' | 'DRIVER' | 'ADMIN' | 'SYSTEM'
          message: string
          message_type: string
          is_internal_note: boolean
          read_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          conversation_id: string
          sender_id: string
          sender_type: 'PASSENGER' | 'DRIVER' | 'ADMIN' | 'SYSTEM'
          message: string
          message_type?: string
          is_internal_note?: boolean
          read_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          conversation_id?: string
          sender_id?: string
          sender_type?: 'PASSENGER' | 'DRIVER' | 'ADMIN' | 'SYSTEM'
          message?: string
          message_type?: string
          is_internal_note?: boolean
          read_at?: string | null
          created_at?: string
        }
      }
      support_assignments: {
        Row: {
          id: string
          conversation_id: string
          from_agent_id: string | null
          to_agent_id: string | null
          from_department_id: string | null
          to_department_id: string | null
          reason: string | null
          assigned_by: string
          created_at: string
        }
        Insert: {
          id?: string
          conversation_id: string
          from_agent_id?: string | null
          to_agent_id?: string | null
          from_department_id?: string | null
          to_department_id?: string | null
          reason?: string | null
          assigned_by: string
          created_at?: string
        }
        Update: {
          id?: string
          conversation_id?: string
          from_agent_id?: string | null
          to_agent_id?: string | null
          from_department_id?: string | null
          to_department_id?: string | null
          reason?: string | null
          assigned_by?: string
          created_at?: string
        }
      }
      trip_locations: {
        Row: {
          id: string
          trip_id: string
          latitude: number
          longitude: number
          heading: number | null
          speed_kmh: number | null
          recorded_at: string
          source: string
        }
        Insert: {
          id?: string
          trip_id: string
          latitude: number
          longitude: number
          heading?: number | null
          speed_kmh?: number | null
          recorded_at?: string
          source?: string
        }
        Update: {
          id?: string
          trip_id?: string
          latitude?: number
          longitude?: number
          heading?: number | null
          speed_kmh?: number | null
          recorded_at?: string
          source?: string
        }
      }
      trip_payments: {
        Row: {
          id: string
          trip_id: string
          total_amount: number
          driver_amount: number
          platform_amount: number
          mp_payment_id: string | null
          mp_preference_id: string | null
          external_reference: string
          mp_status: 'pending' | 'approved' | 'rejected' | 'refunded' | 'cancelled'
          mp_status_detail: string | null
          driver_mp_seller_id: string
          platform_mp_seller_id: string
          payment_method: string | null
          payment_method_id: string | null
          installments: number
          idempotency_key: string | null
          preference_init_point: string | null
          preference_sandbox_init_point: string | null
          last_webhook_at: string | null
          created_at: string
          approved_at: string | null
        }
        Insert: {
          id?: string
          trip_id: string
          total_amount: number
          driver_amount: number
          platform_amount: number
          mp_payment_id?: string | null
          mp_preference_id?: string | null
          external_reference: string
          mp_status: 'pending' | 'approved' | 'rejected' | 'refunded' | 'cancelled'
          mp_status_detail?: string | null
          driver_mp_seller_id: string
          platform_mp_seller_id: string
          payment_method?: string | null
          payment_method_id?: string | null
          installments?: number
          idempotency_key?: string | null
          preference_init_point?: string | null
          preference_sandbox_init_point?: string | null
          last_webhook_at?: string | null
          created_at?: string
          approved_at?: string | null
        }
        Update: {
          id?: string
          trip_id?: string
          total_amount?: number
          driver_amount?: number
          platform_amount?: number
          mp_payment_id?: string | null
          mp_preference_id?: string | null
          external_reference?: string
          mp_status?: 'pending' | 'approved' | 'rejected' | 'refunded' | 'cancelled'
          mp_status_detail?: string | null
          driver_mp_seller_id?: string
          platform_mp_seller_id?: string
          payment_method?: string | null
          payment_method_id?: string | null
          installments?: number
          idempotency_key?: string | null
          preference_init_point?: string | null
          preference_sandbox_init_point?: string | null
          last_webhook_at?: string | null
          created_at?: string
          approved_at?: string | null
        }
      }
      ratings: {
        Row: {
          id: string
          trip_id: string
          passenger_id: string
          driver_id: string
          overall_rating: number
          safety_rating: number | null
          cleanliness_rating: number | null
          communication_rating: number | null
          comment: string | null
          is_anonymous: boolean
          created_at: string
        }
        Insert: {
          id?: string
          trip_id: string
          passenger_id: string
          driver_id: string
          overall_rating: number
          safety_rating?: number | null
          cleanliness_rating?: number | null
          communication_rating?: number | null
          comment?: string | null
          is_anonymous?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          trip_id?: string
          passenger_id?: string
          driver_id?: string
          overall_rating?: number
          safety_rating?: number | null
          cleanliness_rating?: number | null
          communication_rating?: number | null
          comment?: string | null
          is_anonymous?: boolean
          created_at?: string
        }
      }
      pricing_rules: {
        Row: {
          id: string
          service_area_id: string | null
          city: string | null
          country: string
          base_fare: number
          per_km_rate: number
          per_minute_rate: number
          minimum_fare: number
          platform_commission_percent: number
          surge_enabled: boolean
          surge_multiplier_max: number
          night_surcharge_enabled: boolean
          night_surcharge_percent: number
          night_hours_start: string
          night_hours_end: string
          is_active: boolean
          valid_from: string
          valid_until: string | null
          created_at: string
          created_by: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          service_area_id?: string | null
          city?: string | null
          country?: string
          base_fare?: number
          per_km_rate?: number
          per_minute_rate?: number
          minimum_fare?: number
          platform_commission_percent?: number
          surge_enabled?: boolean
          surge_multiplier_max?: number
          night_surcharge_enabled?: boolean
          night_surcharge_percent?: number
          night_hours_start?: string
          night_hours_end?: string
          is_active?: boolean
          valid_from?: string
          valid_until?: string | null
          created_at?: string
          created_by?: string | null
          updated_at?: string
        }
        Update: {
          id?: string
          service_area_id?: string | null
          city?: string | null
          country?: string
          base_fare?: number
          per_km_rate?: number
          per_minute_rate?: number
          minimum_fare?: number
          platform_commission_percent?: number
          surge_enabled?: boolean
          surge_multiplier_max?: number
          night_surcharge_enabled?: boolean
          night_surcharge_percent?: number
          night_hours_start?: string
          night_hours_end?: string
          is_active?: boolean
          valid_from?: string
          valid_until?: string | null
          created_at?: string
          created_by?: string | null
          updated_at?: string
        }
      }
    }
    Views: {
      active_trips_operational: {
        Row: {
          [key: string]: Json | null
        }
      }
      drivers_status_summary: {
        Row: {
          [key: string]: Json | null
        }
      }
      open_incidents_summary: {
        Row: {
          [key: string]: Json | null
        }
      }
    }
    Functions: {
      calculate_driver_score: {
        Args: {
          p_driver_id: string
        }
        Returns: Json
      }
      check_driver_performance_alerts: {
        Args: {
          p_driver_id: string
        }
        Returns: Json
      }
      mark_all_notifications_as_read: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      process_trip_payment_webhook: {
        Args: {
          p_external_reference: string
          p_mp_payment_id: string
          p_mp_status: string
          p_mp_status_detail: string | null
          p_payment_method: string | null
          p_payment_method_id: string | null
        }
        Returns: {
          processed: boolean
          trip_id: string | null
          status: string | null
          status_changed: boolean
          earnings_applied: boolean
        }[]
      }
      accept_trip: {
        Args: {
          p_trip_id: string
        }
        Returns: {
          success: boolean
          code: string
          message: string
          trip_id: string | null
          driver_id: string | null
        }[]
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

type PublicTables = DatabaseGenerated['public']['Tables'];
type PublicViews = DatabaseGenerated['public']['Views'];

export type Database = {
  public: {
    Tables: {
      [K in keyof PublicTables]: PublicTables[K] & { Relationships: [] };
    };
    Views: {
      [K in keyof PublicViews]: PublicViews[K] & { Relationships: [] };
    };
    Functions: DatabaseGenerated['public']['Functions'];
    Enums: DatabaseGenerated['public']['Enums'];
    CompositeTypes: DatabaseGenerated['public']['CompositeTypes'];
  };
};
