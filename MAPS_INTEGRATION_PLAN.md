# Plan de Integración Completa de Mapas - VIVO

## 1. EVALUACIÓN ARQUITECTURA ACTUAL

### Estado Actual
- **Geocodificación:** Nominatim (OpenStreetMap) - funcional pero limitado
- **Cálculos:** Haversine formula para distancias (línea recta, no rutas reales)
- **ETA:** Estimación simple basada en velocidad promedio (30 km/h)
- **Visualización:** NINGUNA - solo texto de direcciones
- **Tracking:** NO implementado
- **Reverse geocoding:** NO implementado

### Puntos de Integración Identificados

#### A. Geocodificación (Actual: Nominatim)
**Archivos afectados:**
- `src/lib/geocoding.ts` - Servicio principal
- `src/components/AddressAutocomplete.tsx` - Autocompletado
- `src/pages/passenger/RequestRide.tsx` - Solicitud de viaje
- `src/pages/driver/TripRequests.tsx` - Vista de conductor

**Limitaciones:**
- Cobertura irregular de calles de Rosario
- Rate limit: 1 req/segundo
- Sin reverse geocoding
- Sin snap-to-road

#### B. Cálculo de Distancias (Actual: Haversine)
**Archivos afectados:**
- `src/lib/geo.ts` - Cálculos geométricos
- `src/lib/pricing.ts` - Usa distancia para tarifas

**Limitaciones:**
- Distancia en línea recta, NO ruta real
- Puede diferir 20-40% de la distancia real en ciudad
- Impacto directo en precisión de tarifas

#### C. Cálculo de ETA (Actual: Fórmula simple)
**Limitaciones:**
- Velocidad promedio fija de 30 km/h
- No considera tráfico real
- No considera tipo de vías
- No considera hora del día

#### D. Tracking en Tiempo Real
**Estado:** NO IMPLEMENTADO
**Necesario para:**
- Mostrar posición de conductor al pasajero
- Mostrar ruta al destino
- Actualizar ETA dinámicamente

#### E. Visualización de Mapas
**Estado:** NO IMPLEMENTADO
**Necesario para:**
- Confirmar ubicaciones visualmente
- Mostrar ruta del viaje
- Tracking en tiempo real
- Admin: monitoreo de flota

## 2. ANÁLISIS DE PROVEEDORES

### Opción 1: Mapbox ⭐ RECOMENDADO

**Pros:**
- Precio competitivo (50,000 loads gratuitos/mes)
- Excelente cobertura LATAM y Argentina
- Geocoding API completo
- Directions API (rutas optimizadas)
- Static Maps y GL JS (mapas interactivos)
- Muy buena documentación
- SDK oficial de React
- Estilo de mapas personalizable

**Cons:**
- Menor cobertura que Google Maps (pero suficiente para Rosario)
- Comunidad más pequeña

**Pricing:**
- Geocoding: $0.50 / 1,000 requests
- Directions: $0.50 / 1,000 requests
- Map Loads: $0.50 / 1,000 loads
- Gratis hasta 50k/mes de cada uno

**Estimación de costos para VIVO (100 viajes/día):**
- Geocoding: ~6,000 requests/mes = $3/mes
- Directions: ~3,000 requests/mes = $1.50/mes
- Map loads: ~30,000 loads/mes = GRATIS
- **Total: ~$5/mes en fase inicial**

### Opción 2: Google Maps Platform

**Pros:**
- Cobertura excepcional de Argentina
- Places API con autocompletado superior
- Directions API muy precisa
- Roads API para snap-to-road
- Comunidad enorme
- Geocoding inverso excelente

**Cons:**
- **PRECIO:** Mucho más caro que alternativas
- Requiere tarjeta de crédito obligatoria
- Estructura de precios compleja
- Lock-in al ecosistema Google

**Pricing:**
- Geocoding: $5 / 1,000 requests
- Directions: $5 / 1,000 requests
- Places Autocomplete: $2.83 / 1,000 session
- Map loads: $7 / 1,000 loads
- $200 crédito mensual gratis

**Estimación de costos para VIVO (100 viajes/día):**
- Geocoding: ~6,000 requests/mes = $30/mes
- Directions: ~3,000 requests/mes = $15/mes
- Autocomplete: ~6,000 sessions/mes = $17/mes
- Map loads: ~30,000 loads/mes = $210/mes
- **Total: ~$272/mes - $200 crédito = $72/mes**

