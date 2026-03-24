# Arquitectura de Geocodificación VIVO

## Estado Actual (Beta Funcional)

El sistema de geocodificación ha sido mejorado para soportar una beta funcional real, sin simulaciones ni datos falsos.

### Componentes Implementados

#### 1. Servicio de Geocodificación (`src/lib/geocoding.ts`)

**Proveedor actual:** Nominatim (OpenStreetMap)
- Servicio gratuito y de código abierto
- No requiere API keys
- Cobertura global con datos de calidad variable según región

**Características:**
- Búsqueda de direcciones en tiempo real
- Restricción geográfica a Rosario, Santa Fe, Argentina
- Sistema de caché (1 hora de duración)
- Validación de coordenadas dentro del área de servicio
- Sugerencias múltiples de direcciones

**Límites de Rosario configurados:**
```typescript
const ROSARIO_BOUNDS = {
  minLat: -33.1,
  maxLat: -32.8,
  minLon: -60.9,
  maxLon: -60.5
};
```

#### 2. Componente de Autocompletado (`src/components/AddressAutocomplete.tsx`)

**Funcionalidad:**
- Búsqueda con debounce (500ms)
- Dropdown de sugerencias en tiempo real
- Indicadores visuales de estado (loading, confirmado)
- Selección de direcciones desde sugerencias

**UX:**
- Mínimo 3 caracteres para activar búsqueda
- Cierre automático al hacer click fuera
- Feedback visual inmediato

#### 3. Flujo de Solicitud de Viaje Mejorado (`src/pages/passenger/RequestRide.tsx`)

**Cambios principales:**
- Eliminado el botón manual de geocodificación
- Autocompletado automático mientras se escribe
- Cálculo automático de tarifa al seleccionar ambas direcciones
- Validación robusta antes de envío

### Arquitectura Técnica

```
┌─────────────────────────────────────────────┐
│         RequestRide Component               │
│  (Usuario ingresa direcciones)              │
└──────────────┬──────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────┐
│      AddressAutocomplete Component          │
│  - Debounce de entrada (500ms)              │
│  - Llamada a searchAddressSuggestions       │
└──────────────┬──────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────┐
│         geocoding.ts Service                │
│  - Normalización de query                   │
│  - Verificación de caché                    │
│  - Llamada a Nominatim API                  │
│  - Filtrado por bounds de Rosario           │
│  - Almacenamiento en caché                  │
└──────────────┬──────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────┐
│         Nominatim API (OSM)                 │
│  - Geocodificación real                     │
│  - Búsqueda por nombre de lugar             │
│  - Retorno de coordenadas + metadata        │
└─────────────────────────────────────────────┘
```

### Sistema de Caché

**Propósito:**
- Reducir llamadas a Nominatim (límite de tasa: ~1 request/segundo)
- Mejorar velocidad de respuesta para búsquedas repetidas
- Reducir carga en servidor externo

**Implementación:**
- Map en memoria con key normalizado (lowercase, sin acentos)
- Expiración automática después de 1 hora
- Se reutiliza para suggestions y geocoding completo

### Validaciones Implementadas

1. **Entrada mínima:** 3 caracteres antes de buscar
2. **Área geográfica:** Solo coordenadas dentro de bounds de Rosario
3. **Coordenadas válidas:** Verificación de rango lat/lon
4. **Selección obligatoria:** Usuario debe seleccionar una sugerencia

### Limitaciones Actuales

#### 1. Cobertura de Direcciones
- Nominatim tiene cobertura variable de calles de Rosario
- Algunas direcciones nuevas o menores pueden no aparecer
- Formato de dirección puede variar

#### 2. Rendimiento
- Límite de tasa de Nominatim (1 req/seg)
- Latencia de API externa (200-500ms)
- Sin geocodificación inversa implementada

#### 3. Precisión
- Coordenadas aproximadas en algunos casos
- Sin snap-to-road o ajuste de rutas
- No considera direccionalidad de calles

