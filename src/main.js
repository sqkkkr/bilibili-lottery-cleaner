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
