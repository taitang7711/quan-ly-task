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
              :key="column.name"
              class="kanban-column glass-strong w-80 flex-shrink-0 p-3 rounded-2xl"
            >
              <div class="flex items-center justify-between mb-4 px-1">
                <div class="flex items-center gap-2">
                  <div class="w-3 h-3 rounded-full" :style="{ backgroundColor: column.color }"></div>
                  <span class="font-bold text-sm" :style="{ color: column.color }">{{ column.title }}</span>
                </div>
                <div class="text-xs font-bold bg-gray-100 text-gray-600 rounded-full px-2.5 py-1">
                  {{ columnTasksCount(column.name) }}
                </div>
              </div>

              <draggable
                :list="getColumnList(column.name)"
                group="tasks"
                item-key="id"
                @end="(evt) => onDragEnd(evt, column.name)"
                animation="250"
                class="min-h-[400px] space-y-3"
                ghost-class="dragging-ghost"
              >
                <template #item="{ element: item }">
                  <TaskCard
                    v-if="item.__type === 'task'"
                    :task="item"
                    @click="openTaskModal(item)"
                  />
                  <v-card
                    v-else
                    class="pa-3 rounded-xl hover-lift cursor-pointer"
                    @click="openTaskModal(item)"
                  >
                    <div class="flex items-center gap-2">
                      <v-icon size="16" color="primary">mdi-checkbox-marked-circle-outline</v-icon>
                      <div>
                        <div class="text-sm font-medium">{{ item.title }}</div>
                        <div class="text-xs text-gray-400 mt-0.5">Todo • {{ formatDate(item.created_at) }}</div>
                      </div>
                    </div>
                  </v-card>
                </template>
              </draggable>

              <div v-if="getColumnList(column.name)?.length === 0" class="flex flex-col items-center justify-center py-10 text-gray-400">
                <v-icon size="36" class="mb-2">mdi-inbox-outline</v-icon>
                <span class="text-xs">Trống</span>
              </div>

              <!-- Inline quick add (tạo task) -->
              <div class="mt-2 px-1">
                <div v-if="showAddForm[column.name]" class="inline-add-form">
                  <v-text-field
                    v-model="newTaskTitle[column.name]"
                    placeholder="Nhập tiêu đề task..."
                    hide-details
                    variant="outlined"
                    density="compact"
                    @keyup.enter="quickAddTask(column.name)"
                    @keyup.escape="cancelAdd(column.name)"
                    autofocus
                  />
                  <div class="flex gap-1 mt-1">
                    <v-btn size="x-small" color="primary" @click="quickAddTask(column.name)" :loading="adding[column.name]">
                      <v-icon size="14" class="mr-0.5">mdi-plus</v-icon>
                      Thêm
                    </v-btn>
                    <v-btn size="x-small" variant="text" @click="cancelAdd(column.name)">
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
                  @click="showAddForm[column.name] = true"
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
import { useTodoStore } from '../stores/todo';
import { useCategoryStore } from '../stores/category';
import { useToast } from '../composables/useToast';
import socket from '../utils/socket';

const taskStore = useTaskStore();
const todoStore = useTodoStore();
const categoryStore = useCategoryStore();
const { show } = useToast();

const categories = ref([]);
const activeCategory = ref(null);
const activeSubcategory = ref(null);
const taskModalVisible = ref(false);
const selectedTask = ref(null);

// Dynamic columns - built from category_statuses
const columns = ref([]);
const localLists = reactive({});

const showAddForm = reactive({});
const newTaskTitle = reactive({});
const adding = reactive({});

const selectedCategory = computed(() => categories.value.find(c => c.id === activeCategory.value));

function initReactiveForStatuses(statuses) {
  for (const s of statuses) {
    if (!(s.name in localLists)) {
      localLists[s.name] = [];
    }
    if (!(s.name in showAddForm)) {
      showAddForm[s.name] = false;
    }
    if (!(s.name in newTaskTitle)) {
      newTaskTitle[s.name] = '';
    }
    if (!(s.name in adding)) {
      adding[s.name] = false;
    }
  }
}

function getColumnList(statusName) {
  return localLists[statusName] || [];
}

function columnTasksCount(statusName) {
  return getColumnList(statusName)?.length || 0;
}

