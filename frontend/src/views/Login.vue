<template>
  <div class="auth-page">
    <div class="auth-bg">
      <div class="auth-circle c1"></div>
      <div class="auth-circle c2"></div>
      <div class="auth-circle c3"></div>
    </div>
    <div class="auth-container">
      <div class="auth-card glass-strong">
        <div class="text-center mb-6">
          <div class="flex items-center justify-center gap-2 mb-3">
            <div class="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center shadow-lg shadow-blue-900/20">
              <v-icon color="white" size="24">mdi-checkbox-marked-circle-outline</v-icon>
            </div>
          </div>
          <h1 class="text-3xl font-extrabold gradient-text">Task Manager</h1>
          <p class="text-gray-500 mt-2 text-sm">Đăng nhập để tiếp tục</p>
        </div>
        <v-form @submit.prevent="handleLogin">
          <v-text-field
            v-model="username"
            label="Tên đăng nhập"
            placeholder="Nhập tên đăng nhập"
            prepend-inner-icon="mdi-account-outline"
            required
            class="mb-1"
            hide-details="auto"
          />
          <v-text-field
            v-model="password"
            label="Mật khẩu"
            type="password"
            placeholder="••••••••"
            prepend-inner-icon="mdi-lock-outline"
            required
            class="mb-1"
            hide-details="auto"
          />
          <v-btn
            type="submit"
            color="primary"
            block
            size="large"
            :loading="loading"
            class="mt-4 py-5 rounded-xl shadow-lg shadow-blue-900/20 hover:shadow-blue-900/30"
          >
            <span class="text-base">Đăng nhập</span>
          </v-btn>
        </v-form>
        <div class="text-center mt-6">
          <span class="text-gray-400 text-sm">Chưa có tài khoản? </span>
          <router-link to="/register" class="text-blue-600 font-semibold text-sm hover:text-blue-700 transition-colors">Đăng ký ngay</router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useAuthStore } from '../stores/auth';
import { useToast } from '../composables/useToast';

const authStore = useAuthStore();
const { show } = useToast();
const username = ref('');
const password = ref('');
const loading = ref(false);

async function handleLogin() {
  if (!username.value || !password.value) {
    show('Vui lòng nhập đầy đủ thông tin', 'warning');
    return;
  }
  loading.value = true;
  try {
    await authStore.login(username.value, password.value);
    show('Đăng nhập thành công!', 'success');
  } catch (error) {
    show(error.response?.data?.error || 'Đăng nhập thất bại', 'error');
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.auth-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #1a2744 100%);
}

.auth-bg {
  position: absolute;
  inset: 0;
  overflow: hidden;
}

.auth-circle {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.15;
}

.c1 {
  width: 600px;
  height: 600px;
  background: #3B82F6;
  top: -200px;
  right: -200px;
  animation: float 8s ease-in-out infinite;
}

.c2 {
  width: 500px;
  height: 500px;
  background: #8B5CF6;
  bottom: -150px;
  left: -150px;
  animation: float 6s ease-in-out infinite reverse;
}

.c3 {
  width: 300px;
  height: 300px;
  background: #06B6D4;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  animation: float 10s ease-in-out infinite;
}

@keyframes float {
  0%, 100% { transform: translate(0, 0) scale(1); }
  33% { transform: translate(30px, -30px) scale(1.05); }
  66% { transform: translate(-20px, 20px) scale(0.95); }
}

.auth-container {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 420px;
  padding: 20px;
}

.auth-card {
  padding: 40px 36px;
  animation: slideUp 0.5s ease-out;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
