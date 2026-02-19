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

### 2.2 Estilo de componentes

- **API**: Options API (no Composition API). Todos los componentes usan `export default { name, props, data, computed, methods, watch, ... }`.
- **Nomenclatura de archivos**: PascalCase para componentes (`.vue`), camelCase para utilidades (`.js`).
- **Nomenclatura de componentes**: la propiedad `name` debe coincidir con el nombre del archivo.
- **Props**: siempre tipadas con `type`, `default` y JSDoc cuando el propósito no es obvio.
- **Emits**: declarar en el array `emits` del componente.
- **CSS**: `<style scoped>` en cada componente. Usar variables CSS globales (`var(--xxx)`), nunca colores/tamaños hardcodeados.
- **BEM en CSS**: los componentes nuevos deben seguir BEM (`bloque__elemento--modificador`). Ejemplo: `RaceTitle.vue` ya lo usa (`.race-title__badge--easy`).

### 2.3 Sistema de temas

- **Fuente de verdad**: `src/theme/tokens.js` define paletas, tipografía y layout.
- **Variables CSS**: `src/theme/variables.css` mapea tokens a custom properties.  
  - `:root` = modo oscuro (default).
  - `.light-theme` = modo claro.
- **Mixin**: `src/theme/themeMixin.js` provee `isLightTheme` y `toggleTheme()`.  
  Se importa vía `import { themeMixin } from '@/theme'`.
- **Regla**: todo color, radio y fuente debe referenciarse como `var(--token)` en CSS. Para uso en JS (ej. Mapbox paint), importar `tokens` directamente.

### 2.4 Datos y assets

- **`event.json`**: configuración centralizada del evento (ciudad, fecha, array de rutas con `id`, `name`, `distance`, `difficulty`, `type`, `description`, `duration`, `zoom`).
- **Convención de archivos de ruta**:
  - `assets/routes/{id}.geojson` — GeoJSON con LineString (recorrido) + Points (waypoints).
  - `assets/elevation/{id}.csv` — Perfil de elevación (columnas: `lat, lon, ele, time, segment_distance_km, distance_km_cum, segment_time_s, elev_delta_m, elev_gain_pos_m, elev_gain_pos_cum_m, slope_percent`).
  - `assets/marks/{id}.json` — Marcas legacy (solo rutas con `legacy: true`).
- **Agregar nueva ruta**: añadir entrada en `event.json` → colocar `.geojson` y `.csv` en las carpetas correspondientes.

### 2.5 Variables de entorno

Prefijo `VUE_APP_` (requisito Vue CLI). Definidas en `.env`:

| Variable | Descripción |
|---|---|
| `VUE_APP_MAPBOX_ACCESS_TOKEN` | Token de Mapbox |
| `VUE_APP_MAPBOX_STYLE` | URL del estilo del mapa |
| `VUE_APP_MAPBOX_CENTER_LNG` | Longitud del centro del mapa |
| `VUE_APP_MAPBOX_CENTER_LAT` | Latitud del centro del mapa |

### 2.6 Importaciones y alias

- Usar `@/` como alias de `src/` (configurado en `jsconfig.json` y webpack).
- Imports dinámicos con `import()` + webpackChunkName para lazy-loading de vistas y assets.

---

## 3. Patrones de código

### 3.1 Comunicación padre-hijo

- **Props down, events up**: el padre (`RouteMapView`) es la única fuente de verdad del estado compartido (`progress`, `isPlaying`, `currentSpeed`).
- Hijos emiten eventos (`update:progress`, `toggle-play`, `speed-change`); el padre actualiza su `data` y los hijos reciben las actualizaciones por props.

### 3.2 Animación del mapa

La animación en `RouteMap.vue` se gestiona mediante closures dentro de `setupAnimation()`:

- `frame()` — loop de `requestAnimationFrame` que calcula la fase de animación.
- `updateDisplay(phase, moveCamera)` — actualiza posición del marcador, gradiente de la línea y cámara.
- `_togglePause(playing)`, `_seekToPhase(targetPhase)`, `_setSpeed(newSpeed)` — funciones expuestas al watcher de props para controlar la animación desde el exterior.

**Importante**: estas closures capturan variables locales (`startTime`, `isPaused`, `speed`, etc.) para evitar reactividad innecesaria de Vue.

