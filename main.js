const folderInput = document.getElementById("folderInput");
const clearBtn = document.getElementById("clearBtn");
const openGuideBtn = document.getElementById("openGuideBtn");
const searchPanel = document.getElementById("searchPanel");
const toggleSearchPanelBtn = document.getElementById("toggleSearchPanelBtn");
const basePathInput = document.getElementById("basePathInput");
const searchInput = document.getElementById("searchInput");
const toggleTagPanelBtn = document.getElementById("toggleTagPanelBtn");
const allTagsPanel = document.getElementById("allTagsPanel");
const loadTagsBtn = document.getElementById("loadTagsBtn");
const saveTagsBtn = document.getElementById("saveTagsBtn");
const bindTagsFileBtn = document.getElementById("bindTagsFileBtn");
const tagsFileInput = document.getElementById("tagsFileInput");
const resultList = document.getElementById("resultList");
const stats = document.getElementById("stats");
const player = document.getElementById("player");
const itemTemplate = document.getElementById("itemTemplate");
const tagModal = document.getElementById("tagModal");
const closeTagModalBtn = document.getElementById("closeTagModalBtn");
const cancelTagModalBtn = document.getElementById("cancelTagModalBtn");
const confirmTagModalBtn = document.getElementById("confirmTagModalBtn");
const tagModalAudioName = document.getElementById("tagModalAudioName");
const tagModalChoices = document.getElementById("tagModalChoices");
const tagModalNewInput = document.getElementById("tagModalNewInput");
const guideModal = document.getElementById("guideModal");
const closeGuideModalBtn = document.getElementById("closeGuideModalBtn");
const confirmGuideModalBtn = document.getElementById("confirmGuideModalBtn");
const TAGS_STORAGE_KEY = "audio-tool-custom-tags-v1";

/** @type {{file: File, name: string, relPath: string, folderRelPath: string, hierarchyTags: string[], customTags: string[]}[]} */
let allFiles = [];
/** @type {string | null} */
let currentObjectUrl = null;
/** @type {string | null} */
let currentPlayingRelPath = null;
/** @type {number} */
let selectedIndex = -1;
/** @type {FileSystemFileHandle | null} */
let boundTagsFileHandle = null;
/** @type {Map<string, string[]>} */
const customTagsMap = new Map();
/** @type {Set<string>} */
const selectedFilterTags = new Set();
/** @type {boolean} */
let isTagPanelExpanded = true;
/** @type {boolean} */
let isSearchPanelExpanded = true;
/** @type {string | null} */
let modalTargetRelPath = null;
/** @type {Set<string>} */
const modalSelectedTags = new Set();

folderInput.addEventListener("change", () => {
  const files = Array.from(folderInput.files || []);
  indexFiles(files);
  selectedIndex = allFiles.length ? 0 : -1;
  render();
});

clearBtn.addEventListener("click", () => {
  selectedFilterTags.clear();
  allFiles = [];
  searchInput.value = "";
  selectedIndex = -1;
  currentPlayingRelPath = null;
  cleanupPlayerUrl();
  player.removeAttribute("src");
  player.load();
  render();
});

searchInput.addEventListener("input", () => {
  selectedIndex = 0;
  render();
});
toggleSearchPanelBtn.addEventListener("click", () => {
  isSearchPanelExpanded = !isSearchPanelExpanded;
  renderSearchPanelState();
});
toggleTagPanelBtn.addEventListener("click", () => {
  isTagPanelExpanded = !isTagPanelExpanded;
  renderAllTagsPanel();
});
loadTagsBtn.addEventListener("click", () => tagsFileInput.click());
saveTagsBtn.addEventListener("click", () => exportTagsJson());
bindTagsFileBtn.addEventListener("click", () => bindTagsFileAndSave());
tagsFileInput.addEventListener("change", () => importTagsJsonFromInput());
document.addEventListener("keydown", handleKeyboardShortcuts);
closeTagModalBtn.addEventListener("click", closeTagModal);
cancelTagModalBtn.addEventListener("click", closeTagModal);
confirmTagModalBtn.addEventListener("click", () => confirmAddTagsFromModal());
tagModal.addEventListener("click", (evt) => {
  if (evt.target === tagModal) closeTagModal();
});
openGuideBtn.addEventListener("click", openGuideModal);
closeGuideModalBtn.addEventListener("click", closeGuideModal);
confirmGuideModalBtn.addEventListener("click", closeGuideModal);
guideModal.addEventListener("click", (evt) => {
  if (evt.target === guideModal) closeGuideModal();
});

