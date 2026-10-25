<template>
  <div class="material-demo" :data-material-component="name" :data-component="name">
    <div v-if="name === 'button'" class="material-demo-row">
      <MButton v-for="variant in buttonVariants" :key="variant" :variant="variant" @click="record(variant)">{{ buttonLabels[variant] }}</MButton>
      <MButton disabled>不可用</MButton>
    </div>
    <div v-else-if="name === 'icon-button'" class="material-demo-row">
      <MIconButton v-model="liked" variant="filled" :icon="icons.heart" :selected-icon="icons.heartFilled" toggle aria-label="收藏" />
      <MIconButton variant="tonal" :icon="icons.bell" aria-label="通知" @click="record('暂无新通知')" />
      <MIconButton variant="outlined" :icon="icons.plus" aria-label="添加" @click="record('已添加')" />
    </div>
    <MButtonGroup v-else-if="name === 'button-group'" v-model="selection" kind="connected" selection="single" variant="tonal" aria-label="视图选择">
      <MButtonGroupItem value="overview">总览</MButtonGroupItem><MButtonGroupItem value="details">详情</MButtonGroupItem><MButtonGroupItem value="activity">动态</MButtonGroupItem>
    </MButtonGroup>
    <MSplitButton v-else-if="name === 'split-button'" label="保存" :icon="icons.check" trailing-label="保存选项" @click="record('已保存')" @select="record">
      <MMenuItem value="save-copy">保存副本</MMenuItem><MMenuItem value="export">导出文件</MMenuItem>
    </MSplitButton>
    <div v-else-if="name === 'fab'" class="material-demo-row">
      <MFab :icon="icons.plus" aria-label="新建项目" @click="record('已新建项目')" />
      <MFab variant="tertiary-container" :icon="icons.edit" aria-label="编辑项目" @click="record('开始编辑')" />
    </div>
    <div v-else-if="name === 'extended-fab'" class="material-demo-row"><MExtendedFab :icon="icons.edit" @click="record('开始撰写')">撰写</MExtendedFab><MExtendedFab variant="secondary-container" :icon="icons.plus" @click="record('已新建文件')">新建文件</MExtendedFab></div>
    <MFabMenu v-else-if="name === 'fab-menu'" :icon="icons.plus" aria-label="创建内容" presentation="menu" @select="record">
      <MFabMenuItem value="document" :icon="icons.document">新建文档</MFabMenuItem><MFabMenuItem value="folder" :icon="icons.folder">新建文件夹</MFabMenuItem>
    </MFabMenu>
    <div v-else-if="name === 'menu'" class="material-demo-stack">
      <MButton :id="menuAnchor" variant="tonal">更多操作</MButton>
      <MMenu :default-anchor="menuAnchor" aria-label="项目操作" @select="record"><MMenuItem value="favorite" :icon="icons.heart">加入收藏</MMenuItem><MMenuItem value="share" :icon="icons.share">分享</MMenuItem><MMenuItem divider /><MMenuItem value="delete">删除</MMenuItem></MMenu>
    </div>
    <div v-else-if="name === 'text-field'" class="material-demo-stack full-width"><MTextField v-model="text" label="姓名" variant="outlined" placeholder="怎么称呼你" /><MTextField v-model="bio" label="个人简介" type="multiline" :maxlength="100" supporting-text="最多 100 字" /></div>
    <MSearch v-else-if="name === 'search'" v-model="query" class="full-width" placeholder="搜索组件" aria-label="搜索组件" @select="record"><MSearchSuggestion v-for="item in searchResults" :key="item" :value="item">{{ item }}</MSearchSuggestion></MSearch>
    <MSelect v-else-if="name === 'select'" v-model="city" label="目的地" variant="outlined" class="full-width"><MSelectOption value="shanghai">上海</MSelectOption><MSelectOption value="hangzhou">杭州</MSelectOption><MSelectOption value="chengdu">成都</MSelectOption><MSelectOption value="closed" disabled>暂未开放</MSelectOption></MSelect>
    <div v-else-if="name === 'checkbox'" class="material-demo-stack"><MCheckbox v-model="checked">接收项目更新</MCheckbox><MCheckbox :indeterminate="true">部分选中</MCheckbox><MCheckbox disabled>不可用</MCheckbox></div>
    <MRadios v-else-if="name === 'radios'" v-model="delivery" aria-label="配送方式"><MRadio value="express">快递配送</MRadio><MRadio value="pickup">到店自取</MRadio><MRadio value="closed" disabled>暂不可用</MRadio></MRadios>
    <div v-else-if="name === 'switch'" class="material-demo-stack"><MSwitch v-model="checked">接收通知</MSwitch><MSwitch disabled>勿扰模式</MSwitch></div>
    <div v-else-if="name === 'slider'" class="material-demo-stack full-width"><MSlider v-model="level" class="full-width" label="音量" :min="0" :max="100" show-value ticks :step="5" /><MSlider v-model="low" v-model:second-value="high" class="full-width" range label="价格区间" :min="0" :max="100" :step="10" show-value /></div>
    <MChips v-else-if="name === 'chips'" v-model="chips" aria-label="内容分类"><MChip value="design" :icon="icons.edit">设计</MChip><MChip value="code" :icon="icons.code">开发</MChip><MChip value="photo" :icon="icons.image">摄影</MChip><MChip value="closed" disabled>未开放</MChip></MChips>
    <MDatepicker v-else-if="name === 'datepicker'" v-model="date" label="到店日期" variant="modal" class="full-width" />
    <div v-else-if="name === 'timepicker'" class="material-demo-stack"><MButton variant="tonal" @click="timepicker = true">选择预约时间</MButton><MTimepicker v-model="time" :open="timepicker" label="预约时间" type="input" format="24h" @close="timepicker = false" /></div>
    <div v-else-if="name === 'tabs'" class="material-demo-stack full-width"><MTabs v-model="tab"><MTab value="overview">总览</MTab><MTab value="details">详情</MTab><MTab value="activity">动态</MTab></MTabs><div class="tab-content">{{ tab === 'overview' ? '项目进度与近期活动。' : tab === 'details' ? '项目成员、时间与配置。' : '最近的修改与操作记录。' }}</div></div>
    <MNavigationBar v-else-if="name === 'navigation-bar'" v-model="destination" aria-label="示例底部导航" class="full-width"><MNavigationBarItem value="home" :icon="icons.home">首页</MNavigationBarItem><MNavigationBarItem value="favorite" :icon="icons.heart">收藏</MNavigationBarItem><MNavigationBarItem value="inbox" :icon="icons.bell" badge="3">消息</MNavigationBarItem></MNavigationBar>
    <div v-else-if="name === 'navigation-rail'" class="rail-demo full-width"><MNavigationRail v-model="destination" aria-label="示例侧边导航"><MNavigationRailItem value="home" :icon="icons.home">首页</MNavigationRailItem><MNavigationRailItem value="favorite" :icon="icons.heart">收藏</MNavigationRailItem><MNavigationRailItem value="inbox" :icon="icons.bell">消息</MNavigationRailItem></MNavigationRail><div class="rail-content">{{ destinationLabels[destination || 'home'] }}</div></div>
    <div v-else-if="name === 'drawer'" class="material-demo-stack"><MButton variant="tonal" @click="drawer = true">打开导航抽屉</MButton><MDrawer v-model="destination" :open="drawer" modal headline="工作空间" aria-label="示例导航抽屉" @close="drawer = false" @change="drawer = false"><MDrawerItem value="home" :icon="icons.home">首页</MDrawerItem><MDrawerItem value="favorite" :icon="icons.heart">收藏</MDrawerItem><MDrawerItem value="inbox" :icon="icons.bell">消息</MDrawerItem></MDrawer></div>
    <div v-else-if="name === 'top-app-bar'" class="app-bar-demo full-width"><MTopAppBar headline="工作空间" type="small" no-scroll class="full-width"><template #leading><MIconButton :icon="icons.menu" aria-label="打开目录" @click="record('目录已打开')" /></template><template #trailing><MIconButton :icon="icons.search" aria-label="搜索工作空间" @click="record('开始搜索')" /></template></MTopAppBar></div>
    <div v-else-if="name === 'bottom-app-bar'" class="app-bar-demo full-width"><MBottomAppBar aria-label="示例底部工具栏" class="full-width"><MIconButton :icon="icons.menu" aria-label="目录" @click="record('已打开目录')" /><MIconButton :icon="icons.search" aria-label="查找" @click="record('开始查找')" /><MIconButton :icon="icons.heart" aria-label="收藏项目" @click="record('已收藏项目')" /><template #fab><MFab :icon="icons.plus" aria-label="添加项目" @click="record('已添加项目')" /></template></MBottomAppBar></div>
    <MToolbar v-else-if="name === 'toolbar'" placement="none" aria-label="文本工具栏"><MIconButton :icon="icons.edit" aria-label="编辑" @click="record('编辑模式')" /><MIconButton :icon="icons.image" aria-label="插入图片" @click="record('选择图片')" /><MIconButton :icon="icons.share" aria-label="分享文档" @click="record('分享文档')" /></MToolbar>
    <MCard v-else-if="name === 'card'" headline="沿途的风景" subhead="周末灵感" variant="outlined" class="full-width"><template #media><img :src="imageUrl('lake.jpg')" alt="湖畔山景" class="material-card-image" /></template><p>给日常留一点探索的空间。</p><template #actions><MButton variant="text" @click="record('已加入旅行清单')">加入清单</MButton><MButton @click="record('开始探索')">探索</MButton></template></MCard>
    <MCarousel v-else-if="name === 'carousel'" v-model:index="slide" class="material-carousel full-width" :item-width="260" aria-label="旅行灵感"><MCarouselItem v-for="item in slides" :key="item.file" :value="item.file" :src="imageUrl(item.file)" :alt="item.title">{{ item.title }}</MCarouselItem></MCarousel>
    <MList v-else-if="name === 'list'" v-model="listSelection" selection="single" aria-label="项目列表" class="full-width"><MListItem value="design" :leading-icon="icons.edit" supporting-text="更新于今天">设计系统</MListItem><MListItem value="code" :leading-icon="icons.code" supporting-text="3 项待完成">组件开发</MListItem><MListItem value="release" :leading-icon="icons.document" supporting-text="准备中">发布计划</MListItem></MList>
    <div v-else-if="name === 'divider'" class="material-demo-stack full-width"><span>项目概览</span><MDivider /><div class="material-demo-row"><span>设计</span><MDivider orientation="vertical" style="height: 24px" /><span>开发</span><MDivider orientation="vertical" style="height: 24px" /><span>发布</span></div></div>
    <div v-else-if="name === 'badge'" class="material-demo-row"><span class="badge-target"><MIconButton :icon="icons.bell" aria-label="查看未读消息" @click="count = 0; record('消息已读')" /><MBadge :label="String(count)" :max="99" /></span><span class="badge-target"><MIconButton :icon="icons.heart" aria-label="新增收藏" @click="count++" /><MBadge variant="small" label="新" /></span><MButton variant="text" @click="count++">增加消息</MButton></div>
    <div v-else-if="name === 'progress'" class="material-demo-stack full-width"><MProgress :value="progress" show-label aria-label="文件上传进度" /><div class="material-demo-row"><MProgress variant="circular" :value="progress" :size="44" aria-label="圆形上传进度" /><MButton variant="tonal" @click="progress = progress >= 100 ? 0 : Math.min(100, progress + 20)">{{ progress >= 100 ? '重新开始' : '继续上传' }}</MButton></div></div>
    <div v-else-if="name === 'loading-indicator'" class="material-demo-row"><MLoadingIndicator v-if="loading" :size="48" aria-label="正在同步" /><MLoadingIndicator v-if="loading" :size="56" contained aria-label="正在加载内容" /><MButton variant="tonal" @click="loading = !loading">{{ loading ? '停止加载' : '开始加载' }}</MButton></div>
    <div v-else-if="name === 'tooltip'" class="material-demo-row"><MButton :id="tooltipAnchor" variant="tonal" @click="record('已保存到收藏')">悬停或聚焦</MButton><MTooltip :for="tooltipAnchor" text="将当前项目加入收藏" :show-delay="150" /></div>
    <div v-else-if="name === 'snackbar'" class="material-demo-row"><MButton variant="tonal" @click="snackbar = true">显示消息</MButton><MSnackbar :open="snackbar" message="更改已保存" action="撤销" dismissible duration="4000" @close="snackbar = false" @action="record('已撤销'); snackbar = false" /></div>
    <div v-else-if="name === 'dialog'" class="material-demo-row"><MButton variant="tonal" @click="dialog = true">打开对话框</MButton><MDialog :open="dialog" headline="保存更改？" size="small" @close="dialog = false"><p>你的更改会保存在当前工作空间。</p><template #actions><MButton variant="text" @click="dialog = false; record('已取消')">取消</MButton><MButton @click="dialog = false; record('更改已保存')">保存</MButton></template></MDialog></div>
    <div v-else-if="name === 'bottom-sheet'" class="material-demo-row"><MButton variant="tonal" @click="bottomSheet = true">打开底部面板</MButton><MBottomSheet :open="bottomSheet" modal headline="分享项目" :peek-height="300" @close="bottomSheet = false"><div class="sheet-content"><p>选择分享范围。</p><MButton @click="bottomSheet = false; record('已创建分享链接')">创建分享链接</MButton></div></MBottomSheet></div>
    <div v-else-if="name === 'side-sheet'" class="material-demo-row"><MButton variant="tonal" @click="sideSheet = true">打开侧边面板</MButton><MSideSheet :open="sideSheet" modal headline="项目详情" position="end" :width="340" @close="sideSheet = false"><div class="sheet-content"><p>设计系统 · 12 个成员</p><MTextField v-model="text" label="项目名称" /><MButton @click="sideSheet = false; record('项目已更新')">完成</MButton></div></MSideSheet></div>
    <output v-if="statusText" class="material-demo-status" aria-live="polite">{{ statusText }}</output>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, useId } from 'vue'
