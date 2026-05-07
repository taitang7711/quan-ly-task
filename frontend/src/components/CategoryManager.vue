<template>
  <v-dialog v-model="visible" max-width="800" persistent>
    <v-card>
      <v-card-title>Quản lý danh mục</v-card-title>
      <v-card-text>
        <v-list>
          <v-list-item v-for="cat in categories" :key="cat.id">
            <v-list-item-content>
              <v-list-item-title>
                <v-avatar :color="cat.color" size="20" class="mr-2"></v-avatar>
                {{ cat.name }}
                <v-btn icon small @click="editCategory(cat)">
                  <v-icon>mdi-pencil</v-icon>
                </v-btn>
                <v-btn icon small @click="deleteCategory(cat.id)">
                  <v-icon>mdi-delete</v-icon>
                </v-btn>
              </v-list-item-title>
              <v-list-item-subtitle>
                <v-chip
                  v-for="sub in cat.subcategories"
                  :key="sub.id"
                  class="mr-1"
                  small
                  close
                  @click:close="deleteSubcategory(sub.id)"
                >
                  {{ sub.name }}
                  <v-icon small right @click="editSubcategory(sub)">mdi-pencil</v-icon>
                </v-chip>
                <v-btn text small @click="openAddSub(cat.id)">+ Thêm danh mục con</v-btn>
              </v-list-item-subtitle>
            </v-list-item-content>
          </v-list-item>
        </v-list>
        <v-btn color="primary" block @click="openAddCategory">+ Thêm danh mục mới</v-btn>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn text @click="close">Đóng</v-btn>
      </v-card-actions>
    </v-card>

    <!-- Category Edit Dialog -->
    <v-dialog v-model="catDialog" max-width="400" persistent>
      <v-card>
        <v-card-title>{{ editingCategory ? 'Sửa danh mục' : 'Thêm danh mục mới' }}</v-card-title>
        <v-card-text>
          <v-text-field v-model="catForm.name" label="Tên danh mục"></v-text-field>
          <v-select v-model="catForm.color" :items="colorOptions" label="Màu sắc"></v-select>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn text @click="catDialog = false">Hủy</v-btn>
          <v-btn color="primary" @click="saveCategory">Lưu</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Subcategory Edit Dialog -->
    <v-dialog v-model="subDialog" max-width="400" persistent>
      <v-card>
        <v-card-title>{{ editingSub ? 'Sửa danh mục con' : 'Thêm danh mục con' }}</v-card-title>
        <v-card-text>
          <v-text-field v-model="subForm.name" label="Tên danh mục con"></v-text-field>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn text @click="subDialog = false">Hủy</v-btn>
          <v-btn color="primary" @click="saveSubcategory">Lưu</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-dialog>
</template>

<script setup>
import { ref, watch } from 'vue';
import { useCategoryStore } from '../stores/category';
import axios from '../utils/axios';

const props = defineProps({
  modelValue: Boolean,
});
const emit = defineEmits(['update:modelValue', 'updated']);
const categoryStore = useCategoryStore();
const visible = ref(false);
const categories = ref([]);
const catDialog = ref(false);
const subDialog = ref(false);
const editingCategory = ref(null);
const editingSub = ref(null);
const catForm = ref({ name: '', color: '#1E3C72' });
const subForm = ref({ name: '', category_id: null });
const colorOptions = ['#1E3C72', '#2A5298', '#5DADE2', '#27AE60', '#E74C3C', '#F39C12'];

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
  if (editingCategory.value) {
    await categoryStore.updateCategory(editingCategory.value.id, catForm.value);
  } else {
    await categoryStore.createCategory(catForm.value);
  }
  catDialog.value = false;
  await loadData();
  emit('updated');
}

async function deleteCategory(id) {
  if (confirm('Xóa danh mục sẽ xóa tất cả task và danh mục con. Bạn chắc chắn?')) {
    await categoryStore.deleteCategory(id);
    await loadData();
    emit('updated');
  }
}

function openAddSub(categoryId) {
  editingSub.value = null;
  subForm.value = { name: '', category_id: categoryId };
  subDialog.value = true;
}

function editSubcategory(sub) {
  editingSub.value = sub;
  subForm.value = { name: sub.name, category_id: sub.category_id };
  subDialog.value = true;
}

async function saveSubcategory() {
  const data = { name: subForm.value.name, category_id: subForm.value.category_id };
  if (editingSub.value) {
    await axios.put(`/api/subcategories/${editingSub.value.id}`, data);
  } else {
    await axios.post('/api/subcategories', data);
  }
  subDialog.value = false;
  await loadData();
  emit('updated');
}

async function deleteSubcategory(id) {
  if (confirm('Xóa danh mục con?')) {
    await axios.delete(`/api/subcategories/${id}`);
    await loadData();
    emit('updated');
  }
}
</script>