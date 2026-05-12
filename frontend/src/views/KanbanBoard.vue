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

          <div v-if="selectedCategory" class="subcategory-tree mt-1">
            <template v-for="sub in selectedCategory.subcategories" :key="sub.id">
              <div
                class="sub-tab-item flex items-center gap-1 px-2 py-1 rounded-lg cursor-pointer text-xs"
                :class="{ 'sub-tab-active': activeSubcategory === sub.id }"
                @click="toggleSubcategory(sub.id)"
              >
                <v-icon size="14" class="mr-0.5" @click.stop="toggleCollapse(sub)">mdi-chevron-right</v-icon>
                <v-icon size="13" :color="sub.color || 'gray'">{{ sub.icon || 'mdi-folder-outline' }}</v-icon>
                <span>{{ sub.name }}</span>
              </div>
              <template v-if="sub.children && sub.children.length">
                <div
                  v-for="child in sub.children"
                  :key="child.id"
                  class="sub-tab-item sub-tab-child flex items-center gap-1 px-2 py-1 rounded-lg cursor-pointer text-xs ml-6"
                  :class="{ 'sub-tab-active': activeSubcategory === child.id }"
                  @click="activeSubcategory = child.id"
                >
                  <v-icon size="13" :color="child.color || 'gray'">{{ child.icon || 'mdi-file-outline' }}</v-icon>
                  <span>{{ child.name }}</span>
                </div>
              </template>
            </template>
            <v-tab v-if="!selectedCategory.subcategories?.length" :value="null" class="rounded-lg mx-0.5 text-xs">Tất cả</v-tab>
          </div>
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

              <!-- VueDraggable column -->
              <draggable
                :list="getColumnList(column.name)"
                group="tasks"
                item-key="id"
                @change="(evt) => onDragChange(evt, column.name)"
                animation="250"
                class="min-h-[400px] space-y-3"
                ghost-class="dragging-ghost"
              >
                <template #item="{ element: item }">
                  <div class="draggable-item-wrapper">
                    <TaskCard
                      v-if="item.__type === 'task'"
                      :task="item"
                      @click="openWorkItemModal(item, 'task')"
                    />
                    <v-card
                      v-else
                      class="pa-3 rounded-xl hover-lift cursor-pointer"
                      @click="openWorkItemModal(item, 'todo')"
                    >
                      <div class="flex items-start gap-2">
                        <v-icon size="16" color="primary" class="mt-0.5">mdi-checkbox-marked-circle-outline</v-icon>
                        <div class="flex-1 min-w-0">
                          <div class="text-sm font-medium truncate">{{ item.title }}</div>
                          <div class="flex items-center gap-1.5 mt-1">
                            <v-chip v-if="item.hash_task" size="x-small" variant="outlined" class="font-mono font-bold" color="primary">
                              <v-icon size="10" class="mr-0.5">mdi-pound</v-icon>
                              {{ item.hash_task }}
                            </v-chip>
                            <span class="text-xs text-gray-400">Todo</span>
                          </div>
                        </div>
                      </div>
                    </v-card>
                  </div>
                </template>
              </draggable>

              <div v-if="getColumnList(column.name)?.length === 0" class="flex flex-col items-center justify-center py-10 text-gray-400">
                <v-icon size="36" class="mb-2">mdi-inbox-outline</v-icon>
                <span class="text-xs">Trống</span>
              </div>

              <!-- Inline quick add -->
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

    <WorkItemModal v-model="workItemModalVisible" :item="selectedWorkItem" :item-type="selectedItemType" @saved="onItemSaved" />

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
import WorkItemModal from '../components/WorkItemModal.vue';
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
const workItemModalVisible = ref(false);
const selectedWorkItem = ref(null);
const selectedItemType = ref('task');

const columns = ref([]);
const localLists = reactive({});

const showAddForm = reactive({});
const newTaskTitle = reactive({});
const adding = reactive({});

const collapsedSubs = reactive(new Set());

const selectedCategory = computed(() => categories.value.find(c => c.id === activeCategory.value));

function initReactiveForStatuses(statuses) {
  for (const s of statuses) {
    if (!(s.name in localLists)) localLists[s.name] = [];
    if (!(s.name in showAddForm)) showAddForm[s.name] = false;
    if (!(s.name in newTaskTitle)) newTaskTitle[s.name] = '';
    if (!(s.name in adding)) adding[s.name] = false;
  }
}

function getColumnList(statusName) {
  return localLists[statusName] || [];
}

