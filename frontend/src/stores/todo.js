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
    async createTodo(title, category_id = null, subcategory_id = null, extra = {}) {
      const response = await axios.post('/todos', { title, category_id, subcategory_id, ...extra });
      await this.fetchTodos();
      return response.data.todo;
    },
    async updateTodo(todoId, updates) {
      const response = await axios.put(`/todos/${todoId}`, updates);
      await this.fetchTodos();
      return response.data.todo;
    },
    async moveTodo(todoId, status, boardPosition) {
      const response = await axios.patch(`/todos/${todoId}/move`, { status, board_position: boardPosition });
      await this.fetchTodos();
      return response.data.todo;
    },
    async deleteTodo(todoId) {
      await axios.delete(`/todos/${todoId}`);
      await this.fetchTodos();
    },
    async getTodoDetail(todoId) {
      const response = await axios.get(`/todos/${todoId}`);
      return response.data.todo;
    },
    async addComment(todoId, content, isAi = false) {
      const response = await axios.post(`/todos/${todoId}/comments`, { content, is_ai: isAi });
      return response.data.comment;
    },
    // Timer actions
    async timerStart(todoId) {
      const response = await axios.post(`/todos/${todoId}/timer/start`);
      return response.data.todo;
    },
    async timerPause(todoId) {
      const response = await axios.post(`/todos/${todoId}/timer/pause`);
      return response.data.todo;
    },
    async timerResume(todoId) {
      const response = await axios.post(`/todos/${todoId}/timer/resume`);
      return response.data.todo;
    },
    async timerStop(todoId) {
      const response = await axios.post(`/todos/${todoId}/timer/stop`);
      return response.data;
    },
  },
});