function indexFiles(files) {
  const wavFiles = files.filter((f) => /\.wav$/i.test(f.name));
  allFiles = wavFiles.map((file) => {
    const relPath = (file.webkitRelativePath || file.name).replaceAll("/", "\\");
    const split = relPath.split("\\");
    split.pop();
    const hierarchyTags = deriveHierarchyTags(relPath);
    const customTags = getCustomTags(relPath);
    return {
      file,
      name: file.name,
      relPath,
      folderRelPath: split.join("\\"),
      hierarchyTags,
      customTags
    };
  });
}

function getFilteredFiles() {
  const keyword = searchInput.value.trim().toLowerCase();

  return allFiles.filter((item) => {
    const textMatched =
      !keyword ||
      item.name.toLowerCase().includes(keyword) ||
      item.relPath.toLowerCase().includes(keyword);

    if (!textMatched) return false;
    if (!selectedFilterTags.size) return true;

    const tagSet = new Set(getAllTags(item));
    for (const tag of selectedFilterTags) {
      if (!tagSet.has(tag)) return false;
    }
    return true;
  });
}

function render() {
  const list = getFilteredFiles();
  resultList.innerHTML = "";
  renderSearchPanelState();
  renderAllTagsPanel();

  const totalText = `已索引 ${allFiles.length} 个 WAV，当前显示 ${list.length} 个，已选标签 ${selectedFilterTags.size} 个`;
  stats.textContent = allFiles.length ? totalText : "尚未加载 WAV 文件";

  if (!list.length) return;
  selectedIndex = clamp(selectedIndex, 0, list.length - 1);

  const frag = document.createDocumentFragment();
  for (let i = 0; i < list.length; i += 1) {
    const item = list[i];
    const node = itemTemplate.content.firstElementChild.cloneNode(true);
    node.querySelector(".name").textContent = item.name;
    node.querySelector(".path").textContent = item.relPath;
    node.dataset.relPath = item.relPath;
    if (i === selectedIndex) {
      node.classList.add("selected");
    }
    node.addEventListener("click", () => {
      selectedIndex = i;
      render();
    });

    node.querySelector(".play-btn").addEventListener("click", () => {
      playFile(item.file, item.relPath);
    });

    node.querySelector(".open-btn").addEventListener("click", () => {
      openFolder(item.folderRelPath);
    });

    node.querySelector(".copy-btn").addEventListener("click", async () => {
      const absPath = joinWinPath(getBasePath(), item.relPath);
      await copyText(absPath);
    });

    const tagsWrap = node.querySelector(".tags");
    const allTags = getAllTags(item);
    for (const tag of allTags) {
      const chip = createTagChip(tag, item, item.customTags.includes(tag));
      tagsWrap.appendChild(chip);
    }

    node.querySelector(".add-tag-modal-btn").addEventListener("click", (evt) => {
      evt.stopPropagation();
      openTagModal(item.relPath);
    });

    frag.appendChild(node);
  }
  resultList.appendChild(frag);
}

function renderSearchPanelState() {
  searchPanel.classList.toggle("collapsed", !isSearchPanelExpanded);
  toggleSearchPanelBtn.textContent = isSearchPanelExpanded ? "收起检索区" : "展开检索区";
}

