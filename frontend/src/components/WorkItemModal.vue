<template>
  <v-dialog v-model="visible" max-width="800" persistent :fullscreen="isMobile" transition="dialog-top-transition">
    <v-card class="rounded-2xl overflow-hidden">
      <!-- Header -->
      <div class="gradient-bg px-6 py-4 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
            <v-icon color="white" size="20">{{ isEdit ? 'mdi-pencil' : 'mdi-plus' }}</v-icon>
          </div>
          <span class="text-white font-bold text-base">
            {{ isEdit ? `Sửa ${typeLabel}` : `Tạo ${typeLabel} mới` }}
          </span>
        </div>
        <div class="flex items-center gap-2">
          <v-chip v-if="itemData.hash_task" size="small" color="white" variant="outlined" class="font-mono font-bold" @click="copyHash">
            <v-icon size="14" class="mr-1">mdi-pound</v-icon>
            {{ itemData.hash_task }}
            <v-icon size="14" class="ml-1">mdi-content-copy</v-icon>
          </v-chip>
          <v-btn icon variant="text" @click="close" color="white">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </div>
      </div>

      <v-card-text class="pa-5">
        <!-- Main form -->
        <v-form ref="form" v-model="valid">
          <v-row>
            <v-col cols="12" md="6">
              <v-text-field v-model="formData.title" label="Tiêu đề" :rules="[v => !!v || 'Tiêu đề là bắt buộc']" required />
              <v-textarea v-model="formData.description" label="Mô tả" rows="3" />
              <v-select v-model="formData.category_id" :items="categories" item-title="name" item-value="id" label="Danh mục" required @update:model-value="onCategoryChange" />
              <v-select v-model="formData.subcategory_id" :items="subcategories" item-title="name" item-value="id" label="Danh mục con" :disabled="!formData.category_id" />
            </v-col>
            <v-col cols="12" md="6">
              <v-select v-model="formData.status" :items="statusItems" label="Trạng thái" />
              <v-select v-model="formData.priority" :items="priorities" label="Độ ưu tiên" />
              <v-select v-model="formData.assignee_id" :items="users" item-title="username" item-value="id" label="Người thực hiện" />
              <v-text-field v-model="formData.due_date" label="Hạn" type="datetime-local" />
              <v-text-field v-model="formData.estimated_hours" label="Giờ dự kiến (h)" type="number" step="0.5" />
            </v-col>
          </v-row>

          <!-- Time tracking section -->
          <v-expansion-panels v-if="isEdit" variant="inset" class="mt-2">
            <v-expansion-panel title="Theo dõi thời gian" class="rounded-xl">
              <v-expansion-panel-text>
                <div class="flex items-center gap-4 mb-3">
                  <div class="flex-1">
                    <v-text-field v-model="formData.start_time" label="Bắt đầu" type="datetime-local" density="compact" hide-details />
                  </div>
                  <div class="flex-1">
                    <v-text-field v-model="formData.end_time" label="Kết thúc" type="datetime-local" density="compact" hide-details />
                  </div>
                </div>
                <div class="flex items-center gap-4 mb-3">
                  <div class="flex-1">
                    <v-text-field v-model="formData.estimated_duration" label="Ước tính (phút)" type="number" density="compact" hide-details />
                  </div>
                  <div class="flex-1">
                    <v-text-field :model-value="actualDurationDisplay" label="Thực tế" density="compact" hide-details readonly />
                  </div>
                </div>

                <!-- Realtime Timer -->
                <v-card variant="outlined" class="rounded-xl pa-3" :class="timerCardClass">
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-3">
                      <v-icon :color="timerIconColor" size="28">{{ timerIcon }}</v-icon>
                      <div>
                        <div class="font-mono text-xl font-bold" :class="timerTextClass">{{ formattedTimer }}</div>
                        <div class="text-xs text-gray-500">{{ timerStatusLabel }}</div>
                      </div>
                    </div>
                    <div class="flex gap-2">
                      <v-btn v-if="timerStatus === 'stopped' || !timerStatus" color="success" variant="tonal" size="small" class="rounded-lg" @click="startTimer">
                        <v-icon size="16">mdi-play</v-icon> Bắt đầu
                      </v-btn>
                      <v-btn v-if="timerStatus === 'running'" color="warning" variant="tonal" size="small" class="rounded-lg" @click="pauseTimer">
                        <v-icon size="16">mdi-pause</v-icon> Tạm dừng
                      </v-btn>
                      <v-btn v-if="timerStatus === 'paused'" color="success" variant="tonal" size="small" class="rounded-lg" @click="resumeTimer">
                        <v-icon size="16">mdi-play</v-icon> Tiếp tục
                      </v-btn>
                      <v-btn v-if="timerStatus && timerStatus !== 'stopped'" color="error" variant="tonal" size="small" class="rounded-lg" @click="stopTimer">
                        <v-icon size="16">mdi-stop</v-icon> Dừng
                      </v-btn>
                    </div>
                  </div>
                </v-card>
              </v-expansion-panel-text>
            </v-expansion-panel>
          </v-expansion-panels>
        </v-form>

        <v-divider v-if="isEdit" class="my-4" />

        <!-- Tabs: Comments / AI / History -->
        <div v-if="isEdit">
          <v-tabs v-model="activeTab" color="primary" class="rounded-xl bg-gray-50 mb-3">
            <v-tab value="comments" class="rounded-lg">
              <v-icon size="16" class="mr-1">mdi-comment-outline</v-icon>
              Bình luận ({{ comments.length }})
            </v-tab>
            <v-tab value="ai" class="rounded-lg">
              <v-icon size="16" class="mr-1">mdi-robot-outline</v-icon>
              Gợi ý AI
            </v-tab>
            <v-tab value="activity" class="rounded-lg">
              <v-icon size="16" class="mr-1">mdi-history</v-icon>
              Hoạt động
            </v-tab>
          </v-tabs>

          <v-window v-model="activeTab">
            <!-- Comments Tab -->
            <v-window-item value="comments">
              <div class="space-y-2 max-h-[300px] overflow-y-auto mb-3">
                <div v-for="comment in comments" :key="comment.id" class="flex gap-3 p-2 rounded-xl bg-gray-50">
                  <v-avatar size="30" :color="comment.is_ai ? 'purple' : 'primary'" class="text-white">
                    <v-icon size="16">{{ comment.is_ai ? 'mdi-robot' : 'mdi-account' }}</v-icon>
                  </v-avatar>
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2">
                      <span class="text-xs font-bold">{{ comment.username || (comment.is_ai ? 'AI Assistant' : 'User') }}</span>
                      <v-chip v-if="comment.is_ai" size="x-small" color="purple" variant="flat" class="font-medium">AI</v-chip>
                      <span class="text-[10px] text-gray-400">{{ formatDate(comment.created_at) }}</span>
                    </div>
                    <div class="text-sm text-gray-600 mt-0.5 whitespace-pre-wrap">{{ comment.content }}</div>
                  </div>
                </div>
                <div v-if="comments.length === 0" class="text-center py-6 text-gray-400 text-sm">
                  Chưa có bình luận nào
                </div>
              </div>
              <v-textarea v-model="newComment" label="Thêm bình luận" rows="2" hide-details />
              <div class="flex justify-end mt-2">
                <v-btn color="primary" @click="addComment" :loading="commentLoading" size="small" class="rounded-xl px-4">
                  Gửi
                </v-btn>
              </div>
            </v-window-item>

            <!-- AI Tab -->
            <v-window-item value="ai">
              <div class="py-6 text-center">
                <div class="w-16 h-16 rounded-2xl bg-purple-50 flex items-center justify-center mx-auto mb-3">
                  <v-icon size="36" color="purple">mdi-robot-outline</v-icon>
                </div>
                <p class="text-sm text-gray-500 mb-4">Nhờ AI gợi ý cải thiện {{ typeLabel.toLowerCase() }} này</p>
                <v-btn color="purple" @click="askAI" :loading="aiLoading" class="rounded-xl px-6">
                  <v-icon size="18" class="mr-1">mdi-lightbulb-outline</v-icon>
                  Gợi ý từ AI
                </v-btn>
              </div>
            </v-window-item>

            <!-- Activity History Tab -->
            <v-window-item value="activity">
              <div class="space-y-2 max-h-[300px] overflow-y-auto">
                <div v-for="(comment, i) in comments" :key="comment.id || i" class="flex items-start gap-3 p-2 rounded-xl bg-gray-50">
                  <v-avatar size="28" color="grey" class="text-white">
                    <v-icon size="14">mdi-history</v-icon>
                  </v-avatar>
                  <div class="flex-1 min-w-0">
                    <div class="text-xs text-gray-500">
                      <span class="font-medium">{{ comment.username || 'System' }}</span>
                      {{ comment.is_ai ? 'đã gợi ý từ AI' : 'đã bình luận' }}
                    </div>
                    <div class="text-sm text-gray-600 mt-0.5">{{ comment.content }}</div>
                    <div class="text-[10px] text-gray-400 mt-0.5">{{ formatDate(comment.created_at) }}</div>
                  </div>
                </div>
                <div v-if="comments.length === 0" class="text-center py-6 text-gray-400 text-sm">
                  Chưa có hoạt động nào
                </div>
              </div>
            </v-window-item>
          </v-window>
        </div>
      </v-card-text>

      <v-divider />

      <v-card-actions class="pa-4">
        <div v-if="isEdit && itemData.hash_task" class="text-xs text-gray-400 flex items-center gap-1">
          <v-icon size="12">mdi-pound</v-icon>
          <span class="font-mono">{{ itemData.hash_task }}</span>
          <v-btn icon variant="text" size="x-small" @click="copyHash" class="ml-1">
            <v-icon size="12">mdi-content-copy</v-icon>
          </v-btn>
        </div>
        <v-spacer />
        <v-btn variant="text" @click="close" class="rounded-xl">Hủy</v-btn>
        <v-btn v-if="isEdit" color="error" variant="tonal" @click="confirmDeleteDialog = true" :loading="deleting" class="rounded-xl">
          <v-icon size="18" class="mr-1">mdi-delete</v-icon>
          Xóa
        </v-btn>
        <v-btn color="primary" :loading="saving" @click="save" class="rounded-xl px-6">
          <v-icon size="18" class="mr-1">mdi-content-save</v-icon>
          Lưu
        </v-btn>
      </v-card-actions>
    </v-card>

    <!-- Delete confirmation -->
    <v-dialog v-model="confirmDeleteDialog" max-width="400" persistent>
      <v-card class="rounded-2xl pa-4">
        <div class="flex items-center gap-3 mb-3">
          <div class="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
            <v-icon color="error">mdi-alert</v-icon>
          </div>
          <span class="font-bold text-base">Xác nhận xóa</span>
        </div>
        <p class="text-sm text-gray-600 mb-4">
          Bạn có chắc chắn muốn xóa {{ typeLabel.toLowerCase() }} "{{ formData.title }}" không?
        </p>
        <div class="flex justify-end gap-2">
          <v-btn variant="text" @click="confirmDeleteDialog = false" class="rounded-xl">Hủy</v-btn>
          <v-btn color="error" @click="confirmDelete" class="rounded-xl">Xóa</v-btn>
        </div>
      </v-card>
    </v-dialog>
  </v-dialog>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useDisplay } from 'vuetify';
