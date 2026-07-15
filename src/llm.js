// LLM 客户端（可选增强）：默认关闭，配置 Z_AI_API_KEY / LLM_API_KEY 后启用。
// 未配置时诊断报告/助手/自动回复走内置模板与 FAQ，功能完整可用。
const BASE = (process.env.LLM_BASE_URL || 'https://api.z.ai/api/paas/v4').replace(/\/$/, '');
const KEY = process.env.Z_AI_API_KEY || process.env.LLM_API_KEY || '';
const MODEL = process.env.LLM_MODEL || 'glm-4.5-flash';

function enabled() { return !!KEY; }

async function chat(messages, { maxTokens = 800, timeoutMs = 15000, json = false } = {}) {
  if (!KEY) throw new Error('LLM not configured');
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const res = await fetch(`${BASE}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KEY}` },
      body: JSON.stringify({
        model: MODEL,
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

// 从可能带 markdown 代码围栏的输出中提取 JSON
function parseJson(text) {
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) throw new Error('no JSON in LLM output');
  return JSON.parse(m[0]);
}

module.exports = { enabled, chat, parseJson, MODEL };
