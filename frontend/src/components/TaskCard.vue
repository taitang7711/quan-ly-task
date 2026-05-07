<template>
  <v-card class="task-card cursor-pointer" elevation="1" @click="$emit('click')">
    <v-card-title class="text-subtitle-1 font-bold pb-1">
      {{ task.title }}
    </v-card-title>
    <v-card-text class="pt-0">
      <div class="flex justify-between items-start gap-2 mb-2">
        <div class="flex flex-wrap gap-2">
          <!-- Priority with icon -->
          <v-chip :color="priorityColor" size="small" class="text-white">
            <v-icon :icon="priorityIcon" size="small" class="mr-1" />
            {{ task.priority }}
          </v-chip>
          <!-- Due date chip with warning if overdue -->
          <v-chip v-if="task.due_date" :color="dueDateColor" size="small">
            <v-icon icon="mdi-calendar-clock" size="small" class="mr-1" />
            {{ formatDate(task.due_date) }}
            <span v-if="daysRemaining !== null && daysRemaining < 0" class="ml-1 font-bold">
              (Quá hạn {{ Math.abs(daysRemaining) }} ngày)
            </span>
            <span v-else-if="daysRemaining !== null && daysRemaining <= 3" class="ml-1">
              (Còn {{ daysRemaining }} ngày)
            </span>
          </v-chip>
          <!-- Category chip -->
          <v-chip :color="task.category_color" size="small">
            {{ task.category_name }}
          </v-chip>
        </div>
        <!-- Small progress indicator (optional) -->
        <div v-if="task.estimated_hours" class="text-right">
          <div class="text-caption text-grey">⏱️{{ task.estimated_hours }}h</div>
        </div>
      </div>

      <!-- Assignee with avatar -->
      <div v-if="task.assignee_name" class="flex items-center gap-2 mt-2">
        <v-avatar size="24" color="primary" class="text-white">
          <span class="text-caption font-bold">{{ getInitials(task.assignee_name) }}</span>
        </v-avatar>
        <div class="text-caption text-grey-darken-1">{{ task.assignee_name }}</div>
      </div>

      <!-- Simple progress bar based on due date (if due_date exists) -->
      <div v-if="task.due_date && dueProgress !== null" class="mt-2">
        <v-progress-linear
          :model-value="dueProgress"
          :color="dueProgress >= 100 ? 'error' : 'success'"
          height="4"
          rounded
        />
        <div class="text-right text-caption mt-0">
          {{ Math.min(100, Math.max(0, dueProgress)) }}% thời gian
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
  const diffTime = due - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
});

const dueProgress = computed(() => {
  if (!props.task.due_date || !props.task.created_at) return null;
  const created = new Date(props.task.created_at);
  const due = new Date(props.task.due_date);
  const today = new Date();
  const total = due - created;
  const elapsed = today - created;
  if (total <= 0) return 100;
  const percent = (elapsed / total) * 100;
  return Math.min(100, Math.max(0, percent));
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
  transition: all 0.2s cubic-bezier(0.2, 0.9, 0.4, 1.1);
}
.task-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1);
}
</style>