import { useTaskStore } from '../stores/task';
import { useTodoStore } from '../stores/todo';
import { useCategoryStore } from '../stores/category';
import { useToast } from '../composables/useToast';
import axios from '../utils/axios';

const { smAndDown: isMobile } = useDisplay();
const { show } = useToast();

const props = defineProps({
  modelValue: Boolean,
  item: Object,
  itemType: { type: String, default: 'task' }, // 'task' or 'todo'
});
const emit = defineEmits(['update:modelValue', 'saved']);

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
});

const taskStore = useTaskStore();
const todoStore = useTodoStore();
const categoryStore = useCategoryStore();

const categories = ref([]);
const subcategories = ref([]);
const users = ref([]);
const valid = ref(false);
const saving = ref(false);
const deleting = ref(false);
const commentLoading = ref(false);
const aiLoading = ref(false);
const comments = ref([]);
const newComment = ref('');
const activeTab = ref('comments');
const confirmDeleteDialog = ref(false);

const statusItems = ref([]);
const priorities = ['low', 'medium', 'high', 'urgent'];

const timerInterval = ref(null);
const timerDisplay = ref(0);

const formData = ref({
  title: '',
  description: '',
  category_id: null,
  subcategory_id: null,
  status: 'todo',
  priority: 'medium',
  assignee_id: null,
  due_date: null,
  estimated_hours: null,
  start_time: null,
  end_time: null,
  estimated_duration: null,
  actual_duration: null,
});

