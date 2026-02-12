import { WmeSDK } from "wme-sdk-typings";

window.SDK_INITIALIZED.then(initScript);

function initScript() {
    if (!window.getWmeSdk) {
        throw new Error("SDK not available");
    }
    const wmeSDK: WmeSDK = window.getWmeSdk({
        scriptId: "wmesdk-zoom-data-loading-error",
        scriptName: "WME SDK Zoom Data Loading Error",
    });

    console.debug(`SDK v. ${wmeSDK.getSDKVersion()} on ${wmeSDK.getWMEVersion()} initialized`);

    // ── Utility functions ──────────────────────────────────────────────

    function injectStyles(): void {
        if (document.getElementById("wmesdk-debug-styles")) return;

        const style = document.createElement("style");
        style.id = "wmesdk-debug-styles";
        style.textContent = `
            .sdkdbg-chapter {
                padding: 10px;
                margin-bottom: 14px;
                border-radius: 4px;
            }
            .sdkdbg-chapter h2 {
                margin: 0 0 6px;
                font-size: 14px;
            }
            .sdkdbg-chapter h2 code {
                font-size: 13px;
            }
            .sdkdbg-chapter p {
                font-size: 12px;
                line-height: 1.45;
                margin: 0 0 8px;
            }
            .sdkdbg-chapter blockquote {
                border-left: 3px solid #aaa;
                margin: 6px 0 8px;
                padding: 4px 8px;
                font-style: italic;
                font-size: 11.5px;
                color: #555;
                background: rgba(0,0,0,0.03);
                border-radius: 2px;
            }
            .sdkdbg-ch1 {
                border-left: 4px solid #e74c3c;
                background: rgba(231,76,60,0.06);
            }
            .sdkdbg-ch2 {
                border-left: 4px solid #f39c12;
                background: rgba(243,156,18,0.06);
            }
            .sdkdbg-btn-row {
                display: flex;
                gap: 6px;
                margin: 8px 0;
                flex-wrap: wrap;
            }
            .sdkdbg-log-zone {
                font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
                font-size: 11.5px;
                background: #f5f5f5;
                border-radius: 3px;
                padding: 6px;
                max-height: 280px;
                overflow-y: auto;
                margin-top: 6px;
                min-height: 32px;
                color: #333;
            }
            .sdkdbg-log-zone:empty::before {
                content: 'Waiting for events…';
                color: #999;
                font-style: italic;
            }
            .sdkdbg-log-zone.sdkdbg-ch2-logs:empty::before {
                content: 'Click "Zoom to level 17" to start capturing events.';
            }
            .sdkdbg-log-line {
                padding: 3px 6px;
                margin: 1px 0;
                border-radius: 2px;
                display: flex;
                flex-wrap: wrap;
                gap: 6px;
                align-items: baseline;
            }
            .sdkdbg-log-line:nth-child(odd) {
                background: rgba(0,0,0,0.04);
            }
            .sdkdbg-ts {
                font-weight: bold;
                color: #555;
                white-space: nowrap;
            }
            .sdkdbg-event {
                font-weight: 600;
            }
            .sdkdbg-event-wme-ready {
                color: #2980b9;
            }
            .sdkdbg-event-wme-map-data-loaded {
                color: #8e44ad;
            }
            .sdkdbg-event-wme-map-zoom-changed {
                color: #2c3e50;
            }
            .sdkdbg-loading-true {
                color: #27ae60;
                font-weight: 600;
            }
            .sdkdbg-loading-false {
                color: #e74c3c;
                font-weight: 700;
            }
            .sdkdbg-venues {
                cursor: help;
                text-decoration: underline dotted;
                color: #666;
            }
            .sdkdbg-separator {
                border: none;
                border-top: 1px solid rgba(0,0,0,0.1);
                margin: 14px 0;
            }
        `;
        document.head.appendChild(style);
    }

    function formatTimestamp(): string {
        const d = new Date();
        const pad2 = (n: number) => String(n).padStart(2, "0");
        const pad3 = (n: number) => String(n).padStart(3, "0");
        return `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}.${pad3(d.getMilliseconds())}`;
    }

    function getVenuesSummary(): { count: number; tooltip: string } {
        const venues = wmeSDK.DataModel.Venues.getAll();
        const names = venues.map((v) => v.name || "(unnamed)");
        return {
            count: venues.length,
            tooltip: names.length > 0 ? names.join("\n") : "(none)",
        };
    }

    interface LogConfig {
        eventName: string;
        isMapLoading?: boolean;
        showVenues?: boolean;
    }

    function appendLog(container: HTMLDivElement, config: LogConfig): void {
        const line = document.createElement("div");
        line.className = "sdkdbg-log-line";

        // Timestamp
        const ts = document.createElement("span");
        ts.className = "sdkdbg-ts";
        ts.textContent = formatTimestamp();
        line.appendChild(ts);

        // Event name
        const ev = document.createElement("span");
        const cssClass = config.eventName.replace(/\s+/g, "-");
        ev.className = `sdkdbg-event sdkdbg-event-${cssClass}`;
        ev.textContent = config.eventName;
        line.appendChild(ev);

        // isMapLoading indicator
        if (config.isMapLoading !== undefined) {
            const lm = document.createElement("span");
            lm.className = config.isMapLoading ? "sdkdbg-loading-true" : "sdkdbg-loading-false";
            lm.textContent = `isMapLoading() = ${config.isMapLoading}`;
            line.appendChild(lm);
        }

        // Venues count with tooltip
        if (config.showVenues) {
            const { count, tooltip } = getVenuesSummary();
            const v = document.createElement("span");
            v.className = "sdkdbg-venues";
            v.textContent = `${count} venue${count !== 1 ? "s" : ""}`;
            v.title = tooltip;
            line.appendChild(v);
        }

        container.appendChild(line);
        container.scrollTop = container.scrollHeight;
    }

    type WzButtonElement = HTMLElement & { disabled?: boolean };

    function createWzButton(options: {
        label: string;
        color?: string;
        size?: string;
        onClick: () => void | Promise<void>;
    }): WzButtonElement {
        const btn = document.createElement("wz-button") as WzButtonElement;
        btn.setAttribute("color", options.color ?? "secondary");
        btn.setAttribute("size", options.size ?? "sm");
        btn.setAttribute("type", "button");
        btn.textContent = options.label;

        let handling = false;
        btn.addEventListener("click", () => {
            if (handling) return;
            handling = true;
            Promise.resolve(options.onClick()).finally(() => {
                handling = false;
            });
        });
        return btn;
    }

    function resetAndReload(): void {
        wmeSDK.Map.setMapCenter({ lonLat: { lat: 46.955, lon: 6.72377 } });
        wmeSDK.Map.setZoomLevel({ zoomLevel: 16 });
        window.location.reload();
    }

    // ── UI construction ────────────────────────────────────────────────

    async function addScriptTab(): Promise<{ ch1Logs: HTMLDivElement; ch2Logs: HTMLDivElement }> {
        const { tabLabel, tabPane } = await wmeSDK.Sidebar.registerScriptTab();
        tabLabel.innerHTML = '<span title="WME SDK Zoom Data Loading Error">SDK Events Debug</span>';

        const root = document.createElement("div");
        root.classList.add("sidebar-tab-pane-body");

        // ── Chapter 1 ──────────────────────────────────────────────────
        const ch1 = document.createElement("div");
        ch1.className = "sdkdbg-chapter sdkdbg-ch1";

        ch1.innerHTML = `
            <h2>Issue #1: <code>wme-ready</code> event ordering</h2>
            <p>According to the documentation:</p>
            <blockquote>
                <code>wme-ready</code> — Dispatched only once, after the <code>wme-initialized</code>,
                <code>wme-logged-in</code>, and <code>wme-map-data-loaded</code> events have been dispatched.
            </blockquote>
            <p>
                This implies <code>wme-map-data-loaded</code> should fire <strong>before</strong>
                <code>wme-ready</code>. However, in practice, <code>wme-map-data-loaded</code> fires
                <strong>after</strong> <code>wme-ready</code>, contradicting the documented order.<br/>
                The log below captures these events as they fire during page load.
            </p>
        `;

        const ch1BtnRow = document.createElement("div");
        ch1BtnRow.className = "sdkdbg-btn-row";
        ch1BtnRow.appendChild(createWzButton({ label: "Reset & Reload", onClick: resetAndReload }));
        ch1.appendChild(ch1BtnRow);

        const ch1Logs = document.createElement("div");
        ch1Logs.className = "sdkdbg-log-zone";
        ch1.appendChild(ch1Logs);

        root.appendChild(ch1);

        // ── Separator ──────────────────────────────────────────────────
        const sep = document.createElement("hr");
        sep.className = "sdkdbg-separator";
        root.appendChild(sep);

        // ── Chapter 2 ──────────────────────────────────────────────────
        const ch2 = document.createElement("div");
        ch2.className = "sdkdbg-chapter sdkdbg-ch2";

        ch2.innerHTML = `
            <h2>Issue #2: No reliable way to know when data has finished loading</h2>
            <p>
                After a zoom change, <code>wme-map-data-loaded</code> fires <strong>multiple times</strong>.
                Furthermore, <code>isMapLoading()</code> returns <code>false</code> even though additional
                <code>wme-map-data-loaded</code> events arrive afterwards.<br/>
                This makes it impossible to reliably determine when map data is fully loaded and available.
            </p>
            <p>
                Click <strong>"Zoom to level 17"</strong> below to observe the behavior.
                Each event is logged with the current value of <code>isMapLoading()</code> and the number
                of venues available at that moment (hover for names).
            </p>
        `;

        const ch2BtnRow = document.createElement("div");
        ch2BtnRow.className = "sdkdbg-btn-row";
        ch2BtnRow.appendChild(createWzButton({ label: "Reset & Reload", onClick: resetAndReload }));
        ch2BtnRow.appendChild(
            createWzButton({
                label: "Zoom to level 17",
                color: "primary",
                onClick: () => {
                    chapter1Active = false;
                    chapter2Active = true;
                    ch2Logs.innerHTML = "";
                    wmeSDK.Map.setZoomLevel({ zoomLevel: 17 });
                },
            })
        );
        ch2.appendChild(ch2BtnRow);

        const ch2Logs = document.createElement("div");
        ch2Logs.className = "sdkdbg-log-zone sdkdbg-ch2-logs";
        ch2.appendChild(ch2Logs);

        root.appendChild(ch2);
        tabPane.appendChild(root);

        return { ch1Logs, ch2Logs };
    }

    // ── Event listeners ────────────────────────────────────────────────

    let chapter1Active = true;
    let chapter2Active = false;

    function addEventListeners(ch1Logs: HTMLDivElement, ch2Logs: HTMLDivElement): void {
        // Chapter 1: track event ordering on page load
        wmeSDK.Events.on({
            eventName: "wme-map-data-loaded",
            eventHandler: () => {
                if (!chapter1Active) return;
                appendLog(ch1Logs, { eventName: "wme-map-data-loaded" });
            },
        });
        wmeSDK.Events.on({
            eventName: "wme-ready",
            eventHandler: () => {
                appendLog(ch1Logs, { eventName: "wme-ready" });
            },
        });

        // Chapter 2: track events after zoom (only when activated)
        wmeSDK.Events.on({
            eventName: "wme-map-zoom-changed",
            eventHandler: () => {
                if (!chapter2Active) return;
                appendLog(ch2Logs, {
                    eventName: "wme-map-zoom-changed",
                    isMapLoading: wmeSDK.State.isMapLoading(),
                    showVenues: true,
                });
            },
        });
        wmeSDK.Events.on({
            eventName: "wme-map-data-loaded",
            eventHandler: () => {
                if (!chapter2Active) return;
                appendLog(ch2Logs, {
                    eventName: "wme-map-data-loaded",
                    isMapLoading: wmeSDK.State.isMapLoading(),
                    showVenues: true,
                });
            },
        });
    }

    // ── Init ───────────────────────────────────────────────────────────

    async function init(): Promise<void> {
        injectStyles();
        const { ch1Logs, ch2Logs } = await addScriptTab();
        addEventListeners(ch1Logs, ch2Logs);
    }

    init();
}
