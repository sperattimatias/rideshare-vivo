# Configuración de OpenStreetMap (OSM)

## Estado Actual

La plataforma VIVO ahora tiene **soporte completo para mapas reales usando OpenStreetMap**, completamente **gratuito y sin necesidad de API keys**.

## Características Implementadas

### 1. Mapas Reales con Leaflet
- Librería Leaflet integrada para renderizado de mapas OSM
- Tiles de OpenStreetMap cargados directamente desde servidores públicos
- Visualización de calles, rutas y ubicaciones reales

### 2. Marcadores Personalizados
- **Conductores**: Marcadores azules (disponibles) o verdes (en viaje)
- **Pasajeros esperando**: Marcadores naranjas con alerta si esperan más de 2 minutos
- Popups informativos al hacer clic en cada marcador

### 3. Actualización en Tiempo Real
- Los marcadores se actualizan automáticamente cada 5 segundos
- Suscripción a cambios de base de datos en tiempo real vía Supabase
- Centro del mapa se ajusta automáticamente según la ubicación de conductores y viajes

### 4. Toggle entre Mapas
El sistema permite elegir entre dos tipos de mapa:

#### Mapa Simple (por defecto)
- Vista tipo "radar" con grilla
- Ligero y rápido
- Ideal para visualización básica

#### Mapa Real OpenStreetMap
- Calles y rutas visibles
- Navegación completa (zoom, pan)
- Marcadores interactivos
- Datos geográficos precisos

## Dónde Usar el Mapa Real

Los mapas de OpenStreetMap están integrados en **todas las vistas críticas** de la plataforma:

### Panel Administrativo

#### 1. Dashboard Operacional
**Ruta**: `/admin/dashboard` → "Operaciones"
- Mapa en vivo con conductores y pasajeros esperando
- Toggle para cambiar entre mapa simple y OSM
- Actualización automática cada 5 segundos

#### 2. Monitoreo de Viajes
**Ruta**: `/admin/dashboard` → "Monitoreo de Viajes"
- Vista de todos los viajes activos en el mapa
- Toggle para cambiar entre mapa simple y OSM

#### 3. Radar de Demanda
**Ruta**: `/admin/dashboard` → "Radar de Demanda"
- Mapa de demanda en tiempo real
- Visualización de zonas calientes
- Toggle para cambiar entre mapa simple y OSM

### Lado Pasajero

#### 1. Solicitar Viaje
**Ruta**: Panel de pasajero → "Solicitar Viaje"
- Vista previa de la ruta con origen (A) y destino (B)
- Toggle para ver en mapa simple o real
- Muestra la ruta antes de confirmar el viaje

#### 2. Viaje Activo
**Ruta**: Panel de pasajero → "Viaje Activo"
- Mapa del viaje en curso
- Puntos de origen y destino
- Toggle para cambiar entre mapa simple y OSM

### Lado Conductor

#### 1. Viaje Activo
**Ruta**: Panel de conductor → "Viaje Activo"
- Mapa del viaje con origen y destino
- Visualización de la ruta a seguir
- Toggle para cambiar entre mapa simple y OSM

## Componentes Creados

### `LeafletMap.tsx`
Componente de mapa en vivo que renderiza conductores y pasajeros en tiempo real.

**Props**:
- `className`: Clases CSS personalizadas
- `center`: Coordenadas del centro inicial `{ lat, lon }`
- `zoom`: Nivel de zoom inicial (default: 13)

**Características**:
- Carga dinámica de Leaflet
- Gestión de marcadores con Map
- Integración con base de datos Supabase
- Popups informativos
- Actualización en tiempo real de posiciones
- Marcadores personalizados para conductores (azul/verde) y pasajeros (naranja)

### `StaticMapLeaflet.tsx`
Componente de mapa estático para mostrar rutas entre dos puntos.

**Props**:
- `center`: Centro del mapa `{ lat, lon }`
- `zoom`: Nivel de zoom (default: 13)
- `markers`: Array de marcadores con coordenadas, label y color
- `path`: Array de coordenadas para dibujar la ruta
- `className`: Clases CSS personalizadas
- `height`: Altura del mapa (default: '300px')

**Características**:
- Muestra origen y destino con marcadores A y B
- Dibuja línea de ruta entre puntos
- Ajusta automáticamente el bounds para mostrar todos los puntos
- Ideal para vista previa de viajes

## Comparación: OSM vs Otros Proveedores

### OpenStreetMap (Implementado)
- ✅ **Gratuito** y sin límites
- ✅ **Sin API keys** requeridas
- ✅ Datos actualizados por la comunidad
- ✅ Ideal para producción
- ⚠️ Requiere respetar política de uso justo

### Mapbox (Preparado en `/src/lib/maps/providers/mapbox.ts`)
- ⚠️ Requiere API key
- ✅ Estilos personalizados avanzados
- ✅ 50,000 cargas de mapa gratis/mes
- 💰 Luego pago por uso

### Google Maps (Preparado en config)
- ⚠️ Requiere API key
- ⚠️ Requiere tarjeta de crédito
- ✅ $200 USD de crédito mensual
- 💰 Luego pago por uso

## Geocodificación

El sistema usa **Nominatim** (servicio de geocodificación de OSM) para convertir direcciones en coordenadas:

- Búsqueda de direcciones en español
- Autocompletado de direcciones
- Geocodificación inversa (coordenadas → dirección)
- Cache de resultados (1 hora)
- Límites geográficos configurados para Rosario, Argentina

## Próximos Pasos Opcionales

Si querés mejorar aún más los mapas, podés:

1. **Configurar Mapbox** para estilos personalizados
2. **Agregar rutas optimizadas** entre origen y destino
3. **Implementar mapas estáticos** para imágenes/recibos
4. **Agregar geocerca** para zonas de servicio

## Notas Técnicas

- Leaflet se carga dinámicamente para optimizar el bundle
- Los estilos CSS están en `/src/index.css`
- El proveedor Nominatim respeta límites de uso justo (1 req/segundo)
- Cache implementado para reducir llamadas a servicios externos

## Soporte

Para más información sobre OpenStreetMap:
- Documentación: https://wiki.openstreetmap.org
- Leaflet: https://leafletjs.com
- Nominatim: https://nominatim.org
