<template>
  <main>
    <apple-container class="main-content tags-page">
      <header class="page-heading"><h1 id="tags-heading">材质实验室</h1></header>
      <TextureTagWorkshop />
      <h2 id="basic-tags-heading" class="basic-tags-heading">基础标签</h2>
      <apple-card id="apple-tag" class="component-card" aria-labelledby="basic-tags-heading">
        <section class="detail-preview" aria-label="标签预览"><ComponentDemo name="AppleTag" /></section>
        <ComponentDocumentLink href="/component-docs/apple-tag" label="代码与 API" />
      </apple-card>
    </apple-container>
  </main>
</template>

<script setup lang="ts">
import ComponentDemo from '../ComponentDemo.vue'
import ComponentDocumentLink from '../editor/ComponentDocumentLink.vue'
import TextureTagWorkshop from '../components/TextureTagWorkshop.vue'
</script>

<style scoped>
.tags-page { padding-bottom: 40px; }
.basic-tags-heading { margin: 0 0 18px; font-size: 16px; font-weight: 600; }
.component-card { padding: 0; }
.component-card :deep(> .apple-card__body) { padding: 0; border-radius: inherit; }
.component-card :deep(> .apple-card__body > .documentation-entry) { border-radius: 0 0 18px 18px; overflow: hidden; }
</style>
