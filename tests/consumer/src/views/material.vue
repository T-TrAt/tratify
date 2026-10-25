<template>
  <main class="apptify-material" data-theme="baseline" data-theme-mode="light">
    <MTextField v-model="name" label="Material 姓名" />
    <MCheckbox v-model="agreed">接收更新</MCheckbox>
    <MButton @click="saved = name">保存 Material</MButton>
    <output>{{ saved }}</output>
  </main>
</template>
<script setup lang="ts">
import { ref } from 'vue'
import { MButton, MCheckbox, MTextField } from 'apptify/material'
import 'apptify/material/style.css'
const name = ref('Material'), agreed = ref(false), saved = ref('')
</script>
