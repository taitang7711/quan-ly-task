<template>
  <v-container>
    <v-row justify="center">
      <v-col cols="12" md="8">
        <v-card>
          <v-card-title class="text-h5 primary white--text">
            ⚙️ AI Configuration
          </v-card-title>
          <v-card-text class="mt-4">
            <v-alert type="info" dense class="mb-4">
              Configure your AI provider to enable intelligent task breakdown, priority suggestions, and smart summaries.
            </v-alert>

            <v-form ref="form" v-model="valid">
              <v-select
                v-model="config.provider"
                :items="providers"
                label="AI Provider"
                required
                outlined
                dense
                @change="onProviderChange"
              ></v-select>

              <v-text-field
                v-model="config.model_name"
                label="Model Name"
                placeholder="e.g., gpt-4o, claude-3.5-sonnet, gemini-1.5-pro"
                required
                outlined
                dense
              ></v-text-field>

              <v-text-field
                v-model="config.api_key"
                :type="showApiKey ? 'text' : 'password'"
                label="API Key"
                placeholder="Enter your API key"
                required
                outlined
                dense
                :append-icon="showApiKey ? 'mdi-eye-off' : 'mdi-eye'"
                @click:append="showApiKey = !showApiKey"
              ></v-text-field>

              <v-text-field
                v-if="config.provider === 'openai_compatible'"
                v-model="config.base_url"
                label="Custom Base URL"
                placeholder="http://localhost:8080/v1"
                outlined
                dense
              ></v-text-field>

              <v-row>
                <v-col cols="12" md="6">
                  <v-slider
                    v-model="config.temperature"
                    label="Temperature"
                    min="0"
                    max="2"
                    step="0.1"
                    thumb-label
                    dense
                  ></v-slider>
                </v-col>
                <v-col cols="12" md="6">
                  <v-slider
                    v-model="config.max_tokens"
                    label="Max Tokens"
                    min="100"
                    max="4000"
                    step="100"
                    thumb-label
                    dense
                  ></v-slider>
                </v-col>
              </v-row>

              <v-switch
                v-model="config.is_active"
                label="Enable AI features"
                color="primary"
              ></v-switch>
            </v-form>
          </v-card-text>

          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn color="primary" @click="saveConfig" :loading="saving">
              Save Configuration
            </v-btn>
            <v-btn color="success" @click="testConnection" :loading="testing">
              Test Connection
            </v-btn>
          </v-card-actions>

          <v-snackbar v-model="snackbar.show" :color="snackbar.color" timeout="3000">
            {{ snackbar.text }}
          </v-snackbar>
        </v-card>

        <v-card class="mt-4">
          <v-card-title class="text-h6">
            📊 AI Interaction History
          </v-card-title>
          <v-card-text>
            <v-data-table
              :headers="historyHeaders"
              :items="history"
              :loading="loadingHistory"
              dense
              items-per-page="5"
            >
              <template v-slot:item.type="{ item }">
                <v-chip small :color="getTypeColor(item.type)">
                  {{ item.type }}
                </v-chip>
              </template>
              <template v-slot:item.created_at="{ item }">
                {{ new Date(item.created_at).toLocaleString() }}
              </template>
            </v-data-table>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import axios from '../utils/axios';

const valid = ref(false);
const saving = ref(false);
const testing = ref(false);
const showApiKey = ref(false);
const loadingHistory = ref(false);
const snackbar = ref({ show: false, text: '', color: 'success' });

const providers = [
  { text: 'OpenAI', value: 'openai' },
  { text: 'Anthropic (Claude)', value: 'anthropic' },
  { text: 'Google Gemini', value: 'google' },
  { text: 'OpenAI Compatible (LocalAI, Ollama, etc.)', value: 'openai_compatible' }
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
  { title: 'Type', key: 'type' },
  { title: 'Prompt', key: 'prompt' },
  { title: 'Model', key: 'model_used' },
  { title: 'Time', key: 'created_at' }
];

function onProviderChange() {
  if (config.value.provider === 'openai') {
    config.value.model_name = 'gpt-3.5-turbo';
  } else if (config.value.provider === 'anthropic') {
    config.value.model_name = 'claude-3-haiku-20240307';
  } else if (config.value.provider === 'google') {
    config.value.model_name = 'gemini-1.5-flash';
  } else if (config.value.provider === 'openai_compatible') {
    config.value.model_name = 'gpt-3.5-turbo';
  }
}

async function saveConfig() {
  saving.value = true;
  try {
    await axios.post('/ai/config', config.value);
    snackbar.value = { show: true, text: 'Configuration saved successfully!', color: 'success' };
  } catch (err) {
    snackbar.value = { show: true, text: 'Failed to save configuration', color: 'error' };
  } finally {
    saving.value = false;
  }
}

async function testConnection() {
  testing.value = true;
  try {
    // Test with a simple prompt
    const res = await axios.post('/ai/general', { prompt: 'Say "Connection successful"' });
    if (res.data.result && res.data.result.suggestion) {
      snackbar.value = { show: true, text: 'Connection successful! AI responded.', color: 'success' };
    } else {
      snackbar.value = { show: true, text: 'Connection failed: Invalid response', color: 'error' };
    }
  } catch (err) {
    snackbar.value = { show: true, text: 'Connection failed: ' + (err.response?.data?.error || err.message), color: 'error' };
  } finally {
    testing.value = false;
  }
}

async function loadConfig() {
  try {
    const res = await axios.get('/ai/config');
    if (res.data.config) {
      config.value = { ...config.value, ...res.data.config };
      config.value.api_key = ''; // Don't show stored key
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
