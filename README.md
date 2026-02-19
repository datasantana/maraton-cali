# Maratón de Cali

Aplicación web interactiva para visualizar las rutas de la **Maratón de Cali 2026**. Muestra cada recorrido sobre un mapa Mapbox con animación de trayecto, perfil de elevación en tiempo real y controles de reproducción (play/pause, velocidad, scrub). Incluye landing page del evento con tarjetas de ruta, tema claro/oscuro y despliegue en GitHub Pages.

> **Demo en vivo:** <https://datasantana.github.io/maraton-cali/>

---

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| Framework | **Vue 3** (Composition API, `<script setup>`) + Vue Router 4 |
| Mapa | **Mapbox GL JS 3.12** |
| Cálculos geoespaciales | **Turf.js 3** (`turf.along`, `turf.lineDistance`) |
| Build | **Vite 6** (Rollup) |
| CSS | CSS custom properties (design tokens), sin preprocesador |
| Linting | ESLint + `eslint-plugin-vue` (vue3-essential) |
| Despliegue | **GitHub Pages** (SPA redirect con `404.html`) |

---

## Arquitectura

```
src/
├── main.js                  # Punto de entrada — monta App, router, CSS global
├── App.vue                  # Shell con <router-view/> y useTheme composable
│
├── router/index.js          # Rutas: / (home), /about, /route/:routeId
│
├── composables/
│   └── useRouteAnimation.js # Composable de animación del mapa (capas, frame loop, controles)
│
├── views/
│   ├── HomeView.vue         # Landing page (wrapper de EventHome)
│   ├── RouteMapView.vue     # Vista de ruta — orquesta RouteMap + PlayBack + RaceTitle
│   └── AboutView.vue        # Placeholder
│
├── components/
│   ├── EventHome.vue        # Landing: hero, grid de tarjetas de ruta, header, footer
│   ├── RouteMap.vue         # Mapa Mapbox con animación vía useRouteAnimation composable
│   ├── PlayBack.vue         # Barra de reproducción: play/pause, velocidad, scrub, stats
│   └── RaceTitle.vue        # Overlay con nombre, tipo, ciudad y dificultad de la ruta
│
├── theme/
│   ├── index.js             # Barrel export (useTheme + tokens)
│   ├── tokens.js            # Tokens de diseño centralizados (colores, tipografía, layout)
│   ├── useTheme.js          # Composable — toggle dark/light, localStorage, cross-tab sync
│   ├── themeMixin.js        # (Legacy, ya no se importa — conservado como referencia)
│   └── variables.css        # Custom properties CSS generadas desde tokens
│
├── utils/
│   └── parseElevationCsv.js # Parser CSV → array de objetos con tipos numéricos
│
└── assets/
    ├── event.json           # Config centralizada del evento (ciudad, fecha, rutas)
    ├── routes/*.geojson     # Geometrías GeoJSON (LineString + Points) por ruta
    ├── elevation/*.csv      # Perfiles de elevación por ruta
    └── marks/*.json         # Marcas legacy (5k, 10k, 21k)
```

### Flujo de datos principal

```
event.json ──▶ EventHome (tarjetas) ──▶ router-link /route/:id
                                              │
                                              ▼
                                     RouteMapView (orquestador)
                                      ┌───────┼───────┐
                                      ▼       ▼       ▼
                                 RouteMap  PlayBack  RaceTitle
```

1. **`RouteMapView`** carga dinámicamente los assets (`.geojson` + `.csv`) según el `routeId`.
2. Es la **única fuente de verdad** del estado de reproducción (`progress`, `isPlaying`, `currentSpeed`).
3. **`RouteMap`** ejecuta la animación vía `requestAnimationFrame` y emite `update:progress`.
4. **`PlayBack`** muestra stats (distancia, elevación, pendiente, ascenso acumulado, tiempo) y permite scrub/play/pause/speed.
5. La comunicación es **parent-driven**: los hijos emiten eventos, el padre actualiza props compartidas.

### Sistema de temas

- **`useTheme()`** composable se usa en `App.vue` (inicialización global) y `EventHome.vue` (toggle).
- Retorna `{ isLightTheme, toggleTheme }` — ref reactiva y función de toggle.
- Agrega/quita la clase `.light-theme` en `<html>`, con persistencia en localStorage y sincronización cross-tab.
- Las variables CSS en `variables.css` (`:root` = dark, `.light-theme` = light) se aplican globalmente.
- `tokens.js` define los valores fuente; `variables.css` los mapea a custom properties.

### Datos de rutas

Cada ruta se configura en `event.json` y sus assets siguen una convención de nombres:

| Asset | Ruta estándar | Ruta legacy |
|---|---|---|
| Geometría | `routes/{id}.geojson` | `routes/{id}.json` + `marks/{id}.json` |
| Elevación | `elevation/{id}.csv` | — |

El GeoJSON estándar contiene un `LineString` (trayecto) y `Point` features (waypoints enriquecidos).

---

## Configuración

### Variables de entorno

Copiar `.env.example` → `.env` y configurar:

```dotenv
VITE_MAPBOX_ACCESS_TOKEN=tu_token_aquí
VITE_MAPBOX_STYLE=mapbox://styles/mapbox/standard
VITE_MAPBOX_CENTER_LNG=-76.5410942407
VITE_MAPBOX_CENTER_LAT=3.4300127118
```

### Instalación y desarrollo

```bash
npm install        # Instalar dependencias
npm run dev        # Dev server con hot-reload (Vite)
npm run build      # Build de producción (output en dist/)
npm run preview    # Preview del build de producción
npm run lint       # Lint
```

### Configuración de Vite (`vite.config.js`)

- `base` → `/maraton-cali/` en producción (GitHub Pages).
- Alias `@` → `src/`.
- `.csv` importados con sufijo `?raw` para texto plano.
- `.geojson` transformados a módulos JSON vía plugin custom.

---

## Despliegue

La app se despliega como SPA en **GitHub Pages**. El archivo `public/404.html` redirige rutas desconocidas al `index.html` usando el patrón [spa-github-pages](https://github.com/rafgraph/spa-github-pages), y un script en `index.html` restaura la ruta original para Vue Router.

---

## Licencia

Este proyecto es privado.
