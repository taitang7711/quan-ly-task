<template>
  <v-dialog v-model="visible" max-width="750" persistent :fullscreen="isMobile" transition="dialog-top-transition">
    <v-card class="rounded-2xl overflow-hidden">
      <div class="gradient-bg px-6 py-4 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
            <v-icon color="white" size="20">{{ isEdit ? 'mdi-pencil' : 'mdi-plus' }}</v-icon>
          </div>
          <span class="text-white font-bold text-base">{{ isEdit ? 'Sửa task' : 'Tạo task mới' }}</span>
        </div>
        <v-btn icon variant="text" @click="close" color="white">
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </div>

      <v-card-text class="pa-5">
        <v-form ref="form" v-model="valid">
          <v-row>
            <v-col cols="12" md="6">
              <v-text-field v-model="formData.title" label="Tiêu đề" :rules="[v => !!v || 'Tiêu đề là bắt buộc']" required />
              <v-textarea v-model="formData.description" label="Mô tả" rows="3" />
              <v-select v-model="formData.category_id" :items="categories" item-title="name" item-value="id" label="Danh mục" required />
              <v-select v-model="formData.subcategory_id" :items="subcategories" item-title="name" item-value="id" label="Danh mục con" :disabled="!formData.category_id" />
            </v-col>
            <v-col cols="12" md="6">
              <v-select v-model="formData.status" :items="statusItems" label="Trạng thái" />
              <v-select v-model="formData.priority" :items="priorities" label="Độ ưu tiên" />
              <v-select v-model="formData.assignee_id" :items="users" item-title="username" item-value="id" label="Người thực hiện" />
              <v-text-field v-model="formData.due_date" label="Hạn" type="datetime-local" />
              <v-text-field v-model="formData.estimated_hours" label="Giờ dự kiến" type="number" step="0.5" />
            </v-col>
          </v-row>
        </v-form>

        <v-divider v-if="isEdit" class="my-4" />

        <div v-if="isEdit">
          <v-tabs v-model="activeTab" color="primary" class="rounded-xl bg-gray-50 mb-3">
            <v-tab value="comments" class="rounded-lg">
              <v-icon size="16" class="mr-1">mdi-comment-outline</v-icon>
              Bình luận
            </v-tab>
            <v-tab value="ai" class="rounded-lg">
              <v-icon size="16" class="mr-1">mdi-robot-outline</v-icon>
              Gợi ý AI
            </v-tab>
          </v-tabs>

          <v-window v-model="activeTab">
            <v-window-item value="comments">
              <div class="space-y-2 max-h-[250px] overflow-y-auto mb-3">
                <div v-for="comment in comments" :key="comment.id" class="flex gap-3 p-2 rounded-xl bg-gray-50">
                  <v-avatar size="30" :color="comment.is_ai ? 'purple' : 'primary'" class="text-white">
                    <v-icon size="16">{{ comment.is_ai ? 'mdi-robot' : 'mdi-account' }}</v-icon>
                  </v-avatar>
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2">
                      <span class="text-xs font-bold">{{ comment.username || (comment.is_ai ? 'AI Assistant' : 'User') }}</span>
                      <v-chip v-if="comment.is_ai" size="x-small" color="purple" variant="flat" class="font-medium">AI</v-chip>
                    </div>
                    <div class="text-sm text-gray-600 mt-0.5">{{ comment.content }}</div>
                  </div>
                </div>
              </div>
              <v-textarea v-model="newComment" label="Thêm bình luận" rows="2" hide-details />
              <div class="flex justify-end mt-2">
                <v-btn color="primary" @click="addComment" :loading="commentLoading" size="small" class="rounded-xl px-4">
                  Gửi
                </v-btn>
              </div>
            </v-window-item>

            <v-window-item value="ai">
              <div class="py-6 text-center">
                <div class="w-16 h-16 rounded-2xl bg-purple-50 flex items-center justify-center mx-auto mb-3">
                  <v-icon size="36" color="purple">mdi-robot-outline</v-icon>
                </div>
                <p class="text-sm text-gray-500 mb-4">Nhờ AI gợi ý cải thiện task này</p>
                <v-btn color="purple" @click="askAI" :loading="aiLoading" class="rounded-xl px-6">
                  <v-icon size="18" class="mr-1">mdi-lightbulb-outline</v-icon>
                  Gợi ý từ AI
                </v-btn>
              </div>
            </v-window-item>
          </v-window>
        </div>
      </v-card-text>

      <v-divider />

      <v-card-actions class="pa-4">
        <v-spacer />
        <v-btn variant="text" @click="close" class="rounded-xl">Hủy</v-btn>
        <v-btn v-if="isEdit" color="error" variant="tonal" @click="deleteTask" :loading="deleting" class="rounded-xl">
          <v-icon size="18" class="mr-1">mdi-delete</v-icon>
          Xóa
        </v-btn>
        <v-btn color="primary" :loading="saving" @click="save" class="rounded-xl px-6">
          <v-icon size="18" class="mr-1">mdi-content-save</v-icon>
          Lưu
        </v-btn>
      </v-card-actions>
    </v-card>

    <v-dialog v-model="confirmDeleteDialog" max-width="400" persistent>
      <v-card class="rounded-2xl pa-4">
        <div class="flex items-center gap-3 mb-3">
          <div class="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
            <v-icon color="error">mdi-alert</v-icon>
          </div>
          <span class="font-bold text-base">Xác nhận xóa</span>
        </div>
        <p class="text-sm text-gray-600 mb-4">Bạn có chắc chắn muốn xóa task "{{ formData.title }}" không? Hành động này không thể hoàn tác.</p>
        <div class="flex justify-end gap-2">
          <v-btn variant="text" @click="confirmDeleteDialog = false" class="rounded-xl">Hủy</v-btn>
          <v-btn color="error" @click="confirmDelete" class="rounded-xl">Xóa</v-btn>
        </div>
      </v-card>
    </v-dialog>
  </v-dialog>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { useDisplay } from 'vuetify';
