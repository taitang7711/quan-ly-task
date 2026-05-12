<template>
  <div>
    <AppBar />
    <div class="app-content">
      <v-container fluid class="pa-4 pt-2">
        <!-- Category Tabs -->
        <v-card class="pa-3 mb-4 rounded-2xl glass-strong">
          <v-tabs v-model="activeCategory" color="primary" show-arrows class="category-tabs">
            <v-tab v-for="cat in categories" :key="cat.id" :value="cat.id" class="rounded-lg mx-1">
              <div class="flex items-center gap-2">
                <div class="w-2.5 h-2.5 rounded-full" :style="{ backgroundColor: cat.color }"></div>
                {{ cat.name }}
              </div>
            </v-tab>
          </v-tabs>
          <v-tabs v-if="selectedCategory" v-model="activeSubcategory" color="accent" show-arrows class="subcategory-tabs mt-1">
            <v-tab :value="null" class="rounded-lg mx-0.5 text-xs">Tất cả</v-tab>
            <v-tab
              v-for="sub in selectedCategory.subcategories"
              :key="sub.id"
              :value="sub.id"
              class="rounded-lg mx-0.5 text-xs"
            >
              {{ sub.name }}
            </v-tab>
          </v-tabs>
        </v-card>

        <!-- Kanban Board -->
        <div class="kanban-board-container overflow-x-auto pb-2">
          <div class="kanban-board flex gap-4" style="min-width: min-content;">
            <div
              v-for="column in columns"
              :key="column.status"
              class="kanban-column glass-strong w-80 flex-shrink-0 p-3 rounded-2xl"
            >
              <div class="flex items-center justify-between mb-4 px-1">
                <div class="flex items-center gap-2">
                  <div class="w-3 h-3 rounded-full" :style="{ backgroundColor: column.color }"></div>
                  <span class="font-bold text-sm" :style="{ color: column.color }">{{ column.title }}</span>
                </div>
                <div class="text-xs font-bold bg-gray-100 text-gray-600 rounded-full px-2.5 py-1">
                  {{ columnTasksCount[column.status] }}
                </div>
              </div>

              <draggable
                :list="localTasks[column.status]"
                group="tasks"
                item-key="id"
                @end="(evt) => onDragEnd(evt, column.status)"
                animation="250"
                class="min-h-[400px] space-y-3"
                ghost-class="dragging-ghost"
              >
                <template #item="{ element: task }">
                  <TaskCard :task="task" @click="openTaskModal(task)" />
                </template>
              </draggable>

              <div v-if="localTasks[column.status]?.length === 0" class="flex flex-col items-center justify-center py-10 text-gray-400">
                <v-icon size="36" class="mb-2">mdi-inbox-outline</v-icon>
                <span class="text-xs">Trống</span>
              </div>

              <!-- Inline quick add -->
              <div class="mt-2 px-1">
                <div v-if="showAddForm[column.status]" class="inline-add-form">
                  <v-text-field
                    v-model="newTaskTitle[column.status]"
                    placeholder="Nhập tiêu đề task..."
                    hide-details
                    variant="outlined"
                    density="compact"
                    @keyup.enter="quickAddTask(column.status)"
                    @keyup.escape="cancelAdd(column.status)"
                    autofocus
                  />
                  <div class="flex gap-1 mt-1">
                    <v-btn size="x-small" color="primary" @click="quickAddTask(column.status)" :loading="adding[column.status]">
                      <v-icon size="14" class="mr-0.5">mdi-plus</v-icon>
                      Thêm
                    </v-btn>
                    <v-btn size="x-small" variant="text" @click="cancelAdd(column.status)">
                      Hủy
                    </v-btn>
                  </div>
                </div>
                <v-btn
                  v-else
                  size="small"
                  variant="tonal"
                  block
                  class="mt-1 text-xs add-task-btn"
                  @click="showAddForm[column.status] = true"
                >
                  <v-icon size="14" class="mr-1">mdi-plus-circle-outline</v-icon>
                  Thêm nhanh
                </v-btn>
              </div>
            </div>
          </div>
        </div>
      </v-container>
    </div>

    <TaskModal v-model="taskModalVisible" :task="selectedTask" @saved="onTaskSaved" />

    <v-btn
      color="primary"
      size="large"
      class="fixed bottom-6 right-6 rounded-2xl shadow-xl shadow-blue-900/30 hover:shadow-blue-900/40 hover-lift"
      @click="openCreateModal"
    >
      <v-icon size="22">mdi-plus</v-icon>
      <span class="ml-2 hidden-sm-and-down text-sm font-semibold">Tạo task</span>
    </v-btn>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue';
import AppBar from '../components/AppBar.vue';
import TaskCard from '../components/TaskCard.vue';
import TaskModal from '../components/TaskModal.vue';
import draggable from 'vuedraggable';
import { useTaskStore } from '../stores/task';
import { useCategoryStore } from '../stores/category';
import { useToast } from '../composables/useToast';
import socket from '../utils/socket';

const taskStore = useTaskStore();
const categoryStore = useCategoryStore();
const { show } = useToast();
const categories = ref([]);
const activeCategory = ref(null);
const activeSubcategory = ref(null);
const taskModalVisible = ref(false);
const selectedTask = ref(null);

