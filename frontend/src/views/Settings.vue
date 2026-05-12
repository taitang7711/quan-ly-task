<template>
  <div>
    <AppBar />
    <div class="app-content">
      <v-container class="pa-4 pt-2">
        <div class="flex items-center gap-3 mb-4">
          <div class="w-9 h-9 rounded-xl gradient-bg flex items-center justify-center shadow-md">
            <v-icon color="white" size="20">mdi-cog-outline</v-icon>
          </div>
          <h1 class="text-xl font-extrabold gradient-text">Cài đặt AI</h1>
        </div>

        <v-row justify="center">
          <v-col cols="12" md="8">
            <v-card class="pa-6 rounded-2xl">
              <div class="flex items-center gap-3 mb-6">
                <div class="w-12 h-12 rounded-2xl bg-purple-50 flex items-center justify-center">
                  <v-icon color="purple" size="28">mdi-robot-outline</v-icon>
                </div>
                <div>
                  <h2 class="font-bold text-lg">AI Configuration</h2>
                  <p class="text-xs text-gray-500">Configure your AI provider for intelligent features</p>
                </div>
              </div>

              <v-alert type="info" variant="tonal" class="mb-6 rounded-xl" density="compact">
                <template v-slot:prepend>
                  <v-icon>mdi-lightbulb-outline</v-icon>
                </template>
                Configure your AI provider to enable intelligent task breakdown, priority suggestions, and smart summaries.
              </v-alert>

              <v-form ref="form" v-model="valid">
                <v-select
                  v-model="config.provider"
                  :items="providers"
                  item-title="title"
                  item-value="value"
                  label="AI Provider"
                  required
                  @update:model-value="onProviderChange"
                  class="mb-1"
                />

                <v-text-field
                  v-model="config.model_name"
                  label="Model Name"
                  placeholder="e.g., gpt-4o, claude-3.5-sonnet"
                  required
                  class="mb-1"
                />

                <v-text-field
                  v-model="config.api_key"
                  :type="showApiKey ? 'text' : 'password'"
                  label="API Key"
                  placeholder="Enter your API key"
                  required
                  :append-inner-icon="showApiKey ? 'mdi-eye-off' : 'mdi-eye'"
                  @click:append-inner="showApiKey = !showApiKey"
                  class="mb-1"
                />

                <v-text-field
                  v-model="config.base_url"
                  label="Custom Base URL (optional)"
                  placeholder="http://localhost:8080/v1"
                  hint="Leave empty to use provider's default endpoint"
                  persistent-hint
                  class="mb-1"
                />

                <v-row>
                  <v-col cols="12" md="6">
                    <v-slider
                      v-model="config.temperature"
                      label="Temperature"
                      min="0"
                      max="2"
                      step="0.1"
                      thumb-label
                      density="compact"
                    />
                  </v-col>
                  <v-col cols="12" md="6">
                    <v-slider
                      v-model="config.max_tokens"
                      label="Max Tokens"
                      min="100"
                      max="4000"
                      step="100"
                      thumb-label
                      density="compact"
                    />
                  </v-col>
                </v-row>

                <v-switch
                  v-model="config.is_active"
                  label="Enable AI features"
                  color="primary"
                  inset
                />
              </v-form>

              <div class="flex justify-end gap-3 mt-4">
                <v-btn color="success" variant="tonal" @click="testConnection" :loading="testing" class="rounded-xl">
                  <v-icon size="18" class="mr-1">mdi-connection</v-icon>
                  Test Connection
                </v-btn>
                <v-btn color="primary" @click="saveConfig" :loading="saving" class="rounded-xl px-6">
                  <v-icon size="18" class="mr-1">mdi-content-save</v-icon>
                  Lưu
                </v-btn>
              </div>
            </v-card>

            <!-- AI History -->
            <v-card class="mt-4 pa-4 rounded-2xl">
              <div class="flex items-center gap-2 mb-4">
                <v-icon color="purple" size="20">mdi-history</v-icon>
                <span class="font-bold text-sm">AI Interaction History</span>
              </div>
              <v-data-table
                :headers="historyHeaders"
                :items="history"
                :loading="loadingHistory"
                density="compact"
                hide-default-footer
                items-per-page="5"
                class="custom-table"
              >
                <template v-slot:item.type="{ item }">
                  <v-chip :color="getTypeColor(item.type)" size="x-small" variant="flat" class="font-medium text-white">
                    {{ item.type }}
                  </v-chip>
                </template>
                <template v-slot:item.created_at="{ item }">
                  <span class="text-xs text-gray-500">{{ new Date(item.created_at).toLocaleString() }}</span>
                </template>
                <template v-slot:no-data>
                  <div class="text-center py-6 text-gray-400 text-sm">Chưa có lịch sử</div>
                </template>
              </v-data-table>
            </v-card>
          </v-col>
        </v-row>
      </v-container>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import axios from '../utils/axios';
