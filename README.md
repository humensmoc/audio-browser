# Audio Browser（音频检索工具）

[中文](#中文) | [English](#english)

---

## 中文

一个面向音频素材管理场景的轻量级 Web 工具。  
你可以快速索引本地文件夹中的 `.wav` 文件，按关键字与标签筛选，边检索边试听，并支持将自定义标签导入/导出为 JSON。

### 功能特性

- 递归索引所选目录下的 `.wav` 文件
- 按文件名、相对路径进行实时搜索
- 自动从目录层级提取标签（文件夹名即标签）
- 支持为单个音频添加/删除自定义标签
- 多标签 **AND** 过滤（需同时满足所有选中标签）
- 标签数据支持本地缓存（`localStorage`）和 JSON 导入/导出
- 可绑定标签 JSON 文件，实现标签变更自动保存
- 内置音频播放与键盘快捷键（上下选择、空格播放/暂停、左右快进快退）
- 支持复制音频绝对路径
- 支持一键打开音频所在目录（需启动本地 Node 服务）

### 项目结构

```txt
.
├─ index.html      # 页面结构与交互入口
├─ styles.css      # 样式
├─ main.js         # 前端核心逻辑（索引、筛选、标签、播放）
└─ server.js       # 本地静态服务 + 打开目录 API
```

### 环境要求

- Windows（打开目录功能使用 `explorer.exe`）
- Node.js 16+（建议 18+）
- Chromium 内核浏览器（Chrome / Edge，便于使用文件系统相关能力）

### 快速开始

1. 克隆仓库并进入目录
2. 启动本地服务

```bash
node server.js
```

3. 浏览器访问：`http://127.0.0.1:3210`
4. 点击「选择文件夹」，选择你的音频根目录开始使用

### 使用说明

#### 1) 索引与检索

- 点击「选择文件夹」后，会递归读取其中的 `.wav` 文件
- 在「搜索（文件名 / 子目录）」输入关键字可实时过滤结果

#### 2) 标签系统

- **自动标签**：由音频相对路径中的文件夹层级自动生成
- **自定义标签**：在每条音频的「+ 标签」中添加，支持多标签输入（空格/逗号分隔）
- 顶部「所有标签」点击即可切换过滤状态，再点一次取消
- 多个过滤标签之间是 **AND** 关系

#### 3) 路径与目录操作

- 「根路径（用于打开目录）」用于拼接本机绝对路径
- 「复制路径」可复制音频绝对路径到剪贴板
- 「打开目录」优先调用后端 API，失败时回退 `file:///` 打开方式

#### 4) 标签导入导出

- 「导入标签 JSON」：从文件加载标签数据
- 「导出标签 JSON」：下载当前标签数据
- 「绑定标签文件并自动保存」：绑定后标签变更会自动写回该 JSON 文件

### 快捷键

- `↑ / ↓`：切换结果项
- `Space`：播放/暂停当前选中项
- `← / →`：快退/快进 1 秒

### 标签 JSON 格式

导出文件示例：

```json
{
  "version": 1,
  "updatedAt": "2026-03-23T12:34:56.789Z",
  "tagsByAudio": {
    "SFX\\UI\\click.wav": ["UI", "Button", "Click"],
    "SFX\\Weapon\\shot.wav": ["Weapon", "Gun"]
  }
}
```

字段说明：

- `version`：格式版本号
- `updatedAt`：最后更新时间（ISO 时间字符串）
- `tagsByAudio`：键为音频相对路径，值为该音频的自定义标签数组

### 常见问题

#### 打开目录失败怎么办？

- 确认已通过 `node server.js` 启动本地服务
- 确认填写了正确的本机绝对根路径（例如 `D:\Audio\MyLibrary`）
- 若浏览器阻止弹窗，可先用「复制路径」手动打开

#### 为什么看不到文件？

- 当前仅索引 `.wav` 文件
- 请确认目录下确实包含 `.wav`，且选择的是正确根目录

### 后续可扩展方向

- 支持更多音频格式（mp3/ogg/flac）
- 增加波形预览与批量打标签
- 支持标签重命名、合并、统计分析
- 增加 Electron 打包，提供更完整的桌面体验

---

## English

A lightweight web tool for browsing and retrieving audio assets.  
It lets you index local `.wav` files, filter by keyword and tags, preview audio quickly, and import/export custom tags as JSON.

### Features

- Recursively index `.wav` files from a selected folder
- Real-time search by filename and relative path
- Auto-generated tags from folder hierarchy
- Add/remove custom tags per audio item
- Multi-tag **AND** filtering (all selected tags must match)
- Tag persistence via `localStorage` and JSON import/export
- Bind a tag JSON file for auto-save on tag changes
- Built-in audio player with keyboard shortcuts
- Copy absolute file path
- Open the containing folder with one click (requires local Node service)

### Project Structure

```txt
.
├─ index.html      # App entry and page structure
├─ styles.css      # Styles
├─ main.js         # Frontend logic (indexing, filtering, tags, playback)
└─ server.js       # Local static server + open-folder API
```

### Requirements

- Windows (folder opening uses `explorer.exe`)
- Node.js 16+ (18+ recommended)
- Chromium-based browser (Chrome / Edge)

### Quick Start

1. Clone this repo and enter the folder
2. Start the local server

```bash
node server.js
```

3. Open `http://127.0.0.1:3210` in your browser
4. Click "Select Folder" and choose your audio root folder

### Usage

#### 1) Indexing and Search

- Click "Select Folder" to recursively load `.wav` files
- Type keywords in search input to filter results in real time

#### 2) Tag System

- **Auto tags**: generated from folder hierarchy in relative paths
- **Custom tags**: add from the "+ Tag" dialog; supports multiple tags split by spaces/commas
- Click tags in the global panel to toggle filtering
- Multiple selected tags use **AND** logic

#### 3) Path and Folder Actions

- "Base Path" is used to compose absolute local paths
- "Copy Path" copies absolute audio path to clipboard
- "Open Folder" tries backend API first, then falls back to `file:///`

#### 4) Tag Import/Export

- Import tags from a JSON file
- Export current tags as JSON
- Bind a JSON file to auto-write changes when tags are updated

### Keyboard Shortcuts

- `↑ / ↓`: move selection
- `Space`: play/pause selected item
- `← / →`: seek backward/forward by 1 second

### Tag JSON Format

Example:

```json
{
  "version": 1,
  "updatedAt": "2026-03-23T12:34:56.789Z",
  "tagsByAudio": {
    "SFX\\UI\\click.wav": ["UI", "Button", "Click"],
    "SFX\\Weapon\\shot.wav": ["Weapon", "Gun"]
  }
}
```

Fields:

- `version`: schema version
- `updatedAt`: last update time (ISO string)
- `tagsByAudio`: key is audio relative path, value is custom tag array

### FAQ

#### "Open Folder" does not work

- Make sure the local server is running with `node server.js`
- Make sure your base absolute path is correct
- If popup is blocked, use "Copy Path" and open manually

#### No files found

- Only `.wav` files are indexed for now
- Verify the selected folder and your file extensions

### Possible Roadmap

- Support more audio formats (mp3/ogg/flac)
- Waveform preview and batch tagging
- Tag rename/merge/statistics
- Electron packaging for desktop distribution

## License

If you plan to open-source this project, add a `LICENSE` file (for example, MIT).  
This repository currently does not include one by default.