function renderAllTagsPanel() {
  const tagGroups = getGlobalTagGroups();
  const allTags = [...tagGroups.customTags, ...tagGroups.autoTags];
  pruneSelectedFilterTags(allTags);
  allTagsPanel.innerHTML = "";
  allTagsPanel.classList.toggle("collapsed", !isTagPanelExpanded);
  toggleTagPanelBtn.textContent = isTagPanelExpanded ? "收起标签" : "展开标签";

  if (!isTagPanelExpanded) return;
  if (!allTags.length) {
    const empty = document.createElement("div");
    empty.className = "tags-empty";
    empty.textContent = "暂无标签";
    allTagsPanel.appendChild(empty);
    return;
  }

  const frag = document.createDocumentFragment();
  frag.appendChild(createTagGroupSection("用户创建标签", tagGroups.customTags, createGlobalFilterChip));
  frag.appendChild(createTagGroupSection("自动文件夹标签", tagGroups.autoTags, createGlobalFilterChip));
  allTagsPanel.appendChild(frag);
}

function playFile(file, relPath) {
  cleanupPlayerUrl();
  currentObjectUrl = URL.createObjectURL(file);
  player.src = currentObjectUrl;
  currentPlayingRelPath = relPath;
  player.play().catch(() => {});
}

function cleanupPlayerUrl() {
  if (currentObjectUrl) {
    URL.revokeObjectURL(currentObjectUrl);
    currentObjectUrl = null;
  }
}

function getBasePath() {
  return (basePathInput.value || "").trim().replace(/[\\/]+$/, "");
}

function joinWinPath(base, rel) {
  if (!base) return rel;
  return `${base}\\${rel}`.replace(/[\\/]+/g, "\\");
}

function openFolder(folderRelPath) {
  const basePath = getBasePath();
  if (!basePath) {
    alert("请先填写本地绝对根路径");
    return;
  }

  const absFolderPath = joinWinPath(basePath, folderRelPath);
  openFolderWithFallback(absFolderPath);
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    alert(`已复制路径:\n${text}`);
  } catch (e) {
    const area = document.createElement("textarea");
    area.value = text;
    document.body.appendChild(area);
    area.select();
    document.execCommand("copy");
    document.body.removeChild(area);
    alert(`已复制路径:\n${text}`);
  }
}

async function openFolderWithFallback(absFolderPath) {
  const openedByBackend = await tryOpenFolderByBackend(absFolderPath);
  if (openedByBackend) return;

  const url = `file:///${absFolderPath.replace(/\\/g, "/")}`;
  const opened = window.open(url, "_blank");
  if (!opened) {
    alert("打开目录失败：后端未启动或浏览器拦截。请先运行 `node server.js`，或使用“复制路径”后手动打开。");
  }
}

async function tryOpenFolderByBackend(absFolderPath) {
  const candidates = getBackendCandidates();
  for (const baseUrl of candidates) {
    try {
      const ok = await callOpenFolderApi(baseUrl, absFolderPath);
      if (ok) return true;
    } catch (err) {
      // 尝试下一个后端地址
    }
  }
  return false;
}

function getBackendCandidates() {
  const set = new Set();
  if (window.location?.origin && /^https?:\/\//.test(window.location.origin)) {
    set.add(window.location.origin);
  }
  set.add("http://127.0.0.1:3210");
  set.add("http://localhost:3210");
  return Array.from(set);
}

async function callOpenFolderApi(baseUrl, folderPath) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 1800);
  try {
    const res = await fetch(`${baseUrl}/api/open-folder`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ folderPath }),
      signal: controller.signal
    });
    if (!res.ok) return false;
    const payload = await res.json().catch(() => ({}));
    return payload?.ok === true;
  } finally {
    clearTimeout(timer);
  }
}

function deriveHierarchyTags(relPath) {
  const parts = relPath.split("\\").filter(Boolean);
  if (parts.length <= 1) return [];
  parts.pop();
  return Array.from(new Set(parts));
}

function getCustomTags(relPath) {
  return customTagsMap.get(relPath)?.slice() || [];
}

function getAllTags(item) {
  return Array.from(new Set([...item.hierarchyTags, ...item.customTags]));
}