const localTasks = ref({
  todo: [],
  in_progress: [],
  review: [],
  done: []
});

const showAddForm = reactive({ todo: false, in_progress: false, review: false, done: false });
const newTaskTitle = reactive({ todo: '', in_progress: '', review: '', done: '' });
const adding = reactive({ todo: false, in_progress: false, review: false, done: false });

const columns = [
  { status: 'todo', title: 'Cần làm', color: '#1E3C72' },
  { status: 'in_progress', title: 'Đang làm', color: '#2A5298' },
  { status: 'review', title: 'Xem lại', color: '#5DADE2' },
  { status: 'done', title: 'Hoàn thành', color: '#10B981' },
];

const selectedCategory = computed(() => categories.value.find(c => c.id === activeCategory.value));

const columnTasksCount = computed(() => {
  const counts = {};
  for (const status of columns.map(c => c.status)) {
    counts[status] = localTasks.value[status]?.length || 0;
  }
  return counts;
});

function updateLocalTasks() {
  for (const status of columns.map(c => c.status)) {
    let tasks = taskStore.kanban[status] || [];
    if (activeCategory.value) {
      tasks = tasks.filter(t => t.category_id === activeCategory.value);
    }
    if (activeSubcategory.value) {
      tasks = tasks.filter(t => t.subcategory_id === activeSubcategory.value);
    }
    localTasks.value[status] = [...tasks];
  }
}

async function onDragEnd(event, newStatus) {
  const taskId = event.item.__draggable_context.element.id;
  if (!taskId) return;
  const newIndex = event.newIndex;
  let oldStatus = null;
  let oldTask = null;
  for (const status of columns.map(c => c.status)) {
    const task = localTasks.value[status].find(t => t.id === taskId);
    if (task) {
      oldStatus = status;
      oldTask = task;
      break;
    }
  }
  if (!oldTask) return;
  const oldList = localTasks.value[oldStatus];
  const oldIndex = oldList.findIndex(t => t.id === taskId);
  if (oldIndex !== -1) oldList.splice(oldIndex, 1);
  const newList = localTasks.value[newStatus];
  newList.splice(newIndex, 0, oldTask);
  updateLocalTasks();
  try {
    await taskStore.moveTask(taskId, newStatus, newIndex);
    show(`Đã di chuyển "${oldTask.title}"`, 'success');
    await loadData();
  } catch (err) {
    show('Di chuyển thất bại', 'error');
    await loadData();
  }
}

async function loadData() {
  await categoryStore.fetchCategories();
  categories.value = categoryStore.categories;
  if (categories.value.length && !activeCategory.value) {
    activeCategory.value = categories.value[0].id;
  }
  await taskStore.fetchTasks({ category_id: activeCategory.value });
  updateLocalTasks();
}

function openTaskModal(task = null) {
  selectedTask.value = task;
  taskModalVisible.value = true;
}

function openCreateModal() {
  selectedTask.value = null;
  taskModalVisible.value = true;
}

async function quickAddTask(status) {
  const title = newTaskTitle[status]?.trim();
  if (!title) return;
  adding[status] = true;
  try {
    await taskStore.createTask({
      title,
      status,
      category_id: activeCategory.value || null,
      subcategory_id: activeSubcategory.value || null,
    });
    newTaskTitle[status] = '';
    showAddForm[status] = false;
    updateLocalTasks();
    show(`Đã thêm "${title}"`, 'success');
  } catch (err) {
    show('Lỗi khi thêm task', 'error');
  } finally {
    adding[status] = false;
  }
}

function cancelAdd(status) {
  showAddForm[status] = false;
  newTaskTitle[status] = '';
}

async function onTaskSaved() {
  await loadData();
}

socket.on('task_updated', () => loadData());
socket.on('task_created', () => loadData());
socket.on('task_deleted', () => loadData());

onMounted(() => {
  loadData();
});

watch(activeCategory, () => loadData());
watch(activeSubcategory, () => updateLocalTasks());
</script>

<style scoped>
.app-content {
  padding-top: 64px;
}

.kanban-board-container {
  scrollbar-width: thin;
}

.kanban-column {
  transition: all 0.2s ease;
  max-height: calc(100vh - 280px);
  overflow-y: auto;
}

.kanban-column::-webkit-scrollbar {
  width: 4px;
}

.kanban-column::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.08);
  border-radius: 10px;
}

.kanban-column::-webkit-scrollbar-track {
  background: transparent;
}

:deep(.dragging-ghost) {
  opacity: 0.4;
  transform: rotate(2deg);
}

:deep(.sortable-chosen) {
  transform: scale(1.02);
}

:deep(.sortable-ghost) {
  opacity: 0.3;
}

.add-task-btn {
  opacity: 0.6;
  transition: opacity 0.2s;
}
.add-task-btn:hover {
  opacity: 1;
}

.category-tabs :deep(.v-tab) {
  text-transform: none !important;
  font-weight: 500;
  letter-spacing: normal;
}

.subcategory-tabs :deep(.v-tab) {
  text-transform: none !important;
  font-weight: 400;
  letter-spacing: normal;
  min-width: unset;
}
</style>
