# WME SDK — Event Timing Bug Report

This repository contains a minimal reproduction script demonstrating **two issues** with the WME SDK event system. The script displays a visual debug UI directly in the WME sidebar, logging events with timestamps to clearly show the problems.

**Repository:** <https://github.com/73VW/WME-SDK-Zoom-Data-Loading-Error>

---

## Bug Report

### 1. WME version

All versions as of February 2026 (tested on production and beta).

### 2. Steps to reproduce

#### Issue #1: `wme-ready` event ordering

According to the documentation:

> `wme-ready` — Dispatched only once, after the `wme-initialized`, `wme-logged-in`, and `wme-map-data-loaded` events have been dispatched.

**Expected:** `wme-map-data-loaded` fires **before** `wme-ready`.

**Actual:** `wme-map-data-loaded` fires **after** `wme-ready`, contradicting the documented order.

**Steps:**
1. Install and activate the script (see [Setup](#setup) below)
2. Open WME and navigate to the "SDK Events Debug" tab in the sidebar
3. Press "Reset & Reload" in the Issue #1 section
4. Observe the event log: `wme-ready` appears **before** `wme-map-data-loaded`

**SDK functions used:** `wmeSDK.Events.on()` with `"wme-map-data-loaded"` and `"wme-ready"` event names.

#### Issue #2: No reliable way to know when data has finished loading

After a zoom change, `wme-map-data-loaded` fires **multiple times** (typically 3). Furthermore, `wmeSDK.State.isMapLoading()` returns `false` even though additional `wme-map-data-loaded` events arrive afterwards. This makes it impossible to reliably determine when map data is fully loaded.

**Steps:**
1. Install and activate the script (see [Setup](#setup) below)
2. Open WME and navigate to the "SDK Events Debug" tab in the sidebar
3. Press "Reset & Reload" in the Issue #2 section (this sets the zoom to level 16)
4. Once the page reloads, press "Zoom to level 17"
5. Observe the event log:
   - `wme-map-zoom-changed` fires with `isMapLoading() = false`
   - `wme-map-data-loaded` fires **3 times**, each time with `isMapLoading() = false`
   - The number of venues changes between events, proving data was still loading despite `isMapLoading()` returning `false`

**SDK functions used:** `wmeSDK.Events.on()` with `"wme-map-zoom-changed"` and `"wme-map-data-loaded"`, `wmeSDK.State.isMapLoading()`, `wmeSDK.Map.setZoomLevel()`, `wmeSDK.DataModel.Venues.getAll()`.

### 3. Screenshot/screen recording link

*(To be added after reproduction)*

### 4. Your username

73VW

### 5. Script name and download link

**WME SDK Zoom Data Loading Error**
<https://github.com/73VW/WME-SDK-Zoom-Data-Loading-Error>

### 6. Is it required for the SDK migration?

**Yes.** Without a reliable way to know when data has finished loading after a map view change (zoom, pan), scripts cannot safely read data model objects (venues, segments, etc.) and may get incomplete or stale data.

---

## Setup

### Prerequisites

- [Visual Studio Code](https://code.visualstudio.com/) with the [Dev Containers extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers)
- [Tampermonkey](https://www.tampermonkey.net/) browser extension
- **Important:** You **MUST** enable "Allow access to file URLs" for Tampermonkey in your browser's extension settings, as explained [here](https://www.tampermonkey.net/faq.php?locale=en#Q204)

### 1. Clone and open in Dev Container

```bash
git clone https://github.com/73VW/WME-SDK-Zoom-Data-Loading-Error.git
```

Open the folder in VS Code, then when prompted, **Reopen in Container** (or run `Dev Containers: Reopen in Container` from the command palette). The container will automatically install all dependencies.

### 2. Start the watcher

Inside the Dev Container terminal:

```bash
npm run watch
```

This compiles `main.user.ts` into `.out/main.user.js` and watches for changes.

### 3. Configure the Tampermonkey userscript

1. Open `header-dev.js` in this repository
2. Update the `@require` path to point to your local `.out/main.user.js` file:

```javascript
// @require  file:///path/to/wmesdk-zoom-data-loading-error/.out/main.user.js
```

> **WSL users:** Use `file://wsl.localhost/<distro>/home/<user>/.../.out/main.user.js`
>
> **macOS/Linux:** Use `file:///home/<user>/.../.out/main.user.js`
>
> **Windows:** Use `file:///C:/Users/<user>/.../.out/main.user.js`

3. Copy the **entire content** of `header-dev.js` (from `// ==UserScript==` to `// ==/UserScript==`)
4. In Tampermonkey, click **Create a new script**
5. Paste the content and **save** (Ctrl+S)

### 4. Reproduce the issues

1. Open [Waze Map Editor](https://www.waze.com/editor)
2. Open the **"SDK Events Debug"** tab in the left sidebar
3. Follow the steps described in each issue section above
