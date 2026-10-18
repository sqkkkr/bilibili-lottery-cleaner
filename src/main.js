/* 入口：装配各模块，暴露调试接口
   启动条件很严格：必须停在「个人空间 → 动态」页（space.bilibili.com/{UID}/dynamic），
   其余页面不注入面板、不收集数据 */
(function () {
  'use strict';
  var B = window.BLCL;
  var U = B.utils;
  var M = {};

  /* 保留拦截只用来数命中次数（日志里显示），不再作为数据来源：
     实测 B站前端把原生 fetch 缓存进自己的模块变量，外面包装拦不到。
     数据改由 scanner.apiAll() 直接翻页读取。 */
  function ensureHooks() {
    B.net.installHooks(function () { /* 仅计数 */ });
  }

  /* 必须在 document_start 同步装好：页面初始化时会把原生 fetch / XHR 存进模块变量，
     晚一步再包装就对它无效，表现就是"页面滚了很远，但只收到首屏那点数据" */
  ensureHooks();

  M.startScan = async function () {
    if (B.state.scanning) return;
    if (!U.isSpaceDynamicPage()) {
      B.ui.setStatus('请先进入个人空间的动态页');
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
    } finally {
      B.state.scanning = false;
      B.ui.render();
    }
  };

  M.startDelete = async function () {
    if (B.state.deleting) return;
    B.state.deleting = true;
    B.ui.setRunning(true);
    try {
      var res = await B.deleter.runDelete(B.ui.minDays(), function () { B.ui.render(); });
      if (res.dry) B.ui.setStatus('演练完成 · ' + res.fail + ' 条待删（未真正删除）');
      else B.ui.setStatus('删除结束 · 成功 ' + res.ok + ' · 失败 ' + res.fail);
    } catch (e) {
      U.log('删除流程异常：' + ((e && e.message) || e));
    } finally {
      B.state.deleting = false;
      B.ui.render();
    }
  };

  /* 只有动态页才存在面板；SPA 切换页面时跟着装卸 */
  function syncUI() {
    var onPage = U.isSpaceDynamicPage();
    var root = document.getElementById('blcl-root');

    if (onPage) {
      ensureHooks();
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
