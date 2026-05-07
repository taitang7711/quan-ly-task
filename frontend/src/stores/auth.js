import { defineStore } from 'pinia';
import axios from '../utils/axios';
import router from '../router';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
    token: localStorage.getItem('token') || null,
  }),
  getters: {
    isAuthenticated: (state) => !!state.token,
    currentUser: (state) => state.user,
  },
  actions: {
    async register(username, email, password) {
      const response = await axios.post('/auth/register', { username, email, password });
      this.token = response.data.token;
      this.user = response.data.user;
      localStorage.setItem('token', this.token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${this.token}`;
      router.push('/');
      return response.data;
    },
    async login(username, password) {
      const response = await axios.post('/auth/login', { username, password });
      this.token = response.data.token;
      this.user = response.data.user;
      localStorage.setItem('token', this.token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${this.token}`;
      router.push('/kanban');
      return response.data;
    },
    async logout() {
      this.token = null;
      this.user = null;
      localStorage.removeItem('token');
      delete axios.defaults.headers.common['Authorization'];
      router.push('/login');
    },
    async fetchMe() {
      if (!this.token) return;
      const response = await axios.get('/auth/me');
      this.user = response.data.user;
    },
  },
});