### Opción 3: HERE Maps

**Pros:**
- Precio intermedio
- Buena cobertura de Argentina
- Geocoding & Search API completo
- APIs de routing sólidas
- Orientado a aplicaciones de movilidad

**Cons:**
- Menos popular en comunidad React
- Documentación menos amigable
- SDK menos maduro

### Opción 4: OpenStreetMap + Leaflet (Estado actual mejorado)

**Pros:**
- GRATIS
- Sin límites de uso con servidor propio
- Open source
- Leaflet es excelente librería de mapas

**Cons:**
- Cobertura irregular de Rosario
- Requiere más trabajo manual
- No tiene APIs de tráfico/ETA real
- Requiere servidor de tiles propio para producción

## 3. RECOMENDACIÓN: MAPBOX

### Por qué Mapbox para VIVO:

1. **Costo-beneficio óptimo:** ~$5/mes vs $72/mes de Google
2. **Suficiente para Rosario:** Cobertura adecuada de la ciudad
3. **Escalable:** Precios lineales conforme creces
4. **APIs completas:** Todo lo que necesitamos
5. **React-friendly:** react-map-gl oficial
6. **Migración futura posible:** Arquitectura desacoplada permite cambiar después

### Estrategia de Implementación:

**FASE 1:** Abstraer la capa actual con interfaces
**FASE 2:** Implementar proveedor Mapbox
**FASE 3:** Mantener Nominatim como fallback
**FASE 4:** Agregar componentes visuales de mapa

## 4. ARQUITECTURA PROPUESTA

### 4.1. Capa de Abstracción

```typescript
// src/lib/maps/types.ts
export interface MapProvider {
  geocode(address: string): Promise<GeocodeResult>;
  reverseGeocode(lat: number, lon: number): Promise<GeocodeResult>;
  searchSuggestions(query: string): Promise<Suggestion[]>;
  calculateRoute(origin: Coordinates, destination: Coordinates): Promise<Route>;
  getStaticMapUrl(options: StaticMapOptions): string;
}

export interface Route {
  distance: number; // km
  duration: number; // minutes
  geometry: GeoJSON.LineString;
  steps?: RouteStep[];
}

export interface RouteStep {
  instruction: string;
  distance: number;
  duration: number;
}
```

### 4.2. Implementaciones

```typescript
// src/lib/maps/providers/nominatim.ts
export class NominatimProvider implements MapProvider {
  // Implementación actual migrada aquí
}

// src/lib/maps/providers/mapbox.ts
export class MapboxProvider implements MapProvider {
  // Nueva implementación con Mapbox APIs
}
```

### 4.3. Factory Pattern

```typescript
// src/lib/maps/index.ts
const PROVIDER = import.meta.env.VITE_MAP_PROVIDER || 'nominatim';

export const mapProvider = createMapProvider(PROVIDER);

function createMapProvider(type: string): MapProvider {
  switch (type) {
    case 'mapbox':
      return new MapboxProvider(import.meta.env.VITE_MAPBOX_TOKEN);
    case 'nominatim':
      return new NominatimProvider();
    default:
      return new NominatimProvider();
  }
}
```

### 4.4. Componentes de Mapa

```typescript
// src/components/Map.tsx
// Wrapper agnóstico que usa react-map-gl internamente

// src/components/StaticMap.tsx
// Muestra mapa estático con marcadores

// src/components/InteractiveMap.tsx
// Mapa con drag, zoom, selección de ubicación

// src/components/RouteMap.tsx
// Muestra ruta entre dos puntos

// src/components/LiveTrackingMap.tsx
// Tracking en tiempo real de conductor
```

### 4.5. Servicios Mejorados

```typescript
// src/lib/routing.ts
export async function calculateOptimalRoute(
  origin: Coordinates,
  destination: Coordinates
): Promise<RouteResult> {
  // Usa mapProvider.calculateRoute()
  // Incluye distancia real, tiempo estimado, geometría
}

// src/lib/tracking.ts
export function startTripTracking(tripId: string) {
  // Inicia tracking de ubicación del conductor
  // Actualiza DB en tiempo real
  // Emite eventos para actualizar UI
}
```