import { useToast } from '../composables/useToast';
import AppBar from '../components/AppBar.vue';

const { show } = useToast();
const valid = ref(false);
const saving = ref(false);
const testing = ref(false);
const showApiKey = ref(false);
const loadingHistory = ref(false);

const providers = [
  { title: 'OpenAI', value: 'openai' },
  { title: 'Anthropic (Claude)', value: 'anthropic' },
  { title: 'Google Gemini', value: 'google' },
  { title: 'OpenAI Compatible (LocalAI, Ollama, etc.)', value: 'openai_compatible' }
];

const config = ref({
  provider: 'openai',
  model_name: 'gpt-3.5-turbo',
  api_key: '',
  base_url: '',
  temperature: 0.7,
  max_tokens: 1000,
  is_active: true
});

const history = ref([]);
const historyHeaders = [
  { title: 'Type', key: 'type', sortable: false },
  { title: 'Prompt', key: 'prompt', sortable: false },
  { title: 'Model', key: 'model_used', sortable: false },
  { title: 'Time', key: 'created_at', sortable: false },
];

function onProviderChange() {
  const models = {
    openai: 'gpt-3.5-turbo',
    anthropic: 'claude-3-haiku-20240307',
    google: 'gemini-1.5-flash',
    openai_compatible: 'gpt-3.5-turbo',
  };
  config.value.model_name = models[config.value.provider] || 'gpt-3.5-turbo';
}

async function saveConfig() {
  saving.value = true;
  try {
    await axios.post('/ai/config', config.value);
    show('Configuration saved!', 'success');
  } catch (err) {
    show('Failed to save configuration', 'error');
  } finally {
    saving.value = false;
  }
}

async function testConnection() {
  testing.value = true;
  try {
    const res = await axios.post('/ai/general', { prompt: 'Say "Connection successful"' });
    if (res.data.result && res.data.result.suggestion) {
      show('Connection successful!', 'success');
    } else {
      show('Invalid response from AI', 'warning');
    }
  } catch (err) {
    show('Connection failed: ' + (err.response?.data?.error || err.message), 'error');
  } finally {
    testing.value = false;
  }
}

async function loadConfig() {
  try {
    const res = await axios.get('/ai/config');
    if (res.data.config) {
      const { id, user_id, created_at, updated_at, api_key_encrypted, ...formFields } = res.data.config;
      config.value = { ...config.value, ...formFields, api_key: '' };
    }
  } catch (err) {
    console.error('Failed to load config:', err);
  }
}

async function loadHistory() {
  loadingHistory.value = true;
  try {
    const res = await axios.get('/ai/history', { params: { limit: 10 } });
    history.value = res.data.history;
  } catch (err) {
    console.error('Failed to load history:', err);
  } finally {
    loadingHistory.value = false;
  }
}

function getTypeColor(type) {
  const colors = {
    breakdown: 'blue',
    priority: 'orange',
    suggest: 'green',
    blocker: 'red',
    general: 'purple',
    summarize: 'teal',
    report_summary: 'indigo'
  };
  return colors[type] || 'grey';
}

onMounted(() => {
  loadConfig();
  loadHistory();
});
</script>

<style scoped>
.app-content {
  padding-top: 64px;
}

.custom-table :deep(table) {
  border-collapse: separate;
  border-spacing: 0 4px;
}

.custom-table :deep(thead th) {
  background: #F8FAFC !important;
  color: #64748B !important;
  font-size: 0.75rem !important;
  font-weight: 600 !important;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 8px 12px !important;
  border-bottom: none !important;
}

.custom-table :deep(tbody td) {
  padding: 10px 12px !important;
  border-bottom: none !important;
  background: white;
}
</style>
