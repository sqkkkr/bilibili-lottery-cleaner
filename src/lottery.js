/* 抽奖判定：整个插件的核心。规则见 README 第五节。
   原则：任何查不到、报错、超时的情况，一律按"未开奖"保护，绝不进删除队列 */
(function () {
  'use strict';
  var B = window.BLCL;
  var U = B.utils, CFG = B.CFG, P = B.parser, N = B.net;
  var L = {};

  /* 查询统计，给"接口全挂"这种情况留个线索 */
  L.stats = { probe: 0, fail: 0 };

  /* 记住哪个抽奖接口能用，之后每条只发一次请求（原来每条都试两个，白白多一倍请求） */
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

    for (var i = 0; i < order.length; i++) {
      var key = order[i];
      L.stats.probe++;
      try {
        var j = await N.requestJson(urls[key], { timeout: CFG.probeTimeout });
        if (j && j.code === 0) {
          L.mode = key;   /* 这个接口能用，后面每条就只发它，省一半请求 */
          if (j.data && j.data.lottery_id) {
            return {
              kind: 'official',
              status: Number(j.data.status),
              drawTs: Number(j.data.lottery_time) || 0,
              participants: Number(j.data.participants) || 0
            };
          }
          return { kind: 'none' };   /* 接口正常但没有抽奖数据，不用再试另一个 */
        }
      } catch (e) {
        L.stats.fail++;
      }
    }
    return { kind: 'none' };
  }

  /* 依次用 原动态ID → 自己动态ID 去查，任一命中即返回 */
  L.probeLottery = async function (ids) {
    for (var i = 0; i < ids.length; i++) {
      if (!ids[i]) continue;
      var r = await probeOne(ids[i]);
      if (r.kind === 'official') return r;
    }
    return { kind: 'none' };
  };

  /* ---------- 文本兜底：从文案里解析开奖日期 ---------- */
  L.extractDate = function (seg) {
    var now = new Date(), m;
    m = seg.match(/(20\d{2})\s*[-\/年.]\s*(\d{1,2})\s*[-\/月.]\s*(\d{1,2})\s*[日号]?/);
    if (m) return new Date(+m[1], +m[2] - 1, +m[3], 23, 59, 59);

    /* "26年11月15日" 这种两位年份 */
    m = seg.match(/(\d{2})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*[日号]/);
    if (m) return new Date(2000 + (+m[1]), +m[2] - 1, +m[3], 23, 59, 59);

    m = seg.match(/(\d{1,2})\s*月\s*(\d{1,2})\s*[日号]/);
    if (m) {
      var d = new Date(now.getFullYear(), +m[1] - 1, +m[2], 23, 59, 59);
      /* 早于今天 90 天以上，说明是明年的日期 */
      if (d.getTime() < now.getTime() - 90 * 86400000) {
        d = new Date(now.getFullYear() + 1, +m[1] - 1, +m[2], 23, 59, 59);
      }
      return d;
    }
    m = seg.match(/(20\d{2})(\d{2})(\d{2})/);
    if (m) return new Date(+m[1], +m[2] - 1, +m[3], 23, 59, 59);
    return null;
  };

  L.parseDrawDate = function (text) {
    if (!text) return 0;
    var segs = String(text).replace(/\s+/g, ' ').split(/[\n。！!；;，,、|｜·•\r]+/);
    var best = 0;
    for (var i = 0; i < segs.length; i++) {
      if (!CFG.lotteryKeyword.test(segs[i])) continue;
      var d = L.extractDate(segs[i]);
      if (d && !isNaN(d.getTime())) {
        var t = d.getTime();
        if (t > best) best = t; /* 取最晚的开奖时间，宁可保护 */
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
      lot = { kind: 'none' };
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
      var dts = L.parseDrawDate(rec.text);
      rec.drawTs = dts;
      rec.weak = true;
      if (!dts) {
        /* 用户明确要求：没写开奖时间的，直接跳过 */
        rec.verdict = 'skip_nolottery';
        rec.reason = '文本提到抽奖但没写开奖时间';
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
      noId: !!c.noId,
      origId: c.lotteryId || '',
      type: 'DOM',
      pubTs: 0,
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
    try { lot = await L.probeLottery(ids); } catch (e) {}

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
      var dts = L.parseDrawDate(rec.text);
      rec.drawTs = dts;
      rec.weak = true;
      if (!dts) {
        rec.verdict = 'skip_nolottery';
        rec.reason = '提到抽奖但没写开奖时间';
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
