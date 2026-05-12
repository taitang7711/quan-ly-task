<template>
  <div>
    <AppBar />
    <div class="app-content">
      <v-container class="pa-4 pt-2">
        <div class="flex items-center gap-3 mb-4">
          <div class="w-9 h-9 rounded-xl gradient-bg flex items-center justify-center shadow-md">
            <v-icon color="white" size="20">mdi-chart-line</v-icon>
          </div>
          <h1 class="text-xl font-extrabold gradient-text">Báo cáo tuần</h1>
        </div>

        <v-card class="pa-4 rounded-2xl">
          <div class="flex items-center justify-between mb-4">
            <div class="flex items-center gap-2">
              <v-icon color="primary">mdi-file-document-outline</v-icon>
              <span class="font-semibold text-sm">Lịch sử báo cáo</span>
            </div>
            <v-btn color="primary" @click="generateReport" :loading="generating" class="rounded-xl px-4">
              <v-icon size="18" class="mr-1">mdi-plus</v-icon>
              Tạo báo cáo
            </v-btn>
          </div>

          <v-data-table
            :headers="headers"
            :items="reports"
            :loading="loading"
            class="custom-table"
            hide-default-footer
          >
            <template v-slot:item.week_start="{ item }">
              <span class="text-sm font-medium">{{ formatDate(item.week_start) }}</span>
            </template>
            <template v-slot:item.week_end="{ item }">
              <span class="text-sm">{{ formatDate(item.week_end) }}</span>
            </template>
            <template v-slot:item.total_tasks="{ item }">
              <v-chip size="small" color="primary" variant="flat">{{ item.total_tasks }}</v-chip>
            </template>
            <template v-slot:item.completed_tasks="{ item }">
              <v-chip size="small" color="success" variant="flat">{{ item.completed_tasks }}</v-chip>
            </template>
            <template v-slot:item.overdue_tasks="{ item }">
              <v-chip size="small" color="error" variant="flat">{{ item.overdue_tasks }}</v-chip>
            </template>
            <template v-slot:item.actions="{ item }">
              <v-btn icon size="small" variant="text" color="primary" @click="viewReport(item)">
                <v-icon>mdi-eye</v-icon>
              </v-btn>
            </template>
            <template v-slot:no-data>
              <div class="text-center py-6 text-gray-400">
                <v-icon size="48" class="mb-2">mdi-file-document-outline</v-icon><br>
                Chưa có báo cáo nào
              </div>
            </template>
          </v-data-table>
        </v-card>
      </v-container>
    </div>

    <v-dialog v-model="detailDialog" max-width="600" transition="dialog-top-transition">
      <v-card class="rounded-2xl">
        <div class="pa-6">
          <div class="flex items-center gap-3 mb-4">
            <div class="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center shadow-md">
              <v-icon color="white">mdi-file-document-text</v-icon>
            </div>
            <div>
              <h2 class="font-bold text-lg">Chi tiết báo cáo</h2>
              <p class="text-xs text-gray-500" v-if="selectedReport">
                {{ formatDate(selectedReport.week_start) }} - {{ formatDate(selectedReport.week_end) }}
              </p>
            </div>
          </div>

          <div v-if="selectedReport" class="space-y-4">
            <div class="grid grid-cols-3 gap-3">
              <div class="bg-blue-50 rounded-xl p-3 text-center">
                <div class="text-xs text-gray-500 font-medium">Tổng task</div>
                <div class="text-xl font-extrabold text-primary mt-1">{{ selectedReport.total_tasks }}</div>
              </div>
              <div class="bg-green-50 rounded-xl p-3 text-center">
                <div class="text-xs text-gray-500 font-medium">Hoàn thành</div>
                <div class="text-xl font-extrabold text-green-600 mt-1">{{ selectedReport.completed_tasks }}</div>
              </div>
              <div class="bg-red-50 rounded-xl p-3 text-center">
                <div class="text-xs text-gray-500 font-medium">Quá hạn</div>
                <div class="text-xl font-extrabold text-red-600 mt-1">{{ selectedReport.overdue_tasks }}</div>
              </div>
            </div>

            <div v-if="selectedReport.ai_summary" class="bg-gray-50 rounded-xl p-4">
              <div class="flex items-center gap-2 mb-2">
                <v-icon color="accent" size="18">mdi-robot</v-icon>
                <span class="font-semibold text-sm">AI Summary</span>
              </div>
              <p class="text-sm text-gray-600 whitespace-pre-wrap">{{ selectedReport.ai_summary }}</p>
            </div>
          </div>

          <div class="flex justify-end mt-4">
            <v-btn variant="text" @click="detailDialog = false" class="rounded-xl">Đóng</v-btn>
          </div>
        </div>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import AppBar from '../components/AppBar.vue';
import { useReportStore } from '../stores/report';
import { useToast } from '../composables/useToast';

const reportStore = useReportStore();
const { show } = useToast();
const reports = ref([]);
const loading = ref(false);
const generating = ref(false);
const detailDialog = ref(false);
const selectedReport = ref(null);

const headers = [
  { title: 'Tuần bắt đầu', key: 'week_start', sortable: false },
  { title: 'Tuần kết thúc', key: 'week_end', sortable: false },
  { title: 'Tổng', key: 'total_tasks', sortable: false, align: 'center' },
  { title: 'Hoàn thành', key: 'completed_tasks', sortable: false, align: 'center' },
  { title: 'Quá hạn', key: 'overdue_tasks', sortable: false, align: 'center' },
  { title: '', key: 'actions', sortable: false, align: 'end' },
];

function formatDate(date) {
  if (!date) return '';
  return new Date(date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

async function loadReports() {
  loading.value = true;
  try {
    reports.value = await reportStore.fetchReports();
  } finally {
    loading.value = false;
  }
}

async function generateReport() {
  generating.value = true;
  try {
    await reportStore.generateReport();
    await loadReports();
    show('Đã tạo báo cáo mới', 'success');
  } catch (err) {
    show('Tạo báo cáo thất bại', 'error');
  } finally {
    generating.value = false;
  }
}

function viewReport(report) {
  selectedReport.value = report;
  detailDialog.value = true;
}

onMounted(() => loadReports());
</script>

<style scoped>
.app-content {
  padding-top: 64px;
}

.custom-table :deep(table) {
  border-collapse: separate;
  border-spacing: 0 4px;
}

.custom-table :deep(thead th) {
  background: #F8FAFC !important;
  color: #64748B !important;
  font-size: 0.75rem !important;
  font-weight: 600 !important;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 10px 16px !important;
  border-bottom: none !important;
}

.custom-table :deep(tbody td) {
  padding: 12px 16px !important;
  border-bottom: none !important;
  background: white;
}

.custom-table :deep(tbody tr) {
  box-shadow: 0 1px 3px rgba(0,0,0,0.03);
  border-radius: 12px;
}

.custom-table :deep(tbody tr:hover) {
  background: #F8FAFC !important;
}

.space-y-4 > * + * {
  margin-top: 1rem;
}

.grid {
  display: grid;
}
</style>
