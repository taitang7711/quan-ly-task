<template>
  <v-dialog v-model="visible" max-width="700" persistent transition="dialog-top-transition">
    <v-card class="rounded-2xl">
      <div class="pa-6">
        <div class="flex items-center justify-between mb-6">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center shadow-md">
              <v-icon color="white" size="20">mdi-folder-outline</v-icon>
            </div>
            <h2 class="text-lg font-bold gradient-text">Quản lý danh mục</h2>
          </div>
          <v-btn icon variant="text" @click="close"><v-icon>mdi-close</v-icon></v-btn>
        </div>

        <v-list class="pa-0 space-y-2">
          <v-card
            v-for="cat in categories"
            :key="cat.id"
            class="pa-3 rounded-xl hover-lift"
            style="background: #F8FAFC;"
          >
            <div class="flex items-center justify-between mb-2">
              <div class="flex items-center gap-2">
                <div class="w-3.5 h-3.5 rounded-full" :style="{ backgroundColor: cat.color }"></div>
                <span class="font-bold text-sm">{{ cat.name }}</span>
              </div>
              <div class="flex gap-1">
                <v-btn icon size="x-small" variant="text" @click="editCategory(cat)">
                  <v-icon size="16" color="primary">mdi-pencil</v-icon>
                </v-btn>
                <v-btn icon size="x-small" variant="text" @click="deleteCategory(cat.id)">
                  <v-icon size="16" color="error">mdi-delete</v-icon>
                </v-btn>
              </div>
            </div>

            <!-- Danh mục con (nested) -->
            <div class="text-xs font-semibold text-gray-500 mb-1">Danh mục con</div>
            <div class="flex flex-wrap gap-1.5 mb-2">
              <template v-for="sub in cat.subcategories" :key="sub.id">
                <v-chip
                  size="x-small"
                  variant="flat"
                  color="primary"
                  class="font-medium"
                  closable
                  @click:close="deleteSubcategory(sub.id)"
                >
                  <v-icon size="12" class="mr-0.5">{{ sub.icon || 'mdi-folder-outline' }}</v-icon>
                  {{ sub.name }}
                  <v-btn icon size="x-small" variant="text" @click.stop="editSubcategory(sub)" class="ml-0.5">
                    <v-icon size="12">mdi-pencil</v-icon>
                  </v-btn>
                </v-chip>
                <template v-if="sub.children && sub.children.length">
                  <div v-for="child in sub.children" :key="child.id" class="ml-4">
                    <v-chip
                      size="x-small"
                      variant="outlined"
                      color="secondary"
                      class="font-medium"
                      closable
                      @click:close="deleteSubcategory(child.id)"
                    >
                      <v-icon size="12" class="mr-0.5">{{ child.icon || 'mdi-file-outline' }}</v-icon>
                      {{ child.name }}
                      <v-btn icon size="x-small" variant="text" @click.stop="editSubcategory(child)" class="ml-0.5">
                        <v-icon size="12">mdi-pencil</v-icon>
                      </v-btn>
                    </v-chip>
                  </div>
                </template>
              </template>
              <v-btn size="x-small" variant="text" color="primary" @click="openAddSub(cat.id)" class="text-xs">
                + Thêm
              </v-btn>
            </div>

            <!-- Trạng thái -->
            <div class="text-xs font-semibold text-gray-500 mb-1">Trạng thái</div>
            <div class="flex flex-wrap gap-1.5">
              <v-chip
                v-for="st in cat.statuses"
                :key="st.id"
                size="x-small"
                variant="flat"
                class="font-medium text-white"
                :style="{ backgroundColor: st.color }"
                closable
                @click:close="deleteStatus(st.id)"
              >
                {{ st.name }}
                <v-btn icon size="x-small" variant="text" @click.stop="editStatus(st)" class="ml-0.5">
                  <v-icon size="12" color="white">mdi-pencil</v-icon>
                </v-btn>
              </v-chip>
              <v-btn size="x-small" variant="text" color="primary" @click="openAddStatus(cat.id)" class="text-xs">
                + Thêm
              </v-btn>
            </div>
          </v-card>
        </v-list>

        <v-btn color="primary" variant="tonal" block class="mt-4 rounded-xl py-4" @click="openAddCategory">
          <v-icon size="18" class="mr-1">mdi-plus</v-icon>
          Thêm danh mục mới
        </v-btn>

        <div class="flex justify-end mt-4">
          <v-btn variant="text" @click="close" class="rounded-xl">Đóng</v-btn>
        </div>
      </div>
    </v-card>

    <!-- Category Edit Dialog -->
    <v-dialog v-model="catDialog" max-width="400" persistent>
      <v-card class="rounded-2xl pa-4">
        <h3 class="font-bold text-sm mb-4">{{ editingCategory ? 'Sửa danh mục' : 'Thêm danh mục mới' }}</h3>
        <v-text-field v-model="catForm.name" label="Tên danh mục" hide-details />
        <v-select v-model="catForm.color" :items="colorOptions" label="Màu sắc" hide-details class="mt-3">
          <template v-slot:item="{ props, item }">
            <v-list-item v-bind="props">
              <template v-slot:prepend>
                <div class="w-4 h-4 rounded-full" :style="{ backgroundColor: item.value }"></div>
              </template>
            </v-list-item>
          </template>
          <template v-slot:selection="{ item }">
            <div class="flex items-center gap-2">
              <div class="w-3 h-3 rounded-full" :style="{ backgroundColor: item.value }"></div>
              {{ item.title }}
            </div>
          </template>
        </v-select>
        <div class="flex justify-end gap-2 mt-4">
          <v-btn variant="text" @click="catDialog = false">Hủy</v-btn>
          <v-btn color="primary" @click="saveCategory">Lưu</v-btn>
        </div>
      </v-card>
    </v-dialog>

    <!-- Subcategory Edit Dialog -->
    <v-dialog v-model="subDialog" max-width="500" persistent>
      <v-card class="rounded-2xl pa-4">
        <h3 class="font-bold text-sm mb-4">{{ editingSub ? 'Sửa danh mục con' : 'Thêm danh mục con' }}</h3>
        <v-text-field v-model="subForm.name" label="Tên danh mục con" hide-details />
        <v-select
          v-model="subForm.parent_subcategory_id"
          :items="currentSubOptions"
          item-title="name"
          item-value="id"
          label="Danh mục cha (để trống nếu là cấp cao nhất)"
          clearable
          hide-details
          class="mt-3"
        />
        <v-row class="mt-2">
          <v-col cols="6">
            <v-select v-model="subForm.icon" :items="iconOptions" label="Icon" hide-details>
              <template v-slot:item="{ props, item }">
                <v-list-item v-bind="props">
                  <template v-slot:prepend>
                    <v-icon size="18">{{ item.value }}</v-icon>
                  </template>
                </v-list-item>
              </template>
              <template v-slot:selection="{ item }">
                <div class="flex items-center gap-2">
                  <v-icon size="16">{{ item.value }}</v-icon>
                  <span class="text-xs">{{ item.title }}</span>
                </div>
              </template>
            </v-select>
          </v-col>
          <v-col cols="6">
            <v-select v-model="subForm.color" :items="colorOptions" label="Màu sắc" hide-details>
              <template v-slot:item="{ props, item }">
                <v-list-item v-bind="props">
                  <template v-slot:prepend>
                    <div class="w-4 h-4 rounded-full" :style="{ backgroundColor: item.value }"></div>
                  </template>
                </v-list-item>
              </template>
              <template v-slot:selection="{ item }">
                <div class="flex items-center gap-2">
                  <div class="w-3 h-3 rounded-full" :style="{ backgroundColor: item.value }"></div>
                  {{ item.title }}
                </div>
              </template>
            </v-select>
          </v-col>
        </v-row>
        <div class="flex justify-end gap-2 mt-4">
          <v-btn variant="text" @click="subDialog = false">Hủy</v-btn>
          <v-btn color="primary" @click="saveSubcategory">Lưu</v-btn>
        </div>
      </v-card>
    </v-dialog>

    <!-- Status Edit Dialog -->
    <v-dialog v-model="statusDialog" max-width="400" persistent>
      <v-card class="rounded-2xl pa-4">
        <h3 class="font-bold text-sm mb-4">{{ editingStatus ? 'Sửa trạng thái' : 'Thêm trạng thái mới' }}</h3>
        <v-text-field v-model="statusForm.name" label="Tên trạng thái" hide-details />
        <v-select v-model="statusForm.color" :items="colorOptions" label="Màu sắc" hide-details class="mt-3">
          <template v-slot:item="{ props, item }">
            <v-list-item v-bind="props">
              <template v-slot:prepend>
                <div class="w-4 h-4 rounded-full" :style="{ backgroundColor: item.value }"></div>
              </template>
            </v-list-item>
          </template>
          <template v-slot:selection="{ item }">
            <div class="flex items-center gap-2">
              <div class="w-3 h-3 rounded-full" :style="{ backgroundColor: item.value }"></div>
              {{ item.title }}
            </div>
          </template>
        </v-select>
        <div class="flex justify-end gap-2 mt-4">
          <v-btn variant="text" @click="statusDialog = false">Hủy</v-btn>
          <v-btn color="primary" @click="saveStatus">Lưu</v-btn>
        </div>
      </v-card>
    </v-dialog>
  </v-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useCategoryStore } from '../stores/category';
