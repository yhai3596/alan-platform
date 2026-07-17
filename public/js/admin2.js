// 后台交互（续）：页面内容编辑 + 图片上传 + Agent 中心 + 诊断知识库 + 用户搜索
(function () {
  var post = window.AdminPost || function (u, b, cb) {
    fetch(u, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) })
      .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
      .then(function (res) { cb(res.ok, res.d); }).catch(function () { cb(false, { error: '网络异常' }); });
  };
  var reloadTo = window.AdminReloadTo || function () { location.reload(); };
  function msg(el, ok, text) { if (!el) return; el.className = ok ? 'form-ok' : 'form-error'; el.textContent = text; el.style.minHeight = 'auto'; }

  // ════════ 页面内容编辑 ════════
  document.querySelectorAll('.content-field').forEach(function (fieldEl) {
    var key = fieldEl.getAttribute('data-key');
    var type = fieldEl.getAttribute('data-type');
    var input = fieldEl.querySelector('.cf-input');
    var m = fieldEl.querySelector('.cf-msg');
    var saveBtn = fieldEl.querySelector('.cf-save');
    var resetBtn = fieldEl.querySelector('.cf-reset');

    function save(val) {
      post('/admin/api/content', { key: key, value: val }, function (ok, d) {
        msg(m, ok, ok ? '已保存 ✓' : (d.error || '保存失败'));
        if (ok) setTimeout(function () { if (m) m.textContent = ''; }, 2000);
      });
    }
    if (saveBtn) saveBtn.addEventListener('click', function () { save(input.value); });
    if (resetBtn) resetBtn.addEventListener('click', function () {
      save(''); // 空 = 回落默认
      if (type !== 'image' && input) input.value = '';
      setTimeout(function () { reloadTo('pages'); }, 400);
    });

    // 图片上传
    var file = fieldEl.querySelector('.cf-file');
    if (file) file.addEventListener('change', function () {
      if (!file.files || !file.files[0]) return;
      var fd = new FormData(); fd.append('file', file.files[0]);
      msg(m, true, '上传中…');
      fetch('/admin/api/upload', { method: 'POST', body: fd })
        .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
        .then(function (res) {
          if (!res.ok) { msg(m, false, res.d.error || '上传失败'); return; }
          post('/admin/api/content', { key: key, value: res.d.url }, function (ok2, d2) {
            msg(m, ok2, ok2 ? '已更新 ✓' : (d2.error || '保存失败'));
            var prev = fieldEl.querySelector('.cf-preview');
            if (ok2 && prev && prev.tagName === 'IMG') prev.src = res.d.url;
            else if (ok2) setTimeout(function () { reloadTo('pages'); }, 400);
          });
        }).catch(function () { msg(m, false, '网络异常'); });
    });
  });

  // ════════ Agent 模式开关 ════════
  document.querySelectorAll('[data-mode-toggle]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var kind = btn.getAttribute('data-mode-toggle');
      var next = btn.getAttribute('data-on') !== '1';
      var body = {}; body[kind] = next;
      post('/admin/api/agent', body, function (ok, d) {
        if (!ok) { alanToast(d.error || '保存失败'); return; }
        btn.setAttribute('data-on', next ? '1' : '0');
        btn.classList.toggle('tag-accent', next); btn.classList.toggle('tag-neutral', !next);
        if (kind === 'autoreply') btn.textContent = next ? '已开启' : '已关闭';
        else btn.textContent = next ? '审核制' : '直接发布';
      });
    });
  });
  var scanSave = document.getElementById('scan-save');
  if (scanSave) scanSave.addEventListener('click', function () {
    var v = Number(document.getElementById('scan-interval').value);
    post('/admin/api/agent', { scanIntervalMin: v }, function (ok, d) { alanToast(ok ? '巡检间隔已保存' : (d.error || '保存失败')); });
  });

  // ════════ LLM 配置 ════════
  var llmSave = document.getElementById('llm-save');
  var llmTest = document.getElementById('llm-test');
  var llmMsg = document.getElementById('llm-msg');
  if (llmSave) llmSave.addEventListener('click', function () {
    var body = { base: document.getElementById('llm-base').value, model: document.getElementById('llm-model').value };
    var key = document.getElementById('llm-key').value;
    if (key) body.key = key;
    post('/admin/api/llm', body, function (ok, d) {
      msg(llmMsg, ok, ok ? ('已保存 · ' + (d.configured ? 'Key ' + d.keyMasked : '未设 Key')) : (d.error || '保存失败'));
      if (ok) document.getElementById('llm-key').value = '';
    });
  });
  if (llmTest) llmTest.addEventListener('click', function () {
    msg(llmMsg, true, '测试中…');
    post('/admin/api/llm-test', {}, function (ok, d) {
      if (d.ok) msg(llmMsg, true, '连接正常 · ' + d.model + ' · ' + d.latencyMs + 'ms · 回复「' + (d.reply || '') + '」');
      else msg(llmMsg, false, '失败：' + (d.error || '未知'));
    });
  });

  // ════════ API 令牌 ════════
  var tokenCreate = document.getElementById('token-create');
  if (tokenCreate) tokenCreate.addEventListener('click', function () {
    var name = document.getElementById('token-name').value.trim();
    if (!name) { alanToast('请给令牌起个名字'); return; }
    post('/admin/api/token', { name: name }, function (ok, d) {
      if (!ok) { alanToast(d.error || '生成失败'); return; }
      var box = document.getElementById('token-new');
      document.getElementById('token-value').textContent = d.token;
      box.hidden = false;
      document.getElementById('token-name').value = '';
    });
  });
  document.addEventListener('click', function (e) {
    var rev = e.target.closest ? e.target.closest('[data-token-revoke]') : null;
    if (!rev) return;
    if (!confirm('吊销该令牌？使用它的外部 Agent 将立即失效。')) return;
    post('/admin/api/token-revoke', { id: Number(rev.getAttribute('data-token-revoke')) }, function (ok, d) {
      if (!ok) { alanToast(d.error || '吊销失败'); return; }
      reloadTo('agent');
    });
  });

  // ════════ 诊断知识库 ════════
  var kbSave = document.getElementById('kb-save');
  var kbMsg = document.getElementById('kb-msg');
  if (kbSave) kbSave.addEventListener('click', function () {
    var spotLibrary = {};
    document.querySelectorAll('[data-kb-domain]').forEach(function (d) {
      spotLibrary[d.getAttribute('data-kb-domain')] = d.querySelector('.kb-spots').value.split('\n').map(function (s) { return s.trim(); }).filter(Boolean);
    });
    var foundationNotes = [];
    document.querySelectorAll('.kb-foundation').forEach(function (i) { foundationNotes[Number(i.getAttribute('data-i'))] = i.value; });
    var stageTemplates = [];
    document.querySelectorAll('.kb-stage').forEach(function (s) {
      stageTemplates[Number(s.getAttribute('data-i'))] = { name: s.querySelector('.kb-stage-name').value, window: s.querySelector('.kb-stage-window').value, desc: s.querySelector('.kb-stage-desc').value };
    });
    var summaryTemplate = document.getElementById('kb-summary').value;
    post('/admin/api/kb', { spotLibrary: spotLibrary, foundationNotes: foundationNotes, stageTemplates: stageTemplates, summaryTemplate: summaryTemplate }, function (ok, d) {
      msg(kbMsg, ok, ok ? '知识库已保存 ✓' : (d.error || '保存失败'));
    });
  });
  var kbReset = document.getElementById('kb-reset');
  if (kbReset) kbReset.addEventListener('click', function () {
    if (!confirm('恢复诊断知识库为内置默认？你的自定义会被清除。')) return;
    post('/admin/api/kb-reset', {}, function (ok, d) { if (ok) reloadTo('agent'); else alanToast(d.error || '失败'); });
  });

  // ════════ 用户搜索 ════════
  var search = document.getElementById('user-search');
  if (search) search.addEventListener('input', function () {
    var q = search.value.trim().toLowerCase();
    document.querySelectorAll('#user-rows tr').forEach(function (tr) { tr.hidden = q && tr.textContent.toLowerCase().indexOf(q) === -1; });
  });
})();
