// ==UserScript==
// @name         B站抽奖动态清理器
// @namespace    https://github.com/sqkkkr/bilibili-lottery-cleaner
// @version      1.0.2
// @description  自动扫描空间动态，只清理已开奖的转发抽奖动态；未开奖、判定不出的一律保护。
// @author       sqkkkr
// @match        https://space.bilibili.com/*
// @icon         https://cdn.jsdelivr.net/gh/sqkkkr/bilibili-lottery-cleaner@main/icons/icon128.png
// @run-at       document-start
// @grant        none
// @noframes
// @license      MIT
// @homepageURL  https://github.com/sqkkkr/bilibili-lottery-cleaner
// @supportURL   https://github.com/sqkkkr/bilibili-lottery-cleaner/issues
// @downloadURL  https://cdn.jsdelivr.net/gh/sqkkkr/bilibili-lottery-cleaner@main/bilibili-lottery-cleaner.user.js
// @updateURL    https://cdn.jsdelivr.net/gh/sqkkkr/bilibili-lottery-cleaner@main/bilibili-lottery-cleaner.user.js
// ==/UserScript==

/* 由 tools/build_userscript.py 自动生成，不要直接改这个文件。
   源码在 src/ 目录，改完重新跑一遍构建脚本。 */


/* ---------- 样式注入：油猴不能用 manifest 的 css 字段 ---------- */
(function () {
  var css = '/* 面板样式：中性灰为主，圆角克制，不用大色块 */\n#blcl-root {\n  font-family: -apple-system, "Segoe UI", "Microsoft YaHei", "PingFang SC", sans-serif;\n  font-size: 12px;\n  color: #18191c;\n  line-height: 1.6;\n}\n\n/* ---------- 悬浮入口 ---------- */\n#blcl-fab {\n  position: fixed;\n  right: 20px;\n  bottom: 20px;\n  z-index: 99998;\n  height: 32px;\n  padding: 0 12px;\n  border: 0;\n  border-radius: 6px;\n  background: #18191c;\n  color: #fff;\n  font-size: 12px;\n  letter-spacing: .3px;\n  cursor: pointer;\n  opacity: .92;\n}\n#blcl-fab:hover { opacity: 1; }\n\n/* ---------- 面板 ---------- */\n#blcl-panel {\n  position: fixed;\n  right: 20px;\n  bottom: 60px;\n  z-index: 99999;\n  width: 460px;\n  max-height: 76vh;\n  overflow: hidden auto;\n  padding: 14px 16px 12px;\n  background: #fff;\n  border: 1px solid #e5e6e8;\n  border-radius: 8px;\n  box-shadow: 0 6px 24px rgba(0, 0, 0, .08);\n}\n#blcl-panel[hidden] { display: none; }\n\n#blcl-root .b-head {\n  display: flex;\n  align-items: baseline;\n  gap: 8px;\n  margin-bottom: 12px;\n}\n#blcl-root .b-title { font-size: 13px; font-weight: 500; letter-spacing: .2px; }\n#blcl-root .b-mode { font-size: 11px; color: #8a8f99; }\n#blcl-root .b-x {\n  margin-left: auto;\n  border: 0;\n  background: none;\n  padding: 0;\n  font-size: 16px;\n  line-height: 1;\n  color: #b4b7bd;\n  cursor: pointer;\n}\n#blcl-root .b-x:hover { color: #18191c; }\n\n/* ---------- 三个统计 ---------- */\n#blcl-root .b-sum {\n  display: flex;\n  border: 1px solid #e5e6e8;\n  border-radius: 6px;\n  overflow: hidden;\n  margin-bottom: 10px;\n}\n#blcl-root .b-sum-i {\n  flex: 1;\n  padding: 8px 0 7px;\n  text-align: center;\n  border-left: 1px solid #e5e6e8;\n}\n#blcl-root .b-sum-i:first-child { border-left: 0; }\n#blcl-root .b-num { font-size: 18px; font-weight: 500; letter-spacing: -.3px; line-height: 1.2; }\n#blcl-root .b-cap { font-size: 11px; color: #8a8f99; margin-top: 1px; }\n\n#blcl-root .b-status {\n  margin: 0 0 10px;\n  font-size: 11px;\n  color: #8a8f99;\n  word-break: break-all;\n}\n\n/* ---------- 操作条 ---------- */\n#blcl-root .b-bar {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n  margin-bottom: 8px;\n  flex-wrap: wrap;\n}\n#blcl-root .b-bar-thin { color: #8a8f99; }\n#blcl-root .b-spacer { flex: 1; }\n\n#blcl-root .b-btn {\n  height: 28px;\n  padding: 0 12px;\n  border: 1px solid #dcdee2;\n  border-radius: 4px;\n  background: #fff;\n  color: #18191c;\n  font-size: 12px;\n  cursor: pointer;\n}\n#blcl-root .b-btn:hover:not(:disabled) { border-color: #b4b7bd; }\n#blcl-root .b-btn:disabled { opacity: .4; cursor: not-allowed; }\n#blcl-root .b-primary {\n  background: #18191c;\n  border-color: #18191c;\n  color: #fff;\n}\n#blcl-root .b-primary:hover:not(:disabled) { background: #303136; border-color: #303136; }\n#blcl-root .b-danger { color: #c5372f; border-color: #e8d2d0; }\n#blcl-root .b-danger:hover:not(:disabled) { border-color: #c5372f; }\n\n#blcl-root .b-link {\n  border: 0;\n  background: none;\n  padding: 0;\n  font-size: 12px;\n  color: #6b7280;\n  cursor: pointer;\n}\n#blcl-root .b-link:hover { color: #18191c; }\n\n#blcl-root .b-check {\n  display: inline-flex;\n  align-items: center;\n  gap: 4px;\n  font-size: 11px;\n  color: #6b7280;\n  cursor: pointer;\n}\n#blcl-root .b-check input[type="number"] {\n  width: 44px;\n  height: 22px;\n  padding: 0 4px;\n  border: 1px solid #dcdee2;\n  border-radius: 4px;\n  font-size: 11px;\n  color: #18191c;\n}\n\n/* ---------- 列表 ---------- */\n#blcl-root .b-list {\n  max-height: 300px;\n  overflow: auto;\n  border: 1px solid #e5e6e8;\n  border-radius: 6px;\n  margin-bottom: 8px;\n}\n#blcl-root .b-row {\n  display: flex;\n  gap: 8px;\n  padding: 8px 10px;\n  border-bottom: 1px solid #f1f2f3;\n  border-left: 2px solid transparent;\n}\n#blcl-root .b-row:last-child { border-bottom: 0; }\n#blcl-root .b-row.del { border-left-color: #d93a3a; }\n#blcl-root .b-row.pro { border-left-color: #4b7d2e; }\n#blcl-root .b-row.skip { border-left-color: #d8dade; }\n\n#blcl-root .b-pick { padding-top: 2px; }\n#blcl-root .b-body { min-width: 0; flex: 1; }\n\n#blcl-root .b-line {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n  flex-wrap: wrap;\n}\n#blcl-root .b-tag { font-size: 11px; color: #6b7280; flex: none; }\n#blcl-root .b-row.del .b-tag { color: #c5372f; }\n#blcl-root .b-row.pro .b-tag { color: #4b7d2e; }\n#blcl-root .b-time { font-size: 11px; color: #b4b7bd; flex: none; }\n\n#blcl-root .b-sub {\n  flex: 1;\n  min-width: 80px;\n  font-size: 11px;\n  color: #8a8f99;\n  overflow: hidden;\n  white-space: nowrap;\n  text-overflow: ellipsis;\n}\n#blcl-root .b-view { flex: none; color: #6b7280; font-size: 11px; text-decoration: underline; }\n#blcl-root .b-view:hover { color: #18191c; }\n\n#blcl-root .b-empty { padding: 20px; text-align: center; color: #b4b7bd; font-size: 12px; }\n\n/* ---------- 日志 ---------- */\n#blcl-root .b-loghead {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n  padding-top: 6px;\n  border-top: 1px solid #f1f2f3;\n}\n/* 高度写死：日志一多面板就会往上长，按钮跟着跑，点"停止"很别扭 */\n#blcl-root .b-log {\n  height: 150px;\n  overflow: auto;\n  font-size: 11px;\n  line-height: 1.5;\n  color: #9aa0a6;\n}\n#blcl-root .b-log div { padding: 1px 0; word-break: break-all; }\n#blcl-root .b-tip { font-size: 11px; color: #b4b7bd; }\n';
  function apply() {
    var s = document.createElement('style');
    s.setAttribute('data-blcl', '1');
    s.textContent = css;
    (document.head || document.documentElement).appendChild(s);
  }
  apply();
  if (!document.head) {
    document.addEventListener('DOMContentLoaded', function () {
      if (!document.querySelector('style[data-blcl]')) apply();
    });
  }
})();


