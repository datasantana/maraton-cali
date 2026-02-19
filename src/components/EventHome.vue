<template>
  <div class="event-home">
    <!-- Header -->
    <header class="event-home__header">
      <div class="event-home__header-content">
        <div class="event-home__logo">
          <img class="event-home__logo-icon" :src="logoSrc" :alt="eventName" />
        </div>

        <nav class="event-home__nav">
          <a @click.prevent="scrollTo('routes')" class="event-home__nav-link">Routes</a>
          <a @click.prevent="scrollTo('schedule')" class="event-home__nav-link">Schedule</a>
          <a @click.prevent="scrollTo('faq')" class="event-home__nav-link">FAQ</a>
          <a @click.prevent="scrollTo('contact')" class="event-home__nav-link">Contact</a>
        </nav>

        <div class="event-home__actions">
          <button class="event-home__theme-toggle" @click="toggleTheme" :aria-label="isLightTheme ? 'Switch to dark mode' : 'Switch to light mode'">
            <IconMoon v-if="!isLightTheme" :size="24" class="event-home__icon" />
            <IconSun v-else :size="24" class="event-home__icon" />
          </button>
          <button class="event-home__register-btn">Register Now</button>
        </div>
      </div>
    </header>

    <!-- Hero Section -->
    <section class="event-home__hero">
      <h1 class="event-home__hero-title">{{ city }}</h1>
      <div class="event-home__hero-date">
        <IconCalendar :size="20" />
        <span>{{ formattedDate }}</span>
      </div>
    </section>

    <!-- Routes Section -->
    <section id="routes" class="event-home__routes">
      <div class="event-home__routes-grid">
        <div class="event-home__card" v-for="route in routes" :key="route.id">
          <div class="event-home__card-image">
            <img :src="getStaticMapUrl(route)" :alt="route.name + ' Route Map'" />
          </div>
          <div class="event-home__card-content">
            <div class="event-home__card-header">
              <h2 class="event-home__card-title">{{ route.name }}</h2>
              <span :class="['event-home__badge', 'event-home__badge--' + route.difficulty]">{{ capitalizeFirst(route.difficulty) }}</span>
            </div>
            <p class="event-home__card-subtitle">{{ route.type.toUpperCase() }}</p>
            <p class="event-home__card-description">
              {{ route.description }}
            </p>
            <router-link :to="'/route/' + route.id" class="event-home__card-btn">
              <IconMap :size="18" />
              View route details
            </router-link>
          </div>
        </div>
      </div>
    </section>

    <!-- Footer -->
    <footer class="event-home__footer">
      <div class="event-home__footer-content">
        <div class="event-home__footer-logo">
          <img class="event-home__logo-icon event-home__logo-icon--small" :src="iconSrc" :alt="eventName" />
          <span>{{ eventName }}</span>
        </div>
        <div class="event-home__footer-links">
          <a @click.prevent="scrollTo('privacy')">Privacy Policy</a>
          <a @click.prevent="scrollTo('terms')">Terms of Service</a>
          <a @click.prevent="scrollTo('contact')">Contact</a>
        </div>
        <p class="event-home__footer-copyright">© {{ eventYear }} {{ eventName }}. All rights reserved.</p>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import eventData from '../assets/event.json';
import { useTheme } from '@/theme';
import logoImage from '@/assets/event-logo.png';
import iconImage from '@/assets/event-icon.png';
import IconMoon from '@/components/icons/IconMoon.vue';
import IconSun from '@/components/icons/IconSun.vue';
import IconCalendar from '@/components/icons/IconCalendar.vue';
import IconMap from '@/components/icons/IconMap.vue';
import { mapboxConfig, staticMapStylePath } from '@/config/mapbox';

const { isLightTheme, toggleTheme } = useTheme();

// --- Static data ---
const logoSrc = logoImage;
const iconSrc = iconImage;
const city = eventData.city || 'City';
const eventName = eventData.eventName || 'Event';
const eventDate = eventData.eventDate || '2026-01-01';
const routes = eventData.routes;
const mapboxToken = mapboxConfig.accessToken;
const [mapCenterLng, mapCenterLat] = mapboxConfig.center;

// --- Computed ---

const formattedDate = computed(() => {
  const date = new Date(eventDate + 'T00:00:00');
  return date.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
});

const eventYear = computed(() => eventDate.split('-')[0]);

const mapboxStylePath = computed(() => staticMapStylePath());

// --- Methods ---

function capitalizeFirst(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function getStaticMapUrl(route) {
  const zoom = route.zoom || 12;
  return `https://api.mapbox.com/styles/v1/${mapboxStylePath.value}/static/${mapCenterLng},${mapCenterLat},${zoom},0/400x200?access_token=${mapboxToken}`;
}

function scrollTo(id) {
  const el = document.getElementById(id);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth' });
  }
}
</script>

<style scoped>
/* Base styles */
.event-home {
  min-height: 100vh;
  background-color: var(--color-bg);
  color: var(--color-text);
  font-family: var(--font-family);
  transition: var(--transition-theme);
}

/* ── Header ─────────────────────────────────────────────────── */
.event-home__header {
  border-bottom: 1px solid var(--color-border);
  padding: 1rem 2rem;
  position: sticky;
  top: 0;
  background-color: var(--color-bg);
  z-index: var(--z-header);
  transition: var(--transition-theme);
}

