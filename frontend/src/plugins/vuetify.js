import 'vuetify/styles';
import { createVuetify } from 'vuetify';
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';
import '@mdi/font/css/materialdesignicons.css';

export default createVuetify({
  components,
  directives,
  theme: {
    defaultTheme: 'light',
    themes: {
      light: {
        colors: {
          primary: '#1E3C72',
          secondary: '#2A5298',
          accent: '#5DADE2',
          background: '#F0F4F8',
          surface: '#FFFFFF',
          'surface-variant': '#F7F9FC',
          'on-primary': '#FFFFFF',
          'on-secondary': '#FFFFFF',
          'on-surface': '#1A202C',
          'on-background': '#2D3748',
          success: '#10B981',
          warning: '#F59E0B',
          error: '#EF4444',
          info: '#3B82F6',
        },
      },
    },
  },
  defaults: {
    VCard: {
      elevation: 0,
      class: 'border border-gray-100/80 shadow-lg shadow-gray-200/50',
    },
    VBtn: {
      class: 'font-medium tracking-wide',
    },
    VTextField: {
      variant: 'outlined',
      density: 'comfortable',
    },
    VSelect: {
      variant: 'outlined',
      density: 'comfortable',
    },
    VTextarea: {
      variant: 'outlined',
      density: 'comfortable',
    },
  },
});