/* ===== config.js ===== */
/* 全局配置：后续调参只改这个文件 */
(function () {
  'use strict';
  window.BLCL = window.BLCL || {};

  window.BLCL.CFG = {
    VERSION: '1.0.2',      /* 与 manifest.json 的 version 保持一致，界面上会显示 */

    /* ---- 安全开关 ---- */
    /* 用户 2026-10-18 确认扫描与判定准确无误后开放：
       false = 真删。删除前弹窗确认，串行限速 3–8 秒，没有备份（0.5.1 起取消 CSV 导出） */
    dryRun: false,
    requireConfirm: true,  // 删除前弹窗确认
    delWarnOver: 20,       // 单次删除超过这个条数，弹窗里额外警告

    /* ---- 扫描 ---- */
    apiPageMax: 200,       // 接口最多翻多少页（一页约 20 条，达到上限会提示扫描未完整）
    scrollWait: 2000,      // 接口不通走页面下滑时，每次下滑后等待毫秒
    scrollIdleMax: 8,      // 连续几次下滑没有新数据，就判定到底
    scrollRoundMax: 500,   // 下滑次数上限，防死循环
    maxItems: 3000,        // 收集条数上限

    /* ---- 判定 ---- */
    probeGap: 350,         // 查询抽奖状态的间隔毫秒（防风控，别调太小）
    probeTimeout: 8000,    // 单次查询超时毫秒
    lotteryKeyword: /抽奖|开奖/, // 文本兜底用的关键词
    debug: false,          // true 时扫描完在控制台打印每条判定的 ID/原动态ID/文本摘要

    /* ---- 删除 ---- */
    delMin: 3000,          // 删除间隔最小毫秒
    delMax: 8000,          // 删除间隔最大毫秒
    riskPause: 60000,      // 遇到风控码后的暂停毫秒

    /* ---- 页面元素选择器（B站改版后在这里改）---- */
    sel: {
      card: '.bili-dyn-list__item, .bili-dyn-item, [class*="dyn-item"]',
      end: '.bili-dyn-list__end, .bili-dyn-list__empty, [class*="no-more"], [class*="nomore"]'
    }
  };
})();


/* ===== md5.js ===== */
/* 极简 MD5（UTF-8 字符串 → 32 位小写十六进制）
   只给 WBI 签名用，别拿去做安全用途。
   为什么自己写：MV3 content script 不能加载 npm 包，也不想引外部 CDN（多一个域名的权限和风险）。 */
