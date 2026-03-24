import { supabase } from '../supabase';

export interface MapsConfig {
  provider: 'nominatim' | 'mapbox' | 'google';
  mapboxToken?: string;
  googleMapsApiKey?: string;
}

let cachedConfig: MapsConfig | null = null;

export async function getMapsConfig(): Promise<MapsConfig> {
  if (cachedConfig) {
    return cachedConfig;
  }

  try {
    const { data, error } = await supabase
      .from('system_settings')
      .select('key, value')
      .eq('category', 'maps');

    if (error) throw error;

    const settings: Record<string, string> = {};
    data?.forEach((setting) => {
      settings[setting.key] = setting.value;
    });

    const provider = (settings.maps_provider || 'nominatim') as 'nominatim' | 'mapbox' | 'google';

    cachedConfig = {
      provider,
      mapboxToken: settings.mapbox_token,
      googleMapsApiKey: settings.google_maps_api_key,
    };

    return cachedConfig;
  } catch (error) {
    console.error('Error fetching maps config:', error);
    return {
      provider: 'nominatim',
    };
  }
}

export function clearMapsConfigCache() {
  cachedConfig = null;
}
