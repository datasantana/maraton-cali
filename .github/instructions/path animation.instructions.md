# Instrucciones del proyecto — Maratón de Cali

## 1. Descripción general

Aplicación Vue 3 (Options API) que visualiza rutas de carrera sobre Mapbox GL JS con animación de trayecto, perfil de elevación interactivo y controles de reproducción. Datos centralizados en `event.json`; tema claro/oscuro con CSS custom properties.

---

## 2. Convenciones del proyecto

### 2.1 Estructura de archivos

```
src/
  views/          → Vistas conectadas al router (wrappers delgados o orquestadores)
  components/     → Componentes reutilizables de UI
  theme/          → Tokens de diseño, mixin de tema, variables CSS
  utils/          → Funciones puras de utilidad
  assets/         → Datos estáticos (JSON, GeoJSON, CSV, imágenes)
  router/         → Definición de rutas de Vue Router
```

### 2.2 Estructura de composables

```
src/
  composables/              → Composables de dominio (lógica reutilizable)
    useRouteAnimation.js    → Animación del mapa (capas, frame loop, controles)
  theme/
    useTheme.js             → Toggle dark/light, localStorage, cross-tab sync
```

### 2.3 Estilo de componentes

- **API**: Composition API con `<script setup>`. Todos los componentes usan `defineProps`, `defineEmits`, `ref`, `computed`, `watch`, `onMounted`, etc.
- **Nomenclatura de archivos**: PascalCase para componentes (`.vue`), camelCase para utilidades y composables (`.js`).
- **Nomenclatura de componentes**: inferida automáticamente del nombre de archivo por Vue 3 `<script setup>`.
- **Props**: declaradas con `defineProps({ ... })`, siempre tipadas con `type`, `default` y JSDoc cuando el propósito no es obvio.
- **Emits**: declarados con `defineEmits([...])` en `<script setup>`.
- **CSS**: `<style scoped>` en cada componente. Usar variables CSS globales (`var(--xxx)`), nunca colores/tamaños hardcodeados.
- **BEM en CSS**: los componentes nuevos deben seguir BEM (`bloque__elemento--modificador`). Ejemplo: `RaceTitle.vue` ya lo usa (`.race-title__badge--easy`).
- **Composables**: lógica reutilizable se extrae a funciones `use*()` en `src/composables/` o `src/theme/`.

### 2.3 Sistema de temas

- **Fuente de verdad**: `src/theme/tokens.js` define paletas, tipografía y layout.
- **Variables CSS**: `src/theme/variables.css` mapea tokens a custom properties.  
  - `:root` = modo oscuro (default).
  - `.light-theme` = modo claro.
- **Composable**: `src/theme/useTheme.js` provee `isLightTheme` (ref) y `toggleTheme()`.  
  Se importa vía `import { useTheme } from '@/theme'` y se usa así:
  ```js
  const { isLightTheme, toggleTheme } = useTheme();
  ```
- **Regla**: todo color, radio y fuente debe referenciarse como `var(--token)` en CSS. Para uso en JS (ej. Mapbox paint), importar `tokens` directamente.

### 2.4 Datos y assets

- **`event.json`**: configuración centralizada del evento (ciudad, fecha, array de rutas con `id`, `name`, `distance`, `difficulty`, `type`, `description`, `duration`, `zoom`).
- **Convención de archivos de ruta**:
  - `assets/routes/{id}.geojson` — GeoJSON con LineString (recorrido) + Points (waypoints).
  - `assets/elevation/{id}.csv` — Perfil de elevación (columnas: `lat, lon, ele, time, segment_distance_km, distance_km_cum, segment_time_s, elev_delta_m, elev_gain_pos_m, elev_gain_pos_cum_m, slope_percent`).
  - `assets/marks/{id}.json` — Marcas legacy (solo rutas con `legacy: true`).
- **Agregar nueva ruta**: añadir entrada en `event.json` → colocar `.geojson` y `.csv` en las carpetas correspondientes.

### 2.5 Variables de entorno

Prefijo `VITE_` (requisito Vite). Definidas en `.env`:

| Variable | Descripción |
|---|---|
| `VITE_MAPBOX_ACCESS_TOKEN` | Token de Mapbox |
| `VITE_MAPBOX_STYLE` | URL del estilo del mapa |
| `VITE_MAPBOX_CENTER_LNG` | Longitud del centro del mapa |
| `VITE_MAPBOX_CENTER_LAT` | Latitud del centro del mapa |

