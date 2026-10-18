/* 删除流程（不可逆操作）
   CFG.dryRun 为 true 时只列清单不真删；为 false 时真删（会弹确认框） */
(function () {
  'use strict';
  var B = window.BLCL;
  var U = B.utils, CFG = B.CFG, N = B.net, P = B.parser;
  var D = {};

  /* 通过过滤条件的待删条目 */
  D.pickTargets = function (minDays) {
    var md = Number(minDays) || 0;
    return B.state.records.filter(function (r) {
      if (r.verdict !== 'deletable' || r.deleted || !r.checked) return false;
      if (r.noId || /^dom_/.test(r.id)) return false;   /* 页面兜底拿不到真ID，删不了 */
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
      if (!ok) { say('已取消'); return { ok: 0, fail: 0, dry: false }; }
    }

    /* 不再自动导出 CSV：那个下载动作会让页面跳走（Edge 报"无法访问此页面"），而且用户确认没用 */
    var okN = 0, failN = 0;
    for (var i = 0; i < targets.length; i++) {
      if (B.state.stop) { say('已手动停止'); break; }
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
        say('删除成功 ' + r.id);
      } else {
        failN++;
        r.err = (res && res.message) || '未知错误';
        say('删除失败 ' + r.id + ' · ' + r.err);
        if (res && (res.code === -352 || res.code === 412)) {
          say('触发风控，暂停 ' + (CFG.riskPause / 1000) + ' 秒');
          await U.sleep(CFG.riskPause);
        }
      }

      if (onProgress) onProgress();
      if (i < targets.length - 1) await U.sleep(U.rnd(CFG.delMin, CFG.delMax));
    }

    say('删除结束：成功 ' + okN + ' 条，失败 ' + failN + ' 条');
    return { ok: okN, fail: failN, dry: false };
  };

  B.deleter = D;
})();
