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
          '<button class="b-link" id="blcl-sel-official" type="button">全选已开奖</button>' +
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
      if (r.verdict === 'deletable' && !r.deleted && !!r.weak === !!weak && UI.passDays(r)) r.checked = true;
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

      var canDel = kind === 'del' && !r.deleted && UI.passDays(r);
      var tag = VERDICT_TEXT[kind] + (r.weak ? ' · 文本' : '');

      html +=
        '<div class="b-row ' + kind + '">' +
          '<label class="b-pick"><input type="checkbox" data-i="' + i + '"' +
            (r.checked ? ' checked' : '') + (canDel ? '' : ' disabled') + '></label>' +
          '<div class="b-body">' +
            '<div class="b-line">' +
              '<span class="b-tag">' + tag + '</span>' +
              '<span class="b-sub">' + U.esc(r.reason) + (r.err ? ' · 失败 ' + U.esc(r.err) : '') +
                '<a href="https://www.bilibili.com/opus/' + U.esc(r.id) + '" target="_blank" rel="noreferrer">查看</a>' +
              '</span>' +
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
        return r.checked && r.verdict === 'deletable';
      });
    }
  };

  B.ui = UI;
})();
