<template>
  <v-app>
    <v-main>
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </v-main>
    <!-- Global loading indicator (optional) -->
    <v-progress-linear v-if="isLoading" indeterminate color="primary" class="global-loading" />
  </v-app>
</template>

<script setup>
import { ref, watch } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const isLoading = ref(false);

router.beforeEach((to, from, next) => {
  isLoading.value = true;
  next();
});

router.afterEach(() => {
  // Small delay to avoid flicker
  setTimeout(() => {
    isLoading.value = false;
  }, 200);
});
</script>

<style>
/* Fade transition for router views */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Global loading bar */
.global-loading {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 9999;
}
</style>