import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { MotionPlugin } from '@vueuse/motion'

import App from './App.vue'
import router from './router'
import { useThemeStore } from './stores/theme'
import './assets/main.css'

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(MotionPlugin)

useThemeStore().init()

app.mount('#app')
