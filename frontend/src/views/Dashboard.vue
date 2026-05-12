<template>
  <div>
    <AppBar />
    <div class="app-content">
      <v-container fluid class="pa-4 pt-2">
        <div class="flex items-center gap-3 mb-4">
          <div class="w-9 h-9 rounded-xl gradient-bg flex items-center justify-center shadow-md">
            <v-icon color="white" size="20">mdi-view-dashboard-outline</v-icon>
          </div>
          <h1 class="text-xl font-extrabold gradient-text">Dashboard</h1>
        </div>

        <!-- Stats -->
        <v-row v-if="loading">
          <v-col cols="12" md="6" lg="3" v-for="i in 4" :key="i">
            <v-card class="pa-4 rounded-2xl"><v-skeleton-loader type="image" /></v-card>
          </v-col>
        </v-row>
        <v-row v-else>
          <v-col cols="12" md="6" lg="3" v-for="stat in stats" :key="stat.label">
            <v-card class="pa-4 rounded-2xl card-gradient hover-lift">
              <div class="flex items-center justify-between">
                <div>
                  <div class="text-xs font-medium text-gray-500 uppercase tracking-wide">{{ stat.label }}</div>
                  <div class="text-3xl font-extrabold mt-1" :style="{ color: stat.color }">{{ stat.value }}</div>
                </div>
                <div class="w-12 h-12 rounded-xl flex items-center justify-center" :style="{ backgroundColor: stat.color + '15' }">
                  <v-icon :icon="stat.icon" size="28" :color="stat.color" />
                </div>
              </div>
            </v-card>
          </v-col>
        </v-row>

        <!-- Charts -->
        <v-row>
          <v-col cols="12" md="6">
            <v-card class="pa-4 rounded-2xl">
              <div class="flex items-center gap-2 mb-3">
                <v-icon color="primary" size="20">mdi-chart-pie</v-icon>
                <span class="font-bold text-sm">Trạng thái công việc</span>
              </div>
              <div v-if="loadingChart" class="flex justify-center pa-4">
                <v-progress-circular indeterminate color="primary" />
              </div>
              <canvas v-else ref="statusChart" class="max-h-[250px]" />
            </v-card>
          </v-col>
          <v-col cols="12" md="6">
            <v-card class="pa-4 rounded-2xl">
              <div class="flex items-center gap-2 mb-3">
                <v-icon color="warning" size="20">mdi-chart-donut</v-icon>
                <span class="font-bold text-sm">Độ ưu tiên</span>
              </div>
              <div v-if="loadingChart" class="flex justify-center pa-4">
                <v-progress-circular indeterminate color="primary" />
              </div>
              <canvas v-else ref="priorityChart" class="max-h-[250px]" />
            </v-card>
          </v-col>
        </v-row>

        <!-- Upcoming tasks -->
        <v-row>
          <v-col cols="12">
            <v-card class="pa-4 rounded-2xl">
              <div class="flex items-center gap-2 mb-3">
                <v-icon color="amber" size="20">mdi-calendar-alert</v-icon>
                <span class="font-bold text-sm">Task sắp đến hạn</span>
              </div>
              <v-list v-if="!loadingTasks" class="pa-0">
                <v-list-item
                  v-for="task in upcomingTasks"
                  :key="task.id"
                  class="rounded-xl mb-1 hover-lift"
                  style="background: #F8FAFC;"
                >
                  <template v-slot:prepend>
                    <v-chip :color="getPriorityColor(task.priority)" size="x-small" class="font-medium text-white">
                      {{ task.priority }}
                    </v-chip>
                  </template>
                  <v-list-item-title class="text-sm font-medium">{{ task.title }}</v-list-item-title>
                  <v-list-item-subtitle class="text-xs">
                    <v-icon size="12" class="mr-1">mdi-calendar</v-icon>
                    Hạn: {{ formatDate(task.due_date) }}
                  </v-list-item-subtitle>
                </v-list-item>
                <div v-if="upcomingTasks.length === 0" class="text-center py-6 text-gray-400 text-sm">
                  <v-icon size="36" class="mb-2">mdi-calendar-check-outline</v-icon><br>
                  Không có task sắp đến hạn
                </div>
              </v-list>
              <div v-else class="text-center pa-4">
                <v-progress-circular indeterminate color="primary" />
              </div>
            </v-card>
          </v-col>
        </v-row>
      </v-container>
    </div>
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
      { label: 'Tổng số task', value: data.total_tasks, icon: 'mdi-view-dashboard', color: '#1E3C72' },
      { label: 'Quá hạn', value: data.overdue_tasks, icon: 'mdi-alert', color: '#EF4444' },
      { label: 'Đang thực hiện', value: data.by_status?.find(s => s.status === 'Đang làm')?.count || 0, icon: 'mdi-progress-clock', color: '#F59E0B' },
      { label: 'Hoàn thành', value: data.by_status?.find(s => s.status === 'Hoàn thành')?.count || 0, icon: 'mdi-check-circle', color: '#10B981' },
    ];

    if (statusChartInstance) statusChartInstance.destroy();
    if (priorityChartInstance) priorityChartInstance.destroy();

    if (statusChart.value && data.by_status) {
      statusChartInstance = new Chart(statusChart.value, {
        type: 'doughnut',
        data: {
          labels: ['Cần làm', 'Đang làm', 'Xem lại', 'Hoàn thành'],
          datasets: [{
            data: ['Cần làm', 'Đang làm', 'Xem lại', 'Hoàn thành'].map(s => data.by_status.find(st => st.status === s)?.count || 0),
            backgroundColor: ['#1E3C72', '#2A5298', '#5DADE2', '#10B981'],
            borderWidth: 0,
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          cutout: '60%',
          plugins: { legend: { position: 'bottom', labels: { padding: 16, usePointStyle: true, font: { size: 12 } } } }
        }
      });
    }

    if (priorityChart.value && data.by_priority) {
      priorityChartInstance = new Chart(priorityChart.value, {
        type: 'doughnut',
        data: {
          labels: data.by_priority.map(p => p.priority),
          datasets: [{
            data: data.by_priority.map(p => p.count),
            backgroundColor: ['#10B981', '#3B82F6', '#F59E0B', '#EF4444'],
            borderWidth: 0,
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          cutout: '60%',
          plugins: { legend: { position: 'bottom', labels: { padding: 16, usePointStyle: true, font: { size: 12 } } } }
        }
      });
    }

    loadingChart.value = false;

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

onMounted(() => { loadData(); });
onBeforeUnmount(() => {
  if (statusChartInstance) statusChartInstance.destroy();
  if (priorityChartInstance) priorityChartInstance.destroy();
});
</script>

<style scoped>
.app-content {
  padding-top: 64px;
}
</style>
