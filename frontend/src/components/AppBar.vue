<template>
  <div>
    <!-- Desktop App Bar -->
    <v-app-bar color="primary" dark class="hidden-sm-and-down">
      <v-app-bar-title class="font-bold">✨ Task Manager</v-app-bar-title>
      <v-spacer></v-spacer>
      <v-btn to="/" text>Dashboard</v-btn>
      <v-btn to="/kanban" text>Kanban</v-btn>
      <v-btn to="/reports" text>Báo cáo</v-btn>
      <v-btn to="/settings" text>Cài đặt AI</v-btn>
      <v-btn @click="openCategoryManager" text>Quản lý</v-btn>

      <v-text-field
        v-model="searchQuery"
        density="compact"
        placeholder="Tìm kiếm task..."
        hide-details
        single-line
        clearable
        class="ml-4 mr-4"
        style="max-width: 250px;"
        @click:clear="clearSearch"
        @keyup.enter="onSearch"
      ></v-text-field>

      <v-menu offset-y>
        <template v-slot:activator="{ props }">
          <v-btn v-bind="props" text class="ml-2">
            <v-avatar size="32" color="white" class="mr-2">
              <span class="text-primary font-bold">{{ userInitials }}</span>
            </v-avatar>
            {{ user?.username }}
          </v-btn>
        </template>
        <v-list>
          <v-list-item @click="logout">
            <v-list-item-title>Đăng xuất</v-list-item-title>
          </v-list-item>
        </v-list>
      </v-menu>
    </v-app-bar>

    <!-- Mobile App Bar with Drawer -->
    <v-app-bar color="primary" dark class="hidden-md-and-up">
      <v-app-bar-nav-icon @click="drawer = !drawer"></v-app-bar-nav-icon>
      <v-app-bar-title class="font-bold">✨ Task Manager</v-app-bar-title>
      <v-spacer></v-spacer>
      <v-btn icon @click="openSearchDialog">
        <v-icon>mdi-magnify</v-icon>
      </v-btn>
    </v-app-bar>

    <!-- Mobile Navigation Drawer -->
    <v-navigation-drawer v-model="drawer" temporary location="left">
      <v-list>
        <v-list-item>
          <template v-slot:prepend>
            <v-avatar color="primary" class="text-white">
              <span>{{ userInitials }}</span>
            </v-avatar>
          </template>
          <v-list-item-title class="font-bold">{{ user?.username }}</v-list-item-title>
          <v-list-item-subtitle>{{ user?.email }}</v-list-item-subtitle>
        </v-list-item>
      </v-list>
      <v-divider></v-divider>
      <v-list>
        <v-list-item to="/" @click="drawer = false">
          <template v-slot:prepend>
            <v-icon>mdi-view-dashboard</v-icon>
          </template>
          <v-list-item-title>Dashboard</v-list-item-title>
        </v-list-item>
        <v-list-item to="/kanban" @click="drawer = false">
          <template v-slot:prepend>
            <v-icon>mdi-view-column</v-icon>
          </template>
          <v-list-item-title>Kanban</v-list-item-title>
        </v-list-item>
        <v-list-item to="/reports" @click="drawer = false">
          <template v-slot:prepend>
            <v-icon>mdi-chart-line</v-icon>
          </template>
          <v-list-item-title>Báo cáo</v-list-item-title>
        </v-list-item>
        <v-list-item to="/settings" @click="drawer = false">
          <template v-slot:prepend>
            <v-icon>mdi-cog</v-icon>
          </template>
          <v-list-item-title>Cài đặt AI</v-list-item-title>
        </v-list-item>
        <v-list-item @click="openCategoryManager">
          <template v-slot:prepend>
            <v-icon>mdi-folder</v-icon>
          </template>
          <v-list-item-title>Quản lý danh mục</v-list-item-title>
        </v-list-item>
        <v-list-item @click="logout">
          <template v-slot:prepend>
            <v-icon>mdi-logout</v-icon>
          </template>
          <v-list-item-title>Đăng xuất</v-list-item-title>
        </v-list-item>
      </v-list>
    </v-navigation-drawer>

    <!-- Mobile Search Dialog -->
    <v-dialog v-model="searchDialog" max-width="400">
      <v-card>
        <v-card-title>Tìm kiếm task</v-card-title>
        <v-card-text>
          <v-text-field
            v-model="searchQuery"
            label="Nhập từ khóa..."
            hide-details
            clearable
            autofocus
            @click:clear="clearSearch"
            @keyup.enter="onSearchMobile"
          ></v-text-field>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn text @click="searchDialog = false">Hủy</v-btn>
          <v-btn color="primary" @click="onSearchMobile">Tìm kiếm</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <CategoryManager v-model="showCategoryManager" @updated="onCategoryUpdated" />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useAuthStore } from '../stores/auth';
import { useTaskStore } from '../stores/task';
import CategoryManager from './CategoryManager.vue';

const authStore = useAuthStore();
const taskStore = useTaskStore();
const user = computed(() => authStore.user);
const showCategoryManager = ref(false);
const searchQuery = ref('');
const drawer = ref(false);
const searchDialog = ref(false);

const userInitials = computed(() => {
  if (!user.value?.username) return 'U';
  return user.value.username.slice(0, 2).toUpperCase();
});

async function logout() {
  await authStore.logout();
}

function openCategoryManager() {
  showCategoryManager.value = true;
}

function onSearch() {
  if (searchQuery.value.trim()) {
    taskStore.fetchTasks({ search: searchQuery.value });
  } else {
    taskStore.fetchTasks();
  }
}

function clearSearch() {
  searchQuery.value = '';
  taskStore.fetchTasks();
}

function onSearchMobile() {
  onSearch();
  searchDialog.value = false;
}

function openSearchDialog() {
  searchDialog.value = true;
}

function onCategoryUpdated() {
  taskStore.fetchTasks();
}
</script>

<style scoped>
/* Smooth transition for drawer */
.v-navigation-drawer {
  transition: transform 0.2s ease-in-out;
}
</style>