import { useTaskStore } from '../stores/task';
import { useCategoryStore } from '../stores/category';
import { useToast } from '../composables/useToast';
import axios from '../utils/axios';

const { smAndDown: isMobile } = useDisplay();

const props = defineProps({
  modelValue: Boolean,
  task: Object,
});
const emit = defineEmits(['update:modelValue', 'saved']);

const { show } = useToast();

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
});

const taskStore = useTaskStore();
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
});

const isEdit = computed(() => !!props.task);

async function loadUsers() {
  try {
    const res = await axios.get('/auth/users');
    users.value = res.data.users;
  } catch (e) {
    console.error(e);
  }
}

watch(() => formData.value.category_id, async (catId) => {
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
});

async function save() {
  if (!valid.value) return;
  saving.value = true;
  try {
    if (isEdit.value) {
      await taskStore.updateTask(props.task.id, formData.value);
      show('Cập nhật task thành công', 'success');
    } else {
      await taskStore.createTask(formData.value);
      show('Tạo task mới thành công', 'success');
    }
    emit('saved');
    close();
  } catch (err) {
    show('Lỗi khi lưu task', 'error');
  } finally {
    saving.value = false;
  }
}

async function deleteTask() {
  confirmDeleteDialog.value = true;
}

async function confirmDelete() {
  deleting.value = true;
  try {
    await taskStore.deleteTask(props.task.id);
    show('Đã xóa task', 'success');
    emit('saved');
    close();
  } catch (err) {
    show('Lỗi khi xóa task', 'error');
  } finally {
    deleting.value = false;
    confirmDeleteDialog.value = false;
  }
}

async function addComment() {
  if (!newComment.value.trim()) return;
  commentLoading.value = true;
  try {
    await taskStore.addComment(props.task.id, newComment.value);
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
    const res = await axios.post('/ai/suggest-improvements', { task_id: props.task.id });
    const suggestion = res.data.result.suggestion;
    await taskStore.addComment(props.task.id, suggestion, true);
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
  if (!props.task) return;
  const detail = await taskStore.getTaskDetail(props.task.id);
  comments.value = detail.comments || [];
}

function close() {
  visible.value = false;
  formData.value = {
    title: '', description: '', category_id: null, subcategory_id: null,
    status: 'todo', priority: 'medium', assignee_id: null, due_date: null, estimated_hours: null,
  };
  newComment.value = '';
  activeTab.value = 'comments';
}

function loadStatusesForCategory(catId) {
  if (catId) {
    const cat = categories.value.find(c => c.id === catId);
    statusItems.value = cat?.statuses?.map(s => ({ title: s.name, value: s.name })) || [];
  } else {
    statusItems.value = [];
  }
}

watch(() => props.task, async (newTask) => {
  if (newTask) {
    formData.value = { ...newTask };
    if (newTask.due_date) {
      formData.value.due_date = new Date(newTask.due_date).toISOString().slice(0, 16);
    }
    loadStatusesForCategory(newTask.category_id);
    await loadComments();
  } else {
    const defaultCatId = categories.value[0]?.id || null;
    formData.value = {
      title: '', description: '', category_id: defaultCatId,
      subcategory_id: null, status: '', priority: 'medium',
      assignee_id: null, due_date: null, estimated_hours: null,
    };
    loadStatusesForCategory(defaultCatId);
    if (statusItems.value.length) {
      formData.value.status = statusItems.value[0].value;
    }
  }
}, { immediate: true });

onMounted(async () => {
  await categoryStore.fetchCategories();
  categories.value = categoryStore.categories;
  await loadUsers();
  if (isEdit.value) await loadComments();
});
</script>

<style scoped>
.space-y-2 > * + * {
  margin-top: 0.5rem;
}
</style>