import { useCategoryStatusStore } from '../stores/categoryStatus';
import axios from '../utils/axios';
import { useToast } from '../composables/useToast';

const props = defineProps({
  modelValue: Boolean,
});
const emit = defineEmits(['update:modelValue', 'updated']);

const categoryStore = useCategoryStore();
const categoryStatusStore = useCategoryStatusStore();
const { show } = useToast();
const visible = ref(false);
const categories = ref([]);
const catDialog = ref(false);
const subDialog = ref(false);
const statusDialog = ref(false);
const editingCategory = ref(null);
const editingSub = ref(null);
const editingStatus = ref(null);
const catForm = ref({ name: '', color: '#1E3C72' });
const subForm = ref({ name: '', category_id: null, parent_subcategory_id: null, icon: 'mdi-folder-outline', color: '#1E3C72' });
const statusForm = ref({ name: '', color: '#2A5298', category_id: null });
const colorOptions = ['#1E3C72', '#2A5298', '#5DADE2', '#10B981', '#EF4444', '#F59E0B', '#8B5CF6', '#06B6D4'];
const iconOptions = ['mdi-folder-outline', 'mdi-folder', 'mdi-file-outline', 'mdi-file', 'mdi-code-tags', 'mdi-database', 'mdi-palette', 'mdi-account-group', 'mdi-chart-line', 'mdi-cog', 'mdi-lightning-bolt', 'mdi-star', 'mdi-flag', 'mdi-bookmark'];

