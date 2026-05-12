<template>
  <div>
    <AppBar />
    <div class="app-content">
      <v-container fluid class="pa-4 pt-2" style="max-width: 800px;">
        <div class="flex items-center gap-3 mb-4">
          <div class="w-9 h-9 rounded-xl gradient-bg flex items-center justify-center shadow-md">
            <v-icon color="white" size="20">mdi-checkbox-marked-circle-outline</v-icon>
          </div>
          <h1 class="text-xl font-extrabold gradient-text">Todo List</h1>
        </div>

        <!-- Quick Add -->
        <v-card class="pa-3 rounded-2xl mb-4">
          <form @submit.prevent="addTodo">
            <div class="flex items-center gap-2">
              <v-text-field
                v-model="newTodoTitle"
                placeholder="Nhập todo mới..."
                hide-details
                variant="solo-filled"
                flat
                density="compact"
                class="flex-grow-1"
              />
              <v-btn color="primary" type="submit" :disabled="!newTodoTitle.trim()" class="rounded-xl" min-width="100">
                <v-icon size="18" class="mr-1">mdi-plus</v-icon>
                Thêm
              </v-btn>
            </div>
            <div class="flex items-center gap-2 mt-2">
              <v-select
                v-model="newTodoCategoryId"
                :items="categories"
                item-title="name"
                item-value="id"
                label="Danh mục"
                hide-details
                variant="outlined"
                density="compact"
                clearable
                class="flex-grow-1"
              />
              <v-select
                v-model="newTodoSubcategoryId"
                :items="subcategories"
                item-title="name"
                item-value="id"
                label="Danh mục con"
                hide-details
                variant="outlined"
                density="compact"
                clearable
                :disabled="!newTodoCategoryId"
                class="flex-grow-1"
              />
            </div>
          </form>
        </v-card>

        <!-- Filter tabs -->
        <v-card class="pa-2 rounded-2xl mb-3">
          <div class="flex items-center justify-between px-2">
            <div class="flex items-center gap-2">
              <v-btn
                v-for="f in filters"
                :key="f.value"
                variant="text"
                size="small"
                class="rounded-lg"
                :class="{ 'filter-active': filter === f.value }"
                @click="filter = f.value"
              >
                {{ f.label }}
                <v-chip size="x-small" class="ml-1" variant="flat" color="gray">
                  {{ f.count }}
                </v-chip>
              </v-btn>
            </div>
            <div class="text-xs text-gray-400">
              {{ completedCount }}/{{ todos.length }} done
            </div>
          </div>
        </v-card>

        <!-- Todo List -->
        <div v-if="loading" class="text-center pa-8">
          <v-progress-circular indeterminate color="primary" />
        </div>

        <v-slide-y-transition v-else group>
          <v-card
            v-for="todo in filteredTodos"
            :key="todo.id"
            class="pa-3 rounded-2xl mb-2 hover-lift cursor-pointer"
            :class="{ 'todo-done': todo.is_done }"
            @click="openTodoModal(todo)"
          >
            <div class="flex items-center gap-3">
              <v-checkbox
                :model-value="!!todo.is_done"
                hide-details
                density="compact"
                color="success"
                class="mt-0"
                @click.stop
                @change="toggleTodo(todo)"
              />
              <div class="flex-grow-1 min-w-0">
                <div
                  class="text-sm font-medium truncate"
                  :class="{ 'line-through text-gray-400': todo.is_done }"
                >
                  {{ todo.title }}
                </div>
                <div class="flex items-center gap-2 mt-1">
                  <v-chip
                    v-if="todo.hash_task"
                    size="x-small"
                    variant="outlined"
                    color="primary"
                    class="font-mono font-bold"
                  >
                    <v-icon size="10" class="mr-0.5">mdi-pound</v-icon>
                    {{ todo.hash_task }}
                  </v-chip>
                  <v-chip
                    v-if="todo.category_name"
                    size="x-small"
                    variant="flat"
                    class="font-medium"
                    :color="todo.category_color || 'primary'"
                  >
                    {{ todo.category_name }}
                  </v-chip>
                  <v-chip
                    v-if="todo.subcategory_name"
                    size="x-small"
                    variant="outlined"
                    class="font-medium"
                    color="gray"
                  >
                    {{ todo.subcategory_name }}
                  </v-chip>
                  <v-chip
                    v-if="todo.priority"
                    size="x-small"
                    variant="flat"
                    :color="priorityColor(todo.priority)"
                    class="font-medium text-white"
                  >
                    {{ todo.priority === 'urgent' ? 'Urgent' : todo.priority === 'high' ? 'Cao' : todo.priority === 'medium' ? 'TB' : 'Thấp' }}
                  </v-chip>
                  <span class="text-xs text-gray-400">
                    {{ formatDate(todo.created_at) }}
                  </span>
                </div>
              </div>
              <v-btn
                icon
                variant="text"
                size="small"
                color="error"
                class="opacity-50 hover-opacity-100"
                @click.stop="deleteTodo(todo)"
              >
                <v-icon size="18">mdi-delete-outline</v-icon>
              </v-btn>
            </div>
          </v-card>
        </v-slide-y-transition>

        <!-- Empty state -->
        <div v-if="!loading && filteredTodos.length === 0" class="text-center pa-8">
          <v-icon size="48" class="mb-3" color="gray">mdi-checkbox-marked-circle-outline</v-icon>
          <div class="text-sm text-gray-400">
            <template v-if="filter === 'all'">Chưa có todo nào. Hãy thêm một công việc mới!</template>
            <template v-else-if="filter === 'active'">Không có todo nào đang active</template>
            <template v-else>Chưa có todo nào hoàn thành</template>
          </div>
        </div>
      </v-container>
    </div>

    <WorkItemModal v-model="modalVisible" :item="selectedTodo" item-type="todo" @saved="onTodoSaved" />
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import AppBar from '../components/AppBar.vue';
import WorkItemModal from '../components/WorkItemModal.vue';
import { useTodoStore } from '../stores/todo';
import { useCategoryStore } from '../stores/category';