## 5. PLAN DE IMPLEMENTACIÓN

### Paso 1: Refactorización sin romper funcionalidad
- Crear estructura de carpetas `src/lib/maps/`
- Definir interfaces `types.ts`
- Migrar código actual a `NominatimProvider`
- Actualizar imports en archivos existentes
- **NO CAMBIAR** funcionalidad, solo estructura

### Paso 2: Implementar MapboxProvider
- Instalar dependencias: `mapbox-gl`, `@mapbox/mapbox-sdk`
- Implementar cada método del interface
- Agregar configuración de API key en `.env`
- Testing con datos de Rosario

### Paso 3: Componentes Básicos de Mapa
- Instalar `react-map-gl`
- Crear `Map.tsx` wrapper básico
- Crear `StaticMap.tsx` para vistas simples
- Integrar en `RequestRide.tsx` (preview de ubicaciones)

### Paso 4: Mejora de Distancias y Rutas
- Actualizar `calculateDistanceKm` para usar rutas reales
- Actualizar `calculateEstimatedDurationMinutes` con datos reales
- Impactar `pricing.ts` con datos más precisos

### Paso 5: Tracking en Tiempo Real
- Implementar servicio de tracking
- Componente `LiveTrackingMap`
- Integrar en `ActiveRide.tsx` (pasajero)
- Integrar en `ActiveTrip.tsx` (conductor)

### Paso 6: Panel Admin
- Mapa de flota en tiempo real
- Heatmap de demanda mejorado con mapa visual
- Monitoreo de viajes activos con mapa

## 6. CONSIDERACIONES TÉCNICAS

### Caché y Optimización
- Mantener caché de geocoding en memoria
- Agregar caché de rutas calculadas (5 min TTL)
- Precalcular rutas entre puntos populares
- Batch de requests cuando sea posible

### Fallback Strategy
- Si Mapbox falla, usar Nominatim
- Si ambos fallan, usar última ubicación conocida
- Logging de fallos para monitoreo

### Performance
- Lazy load de mapas (solo cuando se necesitan)
- Static maps para vistas simples
- Debounce en autocomplete (ya implementado)
- Throttle en tracking updates (1 update cada 5 seg)

### Seguridad
- API keys en variables de entorno
- Restricciones de dominio en Mapbox dashboard
- Rate limiting en nuestro backend
- No exponer keys en client-side (usar proxy si es necesario)

## 7. VARIABLES DE ENTORNO NECESARIAS

```env
# Mapbox
VITE_MAPBOX_TOKEN=pk.eyJ1...
VITE_MAP_PROVIDER=mapbox

# Fallback
VITE_ENABLE_NOMINATIM_FALLBACK=true

# Configuración de área
VITE_SERVICE_AREA_CENTER_LAT=-32.95
VITE_SERVICE_AREA_CENTER_LON=-60.65
VITE_SERVICE_AREA_RADIUS_KM=20
```

## 8. TESTING

### Tests Necesarios
- Unit tests para cada provider
- Integration tests de geocoding
- Tests de cálculo de rutas
- Tests de fallback
- Tests de componentes de mapa
- E2E de flujo completo de solicitud de viaje

## 9. MÉTRICAS DE ÉXITO

### Mejoras Esperadas
- **Precisión de tarifas:** ±5% vs ±30% actual
- **Tiempo de geocoding:** <200ms vs ~500ms actual
- **UX:** Confirmación visual de ubicaciones
- **Tracking:** Visibilidad en tiempo real del conductor
- **Admin:** Dashboard de flota visual

## 10. CRONOGRAMA ESTIMADO

- **Paso 1 (Refactorización):** 2-3 horas
- **Paso 2 (Mapbox Provider):** 3-4 horas
- **Paso 3 (Componentes básicos):** 2-3 horas
- **Paso 4 (Rutas reales):** 1-2 horas
- **Paso 5 (Tracking):** 4-5 horas
- **Paso 6 (Admin):** 2-3 horas

**Total estimado:** 14-20 horas de desarrollo

## DECISIÓN FINAL

**Implementar con Mapbox** siguiendo arquitectura de abstracción para permitir:
- Migración futura a Google Maps si el volumen justifica el costo
- Mantener Nominatim como fallback gratuito
- Cambiar de proveedor sin tocar lógica de negocio
