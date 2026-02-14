<template>
  <div class="event-home">
    <!-- Header -->
    <header class="header">
      <div class="header-content">
        <div class="logo">
          <img class="logo-icon" :src="logoSrc" :alt="eventName" />
          <!--span class="logo-text">{{ eventName }}</span-->
        </div>
        
        <nav class="nav">
          <a @click.prevent="scrollTo('routes')" class="nav-link">Routes</a>
          <a @click.prevent="scrollTo('schedule')" class="nav-link">Schedule</a>
          <a @click.prevent="scrollTo('faq')" class="nav-link">FAQ</a>
          <a @click.prevent="scrollTo('contact')" class="nav-link">Contact</a>
        </nav>
        
        <div class="header-actions">
          <button class="theme-toggle" @click="toggleTheme" :aria-label="isLightTheme ? 'Switch to dark mode' : 'Switch to light mode'">
            <svg v-if="!isLightTheme" class="icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <svg v-else class="icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="5" stroke="currentColor" stroke-width="2"/>
              <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </button>
          <button class="register-btn">Register Now</button>
        </div>
      </div>
    </header>

    <!-- Hero Section -->
    <section class="hero">
      <h1 class="hero-title">{{ city }}</h1>
      <div class="hero-date">
        <svg class="calendar-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" stroke-width="2"/>
          <path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
        <span>{{ formattedDate }}</span>
      </div>
    </section>

    <!-- Routes Section -->
    <section id="routes" class="routes-section">
      <div class="routes-grid">
        <div class="route-card" v-for="route in routes" :key="route.id">
          <div class="card-image">
            <img :src="getStaticMapUrl(route)" :alt="route.name + ' Route Map'" />
          </div>
          <div class="card-content">
            <div class="card-header">
              <h2 class="card-title">{{ route.name }}</h2>
              <span :class="['badge', 'badge-' + route.difficulty]">{{ capitalizeFirst(route.difficulty) }}</span>
            </div>
            <p class="card-subtitle">{{ route.type.toUpperCase() }}</p>
            <p class="card-description">
              {{ route.description }}
            </p>
            <router-link :to="'/route/' + route.id" class="card-btn">
              <svg class="btn-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              View route details
            </router-link>
          </div>
        </div>
      </div>
    </section>

    <!-- Footer -->
    <footer class="footer">
      <div class="footer-content">
        <div class="footer-logo">
          <img class="logo-icon" :src="iconSrc" :alt="eventName" />
          <span>{{ eventName }}</span>
        </div>
        <div class="footer-links">
          <a @click.prevent="scrollTo('privacy')">Privacy Policy</a>
          <a @click.prevent="scrollTo('terms')">Terms of Service</a>
          <a @click.prevent="scrollTo('contact')">Contact</a>
        </div>
        <p class="footer-copyright">© {{ eventYear }} {{ eventName }}. All rights reserved.</p>
      </div>
    </footer>
  </div>
</template>

<script>
import eventData from '../assets/event.json';
import { themeMixin } from '@/theme';
import logoImage from '@/assets/event-logo.png';
import iconImage from '@/assets/event-icon.png';

