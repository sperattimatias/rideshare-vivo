export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
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
          total_trips: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          preferred_payment_method?: string | null
          saved_addresses?: Json
          total_trips?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          preferred_payment_method?: string | null
          saved_addresses?: Json
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
          created_at: string
          updated_at: string
          approved_at: string | null
          approved_by: string | null
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
          created_at?: string
          updated_at?: string
          approved_at?: string | null
          approved_by?: string | null
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
          created_at?: string
          updated_at?: string
          approved_at?: string | null
          approved_by?: string | null
        }
      }
      trips: {
        Row: {
          id: string
          passenger_id: string
          driver_id: string | null
          origin_address: string
          origin_location: string
          destination_address: string
          destination_location: string
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
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          passenger_id: string
          driver_id?: string | null
          origin_address: string
          origin_location: string
          destination_address: string
          destination_location: string
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
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          passenger_id?: string
          driver_id?: string | null
          origin_address?: string
          origin_location?: string
          destination_address?: string
          destination_location?: string
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
          created_at?: string
          updated_at?: string
        }
      }
      trip_payments: {
        Row: {
          id: string
          trip_id: string
          total_amount: number
          driver_amount: number
          platform_amount: number
          mp_payment_id: string
          mp_status: 'pending' | 'approved' | 'rejected' | 'refunded' | 'cancelled'
          mp_status_detail: string | null
          driver_mp_seller_id: string
          platform_mp_seller_id: string
          payment_method: string | null
          payment_method_id: string | null
          installments: number
          created_at: string
          approved_at: string | null
        }
        Insert: {
          id?: string
          trip_id: string
          total_amount: number
          driver_amount: number
          platform_amount: number
          mp_payment_id: string
          mp_status: 'pending' | 'approved' | 'rejected' | 'refunded' | 'cancelled'
          mp_status_detail?: string | null
          driver_mp_seller_id: string
          platform_mp_seller_id: string
          payment_method?: string | null
          payment_method_id?: string | null
          installments?: number
          created_at?: string
          approved_at?: string | null
        }
        Update: {
          id?: string
          trip_id?: string
          total_amount?: number
          driver_amount?: number
          platform_amount?: number
          mp_payment_id?: string
          mp_status?: 'pending' | 'approved' | 'rejected' | 'refunded' | 'cancelled'
          mp_status_detail?: string | null
          driver_mp_seller_id?: string
          platform_mp_seller_id?: string
          payment_method?: string | null
          payment_method_id?: string | null
          installments?: number
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
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
