import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';
import vuetify from './plugins/vuetify';
import './styles/tailwind.css';
import './styles/global.css';

const app = createApp(App);
const pinia = createPinia();
app.use(pinia);
app.use(router);
app.use(vuetify);

// Initialize auth state from stored token
import { useAuthStore } from './stores/auth';
const auth = useAuthStore(pinia);
auth.init();

app.mount('#app');