const isEdit = computed(() => !!props.item);
const typeLabel = computed(() => props.itemType === 'task' ? 'Task' : 'Todo');

const itemData = computed(() => props.item || {});

const timerStatus = computed(() => itemData.value.timer_status || 'stopped');
const timerStartedAt = computed(() => itemData.value.timer_started_at);
const totalPausedSeconds = computed(() => itemData.value.total_paused_seconds || 0);

const timerCardClass = computed(() => {
  if (timerStatus.value === 'running') return 'border-green-300 bg-green-50';
  if (timerStatus.value === 'paused') return 'border-yellow-300 bg-yellow-50';
  return 'border-gray-200';
});

const timerTextClass = computed(() => {
  if (timerStatus.value === 'running') return 'text-green-600';
  if (timerStatus.value === 'paused') return 'text-yellow-600';
  return 'text-gray-600';
});

const timerIconColor = computed(() => {
  if (timerStatus.value === 'running') return 'success';
  if (timerStatus.value === 'paused') return 'warning';
  return 'grey';
});

const timerIcon = computed(() => {
  if (timerStatus.value === 'running') return 'mdi-timer-sand';
  if (timerStatus.value === 'paused') return 'mdi-timer-off-outline';
  return 'mdi-timer-outline';
});

const timerStatusLabel = computed(() => {
  if (timerStatus.value === 'running') return 'Đang chạy';
  if (timerStatus.value === 'paused') return 'Đã tạm dừng';
  return 'Chưa bắt đầu';
});

