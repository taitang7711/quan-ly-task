import { defineStore } from 'pinia';
import axios from '../utils/axios';

export const useTodoStore = defineStore('todo', {
  state: () => ({
    todos: [],
    loading: false,
  }),
  actions: {
    async fetchTodos() {
      this.loading = true;
      try {
        const response = await axios.get('/todos');
        this.todos = response.data.todos;
        return response.data;
      } finally {
        this.loading = false;
      }
    },
    async createTodo(title) {
      const response = await axios.post('/todos', { title });
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
