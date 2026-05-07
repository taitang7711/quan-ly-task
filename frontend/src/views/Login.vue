<template>
  <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-700 to-primary-500">
    <v-card class="pa-8" width="450" elevation="10" rounded="xl">
      <div class="text-center mb-6">
        <h1 class="text-3xl font-bold gradient-text">Task Manager</h1>
        <p class="text-grey-darken-1 mt-2">Đăng nhập để tiếp tục</p>
      </div>
      <v-form @submit.prevent="handleLogin">
        <v-text-field
          v-model="username"
          label="Tên đăng nhập hoặc Email"
          placeholder="Nhập tên đăng nhập hoặc email"
          prepend-inner-icon="mdi-account"
          variant="outlined"
          required
        ></v-text-field>
        <v-text-field
          v-model="password"
          label="Mật khẩu"
          type="password"
          placeholder="Nhập mật khẩu"
          prepend-inner-icon="mdi-lock"
          variant="outlined"
          required
        ></v-text-field>
        <v-btn
          type="submit"
          color="primary"
          block
          size="large"
          :loading="loading"
          class="mt-4"
        >
          Đăng nhập
        </v-btn>
        <div class="text-center mt-4">
          <router-link to="/register" class="text-primary-500">Chưa có tài khoản? Đăng ký</router-link>
        </div>
      </v-form>
    </v-card>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useAuthStore } from '../stores/auth';

const authStore = useAuthStore();
const username = ref('');
const password = ref('');
const loading = ref(false);

async function handleLogin() {
  loading.value = true;
  try {
    await authStore.login(username.value, password.value);
  } catch (error) {
    alert(error.response?.data?.error || 'Đăng nhập thất bại');
  } finally {
    loading.value = false;
  }
}
</script>