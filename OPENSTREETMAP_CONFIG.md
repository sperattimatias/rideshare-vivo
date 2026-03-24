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

### Panel Administrativo - Operaciones
**Ruta**: `/admin/dashboard` → "Operaciones"

En el dashboard operacional hay un botón "Mapa Real (OSM)" que permite cambiar entre:
- Mapa Simple
- Mapa Real (OSM)

## Componentes Creados

### `LeafletMap.tsx`
Componente principal que renderiza el mapa de OpenStreetMap usando Leaflet.

**Props**:
- `className`: Clases CSS personalizadas
- `center`: Coordenadas del centro inicial `{ lat, lon }`
- `zoom`: Nivel de zoom inicial (default: 13)

**Características**:
- Carga dinámica de Leaflet
- Gestión de marcadores con Map
- Integración con base de datos Supabase
- Popups informativos

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
