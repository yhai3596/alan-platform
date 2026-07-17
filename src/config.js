// 运行时配置层：settings 表优先，.env 兜底。
// 管理后台改配置即时生效（无需重启）；密钥只存服务端，前端仅见脱敏形态。
const { db, getSetting, setSetting } = require('./db');

// —— LLM 配置 ——
function llmConfig() {
  return {
    key: getSetting('llm_api_key') || process.env.Z_AI_API_KEY || process.env.LLM_API_KEY || '',
    base: (getSetting('llm_base_url') || process.env.LLM_BASE_URL || 'https://api.z.ai/api/paas/v4').replace(/\/$/, ''),
    model: getSetting('llm_model') || process.env.LLM_MODEL || 'glm-4.5-flash',
  };
}
function saveLlmConfig({ key, base, model }) {
  if (key !== undefined && key !== '') setSetting('llm_api_key', String(key).trim());
  if (key === '__CLEAR__') setSetting('llm_api_key', '');
  if (base !== undefined) setSetting('llm_base_url', String(base).trim().replace(/\/$/, ''));
  if (model !== undefined) setSetting('llm_model', String(model).trim());
}
function maskKey(key) {
  if (!key) return '';
  return key.length <= 8 ? '****' : key.slice(0, 4) + '****' + key.slice(-4);
}

// —— Agent 模式 ——
function agentModes() {
  return {
    autoreply: getSetting('agent_autoreply', '1') === '1',          // 评论自动回复（自动上线）
    contentReview: getSetting('agent_content_review', '1') === '1', // Agent/AI 内容先入草稿待审
    scanIntervalMin: Math.max(1, Math.min(120, Number(getSetting('agent_scan_interval_min', '5')) || 5)),
  };
}
function saveAgentModes({ autoreply, contentReview, scanIntervalMin }) {
  if (autoreply !== undefined) setSetting('agent_autoreply', autoreply ? '1' : '0');
  if (contentReview !== undefined) setSetting('agent_content_review', contentReview ? '1' : '0');
  if (scanIntervalMin !== undefined) setSetting('agent_scan_interval_min', String(Math.max(1, Math.min(120, Number(scanIntervalMin) || 5))));
}

// —— Agent 活动日志（自动化的可观测底座） ——
const insActivity = db.prepare('INSERT INTO agent_activity(actor,action,target,detail,ok) VALUES (?,?,?,?,?)');
function logActivity(actor, action, target = '', detail = '', ok = true) {
  try {
    insActivity.run(String(actor).slice(0, 40), String(action).slice(0, 40),
      String(target).slice(0, 120), String(detail).slice(0, 300), ok ? 1 : 0);
  } catch (_) { /* 日志失败不影响主流程 */ }
}
function recentActivity(limit = 30) {
  return db.prepare('SELECT * FROM agent_activity ORDER BY id DESC LIMIT ?').all(Math.min(200, limit));
}

module.exports = { llmConfig, saveLlmConfig, maskKey, agentModes, saveAgentModes, logActivity, recentActivity };
