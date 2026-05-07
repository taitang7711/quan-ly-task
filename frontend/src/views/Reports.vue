<template>
  <div>
    <AppBar />
    <v-container>
      <v-card class="pa-4">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-h5">Báo cáo tuần</h2>
          <v-btn color="primary" @click="generateReport" :loading="generating">
            Tạo báo cáo mới
          </v-btn>
        </div>
        <v-data-table :headers="headers" :items="reports" :loading="loading">
          <template v-slot:item.actions="{ item }">
            <v-btn icon size="small" @click="viewReport(item)">
              <v-icon>mdi-eye</v-icon>
            </v-btn>
          </template>
        </v-data-table>
      </v-card>
    </v-container>
    
    <!-- Report Detail Dialog -->
    <v-dialog v-model="detailDialog" max-width="800">
      <v-card>
        <v-card-title>Chi tiết báo cáo</v-card-title>
        <v-card-text>
          <div v-if="selectedReport">
            <p><strong>Tuần:</strong> {{ selectedReport.week_start }} - {{ selectedReport.week_end }}</p>
            <p><strong>Tổng task:</strong> {{ selectedReport.total_tasks }}</p>
            <p><strong>Hoàn thành:</strong> {{ selectedReport.completed_tasks }}</p>
            <p><strong>Quá hạn:</strong> {{ selectedReport.overdue_tasks }}</p>
            <p><strong>AI Summary:</strong> {{ selectedReport.ai_summary }}</p>
          </div>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn @click="detailDialog = false">Đóng</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import AppBar from '../components/AppBar.vue';
import { useReportStore } from '../stores/report';

const reportStore = useReportStore();
const reports = ref([]);
const loading = ref(false);
const generating = ref(false);
const detailDialog = ref(false);
const selectedReport = ref(null);

const headers = [
  { title: 'Tuần bắt đầu', key: 'week_start' },
  { title: 'Tuần kết thúc', key: 'week_end' },
  { title: 'Tổng task', key: 'total_tasks' },
  { title: 'Hoàn thành', key: 'completed_tasks' },
  { title: 'Quá hạn', key: 'overdue_tasks' },
  { title: 'Thao tác', key: 'actions', sortable: false },
];

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