function formatDate(date) {
  if (!date) return '';
  return new Date(date).toLocaleDateString('vi-VN', {
    hour: '2-digit', minute: '2-digit',
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

function updateLocalLists() {
  const cat = selectedCategory.value;
  const statuses = cat?.statuses || [];
  if (statuses.length === 0) return;

  columns.value = statuses.map(s => ({
    name: s.name,
    title: s.name,
    color: s.color,
  }));

  initReactiveForStatuses(statuses);

  // Reset all lists
  for (const s of statuses) {
    localLists[s.name] = [];
  }

  // Add tasks
  const kanbanTasks = taskStore.kanban || {};
  for (const [statusKey, tasks] of Object.entries(kanbanTasks)) {
    let filtered = tasks || [];
    if (activeCategory.value) {
      filtered = filtered.filter(t => t.category_id === activeCategory.value);
    }
    if (activeSubcategory.value) {
      filtered = filtered.filter(t => t.subcategory_id === activeSubcategory.value);
    }
    // Find matching column by status key (exact match or fallback)
    const matchedColumn = statuses.find(s => s.name === statusKey);
    if (matchedColumn) {
      localLists[matchedColumn.name] = [
        ...(localLists[matchedColumn.name] || []),
        ...filtered.map(t => ({ ...t, __type: 'task' })),
      ];
    }
  }

  // Add todos that have this category
  const allTodos = todoStore.todos || [];
  let filteredTodos = allTodos;
  if (activeCategory.value) {
    filteredTodos = filteredTodos.filter(t => t.category_id === activeCategory.value);
  }
  if (activeSubcategory.value) {
    filteredTodos = filteredTodos.filter(t => t.subcategory_id === activeSubcategory.value);
  }
  // Put unassigned todos (is_done=false) in first column, done todos in "Hoàn thành" column
  for (const todo of filteredTodos) {
    if (todo.is_done) {
      const doneColumn = statuses.find(s => s.name === 'Hoàn thành');
      if (doneColumn) {
        localLists[doneColumn.name] = [
          ...(localLists[doneColumn.name] || []),
          { ...todo, __type: 'todo', status: 'Hoàn thành' },
        ];
      }
    } else {
      const firstColumn = statuses[0];
      if (firstColumn) {
        localLists[firstColumn.name] = [
          ...(localLists[firstColumn.name] || []),
          { ...todo, __type: 'todo', status: firstColumn.name },
        ];
      }
    }
  }
}

async function onDragEnd(event, newStatusName) {
  const itemId = event.item.__draggable_context.element.id;
  const itemType = event.item.__draggable_context.element.__type;
  if (!itemId) return;
  const newIndex = event.newIndex;

  const list = localLists[newStatusName] || [];
  const item = list.find(i => i.id === itemId);
  if (!item) return;

  if (itemType === 'task') {
    try {
      await taskStore.moveTask(itemId, newStatusName, newIndex);
      show(`Đã di chuyển "${item.title}"`, 'success');
      await loadData();
    } catch (err) {
      show('Di chuyển thất bại', 'error');
      await loadData();
    }
  } else if (itemType === 'todo') {
    const isDone = newStatusName === 'Hoàn thành';
    try {
      await todoStore.updateTodo(itemId, { is_done: isDone ? 1 : 0 });
      show(`Đã cập nhật todo "${item.title}"`, 'success');
      await loadData();
    } catch (err) {
      show('Cập nhật todo thất bại', 'error');
      await loadData();
    }
  }
}

async function loadData() {
  await categoryStore.fetchCategories();
  categories.value = categoryStore.categories;
  if (categories.value.length && !activeCategory.value) {
    activeCategory.value = categories.value[0].id;
  }
  await Promise.all([
    taskStore.fetchTasks({ category_id: activeCategory.value }),
    todoStore.fetchTodos(activeCategory.value),
  ]);
  updateLocalLists();
}

function openTaskModal(item = null) {
  if (item?.__type === 'todo') return; // cannot edit todo in task modal
  selectedTask.value = item;
  taskModalVisible.value = true;
}

function openCreateModal() {
  selectedTask.value = null;
  taskModalVisible.value = true;
}

async function quickAddTask(statusName) {
  const title = newTaskTitle[statusName]?.trim();
  if (!title) return;
  adding[statusName] = true;
  try {
    await taskStore.createTask({
      title,
      status: statusName,
      category_id: activeCategory.value || null,
      subcategory_id: activeSubcategory.value || null,
    });
    newTaskTitle[statusName] = '';
    showAddForm[statusName] = false;
    show(`Đã thêm "${title}"`, 'success');
    await loadData();
  } catch (err) {
    show('Lỗi khi thêm task', 'error');
  } finally {
    adding[statusName] = false;
  }
}

function cancelAdd(statusName) {
  showAddForm[statusName] = false;
  newTaskTitle[statusName] = '';
}

async function onTaskSaved() {
  await loadData();
}

socket.on('task_updated', () => loadData());
socket.on('task_created', () => loadData());
socket.on('task_deleted', () => loadData());
socket.on('category_status_created', () => loadData());
socket.on('category_status_updated', () => loadData());
socket.on('category_status_deleted', () => loadData());

onMounted(() => {
  loadData();
});

watch(activeCategory, () => loadData());
watch(activeSubcategory, () => updateLocalLists());
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
