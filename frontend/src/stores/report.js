import { defineStore } from 'pinia';
import axios from '../utils/axios';

export const useReportStore = defineStore('report', {
  state: () => ({
    reports: [],
    loading: false,
  }),
  actions: {
    async fetchReports() {
      this.loading = true;
      try {
        const response = await axios.get('/reports');
        this.reports = response.data.reports;
        return this.reports;
      } finally {
        this.loading = false;
      }
    },
    async generateReport() {
      const response = await axios.post('/reports/generate');
      await this.fetchReports();
      return response.data.report;
    },
    async getReportDetail(id) {
      const response = await axios.get(`/reports/${id}`);
      return response.data.report;
    },
  },
});