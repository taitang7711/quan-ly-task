<template>
  <div>
    <AppBar />
    <v-container fluid class="pa-4">
      <!-- Category Tabs -->
      <v-tabs v-model="activeCategory" color="primary" show-arrows>
        <v-tab v-for="cat in categories" :key="cat.id" :value="cat.id">
          {{ cat.name }}
        </v-tab>
      </v-tabs>

      <!-- Subcategory Tabs -->
      <v-tabs v-if="selectedCategory" v-model="activeSubcategory" color="accent" show-arrows class="mt-2">
        <v-tab :value="null">Tất cả</v-tab>
        <v-tab v-for="sub in selectedCategory.subcategories" :key="sub.id" :value="sub.id">
          {{ sub.name }}
        </v-tab>
      </v-tabs>

      <!-- Kanban Board - Horizontal scroll -->
      <div class="kanban-board-container mt-4 overflow-x-auto pb-4">
        <div class="kanban-board flex gap-4" style="min-width: min-content;">
          <div v-for="column in columns" :key="column.status" class="kanban-column bg-white/80 backdrop-blur-sm rounded-xl shadow-soft p-3 w-80 flex-shrink-0">
            <!-- Column Header with task count -->
            <div class="flex justify-between items-center mb-3 px-2">
              <div class="font-bold text-white rounded-lg py-2 px-3" :style="{ backgroundColor: column.color }">
                {{ column.title }}
              </div>
              <div class="text-sm font-semibold text-gray-600 bg-gray-100 rounded-full px-2 py-1">
                {{ columnTasksCount[column.status] }}
              </div>
            </div>

            <draggable
              :list="localTasks[column.status]"
              group="tasks"
              item-key="id"
              @end="(evt) => onDragEnd(evt, column.status)"
              animation="200"
              class="min-h-[500px] space-y-2"
            >
              <template #item="{ element: task }">
                <TaskCard :task="task" @click="openTaskModal(task)" />
              </template>
            </draggable>
          </div>
        </div>
      </div>
    </v-container>

    <!-- Snackbar for notifications -->
    <v-snackbar v-model="snackbar.show" :color="snackbar.color" timeout="3000" location="top">
      {{ snackbar.text }}
      <template v-slot:actions>
        <v-btn variant="text" @click="snackbar.show = false">Đóng</v-btn>
      </template>
    </v-snackbar>

    <TaskModal v-model="taskModalVisible" :task="selectedTask" @saved="onTaskSaved" />

    <v-btn
      color="primary"
      fab
      class="fixed bottom-4 right-4"
      @click="openCreateModal"
    >
      <v-icon>mdi-plus</v-icon>
    </v-btn>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import AppBar from '../components/AppBar.vue';
import TaskCard from '../components/TaskCard.vue';
import TaskModal from '../components/TaskModal.vue';
import draggable from 'vuedraggable';
import { useTaskStore } from '../stores/task';
import { useCategoryStore } from '../stores/category';
import socket from '../utils/socket';

const taskStore = useTaskStore();
const categoryStore = useCategoryStore();
const categories = ref([]);
const activeCategory = ref(null);
const activeSubcategory = ref(null);
const taskModalVisible = ref(false);
const selectedTask = ref(null);

// Snackbar state
const snackbar = ref({
  show: false,
  text: '',
  color: 'success'
});

// Local arrays for each column to bind to draggable
const localTasks = ref({
  todo: [],
  in_progress: [],
  review: [],
  done: []
});

const columns = [
  { status: 'todo', title: '📋 Cần làm', color: '#1E3C72' },
  { status: 'in_progress', title: '🔄 Đang làm', color: '#2A5298' },
  { status: 'review', title: '👀 Xem lại', color: '#5DADE2' },
  { status: 'done', title: '✅ Hoàn thành', color: '#27AE60' },
];

const selectedCategory = computed(() => categories.value.find(c => c.id === activeCategory.value));

// Computed task counts per column for header
const columnTasksCount = computed(() => {
  const counts = {};
  for (const status of columns.map(c => c.status)) {
    counts[status] = localTasks.value[status]?.length || 0;
  }
  return counts;
});

// Update local tasks based on store and filters
function updateLocalTasks() {
  for (const status of columns.map(c => c.status)) {
    let tasks = taskStore.kanban[status] || [];
    // Filter by category
    if (activeCategory.value) {
      tasks = tasks.filter(t => t.category_id === activeCategory.value);
    }
    // Filter by subcategory
    if (activeSubcategory.value) {
      tasks = tasks.filter(t => t.subcategory_id === activeSubcategory.value);
    }
    localTasks.value[status] = [...tasks]; // create new array to trigger reactivity
  }
}

async function onDragEnd(event, newStatus) {
  const taskId = event.item.__draggable_context.element.id;
  if (!taskId) return;

  const newIndex = event.newIndex;

  // Find the task in the local source column (old status)
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

  // Remove from old column
  const oldList = localTasks.value[oldStatus];
  const oldIndex = oldList.findIndex(t => t.id === taskId);
  if (oldIndex !== -1) oldList.splice(oldIndex, 1);

  // Insert into new column at newIndex
  const newList = localTasks.value[newStatus];
  newList.splice(newIndex, 0, oldTask);

  // Optimistically update UI
  updateLocalTasks(); // this might reorder but we already updated

  // Call API to persist
  try {
    await taskStore.moveTask(taskId, newStatus, newIndex);
    // Show success snackbar
    snackbar.value = {
      show: true,
      text: `Đã di chuyển task "${oldTask.title}" thành công`,
      color: 'success'
    };
    // After success, refresh from store to ensure consistency
    await loadData();
  } catch (err) {
    console.error('Drag move failed:', err);
    snackbar.value = {
      show: true,
      text: 'Di chuyển task thất bại, vui lòng thử lại',
      color: 'error'
    };
    // Revert by reloading data
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

async function onTaskSaved() {
  await loadData();
  snackbar.value = {
    show: true,
    text: selectedTask.value ? 'Cập nhật task thành công' : 'Tạo task mới thành công',
    color: 'success'
  };
}

// Socket listeners
socket.on('task_updated', () => loadData());
socket.on('task_created', () => loadData());
socket.on('task_deleted', () => loadData());

onMounted(() => {
  loadData();
});

watch(activeCategory, () => loadData());
watch(activeSubcategory, () => updateLocalTasks()); // just update local tasks, no need to reload
</script>

<style scoped>
.kanban-board-container {
  scrollbar-width: thin;
}
.kanban-board {
  display: flex;
  gap: 1rem;
}
.kanban-column {
  transition: all 0.2s ease;
}
.kanban-column:hover {
  transform: translateY(-2px);
}
</style>