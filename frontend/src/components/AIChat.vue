<template>
  <div class="ai-chat">
    <v-btn
      fab
      fixed
      bottom
      right
      color="primary"
      class="mr-4 mb-4"
      @click="toggleChat"
    >
      <v-icon>mdi-chat</v-icon>
    </v-btn>
    <v-card
      v-if="isOpen"
      class="chat-window"
      style="position: fixed; bottom: 80px; right: 16px; width: 350px; z-index: 1000;"
    >
      <v-card-title class="primary white--text">
        AI Assistant
        <v-spacer></v-spacer>
        <v-btn icon dark @click="toggleChat">
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-card-title>
      <v-card-text style="height: 400px; overflow-y: auto;">
        <div v-for="msg in messages" :key="msg.id" class="mb-2">
          <v-chip :color="msg.role === 'user' ? 'primary' : 'accent'" small>
            {{ msg.role === 'user' ? 'Bạn' : 'AI' }}
          </v-chip>
          <div class="mt-1">{{ msg.content }}</div>
        </div>
        <div v-if="loading" class="text-center">
          <v-progress-circular indeterminate size="20"></v-progress-circular>
        </div>
      </v-card-text>
      <v-card-actions>
        <v-text-field
          v-model="inputMessage"
          label="Nhập câu hỏi..."
          dense
          @keyup.enter="sendMessage"
        ></v-text-field>
        <v-btn icon @click="sendMessage">
          <v-icon>mdi-send</v-icon>
        </v-btn>
      </v-card-actions>
    </v-card>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import axios from '../utils/axios';

const isOpen = ref(false);
const inputMessage = ref('');
const messages = ref([]);
const loading = ref(false);
let nextId = 1;

function toggleChat() {
  isOpen.value = !isOpen.value;
}

async function sendMessage() {
  if (!inputMessage.value.trim()) return;
  const userMsg = { id: nextId++, role: 'user', content: inputMessage.value };
  messages.value.push(userMsg);
  const userInput = inputMessage.value;
  inputMessage.value = '';
  loading.value = true;
  try {
    const res = await axios.post('/ai/general', { prompt: userInput });
    const aiMsg = { id: nextId++, role: 'ai', content: res.data.result.suggestion };
    messages.value.push(aiMsg);
  } catch (err) {
    messages.value.push({ id: nextId++, role: 'ai', content: 'Xin lỗi, tôi gặp lỗi. Vui lòng thử lại.' });
  } finally {
    loading.value = false;
  }
}
</script>