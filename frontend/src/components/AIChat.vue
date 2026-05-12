<template>
  <div class="ai-chat">
    <v-btn
      size="large"
      color="primary"
      class="fixed bottom-6 left-6 rounded-2xl shadow-xl shadow-blue-900/30 hover:shadow-blue-900/40 hover-lift z-50"
      @click="toggleChat"
    >
      <v-icon size="22">mdi-robot-outline</v-icon>
    </v-btn>

    <Transition name="chat-slide">
      <v-card
        v-if="isOpen"
        class="chat-window glass-strong rounded-2xl shadow-2xl"
        style="position: fixed; bottom: 80px; left: 16px; width: 360px; z-index: 1000;"
      >
        <div class="flex items-center justify-between p-4 border-b border-gray-100">
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 rounded-lg gradient-bg flex items-center justify-center">
              <v-icon color="white" size="16">mdi-robot</v-icon>
            </div>
            <div>
              <span class="font-bold text-sm">AI Assistant</span>
              <div class="flex items-center gap-1">
                <span class="w-1.5 h-1.5 rounded-full bg-green-400"></span>
                <span class="text-[10px] text-gray-400">Online</span>
              </div>
            </div>
          </div>
          <v-btn icon variant="text" size="small" @click="toggleChat">
            <v-icon size="18">mdi-close</v-icon>
          </v-btn>
        </div>

        <div class="chat-messages p-4" ref="messagesContainer">
          <div v-for="msg in messages" :key="msg.id" class="mb-3" :class="msg.role === 'user' ? 'text-right' : ''">
            <div
              class="inline-block px-3 py-2 rounded-2xl text-sm max-w-[85%]"
              :class="msg.role === 'user' ? 'bg-primary text-white rounded-br-md' : 'bg-gray-100 text-gray-800 rounded-bl-md'"
            >
              <span class="font-semibold text-[10px] block opacity-70 mb-0.5">
                {{ msg.role === 'user' ? 'Bạn' : 'AI' }}
              </span>
              {{ msg.content }}
            </div>
          </div>
          <div v-if="loading" class="flex items-center gap-2 text-gray-400 text-sm">
            <div class="flex gap-1">
              <span class="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style="animation-delay: 0ms"></span>
              <span class="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style="animation-delay: 150ms"></span>
              <span class="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style="animation-delay: 300ms"></span>
            </div>
            <span class="text-xs">AI đang suy nghĩ...</span>
          </div>
        </div>

        <div class="p-3 border-t border-gray-100">
          <div class="flex items-center gap-2">
            <v-text-field
              v-model="inputMessage"
              placeholder="Nhập câu hỏi..."
              hide-details
              density="compact"
              variant="solo-filled"
              flat
              bg-color="gray-100"
              class="chat-input"
              @keyup.enter="sendMessage"
            />
            <v-btn icon color="primary" variant="flat" @click="sendMessage" :disabled="!inputMessage.trim()" class="rounded-xl">
              <v-icon>mdi-send</v-icon>
            </v-btn>
          </div>
        </div>
      </v-card>
    </Transition>
  </div>
</template>

<script setup>
import { ref, nextTick } from 'vue';
import axios from '../utils/axios';

const isOpen = ref(false);
const inputMessage = ref('');
const messages = ref([]);
const loading = ref(false);
const messagesContainer = ref(null);
let nextId = 1;

function toggleChat() {
  isOpen.value = !isOpen.value;
}

const props = defineProps({
  taskId: {
    type: Number,
    default: null
  }
});

async function sendMessage() {
  if (!inputMessage.value.trim()) return;
  const userMsg = { id: nextId++, role: 'user', content: inputMessage.value };
  messages.value.push(userMsg);
  const userInput = inputMessage.value;
  inputMessage.value = '';
  loading.value = true;
  try {
    const payload = { prompt: userInput };
    if (props.taskId) payload.task_id = props.taskId;
    const res = await axios.post('/ai/general', payload);
    messages.value.push({ id: nextId++, role: 'ai', content: res.data.result.suggestion });
  } catch (err) {
    messages.value.push({ id: nextId++, role: 'ai', content: 'Xin lỗi, tôi gặp lỗi. Vui lòng thử lại.' });
  } finally {
    loading.value = false;
    await nextTick();
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
    }
  }
}
</script>

<style scoped>
.chat-window {
  overflow: hidden;
}

.chat-messages {
  height: 350px;
  overflow-y: auto;
  scrollbar-width: thin;
}

.chat-messages::-webkit-scrollbar {
  width: 4px;
}

.chat-messages::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.1);
  border-radius: 10px;
}

.chat-input :deep(.v-field) {
  border-radius: 12px !important;
  box-shadow: none !important;
}

.chat-slide-enter-active {
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.chat-slide-leave-active {
  transition: all 0.2s ease-in;
}

.chat-slide-enter-from,
.chat-slide-leave-to {
  opacity: 0;
  transform: translateY(10px) scale(0.95);
}

@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-4px); }
}

.animate-bounce {
  animation: bounce 1s infinite;
}
</style>
