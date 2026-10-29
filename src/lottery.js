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
