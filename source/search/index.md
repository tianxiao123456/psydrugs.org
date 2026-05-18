---
title: AI 智能搜索
date: 2026-05-03
layout: page
cover: https://gcore.jsdelivr.net/gh/cdn-x/xaoxuu@main/posts/20250706150531375.jpg
---
# AI 智能搜索

<style>
  .rag-search-wrap {
    --rag-bg: #f4f6f9;
    --rag-card: #fff;
    --rag-border: #d8dee8;
    --rag-text: #1f2937;
    --rag-muted: #6b7280;
    --rag-primary: #2563eb;
    box-sizing: border-box;
    width: 100%;
    max-width: 920px;
    margin: 0 auto;
    padding: 8px 16px 32px;
    color: var(--rag-text);
  }
  .rag-search-wrap * { box-sizing: border-box; }
  .rag-search-header { margin-bottom: 20px; }
  .rag-search-header h4 {
    margin: 0 0 8px;
    font-size: 1rem;
    font-weight: 600;
    line-height: 1.6;
  }
  .rag-search-header p {
    margin: 0;
    font-size: 0.9rem;
    color: var(--rag-muted);
    line-height: 1.6;
  }
  .rag-search-panel {
    background: var(--rag-card);
    border: 1px solid var(--rag-border);
    border-radius: 12px;
    padding: 16px;
    margin-bottom: 16px;
  }
  .rag-search-row {
    display: flex;
    gap: 10px;
    align-items: stretch;
  }
  #rag-query {
    flex: 1;
    min-width: 0;
    width: 100%;
    padding: 12px 14px;
    border: 1px solid var(--rag-border);
    border-radius: 10px;
    background: var(--rag-bg);
    color: var(--rag-text);
    font-size: 15px;
  }
  #rag-search-button {
    flex-shrink: 0;
    padding: 12px 20px;
    background: var(--rag-primary);
    color: #fff;
    border: none;
    border-radius: 10px;
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
  }
  #rag-status {
    margin-top: 10px;
    font-size: 13px;
    min-height: 18px;
  }
  #rag-status.is-error { color: #dc2626; }
  #rag-dialog {
    display: flex;
    flex-direction: column;
    gap: 12px;
    min-height: 200px;
  }
  .rag-empty-state {
    border: 1px dashed var(--rag-border);
    border-radius: 12px;
    padding: 28px 20px;
    text-align: center;
    color: var(--rag-muted);
    background: var(--rag-bg);
    font-size: 14px;
    line-height: 1.7;
  }
  .rag-message {
    display: flex;
    gap: 12px;
    align-items: flex-start;
  }
  .rag-message.is-user .rag-avatar {
    background: #64748b;
  }
  .rag-avatar {
    flex-shrink: 0;
    width: 36px;
    height: 36px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: 700;
    background: var(--rag-primary);
    color: #fff;
  }
  .rag-bubble {
    flex: 1;
    min-width: 0;
    border: 1px solid var(--rag-border);
    border-radius: 12px;
    padding: 14px 16px;
    background: var(--rag-card);
  }
  .rag-bubble-title {
    font-size: 13px;
    font-weight: 700;
    margin-bottom: 8px;
    color: var(--rag-muted);
  }
  #rag-answer-body {
    line-height: 1.75;
    word-break: break-word;
  }
  #rag-sources {
    border: 1px solid var(--rag-border);
    border-radius: 12px;
    padding: 14px 16px;
    background: var(--rag-card);
  }
  #rag-sources h5 { margin: 0 0 12px; font-size: 14px; }
  #rag-sources-list {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  @media (max-width: 640px) {
    .rag-search-row { flex-direction: column; }
    #rag-search-button { width: 100%; }
  }
</style>

<div class="rag-search-wrap">
  <header class="rag-search-header">
    <h4>基于全站文档的语义检索与问答</h4>
    <p>输入药物名、症状或问题，如苯二氮卓类药物联用风险等。</p>
  </header>

  <section class="rag-search-panel" aria-label="搜索输入">
    <div class="rag-search-row">
      <input
        id="rag-query"
        type="text"
        autocomplete="off"
        placeholder="例如：右美沙芬的风险、可乐定的用途、苯二氮卓过量处理…"
      />
      <button id="rag-search-button" type="button">搜索</button>
    </div>
    <div id="rag-status" hidden></div>
  </section>

  <section id="rag-dialog" aria-label="回答区域">
    <div id="rag-empty" class="rag-empty-state">
      输入问题后点击「搜索」，你的问题与 AI 回答将显示在下方。
    </div>

    <article id="rag-user" class="rag-message is-user" hidden>
      <div class="rag-avatar" aria-hidden="true">你</div>
      <div class="rag-bubble">
        <div class="rag-bubble-title">你的问题</div>
        <div id="rag-user-body"></div>
      </div>
    </article>

    <article id="rag-answer" class="rag-message" hidden>
      <div class="rag-avatar" aria-hidden="true">AI</div>
      <div class="rag-bubble">
        <div class="rag-bubble-title">回答</div>
        <div id="rag-answer-body"></div>
      </div>
    </article>

    <aside id="rag-sources" hidden>
      <h5>参考来源</h5>
      <ul id="rag-sources-list"></ul>
    </aside>
  </section>
</div>

<script
  src="/js/rag-search.js"
  data-rag-api="https://psydrugs-search.tianxiao0502000.workers.dev"
  data-model="deepseek-chat"
  data-site-url="https://psydrugs.org"
></script>
