// 管理后台交互：页签切换 / 时间窗切换 / 内容筛选与编辑 / Agent 开关 / 用户搜索
(function () {
  var DATA = JSON.parse(document.getElementById('admin-data').textContent);

  // —— 页签 ——
  var tabs = { dash: document.getElementById('tab-dash'), content: document.getElementById('tab-content'), users: document.getElementById('tab-users') };
  var navBtns = document.querySelectorAll('[data-admin-tab]');
  function showTab(name) {
    for (var k in tabs) tabs[k].hidden = k !== name;
    navBtns.forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-admin-tab') === name); });
    try { sessionStorage.setItem('alan-admin-tab', name); } catch (e) {}
  }
  navBtns.forEach(function (b) { b.addEventListener('click', function () { showTab(b.getAttribute('data-admin-tab')); }); });
  try { var saved = sessionStorage.getItem('alan-admin-tab'); if (saved && tabs[saved]) showTab(saved); } catch (e) {}

  // —— 时间窗 ——
  document.querySelectorAll('input[name="range"]').forEach(function (r) {
    r.addEventListener('change', function () {
      try { sessionStorage.setItem('alan-admin-tab', 'dash'); } catch (e) {}
      location.href = '/admin?range=' + r.value;
    });
  });

  // —— 内容筛选 ——
  document.querySelectorAll('[data-content-filter]').forEach(function (chip) {
    chip.addEventListener('click', function () {
      var f = chip.getAttribute('data-content-filter');
      document.querySelectorAll('[data-content-filter]').forEach(function (c) {
        var on = c === chip;
        c.classList.toggle('tag-outline', on);
        c.classList.toggle('tag-neutral', !on);
      });
      document.querySelectorAll('#content-rows tr').forEach(function (tr) {
        tr.hidden = f !== 'all' && tr.getAttribute('data-ctype') !== f;
      });
    });
  });

  // —— 编辑对话框 ——
  var backdrop = document.getElementById('edit-backdrop');
  var fieldsEl = document.getElementById('edit-fields');
  var titleEl = document.getElementById('edit-title');
  var errEl = document.getElementById('edit-error');
  var current = null; // { type, id }

  function field(label, name, value, kind, options) {
    var wrap = document.createElement('div');
    wrap.className = 'field';
    var lab = document.createElement('label');
    lab.textContent = label;
    wrap.appendChild(lab);
    var input;
    if (kind === 'textarea') {
      input = document.createElement('textarea');
      input.className = 'input';
      input.style.minHeight = name === 'content_md' ? '220px' : '90px';
      input.value = value == null ? '' : value;
    } else if (kind === 'select') {
      input = document.createElement('select');
      input.className = 'input';
      (options || []).forEach(function (o) {
        var opt = document.createElement('option');
        opt.value = o[0]; opt.textContent = o[1];
        if (o[0] === String(value)) opt.selected = true;
        input.appendChild(opt);
      });
    } else {
      input = document.createElement('input');
      input.className = 'input';
      input.type = kind || 'text';
      input.value = value == null ? '' : value;
    }
    input.setAttribute('data-field', name);
    wrap.appendChild(input);
    return wrap;
  }

  var SCHEMAS = {
    post: function (d) {
      d = d || { title: '', category: '行业观察', excerpt: '', content_md: '', read_minutes: 5, status: 'draft' };
      return [
        field('标题', 'title', d.title),
        field('分类（行业观察 / 工具方法 / 专利 / 课程笔记…）', 'category', d.category),
        field('摘要（列表页展示）', 'excerpt', d.excerpt, 'textarea'),
        field('正文（Markdown）', 'content_md', d.content_md, 'textarea'),
        field('阅读时长（分钟）', 'read_minutes', d.read_minutes, 'number'),
        field('状态', 'status', d.status, 'select', [['published', '已发布'], ['draft', '草稿']]),
      ];
    },
    course: function (d) {
      d = d || { title: '', description: '', lectures: '', price_yuan: '', status: 'live', tag: '', kicker: '' };
      return [
        field('课程名称', 'title', d.title),
        field('课程介绍', 'description', d.description, 'textarea'),
        field('讲数', 'lectures', d.lectures, 'number'),
        field('价格（元，留空为待定）', 'price_yuan', d.price_yuan, 'number'),
        field('状态', 'status', d.status, 'select', [['live', '已上线'], ['coming', '筹备中']]),
        field('角标（热门 / 进阶，可留空）', 'tag', d.tag),
        field('卡片眉标（如“已上线 · 12 讲”，留空自动生成）', 'kicker', d.kicker),
      ];
    },
    tool: function (d) {
      d = d || { name: '', description: '', status: 'live', url: '' };
      return [
        field('工具名称', 'name', d.name),
        field('工具介绍', 'description', d.description, 'textarea'),
        field('状态', 'status', d.status, 'select', [['live', '已上线'], ['coming', '筹备中']]),
        field('工具链接（http(s)://…，留空表示接入中）', 'url', d.url),
      ];
    },
  };
  var TYPE_NAMES = { post: '文章', course: '课程', tool: '工具' };

  function openEditor(type, id) {
    var data = null;
    if (id != null) {
      var list = DATA[type + 's'];
      for (var i = 0; i < list.length; i++) if (String(list[i].id) === String(id)) { data = list[i]; break; }
    }
    current = { type: type, id: id };
    titleEl.textContent = (id != null ? '编辑' : '新建') + TYPE_NAMES[type];
    errEl.textContent = '';
    fieldsEl.innerHTML = '';
    SCHEMAS[type](data).forEach(function (f) { fieldsEl.appendChild(f); });
    backdrop.hidden = false;
  }
  function closeEditor() { backdrop.hidden = true; current = null; }

  document.addEventListener('click', function (e) {
    var btn = e.target.closest ? e.target.closest('[data-edit]') : null;
    if (btn) openEditor(btn.getAttribute('data-edit'), btn.getAttribute('data-id'));
  });
  document.getElementById('edit-cancel').addEventListener('click', closeEditor);
  backdrop.addEventListener('click', function (e) { if (e.target === backdrop) closeEditor(); });

  document.getElementById('btn-new-content').addEventListener('click', function () {
    var type = prompt('新建内容类型：输入 1=文章，2=课程，3=工具', '1');
    if (type === '1') openEditor('post', null);
    else if (type === '2') openEditor('course', null);
    else if (type === '3') openEditor('tool', null);
  });

  document.getElementById('edit-save').addEventListener('click', function () {
    if (!current) return;
    var payload = { id: current.id != null ? Number(current.id) : undefined };
    fieldsEl.querySelectorAll('[data-field]').forEach(function (inp) {
      payload[inp.getAttribute('data-field')] = inp.value;
    });
    errEl.textContent = '';
    fetch('/admin/api/' + current.type, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
    }).then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
      .then(function (res) {
        if (!res.ok) { errEl.textContent = res.d.error || '保存失败'; return; }
        try { sessionStorage.setItem('alan-admin-tab', 'content'); } catch (e) {}
        location.reload();
      })
      .catch(function () { errEl.textContent = '网络异常，请稍后再试'; });
  });

  // —— Agent 开关 ——
  var agentToggle = document.getElementById('agent-toggle');
  if (agentToggle) {
    agentToggle.addEventListener('click', function () {
      var next = agentToggle.getAttribute('data-on') !== '1';
      fetch('/admin/api/agent', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ autoreply: next })
      }).then(function (r) { return r.json(); }).then(function () {
        agentToggle.setAttribute('data-on', next ? '1' : '0');
        agentToggle.textContent = next ? '已开启' : '已关闭';
        agentToggle.classList.toggle('tag-accent', next);
        agentToggle.classList.toggle('tag-neutral', !next);
      });
    });
  }

  // —— 用户搜索 ——
  var search = document.getElementById('user-search');
  if (search) {
    search.addEventListener('input', function () {
      var q = search.value.trim().toLowerCase();
      document.querySelectorAll('#user-rows tr').forEach(function (tr) {
        tr.hidden = q && tr.textContent.toLowerCase().indexOf(q) === -1;
      });
    });
  }
})();
