import { supabase } from './supabase';

interface ServiceZone {
  id: string;
  name: string;
  boundary_points: Array<{ lat: number; lon: number }>;
  is_active: boolean;
}

export async function isPointInServiceZone(
  lat: number,
  lon: number
): Promise<{ inZone: boolean; zoneName?: string }> {
  try {
    const { data: zones, error } = await supabase
      .from('service_zones')
      .select('id, name, boundary_points, is_active')
      .eq('is_active', true);

    if (error) throw error;

    if (!zones || zones.length === 0) {
      console.warn('No hay zonas activas configuradas; denegando solicitud por seguridad.');
      return { inZone: false };
    }

    for (const zone of zones) {
      if (isPointInPolygon({ lat, lon }, zone.boundary_points)) {
        return { inZone: true, zoneName: zone.name };
      }
    }

    return { inZone: false };
  } catch (error) {
    console.error('Error checking service zone:', error);
    return { inZone: false };
  }
}

function isPointInPolygon(
  point: { lat: number; lon: number },
  polygon: Array<{ lat: number; lon: number }>
): boolean {
  let inside = false;
  const x = point.lon;
  const y = point.lat;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lon;
    const yi = polygon[i].lat;
    const xj = polygon[j].lon;
    const yj = polygon[j].lat;

    const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;

    if (intersect) {
      inside = !inside;
    }
  }

  return inside;
}

export async function getActiveServiceZones(): Promise<ServiceZone[]> {
  try {
    const { data, error } = await supabase
      .from('service_zones')
      .select('id, name, boundary_points, is_active')
      .eq('is_active', true);

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error fetching active service zones:', error);
    return [];
  }
}
