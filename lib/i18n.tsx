"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { enUS, zhCN } from "date-fns/locale";
import type { Locale as DateFnsLocale } from "date-fns";

export const LOCALES = ["zh", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "zh";
export const LOCALE_STORAGE_KEY = "cu-locale";

export const zh = {
  common: {
    save: "保存",
    cancel: "取消",
    add: "添加",
    delete: "删除",
    rename: "重命名",
    search: "搜索",
    loading: "加载中…",
    settings: "设置",
    close: "关闭",
    clear: "清除",
    current: "当前",
    open: "打开",
    duplicate: "复制",
    more: "更多",
    none: "无",
    set: "设置",
    create: "创建",
    expand: "展开",
    collapse: "收起",
    today: "今天",
    tomorrow: "明天",
    yesterday: "昨天",
    month: "月",
    week: "周",
  },
  language: {
    label: "语言",
    zh: "简体中文",
    en: "English",
  },
  nav: {
    home: "首页",
    inbox: "收件箱",
    modules: "模块",
    spaces: "空间",
    favorites: "收藏",
    search: "搜索",
    collapseSidebar: "收起侧栏",
    openSidebar: "展开侧栏",
    openMenu: "打开菜单",
    newSpace: "新建空间",
    spaceName: "空间名称",
    newList: "新建列表",
    listName: "列表名称",
    newFolder: "新建文件夹",
    folderName: "文件夹名称",
    switchUser: "切换用户",
    editProfile: "编辑资料",
    logOut: "退出登录",
  },
  theme: {
    light: "浅色模式",
    dark: "深色模式",
  },
  auth: {
    welcomeBack: "欢迎回来",
    logInToWorkspace: "登录你的工作区。",
    createAccount: "创建账号",
    signUpToStart: "注册以开始使用。",
    name: "姓名",
    yourName: "你的姓名",
    email: "邮箱",
    password: "密码",
    logIn: "登录",
    signUp: "注册",
    noAccount: "还没有账号？去注册",
    hasAccount: "已有账号？去登录",
    demo: "演示账号：santiago@clickuppp.dev / password",
    somethingWrong: "出了点问题",
    failed: "失败",
  },
  profile: {
    title: "我的资料",
    displayName: "显示名称",
    changePhoto: "更换头像",
    uploading: "上传中…",
    uploadFailed: "上传失败",
  },
  home: {
    morning: "早上好",
    afternoon: "下午好",
    evening: "晚上好",
    nothingAssigned: "还没有分配给你的任务",
    assignedOne: "分配给你 1 项任务",
    assignedMany: "分配给你 {count} 项任务",
    allClear: "全部完成",
    assignedHint: "分配给你的任务会显示在这里。",
    overdue: "已逾期",
    today: "今天",
    upcoming: "未来 7 天",
    later: "更晚",
    noDue: "无截止日期",
    completed: "已完成",
    timesheet: "本周工时",
  },
  inbox: {
    markAllRead: "全部标为已读",
    caughtUp: "没有未读通知 🎉",
    someone: "有人",
  },
  search: {
    title: "搜索",
    placeholder: "搜索任务和列表…",
    emptyHint: "输入关键字，搜索工作区里的任务和列表。",
    noResults: "没有与“{q}”匹配的结果",
  },
  shortcuts: {
    title: "键盘快捷键",
    general: "通用",
    tasks: "任务",
    search: "搜索任务和列表",
    showShortcuts: "显示键盘快捷键",
    closeDialog: "关闭对话框",
    createTask: "在当前列表创建任务",
  },
  settings: {
    title: "设置",
    moduleStatuses: "模块状态",
    moduleStatusesHint: "颜色和类型与任务状态一致，用于架构板右侧的模块卡片。",
    dailyCap: "每人每天最多工时",
    dailyCapHint: "默认 10 小时。只能填写自己的工时，全库当天合计超过上限会被拒绝。",
    hours: "小时",
  },
  statusType: {
    NOT_STARTED: "未开始",
    ACTIVE: "进行中",
    DONE: "已完成",
    CLOSED: "已关闭",
  },
  status: {
    title: "状态",
    statuses: "状态",
    manage: "管理状态",
    newName: "新状态名称",
    editStatuses: "编辑状态",
  },
  priority: {
    title: "优先级",
    set: "设置优先级",
    URGENT: "紧急",
    HIGH: "高",
    NORMAL: "普通",
    LOW: "低",
  },
  modules: {
    products: "产品",
    productsHint: "先选产品，再搭建分层和模块。",
    newProduct: "新建产品",
    productName: "产品名称",
    noProducts: "还没有产品",
    noProductsHint: "创建产品后即可开始架构板。",
    noLayers: "还没有分层",
    layerCount: "{count} 个分层",
    backToProducts: "返回产品",
    notFound: "找不到这个产品。",
    addLayer: "添加分层",
    layerTitle: "分层名称",
    renameLayer: "重命名分层",
    deleteLayer: "删除分层",
    module: "模块",
    moduleName: "模块名称",
    submodule: "子模块",
    addSubmodule: "添加子模块",
    tasksOne: "1 项任务",
    tasksMany: "{count} 项任务",
    noTasks: "这个模块下还没有任务",
    newStatus: "新状态名称",
    confirmDeleteProduct: "删除「{name}」及其全部分层和模块？任务会保留，只是取消关联。",
    confirmDeleteLayer: "删除分层「{name}」及其模块？",
    confirmDeleteModule: "删除「{name}」及其子模块？",
  },
  list: {
    loadFailed: "无法加载这个列表。",
    addToFavorites: "加入收藏",
    removeFromFavorites: "取消收藏",
    newFromTemplate: "从模板新建",
    addTask: "添加任务",
    newTask: "新任务",
    emptyTitle: "这个列表还是空的",
    emptyHint: "创建第一个任务开始吧。",
    noMatchTitle: "没有符合筛选条件的任务",
    noMatchHint: "试试清除或调整当前筛选。",
    taskName: "任务名称",
    addColumn: "添加列",
    dragReorder: "拖动排序",
    showMore: "再显示 {n} 项（还有 {hidden} 项）",
    calendarMore: "+{n} 项",
  },
  filter: {
    filter: "筛选",
    sort: "排序",
    group: "分组：{by}",
    groupBy: "分组方式",
    status: "状态",
    assignee: "执行人",
    priority: "优先级",
    module: "模块",
    none: "不分组",
    startDate: "开始日期",
    dueDate: "截止日期",
    estimate: "预估工时",
    name: "名称",
    created: "创建日期",
    ascending: "升序",
    descending: "降序",
    clearSort: "清除排序",
    assignees: "执行人",
    tags: "标签",
    modules: "模块",
  },
  group: {
    allTasks: "全部任务",
    noPriority: "无优先级",
    unassigned: "未分配",
    noModule: "无模块",
  },
  task: {
    description: "添加描述…",
    assignees: "执行人",
    dueDate: "截止日期",
    startDate: "开始日期",
    priority: "优先级",
    module: "模块",
    recurring: "重复",
    tags: "标签",
    watchers: "关注者",
    subtask: "添加子任务",
    addSubtask: "添加",
    closeSubtask: "关闭子任务",
    comment: "写评论…",
    reply: "写回复…",
    editComment: "编辑评论",
    deleteComment: "删除评论",
    details: "任务详情",
    inList: "于 {name}",
    descriptionLabel: "描述",
    subtasks: "子任务",
    activity: "动态",
    customFields: "自定义字段",
    createdBy: "由 {name} 创建",
    noActivity: "还没有动态。",
    commentBtn: "评论",
    replyBtn: "回复",
    resolved: "已解决",
    reopen: "重新打开",
    resolve: "解决",
    someone: "有人",
    addReaction: "添加表情",
  },
  col: {
    name: "名称",
    assignee: "执行人",
    start: "开始",
    dueDate: "截止日期",
    priority: "优先级",
    status: "状态",
    startDate: "开始日期",
    estimate: "预估工时",
    logged: "实际工时",
  },
  field: {
    customFields: "自定义字段",
    newField: "新建自定义字段",
    fieldName: "字段名称",
    type: "类型",
    options: "选项",
    optionN: "选项 {n}",
    addOption: "添加选项",
    createField: "创建字段",
    noOptions: "还没有选项",
    editField: "编辑字段",
    saveField: "保存字段",
    deleteField: "删除字段",
    deleteWarn: "删除后，所有任务上该字段的值也会一并删除。",
    typeLocked: "类型创建后不可更改",
  },
  fieldType: {
    TEXT: "文本",
    TEXTAREA: "长文本",
    NUMBER: "数字",
    MONEY: "金额",
    DROPDOWN: "下拉",
    LABELS: "标签",
    DATE: "日期",
    CHECKBOX: "复选框",
    RATING: "评分",
    URL: "链接",
    EMAIL: "邮箱",
    PHONE: "电话",
  },
  view: {
    list: "列表",
    board: "看板",
    calendar: "日历",
    gantt: "甘特图",
    table: "表格",
    coming: "即将推出。",
  },
  date: {
    set: "设置日期",
    clear: "清除日期",
    today: "今天",
    tomorrow: "明天",
    yesterday: "昨天",
    nextWeek: "下周",
  },
  recurrence: {
    none: "不重复",
    DAILY: "每天",
    WEEKDAYS: "每个工作日",
    WEEKLY: "每周",
    BIWEEKLY: "每两周",
    MONTHLY: "每月",
  },
  activity: {
    created: "创建了此任务",
    createdFrom: "从「{name}」创建了此任务",
    setStatus: "将状态设为 {name}",
    changedStatus: "更改了状态",
    renamedTo: "将任务重命名为「{name}」",
    renamed: "重命名了此任务",
    setPriority: "将优先级设为 {name}",
    clearedPriority: "清除了优先级",
    setDue: "将截止日期设为 {date}",
    clearedDue: "清除了截止日期",
    assigned: "分配给 {names}",
    unassigned: "取消分配 {names}",
    attached: "添加了附件 {name}",
    addedAttachment: "添加了附件",
    movedTo: "将任务移到 {name}",
    moved: "移动了此任务",
  },
  time: {
    title: "工时",
    logged: "已记录",
    estimate: "预估",
    stop: "停止",
    startTimer: "开始计时",
    addTime: "添加工时",
    noteOptional: "备注（可选）",
    estimateHint: "8 或 2h 30m",
    running: "计时中",
    total: "合计",
    byPerson: "按人",
    setDay: "填写当天",
    clearDay: "清空当天",
    workDate: "日期",
    remaining: "本周还差 {hours}",
    weekFilled: "本周已填 {filled} / {quota}",
    teamWeek: "全员工时",
    unfilled: "未填满",
  },
  dep: {
    title: "依赖",
    none: "没有依赖。",
    waitingOn: "等待",
    blocking: "阻塞",
    searchTasks: "搜索任务…",
    typeToSearch: "输入关键字搜索任务。",
    noMatches: "没有匹配的任务。",
  },
  checklist: {
    title: "清单",
    add: "添加清单",
    addItem: "添加一项",
  },
  attach: {
    title: "附件",
    drop: "拖入文件或点击上传",
    uploadFailed: "上传失败",
    download: "下载",
  },
  template: {
    saveAs: "存为模板",
    duplicate: "复制任务",
    moveTo: "移动到列表",
    captureHint: "会保存标题、描述、优先级和清单。",
    name: "模板名称",
    saved: "已保存",
    save: "保存模板",
    newFrom: "从模板新建",
    none: "还没有模板",
    noneHint: "打开任意任务，选择「存为模板」即可创建。",
    checklistsCount: "{count} 个清单",
    deleteTemplate: "删除模板",
  },
  bulk: {
    selected: "已选",
    assign: "分配",
    setAssignee: "设置执行人",
    unassignAll: "取消全部分配",
    clearSelection: "清除选择",
  },
  board: {
    collapse: "收起列",
    expand: "展开 {name}",
    wipLimit: "在制品上限",
    clearLimit: "清除上限",
  },
  tag: {
    add: "添加标签",
    searchOrCreate: "搜索或新建…",
    createNamed: "创建「{name}」",
    none: "还没有标签。",
  },
  modulePick: {
    search: "搜索模块…",
    none: "无模块",
    noMatch: "没有匹配的模块。",
    noneYet: "还没有模块。请到模块页添加。",
    add: "模块",
  },
  editor: {
    write: "写点什么…",
  },
  toast: {
    deleted: "已删除「{name}」",
    deletedCount: "已删除 {count} 项",
    deletedGeneric: "已删除",
    deleteFailed: "删除失败",
  },
  confirm: {
    deleteNamed: "确定删除「{name}」？",
  },
  boot: {
    failed: "工作区加载失败。数据库是否已导入种子数据？（pnpm db:seed）",
  },
  error: {
    title: "出了点问题",
    body: "发生了意外错误。可以重试，或刷新页面。",
    tryAgain: "重试",
    reload: "重新加载",
    globalBody: "应用遇到了意外错误。",
  },
} as const;

export const en: Messages = {
  common: {
    save: "Save",
    cancel: "Cancel",
    add: "Add",
    delete: "Delete",
    rename: "Rename",
    search: "Search",
    loading: "Loading…",
    settings: "Settings",
    close: "Close",
    clear: "Clear",
    current: "current",
    open: "Open",
    duplicate: "Duplicate",
    more: "More",
    none: "None",
    set: "Set",
    create: "Create",
    expand: "Expand",
    collapse: "Collapse",
    today: "Today",
    tomorrow: "Tomorrow",
    yesterday: "Yesterday",
    month: "Month",
    week: "Week",
  },
  language: {
    label: "Language",
    zh: "简体中文",
    en: "English",
  },
  nav: {
    home: "Home",
    inbox: "Inbox",
    modules: "Modules",
    spaces: "Spaces",
    favorites: "Favorites",
    search: "Search",
    collapseSidebar: "Collapse sidebar",
    openSidebar: "Open sidebar",
    openMenu: "Open menu",
    newSpace: "New Space",
    spaceName: "Space name",
    newList: "New List",
    listName: "List name",
    newFolder: "New Folder",
    folderName: "Folder name",
    switchUser: "Switch user",
    editProfile: "Edit profile",
    logOut: "Log out",
  },
  theme: {
    light: "Light mode",
    dark: "Dark mode",
  },
  auth: {
    welcomeBack: "Welcome back",
    logInToWorkspace: "Log in to your workspace.",
    createAccount: "Create your account",
    signUpToStart: "Sign up to get started.",
    name: "Name",
    yourName: "Your name",
    email: "Email",
    password: "Password",
    logIn: "Log In",
    signUp: "Sign Up",
    noAccount: "Don't have an account? Sign up",
    hasAccount: "Already have an account? Log in",
    demo: "Demo: santiago@clickuppp.dev / password",
    somethingWrong: "Something went wrong",
    failed: "Failed",
  },
  profile: {
    title: "My profile",
    displayName: "Display name",
    changePhoto: "Change photo",
    uploading: "Uploading…",
    uploadFailed: "Upload failed",
  },
  home: {
    morning: "Good morning",
    afternoon: "Good afternoon",
    evening: "Good evening",
    nothingAssigned: "Nothing assigned to you",
    assignedOne: "1 task assigned to you",
    assignedMany: "{count} tasks assigned to you",
    allClear: "You're all clear",
    assignedHint: "Tasks assigned to you will show up here.",
    overdue: "Overdue",
    today: "Today",
    upcoming: "Next 7 days",
    later: "Later",
    noDue: "No due date",
    completed: "Completed",
    timesheet: "This week's hours",
  },
  inbox: {
    markAllRead: "Mark all read",
    caughtUp: "You're all caught up 🎉",
    someone: "Someone",
  },
  search: {
    title: "Search",
    placeholder: "Search tasks and lists…",
    emptyHint: "Type to search tasks and lists across your workspace.",
    noResults: "No results for “{q}”",
  },
  shortcuts: {
    title: "Keyboard shortcuts",
    general: "General",
    tasks: "Tasks",
    search: "Search tasks & lists",
    showShortcuts: "Show keyboard shortcuts",
    closeDialog: "Close dialog / modal",
    createTask: "Create a task in the current list",
  },
  settings: {
    title: "Settings",
    moduleStatuses: "Module statuses",
    moduleStatusesHint: "Colors and types match task statuses. Used on architecture-board module cards.",
    dailyCap: "Max hours per person per day",
    dailyCapHint: "Default 10 hours. You can only log your own time. The workspace rejects a day that goes over the cap.",
    hours: "hours",
  },
  statusType: {
    NOT_STARTED: "Not started",
    ACTIVE: "Active",
    DONE: "Done",
    CLOSED: "Closed",
  },
  status: {
    title: "Status",
    statuses: "Statuses",
    manage: "Manage statuses",
    newName: "New status name",
    editStatuses: "Edit statuses",
  },
  priority: {
    title: "Priority",
    set: "Set priority",
    URGENT: "Urgent",
    HIGH: "High",
    NORMAL: "Normal",
    LOW: "Low",
  },
  modules: {
    products: "Products",
    productsHint: "Pick a product, then build its architecture layers and modules.",
    newProduct: "New product",
    productName: "Product name",
    noProducts: "No products yet",
    noProductsHint: "Create a product to start the architecture board.",
    noLayers: "No layers yet",
    layerCount: "{count} layer(s)",
    backToProducts: "Products",
    notFound: "This product was not found.",
    addLayer: "Add layer",
    layerTitle: "Layer title",
    renameLayer: "Rename layer",
    deleteLayer: "Delete layer",
    module: "Module",
    moduleName: "Module name",
    submodule: "Submodule",
    addSubmodule: "Add submodule",
    tasksOne: "1 task",
    tasksMany: "{count} tasks",
    noTasks: "No tasks on this module",
    newStatus: "New status name",
    confirmDeleteProduct: "Delete “{name}” and all of its layers and modules? Tasks stay, they just detach.",
    confirmDeleteLayer: "Delete layer “{name}” and its modules?",
    confirmDeleteModule: "Delete “{name}” and its children?",
  },
  list: {
    loadFailed: "Couldn't load this list.",
    addToFavorites: "Add to favorites",
    removeFromFavorites: "Remove from favorites",
    newFromTemplate: "New from template",
    addTask: "Add Task",
    newTask: "New task",
    emptyTitle: "This list is empty",
    emptyHint: "Create your first task to get started.",
    noMatchTitle: "No tasks match your filters",
    noMatchHint: "Try clearing or adjusting the active filters.",
    taskName: "Task name",
    addColumn: "Add column",
    dragReorder: "Drag to reorder",
    showMore: "Show {n} more ({hidden} hidden)",
    calendarMore: "+{n} more",
  },
  filter: {
    filter: "Filter",
    sort: "Sort",
    group: "Group: {by}",
    groupBy: "Group by",
    status: "Status",
    assignee: "Assignee",
    priority: "Priority",
    module: "Module",
    none: "None",
    startDate: "Start date",
    dueDate: "Due date",
    estimate: "Estimate",
    name: "Name",
    created: "Date created",
    ascending: "Ascending",
    descending: "Descending",
    clearSort: "Clear sort",
    assignees: "Assignees",
    tags: "Tags",
    modules: "Modules",
  },
  group: {
    allTasks: "All tasks",
    noPriority: "No priority",
    unassigned: "Unassigned",
    noModule: "No module",
  },
  task: {
    description: "Add a description…",
    assignees: "Assignees",
    dueDate: "Due date",
    startDate: "Start date",
    priority: "Priority",
    module: "Module",
    recurring: "Recurring",
    tags: "Tags",
    watchers: "Watchers",
    subtask: "Add a subtask",
    addSubtask: "Add",
    closeSubtask: "Close subtask",
    comment: "Write a comment…",
    reply: "Write a reply…",
    editComment: "Edit comment",
    deleteComment: "Delete comment",
    details: "Task details",
    inList: "in {name}",
    descriptionLabel: "Description",
    subtasks: "Subtasks",
    activity: "Activity",
    customFields: "Custom Fields",
    createdBy: "Created by {name}",
    noActivity: "No activity yet.",
    commentBtn: "Comment",
    replyBtn: "Reply",
    resolved: "Resolved",
    reopen: "Reopen",
    resolve: "Resolve",
    someone: "Someone",
    addReaction: "Add reaction",
  },
  col: {
    name: "Name",
    assignee: "Assignee",
    start: "Start",
    dueDate: "Due date",
    priority: "Priority",
    status: "Status",
    startDate: "Start date",
    estimate: "Estimate",
    logged: "Logged time",
  },
  field: {
    customFields: "Custom Fields",
    newField: "New custom field",
    fieldName: "Field name",
    type: "Type",
    options: "Options",
    optionN: "Option {n}",
    addOption: "Add option",
    createField: "Create field",
    noOptions: "No options",
    editField: "Edit field",
    saveField: "Save field",
    deleteField: "Delete field",
    deleteWarn: "Deleting this field also removes its values from every task.",
    typeLocked: "Type cannot be changed after creation",
  },
  fieldType: {
    TEXT: "Text",
    TEXTAREA: "Text (long)",
    NUMBER: "Number",
    MONEY: "Money",
    DROPDOWN: "Dropdown",
    LABELS: "Labels",
    DATE: "Date",
    CHECKBOX: "Checkbox",
    RATING: "Rating",
    URL: "URL",
    EMAIL: "Email",
    PHONE: "Phone",
  },
  view: {
    list: "List",
    board: "Board",
    calendar: "Calendar",
    gantt: "Gantt",
    table: "Table",
    coming: "Coming up next in the build.",
  },
  date: {
    set: "Set date",
    clear: "Clear date",
    today: "Today",
    tomorrow: "Tomorrow",
    yesterday: "Yesterday",
    nextWeek: "Next week",
  },
  recurrence: {
    none: "Doesn't repeat",
    DAILY: "Daily",
    WEEKDAYS: "Every weekday",
    WEEKLY: "Weekly",
    BIWEEKLY: "Every 2 weeks",
    MONTHLY: "Monthly",
  },
  activity: {
    created: "created this task",
    createdFrom: "created this task from “{name}”",
    setStatus: "set status to {name}",
    changedStatus: "changed the status",
    renamedTo: "renamed this task to “{name}”",
    renamed: "renamed this task",
    setPriority: "set priority to {name}",
    clearedPriority: "cleared the priority",
    setDue: "set the due date to {date}",
    clearedDue: "cleared the due date",
    assigned: "assigned {names}",
    unassigned: "unassigned {names}",
    attached: "attached {name}",
    addedAttachment: "added an attachment",
    movedTo: "moved this task to {name}",
    moved: "moved this task",
  },
  time: {
    title: "Time tracking",
    logged: "Logged",
    estimate: "Estimate",
    stop: "Stop",
    startTimer: "Start timer",
    addTime: "Add time",
    noteOptional: "Note (optional)",
    estimateHint: "8 or 2h 30m",
    running: "running",
    total: "Total",
    byPerson: "By person",
    setDay: "Save day",
    clearDay: "Clear day",
    workDate: "Date",
    remaining: "{hours} remaining this week",
    weekFilled: "Logged {filled} / {quota} this week",
    teamWeek: "Team hours",
    unfilled: "Under cap",
  },
  dep: {
    title: "Dependencies",
    none: "No dependencies.",
    waitingOn: "Waiting on",
    blocking: "Blocking",
    searchTasks: "Search tasks…",
    typeToSearch: "Type to search tasks.",
    noMatches: "No matches.",
  },
  checklist: {
    title: "Checklists",
    add: "Add checklist",
    addItem: "Add an item",
  },
  attach: {
    title: "Attachments",
    drop: "Drop files or click to upload",
    uploadFailed: "Upload failed",
    download: "Download",
  },
  template: {
    saveAs: "Save as template",
    duplicate: "Duplicate task",
    moveTo: "Move to list",
    captureHint: "Captures the title, description, priority, and checklists.",
    name: "Template name",
    saved: "Saved",
    save: "Save template",
    newFrom: "New from template",
    none: "No templates yet",
    noneHint: "Open any task and choose “Save as template” to create one.",
    checklistsCount: "{count} checklist(s)",
    deleteTemplate: "Delete template",
  },
  bulk: {
    selected: "selected",
    assign: "Assign",
    setAssignee: "Set assignee",
    unassignAll: "Unassign all",
    clearSelection: "Clear selection",
  },
  board: {
    collapse: "Collapse",
    expand: "Expand {name}",
    wipLimit: "WIP limit",
    clearLimit: "Clear limit",
  },
  tag: {
    add: "Add tag",
    searchOrCreate: "Search or create…",
    createNamed: "Create “{name}”",
    none: "No tags yet.",
  },
  modulePick: {
    search: "Search modules…",
    none: "No module",
    noMatch: "No matching modules.",
    noneYet: "No modules yet. Add them in the Modules page.",
    add: "Module",
  },
  editor: {
    write: "Write something…",
  },
  toast: {
    deleted: "Deleted “{name}”",
    deletedCount: "Deleted {count} item(s)",
    deletedGeneric: "Deleted",
    deleteFailed: "Couldn't delete",
  },
  confirm: {
    deleteNamed: "Delete “{name}”?",
  },
  boot: {
    failed: "Failed to load workspace. Is the database seeded? (`pnpm db:seed`)",
  },
  error: {
    title: "Something went wrong",
    body: "An unexpected error occurred. You can try again or reload the page.",
    tryAgain: "Try again",
    reload: "Reload",
    globalBody: "The app hit an unexpected error.",
  },
};

export type Messages = {
  [K in keyof typeof zh]: { [P in keyof (typeof zh)[K]]: string };
};

const DICTS: Record<Locale, Messages> = { zh, en };

export function isLocale(v: string | null | undefined): v is Locale {
  return v === "zh" || v === "en";
}

export function readStoredLocale(): Locale {
  if (typeof window === "undefined") return DEFAULT_LOCALE;
  try {
    const raw = localStorage.getItem(LOCALE_STORAGE_KEY);
    return isLocale(raw) ? raw : DEFAULT_LOCALE;
  } catch {
    return DEFAULT_LOCALE;
  }
}

export function htmlLang(locale: Locale): string {
  return locale === "zh" ? "zh-CN" : "en";
}

type Vars = Record<string, string | number>;

function lookup(messages: Messages, key: string): string {
  const [ns, name] = key.split(".");
  const group = messages[ns as keyof Messages] as Record<string, string> | undefined;
  return group?.[name] ?? key;
}

export function translate(messages: Messages, key: string, vars?: Vars): string {
  let out = lookup(messages, key);
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      out = out.replaceAll(`{${k}}`, String(v));
    }
  }
  return out;
}

