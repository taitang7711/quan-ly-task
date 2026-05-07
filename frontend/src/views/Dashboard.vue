<template>
  <div>
    <AppBar />
    <v-container fluid class="pa-4">
      <!-- Loading skeletons for stats -->
      <v-row v-if="loading">
        <v-col cols="12" md="6" lg="3" v-for="i in 4" :key="i">
          <v-card elevation="2" class="pa-4">
            <div class="flex justify-between items-center">
              <div>
                <div class="text-subtitle-1 text-grey-darken-1">
                  <v-skeleton-loader type="text" width="100"></v-skeleton-loader>
                </div>
                <div class="text-h3 font-bold">
                  <v-skeleton-loader type="text" width="60"></v-skeleton-loader>
                </div>
              </div>
              <v-skeleton-loader type="avatar" width="40" height="40"></v-skeleton-loader>
            </div>
          </v-card>
        </v-col>
      </v-row>

      <!-- Stats cards -->
      <v-row v-else>
        <v-col cols="12" md="6" lg="3" v-for="stat in stats" :key="stat.label">
          <v-card elevation="2" class="pa-4 hover-scale transition-all">
            <div class="flex justify-between items-center">
              <div>
                <div class="text-subtitle-1 text-grey-darken-1">{{ stat.label }}</div>
                <div class="text-h3 font-bold">{{ stat.value }}</div>
              </div>
              <v-icon :icon="stat.icon" size="40" :color="stat.color"></v-icon>
            </div>
          </v-card>
        </v-col>
      </v-row>

      <v-row>
        <v-col cols="12" md="6">
          <v-card title="Trạng thái công việc" class="pa-4">
            <div v-if="loadingChart" class="text-center pa-4">
              <v-progress-circular indeterminate color="primary"></v-progress-circular>
            </div>
            <canvas v-else ref="statusChart"></canvas>
          </v-card>
        </v-col>
        <v-col cols="12" md="6">
          <v-card title="Độ ưu tiên" class="pa-4">
            <div v-if="loadingChart" class="text-center pa-4">
              <v-progress-circular indeterminate color="primary"></v-progress-circular>
            </div>
            <canvas v-else ref="priorityChart"></canvas>
          </v-card>
        </v-col>
      </v-row>

      <v-row>
        <v-col cols="12">
          <v-card title="Task sắp đến hạn" class="pa-4">
            <v-list v-if="!loadingTasks">
              <v-list-item v-for="task in upcomingTasks" :key="task.id" class="hover-scale">
                <template v-slot:prepend>
                  <v-chip :color="getPriorityColor(task.priority)" size="small">{{ task.priority }}</v-chip>
                </template>
                <v-list-item-title>{{ task.title }}</v-list-item-title>
                <v-list-item-subtitle>Hạn: {{ formatDate(task.due_date) }}</v-list-item-subtitle>
              </v-list-item>
              <v-list-item v-if="upcomingTasks.length === 0">
                <v-list-item-title class="text-center text-grey">Không có task sắp đến hạn</v-list-item-title>
              </v-list-item>
            </v-list>
            <div v-else class="text-center pa-4">
              <v-progress-circular indeterminate color="primary"></v-progress-circular>
            </div>
          </v-card>
        </v-col>
      </v-row>
    </v-container>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import AppBar from '../components/AppBar.vue';
import { useTaskStore } from '../stores/task';
import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);

const taskStore = useTaskStore();
const stats = ref([]);
const statusChart = ref(null);
const priorityChart = ref(null);
const upcomingTasks = ref([]);
const loading = ref(true);
const loadingChart = ref(true);
const loadingTasks = ref(true);
let statusChartInstance = null;
let priorityChartInstance = null;

function getPriorityColor(priority) {
  const colors = { low: 'success', medium: 'info', high: 'warning', urgent: 'error' };
  return colors[priority] || 'default';
}

function formatDate(date) {
  if (!date) return 'Không có';
  return new Date(date).toLocaleDateString('vi-VN');
}

async function loadData() {
  loading.value = true;
  loadingChart.value = true;
  loadingTasks.value = true;

  try {
    const data = await taskStore.getStats();
    stats.value = [
      { label: 'Tổng số task', value: data.total_tasks, icon: 'mdi-view-dashboard', color: 'primary' },
      { label: 'Quá hạn', value: data.overdue_tasks, icon: 'mdi-alert', color: 'error' },
      { label: 'Đang thực hiện', value: data.by_status?.find(s => s.status === 'in_progress')?.count || 0, icon: 'mdi-progress-clock', color: 'warning' },
      { label: 'Hoàn thành', value: data.by_status?.find(s => s.status === 'done')?.count || 0, icon: 'mdi-check-circle', color: 'success' },
    ];

    // Destroy existing charts if any
    if (statusChartInstance) statusChartInstance.destroy();
    if (priorityChartInstance) priorityChartInstance.destroy();

    // Create status chart
    if (statusChart.value && data.by_status) {
      statusChartInstance = new Chart(statusChart.value, {
        type: 'pie',
        data: {
          labels: data.by_status.map(s => s.status),
          datasets: [{ data: data.by_status.map(s => s.count), backgroundColor: ['#1E3C72', '#2A5298', '#5DADE2', '#27AE60'] }]
        },
        options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { position: 'bottom' } } }
      });
    }

    // Create priority chart
    if (priorityChart.value && data.by_priority) {
      priorityChartInstance = new Chart(priorityChart.value, {
        type: 'doughnut',
        data: {
          labels: data.by_priority.map(p => p.priority),
          datasets: [{ data: data.by_priority.map(p => p.count), backgroundColor: ['#27AE60', '#F39C12', '#E74C3C', '#C0392B'] }]
        },
        options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { position: 'bottom' } } }
      });
    }

    loadingChart.value = false;

    // Upcoming tasks (due in next 3 days)
    const tasks = await taskStore.fetchTasks({ status: 'todo,in_progress' });
    const now = new Date();
    const threeDaysLater = new Date();
    threeDaysLater.setDate(now.getDate() + 3);
    upcomingTasks.value = tasks.tasks.filter(t => t.due_date && new Date(t.due_date) <= threeDaysLater).slice(0, 5);
    loadingTasks.value = false;
  } catch (err) {
    console.error('Failed to load dashboard data:', err);
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  loadData();
});

onBeforeUnmount(() => {
  if (statusChartInstance) statusChartInstance.destroy();
  if (priorityChartInstance) priorityChartInstance.destroy();
});
</script>

<style scoped>
.hover-scale {
  transition: transform 0.2s ease;
}
.hover-scale:hover {
  transform: translateY(-2px);
}
</style>