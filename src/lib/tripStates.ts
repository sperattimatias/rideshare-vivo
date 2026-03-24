import type { Database } from './database.types';

type TripStatus = Database['public']['Tables']['trips']['Row']['status'];

export const TRIP_STATES = {
  REQUESTED: 'REQUESTED',
  ACCEPTED: 'ACCEPTED',
  DRIVER_ARRIVING: 'DRIVER_ARRIVING',
  DRIVER_ARRIVED: 'DRIVER_ARRIVED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  CANCELLED_BY_PASSENGER: 'CANCELLED_BY_PASSENGER',
  CANCELLED_BY_DRIVER: 'CANCELLED_BY_DRIVER',
  CANCELLED_BY_SYSTEM: 'CANCELLED_BY_SYSTEM',
} as const;

const VALID_TRANSITIONS: Record<TripStatus, TripStatus[]> = {
  REQUESTED: ['ACCEPTED', 'CANCELLED_BY_PASSENGER', 'CANCELLED_BY_SYSTEM'],
  ACCEPTED: ['DRIVER_ARRIVING', 'CANCELLED_BY_DRIVER', 'CANCELLED_BY_PASSENGER'],
  DRIVER_ARRIVING: ['DRIVER_ARRIVED', 'CANCELLED_BY_DRIVER'],
  DRIVER_ARRIVED: ['IN_PROGRESS', 'CANCELLED_BY_DRIVER'],
  IN_PROGRESS: ['COMPLETED'],
  COMPLETED: [],
  CANCELLED_BY_PASSENGER: [],
  CANCELLED_BY_DRIVER: [],
  CANCELLED_BY_SYSTEM: [],
};

export function canTransitionTo(currentStatus: TripStatus, newStatus: TripStatus): boolean {
  return VALID_TRANSITIONS[currentStatus]?.includes(newStatus) ?? false;
}

export function getStatusLabel(status: TripStatus): string {
  const labels: Record<TripStatus, string> = {
    REQUESTED: 'Solicitado',
    ACCEPTED: 'Aceptado',
    DRIVER_ARRIVING: 'Conductor yendo',
    DRIVER_ARRIVED: 'Conductor llegó',
    IN_PROGRESS: 'En curso',
    COMPLETED: 'Completado',
    CANCELLED_BY_PASSENGER: 'Cancelado por pasajero',
    CANCELLED_BY_DRIVER: 'Cancelado por conductor',
    CANCELLED_BY_SYSTEM: 'Cancelado por sistema',
  };
  return labels[status] || status;
}

export function getStatusColor(status: TripStatus): string {
  const colors: Record<TripStatus, string> = {
    REQUESTED: 'yellow',
    ACCEPTED: 'blue',
    DRIVER_ARRIVING: 'blue',
    DRIVER_ARRIVED: 'green',
    IN_PROGRESS: 'purple',
    COMPLETED: 'green',
    CANCELLED_BY_PASSENGER: 'red',
    CANCELLED_BY_DRIVER: 'red',
    CANCELLED_BY_SYSTEM: 'red',
  };
  return colors[status] || 'gray';
}

export function getDriverActionLabel(status: TripStatus): string | null {
  const actions: Partial<Record<TripStatus, string>> = {
    ACCEPTED: 'Ir a buscar pasajero',
    DRIVER_ARRIVING: 'Ya llegué',
    DRIVER_ARRIVED: 'Iniciar viaje',
    IN_PROGRESS: 'Finalizar viaje',
  };
  return actions[status] || null;
}

export function getNextDriverStatus(currentStatus: TripStatus): TripStatus | null {
  const nextStatus: Partial<Record<TripStatus, TripStatus>> = {
    ACCEPTED: 'DRIVER_ARRIVING',
    DRIVER_ARRIVING: 'DRIVER_ARRIVED',
    DRIVER_ARRIVED: 'IN_PROGRESS',
    IN_PROGRESS: 'COMPLETED',
  };
  return nextStatus[currentStatus] || null;
}

export function isTripActive(status: TripStatus): boolean {
  return [
    'REQUESTED',
    'ACCEPTED',
    'DRIVER_ARRIVING',
    'DRIVER_ARRIVED',
    'IN_PROGRESS',
  ].includes(status);
}

export function isTripCompleted(status: TripStatus): boolean {
  return status === 'COMPLETED';
}

export function isTripCancelled(status: TripStatus): boolean {
  return [
    'CANCELLED_BY_PASSENGER',
    'CANCELLED_BY_DRIVER',
    'CANCELLED_BY_SYSTEM',
  ].includes(status);
}

export function canDriverCancel(status: TripStatus): boolean {
  return ['ACCEPTED', 'DRIVER_ARRIVING'].includes(status);
}

export function canPassengerCancel(status: TripStatus): boolean {
  return ['REQUESTED', 'ACCEPTED'].includes(status);
}
