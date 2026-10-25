# tratify

由 T-TrAt 维护的 Vue 3 Material Design 3 组件库。基于 floor/material 3.2.4，包含本地交互修复和主题适配。首个版本为 0.1.0。

[源码仓库](https://github.com/T-TrAt/tratify) · [问题反馈](https://github.com/T-TrAt/tratify/issues)

```sh
npm install tratify
```

```vue
<script setup lang="ts">
import { MButton } from 'tratify'
import 'tratify/style.css'
</script>

<template>
  <main class="tratify" data-theme="ocean" data-theme-mode="light">
    <MButton variant="filled">保存</MButton>
  </main>
</template>
```

需要 Vue 3.5+。组件通过 Vue 适配器注册内部 Web Components，保留 `MButton`、`MDialog` 等组件名及属性、事件、插槽和 `v-model`。只依赖 Vue，不需要安装 Apptify，也不包含 Apple 组件、应用模板、示例照片或纹理资源。当前提供浏览器端组件，未包含上游 SSR 渲染入口。

主题容器使用 `class="tratify"`。`data-theme` 可选 `baseline`、`ocean`、`forest`、`sunset`、`desert`、`monochrome`，以及 `glass`、`roomia`、`mist`、`teal`、`sapphire`、`copper`、`mauve`。`data-theme-mode` 使用 `light` 或 `dark`，主题选择由消费项目管理。

## 0.1.0

- 提供 37 类 Material 组件，共 50 个 Vue 组件导出。
- 提供 13 套配色及浅色、深色模式。
- 修复菜单定位、滑块宽度、轮播图片提前消失、面板和日期时间选择器退出动效，以及浮动操作菜单波纹对齐。
- 独立分发运行时、主题 CSS、TypeScript 类型和第三方许可，只依赖 Vue。

## 本地构建与手动发布

在工作区根目录执行 `npm run build:tratify`，仅准备 Material 包的运行时、主题、类型和来源记录，不生成 `.tgz`，也不上传。

需要生成安装包时，在 `packages/tratify` 执行 `npm pack`；其 `prepack` 会重新构建 Material。未来确认版本、npm 账号及 `tratify` 包名可用后，可在同一目录手动执行 `npm publish`。没有 GitHub Actions 自动发布。

Material 原作者为 floor，Glass UI Kit 配色原作者为 ZiyaraGo Technologies LLC。完整第三方许可见 `THIRD_PARTY_LICENSES.txt`，来源和本地改动记录见 `SOURCE.json`。