const actualDurationDisplay = computed(() => {
  const d = formData.value.actual_duration;
  if (!d && d !== 0) return '';
  const h = Math.floor(d / 60);
  const m = d % 60;
  return h > 0 ? `${h}h${m}m` : `${m}m`;
});

const formattedTimer = computed(() => {
  const totalSeconds = timerDisplay.value;
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
});

function computeElapsedSeconds() {
  let total = totalPausedSeconds.value;
  if (timerStatus.value === 'running' && timerStartedAt.value) {
    total += Math.floor((Date.now() - new Date(timerStartedAt.value).getTime()) / 1000);
  }
  return total;
}

function startTimerInterval() {
  stopTimerInterval();
  timerDisplay.value = computeElapsedSeconds();
  timerInterval.value = setInterval(() => {
    timerDisplay.value = computeElapsedSeconds();
  }, 1000);
}

function stopTimerInterval() {
  if (timerInterval.value) {
    clearInterval(timerInterval.value);
    timerInterval.value = null;
  }
}

async function startTimer() {
  try {
    const result = props.itemType === 'task'
      ? await taskStore.timerStart(props.item.id)
      : await todoStore.timerStart(props.item.id);
    Object.assign(itemData.value, result);
    startTimerInterval();
    show('Đã bắt đầu timer', 'success');
  } catch (e) {
    show('Lỗi khi bắt đầu timer', 'error');
  }
}

async function pauseTimer() {
  try {
    const result = props.itemType === 'task'
      ? await taskStore.timerPause(props.item.id)
      : await todoStore.timerPause(props.item.id);
    Object.assign(itemData.value, result);
    stopTimerInterval();
    timerDisplay.value = computeElapsedSeconds();
    show('Đã tạm dừng timer', 'warning');
  } catch (e) {
    show('Lỗi khi tạm dừng timer', 'error');
  }
}

