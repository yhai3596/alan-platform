// LLM 客户端：配置动态读取（管理后台 settings 优先，.env 兜底），改配置即时生效。
// 同时支持两种端点，按 Base URL 自动识别：
//   - OpenAI 兼容（默认）：{base}/chat/completions，Bearer 鉴权，解析 choices[0].message.content
//       智谱国内：https://open.bigmodel.cn/api/paas/v4 ； Z.AI 国际：https://api.z.ai/api/paas/v4
//   - Anthropic 兼容（base 含 "anthropic"）：{base}/v1/messages，x-api-key 鉴权，解析 content[].text
//       智谱：https://open.bigmodel.cn/api/anthropic
// 未配置时诊断报告/助手/自动回复走内置模板与 FAQ，功能完整可用。
const { llmConfig } = require('./config');

function enabled() { return !!llmConfig().key; }
function modelName() { return llmConfig().model; }
function isAnthropic(base) { return /anthropic/i.test(base); }

// OpenAI 的 [{role:system}, {role:user}] → Anthropic 的 {system, messages}
function toAnthropic(messages) {
  let system = '';
  const msgs = [];
  for (const m of messages) {
    if (m.role === 'system') system += (system ? '\n\n' : '') + m.content;
    else msgs.push({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content });
  }
  if (!msgs.length) msgs.push({ role: 'user', content: system || 'hi' });
  return { system, messages: msgs };
}

async function chat(messages, { maxTokens = 800, timeoutMs = 15000, json = false } = {}) {
  const cfg = llmConfig();
  if (!cfg.key) throw new Error('LLM not configured');
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), timeoutMs);
  try {
    let url, headers, body, extractText;

    if (isAnthropic(cfg.base)) {
      const { system, messages: amsgs } = toAnthropic(messages);
      url = `${cfg.base}/v1/messages`;
      headers = { 'Content-Type': 'application/json', 'x-api-key': cfg.key, 'anthropic-version': '2023-06-01', Authorization: `Bearer ${cfg.key}` };
      body = { model: cfg.model, max_tokens: maxTokens, temperature: 0.5, messages: amsgs };
      if (system) body.system = system;
      extractText = data => Array.isArray(data.content) ? data.content.filter(b => b.type === 'text').map(b => b.text).join('') : null;
    } else {
      url = `${cfg.base}/chat/completions`;
      headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${cfg.key}` };
      body = { model: cfg.model, messages, max_tokens: maxTokens, temperature: 0.5, ...(json ? { response_format: { type: 'json_object' } } : {}) };
      extractText = data => data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
    }

    const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body), signal: ac.signal });
    const raw = await res.text();
    if (!res.ok) {
      let detail = raw.slice(0, 300);
      try { const j = JSON.parse(raw); detail = (j.error && (j.error.message || j.error)) || j.message || detail; } catch (_) { /* raw */ }
      throw new Error(`HTTP ${res.status} · ${detail}`);
    }
    let data;
    try { data = JSON.parse(raw); } catch (_) { throw new Error(`响应非 JSON：${raw.slice(0, 200)}`); }
    const text = extractText(data);
    if (!text) throw new Error(`空响应（端点/模型可能不匹配）：${raw.slice(0, 200)}`);
    return text.trim();
  } finally {
    clearTimeout(timer);
  }
}

// 后台"测试连接"
async function testConnection() {
  const cfg = llmConfig();
  const t0 = Date.now();
  try {
    const reply = await chat([{ role: 'user', content: '只回复两个字：正常' }], { maxTokens: 16, timeoutMs: 12000 });
    return { ok: true, model: cfg.model, endpoint: isAnthropic(cfg.base) ? 'anthropic' : 'openai', latencyMs: Date.now() - t0, reply: reply.slice(0, 20) };
  } catch (e) {
    return { ok: false, model: cfg.model, endpoint: isAnthropic(cfg.base) ? 'anthropic' : 'openai', latencyMs: Date.now() - t0, error: e.message };
  }
}

// 从可能带 markdown 代码围栏的输出中提取 JSON
function parseJson(text) {
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) throw new Error('no JSON in LLM output');
  return JSON.parse(m[0]);
}

module.exports = { enabled, chat, parseJson, testConnection, modelName };
