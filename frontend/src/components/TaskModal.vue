<template>
  <v-dialog v-model="visible" max-width="800" persistent :fullscreen="$vuetify.display.smAndDown" transition="dialog-bottom-transition">
    <v-card>
      <v-toolbar color="primary" dark>
        <v-toolbar-title>{{ isEdit ? 'Sửa task' : 'Tạo task mới' }}</v-toolbar-title>
        <v-spacer></v-spacer>
        <v-btn icon @click="close">
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-toolbar>

      <v-card-text class="pa-4">
        <v-form ref="form" v-model="valid">
          <v-row>
            <v-col cols="12" md="6">
              <v-text-field v-model="formData.title" label="Tiêu đề" :rules="[v => !!v || 'Tiêu đề là bắt buộc']" required></v-text-field>
              <v-textarea v-model="formData.description" label="Mô tả" rows="3"></v-textarea>
              <v-select v-model="formData.category_id" :items="categories" item-title="name" item-value="id" label="Danh mục" required></v-select>
              <v-select v-model="formData.subcategory_id" :items="subcategories" item-title="name" item-value="id" label="Danh mục con" :disabled="!formData.category_id"></v-select>
            </v-col>
            <v-col cols="12" md="6">
              <v-select v-model="formData.status" :items="statuses" label="Trạng thái"></v-select>
              <v-select v-model="formData.priority" :items="priorities" label="Độ ưu tiên"></v-select>
              <v-select v-model="formData.assignee_id" :items="users" item-title="username" item-value="id" label="Người thực hiện"></v-select>
              <v-text-field v-model="formData.due_date" label="Hạn" type="datetime-local"></v-text-field>
              <v-text-field v-model="formData.estimated_hours" label="Giờ dự kiến" type="number" step="0.5"></v-text-field>
            </v-col>
          </v-row>
        </v-form>

        <v-divider class="my-4"></v-divider>

        <!-- Comments section, only for edit mode -->
        <div v-if="isEdit">
          <v-tabs v-model="activeTab" color="primary">
            <v-tab value="comments">Bình luận</v-tab>
            <v-tab value="ai">🤖 Gợi ý AI</v-tab>
          </v-tabs>

          <v-window v-model="activeTab">
            <v-window-item value="comments">
              <v-list class="mt-2" max-height="300" style="overflow-y: auto">
                <v-list-item v-for="comment in comments" :key="comment.id">
                  <template v-slot:prepend>
                    <v-avatar size="32" :color="comment.is_ai ? 'accent' : 'primary'" class="text-white">
                      <v-icon size="20">{{ comment.is_ai ? 'mdi-robot' : 'mdi-account' }}</v-icon>
                    </v-avatar>
                  </template>
                  <v-list-item-title>
                    {{ comment.username || (comment.is_ai ? 'AI Assistant' : 'User') }}
                    <v-chip v-if="comment.is_ai" size="x-small" color="accent" class="ml-2">AI</v-chip>
                  </v-list-item-title>
                  <v-list-item-subtitle>{{ comment.content }}</v-list-item-subtitle>
                </v-list-item>
              </v-list>
              <v-textarea v-model="newComment" label="Thêm bình luận" rows="2" class="mt-2"></v-textarea>
              <div class="d-flex justify-end gap-2">
                <v-btn color="primary" @click="addComment" :loading="commentLoading">Gửi</v-btn>
              </div>
            </v-window-item>

            <v-window-item value="ai">
              <div class="pa-4 text-center">
                <v-icon size="48" color="accent">mdi-robot</v-icon>
                <p class="mt-2">Nhờ AI gợi ý cải thiện task này</p>
                <v-btn color="accent" @click="askAI" :loading="aiLoading">🤖 Gợi ý từ AI</v-btn>
              </div>
            </v-window-item>
          </v-window>
        </div>
      </v-card-text>

      <v-card-actions class="pa-4">
        <v-spacer></v-spacer>
        <v-btn color="error" variant="text" @click="close">Hủy</v-btn>
        <v-btn v-if="isEdit" color="error" variant="flat" @click="deleteTask" :loading="deleting">Xóa</v-btn>
        <v-btn color="primary" :loading="saving" @click="save">Lưu</v-btn>
      </v-card-actions>
    </v-card>

    <!-- Delete confirmation dialog -->
    <v-dialog v-model="confirmDeleteDialog" max-width="400" persistent>
      <v-card>
        <v-card-title class="text-h6">Xác nhận xóa</v-card-title>
        <v-card-text>Bạn có chắc chắn muốn xóa task "{{ formData.title }}" không? Hành động này không thể hoàn tác.</v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn @click="confirmDeleteDialog = false">Hủy</v-btn>
          <v-btn color="error" @click="confirmDelete">Xóa</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-dialog>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { useTaskStore } from '../stores/task';
import { useCategoryStore } from '../stores/category';
import axios from '../utils/axios';

const props = defineProps({
  modelValue: Boolean,
  task: Object,
});
const emit = defineEmits(['update:modelValue', 'saved']);

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

const statuses = ['todo', 'in_progress', 'review', 'done'];
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
  } else {
    subcategories.value = [];
  }
});

async function save() {
  if (!valid.value) return;
  saving.value = true;
  try {
    if (isEdit.value) {
      await taskStore.updateTask(props.task.id, formData.value);
    } else {
      await taskStore.createTask(formData.value);
    }
    emit('saved');
    close();
  } catch (err) {
    console.error(err);
    alert('Lỗi khi lưu task');
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
    emit('saved');
    close();
  } catch (err) {
    console.error(err);
    alert('Lỗi khi xóa task');
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
  } catch (err) {
    alert('Lỗi khi thêm bình luận');
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
    // Switch to comments tab to show AI response
    activeTab.value = 'comments';
  } catch (err) {
    alert('Lỗi khi gọi AI');
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
    title: '',
    description: '',
    category_id: null,
    subcategory_id: null,
    status: 'todo',
    priority: 'medium',
    assignee_id: null,
    due_date: null,
    estimated_hours: null,
  };
  newComment.value = '';
  activeTab.value = 'comments';
}

watch(() => props.task, async (newTask) => {
  if (newTask) {
    formData.value = { ...newTask };
    if (newTask.due_date) {
      formData.value.due_date = new Date(newTask.due_date).toISOString().slice(0, 16);
    }
    await loadComments();
  } else {
    formData.value = {
      title: '',
      description: '',
      category_id: categories.value[0]?.id || null,
      subcategory_id: null,
      status: 'todo',
      priority: 'medium',
      assignee_id: null,
      due_date: null,
      estimated_hours: null,
    };
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
.v-dialog {
  transition: all 0.3s ease;
}
</style>