import {
  MBadge, MBottomAppBar, MBottomSheet, MButton, MButtonGroup, MButtonGroupItem, MCard,
  MCarousel, MCarouselItem, MCheckbox, MChip, MChips, MDatepicker, MDialog, MDivider,
  MDrawer, MDrawerItem, MExtendedFab, MFab, MFabMenu, MFabMenuItem, MIconButton,
  MList, MListItem, MLoadingIndicator, MMenu, MMenuItem, MNavigationBar, MNavigationBarItem,
  MNavigationRail, MNavigationRailItem, MProgress, MRadio, MRadios, MSearch, MSearchSuggestion,
  MSelect, MSelectOption, MSideSheet, MSlider, MSnackbar, MSplitButton, MSwitch, MTab,
  MTabs, MTextField, MTimepicker, MToolbar, MTooltip, MTopAppBar,
} from '../../vendor/material/generated/index.js'
import { imageUrl } from '../images'

const props = defineProps<{ name: string }>()
const menuAnchor = `material-menu-${useId()}`
const tooltipAnchor = `material-tooltip-${useId()}`
const icon = (path: string) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${path}"/></svg>`
const icons = {
  plus: icon('M12 5v14M5 12h14'), check: icon('m5 12 4 4L19 6'), menu: icon('M4 6h16M4 12h16M4 18h16'),
  heart: icon('M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z'),
  heartFilled: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/></svg>',
  bell: icon('M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4'),
  edit: icon('m16 3 5 5M3 21l5-1L21 7l-5-5L3 15v6Z'), code: icon('m8 5-6 7 6 7m8-14 6 7-6 7M14 3l-4 18'),
  image: icon('M3 3h18v18H3ZM3 17l6-6 4 4 3-3 5 5M15 7h.01'), home: icon('m3 10 9-7 9 7v11h-7v-7h-4v7H3Z'),
  search: icon('M21 21l-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z'),
  share: icon('M18 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM6 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm12 7a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM9 10l6-4M9 14l6 4'),
  document: icon('M14 2H4v20h16V8Zm0 0v6h6M8 12h8M8 16h8'), folder: icon('M2 5h8l2 3h10v13H2Z'),
}
const buttonVariants = ['filled', 'tonal', 'outlined', 'elevated', 'text']
const buttonLabels: Record<string, string> = { filled: '主要操作', tonal: '次要操作', outlined: '描边', elevated: '浮起', text: '文字' }
const cityLabels: Record<string, string> = { shanghai: '上海', hangzhou: '杭州', chengdu: '成都' }
const projectLabels: Record<string, string> = { design: '设计系统', code: '组件开发', release: '发布计划' }
const destinationLabels: Record<string, string> = { home: '首页', favorite: '收藏', inbox: '消息' }
const liked = ref(false), checked = ref(true), loading = ref(true)
const text = ref('设计系统'), bio = ref(''), query = ref('')
const city = ref<string | null>('shanghai'), delivery = ref<string | null>('express')
const tab = ref<string | null>('overview')
const selection = ref<string | string[] | null>('overview'), destination = ref<string | null>('home')
const chips = ref<string | string[] | null>(['design']), listSelection = ref<string | null>('design')
const level = ref(65), low = ref(20), high = ref(80), progress = ref(40), count = ref(8), slide = ref(0)
const date = ref('2026-10-23'), time = ref('10:30')
const timepicker = ref(false)
const dialog = ref(false), drawer = ref(false), snackbar = ref(false), bottomSheet = ref(false), sideSheet = ref(false)
const lastAction = ref('')
const slides = [{ file: 'lake.jpg', title: '湖畔清晨' }, { file: 'mountains.jpg', title: '远山' }, { file: 'coast.jpg', title: '海岸线' }]
const searchResults = computed(() => ['按钮', '卡片', '文本输入', '日期选择', '侧边导航'].filter(item => item.includes(query.value)))
function record(event: Event | string) {
  if (typeof event === 'string') { lastAction.value = buttonLabels[event] ? `已点击${buttonLabels[event]}` : event; return }
  const detail = (event as CustomEvent<{ value?: unknown }>).detail
  lastAction.value = detail?.value === undefined ? '操作已完成' : `已选择：${String(detail.value)}`
}
const statusText = computed(() => {
  if (lastAction.value) return lastAction.value
  switch (props.name) {
    case 'icon-button': return liked.value ? '已收藏' : '未收藏'
    case 'button-group': return `当前：${selection.value}`
    case 'tabs': return `当前：${tab.value}`
    case 'text-field': return text.value
    case 'search': return query.value ? `搜索：${query.value}` : ''
    case 'select': return `目的地：${cityLabels[city.value ?? ''] ?? city.value ?? '未选择'}`
    case 'checkbox': case 'switch': return checked.value ? '已开启' : '已关闭'
    case 'radios': return delivery.value === 'express' ? '快递配送' : '到店自取'
    case 'slider': return `音量 ${level.value} · 区间 ${low.value}–${high.value}`
    case 'chips': return `已选择：${Array.isArray(chips.value) ? chips.value.join('、') || '无' : chips.value || '无'}`
    case 'datepicker': return date.value || '未选择日期'
    case 'timepicker': return time.value || '未选择时间'
    case 'navigation-bar': case 'navigation-rail': case 'drawer': return `当前：${destinationLabels[destination.value || 'home']}`
    case 'carousel': return `${slide.value + 1} / ${slides.length}`
    case 'list': return `已选择：${projectLabels[listSelection.value ?? ''] ?? '无'}`
    case 'badge': return `${count.value} 条未读消息`
    case 'progress': return `已完成 ${progress.value}%`
    case 'loading-indicator': return loading.value ? '同步中' : '已暂停'
    default: return ''
  }
})
</script>