const todoStore = useTodoStore();
const categoryStore = useCategoryStore();

const newTodoTitle = ref('');
const newTodoCategoryId = ref(null);
const newTodoSubcategoryId = ref(null);
const filter = ref('all');
const modalVisible = ref(false);
const selectedTodo = ref(null);

const categories = computed(() => categoryStore.categories);
const subcategories = computed(() => {
  const cat = categories.value.find(c => c.id === newTodoCategoryId.value);
  return cat?.subcategories || [];
});

const filters = computed(() => [
  { label: 'Tất cả', value: 'all', count: todos.value.length },
  { label: 'Cần làm', value: 'active', count: todos.value.filter(t => !t.is_done).length },
  { label: 'Hoàn thành', value: 'done', count: todos.value.filter(t => t.is_done).length },
]);

const todos = computed(() => todoStore.todos);
const loading = computed(() => todoStore.loading);

const filteredTodos = computed(() => {
  if (filter.value === 'active') return todos.value.filter(t => !t.is_done);
  if (filter.value === 'done') return todos.value.filter(t => t.is_done);
  return todos.value;
});

const completedCount = computed(() => todos.value.filter(t => t.is_done).length);

function priorityColor(priority) {
  const colors = { low: 'success', medium: 'info', high: 'warning', urgent: 'error' };
  return colors[priority] || 'default';
}

watch(newTodoCategoryId, () => {
  newTodoSubcategoryId.value = null;
});

function formatDate(date) {
  if (!date) return '';
  return new Date(date).toLocaleDateString('vi-VN', {
    hour: '2-digit', minute: '2-digit',
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

async function addTodo() {
  const title = newTodoTitle.value.trim();
  if (!title) return;
  await todoStore.createTodo(title, newTodoCategoryId.value, newTodoSubcategoryId.value);
  newTodoTitle.value = '';
  newTodoCategoryId.value = null;
  newTodoSubcategoryId.value = null;
}

async function toggleTodo(todo) {
  await todoStore.updateTodo(todo.id, { is_done: todo.is_done ? 0 : 1 });
}

async function deleteTodo(todo) {
  await todoStore.deleteTodo(todo.id);
}

function openTodoModal(todo) {
  selectedTodo.value = todo;
  modalVisible.value = true;
}

async function onTodoSaved() {
  await todoStore.fetchTodos();
}

onMounted(() => {
  categoryStore.fetchCategories();
  todoStore.fetchTodos();
});
</script>

<style scoped>
.app-content {
  padding-top: 64px;
}
.todo-done {
  opacity: 0.65;
}
.filter-active {
  background: rgba(30, 60, 114, 0.1) !important;
  color: #1E3C72 !important;
  font-weight: 600 !important;
}
.hover-opacity-100:hover {
  opacity: 1 !important;
}
</style>