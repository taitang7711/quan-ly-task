<template>
  <div class="toast-container">
    <TransitionGroup name="toast-slide">
      <div
        v-for="t in toasts"
        :key="t.id"
        class="toast-item"
        :class="[`toast-${t.type}`, { 'toast-visible': t.visible }]"
      >
        <div class="flex items-center gap-3">
          <v-icon size="22">{{ getIcon(t.type) }}</v-icon>
          <span class="text-sm font-medium">{{ t.text }}</span>
        </div>
        <button class="toast-close" @click="remove(t.id)">×</button>
        <div class="toast-progress" :style="{ animationDuration: '3500ms' }"></div>
      </div>
    </TransitionGroup>
  </div>
</template>

<script setup>
import { useToast, icons } from '../composables/useToast';

const { toasts, remove } = useToast();

function getIcon(type) {
  return icons[type] || 'mdi-information';
}
</script>

<style scoped>
.toast-container {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 10000;
  display: flex;
  flex-direction: column;
  gap: 10px;
  pointer-events: none;
}

.toast-item {
  pointer-events: all;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-width: 320px;
  max-width: 420px;
  padding: 14px 20px;
  border-radius: 12px;
  background: white;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.06);
  overflow: hidden;
  transform: translateX(120%);
  opacity: 0;
  transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
  border-left: 4px solid;
}

.toast-item.toast-visible {
  transform: translateX(0);
  opacity: 1;
}

.toast-success { border-left-color: #10B981; color: #065F46; }
.toast-error { border-left-color: #EF4444; color: #991B1B; }
.toast-warning { border-left-color: #F59E0B; color: #92400E; }
.toast-info { border-left-color: #3B82F6; color: #1E40AF; }

.toast-close {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  color: #9CA3AF;
  padding: 0 0 0 12px;
  line-height: 1;
}

.toast-close:hover {
  color: #4B5563;
}

.toast-progress {
  position: absolute;
  bottom: 0;
  left: 0;
  height: 3px;
  background: currentColor;
  opacity: 0.25;
  animation: toastShrink 3.5s linear forwards;
}

@keyframes toastShrink {
  from { width: 100%; }
  to { width: 0%; }
}

.toast-slide-leave-active {
  transition: all 0.25s ease-in;
}

.toast-slide-leave-to {
  transform: translateX(120%);
  opacity: 0;
}
</style>
