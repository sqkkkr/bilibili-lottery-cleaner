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
