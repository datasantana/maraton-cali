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
  config/         → Configuración centralizada (Mapbox, etc.)
  theme/          → Tokens de diseño, mixin de tema, variables CSS
  utils/          → Funciones puras de utilidad
  composables/    → Composables de dominio (lógica reutilizable)
  assets/         → Datos estáticos (JSON, GeoJSON, CSV, imágenes)
  router/         → Definición de rutas de Vue Router
```

### 2.2 Estructura de composables

```
src/
  config/
    mapbox.js               → Configuración centralizada de Mapbox (token, style, center, zoom, pitch)
  composables/              → Composables de dominio (lógica reutilizable)
    useRouteAnimation.js    → Animación del mapa (capas, frame loop, controles)
  theme/
    useTheme.js             → Toggle dark/light, localStorage, cross-tab sync
    tokensToCSS.js          → Generador: tokens.js → CSS custom properties
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

- **Fuente de verdad**: `src/theme/tokens.js` define paletas, tipografía, layout y transiciones.
- **Variables CSS**: `src/theme/variables.css` es un shell; su contenido se genera automáticamente desde `tokens.js` por el Vite plugin `cssTokensPlugin` (vía `src/theme/tokensToCSS.js`).  
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

### 4.3 Eliminar duplicación de tokens (prioridad alta) — ✅ COMPLETADO

Duplicación eliminada. `tokens.js` es la única fuente de verdad:

1. ✅ Creado `src/theme/tokensToCSS.js` — función pura `tokensToCSS(tokens)` que genera el CSS completo (reset + `:root` dark + `.light-theme`).
2. ✅ Añadido Vite plugin `cssTokensPlugin` en `vite.config.js` que intercepta la carga de `variables.css` y retorna el CSS generado desde `tokens.js`.
3. ✅ `variables.css` reducido a shell con comentario; su contenido real se genera en build/dev time.
4. ✅ Tokens nuevos añadidos a `tokens.js`: `colors.light.accentDark` (override claro) y `transitions.theme`.

Archivos nuevos: `src/theme/tokensToCSS.js`.  
Archivos modificados: `tokens.js`, `variables.css`, `vite.config.js`.  
**Nota**: cambios en `tokens.js` requieren reiniciar el dev server.

### 4.4 Homogeneizar CSS (prioridad alta) — ✅ COMPLETADO

Homogeneización realizada:

1. ✅ `PlayBack.vue` migrado a BEM: `.playback-bar` → `.playback`, `.play-pause-btn` → `.playback__play-btn`, `.speed-btn` → `.playback__speed-btn`, `.stats-group` → `.playback__stats`, `.stat` → `.playback__stat`, etc.
2. ✅ `EventHome.vue` migrado a BEM: `.header` → `.event-home__header`, `.hero` → `.event-home__hero`, `.route-card` → `.event-home__card`, `.badge` → `.event-home__badge`, `.footer` → `.event-home__footer`, etc.
3. ✅ Todos los componentes verificados con `<style scoped>`.
4. ✅ Magic numbers extraídos a tokens: `z-index: 1000` → `var(--z-overlay)`, `z-index: 100` → `var(--z-header)`, `bottom: 24px` / `top: 24px` / `left: 24px` → `var(--spacing-overlay-bottom)`. Hardcoded colors en `RouteMapView.vue` reemplazados por variables CSS.

Tokens añadidos a `tokens.js`: `layout.zIndexOverlay`, `layout.zIndexHeader`, `layout.spacingOverlayBottom`.  
Archivos modificados: `PlayBack.vue`, `EventHome.vue`, `RaceTitle.vue`, `RouteMapView.vue`, `tokens.js`, `tokensToCSS.js`.

### 4.5 Extraer SVG inline a componentes icon (prioridad baja) — ✅ COMPLETADO

Extracción realizada:

1. ✅ Creada carpeta `src/components/icons/` con 6 componentes: `IconPlay.vue`, `IconPause.vue`, `IconMoon.vue`, `IconSun.vue`, `IconCalendar.vue`, `IconMap.vue`.
2. ✅ Cada componente acepta props `size` (default 24) y `color` (default `currentColor`).
3. ✅ SVG inline reemplazados en `PlayBack.vue` (play/pause) y `EventHome.vue` (moon/sun, calendar, map).

Archivos nuevos: `src/components/icons/Icon{Play,Pause,Moon,Sun,Calendar,Map}.vue`.  
Archivos modificados: `PlayBack.vue`, `EventHome.vue`.

### 4.6 Centralizar la configuración de Mapbox (prioridad media) — ✅ COMPLETADO

Configuración centralizada. `src/config/mapbox.js` es la única fuente de lectura de variables de entorno Mapbox:

1. ✅ Creado `src/config/mapbox.js` — exporta `mapboxConfig` (objeto congelado con `accessToken`, `style`, `center`, `zoom`, `pitch`), `staticMapStyle` y helper `staticMapStylePath()`.
2. ✅ `RouteMap.vue` actualizado: importa `mapboxConfig` en lugar de leer `import.meta.env` directamente.
3. ✅ `EventHome.vue` actualizado: importa `mapboxConfig` y `staticMapStylePath` en lugar de duplicar lecturas de env.

Archivos nuevos: `src/config/mapbox.js`.  
Archivos modificados: `RouteMap.vue`, `EventHome.vue`.

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
