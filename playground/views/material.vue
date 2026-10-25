<template>
  <main>
    <apple-container class="main-content material-page">
      <header class="page-heading material-heading">
        <div><div class="page-kicker">MATERIAL DESIGN 3</div><h1>Material<span>。</span></h1></div>
        <div class="material-heading-actions"><router-link to="/settings#setting-material" custom v-slot="{ href, navigate: follow }"><apple-link :href="href" @click="follow"><Palette :size="14" aria-hidden="true" />主题色</apple-link></router-link><apple-link href="https://github.com/floor/material" external>floor / material</apple-link></div>
      </header>
      <div class="directory-layout">
        <aside class="directory-index" aria-label="Material 组件目录">
          <span>Material 组件</span>
          <apple-tree v-model="activeId" v-model:expanded="expandedGroups" :items="treeItems" label="Material 组件目录树" @select="navigate" />
        </aside>
        <div class="material-content">
          <div class="feed-toolbar"><span class="feed-count">全部组件 <small>{{ materialCatalog.length }}</small></span><span class="material-version">v3.2.4 · MIT</span></div>
          <div class="apptify-material" :data-theme="materialTheme" :data-theme-mode="scheme">
            <section v-for="(section, index) in materialSections" :id="`material-${section.id}`" :key="section.id" class="feed-group feed-anchor" :aria-labelledby="`material-${section.id}-heading`">
              <header class="feed-group-heading"><span>0{{ index + 1 }}</span><h2 :id="`material-${section.id}-heading`">{{ section.label }}</h2><small>{{ section.items.length }} 个组件</small></header>
              <MasonryFeed class="feed-cards">
                <apple-card v-for="item in section.items" :id="`material-${item.name}`" :key="item.name" class="component-card material-card feed-anchor" :aria-labelledby="`material-${item.name}-heading`">
                  <header class="component-card-heading"><h3 :id="`material-${item.name}-heading`"><router-link :to="`#material-${item.name}`">{{ item.label }}<Hash :size="14" aria-hidden="true" /></router-link></h3><code>{{ item.name }}</code></header>
                  <section class="material-preview" :aria-label="`${item.label} Material 预览`"><MaterialDemo :name="item.name" /></section>
                  <ComponentDocumentLink :href="`/component-docs/material-${item.name}`" />
                </apple-card>
              </MasonryFeed>
            </section>
          </div>
        </div>
      </div>
    </apple-container>
  </main>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Hash, Palette } from 'lucide-vue-next'
import { useApple, type AppleTreeItem } from '../../src'
import ComponentDocumentLink from '../editor/ComponentDocumentLink.vue'
import MasonryFeed from '../components/MasonryFeed.vue'
import MaterialDemo from '../material/MaterialDemo.vue'
import { materialCatalog, materialSections } from '../material/catalog'
import { useMaterialTheme } from '../material/theme'
import '../../vendor/material/generated/style.css'

const apple = useApple()
const router = useRouter()
const scheme = computed(() => apple.theme.value.current.scheme)
const { name: materialTheme } = useMaterialTheme()
const activeId = ref('')
const expandedGroups = ref(materialSections.map(section => `material-${section.id}`))
const treeItems = materialSections.map(section => ({ label: section.label, value: `material-${section.id}`, children: section.items.map(item => ({ label: item.label, value: `material-${item.name}` })) }))
function navigate(item: AppleTreeItem) {
  if (!item.children?.length) void router.push(`/material#${item.value}`)
}
</script>

<style scoped>
.material-page { padding: 40px 40px 0; }
.material-heading { display: flex; align-items: flex-end; justify-content: space-between; gap: 20px; }
.material-heading-actions { display: flex; align-items: center; flex-wrap: wrap; gap: 20px; }
.material-heading-actions :deep(.apple-link) { font-size: 12px; color: var(--apple-secondary); }
.material-content { min-width: 0; }
.material-version { color: var(--apple-secondary); font-size: 11px; }
.feed-anchor { scroll-margin-top: 96px; }
.material-card { width: 100%; padding: 0; }
.material-card :deep(> .apple-card__body) { padding: 0; }
.material-preview { padding: 28px; min-height: 170px; display: flex; align-items: center; min-width: 0; }
.material-preview > * { width: 100%; min-width: 0; }
@media (max-width: 640px) { .material-page { padding: 28px 18px 0; } .material-heading { align-items: flex-start; flex-direction: column; } .material-preview { padding: 22px 18px; } }
</style>