export function applyDocumentLocale(locale: Locale) {
  if (typeof document === "undefined") return;
  document.documentElement.lang = htmlLang(locale);
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    /* ignore */
  }
}

type I18nValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, vars?: Vars) => string;
  dateLocale: DateFnsLocale;
};

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  useEffect(() => {
    setLocaleState(readStoredLocale());
  }, []);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    applyDocumentLocale(next);
  }, []);

  useEffect(() => {
    applyDocumentLocale(locale);
  }, [locale]);

  const value = useMemo<I18nValue>(() => {
    const messages = DICTS[locale];
    return {
      locale,
      setLocale,
      t: (key, vars) => translate(messages, key, vars),
      dateLocale: locale === "zh" ? zhCN : enUS,
    };
  }, [locale, setLocale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}

export function useT() {
  return useI18n().t;
}

export function groupLabel(t: (key: string) => string, group: { id: string; label: string }): string {
  if (group.id === "all") return t("group.allTasks");
  if (group.id === "unassigned") return t("group.unassigned");
  if (group.id === "none") {
    if (group.label === "No priority") return t("group.noPriority");
    if (group.label === "No module") return t("group.noModule");
  }
  if (group.id === "URGENT" || group.id === "HIGH" || group.id === "NORMAL" || group.id === "LOW") {
    return t(`priority.${group.id}`);
  }
  return group.label;
}

const STORED_LABELS: Record<string, string> = {
  List: "view.list",
  Board: "view.board",
  Calendar: "view.calendar",
  Gantt: "view.gantt",
  Table: "view.table",
};

/** Translate well-known seed / chrome labels; leave other stored names as-is. */
export function displayLabel(t: (key: string) => string, name: string): string {
  const key = STORED_LABELS[name];
  return key ? t(key) : name;
}