.event-home__header-content {
  max-width: var(--max-width);
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.event-home__logo {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.event-home__logo-icon {
  width: 120px;
  height: 40px;
  object-fit: contain;
}

.event-home__logo-icon--small {
  width: 32px;
  height: 32px;
}

.event-home__nav {
  display: flex;
  gap: 2rem;
}

.event-home__nav-link {
  color: var(--color-text-muted);
  text-decoration: none;
  font-size: 0.95rem;
  transition: color 0.2s ease;
  cursor: pointer;
}

.event-home__nav-link:hover {
  color: var(--color-text);
}

.event-home__actions {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.event-home__theme-toggle {
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.event-home__icon {
  color: var(--color-text-muted);
  transition: color 0.2s ease;
}

.event-home__theme-toggle:hover .event-home__icon {
  color: var(--color-text);
}

.event-home__register-btn {
  background-color: var(--color-primary);
  color: #000;
  border: none;
  padding: 0.6rem 1.2rem;
  border-radius: var(--radius-btn);
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.event-home__register-btn:hover {
  background-color: var(--color-primary-hover);
}

/* ── Hero ───────────────────────────────────────────────────── */
.event-home__hero {
  text-align: center;
  padding: 4rem 2rem;
}

.event-home__hero-title {
  font-size: 6rem;
  font-weight: 800;
  margin: 0 0 1rem;
  letter-spacing: -2px;
}

.event-home__hero-date {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  color: var(--color-primary);
  font-size: 1.1rem;
}

/* ── Routes Section ─────────────────────────────────────────── */
.event-home__routes {
  padding: 2rem;
  max-width: var(--max-width);
  margin: 0 auto;
}

.event-home__routes-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 2rem;
  justify-content: center;
  align-items: stretch;
}

/* ── Route Card ─────────────────────────────────────────────── */
.event-home__card {
  flex: 1 1 calc(33.333% - 1.5rem);
  min-width: 280px;
  max-width: 420px;
  display: flex;
  flex-direction: column;
  background-color: var(--color-bg-elevated);
  border-radius: var(--radius-card);
  overflow: hidden;
  transition: transform 0.2s ease, background-color 0.3s ease;
}

.event-home__card:hover {
  transform: translateY(-4px);
}

.event-home__card-image {
  width: 100%;
  height: 180px;
  overflow: hidden;
  flex-shrink: 0;
}

.event-home__card-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: grayscale(100%);
  transition: filter 0.3s ease;
}

.event-home__card:hover .event-home__card-image img {
  filter: grayscale(50%);
}

.event-home__card-content {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  flex-grow: 1;
}

.event-home__card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.25rem;
}

.event-home__card-title {
  font-size: 2rem;
  font-weight: 700;
  margin: 0;
}

.event-home__badge {
  padding: 0.25rem 0.75rem;
  border-radius: var(--radius-badge);
  font-size: 0.75rem;
  font-weight: 600;
}

.event-home__badge--easy {
  background: var(--color-diff-easy-bg);
  color: var(--color-diff-easy-text);
  border: none;
}

.event-home__badge--moderate {
  background: var(--color-diff-moderate-bg);
  color: var(--color-diff-moderate-text);
  border: none;
}

.event-home__badge--challenging {
  background: var(--color-diff-challenging-bg);
  color: var(--color-diff-challenging-text);
  border: none;
}

.event-home__card-subtitle {
  color: var(--color-primary);
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 1px;
  margin: 0 0 1rem;
}

.event-home__card-description {
  color: var(--color-text-muted);
  font-size: 0.9rem;
  line-height: 1.6;
  margin: 0;
  flex-grow: 1;
}

.event-home__card-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.75rem 1rem;
  background-color: transparent;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-btn);
  color: var(--color-text);
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s ease;
  text-decoration: none;
  margin-top: 1.5rem;
  box-sizing: border-box;
}

.event-home__card-btn:hover {
  background-color: var(--color-card-hover-bg);
  border-color: var(--color-text-muted);
}

/* ── Footer ─────────────────────────────────────────────────── */
.event-home__footer {
  border-top: 1px solid var(--color-border);
  padding: 3rem 2rem;
  margin-top: 4rem;
  transition: border-color 0.3s ease;
}

.event-home__footer-content {
  max-width: var(--max-width);
  margin: 0 auto;
  text-align: center;
}

.event-home__footer-logo {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
  font-weight: 600;
}

.event-home__footer-links {
  display: flex;
  justify-content: center;
  gap: 2rem;
  margin-bottom: 1.5rem;
}

.event-home__footer-links a {
  color: var(--color-text-muted);
  text-decoration: none;
  font-size: 0.9rem;
  transition: color 0.2s ease;
  cursor: pointer;
}

.event-home__footer-links a:hover {
  color: var(--color-text);
}

.event-home__footer-copyright {
  color: var(--color-text-faint);
  font-size: 0.85rem;
  margin: 0;
}

/* ── Responsive ─────────────────────────────────────────────── */
@media (max-width: 1024px) {
  .event-home__card {
    flex: 1 1 calc(50% - 1rem);
  }
}

@media (max-width: 768px) {
  .event-home__card {
    flex: 1 1 100%;
    max-width: 100%;
  }

  .event-home__nav {
    display: none;
  }

  .event-home__hero-title {
    font-size: 4rem;
  }
}
</style>
