// PsyDrugs RAG 搜索前端
// <script src="/js/rag-search.js" data-rag-api="https://..." data-model="deepseek-chat"></script>

(function () {
  const DEFAULT_API = "";
  const DEFAULT_MODEL = "deepseek-chat";
  const DEFAULT_SITE = "https://psydrugs.org";

  function $(id) {
    return document.getElementById(id);
  }

  function getScriptTag() {
    return (
      document.currentScript ||
      document.querySelector('script[src*="rag-search.js"]')
    );
  }

  function getRagApi() {
    const script = getScriptTag();
    if (!script) return DEFAULT_API;
    return (script.dataset.ragApi || script.getAttribute("data-rag-api") || "")
      .trim()
      .replace(/\/+$/, "");
  }

  function getModel() {
    const script = getScriptTag();
    if (!script) return DEFAULT_MODEL;
    return (script.dataset.model || DEFAULT_MODEL).trim();
  }

  function getSiteUrl() {
    const script = getScriptTag();
    if (!script) return DEFAULT_SITE;
    return (script.dataset.siteUrl || DEFAULT_SITE).trim().replace(/\/+$/, "");
  }

  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function showStatus(message, isError) {
    const el = $("rag-status");
    if (!el) return;
    el.textContent = message || "";
    el.classList.toggle("is-error", Boolean(isError));
    el.hidden = !message;
  }

  function setLoading(loading) {
    const button = $("rag-search-button");
    const wrap = $("rag-dialog");
    const answerCard = $("rag-answer");
    const answerBody = $("rag-answer-body");
    if (button) {
      button.disabled = loading;
      button.classList.toggle("is-loading", loading);
      button.textContent = loading ? "搜索中…" : "搜索";
    }
    if (wrap) wrap.classList.toggle("is-loading", loading);
    if (loading && answerCard && answerBody) {
      setEmptyState(false);
      answerCard.hidden = false;
      answerBody.innerHTML =
        '<p class="rag-muted">正在检索全站内容并生成回答，请稍候…</p>';
    }
  }

  function setEmptyState(visible) {
    const empty = $("rag-empty");
    const answer = $("rag-answer");
    const user = $("rag-user");
    if (empty) empty.hidden = !visible;
    if (answer) answer.hidden = visible;
    if (user && visible) user.hidden = true;
  }

  function showUserQuestion(text) {
    const card = $("rag-user");
    const body = $("rag-user-body");
    if (!card || !body) return;
    setEmptyState(false);
    card.hidden = false;
    body.textContent = text;
  }

  function normalizeUrl(pathOrUrl) {
    if (!pathOrUrl) return "";
    if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
    const base = getSiteUrl();
    return pathOrUrl.startsWith("/") ? base + pathOrUrl : base + "/" + pathOrUrl;
  }

  function normalizeSources(list) {
    if (!Array.isArray(list)) return [];
    return list
      .map(function (item) {
        if (!item) return null;
        if (typeof item === "string") {
          return { title: item, url: "", snippet: "" };
        }
        const title =
          item.title || item.name || item.path || item.id || "相关条目";
        const url = normalizeUrl(item.url || item.link || item.path || "");
        const snippet =
          item.snippet || item.content || item.text || item.excerpt || "";
        const score =
          typeof item.score === "number" ? item.score : item.similarity;
        return { title, url, snippet, score };
      })
      .filter(Boolean);
  }

  function extractPayload(data) {
    if (!data) return { answer: "", sources: [] };
    if (typeof data === "string") return { answer: data.trim(), sources: [] };

    let answer = "";
    const answerKeys = [
      "answer",
      "reply",
      "response",
      "text",
      "content",
      "message",
      "output",
    ];

    for (let i = 0; i < answerKeys.length; i++) {
      const key = answerKeys[i];
      if (typeof data[key] === "string" && data[key].trim()) {
        answer = data[key].trim();
        break;
      }
    }

    if (!answer && data.result) {
      if (typeof data.result === "string") {
        answer = data.result.trim();
      } else if (typeof data.result.answer === "string") {
        answer = data.result.answer.trim();
      } else if (typeof data.result.text === "string") {
        answer = data.result.text.trim();
      }
    }

    if (
      !answer &&
      data.choices &&
      data.choices[0] &&
      data.choices[0].message &&
      typeof data.choices[0].message.content === "string"
    ) {
      answer = data.choices[0].message.content.trim();
    }

    let sources = [];
    const sourceKeys = [
      "sources",
      "citations",
      "results",
      "data",
      "documents",
      "matches",
      "references",
      "contexts",
    ];
    for (let j = 0; j < sourceKeys.length; j++) {
      const sk = sourceKeys[j];
      if (Array.isArray(data[sk]) && data[sk].length) {
        sources = normalizeSources(data[sk]);
        break;
      }
    }

    if (!answer && sources.length) {
      answer = sources
        .slice(0, 3)
        .map(function (s) {
          return "• " + s.title + (s.snippet ? "：" + s.snippet : "");
        })
        .join("\n\n");
    }

    return { answer, sources };
  }

  function renderAnswer(text) {
    const body = $("rag-answer-body");
    const card = $("rag-answer");
    if (!body || !card) return;

    card.hidden = false;
    setEmptyState(false);

    if (!text) {
      body.innerHTML =
        '<p class="rag-muted">未获取到有效回答，请换个问法或稍后重试。</p>';
      return;
    }

    const lines = escapeHtml(text).split("\n");
    body.innerHTML = lines.map(function (line) {
      if (!line) return "<br>";
      return "<p>" + line + "</p>";
    }).join("");
  }

  function renderSources(sources) {
    const box = $("rag-sources");
    const list = $("rag-sources-list");
    if (!box || !list) return;

    list.innerHTML = "";
    if (!sources.length) {
      box.hidden = true;
      return;
    }

    box.hidden = false;
    sources.forEach(function (src) {
      const li = document.createElement("li");
      li.className = "rag-source-item";

      const head = document.createElement('div');
      head.className = "rag-source-head";

      if (src.url) {
        const a = document.createElement("a");
        a.href = src.url;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        a.textContent = src.title;
        head.appendChild(a);
      } else {
        const span = document.createElement("span");
        span.textContent = src.title;
        head.appendChild(span);
      }

      if (typeof src.score === "number") {
        const badge = document.createElement("span");
        badge.className = "rag-source-score";
        badge.textContent = src.score.toFixed(2);
        head.appendChild(badge);
      }

      li.appendChild(head);

      if (src.snippet) {
        const p = document.createElement("p");
        p.className = "rag-source-snippet";
        p.textContent = src.snippet;
        li.appendChild(p);
      }

      list.appendChild(li);
    });
  }

  async function queryRag(question) {
    const api = getRagApi();
    if (!api) {
      throw new Error("未配置 RAG API 地址（data-rag-api）。");
    }

    const payload = {
      query: question,
      question: question,
      model: getModel(),
      top_k: 8,
    };

    const response = await fetch(api, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });

    const rawText = await response.text();
    let data = null;
    if (rawText) {
      try {
        data = JSON.parse(rawText);
      } catch (e) {
        if (response.ok) {
          return { answer: rawText.trim(), sources: [] };
        }
      }
    }

    if (!response.ok) {
      const detail =
        (data && (data.error || data.message)) ||
        rawText ||
        response.statusText;
      throw new Error(
        "搜索服务返回 " + response.status + "：" + String(detail).slice(0, 200),
      );
    }

    if (data && data.error) {
      throw new Error(String(data.error));
    }

    return extractPayload(data);
  }

  async function onSearch() {
    const input = $("rag-query");
    if (!input) return;

    const question = input.value.trim();
    if (!question) {
      showStatus("请输入问题或关键词后再搜索。", true);
      return;
    }

    setLoading(true);
    showUserQuestion(question);
    showStatus("正在检索全站内容并生成回答…", false);
    renderAnswer("");
    renderSources([]);

    try {
      const result = await queryRag(question);
      renderAnswer(result.answer);
      renderSources(result.sources);

      if (result.answer) {
        showStatus("回答已生成。", false);
      } else {
        showStatus("服务未返回正文，请检查 Workers 接口或更换问法。", true);
      }
    } catch (err) {
      console.error("[rag-search]", err);
      setEmptyState(false);
      renderAnswer("");
      const msg =
        err && err.message
          ? err.message
          : "查询失败，请检查网络或 RAG 服务是否已部署。";
      showStatus(msg, true);
      const answerBody = $("rag-answer-body");
      const answerCard = $("rag-answer");
      if (answerBody) {
        answerBody.innerHTML =
          '<p class="rag-error-hint">' +
          escapeHtml(msg) +
          '</p><p class="rag-muted">若持续出现 404，请确认 Cloudflare Workers 地址正确且已发布。</p>';
      }
      if (answerCard) answerCard.hidden = false;
    } finally {
      setLoading(false);
    }
  }

  function attachListeners() {
    const button = $("rag-search-button");
    const input = $("rag-query");
    if (!button || !input) {
      console.error(
        "[rag-search] 未找到 #rag-query 或 #rag-search-button，请检查 search/index.md 页面结构。",
      );
      showStatus("搜索界面初始化失败：页面元素缺失。", true);
      return;
    }

    button.addEventListener("click", onSearch);
    input.addEventListener("keydown", function (event) {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        onSearch();
      }
    });
  }

  function applyStyles() {
    if (document.getElementById("rag-search-theme-style")) return;

    const style = document.createElement("style");
    style.id = "rag-search-theme-style";
    style.textContent = `
      .rag-search-wrap {
        width: 100%;
        --rag-bg: #f4f6f9;
        --rag-card: #ffffff;
        --rag-border: #d8dee8;
        --rag-text: #1f2937;
        --rag-muted: #6b7280;
        --rag-primary: #2563eb;
        --rag-primary-hover: #1d4ed8;
        --rag-user-bg: #e8f0fe;
        --rag-bot-bg: #ffffff;
        --rag-ok: #15803d;
        --rag-err: #dc2626;
        box-sizing: border-box;
        max-width: 920px;
        margin: 0 auto;
        padding: 8px 16px 32px;
        color: var(--rag-text);
      }

      .rag-search-wrap *, .rag-search-wrap *::before, .rag-search-wrap *::after {
        box-sizing: border-box;
      }

      @media (prefers-color-scheme: dark) {
        .rag-search-wrap {
          --rag-bg: #151a23;
          --rag-card: #1c2433;
          --rag-border: #334155;
          --rag-text: #e5e7eb;
          --rag-muted: #94a3b8;
          --rag-primary: #3b82f6;
          --rag-primary-hover: #60a5fa;
          --rag-user-bg: #1e3a5f;
          --rag-bot-bg: #1c2433;
          --rag-ok: #4ade80;
          --rag-err: #f87171;
        }
      }

      .rag-search-header {
        margin-bottom: 20px;
      }

      .rag-search-header h4 {
        margin: 0 0 8px;
        font-size: 1rem;
        font-weight: 600;
        line-height: 1.6;
        color: var(--rag-text);
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
        box-shadow: 0 1px 3px rgba(15, 23, 42, 0.06);
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
        display: block;
        height: auto;
        margin: 0;
        padding: 12px 14px;
        border: 1px solid var(--rag-border);
        border-radius: 10px;
        background: var(--rag-bg);
        color: var(--rag-text);
        font-size: 15px;
        line-height: 1.4;
        outline: none;
        transition: border-color 0.15s ease, box-shadow 0.15s ease;
        -webkit-appearance: none;
        appearance: none;
      }

      #rag-query:focus {
        border-color: var(--rag-primary);
        box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
      }

      #rag-query::placeholder {
        color: var(--rag-muted);
      }

      #rag-search-button {
        flex-shrink: 0;
        display: inline-block;
        margin: 0;
        padding: 12px 20px;
        background: var(--rag-primary);
        color: #fff !important;
        border: none;
        border-radius: 10px;
        cursor: pointer;
        font-size: 15px;
        font-weight: 600;
        white-space: nowrap;
        line-height: 1.2;
        transition: background 0.15s ease, opacity 0.15s ease;
        -webkit-appearance: none;
        appearance: none;
      }

      #rag-search-button:hover:not(:disabled) {
        background: var(--rag-primary-hover);
      }

      #rag-search-button:disabled {
        opacity: 0.72;
        cursor: not-allowed;
      }

      #rag-status {
        margin-top: 10px;
        font-size: 13px;
        color: var(--rag-ok);
        min-height: 0;
      }

      #rag-status.is-error {
        color: var(--rag-err);
      }

      #rag-dialog {
        display: flex;
        flex-direction: column;
        gap: 12px;
        min-height: 240px;
      }

      #rag-dialog.is-loading #rag-answer-body {
        opacity: 0.55;
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
        background: var(--rag-bot-bg);
        box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
      }

      .rag-bubble-title {
        font-size: 13px;
        font-weight: 700;
        margin-bottom: 10px;
        color: var(--rag-muted);
        letter-spacing: 0.02em;
      }

      #rag-answer-body p {
        margin: 0 0 10px;
        line-height: 1.75;
        word-break: break-word;
      }

      #rag-answer-body p:last-child {
        margin-bottom: 0;
      }

      .rag-muted, .rag-error-hint {
        margin: 0;
        line-height: 1.7;
        color: var(--rag-muted);
      }

      .rag-error-hint {
        color: var(--rag-err);
        margin-bottom: 8px;
      }

      #rag-sources {
        border: 1px solid var(--rag-border);
        border-radius: 12px;
        padding: 14px 16px;
        background: var(--rag-card);
      }

      #rag-sources h5 {
        margin: 0 0 12px;
        font-size: 14px;
        color: var(--rag-text);
      }

      #rag-sources-list {
        list-style: none;
        margin: 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: 10px;
      }

      .rag-source-item {
        padding: 10px 12px;
        border-radius: 8px;
        background: var(--rag-bg);
        border: 1px solid var(--rag-border);
      }

      .rag-source-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        margin-bottom: 4px;
      }

      .rag-source-head a {
        color: var(--rag-primary);
        font-weight: 600;
        text-decoration: none;
        word-break: break-all;
      }

      .rag-source-head a:hover {
        text-decoration: underline;
      }

      .rag-source-score {
        font-size: 12px;
        color: var(--rag-muted);
        background: var(--rag-card);
        border: 1px solid var(--rag-border);
        border-radius: 999px;
        padding: 2px 8px;
        flex-shrink: 0;
      }

      .rag-source-snippet {
        margin: 0;
        font-size: 13px;
        line-height: 1.6;
        color: var(--rag-muted);
      }

      @media (max-width: 640px) {
        .rag-search-row {
          flex-direction: column;
        }

        #rag-search-button {
          width: 100%;
        }

        .rag-search-wrap {
          padding: 4px 8px 24px;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function init() {
    applyStyles();
    attachListeners();
    setEmptyState(true);
    showStatus("", false);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
