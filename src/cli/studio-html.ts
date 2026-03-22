import type { Config } from "@/config/schema";

const toKebab = (name: string): string =>
  name.replace(/([A-Z])/g, (_, c, i) => (i === 0 ? c.toLowerCase() : `-${c.toLowerCase()}`));

export const generateStudioHTML = (config: Config): string => {
  const activeFrameworks = config.frameworks ?? [config.framework];
  const iconsPath = `@/${config.baseDir}/${config.iconsFolder}`;
  const configData = JSON.stringify({ activeFrameworks, iconsPath });

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>mkicon studio</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg: #0d0d0d;
    --surface: #161616;
    --surface2: #1e1e1e;
    --surface3: #282828;
    --border: #2a2a2a;
    --text: #e4e4e7;
    --text-muted: #71717a;
    --accent: #9DFFA3;
    --accent-dim: #9DFFA318;
    --success: #9DFFA3;
    --radius: 10px;
    --mono: 'SF Mono', 'Fira Code', 'Cascadia Code', monospace;
    --sidebar-w: 220px;
    --icon-size: 48px;
    --icon-color: #e4e4e7;
  }

  html, body { height: 100%; background: var(--bg); color: var(--text); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 13px; line-height: 1.5; overflow: hidden; }

  body::before {
    content: '';
    position: fixed; inset: 0; z-index: 0; pointer-events: none;
    background:
      radial-gradient(ellipse 80% 50% at 15% -5%, #9DFFA335 0%, transparent 65%),
      radial-gradient(ellipse 55% 40% at 85% 105%, #9DFFA328 0%, transparent 60%);
  }
  .layout { position: relative; z-index: 1; }

  /* ── Layout ── */
  .layout { display: flex; height: 100vh; }

  /* ── Sidebar ── */
  aside {
    width: var(--sidebar-w); flex-shrink: 0;
    background: var(--surface); border-right: 1px solid var(--border);
    display: flex; flex-direction: column; overflow-y: auto; overflow-x: hidden;
  }

  .sidebar-logo {
    height: 53px;
    padding: 0 16px;
    border-bottom: 1px solid var(--border);
    display: flex; align-items: center; gap: 8px;
    font-weight: 600; font-size: 14px; letter-spacing: -0.3px;
    flex-shrink: 0;
  }
  .sidebar-badge {
    font-size: 10px; padding: 1px 6px; border-radius: 99px;
    background: var(--accent-dim); color: var(--accent); font-weight: 500;
  }

  .sidebar-section {
    padding: 14px 16px;
    border-bottom: 1px solid var(--border);
  }

  .sidebar-label {
    font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: .6px;
    color: var(--text-muted); margin-bottom: 10px;
  }

  /* Size slider */
  .size-row { display: flex; align-items: center; }
  input[type=range] {
    -webkit-appearance: none; flex: 1; height: 4px;
    background: var(--surface3); border-radius: 99px; outline: none; cursor: pointer;
  }
  input[type=range]::-webkit-slider-thumb {
    -webkit-appearance: none; width: 14px; height: 14px; border-radius: 50%;
    background: var(--accent); cursor: pointer; transition: transform .1s;
  }
  input[type=range]::-webkit-slider-thumb:hover { transform: scale(1.2); }
  .size-value { font-size: 11px; color: var(--accent); font-family: var(--mono); background: var(--accent-dim); border: 1px solid var(--accent); border-radius: 5px; padding: 1px 6px; }
  .size-ticks { display: flex; justify-content: space-between; margin-top: 6px; }
  .size-ticks span { font-size: 9px; color: var(--text-muted); }

  /* Style toggle */
  .style-btns { display: flex; gap: 4px; }
  .style-btn {
    flex: 1; padding: 5px 0; font-size: 11px; font-weight: 500; border-radius: 6px;
    border: 1px solid var(--border); background: var(--surface2); color: var(--text-muted);
    cursor: pointer; transition: all .15s;
  }
  .style-btn:hover { color: var(--text); border-color: var(--text-muted); }
  .style-btn.active { border-color: var(--accent); color: var(--accent); background: var(--accent-dim); }
  .style-btn[data-style="filled"].active { border-color: #9DFFA3; color: #9DFFA3; background: #9DFFA318; }
  .style-btn[data-style="outline"].active { border-color: #9DFFA3; color: #9DFFA3; background: #9DFFA318; }

  /* Color swatches */
  .color-swatches { display: flex; flex-wrap: wrap; gap: 6px; }
  .swatch {
    width: 22px; height: 22px; border-radius: 6px; cursor: pointer;
    border: 2px solid transparent; transition: border-color .15s, transform .1s;
  }
  .swatch:hover { transform: scale(1.1); }
  .swatch.active { border-color: var(--accent); }

  /* Library select */
  select {
    width: 100%; padding: 6px 10px; border-radius: 7px;
    background: var(--surface2); border: 1px solid var(--border); color: var(--text);
    font-size: 12px; outline: none; cursor: pointer; transition: border-color .15s;
  }
  select:focus { border-color: var(--accent); }

  .sidebar-footer {
    padding: 14px 16px;
    margin-top: auto;
    font-size: 11px; color: var(--text-muted);
    border-top: 1px solid var(--border);
    flex-shrink: 0;
  }

  /* ── Main ── */
  .main { flex: 1; display: flex; flex-direction: column; min-width: 0; }

  .topbar {
    height: 53px;
    padding: 0 18px;
    border-bottom: 1px solid var(--border);
    background: rgba(13,13,13,.85); backdrop-filter: blur(12px);
    flex-shrink: 0; position: sticky; top: 0; z-index: 5;
    display: flex; align-items: center;
  }
  .search-wrap { position: relative; flex: 1; }
  .search-wrap svg { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: var(--text-muted); pointer-events: none; }
  #search {
    width: 100%; padding: 8px 12px 8px 34px;
    background: var(--surface2); border: 1px solid var(--border); border-radius: 8px;
    color: var(--text); font-size: 13px; outline: none; transition: border-color .15s;
  }
  #search:focus { border-color: var(--accent); }
  #search::placeholder { color: var(--text-muted); }

  .grid-wrap { flex: 1; overflow-y: auto; padding: 18px; }

  #grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
    gap: 10px;
  }

  /* ── Cards ── */
  .card {
    background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius);
    padding: 14px 10px 10px;
    display: flex; flex-direction: column; align-items: center; gap: 10px;
    cursor: pointer; transition: border-color .15s, background .15s, transform .1s;
    user-select: none;
  }
  .card:hover { border-color: var(--accent); background: var(--surface2); transform: translateY(-1px); }
  .card:active { transform: translateY(0); }

  .card-svg {
    display: flex; align-items: center; justify-content: center;
    width: var(--icon-size); height: var(--icon-size);
    color: var(--icon-color); transition: width .15s, height .15s;
  }
  .card-svg svg { width: 100%; height: 100%; }

  .card-name {
    font-size: 10px; color: var(--text-muted); text-align: center;
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap; width: 100%;
    font-family: var(--mono);
  }

  .empty { grid-column: 1/-1; text-align: center; padding: 80px 0; color: var(--text-muted); }

  /* ── Bottom panel ── */
  #bottom-panel {
    height: 240px; flex-shrink: 0; display: flex;
    border-top: 1px solid var(--border); background: var(--surface);
    animation: slideUpPanel .15s ease-out;
  }
  @keyframes slideUpPanel { from { height: 0; opacity: 0; } to { height: 240px; opacity: 1; } }

  .bp-left {
    width: 170px; flex-shrink: 0;
    display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px;
    padding: 14px 10px; border-right: 1px solid var(--border); background: var(--surface2);
  }
  .bp-svg-wrap {
    width: 72px; height: 72px;
    display: flex; align-items: center; justify-content: center;
    color: var(--icon-color); transition: color .2s;
  }
  .bp-svg-wrap svg { width: 100%; height: 100%; }
  .bp-name { font-size: 11px; font-weight: 600; font-family: var(--mono); color: var(--accent); text-align: center; }
  .bp-meta { font-size: 10px; color: var(--text-muted); text-align: center; }

  /* Direction picker */
  .bp-dir-picker {
    display: grid; grid-template-columns: repeat(3, 26px); grid-template-rows: repeat(3, 26px);
    gap: 2px;
  }
  .bp-dir-btn {
    width: 26px; height: 26px; border: 1px solid var(--border); border-radius: 5px;
    background: var(--surface); color: var(--text-muted);
    font-size: 10px; cursor: pointer; transition: all .12s;
    display: flex; align-items: center; justify-content: center;
  }
  .bp-dir-btn:hover { border-color: var(--accent); color: var(--accent); }
  .bp-dir-btn.active { border-color: var(--accent); background: var(--accent-dim); color: var(--accent); }
  .bp-dir-btn.empty { border-style: dashed; opacity: .25; cursor: default; pointer-events: none; }

  .bp-right { flex: 1; display: flex; flex-direction: column; overflow: hidden; min-width: 0; }
  .bp-right-top {
    display: flex; align-items: stretch;
    border-bottom: 1px solid var(--border); flex-shrink: 0;
  }

  .close-btn {
    width: 28px; height: 28px; border: 1px solid var(--border); border-radius: 6px;
    background: var(--surface2); color: var(--text-muted); cursor: pointer;
    display: flex; align-items: center; justify-content: center; font-size: 14px;
    transition: all .15s; flex-shrink: 0;
  }
  .close-btn:hover { border-color: var(--accent); color: var(--text); }
  #close-btn { margin: auto 10px auto auto; }

  .tabs {
    display: flex; gap: 2px; padding: 10px 14px 0; flex: 1;
    flex-shrink: 0; flex-wrap: wrap;
  }
  .tab {
    padding: 5px 10px; border-radius: 6px 6px 0 0; font-size: 11px; font-weight: 500;
    cursor: pointer; color: var(--text-muted); border: 1px solid transparent;
    border-bottom: none; transition: all .15s; background: transparent;
  }
  .tab:hover { color: var(--text); background: var(--surface3); }
  .tab.active { color: var(--accent); background: var(--surface3); border-color: var(--border); }

  .tab-content { flex: 1; overflow-y: auto; padding: 14px; display: flex; flex-direction: column; gap: 10px; }

  .snippet-block { display: none; flex-direction: column; gap: 10px; }
  .snippet-block.active { display: flex; }

  .snippet-section { display: flex; flex-direction: column; gap: 5px; }
  .snippet-label { font-size: 10px; color: var(--text-muted); text-transform: uppercase; letter-spacing: .5px; }
  .snippet-code-wrap { position: relative; }
  pre.code {
    background: var(--surface3); border: 1px solid var(--border); border-radius: 8px;
    padding: 10px 38px 10px 12px;
    font-family: var(--mono); font-size: 11px; color: var(--text);
    overflow-x: auto; white-space: pre; line-height: 1.6; margin: 0;
  }
  .copy-btn {
    position: absolute; top: 6px; right: 6px;
    padding: 2px 7px; border-radius: 5px; font-size: 10px; font-weight: 500;
    border: 1px solid var(--border); background: var(--surface2); color: var(--text-muted);
    cursor: pointer; transition: all .15s;
  }
  .copy-btn:hover { border-color: var(--accent); color: var(--accent); }
  .copy-btn.copied { border-color: var(--success); color: var(--success); }
  .raw-svg-wrap { position: relative; }
  pre.raw-svg {
    background: var(--surface3); border: 1px solid var(--border); border-radius: 8px;
    padding: 10px 38px 10px 12px; font-family: var(--mono); font-size: 10px; color: var(--text-muted);
    overflow: auto; white-space: pre; line-height: 1.6; max-height: 260px; margin: 0;
  }

  ::-webkit-scrollbar { width: 5px; height: 5px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 99px; }
  ::-webkit-scrollbar-thumb:hover { background: var(--text-muted); }

  /* ── Import modal ── */
  .add-btn {
    margin-left: 10px; flex-shrink: 0;
    height: 32px; padding: 0 12px; border-radius: 8px;
    border: 1px solid var(--accent); background: var(--accent-dim);
    color: var(--accent); font-size: 13px; font-weight: 500; cursor: pointer;
    display: flex; align-items: center; justify-content: center; gap: 6px;
    transition: all .15s; white-space: nowrap;
  }
  .add-btn:hover { background: var(--accent); color: #0d0d0d; }

  #import-overlay {
    display: none; position: fixed; inset: 0; z-index: 200;
    background: rgba(0,0,0,.8); backdrop-filter: blur(6px);
    align-items: center; justify-content: center; padding: 24px;
  }
  #import-overlay.open { display: flex; }

  #import-modal {
    background: var(--surface); border: 1px solid var(--border); border-radius: 14px;
    width: 100%; max-width: 680px; max-height: 88vh;
    display: flex; flex-direction: column;
    box-shadow: 0 24px 64px rgba(0,0,0,.7);
  }

  .import-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 16px 20px; border-bottom: 1px solid var(--border); flex-shrink: 0;
  }
  .import-title { font-size: 15px; font-weight: 600; }

  .import-tabs {
    display: flex; gap: 2px; padding: 12px 16px 0;
    border-bottom: 1px solid var(--border); flex-shrink: 0;
  }
  .import-tab {
    padding: 6px 14px; border-radius: 6px 6px 0 0; font-size: 12px; font-weight: 500;
    cursor: pointer; color: var(--text-muted); border: 1px solid transparent;
    border-bottom: none; transition: all .15s; background: transparent;
  }
  .import-tab:hover { color: var(--text); background: var(--surface3); }
  .import-tab.active { color: var(--accent); background: var(--surface3); border-color: var(--border); }

  .import-body { flex: 1; display: flex; flex-direction: column; overflow: hidden; padding: 16px; gap: 12px; }

  .import-panel { display: none; flex-direction: column; gap: 10px; flex: 1; overflow: hidden; }
  .import-panel.active { display: flex; }

  /* Library panel */
  .lib-toggle { display: flex; gap: 6px; }
  .lib-btn {
    flex: 1; padding: 6px 0; font-size: 12px; font-weight: 500; border-radius: 7px;
    border: 1px solid var(--border); background: var(--surface2); color: var(--text-muted);
    cursor: pointer; transition: all .15s;
  }
  .lib-btn:hover { color: var(--text); }
  .lib-btn.active { border-color: var(--accent); color: var(--accent); background: var(--accent-dim); }

  .hero-opts { display: flex; gap: 8px; }
  .hero-opts select { flex: 1; }

  .import-search-wrap { position: relative; }
  .import-search-wrap svg { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: var(--text-muted); pointer-events: none; }
  .import-search {
    width: 100%; padding: 8px 12px 8px 34px;
    background: var(--surface2); border: 1px solid var(--border); border-radius: 8px;
    color: var(--text); font-size: 13px; outline: none; transition: border-color .15s;
  }
  .import-search:focus { border-color: var(--accent); }
  .import-search::placeholder { color: var(--text-muted); }

  .lib-grid {
    display: grid; grid-template-columns: repeat(auto-fill, minmax(72px, 1fr));
    gap: 6px; overflow-y: auto; flex: 1; padding-right: 2px;
  }
  .lib-card {
    background: var(--surface2); border: 1px solid var(--border); border-radius: 8px;
    padding: 10px 6px 7px; display: flex; flex-direction: column; align-items: center; gap: 6px;
    cursor: pointer; transition: all .12s; user-select: none;
  }
  .lib-card:hover { border-color: var(--accent); background: var(--surface3); }
  .lib-card.selected { border-color: var(--accent); background: var(--accent-dim); }
  .lib-card-svg { width: 28px; height: 28px; color: var(--text); display: flex; align-items: center; justify-content: center; }
  .lib-card-svg svg { width: 100%; height: 100%; }
  .lib-card-svg svg [stroke]:not([stroke="none"]) { stroke: currentColor; }
  .lib-card-svg svg [fill]:not([fill="none"]) { fill: currentColor; }
  .lib-card-name { font-size: 9px; color: var(--text-muted); text-align: center; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; width: 100%; font-family: var(--mono); }
  .lib-card.selected .lib-card-name { color: var(--accent); }
  .lib-card.selected .lib-card-svg { color: var(--accent); }

  .lib-loading { grid-column: 1/-1; text-align: center; padding: 32px 0; color: var(--text-muted); font-size: 12px; }

  /* Paste / URL panels */
  .import-textarea {
    width: 100%; flex: 1; min-height: 140px; padding: 10px 12px;
    background: var(--surface2); border: 1px solid var(--border); border-radius: 8px;
    color: var(--text); font-family: var(--mono); font-size: 11px; resize: vertical; outline: none;
    transition: border-color .15s;
  }
  .import-textarea:focus { border-color: var(--accent); }
  .import-textarea::placeholder { color: var(--text-muted); }

  .import-input {
    width: 100%; height: 36px; padding: 0 12px; box-sizing: border-box;
    background: var(--surface2); border: 1px solid var(--border); border-radius: 8px;
    color: var(--text); font-size: 13px; outline: none; transition: border-color .15s;
  }
  .import-input:focus { border-color: var(--accent); }
  .import-input::placeholder { color: var(--text-muted); }

  /* Footer */
  .import-footer {
    padding: 12px 16px; border-top: 1px solid var(--border);
    display: flex; align-items: flex-end; gap: 10px; flex-shrink: 0;
  }
  .import-name { flex: 1; }
  .import-name label { font-size: 10px; color: var(--text-muted); text-transform: uppercase; letter-spacing: .5px; display: block; margin-bottom: 5px; }
  .import-bulk-label { flex: 1; display: flex; align-items: center; justify-content: flex-start; height: 36px; }

  .import-btn {
    height: 36px; padding: 0 20px; border-radius: 8px; font-size: 13px; font-weight: 600;
    border: none; background: var(--accent); color: #0d0d0d; cursor: pointer;
    transition: opacity .15s; white-space: nowrap; flex-shrink: 0;
  }
  .import-btn:hover { opacity: .85; }
  .import-btn:disabled { opacity: .4; cursor: not-allowed; }

  .dir-toggle-btn {
    height: 36px; padding: 0 14px; border-radius: 8px; font-size: 12px; font-weight: 500;
    border: 1px solid var(--border); background: var(--surface2); color: var(--text-muted);
    cursor: pointer; transition: all .15s; white-space: nowrap; flex-shrink: 0;
  }
  .dir-toggle-btn:hover { border-color: var(--accent); color: var(--accent); }
  .dir-toggle-btn.active { border-color: var(--accent); color: var(--accent); background: var(--accent-dim); }

  /* Directive panel */
  #directive-panel {
    border-top: 1px solid var(--border); padding: 14px 16px;
    display: flex; flex-direction: column; align-items: center; gap: 12px;
    background: var(--surface2); flex-shrink: 0;
  }
  .directive-hint { font-size: 11px; color: var(--text-muted); text-align: center; }
  .directive-hint strong { color: var(--accent); font-weight: 600; }
  .d-compass {
    display: grid;
    grid-template-columns: 68px 44px 68px;
    grid-template-rows: 68px 44px 68px;
    gap: 4px; align-items: center; justify-items: center;
  }
  .d-slot {
    width: 68px; height: 68px;
    border: 1.5px dashed var(--border); border-radius: 10px;
    display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px;
    cursor: pointer; transition: all .15s; position: relative;
    background: var(--surface); font-size: 10px; color: var(--text-muted);
    user-select: none;
  }
  .d-slot:hover { border-color: var(--accent); color: var(--accent); }
  .d-slot.active-slot { border-style: solid; border-color: var(--accent); box-shadow: 0 0 0 2px var(--accent-dim); color: var(--accent); animation: pulse-slot .9s ease-in-out infinite alternate; }
  @keyframes pulse-slot { from { box-shadow: 0 0 0 2px var(--accent-dim); } to { box-shadow: 0 0 0 4px var(--accent-dim); } }
  .d-slot.filled { border-style: solid; border-color: var(--border); }
  .d-slot.filled:hover { border-color: var(--accent); }
  .d-slot-preview { width: 26px; height: 26px; display: flex; align-items: center; justify-content: center; }
  .d-slot-preview svg { width: 100%; height: 100%; }
  .d-slot-preview svg [stroke]:not([stroke="none"]) { stroke: currentColor; }
  .d-slot-preview svg [fill]:not([fill="none"]) { fill: currentColor; }
  .d-slot.filled .d-slot-preview { color: var(--accent); }
  .d-slot-dir { font-size: 9px; font-family: var(--mono); letter-spacing: .3px; }
  .d-slot-clear {
    position: absolute; top: 3px; right: 3px; width: 15px; height: 15px;
    border-radius: 50%; background: var(--surface3); border: none; cursor: pointer;
    display: flex; align-items: center; justify-content: center; font-size: 9px; color: var(--text-muted);
    line-height: 1; transition: all .12s;
  }
  .d-slot-clear:hover { background: #ff4444; color: #fff; }
  .d-diag { opacity: .7; }
  .d-diag:hover, .d-diag.filled, .d-diag.active-slot { opacity: 1; }
  .d-center {
    width: 44px; height: 44px; border-radius: 50%;
    border: 1px solid var(--border); background: var(--surface);
    display: flex; align-items: center; justify-content: center;
    color: var(--text-muted); font-size: 14px; pointer-events: none;
  }

  .import-status { font-size: 11px; padding: 6px 10px; border-radius: 6px; }
  .import-status.ok { color: var(--accent); background: var(--accent-dim); }
  .import-status.err { color: #f87171; background: #f8717118; }

  /* ── Card selection ── */
  .card { position: relative; }
  .card.selected { border-color: var(--accent); background: var(--accent-dim); }
  .card-check {
    position: absolute; top: 6px; left: 6px;
    width: 16px; height: 16px; border-radius: 50%;
    border: 1.5px solid var(--border); background: var(--surface2);
    display: flex; align-items: center; justify-content: center;
    font-size: 9px; color: transparent; transition: all .12s;
    cursor: pointer; z-index: 1;
  }
  .card:hover .card-check { border-color: var(--accent); }
  .card.selected .card-check { background: var(--accent); border-color: var(--accent); color: #0d0d0d; }

  /* ── Select action bar ── */
  #select-bar {
    position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%);
    background: var(--surface); border: 1px solid var(--accent); border-radius: 10px;
    padding: 8px 14px; display: flex; align-items: center; gap: 10px;
    box-shadow: 0 8px 32px rgba(0,0,0,.6); z-index: 100; white-space: nowrap;
    animation: slideUp .15s ease-out;
  }
  @keyframes slideUp { from { opacity: 0; transform: translateX(-50%) translateY(8px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
  #select-count { font-size: 12px; color: var(--text-muted); }
  .select-bar-btn {
    height: 28px; padding: 0 12px; border-radius: 6px; font-size: 12px; font-weight: 500;
    cursor: pointer; transition: all .12s; border: 1px solid var(--border);
    background: var(--surface2); color: var(--text-muted);
  }
  .select-bar-btn:hover { color: var(--text); border-color: var(--text-muted); }
  .select-bar-btn.danger { border-color: #f87171; color: #f87171; background: #f8717110; }
  .select-bar-btn.danger:hover { background: #f87171; color: #0d0d0d; }

  /* ── Context menu ── */
  #ctx-menu {
    position: fixed; z-index: 300; min-width: 140px;
    background: var(--surface); border: 1px solid var(--border); border-radius: 8px;
    box-shadow: 0 8px 32px rgba(0,0,0,.6); padding: 4px; overflow: hidden;
  }
  .ctx-item {
    display: block; width: 100%; text-align: left;
    padding: 7px 12px; border: none; background: none;
    color: var(--text); font-size: 12px; cursor: pointer; border-radius: 5px;
    transition: background .1s;
  }
  .ctx-item:hover { background: var(--surface2); }
  .ctx-item.danger { color: #f87171; }
  .ctx-item.danger:hover { background: #f8717118; }

  /* ── Rename modal ── */
  #rename-overlay {
    display: none; position: fixed; inset: 0; z-index: 400;
    background: rgba(0,0,0,.6); backdrop-filter: blur(4px);
    align-items: center; justify-content: center; padding: 24px;
  }
  #rename-overlay.open { display: flex; }
  #rename-modal {
    background: var(--surface); border: 1px solid var(--border); border-radius: 12px;
    width: 100%; max-width: 360px; padding: 20px;
    box-shadow: 0 24px 64px rgba(0,0,0,.7); display: flex; flex-direction: column; gap: 14px;
  }
  .rename-title { font-size: 14px; font-weight: 600; }
  .rename-input {
    width: 100%; height: 36px; padding: 0 12px; box-sizing: border-box;
    background: var(--surface2); border: 1px solid var(--border); border-radius: 8px;
    color: var(--text); font-size: 13px; outline: none; transition: border-color .15s;
  }
  .rename-input:focus { border-color: var(--accent); }
  .rename-footer { display: flex; justify-content: flex-end; gap: 8px; }
  .rename-cancel {
    height: 32px; padding: 0 14px; border-radius: 7px; font-size: 12px;
    border: 1px solid var(--border); background: var(--surface2); color: var(--text-muted); cursor: pointer;
  }
  .rename-confirm {
    height: 32px; padding: 0 14px; border-radius: 7px; font-size: 12px; font-weight: 600;
    border: none; background: var(--accent); color: #0d0d0d; cursor: pointer;
  }
</style>
</head>
<body>

<div class="layout">
  <!-- ── Sidebar ── -->
  <aside>
    <div class="sidebar-logo">
      <span>🎨</span>
      <span>mkicon studio</span>
      <span class="sidebar-badge">local</span>
    </div>

    <div class="sidebar-section">
      <div class="sidebar-label">Preview Size</div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
        <span style="font-size:11px;color:var(--text-muted);">Size</span>
        <span class="size-value" id="size-value">48px</span>
      </div>
      <div class="size-row">
        <input type="range" id="size-slider" min="16" max="48" step="4" value="48">
      </div>
      <div class="size-ticks">
        <span>16</span><span>24</span><span>32</span><span>40</span><span>48</span>
      </div>
    </div>

    <div class="sidebar-section">
      <div class="sidebar-label">Style</div>
      <div class="style-btns">
        <button class="style-btn active" data-style="auto">Auto</button>
        <button class="style-btn" data-style="filled">Filled</button>
        <button class="style-btn" data-style="outline">Outline</button>
      </div>
    </div>

    <div class="sidebar-section">
      <div class="sidebar-label">Color</div>
      <div class="color-swatches" id="color-swatches"></div>
    </div>

    <div class="sidebar-section">
      <div class="sidebar-label">Library</div>
      <select id="library-filter">
        <option value="">All libraries</option>
      </select>
    </div>

    <div class="sidebar-footer" id="count"></div>
  </aside>

  <!-- ── Main ── -->
  <div class="main">
    <div class="topbar">
      <div class="search-wrap">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
        <input id="search" type="text" placeholder="Search icons…" autocomplete="off" spellcheck="false">
      </div>
      <button class="add-btn" id="add-btn" title="Add icon">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>
        New icon
      </button>
    </div>
    <div class="grid-wrap">
      <div id="grid"></div>
    </div>

    <!-- ── Bottom panel ── -->
    <div id="bottom-panel" style="display:none">
      <div class="bp-left">
        <div class="bp-svg-wrap" id="bp-svg"></div>
        <div class="bp-dir-picker" id="bp-dir-picker" style="display:none"></div>
        <div class="bp-name" id="bp-name"></div>
        <div class="bp-meta" id="bp-meta"></div>
      </div>
      <div class="bp-right">
        <div class="bp-right-top">
          <div class="tabs" id="tabs"></div>
          <button class="close-btn" id="close-btn">✕</button>
        </div>
        <div class="tab-content" id="tab-content"></div>
      </div>
    </div>
  </div>
</div>

<!-- ── Import modal ── -->
<div id="import-overlay">
  <div id="import-modal">
    <div class="import-header">
      <span class="import-title">Add icon</span>
      <button class="close-btn" id="import-close">✕</button>
    </div>

    <div class="import-tabs">
      <button class="import-tab active" data-itab="library">Library</button>
      <button class="import-tab" data-itab="paste">Paste SVG</button>
      <button class="import-tab" data-itab="url">From URL</button>
    </div>

    <div class="import-body">
      <!-- Library panel -->
      <div class="import-panel active" id="ipanel-library">
        <div class="lib-toggle">
          <button class="lib-btn active" data-lib="lucide">Lucide Icons</button>
          <button class="lib-btn" data-lib="heroicons">Heroicons</button>
          <button class="lib-btn" data-lib="tabler">Tabler Icons</button>
        </div>
        <div class="hero-opts" id="hero-opts" style="display:none">
          <select id="hero-size">
            <option value="16">16px — micro</option>
            <option value="20">20px — mini</option>
            <option value="24" selected>24px — standard</option>
          </select>
          <select id="hero-style">
            <option value="outline">Outline</option>
            <option value="solid">Solid</option>
          </select>
        </div>
        <div class="hero-opts" id="tabler-opts" style="display:none">
          <select id="tabler-style">
            <option value="outline">Outline</option>
            <option value="filled">Filled</option>
          </select>
          <select id="tabler-stroke">
            <option value="1">Stroke 1</option>
            <option value="1.25">Stroke 1.25</option>
            <option value="1.5">Stroke 1.5</option>
            <option value="1.75">Stroke 1.75</option>
            <option value="2" selected>Stroke 2 (default)</option>
          </select>
        </div>
        <div class="import-search-wrap">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input class="import-search" id="lib-search" type="text" placeholder="Search icons…" autocomplete="off" spellcheck="false">
        </div>
        <div class="lib-grid" id="lib-grid">
          <div class="lib-loading">Type to search or scroll to browse</div>
        </div>
      </div>

      <!-- Paste panel -->
      <div class="import-panel" id="ipanel-paste">
        <textarea class="import-textarea" id="paste-input" placeholder="<svg xmlns=&quot;http://www.w3.org/2000/svg&quot; viewBox=&quot;0 0 24 24&quot;>&#10;  ...&#10;</svg>"></textarea>
      </div>

      <!-- URL panel -->
      <div class="import-panel" id="ipanel-url">
        <input class="import-input" id="url-input" type="text" placeholder="https://example.com/icon.svg">
      </div>
    </div>

    <!-- Directive panel (hidden by default) -->
    <div id="directive-panel" style="display:none">
      <div class="directive-hint" id="directive-hint">Click a slot, then pick an icon from the library above</div>
      <div class="d-compass">
        <div class="d-slot d-diag" data-dir="nw" id="dslot-nw"><div class="d-slot-preview"></div><span class="d-slot-dir">↖ nw</span></div>
        <div class="d-slot" data-dir="n"  id="dslot-n" ><div class="d-slot-preview"></div><span class="d-slot-dir">↑ n</span></div>
        <div class="d-slot d-diag" data-dir="ne" id="dslot-ne"><div class="d-slot-preview"></div><span class="d-slot-dir">↗ ne</span></div>
        <div class="d-slot" data-dir="w"  id="dslot-w" ><div class="d-slot-preview"></div><span class="d-slot-dir">← w</span></div>
        <div class="d-center">✛</div>
        <div class="d-slot" data-dir="e"  id="dslot-e" ><div class="d-slot-preview"></div><span class="d-slot-dir">e →</span></div>
        <div class="d-slot d-diag" data-dir="sw" id="dslot-sw"><div class="d-slot-preview"></div><span class="d-slot-dir">↙ sw</span></div>
        <div class="d-slot" data-dir="s"  id="dslot-s" ><div class="d-slot-preview"></div><span class="d-slot-dir">↓ s</span></div>
        <div class="d-slot d-diag" data-dir="se" id="dslot-se"><div class="d-slot-preview"></div><span class="d-slot-dir">↘ se</span></div>
      </div>
    </div>

    <div class="import-footer">
      <span class="import-status" id="import-status" style="display:none;margin-right:auto"></span>
      <div class="import-name" id="import-name-wrap">
        <label>Component name</label>
        <input class="import-input" id="import-name" type="text" placeholder="ArrowRight">
      </div>
      <div class="import-bulk-label" id="import-bulk-label" style="display:none;font-size:12px;color:var(--text-muted)"></div>
      <button class="dir-toggle-btn" id="dir-toggle-btn" style="display:none">Directives</button>
      <button class="import-btn" id="import-btn">Import</button>
    </div>
  </div>
</div>

<!-- ── Context menu ── -->
<div id="ctx-menu" style="display:none">
  <button class="ctx-item" id="ctx-rename">Rename</button>
  <button class="ctx-item danger" id="ctx-delete">Delete</button>
</div>

<!-- ── Select action bar ── -->
<div id="select-bar" style="display:none">
  <span id="select-count"></span>
  <button class="select-bar-btn danger" id="select-delete-btn">Delete</button>
  <button class="select-bar-btn" id="select-clear-btn">Clear selection</button>
</div>

<!-- ── Rename modal ── -->
<div id="rename-overlay">
  <div id="rename-modal">
    <div class="rename-title">Rename icon</div>
    <input class="rename-input" id="rename-input" type="text" autocomplete="off" spellcheck="false">
    <div class="rename-footer">
      <button class="rename-cancel" id="rename-cancel">Cancel</button>
      <button class="rename-confirm" id="rename-confirm">Rename</button>
    </div>
  </div>
</div>

<script>
(function () {
  const CONFIG = ${configData};
  const ICONS_PATH = CONFIG.iconsPath;
  const ACTIVE_FRAMEWORKS = CONFIG.activeFrameworks;

  const FRAMEWORK_LABELS = {
    react: 'React', 'react-native': 'React Native',
    vue: 'Vue', svelte: 'Svelte', angular: 'Angular', webcomponents: 'Web Components',
  };

  const COLORS = [
    { hex: '#e4e4e7', label: 'White' },
    { hex: '#a1a1aa', label: 'Gray' },
    { hex: '#60a5fa', label: 'Blue' },
    { hex: '#a78bfa', label: 'Purple' },
    { hex: '#34d399', label: 'Green' },
    { hex: '#f87171', label: 'Red' },
    { hex: '#fbbf24', label: 'Amber' },
    { hex: '#1a1a1a', label: 'Black' },
  ];

  const STORAGE_KEY = 'mkicon-studio-prefs';

  // ── Prefs ─────────────────────────────────────────────────────────────────
  function loadPrefs() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { return {}; }
  }
  function savePrefs(patch) {
    const prefs = { ...loadPrefs(), ...patch };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    return prefs;
  }

  // ── State ─────────────────────────────────────────────────────────────────
  let allIcons = [];
  let searchQuery = '';
  let libraryFilter = '';

  // Restore prefs
  const prefs = loadPrefs();
  const initSize = prefs.size ?? 48;
  const initStyle = prefs.style ?? 'auto';
  const initColor = prefs.color ?? '#e4e4e7';
  const initLibrary = prefs.library ?? '';

  // ── Apply CSS vars ─────────────────────────────────────────────────────────
  function applySize(px) {
    document.documentElement.style.setProperty('--icon-size', px + 'px');
    document.getElementById('size-value').textContent = px + 'px';
    document.getElementById('size-slider').value = px;
  }

  // Detect whether an SVG is inherently filled or outline based on its markup.
  // Returns 'filled', 'outline', or 'unknown'.
  function detectStyle(svgContent) {
    if (!svgContent) return 'unknown';
    // Outline: root <svg> has fill="none" AND stroke attributes present
    const rootFillNone = /<svg[^>]*fill="none"[^>]*>/.test(svgContent);
    const hasStroke = /stroke="(?!none)[^"]*"/.test(svgContent);
    if (rootFillNone && hasStroke) return 'outline';
    // Filled: root <svg> has fill="currentColor" or paths have fill without stroke
    const rootFillCurrent = /<svg[^>]*fill="currentColor"[^>]*>/.test(svgContent);
    const hasExplicitFill = /fill="(?!none)[^"]*"/.test(svgContent);
    if (rootFillCurrent && !hasStroke) return 'filled';
    if (hasExplicitFill && !hasStroke && !rootFillNone) return 'filled';
    return 'unknown';
  }

  function applyStyle(s) {
    document.querySelectorAll('.style-btn').forEach(b => b.classList.toggle('active', b.dataset.style === s));
    renderGrid();
  }

  function applyColor(hex) {
    document.documentElement.style.setProperty('--icon-color', hex);
    document.querySelectorAll('.swatch').forEach(s => s.classList.toggle('active', s.dataset.hex === hex));
  }

  // ── Init controls ──────────────────────────────────────────────────────────
  // Size slider
  const slider = document.getElementById('size-slider');
  slider.addEventListener('input', () => {
    applySize(+slider.value);
    savePrefs({ size: +slider.value });
  });
  applySize(initSize);

  // Style buttons
  document.querySelectorAll('.style-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      savePrefs({ style: btn.dataset.style });
      applyStyle(btn.dataset.style);
    });
  });
  applyStyle(initStyle);

  // Color swatches
  const swatchContainer = document.getElementById('color-swatches');
  COLORS.forEach(c => {
    const el = document.createElement('div');
    el.className = 'swatch';
    el.style.background = c.hex;
    el.title = c.label;
    el.dataset.hex = c.hex;
    el.addEventListener('click', () => { applyColor(c.hex); savePrefs({ color: c.hex }); });
    swatchContainer.appendChild(el);
  });
  applyColor(initColor);

  // Library filter
  const librarySelect = document.getElementById('library-filter');
  librarySelect.addEventListener('change', () => {
    libraryFilter = librarySelect.value;
    savePrefs({ library: libraryFilter });
    renderGrid();
  });

  // Search
  document.getElementById('search').addEventListener('input', e => {
    searchQuery = e.target.value.toLowerCase();
    renderGrid();
  });

  // ── Fetch icons ────────────────────────────────────────────────────────────
  fetch('/api/icons')
    .then(r => r.json())
    .then(data => {
      allIcons = Object.entries(data).map(([filename, icon]) => ({
        ...icon, filename,
        detectedStyle: detectStyle(icon.svgContent),
      }));

      // Populate library filter
      const libs = [...new Set(allIcons.map(i => i.library).filter(Boolean))];
      libs.forEach(lib => {
        const opt = document.createElement('option');
        opt.value = lib; opt.textContent = lib;
        if (lib === initLibrary) opt.selected = true;
        librarySelect.appendChild(opt);
      });
      libraryFilter = initLibrary;
      librarySelect.value = initLibrary;

      renderGrid();
    })
    .catch(() => {
      document.getElementById('grid').innerHTML = '<div class="empty">Failed to load icons.</div>';
    });

  // ── Helpers ────────────────────────────────────────────────────────────────
  function escapeHTML(s) {
    return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
  function copyText(text, btn) {
    navigator.clipboard.writeText(text).then(() => {
      btn.textContent = 'Copied!'; btn.classList.add('copied');
      setTimeout(() => { btn.textContent = 'Copy'; btn.classList.remove('copied'); }, 1800);
    });
  }
  function toKebab(name) {
    return name.replace(/([A-Z])/g, (c, _, i) => i === 0 ? c.toLowerCase() : '-' + c.toLowerCase());
  }
  function getSnippets(name, direction) {
    const p = ICONS_PATH, kn = toKebab(name);
    const dir = direction ? \` direction="\${direction}"\` : '';
    const dirVue = direction ? \` direction="\${direction}"\` : '';
    return {
      react: \`import { \${name} } from '\${p}';\n\n<\${name}\${dir} size={24} />\`,
      'react-native': \`import { \${name} } from '\${p}';\n\n<\${name}\${dir} size={24} />\`,
      vue: \`import \${name} from '\${p}/\${name}.vue';\n\n<\${name}\${dirVue} :size="24" />\`,
      svelte: \`import \${name} from '\${p}/\${name}.svelte';\n\n<\${name}\${dir} size={24} />\`,
      angular: \`import { \${name}Component } from '\${p}/\${name}.component';\n\n<app-\${kn}\${dir} [size]="24"></app-\${kn}>\`,
      webcomponents: \`import '\${p}/\${name}';\n\n<\${kn}\${dir} size="24"></\${kn}>\`,
    };
  }

  // ── Grid ──────────────────────────────────────────────────────────────────
  function renderGrid() {
    const grid = document.getElementById('grid');
    const countEl = document.getElementById('count');

    const styleFilter = loadPrefs().style ?? 'auto';
    const filtered = allIcons.filter(icon => {
      if (searchQuery && !icon.componentName.toLowerCase().includes(searchQuery)) return false;
      if (libraryFilter && icon.library !== libraryFilter) return false;
      if (styleFilter !== 'auto' && icon.detectedStyle !== 'unknown' && icon.detectedStyle !== styleFilter) return false;
      return true;
    });

    countEl.textContent = filtered.length + ' icon' + (filtered.length !== 1 ? 's' : '');

    if (filtered.length === 0) {
      grid.innerHTML = '<div class="empty">No icons found.</div>';
      return;
    }

    grid.innerHTML = '';
    filtered.forEach(icon => {
      const card = document.createElement('div');
      card.className = 'card' + (selectedFilenames.has(icon.filename) ? ' selected' : '');
      card.title = icon.componentName;
      card.dataset.filename = icon.filename;

      const check = document.createElement('div');
      check.className = 'card-check';
      check.textContent = '✓';
      check.addEventListener('click', e => { e.stopPropagation(); toggleSelectIcon(icon.filename, card); });

      const svgWrap = document.createElement('div');
      svgWrap.className = 'card-svg';
      svgWrap.innerHTML = icon.svgContent || '';

      const name = document.createElement('div');
      name.className = 'card-name';
      name.textContent = icon.componentName;

      card.appendChild(check);
      card.appendChild(svgWrap);
      card.appendChild(name);

      card.addEventListener('click', e => {
        if (e.ctrlKey || e.metaKey) {
          toggleSelectIcon(icon.filename, card);
        } else {
          openModal(icon);
        }
      });
      card.addEventListener('contextmenu', e => { e.preventDefault(); openCtxMenu(e, icon); });
      grid.appendChild(card);
    });
  }

  // ── Bottom panel ──────────────────────────────────────────────────────────
  const bottomPanel = document.getElementById('bottom-panel');
  let bpCurrentDir = null; // currently selected direction for directive icons
  let bpCurrentIcon = null;

  document.getElementById('close-btn').addEventListener('click', () => {
    bottomPanel.style.display = 'none';
    bpCurrentIcon = null; bpCurrentDir = null;
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && bottomPanel.style.display !== 'none') bottomPanel.style.display = 'none'; });

  function openModal(icon) {
    bpCurrentIcon = icon;
    bpCurrentDir = icon.directions?.[0] ?? null;

    // SVG preview
    const svgEl = document.getElementById('bp-svg');
    if (bpCurrentDir && icon.variantSvgs?.[bpCurrentDir]) {
      svgEl.innerHTML = icon.variantSvgs[bpCurrentDir];
    } else {
      svgEl.innerHTML = icon.svgContent || '';
    }

    document.getElementById('bp-name').textContent = icon.componentName;

    const parts = [];
    if (icon.library) parts.push(icon.library + (icon.libraryIconName ? ' · ' + icon.libraryIconName : ''));
    if (icon.iconSize) parts.push(icon.iconSize + 'px');
    if (icon.generatedAt) parts.push(new Date(icon.generatedAt).toLocaleDateString());
    document.getElementById('bp-meta').textContent = parts.join('  ·  ');

    buildDirPicker(icon);
    buildTabs(icon, bpCurrentDir);
    bottomPanel.style.display = '';
  }

  // Direction arrow symbols for compass grid positions
  const DIR_ARROWS = { 'up-left': '↖', up: '↑', 'up-right': '↗', left: '←', right: '→', 'down-left': '↙', down: '↓', 'down-right': '↘' };
  const DIR_GRID_POS = { 'up-left': [1,1], up: [1,2], 'up-right': [1,3], left: [2,1], right: [2,3], 'down-left': [3,1], down: [3,2], 'down-right': [3,3] };

  function buildDirPicker(icon) {
    const picker = document.getElementById('bp-dir-picker');
    if (!icon.directions?.length || !icon.variantSvgs) { picker.style.display = 'none'; return; }
    picker.style.display = '';
    picker.innerHTML = '';
    // Build 3×3 grid (9 cells)
    for (let r = 1; r <= 3; r++) {
      for (let c = 1; c <= 3; c++) {
        if (r === 2 && c === 2) { const center = document.createElement('div'); picker.appendChild(center); continue; }
        const dir = Object.keys(DIR_GRID_POS).find(d => DIR_GRID_POS[d][0] === r && DIR_GRID_POS[d][1] === c);
        const btn = document.createElement('button');
        const hasSvg = dir && icon.variantSvgs[dir];
        btn.className = 'bp-dir-btn' + (!hasSvg ? ' empty' : '') + (dir === bpCurrentDir ? ' active' : '');
        btn.textContent = dir ? (DIR_ARROWS[dir] || dir) : '';
        btn.title = dir || '';
        if (hasSvg) btn.addEventListener('click', () => selectDir(icon, dir));
        picker.appendChild(btn);
      }
    }
  }

  function selectDir(icon, dir) {
    bpCurrentDir = dir;
    document.getElementById('bp-svg').innerHTML = icon.variantSvgs[dir] || icon.svgContent || '';
    document.querySelectorAll('.bp-dir-btn').forEach(b => b.classList.toggle('active', b.title === dir));
    buildTabs(icon, dir);
  }

  function buildTabs(icon, activeDir) {
    const tabsEl = document.getElementById('tabs');
    const contentEl = document.getElementById('tab-content');
    const svgForDir = activeDir && icon.variantSvgs?.[activeDir] ? icon.variantSvgs[activeDir] : icon.svgContent || '';
    const snips = getSnippets(icon.componentName, activeDir);

    tabsEl.innerHTML = '';
    contentEl.innerHTML = '';

    ACTIVE_FRAMEWORKS.forEach((fw, i) => {
      const tab = document.createElement('button');
      tab.className = 'tab' + (i === 0 ? ' active' : '');
      tab.textContent = FRAMEWORK_LABELS[fw] || fw;
      tab.dataset.tab = fw;
      tab.addEventListener('click', () => switchTab(fw));
      tabsEl.appendChild(tab);

      const block = document.createElement('div');
      block.className = 'snippet-block' + (i === 0 ? ' active' : '');
      block.dataset.block = fw;
      const code = snips[fw] || '';
      block.innerHTML = \`<div class="snippet-section"><div class="snippet-label">Import &amp; Usage</div><div class="snippet-code-wrap"><pre class="code">\${escapeHTML(code)}</pre><button class="copy-btn">Copy</button></div></div>\`;
      block.querySelector('.copy-btn').addEventListener('click', e => copyText(code, e.target));
      contentEl.appendChild(block);
    });

    const svgTab = document.createElement('button');
    svgTab.className = 'tab'; svgTab.textContent = 'SVG'; svgTab.dataset.tab = '__svg__';
    svgTab.addEventListener('click', () => switchTab('__svg__'));
    tabsEl.appendChild(svgTab);

    const svgBlock = document.createElement('div');
    svgBlock.className = 'snippet-block'; svgBlock.dataset.block = '__svg__';
    svgBlock.innerHTML = \`<div class="snippet-section"><div class="snippet-label">Raw SVG</div><div class="raw-svg-wrap"><pre class="raw-svg">\${escapeHTML(svgForDir)}</pre><button class="copy-btn">Copy</button></div></div>\`;
    svgBlock.querySelector('.copy-btn').addEventListener('click', e => copyText(svgForDir, e.target));
    contentEl.appendChild(svgBlock);
  }

  function switchTab(id) {
    document.querySelectorAll('#tabs .tab').forEach(t => t.classList.toggle('active', t.dataset.tab === id));
    document.querySelectorAll('#tab-content .snippet-block').forEach(b => b.classList.toggle('active', b.dataset.block === id));
  }

  // ── Selection ─────────────────────────────────────────────────────────────
  let selectedFilenames = new Set();

  function toggleSelectIcon(filename, cardEl) {
    if (selectedFilenames.has(filename)) {
      selectedFilenames.delete(filename);
      cardEl?.classList.remove('selected');
    } else {
      selectedFilenames.add(filename);
      cardEl?.classList.add('selected');
    }
    updateSelectBar();
  }

  function clearSelection() {
    selectedFilenames.clear();
    document.querySelectorAll('.card.selected').forEach(c => c.classList.remove('selected'));
    updateSelectBar();
  }

  function updateSelectBar() {
    const bar = document.getElementById('select-bar');
    const n = selectedFilenames.size;
    if (n === 0) { bar.style.display = 'none'; return; }
    bar.style.display = '';
    document.getElementById('select-count').textContent = n + ' icon' + (n > 1 ? 's' : '') + ' selected';
  }

  document.getElementById('select-clear-btn').addEventListener('click', clearSelection);

  document.getElementById('select-delete-btn').addEventListener('click', async () => {
    const filenames = [...selectedFilenames];
    if (!filenames.length) return;
    if (!confirm(\`Delete \${filenames.length} icon\${filenames.length > 1 ? 's' : ''}?\`)) return;
    try {
      await fetch('/api/delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ filenames }) });
      allIcons = allIcons.filter(i => !selectedFilenames.has(i.filename));
      clearSelection();
      renderGrid();
    } catch (err) { alert('Delete failed: ' + err.message); }
  });

  // ── Context menu ──────────────────────────────────────────────────────────
  const ctxMenu = document.getElementById('ctx-menu');
  let ctxIcon = null;

  function openCtxMenu(e, icon) {
    ctxIcon = icon;
    ctxMenu.style.display = '';
    const x = Math.min(e.clientX, window.innerWidth - ctxMenu.offsetWidth - 8);
    const y = Math.min(e.clientY, window.innerHeight - ctxMenu.offsetHeight - 8);
    ctxMenu.style.left = x + 'px';
    ctxMenu.style.top = y + 'px';
    // Re-measure after display
    requestAnimationFrame(() => {
      const rect = ctxMenu.getBoundingClientRect();
      if (rect.right > window.innerWidth - 8) ctxMenu.style.left = (window.innerWidth - rect.width - 8) + 'px';
      if (rect.bottom > window.innerHeight - 8) ctxMenu.style.top = (window.innerHeight - rect.height - 8) + 'px';
    });
  }

  function closeCtxMenu() { ctxMenu.style.display = 'none'; ctxIcon = null; }

  document.addEventListener('click', () => closeCtxMenu());
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeCtxMenu(); });

  document.getElementById('ctx-delete').addEventListener('click', async () => {
    if (!ctxIcon) return;
    if (!confirm(\`Delete \${ctxIcon.componentName}?\`)) return;
    try {
      await fetch('/api/delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ filenames: [ctxIcon.filename] }) });
      allIcons = allIcons.filter(i => i.filename !== ctxIcon.filename);
      selectedFilenames.delete(ctxIcon.filename);
      updateSelectBar();
      renderGrid();
    } catch (err) { alert('Delete failed: ' + err.message); }
    closeCtxMenu();
  });

  document.getElementById('ctx-rename').addEventListener('click', () => {
    if (!ctxIcon) return;
    openRename(ctxIcon);
    closeCtxMenu();
  });

  // ── Rename modal ──────────────────────────────────────────────────────────
  const renameOverlay = document.getElementById('rename-overlay');
  let renameIcon = null;

  function openRename(icon) {
    renameIcon = icon;
    const input = document.getElementById('rename-input');
    input.value = icon.componentName;
    renameOverlay.classList.add('open');
    requestAnimationFrame(() => { input.select(); input.focus(); });
  }

  function closeRename() { renameOverlay.classList.remove('open'); renameIcon = null; }

  document.getElementById('rename-cancel').addEventListener('click', closeRename);
  renameOverlay.addEventListener('click', e => { if (e.target === renameOverlay) closeRename(); });
  document.getElementById('rename-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('rename-confirm').click();
    if (e.key === 'Escape') closeRename();
  });

  document.getElementById('rename-confirm').addEventListener('click', async () => {
    if (!renameIcon) return;
    const newName = document.getElementById('rename-input').value.trim();
    if (!newName || newName === renameIcon.componentName) { closeRename(); return; }
    const btn = document.getElementById('rename-confirm');
    btn.disabled = true; btn.textContent = 'Renaming…';
    try {
      const res = await fetch('/api/rename', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: renameIcon.filename, newName }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Rename failed');
      // Update in-memory list
      const idx = allIcons.findIndex(i => i.filename === renameIcon.filename);
      if (idx >= 0) { allIcons[idx] = { ...allIcons[idx], componentName: data.componentName, filename: data.newFilename }; }
      closeRename();
      renderGrid();
    } catch (err) { alert('Rename failed: ' + err.message); }
    finally { btn.disabled = false; btn.textContent = 'Rename'; }
  });

  // ── Import modal ──────────────────────────────────────────────────────────
  const importOverlay = document.getElementById('import-overlay');
  const importStatus = document.getElementById('import-status');

  // State
  let iTab = 'library';
  let iLib = 'lucide';
  let iLibCache = {};
  let iSelectedIcons = []; // [{ name }]
  let iLibLoading = false;
  let directivesOpen = false;
  let directiveSlots = { n: null, ne: null, e: null, se: null, s: null, sw: null, w: null, nw: null };
  let activeSlotDir = null; // which slot is awaiting icon assignment
  const DIR_SUFFIX = { n: 'North', ne: 'NorthEast', e: 'East', se: 'SouthEast', s: 'South', sw: 'SouthWest', w: 'West', nw: 'NorthWest' };

  const openImport = () => { importOverlay.classList.add('open'); loadLib(iLib); };
  const closeImport = () => {
    importOverlay.classList.remove('open');
    resetImportStatus();
    directivesOpen = false;
    activeSlotDir = null;
    directiveSlots = { n: null, ne: null, e: null, se: null, s: null, sw: null, w: null, nw: null };
    document.getElementById('directive-panel').style.display = 'none';
    document.getElementById('dir-toggle-btn').classList.remove('active');
    renderAllSlots();
  };

  document.getElementById('add-btn').addEventListener('click', openImport);
  document.getElementById('import-close').addEventListener('click', closeImport);
  importOverlay.addEventListener('click', e => { if (e.target === importOverlay) closeImport(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && importOverlay.classList.contains('open')) closeImport(); });

  // Tabs
  document.querySelectorAll('.import-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      iTab = btn.dataset.itab;
      document.querySelectorAll('.import-tab').forEach(b => b.classList.toggle('active', b.dataset.itab === iTab));
      document.querySelectorAll('.import-panel').forEach(p => p.classList.toggle('active', p.id === \`ipanel-\${iTab}\`));
      if (iTab === 'library') loadLib(iLib);
      updateLibFooter();
    });
  });

  // Library toggle
  document.querySelectorAll('.lib-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      iLib = btn.dataset.lib;
      document.querySelectorAll('.lib-btn').forEach(b => b.classList.toggle('active', b.dataset.lib === iLib));
      document.getElementById('hero-opts').style.display = iLib === 'heroicons' ? 'flex' : 'none';
      document.getElementById('tabler-opts').style.display = iLib === 'tabler' ? 'flex' : 'none';
      iSelectedIcons = [];
      document.getElementById('import-name').value = '';
      updateLibFooter();
      loadLib(iLib);
    });
  });

  // Heroicons size/style → re-render grid with correct SVGs
  document.getElementById('hero-size').addEventListener('change', function() {
    const styleEl = document.getElementById('hero-style');
    if (this.value !== '24') { styleEl.value = 'solid'; styleEl.disabled = true; }
    else { styleEl.disabled = false; }
    iSelectedIcons = [];
    updateLibFooter();
    if (iLibCache[iLib]) renderLibGrid(iLibCache[iLib], document.getElementById('lib-search').value);
  });
  document.getElementById('hero-style').addEventListener('change', function() {
    iSelectedIcons = [];
    updateLibFooter();
    if (iLibCache[iLib]) renderLibGrid(iLibCache[iLib], document.getElementById('lib-search').value);
  });
  document.getElementById('tabler-style').addEventListener('change', function() {
    iSelectedIcons = [];
    updateLibFooter();
    if (iLibCache[iLib]) renderLibGrid(iLibCache[iLib], document.getElementById('lib-search').value);
  });
  document.getElementById('tabler-stroke').addEventListener('change', function() {
    iSelectedIcons = [];
    updateLibFooter();
    if (iLibCache[iLib]) renderLibGrid(iLibCache[iLib], document.getElementById('lib-search').value);
  });

  // Load library icon list
  async function loadLib(lib) {
    if (iLibCache[lib]) { renderLibGrid(iLibCache[lib], document.getElementById('lib-search').value); return; }
    if (iLibLoading) return;
    iLibLoading = true;
    document.getElementById('lib-grid').innerHTML = '<div class="lib-loading">Loading icons…</div>';
    try {
      const data = await fetch(\`/api/library?lib=\${lib}\`).then(r => r.json());
      iLibCache[lib] = data;
      renderLibGrid(data, document.getElementById('lib-search').value);
    } catch {
      document.getElementById('lib-grid').innerHTML = '<div class="lib-loading">Failed to load icons.</div>';
    } finally { iLibLoading = false; }
  }

  // Search filter
  document.getElementById('lib-search').addEventListener('input', function() {
    if (iLibCache[iLib]) renderLibGrid(iLibCache[iLib], this.value);
  });

  function renderLibGrid(icons, query) {
    const grid = document.getElementById('lib-grid');
    const q = query.toLowerCase().trim();
    const filtered = q
      ? icons.filter(i => i.name.toLowerCase().includes(q) || (i.tags || []).some(t => t.toLowerCase().includes(q))).slice(0, 60)
      : icons.slice(0, 40);

    if (filtered.length === 0) {
      grid.innerHTML = '<div class="lib-loading">No icons found.</div>';
      return;
    }

    grid.innerHTML = '';
    filtered.forEach(icon => {
      const card = document.createElement('div');
      const isSelected = iSelectedIcons.some(s => s.name === icon.name);
      card.className = 'lib-card' + (isSelected ? ' selected' : '');
      card.innerHTML = \`<div class="lib-card-svg" id="lc-\${icon.name.replace(/[^a-z0-9]/g,'-')}"></div><div class="lib-card-name">\${escapeHTML(icon.name)}</div>\`;
      card.addEventListener('click', () => selectLibIcon(icon.name, card));
      grid.appendChild(card);

      // Lazy-load preview SVGs
      requestAnimationFrame(() => {
        const svgWrap = document.getElementById(\`lc-\${icon.name.replace(/[^a-z0-9]/g,'-')}\`);
        if (svgWrap && !svgWrap.dataset.loaded) {
          svgWrap.dataset.loaded = '1';
          fetchPreviewForCard(icon.name, svgWrap);
        }
      });
    });
  }

  const svgPreviewCache = {};

  async function fetchPreviewForCard(name, el) {
    const size = document.getElementById('hero-size').value;
    const style = document.getElementById('hero-style').value;
    const tablerStyle = document.getElementById('tabler-style').value;
    const tablerStroke = document.getElementById('tabler-stroke').value;
    const cacheKey = iLib === 'heroicons' ? \`\${iLib}:\${name}:\${size}:\${style}\` : iLib === 'tabler' ? \`\${iLib}:\${name}:\${tablerStyle}:\${tablerStroke}\` : \`\${iLib}:\${name}\`;
    if (svgPreviewCache[cacheKey]) { el.innerHTML = svgPreviewCache[cacheKey]; return; }
    const params = iLib === 'heroicons' ? \`&size=\${size}&style=\${style}\` : iLib === 'tabler' ? \`&style=\${tablerStyle}&stroke=\${tablerStroke}\` : '';
    try {
      const { svgContent } = await fetch(\`/api/library/svg?lib=\${iLib}&name=\${encodeURIComponent(name)}\${params}\`).then(r => r.json());
      svgPreviewCache[cacheKey] = svgContent;
      el.innerHTML = svgContent;
    } catch { el.innerHTML = '?'; }
  }

  async function selectLibIcon(name, cardEl) {
    // Slot assignment mode
    if (activeSlotDir) {
      const size = document.getElementById('hero-size').value;
      const style = document.getElementById('hero-style').value;
      const tablerStyle = document.getElementById('tabler-style').value;
      const tablerStroke = document.getElementById('tabler-stroke').value;
      const cacheKey = iLib === 'heroicons' ? \`\${iLib}:\${name}:\${size}:\${style}\` : iLib === 'tabler' ? \`\${iLib}:\${name}:\${tablerStyle}:\${tablerStroke}\` : \`\${iLib}:\${name}\`;
      let svg = svgPreviewCache[cacheKey] || null;
      if (!svg) {
        const params = iLib === 'heroicons' ? \`&size=\${size}&style=\${style}\` : iLib === 'tabler' ? \`&style=\${tablerStyle}&stroke=\${tablerStroke}\` : '';
        try {
          const r = await fetch(\`/api/library/svg?lib=\${iLib}&name=\${encodeURIComponent(name)}\${params}\`).then(r => r.json());
          svg = r.svgContent;
          svgPreviewCache[cacheKey] = svg;
        } catch {}
      }
      directiveSlots[activeSlotDir] = { name, svgContent: svg };
      renderSlot(activeSlotDir);
      activeSlotDir = null;
      updateSlotHighlight();
      updateLibFooter();
      return;
    }
    // Normal multi-select
    const idx = iSelectedIcons.findIndex(s => s.name === name);
    if (idx >= 0) {
      iSelectedIcons.splice(idx, 1);
      cardEl.classList.remove('selected');
    } else {
      iSelectedIcons.push({ name });
      cardEl.classList.add('selected');
    }
    updateLibFooter();
  }

  function updateLibFooter() {
    const n = iSelectedIcons.length;
    const nameWrap = document.getElementById('import-name-wrap');
    const bulkLabel = document.getElementById('import-bulk-label');
    const dirBtn = document.getElementById('dir-toggle-btn');
    const btn = document.getElementById('import-btn');

    if (iTab !== 'library') {
      nameWrap.style.display = '';
      bulkLabel.style.display = 'none';
      dirBtn.style.display = 'none';
      btn.textContent = 'Import';
      return;
    }

    if (n > 1) {
      // Bulk mode — hide directives
      if (directivesOpen) toggleDirectives(false);
      nameWrap.style.display = 'none';
      bulkLabel.style.display = '';
      bulkLabel.textContent = \`\${n} icons selected\`;
      dirBtn.style.display = 'none';
      btn.textContent = \`Import \${n} icons\`;
    } else {
      nameWrap.style.display = '';
      bulkLabel.style.display = 'none';
      dirBtn.style.display = n === 1 ? '' : 'none';
      if (n === 1) {
        const nameInput = document.getElementById('import-name');
        if (!nameInput.value || nameInput.dataset.auto === '1') {
          nameInput.value = iSelectedIcons[0].name;
          nameInput.dataset.auto = '1';
        }
      } else {
        if (directivesOpen) toggleDirectives(false);
        const nameInput = document.getElementById('import-name');
        if (nameInput.dataset.auto === '1') { nameInput.value = ''; nameInput.dataset.auto = '1'; }
      }
      // Update import btn label based on directive slots
      if (directivesOpen) {
        const filledCount = Object.values(directiveSlots).filter(Boolean).length;
        btn.textContent = filledCount > 0 ? \`Import \${filledCount} directive\${filledCount > 1 ? 's' : ''}\` : 'Import';
      } else {
        btn.textContent = 'Import';
      }
    }
  }

  function toggleDirectives(forceOpen) {
    directivesOpen = forceOpen !== undefined ? forceOpen : !directivesOpen;
    document.getElementById('directive-panel').style.display = directivesOpen ? '' : 'none';
    document.getElementById('dir-toggle-btn').classList.toggle('active', directivesOpen);
    if (!directivesOpen) {
      activeSlotDir = null;
      updateSlotHighlight();
    }
    updateLibFooter();
  }

  document.getElementById('dir-toggle-btn').addEventListener('click', () => toggleDirectives());

  // ── Directive slots ──────────────────────────────────────────────────────────
  const DIRS = ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'];

  function renderSlot(dir) {
    const el = document.getElementById(\`dslot-\${dir}\`);
    const slot = directiveSlots[dir];
    const preview = el.querySelector('.d-slot-preview');
    // Remove existing clear btn
    el.querySelector('.d-slot-clear')?.remove();
    if (slot) {
      el.classList.add('filled');
      preview.innerHTML = slot.svgContent || '';
      const clr = document.createElement('button');
      clr.className = 'd-slot-clear'; clr.textContent = '×'; clr.title = 'Clear';
      clr.addEventListener('click', e => { e.stopPropagation(); directiveSlots[dir] = null; renderSlot(dir); updateLibFooter(); });
      el.appendChild(clr);
    } else {
      el.classList.remove('filled');
      preview.innerHTML = '';
    }
  }

  function renderAllSlots() { DIRS.forEach(renderSlot); }

  function updateSlotHighlight() {
    DIRS.forEach(dir => {
      document.getElementById(\`dslot-\${dir}\`).classList.toggle('active-slot', dir === activeSlotDir);
    });
    const hint = document.getElementById('directive-hint');
    if (activeSlotDir) {
      hint.innerHTML = \`<strong>↑ Picking for \${activeSlotDir}</strong> — click any icon in the library above\`;
    } else {
      hint.innerHTML = 'Click a slot, then pick an icon from the library above';
    }
  }

  DIRS.forEach(dir => {
    document.getElementById(\`dslot-\${dir}\`).addEventListener('click', () => {
      activeSlotDir = activeSlotDir === dir ? null : dir;
      updateSlotHighlight();
    });
  });

  // Keep name "auto" flag when user edits manually
  document.getElementById('import-name').addEventListener('input', function() {
    this.dataset.auto = '';
  });

  // Paste SVG → auto-fill name
  document.getElementById('paste-input').addEventListener('input', function() {
    const nameInput = document.getElementById('import-name');
    if (!nameInput.value || nameInput.dataset.auto === '1') {
      const m = this.value.match(/id="([^"]+)"/);
      if (m) { nameInput.value = m[1]; nameInput.dataset.auto = '1'; }
    }
  });

  function showStatus(msg, ok) {
    importStatus.textContent = msg;
    importStatus.className = 'import-status ' + (ok ? 'ok' : 'err');
    importStatus.style.display = '';
  }
  function resetImportStatus() { importStatus.style.display = 'none'; }

  // Import button
  document.getElementById('import-btn').addEventListener('click', async () => {
    const btn = document.getElementById('import-btn');
    btn.disabled = true;
    resetImportStatus();

    // ── Bulk library import ──────────────────────────────────────────────────
    if (iTab === 'library' && iSelectedIcons.length > 1) {
      const heroSize = parseInt(document.getElementById('hero-size').value, 10);
      const heroStyle = document.getElementById('hero-style').value;
      const tablerStyle = document.getElementById('tabler-style').value;
      const tablerStroke = parseFloat(document.getElementById('tabler-stroke').value);
      let done = 0;
      let failed = 0;
      btn.textContent = \`Importing 0/\${iSelectedIcons.length}…\`;
      for (const icon of iSelectedIcons) {
        try {
          const body = {
            source: 'library',
            library: iLib,
            libraryIconName: icon.name,
            heroiconSize: heroSize,
            heroiconStyle: heroStyle,
            tablerStyle,
            tablerStroke,
            componentName: iLib === 'tabler' && tablerStyle === 'filled' ? \`\${icon.name}-filled\` : icon.name,
          };
          const res = await fetch('/api/import', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
          const data = await res.json();
          if (!res.ok || data.error) throw new Error(data.error);
          done++;
        } catch { failed++; }
        btn.textContent = \`Importing \${done + failed}/\${iSelectedIcons.length}…\`;
      }
      // Refresh grid
      fetch('/api/icons').then(r => r.json()).then(d => {
        allIcons = Object.entries(d).map(([filename, icon]) => ({ ...icon, filename, detectedStyle: detectStyle(icon.svgContent) }));
        renderGrid();
      });
      const msg = failed > 0 ? \`✓ \${done} imported, \${failed} failed.\` : \`✓ \${done} icons imported!\`;
      showStatus(msg, failed === 0);
      btn.disabled = false;
      btn.textContent = \`Import \${iSelectedIcons.length} icons\`;
      setTimeout(() => {
        closeImport();
        iSelectedIcons = [];
        document.getElementById('import-name').value = '';
        document.getElementById('lib-search').value = '';
        updateLibFooter();
      }, 1400);
      return;
    }

    // ── Directive import → single variant component ───────────────────────────
    if (iTab === 'library' && directivesOpen) {
      const nameVal = document.getElementById('import-name').value.trim();
      if (!nameVal) { showStatus('Enter a base name.', false); btn.disabled = false; return; }
      const filledSlots = Object.entries(directiveSlots).filter(([, v]) => v);
      if (!filledSlots.length) { showStatus('Fill at least one direction slot.', false); btn.disabled = false; return; }
      const heroSize = parseInt(document.getElementById('hero-size').value, 10);
      const heroStyle = document.getElementById('hero-style').value;
      const tablerStyle = document.getElementById('tabler-style').value;
      const tablerStroke = parseFloat(document.getElementById('tabler-stroke').value);
      btn.textContent = 'Generating…';
      // Build slots payload
      const slotsPayload = {};
      for (const [dir, slot] of filledSlots) {
        slotsPayload[dir] = { library: iLib, libraryIconName: slot.name, heroiconSize: heroSize, heroiconStyle: heroStyle, tablerStyle, tablerStroke };
      }
      try {
        const res = await fetch('/api/import-directive', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ componentName: nameVal, slots: slotsPayload }),
        });
        const data = await res.json();
        if (!res.ok || data.error) throw new Error(data.error || 'Import failed');
        showStatus(\`✓ \${data.filename} generated with \${filledSlots.length} direction\${filledSlots.length > 1 ? 's' : ''}!\`, true);
        fetch('/api/icons').then(r => r.json()).then(d => {
          allIcons = Object.entries(d).map(([filename, icon]) => ({ ...icon, filename, detectedStyle: detectStyle(icon.svgContent) }));
          renderGrid();
        });
        setTimeout(() => { closeImport(); }, 1400);
      } catch (err) {
        showStatus(err.message, false);
      } finally {
        btn.disabled = false;
        btn.textContent = \`Import \${filledSlots.length} directives\`;
      }
      return;
    }

    // ── Single import ────────────────────────────────────────────────────────
    const nameVal = document.getElementById('import-name').value.trim();
    if (!nameVal) { showStatus('Enter a component name.', false); btn.disabled = false; return; }

    const body = { componentName: nameVal };

    if (iTab === 'library') {
      if (!iSelectedIcons.length) { showStatus('Select an icon first.', false); btn.disabled = false; return; }
      Object.assign(body, {
        source: 'library',
        library: iLib,
        libraryIconName: iSelectedIcons[0].name,
        heroiconSize: parseInt(document.getElementById('hero-size').value, 10),
        heroiconStyle: document.getElementById('hero-style').value,
        tablerStyle: document.getElementById('tabler-style').value,
        tablerStroke: parseFloat(document.getElementById('tabler-stroke').value),
      });
    } else if (iTab === 'paste') {
      const svg = document.getElementById('paste-input').value.trim();
      if (!svg) { showStatus('Paste some SVG first.', false); btn.disabled = false; return; }
      Object.assign(body, { source: 'paste', svgContent: svg });
    } else {
      const urlVal = document.getElementById('url-input').value.trim();
      if (!urlVal) { showStatus('Enter a URL.', false); btn.disabled = false; return; }
      Object.assign(body, { source: 'url', svgUrl: urlVal });
    }

    btn.textContent = 'Importing…';

    try {
      const res = await fetch('/api/import', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Import failed');
      showStatus(\`✓ \${data.componentName} imported!\`, true);
      fetch('/api/icons').then(r => r.json()).then(d => {
        allIcons = Object.entries(d).map(([filename, icon]) => ({ ...icon, filename, detectedStyle: detectStyle(icon.svgContent) }));
        renderGrid();
      });
      setTimeout(() => {
        closeImport();
        iSelectedIcons = [];
        document.getElementById('import-name').value = '';
        document.getElementById('paste-input').value = '';
        document.getElementById('url-input').value = '';
        document.getElementById('lib-search').value = '';
        updateLibFooter();
      }, 1200);
    } catch (err) {
      showStatus(err.message, false);
    } finally {
      btn.disabled = false;
      btn.textContent = 'Import';
    }
  });
})();
</script>
</body>
</html>`;
};