const currentSubOptions = computed(() => {
  const catId = subForm.value.category_id;
  if (!catId) return [];
  const cat = categories.value.find(c => c.id === catId);
  if (!cat) return [];
  const result = [];
  function flatten(subs) {
    for (const s of subs) {
      if (editingSub.value && s.id === editingSub.value.id) continue;
      result.push(s);
      if (s.children) flatten(s.children);
    }
  }
  flatten(cat.subcategories || []);
  return result;
});

watch(() => props.modelValue, async (val) => {
  if (val) {
    visible.value = true;
    await loadData();
  } else {
    visible.value = false;
  }
});

async function loadData() {
  await categoryStore.fetchCategories();
  categories.value = categoryStore.categories;
}

function close() {
  emit('update:modelValue', false);
}

function openAddCategory() {
  editingCategory.value = null;
  catForm.value = { name: '', color: '#1E3C72' };
  catDialog.value = true;
}

function editCategory(cat) {
  editingCategory.value = cat;
  catForm.value = { name: cat.name, color: cat.color };
  catDialog.value = true;
}

async function saveCategory() {
  try {
    if (editingCategory.value) {
      await categoryStore.updateCategory(editingCategory.value.id, catForm.value);
      show('Đã cập nhật danh mục', 'success');
    } else {
      await categoryStore.createCategory(catForm.value);
      show('Đã tạo danh mục mới', 'success');
    }
    catDialog.value = false;
    await loadData();
    emit('updated');
  } catch (err) {
    show('Lỗi khi lưu danh mục', 'error');
  }
}