(function () {
  'use strict';
  var B = window.BLCL = window.BLCL || {};

  function add(x, y) {
    var l = (x & 0xFFFF) + (y & 0xFFFF);
    var m = (x >> 16) + (y >> 16) + (l >> 16);
    return (m << 16) | (l & 0xFFFF);
  }
  function rol(n, c) { return (n << c) | (n >>> (32 - c)); }
  function cmn(q, a, b, x, s, t) { return add(rol(add(add(a, q), add(x, t)), s), b); }
  function ff(a, b, c, d, x, s, t) { return cmn((b & c) | (~b & d), a, b, x, s, t); }
  function gg(a, b, c, d, x, s, t) { return cmn((b & d) | (c & ~d), a, b, x, s, t); }
  function hh(a, b, c, d, x, s, t) { return cmn(b ^ c ^ d, a, b, x, s, t); }
  function ii(a, b, c, d, x, s, t) { return cmn(c ^ (b | ~d), a, b, x, s, t); }

  function toUtf8Bytes(str) {
    var out = [], i, c, c2, cp;
    for (i = 0; i < str.length; i++) {
      c = str.charCodeAt(i);
      if (c < 0x80) {
        out.push(c);
      } else if (c < 0x800) {
        out.push(0xC0 | (c >> 6), 0x80 | (c & 63));
      } else if (c < 0xD800 || c >= 0xE000) {
        out.push(0xE0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
      } else {
        i++;
        c2 = str.charCodeAt(i) || 0;
        cp = 0x10000 + (((c & 0x3FF) << 10) | (c2 & 0x3FF));
        out.push(0xF0 | (cp >> 18), 0x80 | ((cp >> 12) & 63), 0x80 | ((cp >> 6) & 63), 0x80 | (cp & 63));
      }
    }
    return out;
  }

  function hex32(n) {
    var s = '', i;
    for (i = 0; i < 4; i++) s += ('0' + ((n >>> (i * 8)) & 0xFF).toString(16)).slice(-2);
    return s;
  }

  B.md5 = function (str) {
    var bytes = toUtf8Bytes(String(str));
    var n = bytes.length;
    bytes.push(0x80);
    while (bytes.length % 64 !== 56) bytes.push(0);
    var bitLen = n * 8;
    var lo = bitLen >>> 0;
    var hi = Math.floor(bitLen / 4294967296);
    for (var k = 0; k < 4; k++) bytes.push((lo >>> (8 * k)) & 0xFF);
    for (var k2 = 0; k2 < 4; k2++) bytes.push((hi >>> (8 * k2)) & 0xFF);

    var a = 1732584193, b = -271733879, c = -1732584194, d = 271733878;
    var M = new Array(16);

    for (var off = 0; off < bytes.length; off += 64) {
      for (var j = 0; j < 16; j++) {
        M[j] = bytes[off + j * 4] |
          (bytes[off + j * 4 + 1] << 8) |
          (bytes[off + j * 4 + 2] << 16) |
          (bytes[off + j * 4 + 3] << 24);
      }
      var oa = a, ob = b, oc = c, od = d;

      a = ff(a, b, c, d, M[0], 7, -680876936); d = ff(d, a, b, c, M[1], 12, -389564586);
      c = ff(c, d, a, b, M[2], 17, 606105819); b = ff(b, c, d, a, M[3], 22, -1044525330);
      a = ff(a, b, c, d, M[4], 7, -176418897); d = ff(d, a, b, c, M[5], 12, 1200080426);
      c = ff(c, d, a, b, M[6], 17, -1473231341); b = ff(b, c, d, a, M[7], 22, -45705983);
      a = ff(a, b, c, d, M[8], 7, 1770035416); d = ff(d, a, b, c, M[9], 12, -1958414417);
      c = ff(c, d, a, b, M[10], 17, -42063); b = ff(b, c, d, a, M[11], 22, -1990404162);
      a = ff(a, b, c, d, M[12], 7, 1804603682); d = ff(d, a, b, c, M[13], 12, -40341101);
      c = ff(c, d, a, b, M[14], 17, -1502002290); b = ff(b, c, d, a, M[15], 22, 1236535329);

      a = gg(a, b, c, d, M[1], 5, -165796510); d = gg(d, a, b, c, M[6], 9, -1069501632);
      c = gg(c, d, a, b, M[11], 14, 643717713); b = gg(b, c, d, a, M[0], 20, -373897302);
      a = gg(a, b, c, d, M[5], 5, -701558691); d = gg(d, a, b, c, M[10], 9, 38016083);
      c = gg(c, d, a, b, M[15], 14, -660478335); b = gg(b, c, d, a, M[4], 20, -405537848);
      a = gg(a, b, c, d, M[9], 5, 568446438); d = gg(d, a, b, c, M[14], 9, -1019803690);
      c = gg(c, d, a, b, M[3], 14, -187363961); b = gg(b, c, d, a, M[8], 20, 1163531501);
      a = gg(a, b, c, d, M[13], 5, -1444681467); d = gg(d, a, b, c, M[2], 9, -51403784);
      c = gg(c, d, a, b, M[7], 14, 1735328473); b = gg(b, c, d, a, M[12], 20, -1926607734);

      a = hh(a, b, c, d, M[5], 4, -378558); d = hh(d, a, b, c, M[8], 11, -2022574463);
      c = hh(c, d, a, b, M[11], 16, 1839030562); b = hh(b, c, d, a, M[14], 23, -35309556);
      a = hh(a, b, c, d, M[1], 4, -1530992060); d = hh(d, a, b, c, M[4], 11, 1272893353);
      c = hh(c, d, a, b, M[7], 16, -155497632); b = hh(b, c, d, a, M[10], 23, -1094730640);
      a = hh(a, b, c, d, M[13], 4, 681279174); d = hh(d, a, b, c, M[0], 11, -358537222);
      c = hh(c, d, a, b, M[3], 16, -722521979); b = hh(b, c, d, a, M[6], 23, 76029189);
      a = hh(a, b, c, d, M[9], 4, -640364487); d = hh(d, a, b, c, M[12], 11, -421815835);
      c = hh(c, d, a, b, M[15], 16, 530742520); b = hh(b, c, d, a, M[2], 23, -995338651);

      a = ii(a, b, c, d, M[0], 6, -198630844); d = ii(d, a, b, c, M[7], 10, 1126891415);
      c = ii(c, d, a, b, M[14], 15, -1416354905); b = ii(b, c, d, a, M[5], 21, -57434055);
      a = ii(a, b, c, d, M[12], 6, 1700485571); d = ii(d, a, b, c, M[3], 10, -1894986606);
      c = ii(c, d, a, b, M[10], 15, -1051523); b = ii(b, c, d, a, M[1], 21, -2054922799);
      a = ii(a, b, c, d, M[8], 6, 1873313359); d = ii(d, a, b, c, M[15], 10, -30611744);
      c = ii(c, d, a, b, M[6], 15, -1560198380); b = ii(b, c, d, a, M[13], 21, 1309151649);
      a = ii(a, b, c, d, M[4], 6, -145523070); d = ii(d, a, b, c, M[11], 10, -1120210379);
      c = ii(c, d, a, b, M[2], 15, 718787259); b = ii(b, c, d, a, M[9], 21, -343485551);

      a = add(a, oa); b = add(b, ob); c = add(c, oc); d = add(d, od);
    }
    return hex32(a) + hex32(b) + hex32(c) + hex32(d);
  };
})();


/* ===== utils.js ===== */
/* 通用工具 + 全局状态 */
(function () {
  'use strict';
  var B = window.BLCL;
  var U = {};

  /* ---------- 基础 ---------- */
  U.sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  U.rnd = function (a, b) { return a + Math.floor(Math.random() * (b - a + 1)); };
  U.esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  U.clamp = function (s, n) { return String(s || '').replace(/\s+/g, ' ').slice(0, n); };

  /* ---------- 登录信息 ---------- */
  U.getCsrf = function () {
    var m = document.cookie.match(/(?:^|;\s*)bili_jct=([^;]+)/);
    return m ? decodeURIComponent(m[1]) : '';
  };
  /* 登录判断：SESSDATA 带 HttpOnly，页面 JS 读不到，不能拿它判断！
     改用非 HttpOnly 的 bili_jct / DedeUserID（bili_jct 同时也是删除接口要用的 csrf） */
  U.isLogin = function () {
    return !!U.getCsrf() || /(?:^|;\s*)DedeUserID=/.test(document.cookie);
  };
  U.getUid = function () {
    var m = location.pathname.match(/\/(\d+)/);
    if (m) return m[1];
    var c = document.cookie.match(/(?:^|;\s*)DedeUserID=([^;]+)/);
    return c ? c[1] : '';
  };
  /* 只有个人空间的「动态」页才启动：space.bilibili.com/{UID}/dynamic
     主页、收藏、追番这些页面一律不构建面板、不收集数据 */
  U.isSpaceDynamicPage = function () {
    var page = location.href.match(/^https:\/\/space\.bilibili\.com\/(\d+)\/dynamic(?:[/?#]|$)/);
    var account = document.cookie.match(/(?:^|;\s*)DedeUserID=(\d+)(?:;|$)/);
    return !!(page && account && page[1] === account[1]);
  };

  /* ---------- 时间 ---------- */
  U.fmtTime = function (ts) {
    if (!ts) return '';
    var d = new Date(ts > 1e12 ? ts : ts * 1000);
    if (isNaN(d.getTime())) return '';
    var p = function (n) { return n < 10 ? '0' + n : '' + n; };
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) +
           ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
  };
  U.daysAgo = function (tsSec) {
    if (!tsSec) return 0;
    return Math.floor((Date.now() - tsSec * 1000) / 86400000);
  };
  /* 时长："45 秒" / "3 分 20 秒" */
  U.fmtDur = function (ms) {
    var s = Math.max(1, Math.round(ms / 1000));
    if (s < 60) return s + ' 秒';
    var m = Math.floor(s / 60), r = s % 60;
    return r ? m + ' 分 ' + r + ' 秒' : m + ' 分钟';
  };

  /* ---------- 日志 ---------- */
  U.log = function (msg) {
    var line = '[' + U.fmtTime(Date.now()).slice(11) + '] ' + msg;
    console.log('[BLCL] ' + msg);
    B.logs.push(line);
    if (B.logs.length > 300) B.logs.shift();
    if (B.ui && B.ui.appendLog) B.ui.appendLog(line);
  };

  /* CSV 导出已移除（2026-10-18 用户要求）：<a download> 在页面上下文里会导致整个页面跳走，
     表现为 Edge 报"无法访问此页面 space.bilibili.comhttps"，而且用户实际用不上。
     以后要恢复的话，别用 blob + a.click()，改用 chrome.downloads（需要 background）或让用户手动复制。 */

  /* ---------- 全局状态 ---------- */
  B.state = {
    uid: '',
    items: new Map(),     // 动态ID -> 接口返回的原始动态对象（诊断用）
    cards: new Map(),     // 页面卡片兜底，仅供核对
    records: [],          // 判定结果数组
    scanning: false,
    deleting: false,
    stop: false,
    source: ''            // 数据来源：接口 / 页面
  };
  B.logs = [];

  B.utils = U;
})();


/* ===== net.js ===== */
/* 网络层：请求封装 + 动态列表接口 */
(function () {
  'use strict';
  var B = window.BLCL;
  var U = B.utils, CFG = B.CFG;
  var N = {};

  /* ---------- 带超时的 JSON 请求 ---------- */
  N.requestJson = function (url, opts) {
    opts = opts || {};
    return new Promise(function (resolve, reject) {
      var controller = new AbortController();
      var timer = setTimeout(function () {
        reject(new Error('超时'));
        controller.abort();
      }, opts.timeout || CFG.probeTimeout);
      fetch(url, {
        method: opts.method || 'GET',
        credentials: 'include',
        headers: Object.assign({ Accept: 'application/json' }, opts.headers || {}),
        body: opts.body,
        signal: controller.signal
      }).then(function (r) {
        if (r.status === 412) return { code: 412, message: 'HTTP 412（请求受限）' };
        return r.json();
      })
        .then(function (j) { clearTimeout(timer); resolve(j); })
        .catch(function (e) { clearTimeout(timer); reject(e); });
    });
  };

  /* ---------- WBI 签名 ----------
     B站部分接口要 w_rid + wts，不带就返回 -352 / -403。
     密钥从 nav 接口拿（img_key + sub_key），按固定表重排出 mixinKey，md5(参数串 + mixinKey) 就是 w_rid。 */
  var MIXIN_TAB = [
    46, 47, 18, 2, 53, 8, 23, 32, 15, 50, 10, 31, 58, 3, 45, 35,
    27, 43, 5, 49, 33, 9, 42, 19, 29, 28, 14, 39, 12, 38, 41, 13,
    37, 48, 7, 16, 24, 55, 40, 61, 26, 17, 0, 1, 60, 51, 30, 4,
    22, 25, 54, 21, 56, 59, 6, 63, 57, 62, 11, 36, 20, 34, 44, 52
  ];

  N.wbi = { img: '', sub: '', ts: 0 };

  function ensureWbi(force) {
    if (!force && N.wbi.img && Date.now() - N.wbi.ts < 3600 * 1000) return Promise.resolve(true);
    return N.requestJson('https://api.bilibili.com/x/web-interface/nav', { timeout: 8000 })
      .then(function (j) {
        var d = j && j.data && j.data.wbi_img;
        if (!d || !d.img_url || !d.sub_url) return false;
        N.wbi.img = d.img_url.split('/').pop().split('.')[0];
        N.wbi.sub = d.sub_url.split('/').pop().split('.')[0];
        N.wbi.ts = Date.now();
        return !!(N.wbi.img && N.wbi.sub);
      })
      .catch(function () { return false; });
  }

  function mixinKey() {
    var raw = N.wbi.img + N.wbi.sub;
    var out = '';
    for (var i = 0; i < MIXIN_TAB.length; i++) out += raw.charAt(MIXIN_TAB[i]) || '';
    return out.slice(0, 32);
  }

  function signedQuery(params) {
    var p = {}, k;
    for (k in params) if (Object.prototype.hasOwnProperty.call(params, k)) p[k] = params[k];
    p.wts = Math.round(Date.now() / 1000);
    var keys = Object.keys(p).sort();
    var parts = [];
    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      var val = String(p[key]).replace(/[!'()*]/g, '');
      parts.push(encodeURIComponent(key) + '=' + encodeURIComponent(val));
    }
    var query = parts.join('&');
    return query + '&w_rid=' + B.md5(query + mixinKey());
  }

  /* ---------- 主动拉取一页动态 ----------
     先用不签名的试；失败了自动补 WBI 签名重试一次（B站改策略时不用改代码）
     返回最后一次响应，调用方靠 code 判断成败 */
  N.fetchFeedPage = async function (uid, offset) {
    var params = {
      host_mid: String(uid),
      offset: offset || '',
      features: 'itemOpusStyle,listOnlyfans,opusBigCover,onlyfansVote,forwardListHidden,decorationCard,commentsNewVersion,onlyfansAssetsV2,ugcDelete,onlyfansQaCard',
      platform: 'web',
      web_location: '333.1387',
      timezone_offset: '-480'
    };
    var eps = [
      'https://api.bilibili.com/x/polymer/web-dynamic/v1/feed/space?',
      'https://api.bilibili.com/x/polymer/web-dynamic/desktop/v1/feed/space?'
    ];
    var last = null;

    /* 第 1 轮：不签名 */
    for (var i = 0; i < eps.length; i++) {
      try {
        var j = await N.requestJson(eps[i] + new URLSearchParams(params).toString(), { timeout: 12000 });
        if (j && (j.code === 412 || j.code === -412)) return j;
        if (j && j.code === 0) { N.signMode = 'none'; return j; }
        last = j;
      } catch (e) {
        last = { code: -999, message: (e && e.message) || '请求异常' };
      }
    }

    /* 第 2 轮：带 WBI 签名 */
    var ok = await ensureWbi(false);
    if (!ok) return last;
    for (var k = 0; k < eps.length; k++) {
      try {
        var j2 = await N.requestJson(eps[k] + signedQuery(params), { timeout: 12000 });
        if (j2 && (j2.code === 412 || j2.code === -412)) return j2;
        if (j2 && j2.code === 0) { N.signMode = 'wbi'; return j2; }
        last = j2;
      } catch (e2) {
        last = { code: -999, message: (e2 && e2.message) || '请求异常' };
      }
    }
    return last;
  };

  /* 签名模式，日志里显示用 */
  N.signMode = '';

  /* ---------- 删除动态（不可逆！调用方必须先过 dryRun 和确认）---------- */
  N.removeDynamic = function (id, dynType) {
    var csrf = U.getCsrf();
    if (!csrf) return Promise.resolve({ code: -1, message: '未登录或取不到 bili_jct' });
    var body = { dyn_id_str: String(id), rid_str: String(id) };
    var t = Number(dynType);
    if (!isNaN(t) && t > 0) body.dyn_type = t;
    return N.requestJson(
      'https://api.bilibili.com/x/dynamic/feed/operate/remove?platform=web&csrf=' + encodeURIComponent(csrf),
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      }
    );
  };

  B.net = N;
})();


/* ===== parser.js ===== */
/* 动态字段解析：把 B站返回的动态对象拆成我们关心的几个字段
   B站改版后，字段变了优先改这里 */
(function () {
  'use strict';
  var B = window.BLCL;
  var P = {};

  /* 动态ID：新版在 id_str，老版可能在 basic.id_str */
  P.itemId = function (it) {
    if (!it) return '';
    return String(
      it.id_str ||
      (it.basic && it.basic.id_str) ||
      it.id ||
      (it.modules && it.modules.module_dynamic && it.modules.module_dynamic.dyn_id_str) || ''
    );
  };

  /* 类型：新版是字符串 DYNAMIC_TYPE_XXX，老版是数字 */
  P.itemTypeLabel = function (it) {
    var t = it.type;
    if (typeof t === 'string') return t;
    if (typeof t === 'number') return 'TYPE_' + t;
    var m = it.modules && it.modules.module_dynamic && it.modules.module_dynamic.major;
    return (m && m.type) || 'UNKNOWN';
  };

  /* 从类型标签里取数字（删除接口的 dyn_type 用） */
  P.numericType = function (label) {
    if (typeof label === 'number') return label;
    var m = String(label || '').match(/TYPE_(\d+)/);
    return m ? Number(m[1]) : 0;
  };

  /* 被转发的"原动态"ID —— 官方抽奖挂在这条动态上，查抽奖状态必须用它
     这一步是最容易搞错的地方：删除用自己这条的 ID，查抽奖用原动态的 ID */
  P.origId = function (it) {
    if (!it) return '';
    var md = it.modules && it.modules.module_dynamic;
    var major = md && md.major;
    var list = (major && major.opus && major.opus.orig) || [];
    for (var i = 0; i < list.length; i++) {
      var o = list[i] || {};
      var id = o.id_str || o.id || o.rid_str || o.rid || o.dyn_id_str;
      if (id) return String(id);
    }
    var src = it.orig || it.origin;
    if (src) {
      var id2 = src.id_str || src.id || src.rid_str || src.rid || src.dyn_id_str;
      if (id2) return String(id2);
    }
    return '';
  };

  /* 是否转发动态：原创动态一律跳过，这里判断错了后果最严重 */
  P.isForward = function (it) {
    if (!it) return false;
    if (it.type === 'DYNAMIC_TYPE_FORWARD' || it.type === 1) return true;
    if (P.origId(it)) return true;                       // 有转发原文 = 转发动态
    var md = it.modules && it.modules.module_dynamic;
    if (md && md.desc && (md.desc.orig || md.desc.origin)) return true;
    return false;
  };

  /* 正文：递归收集所有文本字段。
     转发动态的开奖时间写在"原动态"里，只读外层 desc.text 会漏掉，所以这里整棵树都扫 */
  P.itemText = function (it) {
    var TEXT_KEYS = { text: 1, title: 1, content: 1, summary: 1 };
    var out = [];
    var seen = new WeakSet();

    function walk(o, depth) {
      if (!o || typeof o !== 'object' || depth > 7 || out.length >= 60) return;
      if (seen.has(o)) return;
      seen.add(o);

      if (Array.isArray(o)) {
        for (var i = 0; i < o.length; i++) walk(o[i], depth + 1);
        return;
      }
      for (var k in o) {
        if (!Object.prototype.hasOwnProperty.call(o, k)) continue;
        var v = o[k];
        if (typeof v === 'string') {
          if (TEXT_KEYS[k] && v.trim()) out.push(v.trim());
        } else if (v && typeof v === 'object') {
          walk(v, depth + 1);
        }
      }
    }

    walk(it, 0);
    return out.join('\n').slice(0, 4000);
  };

  P.pubTs = function (it) {
    if (!it) return 0;
    var b = it.basic || {};
    return Number(
      b.pub_ts || it.pub_ts ||
      (it.modules && it.modules.module_author && it.modules.module_author.pub_ts) || 0
    );
  };

  /* ---------- 从页面卡片解析（接口不可用时兜底，仅供核对）----------
     关键：卡片里"互动抽奖"那个链接本身就带 business_id，
     直接拿它去查开奖状态，不用再推原动态 ID，也不用依赖接口拦截 */

  /* 本条动态自己的 ID：卡片头部的时间链接排在最前面，多个链接时取第一个 */
  P.domCardId = function (el) {
    var id = (el.getAttribute && (el.getAttribute('data-did') || el.getAttribute('data-id'))) || '';
    if (id) return String(id);
    var a = el.querySelector('a[href*="/opus/"]') || el.querySelector('a[href*="t.bilibili.com/"]');
    var m = String(a ? a.getAttribute('href') : '').match(/(\d{15,})/);
    return m ? m[1] : '';
  };

  /* 官方抽奖的 business_id：从"互动抽奖"链接的查询参数里取 */
  P.domLotteryId = function (el) {
    var links = el.querySelectorAll('a[href*="lottery"]');
    for (var i = 0; i < links.length; i++) {
      var m = String(links[i].getAttribute('href') || '').match(/business_id=(\d+)/);
      if (m) return m[1];
    }
    var n = el.querySelector('[data-lottery-id], [data-business-id]');
    if (n) {
      return n.getAttribute('data-lottery-id') || n.getAttribute('data-business-id') || '';
    }
    return '';
  };

  P.domTimeText = function (el) {
    var t = el.querySelector('[class*="time"], time');
    if (!t) return '';
    return String(t.getAttribute('title') || t.innerText || '').replace(/\s+/g, ' ').trim();
  };

  P.domCards = function () {
    var out = new Map();
    var nodes = document.querySelectorAll(B.CFG.sel.card);

    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      var txt = (el.innerText || '').replace(/\s+/g, ' ').trim();
      if (!txt) continue;

      /* 空间动态页的卡片不一定带指向自己的链接，取不到 ID 也要收进来，
         否则整张卡片被丢掉 —— 但没 ID 就不能删，后面会标 noId 挡住 */
      var id = P.domCardId(el);
      var key = id || ('dom_' + i);

      out.set(key, {
        key: key,
        id: id,
        noId: true, /* DOM 无法证明该链接属于本人转发，只供核对，不进入删除队列 */
        lotteryId: P.domLotteryId(el),
        isForward: /转发动态/.test(txt) ||
          !!el.querySelector('[class*="forward"], [class*="__orig"], [class*="dyn-orig"]'),
        text: txt,
        timeText: P.domTimeText(el),
        pubTs: 0
      });
    }
    return out;
  };

  /* 页面是否已经到底（出现"没有更多"之类的提示） */
  P.hasEndMark = function () {
    var els = document.querySelectorAll(B.CFG.sel.end);
    for (var i = 0; i < els.length; i++) {
      var t = (els[i].innerText || '').trim();
      if (t && /没有更多|到底了|已经到底|暂无更多/.test(t)) return true;
    }
    return /没有更多|到底了|已经到底/.test((document.body.innerText || '').slice(-400));
  };

  B.parser = P;
})();


/* ===== lottery.js ===== */
/* 抽奖判定：整个插件的核心。规则见 README 第五节。
   原则：任何查不到、报错、超时的情况，一律按"未开奖"保护，绝不进删除队列 */
(function () {
  'use strict';
  var B = window.BLCL;
  var U = B.utils, CFG = B.CFG, P = B.parser, N = B.net;
  var L = {};

  /* 查询统计，给"接口全挂"这种情况留个线索 */
  L.stats = { probe: 0, fail: 0 };

  /* 优先查上次命中官方抽奖的版本；空数据时仍检查另一版本 */
  L.mode = '';

  /* ---------- 查一条动态关联的官方抽奖 ----------
     关键：business_id / dynamic_id 要传"被转发的原动态ID"，不是自己那条转发动态的ID
     status: 0 = 未开奖，2 = 已开奖 */
  async function probeOne(id) {
    var urls = {
      v2: 'https://api.vc.bilibili.com/lottery_svr/v2/lottery_svr/lottery_notice?dynamic_id=' + id,
      v1: 'https://api.vc.bilibili.com/lottery_svr/v1/lottery_svr/lottery_notice?business_id=' + id + '&business_type=1&web_location=333.1330'
    };
    var order = L.mode === 'v1' ? ['v1', 'v2'] : ['v2', 'v1'];

    var empty = false, failed = false;
    for (var i = 0; i < order.length; i++) {
      var key = order[i];
      L.stats.probe++;
      try {
        var j = await N.requestJson(urls[key], { timeout: CFG.probeTimeout });
        if (j && j.code === 0 && j.data && typeof j.data === 'object' && !Array.isArray(j.data)) {
          if (j.data && j.data.lottery_id) {
            L.mode = key;
            return {
              kind: 'official',
              status: Number(j.data.status),
              drawTs: Number(j.data.lottery_time) || 0,
              participants: Number(j.data.participants) || 0
            };
          }
          empty = true; /* 一个版本为空时，仍检查另一个版本 */
        } else {
          failed = true;
          L.stats.fail++;
        }
      } catch (e) {
        failed = true;
        L.stats.fail++;
      }
    }
    return { kind: empty && !failed ? 'none' : 'error' };
  }

  /* 依次用 原动态ID → 自己动态ID 去查，任一命中即返回 */
  L.probeLottery = async function (ids) {
    var failed = false;
    for (var i = 0; i < ids.length; i++) {
      if (!ids[i]) continue;
      var r = await probeOne(ids[i]);
      if (r.kind === 'official') return r;
      if (r.kind === 'error') failed = true;
    }
    return { kind: failed ? 'error' : 'none' };
  };

  /* ---------- 文本兜底：从文案里解析开奖日期 ---------- */
  L.extractDate = function (seg, pubTs) {
    var m, year, month, day;
    m = seg.match(/(20\d{2})\s*[-\/年.]\s*(\d{1,2})\s*[-\/月.]\s*(\d{1,2})\s*[日号]?/);
    if (m) { year = +m[1]; month = +m[2]; day = +m[3]; }
    if (!m) {
      m = seg.match(/(\d{2})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*[日号]?/);
      if (m) { year = 2000 + (+m[1]); month = +m[2]; day = +m[3]; }
    }
    if (!m) {
      m = seg.match(/\b(20\d{2})(\d{2})(\d{2})\b/);
      if (m) { year = +m[1]; month = +m[2]; day = +m[3]; }
    }
    if (!m) {
      m = seg.match(/(\d{1,2})\s*月\s*(\d{1,2})\s*[日号]?|\b(\d{1,2})\s*[\/.\-]\s*(\d{1,2})\b/);
      if (!m || !pubTs) return null;
      /* 用户规则：缺省年份取自己的转发年份，不按今天猜测跨年 */
      year = new Date(pubTs * 1000).getFullYear();
      month = +(m[1] || m[3]); day = +(m[2] || m[4]);
    }
    var tail = seg.slice(m.index + m[0].length);
    var time = tail.match(/^\s*(?:[Tt]|晚上|下午|上午|中午|凌晨|早上)?\s*(\d{1,2})\s*(?:[:：]\s*(\d{2})(?:[:：]\s*(\d{2}))?|[点时](?:\s*(\d{1,2})\s*分?)?)/);
    var hour = time ? +time[1] : 23;
    var minute = time ? +(time[2] || time[4] || 0) : 59;
    var second = time ? +(time[3] || 0) : 59;
    var rest = time ? tail.slice(time[0].length).trim() : '';
    if (time && /[点时]$/.test(time[0]) && /^半/.test(rest)) { minute = 30; rest = rest.slice(1); }
    /* 不把“一刻”“PM”等未支持的时刻尾部静默丢掉，避免提前判为已开奖 */
    if (time && /^(?:[一二三四五六七八九十零〇两\d半]|[:：]|am\b|pm\b)/i.test(rest)) return null;
    if (time && /下午|晚上/.test(time[0]) && hour < 12) hour += 12;
    if (time && /凌晨|上午|早上/.test(time[0]) && hour === 12) hour = 0;
    if (time && /中午/.test(time[0]) && hour < 11) hour += 12;
    var d = new Date(year, month - 1, day, hour, minute, second);
    /* Date 会自动将 2月30日等非法值顺延，必须拒绝 */
    if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day ||
        d.getHours() !== hour || d.getMinutes() !== minute || d.getSeconds() !== second) return null;
    return d;
  };

  L.parseDrawDate = function (text, pubTs) {
    if (!text) return 0;
    var segs = String(text).replace(/\s+/g, ' ').split(/[\n。！!；;，,、|｜·•\r]+/);
    var best = 0;
    for (var i = 0; i < segs.length; i++) {
      if (!/抽奖|开奖|截止|结束|公布(?:结果|名单)/.test(segs[i])) continue;
      var dates = Array.from(segs[i].matchAll(/20\d{2}\s*[-\/年.]\s*\d{1,2}\s*[-\/月.]\s*\d{1,2}\s*[日号]?|\d{2}\s*年\s*\d{1,2}\s*月\s*\d{1,2}\s*[日号]?|\b20\d{6}\b|\d{1,2}\s*月\s*\d{1,2}\s*[日号]?|\b\d{1,2}\s*[\/.\-]\s*\d{1,2}\b/g));
      for (var k = 0; k < dates.length; k++) {
        var end = k + 1 < dates.length ? dates[k + 1].index : segs[i].length;
        var d = L.extractDate(segs[i].slice(dates[k].index, end), pubTs);
        if (!d || isNaN(d.getTime())) return 0; /* 有歧义/非法日期时不凭另一个日期放行 */
        var t = d.getTime();
        if (t > best) best = t; /* 同句多个日期也取最晚，避免把开始日期当作结束日期 */
      }
    }
    return best ? Math.floor(best / 1000) : 0;
  };

  /* ---------- 单条判定 ----------
     verdict:
       deletable      可删：官方已开奖，或文本判定开奖时间已过
       protected      未开奖：官方抽奖未开奖，或文本判定日期未到
       skip_original  原创动态，直接跳过
       skip_nolottery 转发但没有抽奖特征 / 提了抽奖但没写开奖时间（无法确认，直接跳过） */
  L.classify = async function (it) {
    var rec = {
      id: P.itemId(it),
      origId: P.origId(it),
      type: P.itemTypeLabel(it),
      pubTs: P.pubTs(it),
      text: P.itemText(it) || '',
      verdict: 'skip_nolottery',
      reason: '',
      drawTs: 0,
      weak: false,
      checked: false,
      deleted: false,
      err: ''
    };

    /* ① 原创动态不看 */
    if (!P.isForward(it)) {
      rec.verdict = 'skip_original';
      rec.reason = '原创动态';
      return rec;
    }

    /* ② 查官方抽奖（原动态ID优先） */
    var lot;
    try {
      lot = await L.probeLottery([rec.origId, rec.id]);
    } catch (e) {
      lot = { kind: 'error' };
    }

    if (lot.kind === 'error') {
      rec.verdict = 'protected';
      rec.reason = '抽奖状态查询失败，暂时保护，请重扫';
      return rec;
    }

    if (lot.kind === 'official') {
      rec.drawTs = lot.drawTs;
      if (lot.status === 2) {
        rec.verdict = 'deletable';
        rec.reason = '官方抽奖已开奖' + (lot.participants ? ' · ' + lot.participants + ' 人参与' : '');
      } else {
        rec.verdict = 'protected';
        rec.reason = '官方抽奖未开奖' + (lot.drawTs ? ' · ' + U.fmtTime(lot.drawTs) + ' 开奖' : '');
      }
      return rec;
    }

    /* ③ 没有官方数据，看文案里有没有抽奖/开奖字样 */
    if (CFG.lotteryKeyword.test(rec.text)) {
      var dts = L.parseDrawDate(rec.text, rec.pubTs);
      rec.drawTs = dts;
      rec.weak = true;
      if (!dts) {
        /* 用户明确要求：没写开奖时间的，直接跳过 */
        rec.verdict = 'skip_nolottery';
        rec.reason = '文本开奖时间无法确认，请打开原动态核对';
      } else if (dts * 1000 < Date.now()) {
        rec.verdict = 'deletable';
        rec.reason = '文本判定开奖已过 · ' + U.fmtTime(dts);
      } else {
        rec.verdict = 'protected';
        rec.reason = '文本判定未到开奖时间 · ' + U.fmtTime(dts);
      }
      return rec;
    }

    rec.reason = '转发动态，无抽奖特征';
    return rec;
  };

  /* ---------- 页面卡片判定（主流程）----------
     c: { id, lotteryId, isForward, text, timeText }
     卡片上有"互动抽奖"链接时，lotteryId 就是官方抽奖的 business_id，直接拿去查 */
  L.classifyCard = async function (c) {
    var rec = {
      id: c.id || c.key || '',
      noId: true, /* 页面兜底一律不执行删除 */
      origId: c.lotteryId || '',
      type: 'DOM',
      pubTs: c.pubTs || 0,
      timeText: c.timeText || '',
      text: c.text || '',
      verdict: 'skip_nolottery',
      reason: '',
      drawTs: 0,
      weak: false,
      checked: false,
      deleted: false,
      err: ''
    };

    if (!c.isForward) {
      rec.verdict = 'skip_original';
      rec.reason = '原创动态';
      return rec;
    }

    var ids = [];
    if (c.lotteryId) ids.push(c.lotteryId);
    if (c.id) ids.push(c.id);

    var lot = { kind: 'none' };
    try { lot = await L.probeLottery(ids); } catch (e) { lot = { kind: 'error' }; }

    if (lot.kind === 'error') {
      rec.verdict = 'protected';
      rec.reason = '抽奖状态查询失败，暂时保护，请重扫';
      return rec;
    }

    if (lot.kind === 'official') {
      rec.drawTs = lot.drawTs;
      if (lot.status === 2) {
        rec.verdict = 'deletable';
        rec.reason = '官方抽奖已开奖' + (lot.participants ? ' · ' + lot.participants + ' 人参与' : '');
      } else {
        rec.verdict = 'protected';
        rec.reason = '官方抽奖未开奖' + (lot.drawTs ? ' · ' + U.fmtTime(lot.drawTs) + ' 开奖' : '');
      }
      return rec;
    }

    /* 卡片上明确有官方抽奖标记，但查不到状态：宁可保护 */
    if (c.lotteryId || /互动抽奖/.test(rec.text)) {
      rec.verdict = 'protected';
      rec.reason = c.lotteryId ? '有官方抽奖但状态查询失败' : '有互动抽奖标记但取不到抽奖ID';
      return rec;
    }

    /* 文本兜底 */
    if (CFG.lotteryKeyword.test(rec.text)) {
      var dts = L.parseDrawDate(rec.text, rec.pubTs);
      rec.drawTs = dts;
      rec.weak = true;
      if (!dts) {
        rec.verdict = 'skip_nolottery';
        rec.reason = '文本开奖时间无法确认，请打开原动态核对';
      } else if (dts * 1000 < Date.now()) {
        rec.verdict = 'deletable';
        rec.reason = '文本判定开奖已过 · ' + U.fmtTime(dts);
      } else {
        rec.verdict = 'protected';
        rec.reason = '文本判定未到开奖时间 · ' + U.fmtTime(dts);
      }
      return rec;
    }

    rec.reason = '转发动态，无抽奖特征';
    return rec;
  };

  B.lottery = L;
})();


/* ===== scanner.js ===== */
/* 扫描流程
   主路径：**直接翻页读接口**（快、全、带真动态 ID，删除必须有它）。
   页面下滑 / 卡片解析只在接口不通时兜底 —— 它拿不到动态 ID，只能判定不能删。

   历史教训（别再回头折腾）：拦截页面 fetch 行不通，B站把原生 fetch 存进了自己的模块变量，
   外面再包装 window.fetch 对它无效。 */
(function () {
  'use strict';
  var B = window.BLCL;
  var U = B.utils, CFG = B.CFG, P = B.parser, N = B.net, L = B.lottery;
  var S = {};

  S.lastErr = '';
  S.readStatus = { complete: false, reason: '' };

  /* ---------- 主路径：接口翻页到底 ---------- */
  S.apiAll = async function (uid, onProgress) {
    var offset = '', page = 0, seenOffsets = new Set();
    S.lastErr = '';
    S.readStatus = { complete: false, reason: '', missingIds: 0 };

    while (page < CFG.apiPageMax && !B.state.stop) {
      page++;
      seenOffsets.add(offset);
      var j;
      for (var attempt = 0; attempt < 3 && !B.state.stop; attempt++) {
        try { j = await N.fetchFeedPage(uid, offset); }
        catch (e) { j = { code: -999, message: (e && e.message) || '请求异常' }; }
        if (j && j.code === 0) break;
        if (j && (j.code === -352 || j.code === 412 || j.code === -412)) break;
        if (attempt < 2 && !B.state.stop) {
          onProgress('第 ' + page + ' 页读取失败，重试 ' + (attempt + 1) + '/2');
          await U.sleep(1000);
        }
      }
      if (B.state.stop && !j) break;

      if (!j) { S.lastErr = '无响应'; onProgress('接口无响应'); break; }
      if (j.code !== 0) {
        S.lastErr = 'code=' + j.code + ' ' + (j.message || j.msg || '');
        onProgress('接口返回 ' + S.lastErr);
        break;
      }

      if (!j.data || !Array.isArray(j.data.items)) {
        S.lastErr = '第 ' + page + ' 页响应缺少动态列表';
        break;
      }
      var items = j.data.items;
      var added = 0;
      for (var i = 0; i < items.length; i++) {
        var id = P.itemId(items[i]);
        if (!id) S.readStatus.missingIds++;
        if (id && !B.state.items.has(id)) { B.state.items.set(id, items[i]); added++; }
      }
      onProgress('读取第 ' + page + ' 页 · 新增 ' + added + ' · 累计 ' + B.state.items.size + ' 条');

      if (j.data.has_more === false || j.data.has_more === 0 || j.data.has_more === '0') {
        S.readStatus.complete = true;
        break;
      }
      if (!(j.data.has_more === true || j.data.has_more === 1 || j.data.has_more === '1')) {
        S.lastErr = '第 ' + page + ' 页未返回有效的 has_more';
        break;
      }

      var next = j.data.offset == null ? '' : String(j.data.offset);
      if (!next || seenOffsets.has(next)) {
        S.lastErr = '第 ' + page + ' 页游标缺失或循环，接口仍提示有下一页';
        break;
      }
      offset = next;
      await U.sleep(U.rnd(250, 550));
    }

    if (B.state.stop) S.readStatus.reason = '用户停止读取';
    else if (S.lastErr) S.readStatus.reason = S.lastErr;
    else if (!S.readStatus.complete) S.readStatus.reason = '达到扫描页数上限 ' + CFG.apiPageMax;
    if (S.readStatus.missingIds) {
      S.readStatus.complete = false;
      S.readStatus.reason += (S.readStatus.reason ? '；' : '') + S.readStatus.missingIds + ' 条缺少动态ID';
    }
    if (!S.readStatus.complete) onProgress('扫描未完整：' + S.readStatus.reason + '；保留已读取的 ' + B.state.items.size + ' 条');

    if (N.signMode === 'wbi' && B.state.items.size) onProgress('接口已带 WBI 签名');
    return B.state.items.size;
  };

  /* ---------- 兜底：页面下滑 + 卡片解析 ---------- */
  var scrollerEl = null;

  function findScroller() {
    var nodes = document.querySelectorAll('div, main, section');
    for (var i = 0; i < nodes.length; i++) {
      var n = nodes[i];
      if (n.scrollHeight > n.clientHeight + 200 &&
          /(auto|scroll)/.test(getComputedStyle(n).overflowY)) {
        return n;
      }
    }
    return null;
  }

  function toBottom() {
    var h = Math.max(document.body ? document.body.scrollHeight : 0, document.documentElement.scrollHeight);
    var y0 = window.scrollY || document.documentElement.scrollTop || 0;
    window.scrollTo(0, h);
    if ((window.scrollY || 0) <= y0 + 10 && h > window.innerHeight) {
      if (!scrollerEl) scrollerEl = findScroller();
      if (scrollerEl) scrollerEl.scrollTop = scrollerEl.scrollHeight;
    }
  }

  S.collectDom = function () {
    var cards = P.domCards();
    var added = 0;
    cards.forEach(function (v, k) {
      var old = B.state.cards.get(k);
      if (!old) {
        B.state.cards.set(k, v);
        added++;
      } else if (!old.lotteryId && v.lotteryId) {
        old.lotteryId = v.lotteryId;
      }
    });
    return added;
  };

  S.autoScroll = async function (onProgress) {
    var idle = 0, rounds = 0, lastTotal = 0;
    S.collectDom();

    while (!B.state.stop && rounds < CFG.scrollRoundMax) {
      toBottom();
      await U.sleep(CFG.scrollWait + U.rnd(0, 500));

      var added = S.collectDom();
      var total = B.state.cards.size;
      rounds++;

      idle = (added > 0 || total > lastTotal) ? 0 : idle + 1;
      lastTotal = total;
      if (onProgress) onProgress('下滑中 · 已收集 ' + total + ' 条（第 ' + rounds + ' 次）');

      if (P.hasEndMark()) { if (onProgress) onProgress('已到页面底部'); return; }
      if (idle >= CFG.scrollIdleMax) { if (onProgress) onProgress('连续 ' + idle + ' 次无新增，判定已到底'); return; }
      if (total >= CFG.maxItems) { if (onProgress) onProgress('已达收集上限'); return; }
    }
  };

  /* ---------- 诊断：什么都拿不到时，把原因摊开写进日志 ---------- */
  S.diagnose = async function (uid, onProgress) {
    try {
      var sels = ['.bili-dyn-list__item', '.bili-dyn-item', '[class*="dyn-item"]', '[data-did]'];
      var counts = sels.map(function (s) { return document.querySelectorAll(s).length; });
      onProgress('诊断 · 卡片节点 ' + counts.join(' / ') + '（按上面选择器顺序）');

      var el = document.querySelector('.bili-dyn-list__item') || document.querySelector('[class*="dyn-item"]');
      if (el) {
        var attrs = Array.prototype.slice.call(el.attributes).map(function (a) { return a.name; }).join(',');
        var links = Array.prototype.slice.call(el.querySelectorAll('a[href]'), 0, 5)
          .map(function (a) { return a.getAttribute('href'); }).join(' | ');
        onProgress('诊断 · 首卡属性 [' + attrs + ']');
        onProgress('诊断 · 首卡链接 ' + U.clamp(links, 180));
      } else {
        onProgress('诊断 · 页面里没有匹配到任何卡片节点');
      }

      var j = await N.fetchFeedPage(uid, '');
      var n = (j && j.data && j.data.items && j.data.items.length) || 0;
      onProgress('诊断 · 接口 code=' + (j && j.code) + ' msg=' + ((j && (j.message || j.msg)) || '-') + ' items=' + n);
      if (n) {
        var it = j.data.items[0];
        onProgress('诊断 · 首条 type=' + P.itemTypeLabel(it) + ' id=' + P.itemId(it) + ' 原动态=' + (P.origId(it) || '-'));
      }
    } catch (e) {
      onProgress('诊断 · 出错 ' + ((e && e.message) || e));
    }
  };

  /* ---------- 主流程 ---------- */
  S.runScan = async function (onProgress) {
    var say = function (t) { U.log(t); if (onProgress) onProgress(t); };

    if (!U.isSpaceDynamicPage()) {
      say('请先打开空间动态页：space.bilibili.com/你的UID/dynamic');
      throw new Error('NOT_ON_SPACE_PAGE');
    }

    B.state.scanning = true;
    B.state.stop = false;
    B.state.items.clear();
    B.state.cards.clear();
    B.state.records = [];
    B.state.source = '';
    B.state.uid = U.getUid();
    L.stats.probe = 0;
    L.stats.fail = 0;
    L.mode = '';
    N.signMode = '';
    S.lastErr = '';

    try {
      say('开始扫描（直接读取动态列表）…');
      await S.apiAll(B.state.uid, say);

      var useApi = B.state.items.size > 0;
      var stoppedByUser = B.state.stop;

      /* 接口不通才下滑兜底 */
      if (!useApi && !stoppedByUser) {
        say('接口没拿到数据' + (S.lastErr ? '（' + S.lastErr + '）' : '') + '，改走页面下滑…');
        await S.autoScroll(say);
        S.collectDom();
        stoppedByUser = B.state.stop;
      }

      /* "停止"只停读取，不停判定：已经拿到手的要判完，否则等于白扫（第 8 轮踩过同样的坑） */
      if (stoppedByUser && U.isSpaceDynamicPage()) {
        B.state.stop = false;
        say('已停止读取' + (useApi || B.state.cards.size
          ? '，继续判定已收集的 ' + (useApi ? B.state.items.size : B.state.cards.size) + ' 条'
          : '') + '（再点一次「停止」可中断判定）');
      }

      if (!useApi && B.state.cards.size === 0) {
        say('两条路都没拿到数据，跑一次诊断：');
        await S.diagnose(B.state.uid, say);
        return [];
      }

      var arr = useApi
        ? Array.from(B.state.items.values())
        : Array.from(B.state.cards.values());
      B.state.source = useApi ? '接口' : '页面';

      say('共收集 ' + arr.length + ' 条（来源：' + B.state.source + '），开始判定…');

      for (var i = 0; i < arr.length; i++) {
        if (B.state.stop) break;
        var rec = useApi ? await L.classify(arr[i]) : await L.classifyCard(arr[i]);
        if (rec && rec.id) B.state.records.push(rec);
        if ((i + 1) % 5 === 0 || i + 1 === arr.length) say('判定中 ' + (i + 1) + '/' + arr.length);
        await U.sleep(CFG.probeGap + U.rnd(0, 250));
      }

      if (L.stats.fail > 0) say(L.stats.fail + ' 次抽奖请求失败；无法确认状态的条目已保护');
      if (B.state.stop) say('已停止，保留已判定的 ' + B.state.records.length + ' 条');
      else if (useApi && !S.readStatus.complete) say('判定结束，扫描未完整：' + S.readStatus.reason + '；已判定 ' + B.state.records.length + ' 条');
      else say('扫描完成，共 ' + B.state.records.length + ' 条（来源：' + B.state.source + '）');

      if (CFG.debug) {
        console.table(B.state.records.slice(0, 20).map(function (r) {
          return {
            动态ID: r.id, 抽奖ID: r.origId || '-', 判定: r.verdict,
            原因: r.reason, 时间: r.timeText || (r.pubTs ? U.fmtTime(r.pubTs) : ''), 文本: U.clamp(r.text, 40)
          };
        }));
      }
      return B.state.records;
    } finally {
      B.state.scanning = false;
      B.state.stop = false;
    }
  };

  B.scanner = S;
})();


/* ===== deleter.js ===== */
/* 删除流程（不可逆操作）
   CFG.dryRun 为 true 时只列清单不真删；为 false 时真删（会弹确认框） */
(function () {
  'use strict';
  var B = window.BLCL;
  var U = B.utils, CFG = B.CFG, N = B.net, P = B.parser;
  var D = {};

  /* UI 和实际队列共用这一资格判断，避免“可以勾选但进不了队列” */
  D.isEligible = function (r) {
    return !!r && r.verdict === 'deletable' && !r.deleted && !r.noId && /^\d+$/.test(r.id || '');
  };

  async function pause(ms) {
    /* 限速期间也响应停止，避免风控暂停时界面还要等整整一分钟 */
    for (var left = ms; left > 0 && !B.state.stop && U.isSpaceDynamicPage();) {
      var step = Math.min(left, 200);
      await U.sleep(step);
      left -= step;
    }
  }

  /* 通过过滤条件的待删条目 */
  D.pickTargets = function (minDays) {
    var md = Number(minDays) || 0;
    return B.state.records.filter(function (r) {
      if (!D.isEligible(r) || !r.checked) return false;
      if (!md) return true;
      return r.drawTs && U.daysAgo(r.drawTs) >= md;
    });
  };

  /* 主流程 */
  D.runDelete = async function (minDays, onProgress) {
    var say = function (t) { U.log(t); if (onProgress) onProgress(t); };
    var targets = D.pickTargets(minDays);

    if (!targets.length) {
      say('没有勾选任何"可删"的动态');
      return { ok: 0, fail: 0, dry: true };
    }

    /* 演练模式：只列清单不真删 */
    if (CFG.dryRun) {
      say('【演练】以下 ' + targets.length + ' 条将被删除（不会真删）：');
      targets.forEach(function (r) { say('  ' + r.id + ' · ' + r.reason); });
      say('要真正删除，把 src/config.js 的 dryRun 改成 false');
      return { ok: 0, fail: targets.length, dry: true };
    }

    if (CFG.requireConfirm) {
      /* 估算：每条 = 随机间隔均值 + 一次请求往返（约 0.5 秒） */
      var perItem = (CFG.delMin + CFG.delMax) / 2 + 500;
      var msg =
        '即将删除 ' + targets.length + ' 条已开奖的转发抽奖动态。\n\n' +
        '删除不可恢复，没有备份，删了就找不回来了。\n' +
        '未开奖的动态、原创动态都不会被删除。\n\n' +
        '预计用时约 ' + U.fmtDur(targets.length * perItem) + '，期间可以点「停止」中断。';
      if (targets.length >= CFG.delWarnOver) {
        msg += '\n\n⚠️ 一次删 ' + targets.length + ' 条偏多，建议先勾几条试试，确认没问题再继续。';
      }
      var ok = confirm(msg + '\n\n确定继续？');
      if (!ok) { say('已取消'); return { ok: 0, fail: 0, dry: false, cancelled: true }; }
    }

    /* 不再自动导出 CSV：那个下载动作会让页面跳走（Edge 报"无法访问此页面"），而且用户确认没用 */
    var okN = 0, failN = 0, stopped = false;
    for (var i = 0; i < targets.length; i++) {
      if (B.state.stop || !U.isSpaceDynamicPage() || (B.state.uid && B.state.uid !== U.getUid())) {
        stopped = true;
        say('已停止：用户停止、账号变化或已离开原空间动态页');
        break;
      }
      var r = targets[i];
      say('删除中 ' + (i + 1) + '/' + targets.length + ' · ' + r.id);

      var res;
      try {
        res = await N.removeDynamic(r.id, P.numericType(r.type));
      } catch (e) {
        res = { code: -999, message: (e && e.message) || '请求异常' };
      }

      if (res && res.code === 0) {
        okN++;
        r.deleted = true;
        r.checked = false;
        r.err = '';
        say('删除成功 ' + r.id);
      } else {
        failN++;
        r.err = (res && res.message) || '未知错误';
        say('删除失败 ' + r.id + ' · ' + r.err);
        if (res && (res.code === -352 || res.code === 412 || res.code === -412)) {
          say('触发风控，暂停 ' + (CFG.riskPause / 1000) + ' 秒');
          await pause(CFG.riskPause);
        }
      }

      if (onProgress) onProgress();
      if (i < targets.length - 1) await pause(U.rnd(CFG.delMin, CFG.delMax));
    }

    say('删除结束：成功 ' + okN + ' 条，失败 ' + failN + ' 条');
    return { ok: okN, fail: failN, dry: false, stopped: stopped };
  };

  B.deleter = D;
})();


/* ===== ui.js ===== */
/* 面板 UI：右侧悬浮入口 + 展开面板 */
(function () {
  'use strict';
  var B = window.BLCL;
  var U = B.utils, CFG = B.CFG;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var UI = { el: {} };

  UI.build = function () {
    if ($('#blcl-root')) return;

    var root = document.createElement('div');
    root.id = 'blcl-root';
    root.innerHTML =
      '<button id="blcl-fab" type="button">抽奖动态清理 v' + CFG.VERSION + '</button>' +
      '<section id="blcl-panel" hidden>' +
        '<header class="b-head">' +
          '<span class="b-title">抽奖动态清理器</span>' +
          '<span class="b-mode" id="blcl-mode"></span>' +
          '<button class="b-x" id="blcl-close" type="button" aria-label="关闭">×</button>' +
        '</header>' +

        '<div class="b-sum">' +
          '<div class="b-sum-i"><div class="b-num" id="blcl-n-del">0</div><div class="b-cap">已开奖</div></div>' +
          '<div class="b-sum-i"><div class="b-num" id="blcl-n-pro">0</div><div class="b-cap">未开奖</div></div>' +
          '<div class="b-sum-i"><div class="b-num" id="blcl-n-skip">0</div><div class="b-cap">已跳过</div></div>' +
        '</div>' +

        '<p class="b-status" id="blcl-status">就绪</p>' +

        '<div class="b-bar">' +
          '<button class="b-btn b-primary" id="blcl-scan" type="button">扫描</button>' +
          '<button class="b-btn" id="blcl-stop" type="button">停止</button>' +
        '</div>' +

        '<div class="b-bar b-bar-thin">' +
          '<label class="b-check"><input type="checkbox" id="blcl-f-skip"> 显示已跳过</label>' +
          '<span class="b-spacer"></span>' +
          '<button class="b-link" id="blcl-sel-official" type="button">全选官方已开奖</button>' +
          '<button class="b-link" id="blcl-clear" type="button">取消勾选</button>' +
        '</div>' +

        '<div id="blcl-list" class="b-list"></div>' +

        '<div class="b-bar">' +
          '<button class="b-btn b-danger" id="blcl-delete" type="button">删除选中</button>' +
          '<span class="b-spacer"></span>' +
          '<span class="b-tip">未开奖与原创动态不会被删除</span>' +
        '</div>' +

        '<div class="b-loghead">' +
          '<span class="b-tip">日志</span>' +
          '<span class="b-spacer"></span>' +
          '<button class="b-link" id="blcl-copylog" type="button">复制日志</button>' +
          '<button class="b-link" id="blcl-clearlog" type="button">清空</button>' +
        '</div>' +
        '<div id="blcl-log" class="b-log"></div>' +
      '</section>';

    document.body.appendChild(root);

    UI.el = {
      root: root,
      panel: $('#blcl-panel', root),
      status: $('#blcl-status', root),
      list: $('#blcl-list', root),
      log: $('#blcl-log', root),
      scan: $('#blcl-scan', root),
      stop: $('#blcl-stop', root),
      del: $('#blcl-delete', root),
      nDel: $('#blcl-n-del', root),
      nPro: $('#blcl-n-pro', root),
      nSkip: $('#blcl-n-skip', root)
    };

    $('#blcl-fab', root).onclick = function () {
      UI.el.panel.hidden = !UI.el.panel.hidden;
    };
    $('#blcl-close', root).onclick = function () { UI.el.panel.hidden = true; };
    $('#blcl-scan', root).onclick = function () { B.main.startScan(); };
    $('#blcl-stop', root).onclick = function () { B.state.stop = true; UI.setStatus('正在停止…'); };
    $('#blcl-sel-official', root).onclick = function () { UI.selectBy(false); };
    $('#blcl-clear', root).onclick = function () {
      B.state.records.forEach(function (r) { r.checked = false; });
      UI.render();
    };
    $('#blcl-delete', root).onclick = function () { B.main.startDelete(); };
    $('#blcl-f-skip', root).onchange = function () { UI.renderList(); };
    $('#blcl-clearlog', root).onclick = function () { UI.clearLog(); };
    $('#blcl-copylog', root).onclick = function () { UI.copyLog(); };

    $('#blcl-mode', root).textContent = 'v' + CFG.VERSION + (CFG.dryRun ? ' · 演练' : ' · 真实删除');
    UI.render();
  };

  UI.setStatus = function (t) { if (UI.el.status) UI.el.status.textContent = t; };

  UI.appendLog = function (line) {
    if (!UI.el.log) return;
    var d = document.createElement('div');
    d.textContent = line;
    UI.el.log.insertBefore(d, UI.el.log.firstChild);
    while (UI.el.log.childNodes.length > 120) UI.el.log.removeChild(UI.el.log.lastChild);
  };

  UI.clearLog = function () { if (UI.el.log) UI.el.log.innerHTML = ''; B.logs = []; };

  /* 日志顺序是"最新在上"，复制时倒回去，读起来才顺 */
  UI.copyLog = function () {
    if (!UI.el.log) return;
    var lines = Array.prototype.map.call(UI.el.log.childNodes, function (n) { return n.textContent; });
    var text = lines.reverse().join('\n');
    var done = function (ok) { UI.setStatus(ok ? '日志已复制到剪贴板' : '复制失败，请手动选中复制'); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { done(true); }, function () { done(false); });
    } else {
      var ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      try { done(document.execCommand('copy')); } catch (e) { done(false); }
      ta.remove();
    }
  };

  /* "开奖满 N 天"这个过滤已按用户要求删除，保留接口恒返回 0 */
  UI.minDays = function () { return 0; };
  UI.passDays = function () { return true; };

  UI.selectBy = function (weak) {
    B.state.records.forEach(function (r) {
      if (B.deleter.isEligible(r) && !!r.weak === !!weak && UI.passDays(r)) r.checked = true;
    });
    UI.render();
  };

  UI.renderStats = function () {
    if (!UI.el.nDel) return;
    var d = 0, p = 0, s = 0;
    B.state.records.forEach(function (r) {
      if (r.deleted) d++;
      else if (r.verdict === 'deletable') d++;
      else if (r.verdict === 'protected') p++;
      else s++;
    });
    UI.el.nDel.textContent = d;
    UI.el.nPro.textContent = p;
    UI.el.nSkip.textContent = s;
  };

  var VERDICT_TEXT = { del: '已开奖', pro: '未开奖', skip: '已跳过' };

  UI.renderList = function () {
    if (!UI.el.list) return;
    var showSkip = $('#blcl-f-skip', UI.el.root).checked;
    var html = '';

    for (var i = 0; i < B.state.records.length; i++) {
      var r = B.state.records[i];
      var kind = r.verdict === 'deletable' ? 'del' : (r.verdict === 'protected' ? 'pro' : 'skip');
      if (kind === 'skip' && !showSkip) continue;

      var canDel = B.deleter.isEligible(r) && UI.passDays(r);
      var tag = VERDICT_TEXT[kind] + (r.weak ? ' · 文本' : '');
      var links = '';
      if (!r.noId && /^\d+$/.test(r.id)) {
        links += '<a class="b-view" href="https://www.bilibili.com/opus/' + r.id + '" target="_blank" rel="noopener noreferrer">转发动态</a>';
      }
      if (/^\d+$/.test(r.origId || '') && r.origId !== r.id) {
        links += '<a class="b-view" href="https://www.bilibili.com/opus/' + r.origId + '" target="_blank" rel="noopener noreferrer">原动态</a>';
      }

      html +=
        '<div class="b-row ' + kind + '">' +
          '<label class="b-pick"><input type="checkbox" data-i="' + i + '"' +
            (r.checked ? ' checked' : '') + (canDel ? '' : ' disabled') + '></label>' +
          '<div class="b-body">' +
            '<div class="b-line">' +
              '<span class="b-tag">' + tag + '</span>' +
              '<span class="b-sub" title="' + U.esc(r.reason) + '">' + U.esc(r.reason) + (r.err ? ' · 失败 ' + U.esc(r.err) : '') + '</span>' +
              links +
              (r.deleted ? '<span class="b-tag">已删除</span>' : '') +
              '<span class="b-time">' + U.esc(r.timeText || (U.fmtTime(r.pubTs) || '').slice(5) || '—') + '</span>' +
            '</div>' +
          '</div>' +
        '</div>';
    }

    UI.el.list.innerHTML = html || '<div class="b-empty">暂无数据</div>';

    var boxes = UI.el.list.querySelectorAll('input[type=checkbox]');
    for (var k = 0; k < boxes.length; k++) {
      boxes[k].onchange = function () {
        var rec = B.state.records[Number(this.getAttribute('data-i'))];
        if (rec) { rec.checked = this.checked; UI.render(); }
      };
    }
  };

  /* 运行态单独控制：扫描/删除进行中，扫描键置灰、停止键可用 */
  UI.setRunning = function (on) {
    if (UI.el.scan) UI.el.scan.disabled = !!on;
    if (UI.el.stop) UI.el.stop.disabled = !on;
  };

  UI.render = function () {
    UI.renderStats();
    UI.renderList();
    var busy = B.state.scanning || B.state.deleting;
    UI.setRunning(busy);
    if (UI.el.del) {
      UI.el.del.disabled = busy || !B.state.records.some(function (r) {
        return r.checked && B.deleter.isEligible(r);
      });
    }
  };

  B.ui = UI;
})();