export default {
  name: 'EventHome',
  mixins: [themeMixin],
  data() {
    return {
      logoSrc: logoImage,
      iconSrc: iconImage,
      city: eventData.city || 'City',
      eventName: eventData.eventName || 'Event',
      eventDate: eventData.eventDate || '2026-01-01',
      routes: eventData.routes,
      mapboxToken: process.env.VUE_APP_MAPBOX_ACCESS_TOKEN || '',
      mapboxStyle: 'mapbox://styles/mapbox/streets-v11',
      mapCenterLng: process.env.VUE_APP_MAPBOX_CENTER_LNG || '-76.5410942407',
      mapCenterLat: process.env.VUE_APP_MAPBOX_CENTER_LAT || '3.4300127118'
    }
  },
  computed: {
    formattedDate() {
      const date = new Date(this.eventDate + 'T00:00:00');
      return date.toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    },
    eventYear() {
      return this.eventDate.split('-')[0];
    },
    mapboxStylePath() {
      // Convert mapbox://styles/username/styleId to username/styleId
      return this.mapboxStyle.replace('mapbox://styles/', '');
    }
  },
  methods: {
    capitalizeFirst(str) {
      return str.charAt(0).toUpperCase() + str.slice(1);
    },
    getStaticMapUrl(route) {
      const zoom = route.zoom || 12;
      return `https://api.mapbox.com/styles/v1/${this.mapboxStylePath}/static/${this.mapCenterLng},${this.mapCenterLat},${zoom},0/400x200?access_token=${this.mapboxToken}`;
    },
    scrollTo(id) {
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }
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

/* Header */
.header {
  border-bottom: 1px solid var(--color-border);
  padding: 1rem 2rem;
  position: sticky;
  top: 0;
  background-color: var(--color-bg);
  z-index: 100;
  transition: var(--transition-theme);
}

.header-content {
  max-width: var(--max-width);
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.logo {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.logo-icon {
  width: 120px;
  height: 40px;
  object-fit: contain;
}

.logo-text {
  font-weight: 600;
  font-size: 1.1rem;
}

.nav {
  display: flex;
  gap: 2rem;
}

.nav-link {
  color: var(--color-text-muted);
  text-decoration: none;
  font-size: 0.95rem;
  transition: color 0.2s ease;
  cursor: pointer;
}

.nav-link:hover {
  color: var(--color-text);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.theme-toggle {
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.theme-toggle .icon {
  width: 24px;
  height: 24px;
  color: var(--color-text-muted);
  transition: color 0.2s ease;
}

.theme-toggle:hover .icon {
  color: var(--color-text);
}

.register-btn {
  background-color: var(--color-primary);
  color: #000;
  border: none;
  padding: 0.6rem 1.2rem;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.register-btn:hover {
  background-color: var(--color-primary-hover);
}

/* Hero Section */
.hero {
  text-align: center;
  padding: 4rem 2rem;
}

.hero-title {
  font-size: 6rem;
  font-weight: 800;
  margin: 0 0 1rem;
  letter-spacing: -2px;
}

.hero-date {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  color: var(--color-primary);
  font-size: 1.1rem;
}

.calendar-icon {
  width: 20px;
  height: 20px;
}

/* Routes Section */
.routes-section {
  padding: 2rem;
  max-width: var(--max-width);
  margin: 0 auto;
}

.routes-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 2rem;
  justify-content: center;
  align-items: stretch;
}

.route-card {
  flex: 1 1 calc(33.333% - 1.5rem);
  min-width: 280px;
  max-width: 420px;
  display: flex;
  flex-direction: column;
}

@media (max-width: 1024px) {
  .route-card {
    flex: 1 1 calc(50% - 1rem);
  }
}

@media (max-width: 768px) {
  .route-card {
    flex: 1 1 100%;
    max-width: 100%;
  }
  
  .nav {
    display: none;
  }
  
  .hero-title {
    font-size: 4rem;
  }
}

/* Route Card */
.route-card {
  background-color: var(--color-bg-elevated);
  border-radius: var(--radius-card);
  overflow: hidden;
  transition: transform 0.2s ease, background-color 0.3s ease;
  display: flex;
  flex-direction: column;
}

.route-card:hover {
  transform: translateY(-4px);
}

.card-image {
  width: 100%;
  height: 180px;
  overflow: hidden;
  flex-shrink: 0;
}

.card-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: grayscale(100%);
  transition: filter 0.3s ease;
}

.route-card:hover .card-image img {
  filter: grayscale(50%);
}

.card-content {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  flex-grow: 1;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.25rem;
}

.card-title {
  font-size: 2rem;
  font-weight: 700;
  margin: 0;
}

.badge {
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
}

.badge-easy {
  background: var(--color-diff-easy-bg);
  color: var(--color-diff-easy-text);
  border: none;
}

.badge-moderate {
  background: var(--color-diff-moderate-bg);
  color: var(--color-diff-moderate-text);
  border: none;
}

.badge-challenging {
  background: var(--color-diff-challenging-bg);
  color: var(--color-diff-challenging-text);
  border: none;
}

.card-subtitle {
  color: var(--color-primary);
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 1px;
  margin: 0 0 1rem;
}

.card-description {
  color: var(--color-text-muted);
  font-size: 0.9rem;
  line-height: 1.6;
  margin: 0;
  flex-grow: 1;
}

.card-btn {
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

.card-btn:hover {
  background-color: var(--color-card-hover-bg);
  border-color: var(--color-text-muted);
}

.btn-icon {
  width: 18px;
  height: 18px;
}

/* Footer */
.footer {
  border-top: 1px solid var(--color-border);
  padding: 3rem 2rem;
  margin-top: 4rem;
  transition: border-color 0.3s ease;
}

.footer-content {
  max-width: var(--max-width);
  margin: 0 auto;
  text-align: center;
}

.footer-logo {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
  font-weight: 600;
}

.footer-logo .logo-icon {
  width: 32px;
  height: 32px;
}

.footer-links {
  display: flex;
  justify-content: center;
  gap: 2rem;
  margin-bottom: 1.5rem;
}

.footer-links a {
  color: var(--color-text-muted);
  text-decoration: none;
  font-size: 0.9rem;
  transition: color 0.2s ease;
  cursor: pointer;
}

.footer-links a:hover {
  color: var(--color-text);
}

.footer-copyright {
  color: var(--color-text-faint);
  font-size: 0.85rem;
  margin: 0;
}
</style>
