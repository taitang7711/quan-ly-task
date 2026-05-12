import { defineStore } from 'pinia';
import axios from '../utils/axios';

export const useTaskStore = defineStore('task', {
  state: () => ({
    tasks: [],
    kanban: {},
    loading: false,
  }),
  actions: {
    async fetchTasks(filter = {}) {
      this.loading = true;
      try {
        const params = new URLSearchParams(filter).toString();
        const response = await axios.get(`/tasks?${params}`);
        this.tasks = response.data.tasks;
        this.kanban = response.data.kanban;
        return response.data;
      } finally {
        this.loading = false;
      }
    },
    async createTask(taskData) {
      const response = await axios.post('/tasks', taskData);
      await this.fetchTasks();
      return response.data.task;
    },
    async updateTask(taskId, updates) {
      const response = await axios.put(`/tasks/${taskId}`, updates);
      await this.fetchTasks();
      return response.data.task;
    },
    async moveTask(taskId, status, boardPosition) {
      const response = await axios.patch(`/tasks/${taskId}/move`, { status, board_position: boardPosition });
      await this.fetchTasks();
      return response.data.task;
    },
    async deleteTask(taskId) {
      await axios.delete(`/tasks/${taskId}`);
      await this.fetchTasks();
    },
    async addComment(taskId, content, isAi = false) {
      const response = await axios.post(`/tasks/${taskId}/comments`, { content, is_ai: isAi });
      return response.data.comment;
    },
    async getTaskDetail(taskId) {
      const response = await axios.get(`/tasks/${taskId}`);
      return response.data.task;
    },
    async getStats() {
      const response = await axios.get('/tasks/stats/summary');
      return response.data;
    },
    // Timer actions
    async timerStart(taskId) {
      const response = await axios.post(`/tasks/${taskId}/timer/start`);
      return response.data.task;
    },
    async timerPause(taskId) {
      const response = await axios.post(`/tasks/${taskId}/timer/pause`);
      return response.data.task;
    },
    async timerResume(taskId) {
      const response = await axios.post(`/tasks/${taskId}/timer/resume`);
      return response.data.task;
    },
    async timerStop(taskId) {
      const response = await axios.post(`/tasks/${taskId}/timer/stop`);
      return response.data;
    },
  },
});