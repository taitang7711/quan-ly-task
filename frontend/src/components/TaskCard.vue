<template>
  <v-card class="task-card cursor-pointer rounded-xl hover-lift" elevation="0" @click="$emit('click')">
    <v-card-text class="pa-3">
      <div class="flex items-start justify-between gap-2 mb-2">
        <div class="flex-1 min-w-0">
          <div class="font-bold text-sm leading-snug text-gray-800 mb-1.5 truncate">
            {{ task.title }}
          </div>
          <div class="flex flex-wrap gap-1.5">
            <v-chip :color="priorityColor" size="x-small" class="text-white font-medium px-1" density="compact">
              <v-icon :icon="priorityIcon" size="11" class="mr-0.5" />
              {{ task.priority === 'urgent' ? 'Urgent' : task.priority === 'high' ? 'Cao' : task.priority === 'medium' ? 'TB' : 'Thấp' }}
            </v-chip>
            <v-chip v-if="task.category_name" size="x-small" density="compact" class="font-medium" :color="task.category_color || 'primary'">
              <v-icon size="11" class="mr-0.5">mdi-tag-outline</v-icon>
              {{ task.category_name }}
            </v-chip>
            <v-chip v-if="task.due_date" :color="dueDateColor" size="x-small" density="compact" class="font-medium">
              <v-icon size="11" class="mr-0.5">mdi-calendar-outline</v-icon>
              {{ formatDate(task.due_date) }}
            </v-chip>
          </div>
        </div>
        <div v-if="task.estimated_hours" class="text-xs text-gray-400 whitespace-nowrap flex items-center">
          <v-icon size="12" class="mr-0.5">mdi-clock-outline</v-icon>
          {{ task.estimated_hours }}h
        </div>
      </div>

      <div v-if="task.description" class="text-xs text-gray-500 line-clamp-2 mb-2">
        {{ task.description }}
      </div>

      <div class="flex items-center justify-between mt-1">
        <div v-if="task.assignee_name" class="flex items-center gap-1.5">
          <v-avatar size="22" color="primary" class="text-white">
            <span class="text-[9px] font-bold">{{ getInitials(task.assignee_name) }}</span>
          </v-avatar>
          <span class="text-[11px] text-gray-500">{{ task.assignee_name }}</span>
        </div>
        <div v-if="task.due_date && daysRemaining !== null" class="flex items-center">
          <span
            class="text-[10px] font-semibold"
            :class="daysRemaining < 0 ? 'text-red-500' : daysRemaining <= 2 ? 'text-amber-500' : 'text-gray-400'"
          >
            {{ daysRemaining < 0 ? `Quá hạn ${Math.abs(daysRemaining)}d` : `Còn ${daysRemaining}d` }}
          </span>
        </div>
      </div>

      <div v-if="task.due_date && dueProgress !== null" class="mt-2">
        <div class="h-1.5 rounded-full bg-gray-100 overflow-hidden">
          <div
            class="h-full rounded-full transition-all duration-500"
            :class="dueProgress >= 100 ? 'bg-red-400' : 'bg-green-400'"
            :style="{ width: Math.min(100, Math.max(0, dueProgress)) + '%' }"
          />
        </div>
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps(['task']);
defineEmits(['click']);

const priorityColor = computed(() => {
  const colors = { low: 'success', medium: 'info', high: 'warning', urgent: 'error' };
  return colors[props.task.priority] || 'default';
});

const priorityIcon = computed(() => {
  const icons = { low: 'mdi-arrow-down', medium: 'mdi-arrow-right', high: 'mdi-arrow-up', urgent: 'mdi-alert' };
  return icons[props.task.priority] || 'mdi-flag';
});

const dueDateColor = computed(() => {
  if (!props.task.due_date) return 'grey';
  const days = daysRemaining.value;
  if (days < 0) return 'error';
  if (days <= 2) return 'warning';
  return 'info';
});

const daysRemaining = computed(() => {
  if (!props.task.due_date) return null;
  const due = new Date(props.task.due_date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((due - today) / (1000 * 60 * 60 * 24));
});

const dueProgress = computed(() => {
  if (!props.task.due_date || !props.task.created_at) return null;
  const created = new Date(props.task.created_at);
  const due = new Date(props.task.due_date);
  const total = due - created;
  const elapsed = new Date() - created;
  if (total <= 0) return 100;
  return Math.min(100, Math.max(0, (elapsed / total) * 100));
});

function formatDate(date) {
  if (!date) return '';
  return new Date(date).toLocaleDateString('vi-VN');
}

function getInitials(name) {
  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}
</script>

<style scoped>
.task-card {
  background: white;
  border: 1px solid rgba(0, 0, 0, 0.04);
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.task-card:hover {
  border-color: rgba(30, 60, 114, 0.12);
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
}

.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
