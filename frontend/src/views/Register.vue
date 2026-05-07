<template>
  <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-700 to-primary-500">
    <v-card class="pa-8" width="450" elevation="10" rounded="xl">
      <div class="text-center mb-6">
        <h1 class="text-3xl font-bold gradient-text">Task Manager</h1>
        <p class="text-grey-darken-1 mt-2">Tạo tài khoản mới</p>
      </div>
      <v-form @submit.prevent="handleRegister">
        <v-text-field
          v-model="username"
          label="Tên đăng nhập"
          placeholder="Nhập tên đăng nhập"
          prepend-inner-icon="mdi-account"
          variant="outlined"
          required
        ></v-text-field>
        <v-text-field
          v-model="email"
          label="Email"
          type="email"
          placeholder="example@email.com"
          prepend-inner-icon="mdi-email"
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
          Đăng ký
        </v-btn>
        <div class="text-center mt-4">
          <router-link to="/login" class="text-primary-500">Đã có tài khoản? Đăng nhập</router-link>
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
const email = ref('');
const password = ref('');
const loading = ref(false);

async function handleRegister() {
  loading.value = true;
  try {
    await authStore.register(username.value, email.value, password.value);
  } catch (error) {
    alert(error.response?.data?.error || 'Đăng ký thất bại');
  } finally {
    loading.value = false;
  }
}
</script>