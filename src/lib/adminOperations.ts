import { supabase } from './supabase';
import type { Database, Json } from './database.types';

export type IncidentType = 'ACCIDENT' | 'COMPLAINT' | 'DISPUTE' | 'FRAUD' | 'SAFETY' | 'HARASSMENT' | 'LOST_ITEM' | 'OTHER';
export type IncidentSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type IncidentStatus = 'OPEN' | 'INVESTIGATING' | 'RESOLVED' | 'CLOSED';

export type IncidentActionType =
  | 'CREATED'
  | 'ASSIGNED'
  | 'STATUS_CHANGED'
  | 'SEVERITY_CHANGED'
  | 'COMMENT_ADDED'
  | 'DRIVER_SUSPENDED'
  | 'DRIVER_CONTACTED'
  | 'PASSENGER_CONTACTED'
  | 'TRIP_CANCELLED'
  | 'REFUND_ISSUED'
  | 'ESCALATED'
  | 'RESOLVED'
  | 'CLOSED';

export type AuditEntityType = 'TRIP' | 'DRIVER' | 'PASSENGER' | 'INCIDENT' | 'USER' | 'PAYMENT' | 'ADMIN' | 'CONFIGURATION' | 'SUPPORT_TICKET';

export type DriverVerificationAction =
  | 'SUBMITTED'
  | 'DOCUMENTS_REQUESTED'
  | 'DOCUMENTS_VERIFIED'
  | 'DOCUMENTS_REJECTED'
  | 'APPROVED'
  | 'REJECTED'
  | 'SUSPENDED'
  | 'REACTIVATED'
  | 'MP_LINKED'
  | 'MP_SUSPENDED';

export interface CreateIncidentParams {
  incident_type: IncidentType;
  severity: IncidentSeverity;
  title: string;
  description: string;
  trip_id?: string;
  driver_id?: string;
  passenger_id?: string;
  metadata?: Json;
}

export interface IncidentActionParams {
  incident_id: string;
  action_type: IncidentActionType;
  notes?: string;
  action_data?: Json;
}

export interface AuditLogParams {
  action: string;
  entity_type: AuditEntityType;
  entity_id?: string;
  old_values?: Json;
  new_values?: Json;
  metadata?: Json;
}

// Get current admin user
export async function getCurrentAdmin() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: admin, error } = await supabase
    .from('admin_users')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) throw error;
  if (!admin) throw new Error('Not an admin user');

  return admin;
}

// Create audit log
export async function createAuditLog(params: AuditLogParams) {
  const admin = await getCurrentAdmin();

  const { error } = await supabase
    .from('audit_logs')
    .insert({
      admin_id: admin.id,
      ...params,
    });

  if (error) throw error;
}

// INCIDENT MANAGEMENT
export async function createIncident(params: CreateIncidentParams) {
  const admin = await getCurrentAdmin();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: incident, error } = await supabase
    .from('incidents')
    .insert({
      ...params,
      reported_by_user_id: user!.id,
      assigned_to_admin_id: admin.id,
    })
    .select()
    .single();

  if (error) throw error;

  // Log incident action
  await addIncidentAction({
    incident_id: incident.id,
    action_type: 'CREATED',
    notes: 'Incident created',
  });

  // Audit log
  await createAuditLog({
    action: 'CREATE_INCIDENT',
    entity_type: 'INCIDENT',
    entity_id: incident.id,
    new_values: incident,
  });

  return incident;
}

export async function updateIncidentStatus(
  incidentId: string,
  status: IncidentStatus,
  resolution_notes?: string
) {
  const { data: oldIncident } = await supabase
    .from('incidents')
    .select('*')
    .eq('id', incidentId)
    .single();

  const updateData: Database['public']['Tables']['incidents']['Update'] = {
    status,
    updated_at: new Date().toISOString(),
  };

  if (status === 'RESOLVED' || status === 'CLOSED') {
    updateData.resolved_at = new Date().toISOString();
    if (resolution_notes) {
      updateData.resolution_notes = resolution_notes;
    }
  }

  const { data: incident, error } = await supabase
    .from('incidents')
    .update(updateData)
    .eq('id', incidentId)
    .select()
    .single();

  if (error) throw error;

  await addIncidentAction({
    incident_id: incidentId,
    action_type: 'STATUS_CHANGED',
    notes: `Status changed from ${oldIncident?.status} to ${status}`,
    action_data: { old_status: oldIncident?.status, new_status: status },
  });

  await createAuditLog({
    action: 'UPDATE_INCIDENT_STATUS',
    entity_type: 'INCIDENT',
    entity_id: incidentId,
    old_values: oldIncident,
    new_values: incident,
  });

  return incident;
}