### 2.6 Importaciones y alias

- Usar `@/` como alias de `src/` (configurado en `jsconfig.json` y `vite.config.js`).
- Imports dinámicos con `import()` para lazy-loading de vistas y assets.
- Archivos `.csv` se importan con sufijo `?raw` para obtener texto plano.
- Archivos `.geojson` se transforman a módulos JSON mediante plugin custom en `vite.config.js`.

---

## 3. Patrones de código

### 3.1 Comunicación padre-hijo

- **Props down, events up**: el padre (`RouteMapView`) es la única fuente de verdad del estado compartido (`progress`, `isPlaying`, `currentSpeed`).
- Hijos emiten eventos (`update:progress`, `toggle-play`, `speed-change`); el padre actualiza su `data` y los hijos reciben las actualizaciones por props.

### 3.2 Animación del mapa

La animación se encapsula en el composable `useRouteAnimation(props, emit)` en `src/composables/useRouteAnimation.js`:

- Retorna `{ setup }` — función que recibe la instancia de `mapboxgl.Map` una vez cargada.
- `frame()` — loop de `requestAnimationFrame` que calcula la fase de animación.
- `updateDisplay(phase, moveCamera)` — actualiza posición del marcador, gradiente de la línea y cámara.
- `_togglePause(playing)`, `_seekToPhase(targetPhase)`, `_setSpeed(newSpeed)` — closures internas conectadas a watchers de props.

**Importante**: estas closures capturan variables locales (`startTime`, `isPaused`, `speed`, etc.) para evitar reactividad innecesaria de Vue. Los watchers en el composable referencian las closures mediante variables mutables del scope de `useRouteAnimation`.

### 3.3 Perfil de elevación

- `parseElevationCsv()` convierte CSV raw a array de objetos tipados.
- `PlayBack.vue` usa binary search (`_findNearestPoint`) para localizar el punto del perfil según la distancia actual.
- El SVG polyline se genera en el computed `elevationPoints`, downsampleando a ~150 puntos.

---

## 4. Instrucciones para refactorización y homogeneización

### 4.1 Migrar de Vue CLI a Vite — ✅ COMPLETADO

Migración realizada. Stack actual: **Vite 6** + `@vitejs/plugin-vue 5`. Archivos eliminados: `vue.config.js`, `babel.config.js`. Variables de entorno con prefijo `VITE_`, accedidas vía `import.meta.env.*`. Scripts: `npm run dev`, `npm run build`, `npm run preview`.

### 4.2 Migrar a Composition API — ✅ COMPLETADO

Migración realizada. Todos los componentes usan `<script setup>` (Composition API):

1. ✅ `themeMixin.js` → `useTheme.js` (composable con `ref`, `watch`, `onMounted`).
2. ✅ Componentes migrados: `App` → `RaceTitle` → `PlayBack` → `EventHome` → `RouteMap` → `RouteMapView` → `HomeView` → `AboutView`.
3. ✅ `mixins: [themeMixin]` reemplazado por `const { isLightTheme, toggleTheme } = useTheme()` en componentes que lo necesitan (`App.vue`, `EventHome.vue`).
4. ✅ Closures de animación extraídos a `src/composables/useRouteAnimation.js` — composable `useRouteAnimation(props, emit)` que retorna `{ setup(map) }`.

Archivos nuevos: `src/theme/useTheme.js`, `src/composables/useRouteAnimation.js`.  
Archivo legacy conservado: `src/theme/themeMixin.js` (ya no se importa).

### 4.3 Eliminar duplicación de tokens (prioridad alta)

Actualmente `tokens.js` y `variables.css` definen los mismos valores por separado:

1. Generar `variables.css` automáticamente desde `tokens.js` con un script de build (ej. `scripts/generate-css-vars.js`).
2. O bien considerar CSS-in-JS con una función `tokensToCSS()` invocada en build time.
3. Mientras se implementa, **cualquier cambio de color/fuente/layout debe hacerse en ambos archivos simultáneamente**; verificar coherencia.

### 4.4 Homogeneizar CSS (prioridad alta)

- **BEM**: `RaceTitle.vue` usa BEM; `PlayBack.vue`, `EventHome.vue` y `RouteMap.vue` no.
  - Renombrar clases en `PlayBack.vue`: `playback-bar` → `playback`, botones → `playback__play-btn`, `playback__speed-btn`, stats → `playback__stat`, etc.
  - Renombrar clases en `EventHome.vue`: `.header` → `.event-home__header`, `.hero` → `.event-home__hero`, `.route-card` → `.event-home__card`, etc.