<style scoped>
.material-demo { display: flex; flex-direction: column; align-items: flex-start; justify-content: center; gap: 20px; min-width: 0; width: 100%; }
.material-demo-row { display: flex; flex-wrap: wrap; gap: 14px; align-items: center; max-width: 100%; }
.material-demo-stack { display: flex; flex-direction: column; align-items: flex-start; gap: 18px; max-width: 100%; }
.full-width { width: 100%; min-width: 0; }
.material-demo-status { display: block; max-width: 100%; color: var(--mtrl-sys-color-on-surface-variant); font-size: 11px; line-height: 1.6; overflow-wrap: anywhere; }
.tab-content { padding: 16px 8px; font-size: 13px; color: var(--mtrl-sys-color-on-surface-variant); }
.material-card-image { display: block; width: 100%; height: 160px; object-fit: cover; }
.material-carousel { height: 220px; }
.rail-demo { display: grid; grid-template-columns: auto minmax(0, 1fr); min-height: 260px; gap: 24px; }
.rail-content { align-self: center; font-size: 18px; color: var(--mtrl-sys-color-on-surface-variant); }
.app-bar-demo { position: relative; isolation: isolate; overflow: hidden; min-height: 120px; border-radius: 12px; background: var(--mtrl-sys-color-surface-container-low); }
.sheet-content { display: flex; flex-direction: column; gap: 24px; padding: 20px 4px; font-size: 14px; }
.sheet-content p { margin: 0; }
.badge-target { position: relative; display: inline-flex; }
.badge-target > :last-child { position: absolute; right: -3px; top: -3px; pointer-events: none; }
.material-demo p { font-size: 13px; line-height: 1.7; margin: 0; }
</style>
