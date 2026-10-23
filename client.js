window.__ModuleLoader__.load({
  id: 'dsh-doki',
  factory(require) {
    const React = require('react');
    const h = React.createElement;
    const { useState, useEffect, useCallback, useRef } = React;

    // The panel is portalled to <body> so the composer's own overflow cannot
    // clip it. `react-dom` is in the host module table; if a future build ever
    // drops it we still render, just anchored in place instead of portalled.
    let ReactDOM = null;
    try {
      ReactDOM = require('react-dom');
    } catch (error) {
      ReactDOM = null;
    }

    const NS = 'typingStats';

    const DICT = {
      zh: {
        title: '打字统计',
        typing: '打字',
        chars: '字数',
        thinking: '思考',
        second: '秒',
        minute: '分',
        hour: '时',
        char: '字',
        hint: '打字时间 / 累计输入字数（不含拼音候选）；点开查看思考时间',
        settingsTitle: '底栏显示内容',
        settingsDesc: '选择底栏要显示哪些统计项。',
        showTyping: '打字',
        showChars: '字数',
        showThinking: '思考',
        allOff: '至少选一项，否则这一项会隐藏',
        dockTitle: 'Dock 设置',
        dockIntro: '输入框下方那一行（Dock）里显示什么，都在这里开关。改动立即生效，并记在本机。',
        groupMine: '打字统计',
        groupSession: '会话数据',
        groupSessionNote: '取自官方会话统计的投影，切换会话会立刻跟着变。',
        groupHost: '宿主统计',
        groupHostNote: '以下三项是 DSH 自带的内容，这里只控制显隐，数据仍由官方插件提供。',
        typingDesc: '输入时长的累计；停手超过 2 秒的间隔不计。',
        charsDesc: '累计输入的有效字数；拼音候选和删掉的字符不计。',
        thinkingDesc: '光标在输入框却没在输入的时间，只在点开的浮层里显示。',
        elapsed: '耗时',
        showElapsed: '本次耗时',
        elapsedDesc: '官方会话统计里的 LLM 与工具累计耗时，点开可看完整明细。',
        ttft: '首字',
        showTtft: '首字延迟',
        ttftDesc: '官方会话统计里的平均首字延迟（TTFT）；没有生成记录时这一格不出现。',
        dash: '—',
        showActivity: '会话统计',
        activityDesc: '官方的轮数、步数与吞吐（tok/s）。',
        showUsage: 'Token 用量',
        usageDesc: '官方的累计 token 与缓存命中率。',
        showMeter: '上下文指示器',
        meterDesc: '官方的上下文占用环，点开可看分段明细。',
        segs: '细分',
        segActivityCounts: '轮数 / 步数',
        segActivitySpeed: '吞吐 tok/s',
        segUsageTokens: 'token 总量',
        segUsageCache: '缓存命中',
        segMeterRing: '占用环',
        segMeterPercent: '百分比',
        reset: '恢复默认',
      },
      en: {
        title: 'Typing stats',
        typing: 'Typing',
        chars: 'Chars',
        thinking: 'Thinking',
        second: 's',
        minute: 'm',
        hour: 'h',
        char: 'ch',
        hint: 'Time spent typing / characters committed in the composer (IME candidates excluded); open for the thinking time',
        settingsTitle: 'Items in the dock',
        settingsDesc: 'Choose which figures the bar shows.',
        showTyping: 'Typing',
        showChars: 'Chars',
        showThinking: 'Thinking',
        allOff: 'Keep at least one on, or the entry hides itself',
        dockTitle: 'Dock',
        dockIntro: 'Everything the row under the composer shows can be switched here. Changes apply at once and stay on this machine.',
        groupMine: 'Typing stats',
        groupSession: 'Session data',
        groupSessionNote: 'Read from the shipped session-stats projection; follows whichever session is open.',
        groupHost: 'Built-in stats',
        groupHostNote: 'These three belong to DSH itself — this page only shows or hides them; the data still comes from the shipped plugins.',
        typingDesc: 'Accumulated typing time; pauses over 2 seconds are not counted.',
        charsDesc: 'Committed characters, cumulative; IME candidates and deleted text are not counted.',
        thinkingDesc: 'Time the caret sits in the composer without editing; shown inside the popup only.',
        elapsed: 'Elapsed',
        showElapsed: 'Session time',
        elapsedDesc: 'Total LLM and tool time from the shipped session stats; open it for the breakdown.',
        ttft: 'First token',
        showTtft: 'First-token latency',
        ttftDesc: 'Average time to the first token, from the shipped session stats; hidden while there is nothing generated yet.',
        dash: '—',
        showActivity: 'Session stats',
        activityDesc: 'The official turn / step counts and throughput (tok/s).',
        showUsage: 'Token usage',
        usageDesc: 'The official token total and cache hit rate.',
        showMeter: 'Context meter',
        meterDesc: 'The official context ring; click it for the breakdown.',
        segs: 'Detail',
        segActivityCounts: 'Turns / steps',
        segActivitySpeed: 'Throughput tok/s',
        segUsageTokens: 'Token total',
        segUsageCache: 'Cache hit',
        segMeterRing: 'Ring',
        segMeterPercent: 'Percent',
        reset: 'Reset',
      },
    };

    // Mirrors the shipped StatsPills look (14px icon + tabular text in a
    // borderless pill that highlights on hover and opens a dialog on click),
    // with our own class prefix so nothing collides with the host stylesheet.
    // `order: 100` wins over the context meter's default `order: 0`, so this
    // entry sits to the right of it: both are flex items of the composer dock.
    const CSS = `
      .doki-anchor {
        order: 100;
        min-width: 0;
        display: inline-flex;
        font-size: calc(var(--dsh-content-font-size-secondary, 13px) - 1px);
        line-height: calc(20px + var(--dsh-content-font-delta-secondary, 0px));
      }
      .doki-pill {
        box-sizing: border-box;
        border-radius: var(--dsw-radius-sm);
        max-width: 100%;
        color: var(--dsw-alias-label-tertiary);
        font: inherit;
        font-variant-numeric: tabular-nums;
        line-height: inherit;
        white-space: nowrap;
        background: 0 0;
        border: none;
        align-items: center;
        gap: 6px;
        padding: 1px 8px;
        display: inline-flex;
        cursor: pointer;
      }
      .doki-pill svg { flex: none; width: 14px; height: 14px; }
      .doki-pill:hover,
      .doki-pill[aria-expanded="true"] {
        background: var(--dsw-alias-interactive-bg-hover);
        color: var(--dsw-alias-label-secondary);
      }
      .doki-label { text-overflow: ellipsis; min-width: 0; overflow: hidden; }
      .doki-sep { color: var(--dsw-alias-separator-primary); margin: 0 6px; }
      .doki-panel {
        z-index: 1100;
        box-sizing: border-box;
        border-radius: var(--dsw-radius-lg);
        background: var(--dsw-specific-menu);
        width: max-content;
        min-width: min(300px, 100vw - 24px);
        max-width: min(440px, 100vw - 24px);
        backdrop-filter: var(--dsw-menu-backdrop-filter);
        --dsw-elevation-stroke-color: var(--dsw-alias-border-l1);
        box-shadow: var(--dsw-elevation-prominent);
        color: var(--dsw-alias-label-secondary);
        cursor: default;
        border: 0;
        padding: 16px;
        font-size: 12px;
        line-height: 18px;
        position: fixed;
      }
      .doki-title {
        color: var(--dsw-alias-label-primary);
        justify-content: space-between;
        gap: 16px;
        margin-bottom: 8px;
        font-weight: 500;
        display: flex;
      }
      .doki-titleRule {
        border-top: .5px solid var(--dsw-alias-border-l2);
        margin-bottom: 10px;
      }
      .doki-titleLabel { align-items: center; gap: 6px; min-width: 0; display: inline-flex; }
      .doki-titleLabel svg { flex: none; width: 14px; height: 14px; }
      .doki-details {
        color: var(--dsw-alias-label-tertiary);
        grid-template-columns: minmax(76px, auto) minmax(0, 1fr);
        gap: 6px 16px;
        margin: 0;
        display: grid;
      }
      .doki-details dt,
      .doki-details dd { min-width: 0; margin: 0; }
      .doki-details dd {
        color: var(--dsw-alias-label-secondary);
        font-variant-numeric: tabular-nums;
        text-align: right;
      }
      /* ---- the settings-nav glyph ---------------------------------------
         The shell maps a few known section ids to its own glyphs and falls
         back to the settings gear for every other id, so a contributed
         section would otherwise wear the same gear as "General". The slot
         has no icon option, so the row is decorated from the outside: the
         shell's own svg is hidden and a masked span paints our glyph in
         currentColor (so it follows hover, active and theme on its own). */
      [data-doki-nav-row] > svg { display: none !important; }
      .doki-navIcon {
        flex: none;
        width: 16px;
        height: 16px;
        background-color: currentColor;
        display: inline-block;
      }

      /* ---- the "Dock" settings page ------------------------------------
         Laid out like the shipped preference rows (title + description on
         the left, the control on the right) so a third-party page does not
         read as foreign. Every colour is a --dsw-* token, so light and dark
         follow the app theme without extra work. */
      .doki-page {
        display: flex;
        flex-direction: column;
        gap: 20px;
        padding: 8px 0 24px;
        color: var(--dsw-alias-label-primary);
      }
      .doki-intro {
        margin: 0;
        color: var(--dsw-alias-label-secondary);
        font-size: 13px;
        line-height: 20px;
      }
      .doki-group { display: flex; flex-direction: column; }
      .doki-groupTitle {
        margin: 0 0 4px;
        color: var(--dsw-alias-label-secondary);
        font-size: 12px;
        font-weight: 500;
        line-height: 18px;
        letter-spacing: .02em;
      }
      .doki-groupNote {
        margin: 0 0 4px;
        color: var(--dsw-alias-label-tertiary);
        font-size: 12px;
        line-height: 18px;
      }
      .doki-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 24px;
        padding: 14px 0;
        border-bottom: .5px solid var(--dsw-alias-border-l2);
      }
      .doki-item:last-child { border-bottom: 0; }
      .doki-itemText { min-width: 0; }
      .doki-itemTitle { font-size: 14px; line-height: 20px; }
      .doki-itemDesc {
        margin-top: 2px;
        color: var(--dsw-alias-label-secondary);
        font-size: 12px;
        line-height: 18px;
      }
      .doki-item[data-off="true"] .doki-itemTitle { color: var(--dsw-alias-label-tertiary); }
      /* Per-half controls under a shipped row: small pressed chips so they read
         as "which halves of the pill print", not as a second switch. */
      .doki-segs {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 6px;
        margin-top: 8px;
      }
      .doki-segsLabel {
        color: var(--dsw-alias-label-tertiary);
        font-size: 12px;
        line-height: 18px;
      }
      .doki-segChip {
        box-sizing: border-box;
        border: .5px solid var(--dsw-alias-border-l1);
        border-radius: 999px;
        background: 0 0;
        color: var(--dsw-alias-label-tertiary);
        font: inherit;
        font-size: 12px;
        line-height: 18px;
        padding: 1px 9px;
        cursor: pointer;
        transition: background .12s, color .12s, border-color .12s;
      }
      .doki-segChip:hover { background: var(--dsw-alias-interactive-bg-hover); }
      .doki-segChip[aria-pressed="true"] {
        border-color: transparent;
        background: var(--dsw-alias-interactive-bg-hover);
        color: var(--dsw-alias-label-primary);
      }
      .doki-segChip[aria-pressed="false"] {
        border-style: dashed;
        color: var(--dsw-alias-label-tertiary);
        opacity: .7;
      }
      .doki-segChip[data-disabled="true"] {
        cursor: default;
        opacity: .45;
      }
      .doki-segChip[data-disabled="true"]:hover { background: 0 0; }
      /* Same geometry and colours as the shipped switch, built locally so we
         never depend on a hashed class name. */
      .doki-switch {
        box-sizing: border-box;
        position: relative;
        flex: 0 0 auto;
        width: 36px;
        height: 20px;
        padding: 2px;
        border: 0;
        border-radius: 999px;
        background: var(--dsw-alias-border-l3);
        cursor: pointer;
        transition: background .12s;
      }
      .doki-switch[aria-checked="true"] { background: var(--dsw-alias-brand-primary); }
      .doki-switch:focus-visible {
        outline: var(--dsw-focus-ring-width, 2px) solid
          var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary, currentColor));
        outline-offset: 2px;
      }
      .doki-switch[data-disabled="true"] { cursor: default; opacity: .5; }
      .doki-thumb {
        display: block;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: var(--dsw-alias-switch-thumb, var(--dsw-alias-label-primary-foreground));
        transition: transform .12s, background .12s;
      }
      .doki-switch[aria-checked="true"] .doki-thumb {
        transform: translate(16px);
        background: var(--dsw-alias-label-primary-foreground);
      }
      .doki-pageFoot { display: flex; justify-content: flex-end; }
      .doki-reset {
        box-sizing: border-box;
        border: .5px solid var(--dsw-alias-border-l1);
        border-radius: var(--dsw-radius-sm);
        background: 0 0;
        color: var(--dsw-alias-label-secondary);
        font: inherit;
        font-size: 12px;
        line-height: 18px;
        padding: 3px 10px;
        cursor: pointer;
      }
      .doki-reset:hover { background: var(--dsw-alias-interactive-bg-hover); }

      /* ---- hiding the shipped dock entries ------------------------------
         There is no official API to switch a host entry off, so the page
         toggles visibility only: the flags below go on <html> and the rules
         key off the host's own stable markers (data-composer-dock and
         data-composer-stat). The host keeps computing and rendering the
         entries — nothing is unmounted, no data is touched — so flipping the
         switch back is instant and cannot corrupt host state. */
      html[data-doki-hide-activity="1"] [data-composer-dock] [data-composer-stat="activity"],
      html[data-doki-hide-usage="1"] [data-composer-dock] [data-composer-stat="usage"],
      html[data-doki-hide-meter="1"] [data-composer-dock] > span:not([data-composer-stat]):has(> button[aria-haspopup="dialog"]),
      html[data-doki-hide-meter="1"] [data-composer-dock] > span:not([data-composer-stat]):not([data-slot]) {
        display: none !important;
      }

      /* ---- hiding one segment inside a shipped pill ---------------------
         The activity and usage labels are [text, "·", text]; the text nodes get
         wrapped by decorateHostPills into [data-doki-seg] spans because a bare
         text node cannot be matched by a selector. Each half hides on its own,
         and the separator goes with it so no lone "·" is left behind.
         Both halves off folds the whole pill: the host would otherwise leave an
         icon and an empty button in the row. */
      html[data-doki-seg-activity-counts="1"] [data-doki-seg="activity:0"],
      html[data-doki-seg-activity-speed="1"] [data-doki-seg="activity:1"],
      html[data-doki-seg-usage-tokens="1"] [data-doki-seg="usage:0"],
      html[data-doki-seg-usage-cache="1"] [data-doki-seg="usage:1"] {
        display: none !important;
      }
      /* The separator carries the break between the halves, so it steps out
         with whichever half is missing — otherwise a lone "·" would trail the
         label. */
      html[data-doki-seg-activity-counts="1"] [data-doki-sep="activity"],
      html[data-doki-seg-activity-speed="1"] [data-doki-sep="activity"],
      html[data-doki-seg-usage-tokens="1"] [data-doki-sep="usage"],
      html[data-doki-seg-usage-cache="1"] [data-doki-sep="usage"] {
        display: none !important;
      }
      html[data-doki-seg-activity-counts="1"][data-doki-seg-activity-speed="1"] [data-composer-dock] [data-composer-stat="activity"],
      html[data-doki-seg-usage-tokens="1"][data-doki-seg-usage-cache="1"] [data-composer-dock] [data-composer-stat="usage"] {
        display: none !important;
      }

      /* The meter needs no wrapping: under its trigger button the ring is the
         only svg and the reading is the only span. */
      html[data-doki-seg-meter-ring="1"] [data-composer-dock] > span:not([data-composer-stat]):has(> button[aria-haspopup="dialog"]) button > svg,
      html[data-doki-seg-meter-percent="1"] [data-composer-dock] > span:not([data-composer-stat]):has(> button[aria-haspopup="dialog"]) button > span {
        display: none !important;
      }
      html[data-doki-seg-meter-ring="1"][data-doki-seg-meter-percent="1"] [data-composer-dock] > span:not([data-composer-stat]):has(> button[aria-haspopup="dialog"]) {
        display: none !important;
      }
    `;

    const GAP_LIMIT_MS = 2000;   // a pause longer than this is not typing time
    const IDLE_AFTER_MS = 1000;  // caret present but no edit for this long = thinking
    const TICK_MS = 1000;
    const MEASURE_STYLE = { visibility: 'hidden', left: 0, top: 0 };
    const PANEL_GAP = 8;
    const PANEL_MARGIN = 12;

    // Invisible characters ride along in contenteditable text and are not
    // characters the user typed: zero-width marks, plus the private-use
    // placeholders the composer substitutes for @-reference chips (the same
    // ranges the host's own projection strips).
    const INVISIBLE_RE = /[\u200B-\u200D\u2060\uFEFF\uE100-\uE11D\uFFFC]/g;

    /** Visible character array of a draft: line breaks are layout, not text. */
    function visibleChars(text) {
      if (typeof text !== 'string' || text.length === 0) return [];
      return Array.from(text.replace(INVISIBLE_RE, '').replace(/[\r\n]/g, ''));
    }

    function countChars(text) {
      return visibleChars(text).length;
    }

    /**
     * How many characters `next` adds over `prev`, counting only genuinely new
     * text. A pure deletion adds nothing; replacing a selection adds only the
     * replacement. This is what makes the tally cumulative and monotonic.
     */
    function insertedChars(prev, next) {
      const a = visibleChars(prev);
      const b = visibleChars(next);
      if (b.length === 0) return 0;
      if (a.length === 0) return b.length;
      let head = 0;
      while (head < a.length && head < b.length && a[head] === b[head]) head += 1;
      let tail = 0;
      while (tail < a.length - head && tail < b.length - head &&
             a[a.length - 1 - tail] === b[b.length - 1 - tail]) tail += 1;
      return Math.max(0, b.length - head - tail);
    }

    /**
     * One page-lifetime counter set. The dock slot is session-scoped and
     * remounts on every session switch, so the numbers live outside the
     * component and keep accumulating.
     */
    let store = null;

    function getStore() {
      if (store === null) {
        store = {
          typingMs: 0,
          thinkingMs: 0,
          chars: 0,
          lastText: '',
          lastEditAt: 0,
          lastRev: -1,
          charsSession: null,
          typingSession: null,
          lastTickAt: 0,
        };
      }
      return store;
    }

    // ---- which figures the bar shows ---------------------------------------
    // A display preference, not a statistic: it is persisted in localStorage
    // next to the host's own view preferences (the composer width key lives
    // there too) and read synchronously on first render so the bar never
    // flashes a different set of figures.
    const PREFS_KEY = 'dsh.doki.view.v1';
    const FIELDS = ['typing', 'chars', 'thinking', 'elapsed', 'ttft'];
    // The dock's shipped entries. We never own their data and never unmount
    // them; the page only flips a visibility flag on <html>.
    const HOST_FIELDS = ['activity', 'usage', 'meter'];
    const HOST_FLAG = {
      activity: 'data-doki-hide-activity',
      usage: 'data-doki-hide-usage',
      meter: 'data-doki-hide-meter',
    };
    const DEFAULT_PREFS = { typing: true, chars: true, thinking: false, elapsed: false, ttft: false };
    const DEFAULT_HOST = { activity: true, usage: true, meter: true };

    // Finer-grained control over what each shipped pill prints. `activity` and
    // `usage` render their label as [text, separator, text]; the two text nodes
    // carry no marker of their own, so `decorateHostPills` wraps them in
    // `[data-doki-seg]` spans. The meter needs none of that: its ring is an
    // `svg` under the button and its reading is the only `span` there, so CSS
    // alone can hide either half.
    const SEG_FIELDS = [
      'activityCounts',
      'activitySpeed',
      'usageTokens',
      'usageCache',
      'meterRing',
      'meterPercent',
    ];
    const SEG_FLAG = {
      activityCounts: 'data-doki-seg-activity-counts',
      activitySpeed: 'data-doki-seg-activity-speed',
      usageTokens: 'data-doki-seg-usage-tokens',
      usageCache: 'data-doki-seg-usage-cache',
      meterRing: 'data-doki-seg-meter-ring',
      meterPercent: 'data-doki-seg-meter-percent',
    };
    const DEFAULT_SEG = {
      activityCounts: true,
      activitySpeed: true,
      usageTokens: true,
      usageCache: true,
      meterRing: true,
      meterPercent: true,
    };

    function normalizePrefs(value) {
      const out = { ...DEFAULT_PREFS };
      if (value === null || typeof value !== 'object') return { ...DEFAULT_PREFS };
      for (let i = 0; i < FIELDS.length; i += 1) out[FIELDS[i]] = value[FIELDS[i]] === true;
      // Every field off is a legitimate choice — switching the last chip off
      // must not bounce back on. The bar unmounts itself instead of leaving an
      // empty pill in the dock, so the toggles stay honest in both directions.
      return out;
    }

    /**
     * Segments default to on: a stored blob written before this page existed
     * carries no segment keys, and those users must keep seeing full pills.
     */
    function normalizeSeg(value) {
      const out = { ...DEFAULT_SEG };
      if (value === null || typeof value !== 'object') return out;
      for (let i = 0; i < SEG_FIELDS.length; i += 1) {
        const field = SEG_FIELDS[i];
        out[field] = value[field] !== false;
      }
      return out;
    }

    function normalizeHost(value) {
      const out = { activity: true, usage: true, meter: true };
      if (value === null || typeof value !== 'object') return out;
      for (let i = 0; i < HOST_FIELDS.length; i += 1) {
        const field = HOST_FIELDS[i];
        // Shipped entries are visible unless explicitly turned off, so an
        // older stored blob (written before this page existed) keeps them on.
        out[field] = value[field] !== false;
      }
      return out;
    }

    function readPrefs() {
      const empty = { view: { ...DEFAULT_PREFS }, host: { ...DEFAULT_HOST }, seg: { ...DEFAULT_SEG } };
      try {
        if (typeof localStorage === 'undefined' || localStorage === null) return empty;
        const raw = localStorage.getItem(PREFS_KEY);
        if (raw === null || raw === undefined) return empty;
        const parsed = JSON.parse(raw);
        return { view: normalizePrefs(parsed), host: normalizeHost(parsed), seg: normalizeSeg(parsed) };
      } catch (error) {
        return empty;
      }
    }

    function writePrefs(next) {
      try {
        if (typeof localStorage === 'undefined' || localStorage === null) return;
        localStorage.setItem(PREFS_KEY, JSON.stringify({ ...next.view, ...next.host, ...next.seg }));
      } catch (error) {
        /* private mode / quota: the in-memory value still drives this page */
      }
    }

    // Every mounted pill (and the settings page) subscribes here, so flipping a
    // switch updates the dock without a reload and without a shared React tree.
    const prefListeners = new Set();
    let prefsCache = null;

    // The shell's own glyph per settings section id; anything else falls back
    // to the settings gear, which would make this page look like "General".
    // The slot exposes no icon option, so the row is decorated from the
    // outside: its svg is hidden and a masked span paints our shape in
    // currentColor, so hover, active and theme all come for free.
    const NAV_ICON =
      'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 16 16\' fill=\'none\'%3E%3Crect x=\'2.5\' y=\'1.7\' width=\'11\' height=\'6.5\' rx=\'2\' stroke=\'%23000\' stroke-width=\'1.3\'/%3E%3Crect x=\'4.2\' y=\'10.4\' width=\'7.6\' height=\'3.9\' rx=\'1.6\' stroke=\'%23000\' stroke-width=\'1.3\'/%3E%3Cpath d=\'M6.1 12.35h.01M8 12.35h.01M9.9 12.35h.01\' stroke=\'%23000\' stroke-width=\'1.4\' stroke-linecap=\'round\'/%3E%3C/svg%3E")';

    /**
     * Give the contributed settings row its own glyph, then keep walking: the
     * settings overlay is rebuilt on every open, so the row is re-decorated as
     * it appears. Returns a disposer for the observer plus every span added.
     */
    function decorateNavRows(t) {
      if (typeof document === 'undefined' || typeof MutationObserver !== 'function') {
        return () => {};
      }
      const painted = new Set();
      const label = (() => {
        try {
          const text = t('dockTitle');
          return typeof text === 'string' && text !== '' ? text : 'Dock';
        } catch (error) {
          return 'Dock';
        }
      })();

      const paint = (row) => {
        try {
          if (painted.has(row)) return;
          // The shell renders the glyph as the row's first svg child; keep a
          // masked span in the same place so the label keeps its offset.
          const svg = row.querySelector('svg');
          if (svg === null) return;
          const icon = document.createElement('span');
          icon.className = 'doki-navIcon';
          icon.setAttribute('aria-hidden', 'true');
          icon.style.setProperty('-webkit-mask', NAV_ICON + ' center / contain no-repeat');
          icon.style.setProperty('mask', NAV_ICON + ' center / contain no-repeat');
          svg.parentNode.insertBefore(icon, svg.nextSibling);
          row.setAttribute('data-doki-nav-row', '1');
          painted.add(row);
        } catch (error) {
          /* a skinless glyph must never cost the page */
        }
      };

      const sweep = () => {
        try {
          const rows = document.querySelectorAll('button');
          for (let i = 0; i < rows.length; i += 1) {
            const row = rows[i];
            if (row.getAttribute('data-doki-nav-row') === '1') continue;
            const text = row.textContent;
            if (typeof text !== 'string' || text.indexOf(label) === -1) continue;
            if (row.querySelector('svg') === null) continue;
            paint(row);
          }
        } catch (error) {
          /* same: decoration is optional */
        }
      };

      let observer = null;
      try {
        observer = new MutationObserver(sweep);
        observer.observe(document.body, { childList: true, subtree: true });
        sweep();
      } catch (error) {
        console.warn('[doki] settings nav observer skipped:', error);
      }

      return () => {
        try {
          if (observer !== null) observer.disconnect();
        } catch (error) {
          /* nothing to undo */
        }
        painted.forEach((row) => {
          try {
            const icon = row.querySelector('.doki-navIcon');
            if (icon !== null && icon.parentNode !== null) icon.parentNode.removeChild(icon);
            row.removeAttribute('data-doki-nav-row');
          } catch (error) {
            /* the row may already be gone */
          }
        });
        painted.clear();
      };
    }

    /**
     * The label of a shipped pill — the element that holds the printed halves.
     *
     * The host's class names are hashed per build (`OpZ85W_label` today), so
     * they are only a fallback. The stable shape is: the label is the deepest
     * element carrying **two or more** printed halves, with the "·" separator
     * as its only other element child. A half counts whether it is still a bare
     * text node or already one of our wrappers, so the same rule keeps working
     * on every later sweep instead of depending on the class name. Requiring
     * two halves is what separates the label from every plain wrapper around
     * it; if a future build changes that shape this returns null and nothing is
     * wrapped, which costs the per-half switches but can never mangle the pill.
     */
    function findPillLabel(root) {
      let best = null;
      let bestDepth = -1;
      const all = root.querySelectorAll('*');
      for (let i = 0; i < all.length; i += 1) {
        const node = all[i];
        let halves = 0;
        for (let j = 0; j < node.childNodes.length; j += 1) {
          const child = node.childNodes[j];
          if (child.nodeType === 3) halves += 1;
          else if (child.nodeType === 1 && child.hasAttribute && child.hasAttribute('data-doki-seg')) halves += 1;
        }
        if (halves < 2) continue;
        let depth = 0;
        let walk = node;
        while (walk !== null && walk !== root) {
          depth += 1;
          walk = walk.parentNode;
        }
        if (depth > bestDepth) {
          bestDepth = depth;
          best = node;
        }
      }
      if (best !== null) return best;
      return root.querySelector('[class*="_label" i]');
    }

    /**
     * Wrap each shipped pill's label halves in marked spans so a stylesheet can
     * address them individually. The labels render as [text, "·", text]; the
     * two text nodes survive React updates because React patches a text node's
     * `nodeValue` in place, so moving one into a wrapper keeps it live.
     *
     * Returns a disposer that puts the original shape back.
     */
    function decorateHostPills() {
      if (typeof document === 'undefined' || typeof MutationObserver !== 'function') {
        return () => {};
      }
      const PILLS = ['activity', 'usage'];
      // Both markers are only ever set by this function, so the teardown is
      // exact: unwrap what is still wrapped and leave anything else alone.
      const sweep = () => {
        try {
          for (let i = 0; i < PILLS.length; i += 1) {
            const pill = PILLS[i];
            const root = document.querySelector('[data-composer-stat="' + pill + '"]');
            if (root === null) continue;
            const label = findPillLabel(root);
            if (label === null) continue;
            // The separator is the label's only element child that is not one
            // of our own wrappers; mark it so CSS can retire it together with
            // whichever half is hidden. Skipping `data-doki-seg` matters: on
            // the second sweep the wrappers are element children too.
            const children = label.childNodes;
            for (let j = 0; j < children.length; j += 1) {
              const node = children[j];
              if (node.nodeType !== 1) continue;
              if (node.hasAttribute && node.hasAttribute('data-doki-seg')) continue;
              if (node.getAttribute('data-doki-sep') === null) node.setAttribute('data-doki-sep', pill);
            }
            // One pass over the label's direct children: element = separator
            // (already marked), text = a half that still needs its wrapper.
            let index = 0;
            for (let j = 0; j < children.length; j += 1) {
              const node = children[j];
              if (node === null || node === undefined) continue;
              if (node.nodeType === 3) {
                if (node.nodeValue === null || node.nodeValue === '') continue;
                const span = document.createElement('span');
                span.setAttribute('data-doki-seg', pill + ':' + index);
                try {
                  label.replaceChild(span, node);
                  span.appendChild(node);
                } catch (error) {
                  /* the host replaced the node mid-sweep; retry next round */
                  if (span.parentNode === label) label.replaceChild(node, span);
                }
                index += 1;
              } else if (node.nodeType === 1 && node.hasAttribute && node.hasAttribute('data-doki-seg')) {
                index += 1;
              }
            }
          }
        } catch (error) {
          /* decoration is optional; the pills render fine unwrapped */
        }
      };

      let observer = null;
      try {
        observer = new MutationObserver(sweep);
        observer.observe(document.body, { childList: true, subtree: true, characterData: true });
        sweep();
      } catch (error) {
        console.warn('[doki] dock pill observer skipped:', error);
      }

      return () => {
        try {
          if (observer !== null) observer.disconnect();
        } catch (error) {
          /* nothing to undo */
        }
        try {
          const segs = document.querySelectorAll('[data-doki-seg]');
          for (let i = 0; i < segs.length; i += 1) {
            const span = segs[i];
            const parent = span.parentNode;
            if (parent === null) continue;
            while (span.firstChild !== null) parent.insertBefore(span.firstChild, span);
            parent.removeChild(span);
          }
          const seps = document.querySelectorAll('[data-doki-sep]');
          for (let i = 0; i < seps.length; i += 1) seps[i].removeAttribute('data-doki-sep');
        } catch (error) {
          /* the overlay may already be gone */
        }
      };
    }

    /** Paint the host-visibility flags onto <html>; idempotent. */
    function applyHostFlags(host, seg) {
      try {
        if (typeof document === 'undefined' || document.documentElement === null) return;
        const root = document.documentElement;
        for (let i = 0; i < HOST_FIELDS.length; i += 1) {
          const field = HOST_FIELDS[i];
          if (host[field] === false) root.setAttribute(HOST_FLAG[field], '1');
          else root.removeAttribute(HOST_FLAG[field]);
        }
        if (seg === undefined || seg === null) return;
        for (let i = 0; i < SEG_FIELDS.length; i += 1) {
          const field = SEG_FIELDS[i];
          if (seg[field] === false) root.setAttribute(SEG_FLAG[field], '1');
          else root.removeAttribute(SEG_FLAG[field]);
        }
      } catch (error) {
        /* a locked-down document object only costs the visibility switch */
      }
    }

    function getPrefs() {
      if (prefsCache === null) {
        prefsCache = readPrefs();
        applyHostFlags(prefsCache.host, prefsCache.seg);
      }
      return prefsCache;
    }

    function setPrefs(next) {
      const value = {
        view: normalizePrefs(next),
        host: normalizeHost(next),
        seg: normalizeSeg(next),
      };
      prefsCache = value;
      writePrefs(value);
      applyHostFlags(value.host, value.seg);
      prefListeners.forEach((listener) => {
        try {
          listener(value);
        } catch (error) {
          /* one bad subscriber must not stop the rest */
        }
      });
    }

    function subscribePrefs(listener) {
      prefListeners.add(listener);
      return () => {
        prefListeners.delete(listener);
      };
    }


    function pad2(value) {
      return value < 10 ? '0' + value : String(value);
    }
    /** Compact duration: 42秒 / 3分05秒 / 1时02分. */
    function formatDuration(ms, t) {
      const total = Math.max(0, Math.round(ms / 1000));
      const hours = Math.floor(total / 3600);
      const minutes = Math.floor((total % 3600) / 60);
      const seconds = total % 60;
      if (hours > 0) return hours + t('hour') + pad2(minutes) + t('minute');
      if (minutes > 0) return minutes + t('minute') + pad2(seconds) + t('second');
      return seconds + t('second');
    }

    /**
     * Fold the shipped `sessionStats` projection into two display figures.
     *
     * The projection is optional and its shape is owned by the host, so every
     * read is a `typeof === 'number'` test: a missing or reshaped value turns
     * into `null` and the caller simply drops that segment instead of printing
     * `NaN`. `null` (never 0) is the "nothing to show" answer — `0s` is a real
     * reading on a fresh session and must stay printable.
     */
    function sessionTotals(stats) {
      const out = { elapsedMs: null, ttftMs: null };
      if (stats === null || typeof stats !== 'object') return out;
      const llm = stats.llmMs;
      const tool = stats.toolMs;
      if (typeof llm === 'number' && typeof tool === 'number' && llm >= 0 && tool >= 0) {
        out.elapsedMs = llm + tool;
      }
      const ttft = stats.ttftMs;
      const steps = stats.ttftSteps;
      if (typeof ttft === 'number' && typeof steps === 'number' && steps > 0 && ttft >= 0) {
        out.ttftMs = ttft / steps;
      }
      return out;
    }

    /** Sub-second readings matter for TTFT, so it gets its own formatter. */
    function formatBrief(ms) {
      const value = Math.max(0, ms);
      // Below ten seconds a tenth is the useful precision; above it a whole
      // second is, and printing "12.4s" there would only add noise.
      return value < 10000
        ? (Math.round(value / 100) / 10) + 's'
        : Math.round(value / 1000) + 's';
    }

    /** True while the caret sits in a composer-style editable. */
    function isComposerFocused() {
      if (typeof document === 'undefined') return false;
      if (typeof document.hasFocus === 'function' && !document.hasFocus()) return false;
      const active = document.activeElement;
      if (active === null || active === undefined) return false;
      // Positive signal first: the shipped composer editor marks itself with
      // `data-composer-input`, so a match is unambiguous even inside dialogs.
      if (typeof active.closest === 'function' && active.closest('[data-composer-input]') !== null) return true;
      let editable = active.isContentEditable === true;
      if (!editable && typeof active.getAttribute === 'function') {
        editable = active.getAttribute('role') === 'textbox' &&
          active.getAttribute('contenteditable') !== 'false';
      }
      if (!editable) return false;
      if (typeof active.closest === 'function' && active.closest('[role="dialog"]') !== null) return false;
      return true;
    }

    /** Read the composer's live committed text, preferring the real DOM. */
    function readComposerText(fallback) {
      if (typeof document === 'undefined') return typeof fallback === 'string' ? fallback : '';
      let node = null;
      // The focused editor owns the caret, so prefer it: several sessions can
      // be mounted at once and `querySelector` would pick whichever is first.
      const active = document.activeElement;
      if (active !== null && active !== undefined && typeof active.closest === 'function') {
        node = active.closest('[data-composer-input]');
      }
      if ((node === null || node === undefined) && typeof document.querySelector === 'function') {
        node = document.querySelector('[data-composer-input]');
      }
      if (node !== null && node !== undefined) {
        const text = typeof node.innerText === 'string' ? node.innerText : node.textContent;
        if (typeof text === 'string') {
          // An empty contenteditable reports a single "\n" for its blank
          // paragraph; that is a rendering artifact, not a typed character.
          return text.replace(/\n$/g, '');
        }
      }
      return typeof fallback === 'string' ? fallback : '';
    }

    /** 14px clock, drawn inline so no icon package has to resolve. */
    function ClockIcon(props) {
      return h(
        'svg',
        {
          viewBox: '0 0 16 16',
          width: props && props.size ? props.size : 14,
          height: props && props.size ? props.size : 14,
          'aria-hidden': 'true',
          focusable: 'false',
        },
        h('circle', {
          cx: 8, cy: 8, r: 6.1,
          fill: 'none', stroke: 'currentColor', strokeWidth: 1.3,
        }),
        h('path', {
          d: 'M8 4.6V8.1l2.3 1.6',
          fill: 'none', stroke: 'currentColor', strokeWidth: 1.3,
          strokeLinecap: 'round', strokeLinejoin: 'round',
        })
      );
    }

    function TypingStats(props) {
      const t = typeof props.t === 'function'
        ? props.t
        : (key) => (DICT.zh[key] !== undefined ? DICT.zh[key] : key);

      const stats = getStore();

      // Which figures the bar shows. `useSyncExternalStore` would be tidier but
      // the documented builtin surface is React itself, so a plain effect
      // subscription keeps this working on any build.
      const [prefs, setLocalPrefs] = useState(getPrefs);
      useEffect(() => subscribePrefs(setLocalPrefs), []);

      const [, setVersion] = useState(0);
      const bump = useCallback(() => setVersion((v) => v + 1), []);

      // The slot contract always hands a session-scoped `useInput` hook. Guard
      // the shape without ever skipping a hook call: the fallback hook is a
      // hook-shaped stand-in, so the hook order stays identical either way.
      const useInput = typeof props.useInput === 'function' ? props.useInput : function useNoInput() {
        useState(0);
        return undefined;
      };
      const draft = useInput((s) => s.draft);
      const draftRev = useInput((s) => s.draftRev);
      const draftText = typeof draft === 'string' ? draft : '';
      const sessionKey = typeof props.sessionId === 'string' ? props.sessionId : '';

      // The shipped session totals ride the `sessionStats` projection. It is an
      // optional read: an assembly without that projection must still render the
      // typing figures, so the fallback hook has the same shape and returns
      // undefined instead of being skipped (hook order stays identical).
      const useProjection = typeof props.useProjection === 'function' ? props.useProjection : function useNoProjection() {
        useState(0);
        return undefined;
      };
      const sessionStats = useProjection('sessionStats');
      const totals = sessionTotals(sessionStats);

      const draftRef = useRef(draftText);
      draftRef.current = draftText;
      const composingRef = useRef(false);

      // Cumulative tally. The delta is taken against the last committed text,
      // so deletions never subtract and pasting counts what it inserts.
      useEffect(() => {
        if (composingRef.current) return;
        if (sessionKey !== stats.charsSession) {
          stats.charsSession = sessionKey;
          stats.lastText = draftText;
          return;
        }
        const added = insertedChars(stats.lastText, draftText);
        stats.lastText = draftText;
        if (added > 0) {
          stats.chars += added;
          bump();
        }
      }, [draftText, sessionKey, stats, bump]);

      // IME guard: while a composition session is open the editor may hold the
      // pinyin buffer, which is not typed text yet. Freeze the tally, then on
      // commit diff the pre-composition text against the committed text so the
      // Chinese characters count once and the pinyin letters never do.
      useEffect(() => {
        if (typeof document === 'undefined' || typeof document.addEventListener !== 'function') return undefined;
        const inComposer = (node) => node !== null && node !== undefined &&
          typeof node.closest === 'function' && node.closest('[data-composer-input]') !== null;
        // At most one settle per composition: whichever runs first (the draft
        // effect or this DOM sample) books the delta, the other sees zero.
        let settled = true;
        const settle = () => {
          if (settled) return;
          settled = true;
          try {
            const next = readComposerText(draftRef.current);
            const added = insertedChars(stats.lastText, next);
            stats.lastText = next;
            if (added > 0) {
              stats.chars += added;
              bump();
            }
          } catch (error) {
            console.warn('[doki] composition settle skipped:', error);
          }
        };
        const onStart = (event) => {
          if (!inComposer(event.target)) return;
          composingRef.current = true;
          settled = false;
        };
        const onEnd = (event) => {
          if (!inComposer(event.target)) return;
          composingRef.current = false;
          // The editor commits right after this event; sample once on the
          // next task and once on the next frame so a late update cannot
          // leave the tally stale.
          window.setTimeout(settle, 0);
          if (typeof window.requestAnimationFrame === 'function') window.requestAnimationFrame(settle);
        };
        document.addEventListener('compositionstart', onStart, true);
        document.addEventListener('compositionend', onEnd, true);
        return () => {
          document.removeEventListener('compositionstart', onStart, true);
          document.removeEventListener('compositionend', onEnd, true);
        };
      }, [stats, bump]);

      // Typing time: draftRev advances only when the draft really changed, so
      // caret movement and menus never count. Pinyin keystrokes DO count here
      // (they are real typing), only the character tally ignores the buffer.
      useEffect(() => {
        if (typeof draftRev !== 'number' || draftRev < 0) return;
        // Switching sessions must never look like a giant edit: re-baseline
        // against the new session's own draft and start counting from there.
        if (sessionKey !== stats.typingSession) {
          stats.typingSession = sessionKey;
          stats.lastRev = draftRev;
          stats.lastEditAt = 0;
          return;
        }
        if (draftRev === stats.lastRev) return;
        const now = Date.now();
        if (stats.lastRev !== -1 && stats.lastEditAt > 0) {
          const gap = now - stats.lastEditAt;
          if (gap > 0 && gap <= GAP_LIMIT_MS) stats.typingMs += gap;
        }
        stats.lastRev = draftRev;
        stats.lastEditAt = now;
        bump();
      }, [draftRev, sessionKey, stats, bump]);

      // Thinking signal: caret in the composer, no edit for a while. The shared
      // lastTickAt keeps a second mounted copy from counting the same second.
      useEffect(() => {
        const handle = window.setInterval(() => {
          if (!isComposerFocused()) return;
          const now = Date.now();
          const idle = stats.lastEditAt === 0 ? Infinity : now - stats.lastEditAt;
          if (idle < IDLE_AFTER_MS) return;
          if (now - stats.lastTickAt < TICK_MS * 0.75) return;
          stats.lastTickAt = now;
          stats.thinkingMs += TICK_MS;
          bump();
        }, TICK_MS);
        return () => window.clearInterval(handle);
      }, [stats, bump]);

      // ---- pill dialog -------------------------------------------------------
      const [open, setOpen] = useState(false);
      const [pos, setPos] = useState(null);
      const rootRef = useRef(null);
      const panelRef = useRef(null);

      const close = useCallback(() => setOpen(false), []);

      useEffect(() => {
        if (!open) {
          setPos(null);
          return undefined;
        }
        const measure = () => {
          const root = rootRef.current;
          if (root === null || root === undefined) return;
          const rect = root.getBoundingClientRect();
          const panel = panelRef.current;
          const width = panel ? panel.offsetWidth : 300;
          const height = panel ? panel.offsetHeight : 0;
          const viewportW = window.innerWidth;
          const viewportH = window.innerHeight;
          let left = rect.left;
          if (left + width > viewportW - PANEL_MARGIN) left = viewportW - PANEL_MARGIN - width;
          if (left < PANEL_MARGIN) left = PANEL_MARGIN;
          let top = rect.top - PANEL_GAP - height;
          if (top < PANEL_MARGIN) top = Math.min(rect.bottom + PANEL_GAP, viewportH - PANEL_MARGIN - height);
          if (top < PANEL_MARGIN) top = PANEL_MARGIN;
          setPos((prev) => (
            prev !== null && Math.abs(prev.left - left) < 1 && Math.abs(prev.top - top) < 1
              ? prev
              : { left: left, top: top }
          ));
        };
        measure();
        const frame = typeof window.requestAnimationFrame === 'function'
          ? window.requestAnimationFrame(measure)
          : window.setTimeout(measure, 0);
        const onPointerDown = (event) => {
          const target = event.target;
          const root = rootRef.current;
          const panel = panelRef.current;
          if (root !== null && root !== undefined && root.contains(target)) return;
          if (panel !== null && panel !== undefined && panel.contains(target)) return;
          setOpen(false);
        };
        const onKeyDown = (event) => {
          if (event.key === 'Escape') setOpen(false);
        };
        document.addEventListener('mousedown', onPointerDown, true);
        document.addEventListener('keydown', onKeyDown, true);
        window.addEventListener('resize', measure);
        window.addEventListener('scroll', measure, true);
        return () => {
          if (typeof window.cancelAnimationFrame === 'function') window.cancelAnimationFrame(frame);
          else window.clearTimeout(frame);
          document.removeEventListener('mousedown', onPointerDown, true);
          document.removeEventListener('keydown', onKeyDown, true);
          window.removeEventListener('resize', measure);
          window.removeEventListener('scroll', measure, true);
        };
      }, [open]);

      // The bar carries only the figures the user picked in Settings; the
      // dialog below always lists all three, so nothing becomes unreachable
      // when a chip is switched off.
      const view = prefs.view;
      const segments = [];
      if (view.typing) segments.push(t('typing') + ' ' + formatDuration(stats.typingMs, t));
      if (view.chars) segments.push(t('chars') + ' ' + String(stats.chars) + t('char'));
      if (view.thinking) segments.push(t('thinking') + ' ' + formatDuration(stats.thinkingMs, t));
      // The two projected figures are dropped when the host serves nothing —
      // a session with no generated turn has no TTFT to average, and printing
      // a placeholder there would be a lie dressed as a measurement.
      if (view.elapsed && totals.elapsedMs !== null) {
        segments.push(t('elapsed') + ' ' + formatDuration(totals.elapsedMs, t));
      }
      if (view.ttft && totals.ttftMs !== null) {
        segments.push(t('ttft') + ' ' + formatBrief(totals.ttftMs));
      }

      // With every chip off the bar renders nothing at all: an empty pill would
      // leave a clickable gap in the dock with no label to explain it.
      if (segments.length === 0) return null;

      const labelChildren = [];
      for (let i = 0; i < segments.length; i += 1) {
        if (i > 0) {
          labelChildren.push(h('span', { key: 'sep' + i, className: 'doki-sep', 'aria-hidden': 'true' }, '·'));
        }
        labelChildren.push(segments[i]);
      }

      const label = h('span', { className: 'doki-label' }, labelChildren);

      const pill = h(
        'span',
        { className: 'doki-anchor', 'data-composer-stat': 'doki', ref: rootRef },
        h(
          'button',
          {
            type: 'button',
            className: 'doki-pill',
            'aria-haspopup': 'dialog',
            'aria-expanded': open ? 'true' : 'false',
            'aria-label': t('hint'),
            onClick: () => setOpen((value) => !value),
          },
          h(ClockIcon, null),
          label
        )
      );

      let panel = null;
      if (open) {
        const body = h(
          'div',
          {
            ref: panelRef,
            className: 'doki-panel',
            role: 'dialog',
            'aria-label': t('title'),
            style: pos === null ? MEASURE_STYLE : { left: pos.left, top: pos.top },
          },
          h(
            'div',
            { className: 'doki-title' },
            h('span', { className: 'doki-titleLabel' }, h(ClockIcon, null), t('title'))
          ),
          h('div', { className: 'doki-titleRule', 'aria-hidden': 'true' }),
          h(
            'dl',
            { className: 'doki-details' },
            h('dt', null, t('typing')),
            h('dd', null, formatDuration(stats.typingMs, t)),
            h('dt', null, t('chars')),
            h('dd', null, String(stats.chars) + t('char')),
            h('dt', null, t('thinking')),
            h('dd', null, formatDuration(stats.thinkingMs, t)),
            h('dt', null, t('elapsed')),
            h('dd', null, totals.elapsedMs === null ? t('dash') : formatDuration(totals.elapsedMs, t)),
            h('dt', null, t('ttft')),
            h('dd', null, totals.ttftMs === null ? t('dash') : formatBrief(totals.ttftMs))
          )
        );
        panel = ReactDOM !== null && typeof ReactDOM.createPortal === 'function' &&
          typeof document !== 'undefined' && document.body !== null
          ? ReactDOM.createPortal(body, document.body)
          : body;
      }

      return h(React.Fragment, null, pill, panel);
    }

    /**
     * The "Dock" settings page: every entry the dock row can show, ours and the
     * shipped ones, with one switch each. It carries its own copy and write path
     * because a settings section projects no label and passes no props.
     */
    function DockSettings(props) {
      const t = typeof props.t === 'function'
        ? props.t
        : (key) => (DICT.zh[key] !== undefined ? DICT.zh[key] : key);

      const [prefs, setLocalPrefs] = useState(getPrefs);
      useEffect(() => subscribePrefs(setLocalPrefs), []);

      const flip = (group, field) => {
        const next = { ...prefs.view, ...prefs.host, ...prefs.seg };
        if (group === 'seg') {
          next[field] = !prefs.seg[field];
        } else {
          next[field] = !(group === 'view' ? prefs.view[field] : prefs.host[field]);
        }
        // Switching the last figure off is allowed: the bar unmounts itself
        // instead of leaving an empty pill, and this page stays the way back in.
        setPrefs(next);
      };

      // Which halves a shipped pill prints. Shown only while the pill itself is
      // on: with the whole entry hidden these chips would do nothing.
      const segRow = (hostField, fields) => {
        const enabled = prefs.host[hostField] !== false;
        const chips = fields.map((field) => {
          const on = prefs.seg[field] !== false;
          return h(
            'button',
            {
              key: field,
              type: 'button',
              className: 'doki-segChip',
              'aria-pressed': on ? 'true' : 'false',
              'data-disabled': enabled ? 'false' : 'true',
              'data-doki-seg': field,
              title: t('seg' + field.charAt(0).toUpperCase() + field.slice(1)),
              onClick: () => {
                if (!enabled) return;
                flip('seg', field);
              },
            },
            t('seg' + field.charAt(0).toUpperCase() + field.slice(1))
          );
        });
        return h(
          'div',
          { className: 'doki-segs', 'data-doki-segs': hostField },
          h('span', { className: 'doki-segsLabel' }, t('segs')),
          chips
        );
      };

      const item = (group, field, labelKey, descKey, segs) => {
        const checked = group === 'view' ? prefs.view[field] : prefs.host[field];
        return h(
          'div',
          {
            key: group + ':' + field,
            className: 'doki-item',
            'data-off': checked ? 'false' : 'true',
          },
          h(
            'div',
            { className: 'doki-itemText' },
            h('div', { className: 'doki-itemTitle' }, t(labelKey)),
            h('div', { className: 'doki-itemDesc' }, t(descKey)),
            segs === undefined ? null : segs
          ),
          h(
            'button',
            {
              type: 'button',
              role: 'switch',
              className: 'doki-switch',
              'aria-checked': checked ? 'true' : 'false',
              'aria-label': t(labelKey),
              'data-doki-switch': group + ':' + field,
              onClick: () => flip(group, field),
            },
            h('span', { className: 'doki-thumb' })
          )
        );
      };

      return h(
        'div',
        { className: 'doki-page', 'data-doki-settings': 'page' },
        h('p', { className: 'doki-intro' }, t('dockIntro')),

        h(
          'section',
          { className: 'doki-group' },
          h('h4', { className: 'doki-groupTitle' }, t('groupMine')),
          item('view', 'typing', 'showTyping', 'typingDesc'),
          item('view', 'chars', 'showChars', 'charsDesc'),
          item('view', 'thinking', 'showThinking', 'thinkingDesc')
        ),

        h(
          'section',
          { className: 'doki-group' },
          h('h4', { className: 'doki-groupTitle' }, t('groupSession')),
          h('p', { className: 'doki-groupNote' }, t('groupSessionNote')),
          item('view', 'elapsed', 'showElapsed', 'elapsedDesc'),
          item('view', 'ttft', 'showTtft', 'ttftDesc')
        ),

        h(
          'section',
          { className: 'doki-group' },
          h('h4', { className: 'doki-groupTitle' }, t('groupHost')),
          h('p', { className: 'doki-groupNote' }, t('groupHostNote')),
          item('host', 'activity', 'showActivity', 'activityDesc', segRow('activity', ['activityCounts', 'activitySpeed'])),
          item('host', 'usage', 'showUsage', 'usageDesc', segRow('usage', ['usageTokens', 'usageCache'])),
          item('host', 'meter', 'showMeter', 'meterDesc', segRow('meter', ['meterRing', 'meterPercent']))
        ),

        h(
          'div',
          { className: 'doki-pageFoot' },
          h(
            'button',
            {
              type: 'button',
              className: 'doki-reset',
              'data-doki-reset': 'all',
              onClick: () => setPrefs({ ...DEFAULT_PREFS, ...DEFAULT_HOST, ...DEFAULT_SEG }),
            },
            t('reset')
          )
        )
      );
    }

    function apply(ctx) {
      // Every step is guarded on purpose: a throw reaching the fiber marks this
      // entry `failed`, and one failed entry makes the whole web boot refuse to
      // start. Losing a decoration must never cost the user their app.
      if (ctx === undefined || ctx === null) return;

      // The section's nav label is projected by the shell, which reads it
      // outside any slot render, so bind the dictionary here instead of relying
      // on the injected `props.t`.
      let t = (key) => (DICT.zh[key] !== undefined ? DICT.zh[key] : key);
      try {
        if (ctx.locale !== undefined && ctx.locale !== null && typeof ctx.locale.bind === 'function') {
          const bound = ctx.locale.bind(NS);
          if (typeof bound === 'function') t = bound;
        }
      } catch (error) {
        console.warn('[doki] locale binding skipped:', error);
      }

      try {
        ctx.effect(() => {
          try {
            const style = document.createElement('style');
            style.setAttribute('data-plugin', 'dsh-doki');
            style.textContent = CSS;
            document.head.appendChild(style);
            return () => {
              if (style.parentNode !== null) style.parentNode.removeChild(style);
            };
          } catch (error) {
            console.warn('[doki] style injection skipped:', error);
            return () => {};
          }
        }, 'dsh-doki: styles');
      } catch (error) {
        console.warn('[doki] styles effect skipped:', error);
      }

      try {
        ctx.effect(() => {
          try {
            return ctx.locale.register(NS, { zh: DICT.zh, en: DICT.en });
          } catch (error) {
            // A duplicate registration (reload/hot swap) must not fail the entry.
            console.warn('[doki] locale registration skipped:', error);
            return () => {};
          }
        }, 'dsh-doki: locale');
      } catch (error) {
        console.warn('[doki] locale effect skipped:', error);
      }

      // The shell has no icon option for a contributed settings section, so the
      // nav row is decorated whenever the settings overlay is open. A mutation
      // observer is the only hook here: the nav is rebuilt on every open and
      // there is no stable attribute on the row to target from CSS alone.
      try {
        ctx.effect(() => decorateNavRows(t), 'dsh-doki: settings nav glyph');
      } catch (error) {
        console.warn('[doki] settings nav decoration skipped:', error);
      }

      // The shipped pills print two halves per label and expose no switch for
      // either, so their text nodes are wrapped once they appear. The page then
      // addresses each half from CSS. Painting the flags on mount also covers a
      // settings value stored by an earlier session.
      try {
        ctx.effect(() => decorateHostPills(), 'dsh-doki: dock pill segments');
        const start = getPrefs();
        applyHostFlags(start.host, start.seg);
      } catch (error) {
        console.warn('[doki] dock pill decoration skipped:', error);
      }

      try {
        ctx.slots.inject('conversation.composer.dock', () =>
          ctx.slots.register(
            {
              name: 'conversation.composer.dock',
              id: 'doki',
              order: 100,
              locale: NS,
            },
            TypingStats
          )
        );
      } catch (error) {
        console.warn('[doki] slot registration skipped:', error);
      }

      try {
        ctx.slots.inject('settings.section', () =>
          ctx.slots.register(
            {
              name: 'settings.section',
              id: 'dock',
              order: 110,
              label: () => t('dockTitle'),
              locale: NS,
            },
            DockSettings
          )
        );
      } catch (error) {
        console.warn('[doki] dock settings page registration skipped:', error);
      }
    }

    return { inject: ['slots', 'locale'], apply: apply };
  },
});
