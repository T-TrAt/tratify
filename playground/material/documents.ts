import { defineAsyncComponent, defineComponent, h } from 'vue'
import type { DocumentRegistration } from '../editor/documents'
import type { ComponentDocument } from '../editor/contract'
import { materialCatalog } from './catalog'

export const materialChildComponents: Record<string, string> = {
  'button-group-item': 'button-group', 'carousel-item': 'carousel', chip: 'chips',
  'drawer-item': 'drawer', 'fab-menu-item': 'fab-menu', 'list-item': 'list',
  'menu-item': 'menu', 'navigation-bar-item': 'navigation-bar', 'navigation-rail-item': 'navigation-rail',
  radio: 'radios', 'search-suggestion': 'search', 'select-option': 'select', tab: 'tabs',
}
const childLabels: Record<string, string> = {
  'button-group-item': '按钮组项', 'carousel-item': '轮播项', chip: '标签项', 'drawer-item': '抽屉导航项',
  'fab-menu-item': '浮动菜单项', 'list-item': '列表项', 'menu-item': '菜单项', 'navigation-bar-item': '导航栏项',
  'navigation-rail-item': '侧边导航项', radio: '单选项', 'search-suggestion': '搜索建议', 'select-option': '选择项', tab: '标签页项',
}
export const materialComponentName = (slug: string) => 'M' + slug.split('-').map(word => word[0].toUpperCase() + word.slice(1)).join('')
export const materialDocuments: Record<string, DocumentRegistration> = Object.fromEntries([
  ...materialCatalog.map(item => ({ slug: item.name, label: item.label, group: item.group, example: item.name })),
  ...Object.entries(materialChildComponents).map(([slug, parent]) => ({ slug, label: childLabels[slug], group: materialCatalog.find(item => item.name === parent)!.group, example: parent })),
].map(item => [`material-${item.slug}`, {
  name: materialComponentName(item.slug), label: item.label, group: item.group,
  description: `${materialComponentName(item.slug)} 的用法与公开接口。`,
  directory: { label: 'Material', href: '/material', anchor: `/material#material-${item.example}` },
  preview: defineAsyncComponent(async () => {
    const { default: Example } = await import('./MaterialDocumentExample.vue')
    return defineComponent({ setup: () => () => h(Example, { name: item.example, component: item.slug }) })
  }),
  load: async () => ({ default: ((await import('./api.json')).default as Record<string, ComponentDocument>)[item.slug] }),
}]))
