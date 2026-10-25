# Material 组件

本分支仅将 Material 作为独立包 `tratify` 发布，作者 `T-TrAt`，初始版本 `0.1.0`。根包 Apptify 和脚手架保持私有；无自动发布。消费项目使用 `import { MButton } from 'tratify'`、`import 'tratify/style.css'`，主题容器使用 `class="tratify"`。准备命令及完整示例见 [tratify](../packages/tratify/README.md)。以下 `apptify/material` 入口仍供本地工作区和历史模板使用。

项目内移植 floor/material 3.2.4 的 Vue 适配器、Web Components、组件逻辑与样式。顶栏「Material」入口为 `/material`，与原组件总览并列。每张卡片底部的「代码与 API」打开对应的 Material 文档，包含 Preview、低代码配置、可编辑的 App.vue，以及属性、事件、插槽和公开方法。参数与插槽配置生成 Vue 源码并更新预览；源码可直接编辑，支持事件记录、重新运行、恢复和复制。组合组件也提供子组件 API 入口，并在父组件示例中配置对应子项。

文档 API 从本地 ElementSpec 和 Vue 适配器规则生成，示例从 `MaterialDemo.vue` 提取。`npm run build:material` 自动更新文档数据；也可分别运行 `node tooling/prepare-material-docs.mjs` 和 `node tooling/prepare-material-examples.mjs`。

```vue
<script setup lang="ts">
import { MButton, MCheckbox, MTextField } from 'apptify/material'
import 'apptify/material/style.css'
import { ref } from 'vue'

const name = ref('')
const checked = ref(false)
</script>

<template>
  <section class="apptify-material" data-theme="baseline" data-theme-mode="light">
    <MTextField v-model="name" label="姓名" />
    <MCheckbox v-model="checked">接收通知</MCheckbox>
    <MButton variant="filled">保存</MButton>
  </section>
</template>
```

组件以 `M` 前缀导出，保留上游属性、事件、插槽和 `v-model` 行为。它们通过 Vue 适配器自动注册内部自定义元素，不需要更改 Vue 编译器配置，也不需要安装 `material`。当前移植提供客户端组件；未包含上游可选 SSR 渲染入口。

Material 主题 CSS 仅作用于 `.apptify-material`；深色使用 `data-theme-mode="dark"`。组件自身样式保留在 Shadow DOM 中，弹层也保留在组件所属的 Shadow DOM 中。示例页面跟随 Apptify 的明暗设置。构建时为抽屉和面板补充原生 `dialog` 的关闭态隐藏规则，避免其 `display: flex` 覆盖浏览器默认行为。菜单定位补丁让展开菜单跟随按钮重新排版，并清除边缘避让的残留定位。轮播仅在自身有效方向改变时重建，避免页面上其他 `dir` 属性更新打断图片挤压过程；修改文件记录在 `vendor/material/SOURCE.json`。

设置页的「Material 主题色」提供默认紫、海洋蓝、森林绿、日落橙、沙漠金和黑白六套上游配色，选择会保存在当前设备上。Material 页标题旁的「主题色」可直达配置；可单独恢复 Material 默认色，也可通过「恢复默认设置」一起恢复。配色不影响 Apple 组件。

浮动操作菜单仅将图标放入重叠网格，波纹层覆盖整个按钮，并随列表展开时的按钮尺寸变化保持对齐和圆角裁切。

底部面板关闭时沿用入场的空间动画参数向下滑出，侧边面板和模态导航抽屉沿相反方向滑回侧边，遮罩同时淡出；`display` 和顶层 `overlay` 的移除延后到滑出结束，避免立即隐藏截断动画。系统启用减少动态效果时立即关闭。

时间选择器和模态日期选择器沿用对话框的展开与收起参数：500ms 高度展开，标题、内容和操作按钮依次淡入；150ms 快速收起，文字和面板作为整体退出，避免出现空面板。取消时间选择时只重置草稿状态，退出期间保留内容 DOM，下次打开再刷新。遮罩以相同的入场、退出时长线性过渡；窗口和遮罩在出场完成后才隐藏。日期选择器切换日历视图或选择日期时不重播入场动效。系统启用减少动态效果时不播放过渡。

在消费项目中，将容器的 `data-theme` 设为 `baseline`、`ocean`、`forest`、`sunset`、`desert` 或 `monochrome` 即可选择相同配色，`data-theme-mode` 继续控制明暗。

「Glass UI Kit」系列另提供 Glass、Roomia、Mist、Teal、Sapphire、Copper、Mauve 七套参考配色，`data-theme` 分别使用小写名称。原始 OKLCH 色阶提取自本地 Glass UI Kit 1.32.0 的 `src/styles/main.css`，保存在 `vendor/glass-ui-kit/palettes.json`；原作者是 ZiyaraGo Technologies LLC，完整 MIT 许可、版本和来源见同目录。配色搭配沿用原仓库的主色、辅助色、背景和文字色映射；Material 的第三色、容器与明暗角色由 `tooling/material-glass-themes.mjs` 适配。浅色按钮选用原色阶中较深的档位，使文字保持清楚。

源码、原始 MIT 许可和来源版本见 `vendor/material/`。`npm run build:material` 生成独立运行时、主题 CSS 和类型声明；`dev`、`typecheck`、`build` 会先执行它。打包只分发生成物、许可和来源信息，应用模板使用相同的 `apptify/material` 入口，不依赖工作区旁边的 Material 仓库。
