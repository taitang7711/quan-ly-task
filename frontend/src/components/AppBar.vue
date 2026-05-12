<template>
  <div>
    <v-app-bar flat class="appbar glass-strong border-b border-gray-100/50">
      <template v-slot:prepend>
        <v-app-bar-nav-icon @click="drawer = !drawer" class="d-md-none" />
      </template>

      <div class="flex items-center gap-2">
        <div class="w-8 h-8 rounded-lg gradient-bg flex items-center justify-center shadow-md shadow-blue-900/20">
          <v-icon color="white" size="18">mdi-checkbox-marked-circle-outline</v-icon>
        </div>
        <v-app-bar-title class="font-bold text-lg gradient-text">Task Manager</v-app-bar-title>
      </div>

      <v-spacer />

      <div class="hidden-sm-and-down flex items-center gap-1">
        <v-btn to="/" variant="text" class="nav-btn" :class="{ 'nav-active': $route.path === '/' }">
          <v-icon size="18" class="mr-1">mdi-view-dashboard-outline</v-icon>
          Dashboard
        </v-btn>
        <v-btn to="/todos" variant="text" class="nav-btn" :class="{ 'nav-active': $route.path === '/todos' }">
          <v-icon size="18" class="mr-1">mdi-checkbox-marked-circle-outline</v-icon>
          Todo
        </v-btn>
        <v-btn to="/kanban" variant="text" class="nav-btn" :class="{ 'nav-active': $route.path === '/kanban' }">
          <v-icon size="18" class="mr-1">mdi-view-column-outline</v-icon>
          Kanban
        </v-btn>
        <v-btn to="/reports" variant="text" class="nav-btn" :class="{ 'nav-active': $route.path === '/reports' }">
          <v-icon size="18" class="mr-1">mdi-chart-line</v-icon>
          Báo cáo
        </v-btn>
        <v-btn to="/settings" variant="text" class="nav-btn" :class="{ 'nav-active': $route.path === '/settings' }">
          <v-icon size="18" class="mr-1">mdi-cog-outline</v-icon>
          AI
        </v-btn>
        <v-btn variant="text" class="nav-btn" @click="openCategoryManager">
          <v-icon size="18" class="mr-1">mdi-folder-outline</v-icon>
          Quản lý
        </v-btn>
      </div>

      <div class="hidden-sm-and-down mx-4">
        <v-text-field
          v-model="searchQuery"
          density="compact"
          placeholder="Tìm kiếm task..."
          hide-details
          single-line
          clearable
          prepend-inner-icon="mdi-magnify"
          variant="solo-filled"
          flat
          bg-color="gray-100"
          class="search-field"
          style="max-width: 240px;"
          @click:clear="clearSearch"
          @keyup.enter="onSearch"
        />
      </div>

      <v-menu offset-y transition="slide-y-transition">
        <template v-slot:activator="{ props }">
          <v-btn v-bind="props" variant="text" class="profile-btn">
            <v-avatar size="32" color="primary" class="mr-2">
              <span class="text-white text-xs font-bold">{{ userInitials }}</span>
            </v-avatar>
            <span class="hidden-sm-and-down text-sm font-medium">{{ user?.username }}</span>
          </v-btn>
        </template>
        <v-list class="py-1" min-width="180">
          <v-list-item class="mb-1">
            <template v-slot:prepend>
              <v-avatar size="36" color="primary" class="text-white">
                <span class="text-sm font-bold">{{ userInitials }}</span>
              </v-avatar>
            </template>
            <v-list-item-title class="font-semibold text-sm">{{ user?.username }}</v-list-item-title>
            <v-list-item-subtitle class="text-xs">{{ user?.email }}</v-list-item-subtitle>
          </v-list-item>
          <v-divider class="my-1" />
          <v-list-item @click="logout" color="error" class="rounded-lg mx-1">
            <template v-slot:prepend>
              <v-icon color="error" size="20">mdi-logout</v-icon>
            </template>
            <v-list-item-title class="text-sm text-red-600">Đăng xuất</v-list-item-title>
          </v-list-item>
        </v-list>
      </v-menu>
    </v-app-bar>

    <v-navigation-drawer v-model="drawer" temporary location="left" class="rounded-r-2xl">
      <div class="pa-4">
        <div class="flex items-center gap-3 mb-6">
          <v-avatar size="44" color="primary" class="text-white shadow-md">
            <span class="text-base font-bold">{{ userInitials }}</span>
          </v-avatar>
          <div>
            <div class="font-bold text-sm">{{ user?.username }}</div>
            <div class="text-xs text-gray-500">{{ user?.email }}</div>
          </div>
        </div>
        <v-divider />
      </div>
      <v-list nav density="compact">
        <v-list-item to="/" @click="drawer = false" class="rounded-lg mb-1">
          <template v-slot:prepend><v-icon>mdi-view-dashboard-outline</v-icon></template>
          <v-list-item-title>Dashboard</v-list-item-title>
        </v-list-item>
        <v-list-item to="/todos" @click="drawer = false" class="rounded-lg mb-1">
          <template v-slot:prepend><v-icon>mdi-checkbox-marked-circle-outline</v-icon></template>
          <v-list-item-title>Todo</v-list-item-title>
        </v-list-item>
        <v-list-item to="/kanban" @click="drawer = false" class="rounded-lg mb-1">
          <template v-slot:prepend><v-icon>mdi-view-column-outline</v-icon></template>
          <v-list-item-title>Kanban</v-list-item-title>
        </v-list-item>
        <v-list-item to="/reports" @click="drawer = false" class="rounded-lg mb-1">
          <template v-slot:prepend><v-icon>mdi-chart-line</v-icon></template>
          <v-list-item-title>Báo cáo</v-list-item-title>
        </v-list-item>
        <v-list-item to="/settings" @click="drawer = false" class="rounded-lg mb-1">
          <template v-slot:prepend><v-icon>mdi-cog-outline</v-icon></template>
          <v-list-item-title>Cài đặt AI</v-list-item-title>
        </v-list-item>
        <v-list-item @click="openCategoryManager" class="rounded-lg mb-1">
          <template v-slot:prepend><v-icon>mdi-folder-outline</v-icon></template>
          <v-list-item-title>Quản lý danh mục</v-list-item-title>
        </v-list-item>
        <v-divider class="my-2" />
        <v-list-item @click="logout" class="rounded-lg text-red-600">
          <template v-slot:prepend><v-icon color="error">mdi-logout</v-icon></template>
          <v-list-item-title class="text-red-600">Đăng xuất</v-list-item-title>
        </v-list-item>
      </v-list>
    </v-navigation-drawer>

    <v-dialog v-model="searchDialog" max-width="500" transition="dialog-top-transition">
      <v-card class="pa-4 rounded-2xl">
        <div class="flex items-center gap-3 mb-4">
          <v-icon color="primary">mdi-magnify</v-icon>
          <span class="font-bold text-lg">Tìm kiếm task</span>
        </div>
        <v-text-field
          v-model="searchQuery"
          placeholder="Nhập từ khóa..."
          hide-details
          clearable
          autofocus
          variant="outlined"
          prepend-inner-icon="mdi-magnify"
          @click:clear="clearSearch"
          @keyup.enter="onSearchMobile"
        />
        <div class="flex justify-end gap-2 mt-4">
          <v-btn variant="text" @click="searchDialog = false">Hủy</v-btn>
          <v-btn color="primary" @click="onSearchMobile">Tìm kiếm</v-btn>
        </div>
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
.appbar {
  transition: box-shadow 0.2s ease;
}

.nav-btn {
  border-radius: 10px !important;
  padding: 0 14px !important;
  font-size: 0.875rem !important;
  font-weight: 500 !important;
  transition: all 0.2s ease !important;
}

.nav-btn:hover {
  background: rgba(30, 60, 114, 0.06) !important;
}

.nav-active {
  background: rgba(30, 60, 114, 0.1) !important;
  color: #1E3C72 !important;
  font-weight: 600 !important;
}

.profile-btn {
  border-radius: 12px !important;
  transition: all 0.2s ease !important;
}

.profile-btn:hover {
  background: rgba(30, 60, 114, 0.06) !important;
}

.search-field :deep(.v-field) {
  border-radius: 12px !important;
  box-shadow: none !important;
}
</style>