### 3.3 Perfil de elevación

- `parseElevationCsv()` convierte CSV raw a array de objetos tipados.
- `PlayBack.vue` usa binary search (`_findNearestPoint`) para localizar el punto del perfil según la distancia actual.
- El SVG polyline se genera en el computed `elevationPoints`, downsampleando a ~150 puntos.

---

## 4. Instrucciones para refactorización y homogeneización

### 4.1 Migrar de Vue CLI a Vite (prioridad crítica)

Vue CLI 5 está en modo mantenimiento y usa Webpack 5. Vite ofrece arranque instantáneo (ESM nativo), HMR ultra-rápido y builds con Rollup más pequeños. Esta migración es prerequisito para otras mejoras (Vitest, `<script setup>` sin configuración extra, path aliases nativos).

**Pasos de migración:**

1. **Crear `vite.config.js`** en la raíz:
   ```js
   import { defineConfig } from 'vite';
   import vue from '@vitejs/plugin-vue';
   import path from 'path';

   export default defineConfig({
     plugins: [vue()],
     base: process.env.NODE_ENV === 'production' ? '/maraton-cali/' : '/',
     resolve: {
       alias: {
         '@': path.resolve(__dirname, 'src'),
       },
     },
     assetsInclude: ['**/*.csv'],
   });
   ```
2. **Mover `public/index.html` → `index.html`** (raíz del proyecto). Eliminar las interpolaciones `<%= ... %>` de Webpack y reemplazarlas por valores estáticos. Agregar `<script type="module" src="/src/main.js"></script>` antes de `</body>`.
3. **Instalar dependencias de Vite**:
   ```bash
   npm install -D vite @vitejs/plugin-vue
   ```
4. **Actualizar `package.json` scripts**:
   ```json
   "scripts": {
     "dev": "vite",
     "build": "vite build",
     "preview": "vite preview",
     "lint": "eslint src --ext .js,.vue"
   }
   ```
5. **Variables de entorno**: renombrar prefijo `VUE_APP_` → `VITE_` en `.env` y `.env.example`. En código, reemplazar `process.env.VUE_APP_*` → `import.meta.env.VITE_*` y `process.env.NODE_ENV` → `import.meta.env.MODE`.
6. **Importación de assets**:
   - `.csv`: usar `?raw` suffix en el import (`import csv from '@/assets/elevation/15k.csv?raw'`) o configurar `assetsInclude` en `vite.config.js`.
   - `.geojson`: Vite importa JSON nativamente; verificar que los dynamic imports funcionen sin webpack magic comments.
   - Eliminar la configuración `chainWebpack` de `vue.config.js`.
7. **Eliminar archivos y dependencias de Vue CLI**:
   - Eliminar: `vue.config.js`, `babel.config.js`, `jsconfig.json` (reemplazar por `tsconfig.json` o `jsconfig.json` simplificado si se necesita).
   - Desinstalar: `@vue/cli-*`, `@babel/*`, `eslint` (reinstalar versión compatible con ESM si es necesario).
8. **Actualizar `404.html`**: ajustar `pathSegmentsToKeep` si la estructura de despliegue cambia.
9. **Verificación**:
   - `npm run dev` — comprobar HMR, carga de mapa, animación, tema.
   - `npm run build && npm run preview` — verificar que el build de producción funcione con `base: '/maraton-cali/'`.
   - Probar en mobile y ambos temas.
10. **Actualizar este archivo de instructions y el README** con los nuevos scripts, configuración y stack.

### 4.2 Migrar a Composition API (prioridad media)

Los componentes usan Options API con `mixins`, lo cual dificulta la tipificación y el testing:

1. Convertir `themeMixin.js` → `useTheme.js` (composable con `ref`, `watch`, `onMounted`).
2. Migrar componentes uno a uno: `RaceTitle` → `PlayBack` → `EventHome` → `RouteMap` → `RouteMapView`.
3. Reemplazar `mixins: [themeMixin]` por `const { isLightTheme, toggleTheme } = useTheme()` en `<script setup>` o en `setup()`.
4. En `RouteMap.vue`, trasladar los closures de animación a un composable `useRouteAnimation(map, props, emit)` que encapsule `frame`, `updateDisplay`, `seekToPhase`, etc.

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