function getGlobalTagGroups() {
  const customSet = new Set();
  const autoSet = new Set();
  for (const item of allFiles) {
    for (const tag of item.customTags) {
      customSet.add(tag);
    }
    for (const tag of item.hierarchyTags) {
      autoSet.add(tag);
    }
  }
  return {
    customTags: Array.from(customSet).sort((a, b) => a.localeCompare(b, "zh-CN")),
    autoTags: Array.from(autoSet).sort((a, b) => a.localeCompare(b, "zh-CN"))
  };
}

function pruneSelectedFilterTags(currentGlobalTags) {
  const globalSet = new Set(currentGlobalTags);
  const stale = [];
  for (const tag of selectedFilterTags) {
    if (!globalSet.has(tag)) stale.push(tag);
  }
  for (const tag of stale) selectedFilterTags.delete(tag);
}

function createTagChip(tag, item, isCustomTag) {
  const wrap = document.createElement("div");
  wrap.className = "tag-chip-wrap";

  const chip = document.createElement("button");
  chip.className = `tag-chip item-tag${selectedFilterTags.has(tag) ? " selected" : ""}`;
  chip.type = "button";
  chip.textContent = `#${tag}`;
  chip.title = "点击切换该标签的筛选状态";
  chip.addEventListener("click", (evt) => {
    evt.stopPropagation();
    if (selectedFilterTags.has(tag)) {
      selectedFilterTags.delete(tag);
    } else {
      selectedFilterTags.add(tag);
    }
    selectedIndex = 0;
    render();
  });
  wrap.appendChild(chip);

  if (isCustomTag) {
    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "tag-remove-btn";
    removeBtn.textContent = "×";
    removeBtn.title = "删除该自定义标签";
    removeBtn.addEventListener("click", async (evt) => {
      evt.stopPropagation();
      removeCustomTag(item, tag);
      await persistIfBound();
      render();
    });
    wrap.appendChild(removeBtn);
  }

  return wrap;
}

function createGlobalFilterChip(tag) {
  const chip = document.createElement("button");
  chip.type = "button";
  chip.className = `tag-chip global-filter${selectedFilterTags.has(tag) ? " selected" : ""}`;
  chip.textContent = `#${tag}`;
  chip.addEventListener("click", () => {
    if (selectedFilterTags.has(tag)) {
      selectedFilterTags.delete(tag);
    } else {
      selectedFilterTags.add(tag);
    }
    selectedIndex = 0;
    render();
  });
  return chip;
}

function upsertCustomTag(item, rawTag) {
  const normalized = normalizeTag(rawTag);
  if (!normalized) return;
  const existing = customTagsMap.get(item.relPath) || [];
  if (!existing.includes(normalized)) {
    const updated = [...existing, normalized];
    customTagsMap.set(item.relPath, updated);
    item.customTags = updated.slice();
  }
}

function removeCustomTag(item, tag) {
  const existing = customTagsMap.get(item.relPath) || [];
  const updated = existing.filter((t) => t !== tag);
  if (updated.length) {
    customTagsMap.set(item.relPath, updated);
  } else {
    customTagsMap.delete(item.relPath);
  }
  item.customTags = updated.slice();
}

function normalizeTag(tag) {
  return tag.trim().replace(/\s+/g, " ");
}

function buildTagsPayload() {
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    tagsByAudio: Object.fromEntries(customTagsMap.entries())
  };
}

async function importTagsJsonFromInput() {
  const file = tagsFileInput.files?.[0];
  if (!file) return;
  try {
    const raw = await file.text();
    const parsed = JSON.parse(raw);
    loadCustomTagsFromPayload(parsed);
    saveCustomTagsToStorage();
    render();
    alert("标签 JSON 已导入");
  } catch (err) {
    alert("导入失败：JSON 格式不正确");
  } finally {
    tagsFileInput.value = "";
  }
}

function loadCustomTagsFromPayload(payload) {
  customTagsMap.clear();
  const source = payload?.tagsByAudio;
  if (!source || typeof source !== "object") return;
  for (const [relPath, tags] of Object.entries(source)) {
    if (!Array.isArray(tags)) continue;
    const normalized = Array.from(new Set(tags.map((t) => normalizeTag(String(t))).filter(Boolean)));
    if (normalized.length) customTagsMap.set(relPath, normalized);
  }
  allFiles = allFiles.map((item) => ({ ...item, customTags: getCustomTags(item.relPath) }));
}

