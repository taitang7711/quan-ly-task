import { defineStore } from 'pinia';
import axios from '../utils/axios';

export const useCategoryStore = defineStore('category', {
  state: () => ({
    categories: [],
    loading: false,
  }),
  getters: {
    getCategoryById: (state) => (id) => state.categories.find(c => c.id === id),
  },
  actions: {
    async fetchCategories() {
      this.loading = true;
      try {
        const response = await axios.get('/categories');
        this.categories = response.data.categories;
        return this.categories;
      } finally {
        this.loading = false;
      }
    },
    async createCategory(data) {
      const response = await axios.post('/categories', data);
      await this.fetchCategories();
      return response.data.category;
    },
    async updateCategory(id, data) {
      const response = await axios.put(`/categories/${id}`, data);
      await this.fetchCategories();
      return response.data.category;
    },
    async deleteCategory(id) {
      await axios.delete(`/categories/${id}`);
      await this.fetchCategories();
    },
  },
});