export async function assignIncident(incidentId: string, adminId: string) {
  const { data: oldIncident } = await supabase
    .from('incidents')
    .select('*')
    .eq('id', incidentId)
    .single();

  const { data: incident, error } = await supabase
    .from('incidents')
    .update({
      assigned_to_admin_id: adminId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', incidentId)
    .select()
    .single();

  if (error) throw error;

  await addIncidentAction({
    incident_id: incidentId,
    action_type: 'ASSIGNED',
    notes: `Incident assigned to admin`,
    action_data: { admin_id: adminId },
  });

  await createAuditLog({
    action: 'ASSIGN_INCIDENT',
    entity_type: 'INCIDENT',
    entity_id: incidentId,
    old_values: oldIncident,
    new_values: incident,
  });

  return incident;
}

export async function addIncidentAction(params: IncidentActionParams) {
  const admin = await getCurrentAdmin();

  const { error } = await supabase
    .from('incident_actions')
    .insert({
      ...params,
      admin_id: admin.id,
    });

  if (error) throw error;
}

// DRIVER MANAGEMENT
export async function approveDriver(
  driverId: string,
  notes?: string
) {
  const { data: oldDriver } = await supabase
    .from('drivers')
    .select('*')
    .eq('id', driverId)
    .single();

  const admin = await getCurrentAdmin();

  const { data: driver, error } = await supabase
    .from('drivers')
    .update({
      status: 'ACTIVE',
      documents_validated: true,
      documents_validated_at: new Date().toISOString(),
      documents_validated_by: admin.id,
      approved_at: new Date().toISOString(),
      approved_by: admin.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', driverId)
    .select()
    .single();

  if (error) throw error;

  await supabase
    .from('driver_verification_history')
    .insert({
      driver_id: driverId,
      admin_id: admin.id,
      action: 'APPROVED',
      previous_status: oldDriver?.status,
      new_status: 'ACTIVE',
      notes,
    });

  await createAuditLog({
    action: 'APPROVE_DRIVER',
    entity_type: 'DRIVER',
    entity_id: driverId,
    old_values: oldDriver,
    new_values: driver,
    metadata: { notes },
  });

  return driver;
}

export async function rejectDriver(
  driverId: string,
  notes: string
) {
  const { data: oldDriver } = await supabase
    .from('drivers')
    .select('*')
    .eq('id', driverId)
    .single();

  const admin = await getCurrentAdmin();

  const { data: driver, error } = await supabase
    .from('drivers')
    .update({
      status: 'REJECTED',
      documents_validated: false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', driverId)
    .select()
    .single();

  if (error) throw error;

  await supabase
    .from('driver_verification_history')
    .insert({
      driver_id: driverId,
      admin_id: admin.id,
      action: 'REJECTED',
      previous_status: oldDriver?.status,
      new_status: 'REJECTED',
      notes,
    });

  await createAuditLog({
    action: 'REJECT_DRIVER',
    entity_type: 'DRIVER',
    entity_id: driverId,
    old_values: oldDriver,
    new_values: driver,
    metadata: { notes },
  });

  return driver;
}

export async function suspendDriver(
  driverId: string,
  reason: string,
  incidentId?: string
) {
  const { data: oldDriver } = await supabase
    .from('drivers')
    .select('*')
    .eq('id', driverId)
    .single();

  const admin = await getCurrentAdmin();

  const { data: driver, error } = await supabase
    .from('drivers')
    .update({
      status: 'SUSPENDED',
      is_online: false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', driverId)
    .select()
    .single();

  if (error) throw error;

  await supabase
    .from('driver_verification_history')
    .insert({
      driver_id: driverId,
      admin_id: admin.id,
      action: 'SUSPENDED',
      previous_status: oldDriver?.status,
      new_status: 'SUSPENDED',
      notes: reason,
    });

  if (incidentId) {
    await addIncidentAction({
      incident_id: incidentId,
      action_type: 'DRIVER_SUSPENDED',
      notes: `Driver suspended: ${reason}`,
      action_data: { driver_id: driverId, reason },
    });
  }

  await createAuditLog({
    action: 'SUSPEND_DRIVER',
    entity_type: 'DRIVER',
    entity_id: driverId,
    old_values: oldDriver,
    new_values: driver,
    metadata: { reason, incident_id: incidentId },
  });

  return driver;
}

export async function reactivateDriver(
  driverId: string,
  notes?: string
) {
  const { data: oldDriver } = await supabase
    .from('drivers')
    .select('*')
    .eq('id', driverId)
    .single();

  const admin = await getCurrentAdmin();

  const { data: driver, error } = await supabase
    .from('drivers')
    .update({
      status: 'ACTIVE',
      updated_at: new Date().toISOString(),
    })
    .eq('id', driverId)
    .select()
    .single();

  if (error) throw error;

  await supabase
    .from('driver_verification_history')
    .insert({
      driver_id: driverId,
      admin_id: admin.id,
      action: 'REACTIVATED',
      previous_status: oldDriver?.status,
      new_status: 'ACTIVE',
      notes,
    });

  await createAuditLog({
    action: 'REACTIVATE_DRIVER',
    entity_type: 'DRIVER',
    entity_id: driverId,
    old_values: oldDriver,
    new_values: driver,
    metadata: { notes },
  });

  return driver;
}

// TRIP MANAGEMENT
export async function cancelTripByAdmin(
  tripId: string,
  reason: string,
  incidentId?: string
) {
  const { data: oldTrip } = await supabase
    .from('trips')
    .select('*')
    .eq('id', tripId)
    .single();

  const admin = await getCurrentAdmin();

  const { data: trip, error } = await supabase
    .from('trips')
    .update({
      status: 'CANCELLED_BY_SYSTEM',
      cancelled_at: new Date().toISOString(),
      cancellation_reason: reason,
      cancelled_by_admin_id: admin.id,
      admin_notes: reason,
      updated_at: new Date().toISOString(),
    })
    .eq('id', tripId)
    .select()
    .single();

  if (error) throw error;

  if (incidentId) {
    await addIncidentAction({
      incident_id: incidentId,
      action_type: 'TRIP_CANCELLED',
      notes: `Trip cancelled by admin: ${reason}`,
      action_data: { trip_id: tripId, reason },
    });
  }

  await createAuditLog({
    action: 'CANCEL_TRIP',
    entity_type: 'TRIP',
    entity_id: tripId,
    old_values: oldTrip,
    new_values: trip,
    metadata: { reason, incident_id: incidentId },
  });

  return trip;
}

export async function getTripDetails(tripId: string) {
  const { data: trip, error } = await supabase
    .from('trips')
    .select(`
      *,
      passenger:passengers(
        id,
        user:user_profiles(full_name, phone, profile_photo_url)
      ),
      driver:drivers(
        id,
        user:user_profiles(full_name, phone),
        vehicle_brand,
        vehicle_model,
        vehicle_plate,
        vehicle_color
      ),
      payment:trip_payments(*),
      rating:ratings(*)
    `)
    .eq('id', tripId)
    .single();

  if (error) throw error;
  return trip;
}

export async function getTripGPSHistory(tripId: string) {
  const { data, error } = await supabase
    .from('trip_locations')
    .select('*')
    .eq('trip_id', tripId)
    .order('recorded_at', { ascending: true });

  if (error) throw error;
  return data;
}

// DASHBOARD QUERIES
export async function getOperationalDashboard() {
  const [activeTrips, openIncidents, driversStatus] = await Promise.all([
    supabase.from('active_trips_operational').select('*'),
    supabase.from('open_incidents_summary').select('*'),
    supabase.from('drivers_status_summary').select('*'),
  ]);

  return {
    activeTrips: activeTrips.data || [],
    openIncidents: openIncidents.data || [],
    driversStatus: driversStatus.data || [],
  };
}

export async function getRecentAuditLogs(limit = 50) {
  const { data, error } = await supabase
    .from('audit_logs')
    .select(`
      *,
      admin:admin_users(
        user:user_profiles(full_name)
      )
    `)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
}