async function resumeTimer() {
  try {
    const result = props.itemType === 'task'
      ? await taskStore.timerResume(props.item.id)
      : await todoStore.timerResume(props.item.id);
    Object.assign(itemData.value, result);
    startTimerInterval();
    show('Đã tiếp tục timer', 'success');
  } catch (e) {
    show('Lỗi khi tiếp tục timer', 'error');
  }
}

async function stopTimer() {
  try {
    const result = props.itemType === 'task'
      ? await taskStore.timerStop(props.item.id)
      : await todoStore.timerStop(props.item.id);
    stopTimerInterval();
    timerDisplay.value = 0;
    formData.value.actual_duration = result.duration_minutes;
    Object.assign(itemData.value, result.task);
    show(`Đã dừng timer. Thời gian: ${Math.round(result.duration_minutes / 60)}h${result.duration_minutes % 60}m`, 'success');
  } catch (e) {
    show('Lỗi khi dừng timer', 'error');
  }
}

function copyHash() {
  if (itemData.value.hash_task) {
    navigator.clipboard.writeText(`#${itemData.value.hash_task}`);
    show('Đã copy mã công việc', 'success');
  }
}

async function loadUsers() {
  try {
    const res = await axios.get('/auth/users');
    users.value = res.data.users;
  } catch (e) {
    console.error(e);
  }
}

function onCategoryChange(catId) {
  if (catId) {
    const cat = categories.value.find(c => c.id === catId);
    subcategories.value = cat?.subcategories || [];
    statusItems.value = cat?.statuses?.map(s => ({ title: s.name, value: s.name })) || [];
    if (!isEdit.value && statusItems.value.length) {
      formData.value.status = statusItems.value[0].value;
    }
  } else {
    subcategories.value = [];
    statusItems.value = [];
  }
}

function flattenSubcategories(subs, depth = 0) {
  let result = [];
  for (const sub of subs) {
    result.push({ ...sub, depth });
    if (sub.children && sub.children.length) {
      result = result.concat(flattenSubcategories(sub.children, depth + 1));
    }
  }
  return result;
}

async function save() {
  if (!valid.value) return;
  saving.value = true;
  try {
    if (isEdit.value) {
      if (props.itemType === 'task') {
        await taskStore.updateTask(props.item.id, formData.value);
      } else {
        await todoStore.updateTodo(props.item.id, formData.value);
      }
      show(`Cập nhật ${typeLabel.value.toLowerCase()} thành công`, 'success');
    } else {
      if (props.itemType === 'task') {
        await taskStore.createTask(formData.value);
      } else {
        await todoStore.createTodo(formData.value.title, formData.value.category_id, formData.value.subcategory_id, formData.value);
      }
      show(`Tạo ${typeLabel.value.toLowerCase()} mới thành công`, 'success');
    }
    emit('saved');
    close();
  } catch (err) {
    show(`Lỗi khi lưu ${typeLabel.value.toLowerCase()}`, 'error');
  } finally {
    saving.value = false;
  }
}

async function confirmDelete() {
  deleting.value = true;
  try {
    if (props.itemType === 'task') {
      await taskStore.deleteTask(props.item.id);
    } else {
      await todoStore.deleteTodo(props.item.id);
    }
    show(`Đã xóa ${typeLabel.value.toLowerCase()}`, 'success');
    emit('saved');
    close();
  } catch (err) {
    show(`Lỗi khi xóa ${typeLabel.value.toLowerCase()}`, 'error');
  } finally {
    deleting.value = false;
    confirmDeleteDialog.value = false;
  }
}

async function addComment() {
  if (!newComment.value.trim()) return;
  commentLoading.value = true;
  try {
    if (props.itemType === 'task') {
      await taskStore.addComment(props.item.id, newComment.value);
    } else {
      await todoStore.addComment(props.item.id, newComment.value);
    }
    newComment.value = '';
    await loadComments();
    show('Đã thêm bình luận', 'success');
  } catch (err) {
    show('Lỗi khi thêm bình luận', 'error');
  } finally {
    commentLoading.value = false;
  }
}

