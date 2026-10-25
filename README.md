# Tratify

T-TrAt 的本地组件开发与展示工作区。保留 Apptify 的 Apple 风格组件，Material 组件以独立包 `tratify` 准备发布。

[GitHub 仓库](https://github.com/T-TrAt/tratify) · [tratify](packages/tratify/README.md) · [Apple 组件 API](docs/COMPONENTS.md) · [本地应用模板](docs/PLAYGROUND-TEMPLATE.md)

## 快速开始

```sh
npm ci
npm run dev
```

本地样例站包含所有组件说明。原 Apptify 工具还包括：
- 自动根据 src/views 生成 routes
- lucide icons
- 竖屏、触屏布尔状态
- 全局广播通道 `sendMessage`
- 错误页
- 外观设置页
- 各组件示例与源码等，有问题可以直接抄

## 常用 API

```js
this.$apple.theme.value.set('dark')
this.$apple.motion.value.set('reduced')
this.$apple.ripple.value.set(false) // 全局关闭点击波纹
this.$apple.notify('保存成功', { tone: 'success' })

const dialog = this.$apple.dialog({ title: '保存修改？', cancelText: '取消' })
const confirmed = await dialog.result // 确认 true，取消 false，关闭 undefined
```

内置主题：`light`、`dark`、`graphite`、`rose`；`system` 跟随系统。全局动效：`auto`、`full`、`reduced`、`none`。共享状态使用 ref，在 JavaScript 中通过 `.value` 访问。

可通过 `createAppleUI({ ripple: false })` 或 `apple.ripple.value.set(false)` 全局禁用点击波纹。切换到 `reduced` 或系统开启减少动态效果时，波纹自动关闭，但可手动开启；只有 `none` 模式禁止开启。`persist: true` 会同时保存该偏好。

Props、事件、插槽、自定义主题与弹层消息回传见[组件 API](docs/COMPONENTS.md)。

## 发布

仅 `packages/tratify` 作为发布包，包名 `tratify`，作者 `T-TrAt`，初始版本 `0.1.0`。仓库为 [T-TrAt/tratify](https://github.com/T-TrAt/tratify)，反馈问题请使用该仓库的 Issues。根包保留 `apptify` 名称以兼容内部导入；它和脚手架 `create-apptify` 均为 `private: true`，不发布到 npm。

`npm run build:tratify` 只准备 Material 运行时、主题、类型与许可，不生成安装包，也不上传。安装、打包和手动发布命令见 [tratify 说明](packages/tratify/README.md)。原 npm 自动发布工作流与脚本已移除，其余 Actions 工作流移至 `.github/disabled-workflows/`，不会运行。

## LICENSE

MIT