/* ===== main.js ===== */
/* 入口：装配各模块，暴露调试接口
   启动条件很严格：必须停在「个人空间 → 动态」页（space.bilibili.com/{UID}/dynamic），
   其余页面不注入面板、不收集数据 */
(function () {
  'use strict';
  var B = window.BLCL;
  var U = B.utils;
  var M = {};

  M.startScan = async function () {
    if (B.state.scanning || B.state.deleting) return;
    if (!U.isSpaceDynamicPage()) {
      B.ui.setStatus('请先登录并进入本人空间的动态页');
      return;
    }
    /* 先把状态置位再刷界面，否则"停止"按钮会被算成不可用 */
    B.state.scanning = true;
    B.ui.setRunning(true);
    if (B.ui.clearLog) B.ui.clearLog();   /* 每次扫描从干净日志开始，避免新旧混在一起看错 */
    try {
      await B.scanner.runScan(function (t) { B.ui.setStatus(t); });
    } catch (e) {
      U.log('扫描中止：' + ((e && e.message) || e));
      B.ui.setStatus('扫描异常已停止，已保留结果，请查看日志');
    } finally {
      B.state.scanning = false;
      B.ui.render();
    }
  };

  M.startDelete = async function () {
    if (B.state.deleting || B.state.scanning) return;
    if (!U.isSpaceDynamicPage() || (B.state.uid && B.state.uid !== U.getUid())) {
      B.ui.setStatus('请回到扫描时的本人空间动态页，重新扫描后再删除');
      return;
    }
    B.state.stop = false;
    B.state.deleting = true;
    B.ui.setRunning(true);
    try {
      var res = await B.deleter.runDelete(B.ui.minDays(), function () { B.ui.render(); });
      if (res.dry) B.ui.setStatus('演练完成 · ' + res.fail + ' 条待删（未真正删除）');
      else B.ui.setStatus((res.cancelled ? '已取消' : res.stopped ? '已停止' : '删除结束') + ' · 成功 ' + res.ok + ' · 失败 ' + res.fail);
    } catch (e) {
      U.log('删除流程异常：' + ((e && e.message) || e));
      B.ui.setStatus('删除异常已停止，请核对日志与实际动态后重新扫描');
    } finally {
      B.state.deleting = false;
      B.state.stop = false;
      B.ui.render();
    }
  };

  /* 只有动态页才存在面板；SPA 切换页面时跟着装卸 */
  function syncUI() {
    var onPage = U.isSpaceDynamicPage();
    var root = document.getElementById('blcl-root');

    if (onPage) {
      if (!root) {
        B.ui.build();
        U.log('已进入动态页，插件启动');
      }
    } else if (root) {
      if (B.state.scanning || B.state.deleting) B.state.stop = true;
      root.remove();
      B.ui.el = {};
    }
  }

  function boot() {
    if (!document.body) return;
    syncUI();
    setInterval(syncUI, 1200);
  }

  if (document.body) boot();
  else window.addEventListener('DOMContentLoaded', boot);

  /* 控制台调试：BLCL.state / BLCL.CFG / BLCL.main.startScan() */
  B.main = M;
  window.BLCL = B;
})();