async function deleteCategory(id) {
  try {
    await categoryStore.deleteCategory(id);
    await loadData();
    emit('updated');
    show('Đã xóa danh mục', 'success');
  } catch (err) {
    show('Lỗi khi xóa danh mục', 'error');
  }
}

function openAddSub(categoryId) {
  editingSub.value = null;
  subForm.value = { name: '', category_id: categoryId, parent_subcategory_id: null, icon: 'mdi-folder-outline', color: '#1E3C72' };
  subDialog.value = true;
}

function editSubcategory(sub) {
  editingSub.value = sub;
  subForm.value = {
    name: sub.name,
    category_id: sub.category_id,
    parent_subcategory_id: sub.parent_subcategory_id || null,
    icon: sub.icon || 'mdi-folder-outline',
    color: sub.color || '#1E3C72',
  };
  subDialog.value = true;
}

async function saveSubcategory() {
  try {
    const data = {
      name: subForm.value.name,
      category_id: subForm.value.category_id,
      parent_subcategory_id: subForm.value.parent_subcategory_id || null,
      icon: subForm.value.icon || 'mdi-folder-outline',
      color: subForm.value.color || '#1E3C72',
    };
    if (editingSub.value) {
      await axios.put(`/subcategories/${editingSub.value.id}`, data);
      show('Đã cập nhật danh mục con', 'success');
    } else {
      await axios.post('/subcategories', data);
      show('Đã tạo danh mục con', 'success');
    }
    subDialog.value = false;
    await loadData();
    emit('updated');
  } catch (err) {
    show('Lỗi khi lưu danh mục con', 'error');
  }
}

async function deleteSubcategory(id) {
  try {
    await axios.delete(`/subcategories/${id}`);
    await loadData();
    emit('updated');
    show('Đã xóa danh mục con', 'success');
  } catch (err) {
    show('Lỗi khi xóa danh mục con', 'error');
  }
}

function openAddStatus(categoryId) {
  editingStatus.value = null;
  statusForm.value = { name: '', color: '#2A5298', category_id: categoryId };
  statusDialog.value = true;
}

function editStatus(st) {
  editingStatus.value = st;
  statusForm.value = { name: st.name, color: st.color, category_id: st.category_id };
  statusDialog.value = true;
}

async function saveStatus() {
  try {
    if (editingStatus.value) {
      await categoryStatusStore.updateStatus(editingStatus.value.id, {
        name: statusForm.value.name,
        color: statusForm.value.color,
      });
      show('Đã cập nhật trạng thái', 'success');
    } else {
      await categoryStatusStore.createStatus({
        name: statusForm.value.name,
        color: statusForm.value.color,
        category_id: statusForm.value.category_id,
      });
      show('Đã tạo trạng thái mới', 'success');
    }
    statusDialog.value = false;
    await loadData();
    emit('updated');
  } catch (err) {
    show('Lỗi khi lưu trạng thái', 'error');
  }
}

async function deleteStatus(id) {
  try {
    await categoryStatusStore.deleteStatus(id);
    await loadData();
    emit('updated');
    show('Đã xóa trạng thái', 'success');
  } catch (err) {
    show('Lỗi khi xóa trạng thái', 'error');
  }
}
</script>

<style scoped>
.space-y-2 > * + * {
  margin-top: 0.5rem;
}
</style>