- **Scoped styles**: verificar que todos los componentes usen `<style scoped>`. `RouteMap.vue` ya lo tiene.
- **Evitar magic numbers**: extraer a custom properties o constantes de tokens valores como `padding: 24px`, `z-index: 1000`, `width: 120px`, etc.

### 4.5 Extraer SVG inline a componentes icon (prioridad baja)

`EventHome.vue` y `PlayBack.vue` contienen SVG inline repetidos (calendar, play, pause, map, sun/moon):

1. Crear carpeta `src/components/icons/` con componentes de icono (`IconPlay.vue`, `IconPause.vue`, `IconCalendar.vue`, etc.).
2. Cada componente acepta props `size` y `color` (default `currentColor`).
3. Reemplazar el SVG inline por `<IconPlay />`.

### 4.6 Centralizar la configuración de Mapbox (prioridad media)

La configuración de Mapbox se lee de `process.env` en múltiples lugares (`RouteMap.vue`, `EventHome.vue`):

1. Crear `src/config/mapbox.js` que exporte un objeto con `accessToken`, `style`, `center`, `zoom`, `pitch`.
2. Importar ese objeto en lugar de leer `process.env` directamente en cada componente.

### 4.7 Limpieza de código existente (prioridad alta)

- **`RouteMap.vue` (~650 líneas)**: dividir en:
  - `useRouteAnimation.js` — composable de animación.
  - `useMapLayers.js` — configuración de sources y layers de Mapbox.
  - `useMarkers.js` — sistema de marcas (actualmente inactivo).
  - El componente queda como orquestador que llama a los composables.
- **`PlayBack.vue` (~550 líneas)**: separar:
  - Lógica de scrub → `useScrub.js`.
  - Estadísticas computadas → `usePlaybackStats.js`.
  - Template: extraer el mini gráfico de elevación a un subcomponente `ElevationChart.vue`.
- **`EventHome.vue` (~500 líneas)**: CSS ocupa más del 60%. Evaluar extraer secciones a subcomponentes (`HeroSection.vue`, `RouteCard.vue`, `EventFooter.vue`).

### 4.8 Mejoras al manejo de errores y loading (prioridad media)

- `RouteMapView` ya tiene `loading` y `error`, pero no hay componentes dedicados.
- Crear componentes `LoadingSpinner.vue` y `ErrorMessage.vue` reutilizables.
- Añadir boundary de errores a nivel de vista.

### 4.9 Testing (prioridad baja)

- Actualmente no hay tests. Agregar:
  - Unit tests para `parseElevationCsv`, `_findNearestPoint`, token generation.
  - Tests de componente para `PlayBack` (emit events), `RaceTitle` (render de props).
  - Configurar Vitest o Jest + `@vue/test-utils`.

---

## 5. Reglas para contribuir

1. **No hardcodear colores ni tamaños**: usar siempre `var(--token)` en CSS o importar `tokens` en JS.
2. **No duplicar estado**: la fuente de verdad del playback está en `RouteMapView`; nunca mantener estado duplicado en hijos.
3. **Lazy-load assets pesados**: usar `import()` dinámico con `webpackChunkName` para GeoJSON, CSVs y vistas.
4. **Comentar closures complejas**: las funciones de animación en `RouteMap` deben documentar qué variables capturan y por qué.
5. **Mantener event.json actualizado**: toda ruta nueva requiere su entrada aquí con todos los campos requeridos (`id`, `name`, `distance`, `distanceUnit`, `difficulty`, `type`, `description`, `duration`, `zoom`).
6. **Probar ambos temas**: verificar que los cambios visuales funcionen en dark y light mode.
7. **Responsive**: verificar en mobile (≤768px) y tablet (≤1024px).
8. **Actualizar documentación ante cambios arquitectónicos**: cualquier refactorización que implique rediseño de arquitectura (mover/renombrar carpetas, cambiar flujo de datos), creación de nuevos componentes o composables, o incorporación de nuevas librerías/herramientas, **debe incluir obligatoriamente** la actualización de:
   - **Este archivo** (`.github/instructions/path animation.instructions.md`): actualizar secciones de arquitectura, convenciones, patrones y plan de refactorización según corresponda.
   - **`README.md`**: actualizar diagrama de arquitectura, stack tecnológico, comandos y cualquier sección afectada.
   - La PR/commit no se considera completa hasta que ambos archivos reflejen el estado actual del proyecto.