#### 4. Experiencia de Usuario
- No hay mapa visual para confirmar ubicación
- No hay pin draggable para ajustar posición
- Sin ubicación GPS del dispositivo

## Próximos Pasos para Producción Completa

### Fase 1: Integración de Proveedor Premium

**Opciones recomendadas:**
1. **Google Maps Platform**
   - Places Autocomplete API
   - Geocoding API
   - Roads API (snap to road)
   - Mejor cobertura de Argentina

2. **Mapbox**
   - Geocoding API
   - Más económico que Google
   - Buena cobertura LATAM

3. **HERE Maps**
   - Geocoding & Search API
   - Precios competitivos
   - Buena cobertura global

**Cambios necesarios:**
```typescript
// Crear adaptador de servicio
interface GeocodingProvider {
  search(query: string): Promise<GeocodeResult>;
  reverse(lat: number, lon: number): Promise<GeocodeResult>;
}

class NominatimProvider implements GeocodingProvider { ... }
class GoogleMapsProvider implements GeocodingProvider { ... }
class MapboxProvider implements GeocodingProvider { ... }

// Configurar provider desde env
const geocodingProvider = createProvider(
  process.env.GEOCODING_PROVIDER || 'nominatim'
);
```

### Fase 2: Componente de Mapa Interactivo

**Funcionalidades:**
- Mapa con pin draggable
- Geocodificación inversa al mover pin
- Visualización de ruta estimada
- Confirmación visual de ubicaciones

**Implementación sugerida:**
```typescript
// Componente MapSelector
<MapSelector
  initialPosition={coordinates}
  onPositionChange={(coords) => reverseGeocode(coords)}
  showRoute={originCoords && destinationCoords}
/>
```

### Fase 3: Geolocalización del Dispositivo

**Funcionalidades:**
- Botón "Usar mi ubicación actual"
- Geocodificación inversa automática
- Permisos de ubicación del navegador

### Fase 4: Optimizaciones Avanzadas

1. **Server-Side Caching**
   - Mover caché a Redis/base de datos
   - Compartir entre usuarios
   - Caché persistente

2. **Geocodificación Batch**
   - Pre-geocodificar direcciones comunes
   - Base de datos de lugares populares de Rosario
   - Reducir llamadas a API

3. **Validación de Direcciones**
   - Verificar que dirección es accesible en auto
   - Restricciones de zonas (peatonales, etc.)
   - Alertas de zonas conflictivas

4. **Analytics y Mejora Continua**
   - Tracking de búsquedas fallidas
   - Aprendizaje de direcciones comunes
   - Mejora de sugerencias basada en uso

## Migración a Proveedor Premium

### Checklist de Migración

- [ ] Seleccionar proveedor (Google Maps / Mapbox / HERE)
- [ ] Configurar cuenta y obtener API keys
- [ ] Crear adaptador para nuevo proveedor
- [ ] Implementar fallback a Nominatim
- [ ] Agregar variables de entorno
- [ ] Configurar límites de uso y alertas
- [ ] Migrar componente de autocompletado
- [ ] Agregar componente de mapa
- [ ] Implementar geocodificación inversa
- [ ] Testing exhaustivo en Rosario
- [ ] Configurar monitoreo de costos
- [ ] Documentar uso y límites

### Estructura de Código Preparada

El código actual ya está estructurado para facilitar la migración:

1. **Interfaces bien definidas:** `GeocodeResult`, `Coordinates`
2. **Separación de concerns:** Servicio vs Componentes vs UI
3. **Sistema de caché reutilizable**
4. **Validaciones desacopladas**

Solo se necesita:
- Implementar nuevo provider
- Actualizar llamadas en `geocoding.ts`
- Agregar configuración de API keys
- El resto del sistema sigue igual

## Conclusión

El sistema actual es **funcional para beta** con usuarios reales en Rosario. Usa geocodificación real sin simulaciones, maneja errores apropiadamente, y provee una experiencia de usuario aceptable.

Para producción completa, se recomienda migrar a Google Maps o Mapbox y agregar componentes de mapa interactivo.
