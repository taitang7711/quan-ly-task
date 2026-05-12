import { defineStore } from 'pinia';
import axios from '../utils/axios';

export const useCategoryStatusStore = defineStore('categoryStatus', {
  state: () => ({
    statuses: [],
    loading: false,
  }),
  actions: {
    async fetchStatuses(category_id) {
      if (!category_id) return [];
      this.loading = true;
      try {
        const response = await axios.get('/category-statuses', { params: { category_id } });
        this.statuses = response.data.statuses;
        return this.statuses;
      } finally {
        this.loading = false;
      }
    },
    async createStatus(data) {
      const response = await axios.post('/category-statuses', data);
      return response.data.status;
    },
    async updateStatus(id, data) {
      const response = await axios.put(`/category-statuses/${id}`, data);
      return response.data.status;
    },
    async deleteStatus(id) {
      await axios.delete(`/category-statuses/${id}`);
    },
  },
});
