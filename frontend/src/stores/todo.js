import { defineStore } from 'pinia';
import axios from '../utils/axios';

export const useTodoStore = defineStore('todo', {
  state: () => ({
    todos: [],
    loading: false,
  }),
  actions: {
    async fetchTodos(category_id = null) {
      this.loading = true;
      try {
        const params = {};
        if (category_id) params.category_id = category_id;
        const response = await axios.get('/todos', { params });
        this.todos = response.data.todos;
        return response.data;
      } finally {
        this.loading = false;
      }
    },
    async createTodo(title, category_id = null, subcategory_id = null) {
      const response = await axios.post('/todos', { title, category_id, subcategory_id });
      await this.fetchTodos();
      return response.data.todo;
    },
    async updateTodo(todoId, updates) {
      const response = await axios.put(`/todos/${todoId}`, updates);
      await this.fetchTodos();
      return response.data.todo;
    },
    async deleteTodo(todoId) {
      await axios.delete(`/todos/${todoId}`);
      await this.fetchTodos();
    },
  },
});
