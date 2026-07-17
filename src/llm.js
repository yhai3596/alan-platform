// LLM 客户端：配置动态读取（管理后台 settings 优先，.env 兜底），改配置即时生效。
// 未配置时诊断报告/助手/自动回复走内置模板与 FAQ，功能完整可用。
const { llmConfig } = require('./config');

function enabled() { return !!llmConfig().key; }
function modelName() { return llmConfig().model; }

async function chat(messages, { maxTokens = 800, timeoutMs = 15000, json = false } = {}) {
  const cfg = llmConfig();
  if (!cfg.key) throw new Error('LLM not configured');
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const res = await fetch(`${cfg.base}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cfg.key}` },
      body: JSON.stringify({
        model: cfg.model,
        messages,
        max_tokens: maxTokens,
        temperature: 0.5,
        ...(json ? { response_format: { type: 'json_object' } } : {}),
      }),
      signal: ac.signal,
    });
    if (!res.ok) throw new Error(`LLM HTTP ${res.status}`);
    const data = await res.json();
    const text = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
    if (!text) throw new Error('LLM empty response');
    return text.trim();
  } finally {
    clearTimeout(timer);
  }
}

// 后台"测试连接"
async function testConnection() {
  const t0 = Date.now();
  try {
    const reply = await chat([
      { role: 'user', content: '只回复两个字：正常' },
    ], { maxTokens: 16, timeoutMs: 10000 });
    return { ok: true, model: llmConfig().model, latencyMs: Date.now() - t0, reply: reply.slice(0, 20) };
  } catch (e) {
    return { ok: false, model: llmConfig().model, latencyMs: Date.now() - t0, error: e.message };
  }
}

// 从可能带 markdown 代码围栏的输出中提取 JSON
function parseJson(text) {
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) throw new Error('no JSON in LLM output');
  return JSON.parse(m[0]);
}

module.exports = { enabled, chat, parseJson, testConnection, modelName };
