<template>
  <footer class="event-footer">
    <div class="event-footer__content">
      <div class="event-footer__logo">
        <img class="event-footer__icon" :src="iconSrc" :alt="eventName" />
        <span>{{ eventName }}</span>
      </div>
      <div class="event-footer__links">
        <a @click.prevent="$emit('scroll-to', 'privacy')">Privacy Policy</a>
        <a @click.prevent="$emit('scroll-to', 'terms')">Terms of Service</a>
        <a @click.prevent="$emit('scroll-to', 'contact')">Contact</a>
      </div>
      <p class="event-footer__copyright">© {{ eventYear }} {{ eventName }}. All rights reserved.</p>
    </div>
  </footer>
</template>

<script setup>
defineProps({
  /** URL to the event icon image */
  iconSrc: {
    type: String,
    required: true,
  },
  /** Event name */
  eventName: {
    type: String,
    required: true,
  },
  /** Event year (e.g. "2026") */
  eventYear: {
    type: [String, Number],
    required: true,
  },
});

defineEmits(['scroll-to']);
</script>

<style scoped>
.event-footer {
  border-top: 1px solid var(--color-border);
  padding: 3rem 2rem;
  margin-top: 4rem;
  transition: border-color 0.3s ease;
}

.event-footer__content {
  max-width: var(--max-width);
  margin: 0 auto;
  text-align: center;
}

.event-footer__logo {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
  font-weight: 600;
}

.event-footer__icon {
  width: 32px;
  height: 32px;
  object-fit: contain;
}

.event-footer__links {
  display: flex;
  justify-content: center;
  gap: 2rem;
  margin-bottom: 1.5rem;
}

.event-footer__links a {
  color: var(--color-text-muted);
  text-decoration: none;
  font-size: 0.9rem;
  transition: color 0.2s ease;
  cursor: pointer;
}

.event-footer__links a:hover {
  color: var(--color-text);
}

.event-footer__copyright {
  color: var(--color-text-faint);
  font-size: 0.85rem;
  margin: 0;
}
</style>
