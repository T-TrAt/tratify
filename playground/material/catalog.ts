export interface MaterialCatalogItem {
  name: string
  label: string
  group: string
  counterpart: string
}

export const materialCatalog: MaterialCatalogItem[] = [
  { name: 'button', label: '按钮', group: '操作', counterpart: 'AppleButton' },
  { name: 'icon-button', label: '图标按钮', group: '操作', counterpart: 'AppleButton' },
  { name: 'button-group', label: '按钮组', group: '操作', counterpart: 'AppleSegmentedControl' },
  { name: 'split-button', label: '分体按钮', group: '操作', counterpart: 'AppleButton · AppleMenu' },
  { name: 'fab', label: '浮动按钮', group: '操作', counterpart: 'AppleSpeedDialItem' },
  { name: 'extended-fab', label: '扩展浮动按钮', group: '操作', counterpart: 'AppleSpeedDialItem' },
  { name: 'fab-menu', label: '浮动操作菜单', group: '操作', counterpart: 'AppleSpeedDial' },
  { name: 'menu', label: '菜单', group: '操作', counterpart: 'AppleMenu' },
  { name: 'text-field', label: '文本输入', group: '表单', counterpart: 'AppleInput · AppleTextarea' },
  { name: 'search', label: '搜索', group: '表单', counterpart: 'AppleSearch · AppleAutocomplete' },
  { name: 'select', label: '选择器', group: '表单', counterpart: 'AppleSelect' },
  { name: 'checkbox', label: '复选框', group: '表单', counterpart: 'AppleCheckbox' },
  { name: 'radios', label: '单选组', group: '表单', counterpart: 'AppleRadioGroup' },
  { name: 'switch', label: '开关', group: '表单', counterpart: 'AppleSwitch' },
  { name: 'slider', label: '滑块', group: '表单', counterpart: 'AppleSlider' },
  { name: 'chips', label: '标签选择', group: '表单', counterpart: 'AppleTag' },
  { name: 'datepicker', label: '日期选择', group: '表单', counterpart: 'AppleDatePicker' },
  { name: 'timepicker', label: '时间选择', group: '表单', counterpart: 'AppleDatePicker' },
  { name: 'tabs', label: '标签页', group: '导航', counterpart: 'AppleTabs · AppleTabBar' },
  { name: 'navigation-bar', label: '导航栏', group: '导航', counterpart: 'AppleNavibar' },
  { name: 'navigation-rail', label: '侧边导航', group: '导航', counterpart: 'AppleAside' },
  { name: 'drawer', label: '导航抽屉', group: '导航', counterpart: 'AppleDrawer' },
  { name: 'top-app-bar', label: '顶部应用栏', group: '导航', counterpart: 'AppleNavibar' },
  { name: 'bottom-app-bar', label: '底部应用栏', group: '导航', counterpart: 'AppleNavibar' },
  { name: 'toolbar', label: '工具栏', group: '导航', counterpart: 'AppleStack · AppleButton' },
  { name: 'card', label: '卡片', group: '内容', counterpart: 'AppleCard' },
  { name: 'carousel', label: '轮播', group: '内容', counterpart: 'AppleImage' },
  { name: 'list', label: '列表', group: '内容', counterpart: 'AppleList' },
  { name: 'divider', label: '分隔线', group: '内容', counterpart: 'AppleDivider' },
  { name: 'badge', label: '徽标', group: '内容', counterpart: 'AppleBadge' },
  { name: 'progress', label: '进度条', group: '反馈', counterpart: 'AppleProgress' },
  { name: 'loading-indicator', label: '加载指示', group: '反馈', counterpart: 'AppleSpinner' },
  { name: 'tooltip', label: '文字提示', group: '反馈', counterpart: 'AppleTooltip' },
  { name: 'snackbar', label: '消息提示', group: '反馈', counterpart: 'AppleSnackbar' },
  { name: 'dialog', label: '对话框', group: '反馈', counterpart: 'AppleDialog' },
  { name: 'bottom-sheet', label: '底部面板', group: '反馈', counterpart: 'AppleSheet' },
  { name: 'side-sheet', label: '侧边面板', group: '反馈', counterpart: 'AppleDrawer' },
]

export const materialSections = [
  { id: 'actions', label: '操作' },
  { id: 'forms', label: '表单' },
  { id: 'navigation', label: '导航' },
  { id: 'content', label: '内容' },
  { id: 'feedback', label: '反馈' },
].map(section => ({ ...section, items: materialCatalog.filter(item => item.group === section.label) }))
