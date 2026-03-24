# Configuración de Mapbox para VIVO

## Estado Actual

✅ Mapbox configurado como proveedor de mapas
⏳ Falta agregar token de Mapbox

## Cómo Obtener y Configurar Token de Mapbox

### Paso 1: Crear Cuenta y Obtener Token

1. Ir a https://account.mapbox.com/auth/signup/
2. Crear cuenta (gratuita)
3. Confirmar email
4. Ir a https://account.mapbox.com/access-tokens/
5. Click en "Create a token" o usar el Default Public Token
6. El token debe empezar con `pk.` (public key)

### Paso 2: Configurar Token en VIVO

Editar el archivo `.env` y agregar tu token:

```env
VITE_MAP_PROVIDER=mapbox
VITE_MAPBOX_TOKEN=pk.eyJ1Ijoic29tZXVzZXIiLCJhIjoiY20zNjhobm1hMDI1NTJ...
```

### Paso 3: Configurar Restricciones de Seguridad (Recomendado)

En el Dashboard de Mapbox (https://account.mapbox.com/access-tokens/):

1. Click en tu token
2. Agregar "URL restrictions":
   - Para desarrollo: `http://localhost:*`
   - Para producción: `https://tu-dominio.com`
3. Configurar "Rate limits" (opcional):
   - Requests per minute: 600 (suficiente para inicio)
   - Requests per day: 50,000 (dentro del free tier)

### Paso 4: Reiniciar Servidor

```bash
npm run dev
```

## Funcionalidades Habilitadas con Mapbox

### 1. Geocodificación Mejorada
- Autocompletado más preciso
- Cobertura completa de Rosario
- Resultados ordenados por relevancia

### 2. Rutas Reales
- Distancia basada en red de calles
- Considera tipo de vías
- ETA basado en tráfico histórico
- 20-40% más preciso que línea recta

### 3. Mapas Visuales
- Vista previa estática en solicitud de viaje
- Marcadores de origen/destino
- Línea de ruta
- Zoom y centrado automático

### 4. Reverse Geocoding
- Convertir coordenadas a direcciones
- Útil para "Usar mi ubicación"
- Precisión alta en Rosario

## Costos y Límites

### Free Tier (Suficiente para MVP)
- **50,000 map loads/mes:** GRATIS
- **100,000 geocoding requests/mes:** GRATIS
- **100,000 directions requests/mes:** GRATIS

### Estimación para VIVO

**100 viajes/día (3,000/mes):**
- Geocoding: ~6,000 requests = GRATIS
- Directions: ~3,000 requests = GRATIS
- Map loads: ~30,000 loads = GRATIS
- **Costo total: $0/mes**

**1,000 viajes/día (30,000/mes):**
- Geocoding: ~60,000 requests = GRATIS
- Directions: ~30,000 requests = GRATIS
- Map loads: ~300,000 loads = $1.25/mes
- **Costo total: ~$1.25/mes**

**5,000 viajes/día (150,000/mes):**
- Geocoding: ~300,000 requests = $1/mes
- Directions: ~150,000 requests = $0.25/mes
- Map loads: ~1,500,000 loads = $7.25/mes
- **Costo total: ~$8.50/mes**

### Pricing por Servicio (después de free tier)
- Geocoding: $0.50 per 1,000 requests
- Directions: $0.50 per 1,000 requests
- Map loads: $0.50 per 1,000 loads

## Verificación Post-Configuración

### Checklist

1. ✅ Variable `VITE_MAP_PROVIDER=mapbox` en `.env`
2. ⏳ Variable `VITE_MAPBOX_TOKEN=pk.xxx` con tu token
3. ⏳ Servidor reiniciado después de agregar token
4. ⏳ Probar autocompletado de direcciones
5. ⏳ Verificar vista previa de mapa en RequestRide
6. ⏳ Confirmar cálculo de distancia y ETA

### Pruebas Recomendadas

**En Solicitar Viaje (Pasajero):**
1. Escribir "Oroño" → Debería mostrar sugerencias de calle Oroño
2. Seleccionar origen y destino
3. Verificar que aparece mapa estático con marcadores
4. Confirmar que distancia es realista (no línea recta)

**Comparación Antes/Después:**
- Antes: "5.2 km" (línea recta)
- Después: "7.4 km" (ruta real por calles)
- Diferencia esperada: 20-40% más

## Troubleshooting

### "Vista previa de mapa no disponible"
- Verificar que `VITE_MAPBOX_TOKEN` está configurado
- Confirmar que el token empieza con `pk.`
- Reiniciar servidor después de agregar token

### "No se encontraron resultados"
- Normal para direcciones muy específicas
- Probar con nombres de calles principales
- Verificar que estás buscando en Rosario

### Errores 401 (Unauthorized)
- Token inválido o expirado
- Generar nuevo token en Mapbox
- Verificar restricciones de URL

### Errores 429 (Too Many Requests)
- Excediste rate limits
- Verificar uso en Dashboard de Mapbox
- Considerar aumentar límites o agregar caché

## Fallback a Nominatim

Si hay problemas con Mapbox, podés volver a Nominatim:

```env
VITE_MAP_PROVIDER=nominatim
# VITE_MAPBOX_TOKEN=pk.xxx (comentar)
```

La app sigue funcionando, pero sin:
- Mapas visuales
- Rutas reales (vuelve a línea recta)
- Autocompletado mejorado

## Monitoreo de Uso

### Dashboard de Mapbox
- https://account.mapbox.com/statistics/
- Muestra requests por día/mes
- Gráficos de uso por servicio
- Proyección de costos

### Alertas Recomendadas
1. Email cuando llegues a 75% del free tier
2. Email cuando excedas free tier
3. Límite diario para evitar costos excesivos

## Próximos Pasos

Una vez configurado Mapbox:

1. ✅ Funcionalidad básica funcionando
2. 🔄 Probar con usuarios beta
3. 📊 Monitorear uso y costos
4. 🚀 Considerar mapas interactivos (Fase 2)
5. 📍 Agregar tracking en tiempo real (Fase 3)

## Documentación Adicional

- Mapbox Docs: https://docs.mapbox.com/
- Geocoding API: https://docs.mapbox.com/api/search/geocoding/
- Directions API: https://docs.mapbox.com/api/navigation/directions/
- Static Images API: https://docs.mapbox.com/api/maps/static-images/

## Soporte

- Docs de integración: `MAPS_INTEGRATION_IMPLEMENTATION.md`
- Plan completo: `MAPS_INTEGRATION_PLAN.md`
- Arquitectura: Ver código en `src/lib/maps/`
