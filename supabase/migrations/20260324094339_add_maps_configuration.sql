/*
  # Add Maps Configuration Settings

  1. New Settings
    - `maps_provider` - Maps provider selection (nominatim, mapbox, or google)
    - `mapbox_token` - Mapbox public access token (pk.*)
    - `google_maps_api_key` - Google Maps API key

  2. Security
    - Settings are marked as sensitive where appropriate
    - Only authenticated admin users can modify these settings

  3. Notes
    - Nominatim is free and doesn't require configuration
    - Mapbox requires a public token (pk.*)
    - Google Maps requires an API key
    - The selected provider determines which geocoding and mapping service is used throughout the platform
*/

-- Insert default maps configuration settings
INSERT INTO system_settings (key, value, description, is_sensitive, category)
VALUES
  (
    'maps_provider',
    'nominatim',
    'Maps and geocoding provider: nominatim (free), mapbox, or google',
    false,
    'maps'
  ),
  (
    'mapbox_token',
    '',
    'Mapbox public access token (pk.*) - Required for Mapbox provider',
    true,
    'maps'
  ),
  (
    'google_maps_api_key',
    '',
    'Google Maps API key - Required for Google Maps provider',
    true,
    'maps'
  )
ON CONFLICT (key) DO NOTHING;
