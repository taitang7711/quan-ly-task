import { ref } from 'vue';

const toasts = ref([]);
let nextId = 1;

export function useToast() {
  function show(text, type = 'success', duration = 3500) {
    const id = nextId++;
    toasts.value.push({ id, text, type, visible: false });
    setTimeout(() => {
      const t = toasts.value.find(t => t.id === id);
      if (t) t.visible = true;
    }, 10);
    setTimeout(() => {
      remove(id);
    }, duration);
  }

  function remove(id) {
    const t = toasts.value.find(t => t.id === id);
    if (t) t.visible = false;
    setTimeout(() => {
      toasts.value = toasts.value.filter(t => t.id !== id);
    }, 300);
  }

  return { toasts, show, remove };
}

const icons = {
  success: 'mdi-check-circle',
  error: 'mdi-alert-circle',
  warning: 'mdi-alert',
  info: 'mdi-information',
};

const colors = {
  success: '#10B981',
  error: '#EF4444',
  warning: '#F59E0B',
  info: '#3B82F6',
};

export { icons, colors };
