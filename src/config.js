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