async function askAI() {
  aiLoading.value = true;
  try {
    const res = await axios.post('/ai/suggest-improvements', { task_id: props.item.id, item_type: props.itemType });
    const suggestion = res.data.result.suggestion;
    if (props.itemType === 'task') {
      await taskStore.addComment(props.item.id, suggestion, true);
    } else {
      await todoStore.addComment(props.item.id, suggestion, true);
    }
    await loadComments();
    activeTab.value = 'comments';
    show('AI đã đưa ra gợi ý', 'success');
  } catch (err) {
    show('Lỗi khi gọi AI', 'error');
  } finally {
    aiLoading.value = false;
  }
}

async function loadComments() {
  if (!props.item) return;
  try {
    const detail = props.itemType === 'task'
      ? await taskStore.getTaskDetail(props.item.id)
      : await todoStore.getTodoDetail(props.item.id);
    comments.value = detail.comments || [];
  } catch (e) {
    comments.value = [];
  }
}

function loadStatusesForCategory(catId) {
  if (catId) {
    const cat = categories.value.find(c => c.id === catId);
    statusItems.value = cat?.statuses?.map(s => ({ title: s.name, value: s.name })) || [];
  } else {
    statusItems.value = [];
  }
}

function close() {
  visible.value = false;
  stopTimerInterval();
  formData.value = {
    title: '', description: '', category_id: null, subcategory_id: null,
    status: 'todo', priority: 'medium', assignee_id: null, due_date: null,
    estimated_hours: null, start_time: null, end_time: null,
    estimated_duration: null, actual_duration: null,
  };
  newComment.value = '';
  activeTab.value = 'comments';
}

watch(() => props.item, async (newItem) => {
  if (newItem) {
    const data = { ...newItem };
    formData.value = {
      title: data.title || '',
      description: data.description || '',
      category_id: data.category_id || null,
      subcategory_id: data.subcategory_id || null,
      status: data.status || 'todo',
      priority: data.priority || 'medium',
      assignee_id: data.assignee_id || null,
      due_date: data.due_date ? new Date(data.due_date).toISOString().slice(0, 16) : null,
      estimated_hours: data.estimated_hours || null,
      start_time: data.start_time ? new Date(data.start_time).toISOString().slice(0, 16) : null,
      end_time: data.end_time ? new Date(data.end_time).toISOString().slice(0, 16) : null,
      estimated_duration: data.estimated_duration || null,
      actual_duration: data.actual_duration || null,
    };
    loadStatusesForCategory(newItem.category_id);
    await loadComments();
    // Start timer display if running
    if (data.timer_status === 'running') {
      startTimerInterval();
    } else if (data.timer_status === 'paused') {
      timerDisplay.value = computeElapsedSeconds();
    }
  } else {
    const defaultCatId = categories.value[0]?.id || null;
    formData.value = {
      title: '', description: '', category_id: defaultCatId,
      subcategory_id: null, status: '', priority: 'medium',
      assignee_id: null, due_date: null, estimated_hours: null,
      start_time: null, end_time: null, estimated_duration: null, actual_duration: null,
    };
    loadStatusesForCategory(defaultCatId);
    if (statusItems.value.length) {
      formData.value.status = statusItems.value[0].value;
    }
    comments.value = [];
    stopTimerInterval();
    timerDisplay.value = 0;
  }
}, { immediate: true });

function formatDate(date) {
  if (!date) return '';
  return new Date(date).toLocaleDateString('vi-VN', {
    hour: '2-digit', minute: '2-digit',
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

onMounted(async () => {
  await categoryStore.fetchCategories();
  categories.value = categoryStore.categories;
  await loadUsers();
  if (isEdit.value) await loadComments();
});

onUnmounted(() => {
  stopTimerInterval();
});
</script>

<style scoped>
.space-y-2 > * + * {
  margin-top: 0.5rem;
}
</style>