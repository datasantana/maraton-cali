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
    <HeroSection :city="city" :formattedDate="formattedDate" />

    <!-- Routes Section -->
    <section id="routes" class="event-home__routes">
      <div class="event-home__routes-grid">
        <RouteCard
          v-for="route in routes"
          :key="route.id"
          :route="route"
          :staticMapUrl="getStaticMapUrl(route)"
        />
      </div>
    </section>

    <!-- Footer -->
    <EventFooter
      :iconSrc="iconSrc"
      :eventName="eventName"
      :eventYear="eventYear"
      @scroll-to="scrollTo"
    />
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
import HeroSection from '@/components/HeroSection.vue';
import RouteCard from '@/components/RouteCard.vue';
import EventFooter from '@/components/EventFooter.vue';
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

/* ── Responsive ─────────────────────────────────────────────── */
@media (max-width: 768px) {
  .event-home__nav {
    display: none;
  }
}
</style>