function loadCustomTagsFromStorage() {
  try {
    const raw = localStorage.getItem(TAGS_STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    loadCustomTagsFromPayload(parsed);
  } catch (err) {
    // 忽略无效缓存，避免影响主流程
  }
}

function saveCustomTagsToStorage() {
  try {
    localStorage.setItem(TAGS_STORAGE_KEY, JSON.stringify(buildTagsPayload()));
  } catch (err) {
    // 本地存储不可用时忽略
  }
}

function openTagModal(relPath) {
  const item = getItemByRelPath(relPath);
  if (!item) return;
  modalTargetRelPath = relPath;
  modalSelectedTags.clear();
  tagModalAudioName.textContent = item.relPath;
  tagModalNewInput.value = "";
  renderTagModalChoices(item);
  tagModal.classList.remove("hidden");
}

function closeTagModal() {
  modalTargetRelPath = null;
  modalSelectedTags.clear();
  tagModal.classList.add("hidden");
}

function openGuideModal() {
  guideModal.classList.remove("hidden");
}

function closeGuideModal() {
  guideModal.classList.add("hidden");
}

function renderTagModalChoices(item) {
  const tagGroups = getGlobalTagGroups();
  const allTags = [...tagGroups.customTags, ...tagGroups.autoTags];
  tagModalChoices.innerHTML = "";
  if (!allTags.length) {
    const empty = document.createElement("div");
    empty.className = "tags-empty";
    empty.textContent = "暂无可选标签";
    tagModalChoices.appendChild(empty);
    return;
  }

  const currentTagSet = new Set(getAllTags(item));
  const frag = document.createDocumentFragment();
  const makeModalChip = (tag) => createModalChoiceChip(tag, currentTagSet);
  frag.appendChild(createTagGroupSection("用户创建标签", tagGroups.customTags, makeModalChip));
  frag.appendChild(createTagGroupSection("自动文件夹标签", tagGroups.autoTags, makeModalChip));
  tagModalChoices.appendChild(frag);
}

function createModalChoiceChip(tag, currentTagSet) {
  const chip = document.createElement("button");
  chip.type = "button";
  const alreadyHas = currentTagSet.has(tag);
  const selected = modalSelectedTags.has(tag);
  chip.className = `tag-chip modal-choice${alreadyHas ? " exists" : ""}${selected ? " selected" : ""}`;
  chip.textContent = `#${tag}${alreadyHas ? " (已拥有)" : ""}`;
  chip.addEventListener("click", () => {
    if (modalSelectedTags.has(tag)) {
      modalSelectedTags.delete(tag);
      chip.classList.remove("selected");
    } else {
      modalSelectedTags.add(tag);
      chip.classList.add("selected");
    }
  });
  return chip;
}

function createTagGroupSection(title, tags, chipFactory) {
  const section = document.createElement("div");
  section.className = "tag-group-section";

  const heading = document.createElement("div");
  heading.className = "tag-group-title";
  heading.textContent = `${title} (${tags.length})`;
  section.appendChild(heading);

  const body = document.createElement("div");
  body.className = "tag-group-body";
  if (!tags.length) {
    const empty = document.createElement("div");
    empty.className = "tags-empty";
    empty.textContent = "暂无";
    body.appendChild(empty);
  } else {
    for (const tag of tags) {
      body.appendChild(chipFactory(tag));
    }
  }
  section.appendChild(body);
  return section;
}

async function confirmAddTagsFromModal() {
  if (!modalTargetRelPath) return;
  const item = getItemByRelPath(modalTargetRelPath);
  if (!item) return;

  const parsedNewTags = parseInputTags(tagModalNewInput.value);
  const tagsToAdd = Array.from(new Set([...modalSelectedTags, ...parsedNewTags]));
  if (!tagsToAdd.length) {
    closeTagModal();
    return;
  }

  let changed = false;
  for (const tag of tagsToAdd) {
    const beforeLen = (customTagsMap.get(item.relPath) || []).length;
    upsertCustomTag(item, tag);
    const afterLen = (customTagsMap.get(item.relPath) || []).length;
    if (afterLen !== beforeLen) changed = true;
  }

  if (changed) {
    await persistIfBound();
  }
  closeTagModal();
  render();
}

function parseInputTags(raw) {
  const value = String(raw || "").trim();
  if (!value) return [];
  return Array.from(
    new Set(
      value
        .split(/[,\s，]+/)
        .map((tag) => normalizeTag(tag))
        .filter(Boolean)
    )
  );
}

function getItemByRelPath(relPath) {
  return allFiles.find((item) => item.relPath === relPath) || null;
}

function exportTagsJson() {
  const payload = buildTagsPayload();
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "custom-tags.json";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

async function bindTagsFileAndSave() {
  if (!window.showSaveFilePicker) {
    alert("当前浏览器不支持文件系统写入，请使用“导出标签 JSON”手动保存到 audio-tool 文件夹。");
    return;
  }
  try {
    const handle = await window.showSaveFilePicker({
      suggestedName: "custom-tags.json",
      types: [{ description: "JSON 文件", accept: { "application/json": [".json"] } }]
    });
    boundTagsFileHandle = handle;
    await writeTagsToBoundFile();
    alert("标签文件已绑定，后续增删标签会自动写入该 JSON 文件。");
  } catch (err) {
    // 用户取消时不提示错误
  }
}

async function persistIfBound() {
  saveCustomTagsToStorage();
  if (!boundTagsFileHandle) return;
  await writeTagsToBoundFile();
}

async function writeTagsToBoundFile() {
  if (!boundTagsFileHandle) return;
  const writable = await boundTagsFileHandle.createWritable();
  await writable.write(JSON.stringify(buildTagsPayload(), null, 2));
  await writable.close();
}

function handleKeyboardShortcuts(evt) {
  const target = /** @type {HTMLElement | null} */ (evt.target);
  if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
  if (!tagModal.classList.contains("hidden")) return;
  if (!guideModal.classList.contains("hidden")) return;

  const list = getFilteredFiles();
  if (!list.length) return;

  if (evt.key === "ArrowDown") {
    evt.preventDefault();
    selectedIndex = clamp(selectedIndex + 1, 0, list.length - 1);
    render();
    scrollSelectedIntoView();
    return;
  }

  if (evt.key === "ArrowUp") {
    evt.preventDefault();
    selectedIndex = clamp(selectedIndex - 1, 0, list.length - 1);
    render();
    scrollSelectedIntoView();
    return;
  }

  if (evt.key === "ArrowRight") {
    evt.preventDefault();
    seekPlayerBy(1);
    return;
  }

  if (evt.key === "ArrowLeft") {
    evt.preventDefault();
    seekPlayerBy(-1);
    return;
  }

  if (evt.code === "Space") {
    evt.preventDefault();
    const current = list[selectedIndex];
    if (!current) return;
    if (player.src && isCurrentPlaying(current.relPath)) {
      if (player.paused) {
        player.play().catch(() => {});
      } else {
        player.pause();
      }
    } else {
      playFile(current.file, current.relPath);
    }
  }
}

function isCurrentPlaying(relPath) {
  return currentPlayingRelPath === relPath;
}

function scrollSelectedIntoView() {
  const selected = resultList.querySelector(".item.selected");
  if (selected) {
    selected.scrollIntoView({ block: "nearest" });
  }
}

function clamp(num, min, max) {
  return Math.max(min, Math.min(max, num));
}

function seekPlayerBy(deltaSeconds) {
  if (!player.src) return;
  const duration = Number.isFinite(player.duration) ? player.duration : null;
  const nextTime = player.currentTime + deltaSeconds;
  if (duration === null) {
    player.currentTime = Math.max(0, nextTime);
    return;
  }
  player.currentTime = clamp(nextTime, 0, duration);
}

loadCustomTagsFromStorage();
render();

window.addEventListener("beforeunload", cleanupPlayerUrl);