function columnTasksCount(statusName) {
  return getColumnList(statusName)?.length || 0;
}

function toggleSubcategory(subId) {
  if (activeSubcategory.value === subId) {
    activeSubcategory.value = null;
  } else {
    activeSubcategory.value = subId;
  }
}

function toggleCollapse(sub) {
  if (collapsedSubs.has(sub.id)) {
    collapsedSubs.delete(sub.id);
  } else {
    collapsedSubs.add(sub.id);
  }
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
    const matchedColumn = statuses.find(s => s.name === statusKey);
    if (matchedColumn) {
      localLists[matchedColumn.name] = [
        ...(localLists[matchedColumn.name] || []),
        ...filtered.map(t => ({ ...t, __type: 'task' })),
      ];
    }
  }

  // Add todos
  const allTodos = todoStore.todos || [];
  let filteredTodos = allTodos;
  if (activeCategory.value) {
    filteredTodos = filteredTodos.filter(t => t.category_id === activeCategory.value);
  }
  if (activeSubcategory.value) {
    filteredTodos = filteredTodos.filter(t => t.subcategory_id === activeSubcategory.value);
  }
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

// Handle vuedraggable @change event
// IMPORTANT: Only handle 'added' (item dropped from another column) and 'moved' (reorder within column).
// The 'removed' event fires on the SOURCE column when an item is dragged OUT.
// If we handle 'removed', we'd move the item back to the source status — that's WRONG.
// The destination column's 'added' event handles the actual move.
async function onDragChange(event, newStatusName) {
  const change = event.added || event.moved;
  if (!change) return;

  const item = change.element;
  if (!item || !item.id) return;

  const itemType = item.__type;
  const itemId = item.id;

  if (itemType === 'task') {
    try {
      await taskStore.moveTask(itemId, newStatusName, change.newIndex || 0);
      show(`Đã di chuyển task`, 'success');
      await refreshBoard();
    } catch (err) {
      show('Di chuyển task thất bại', 'error');
      await refreshBoard();
    }
  } else if (itemType === 'todo') {
    const isDone = newStatusName === 'Hoàn thành';
    try {
      await todoStore.updateTodo(itemId, { is_done: isDone ? 1 : 0, status: newStatusName });
      show(`Đã cập nhật todo`, 'success');
      await refreshBoard();
    } catch (err) {
      show('Cập nhật todo thất bại', 'error');
      await refreshBoard();
    }
  }
}

async function refreshBoard() {
  try {
    await Promise.all([
      taskStore.fetchTasks({ category_id: activeCategory.value }),
      todoStore.fetchTodos(activeCategory.value),
    ]);
    updateLocalLists();
  } catch (e) {
    console.error('Refresh error:', e);
  }
}

async function loadData() {
  try {
    await categoryStore.fetchCategories();
    categories.value = categoryStore.categories;
    if (categories.value.length && !activeCategory.value) {
      activeCategory.value = categories.value[0].id;
    }
    await refreshBoard();
  } catch (e) {
    console.error('Load error:', e);
  }
}

function openWorkItemModal(item = null, type = 'task') {
  selectedWorkItem.value = item;
  selectedItemType.value = type;
  workItemModalVisible.value = true;
}

function openCreateModal() {
  selectedWorkItem.value = null;
  selectedItemType.value = 'task';
  workItemModalVisible.value = true;
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
    await refreshBoard();
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

async function onItemSaved() {
  await hardRefresh();
}

socket.on('task_updated', () => refreshBoard());
socket.on('task_created', () => refreshBoard());
socket.on('task_deleted', () => refreshBoard());
socket.on('todo_updated', () => refreshBoard());
socket.on('todo_created', () => refreshBoard());
socket.on('todo_deleted', () => refreshBoard());
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
.subcategory-tree {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  padding: 4px 0;
}
.sub-tab-item {
  transition: all 0.15s ease;
  border: 1px solid transparent;
}
.sub-tab-item:hover {
  background: rgba(30, 60, 114, 0.06);
}
.sub-tab-active {
  background: rgba(30, 60, 114, 0.1) !important;
  color: #1E3C72 !important;
  font-weight: 600 !important;
  border-color: rgba(30, 60, 114, 0.2) !important;
}
.sub-tab-child {
  border-left: 2px solid rgba(30, 60, 114, 0.15);
}
.draggable-item-wrapper {
  /* Ensures vuedraggable has a stable DOM node to track */
}
</style>