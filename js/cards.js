/* 系统解剖学 · 教材目录 / 卡片
   目录：章 → 节 → 一、 →（一），每一级都可点进卡片；
   没有正文、只有下级的「一、」→ 浅灰小节标题（不可点）。 */
(function () {
  'use strict';
  var Z = window.YL, UI = window.YL_UI;
  var esc = Z.esc, icon = UI.icon;
  var st = { kw: '', open: {} };

  /* 从目录点进卡片后，返回时回到原位置 */
  var matY = 0, backMemo = null;
  window.addEventListener('scroll', function () {
    if ((location.hash || '').indexOf('#/mat') === 0) matY = window.scrollY || window.pageYOffset || 0;
  }, { passive: true });
  document.addEventListener('click', function (ev) {
    if ((location.hash || '').indexOf('#/mat') !== 0) return;
    var t = ev.target;
    if (!t || !t.closest) return;
    var a = t.closest('a.er');
    if (!a) return;
    var box = a.closest('[data-chap]');
    backMemo = {
      y: matY, top: a.getBoundingClientRect ? a.getBoundingClientRect().top : null,
      href: a.getAttribute('href') || '', chap: box ? box.getAttribute('data-chap') : ''
    };
  }, true);

  function chapEntries(chId) {
    var c = Z.chapterById(chId);
    if (!c) return [];
    return (c.entryIds || []).map(function (id) { return Z.matBy[id]; }).filter(Boolean);
  }
  function cardCount(chId) {
    return chapEntries(chId).filter(function (e) { return e.kind !== 'group'; }).length;
  }
  function matchKw(e, kw) {
    if (e.name.indexOf(kw) >= 0 || (e.en || '').toLowerCase().indexOf(kw.toLowerCase()) >= 0) return true;
    return Z.blocksText(e.blocks || []).indexOf(kw) >= 0;
  }
  function fx(s) {
    return String(s == null ? '' : s).replace(/^[(（]([一二三四五六七八九十]+)[)）]/, '（$1）');
  }
  function depthOf(e) { return Math.max(0, Math.min((e.lvl || 1) - 1, 3)); }
  function pad(depth) { return 8 + Math.min(depth, 3) * 18; }

  function renderMat(main) {
    var memo = backMemo;
    backMemo = null;
    if (memo && memo.chap) st.open[memo.chap] = true;
    UI.header({ title: '教材卡片', sub: Z.MAT.stats.cards + ' 张',
      actions: [{ icon: 'search', label: '搜索', onClick: function () { UI.go('#/search'); } }] });
    var h = ['<div class="searchbox mb10"><svg class="s-ico" viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5" fill="none" stroke-width="1.9"/><path d="m16 16 4.5 4.5" stroke-width="1.9" stroke-linecap="round" fill="none"/></svg>' +
      '<input class="input" id="mat-kw" placeholder="搜结构名 / 英文名 / 正文关键词" value="' + esc(st.kw) + '" autocomplete="off"></div>'];
    h.push('<div id="mat-list">' + listHTML() + '</div>');
    main.innerHTML = h.join('');
    bind(main);
    if (memo) {
      var put = function () {
        var el = memo.href ? document.querySelector('a.er[href="' + memo.href + '"]') : null;
        if (el && memo.top != null) {
          window.scrollTo(0, (window.scrollY || 0) + el.getBoundingClientRect().top - memo.top);
        } else { window.scrollTo(0, memo.y || 0); }
      };
      put();
      if (window.requestAnimationFrame) requestAnimationFrame(put);
    }
    var kw = main.querySelector('#mat-kw');
    var timer = null, composing = false;
    function apply() { st.kw = kw.value.trim(); main.querySelector('#mat-list').innerHTML = listHTML(); bind(main); }
    kw.addEventListener('compositionstart', function () { composing = true; });
    kw.addEventListener('compositionend', function () { composing = false; apply(); });
    kw.oninput = function () { if (composing) return; clearTimeout(timer); timer = setTimeout(apply, 160); };
  }

  function listHTML() {
    var kw = st.kw, out = [], hit = 0;
    (Z.MAT.parts || []).forEach(function (pt) {
      var chs = (pt.chapterIds || []).map(function (cid) { return Z.chapterById(cid); }).filter(Boolean);
      var rows = [];
      chs.forEach(function (c) {
        var all = chapEntries(c.id);
        var list = kw ? all.filter(function (e) { return matchKw(e, kw); }) : all;
        if (!list.length) return;
        hit += list.length;
        var open = !!st.open[c.id] || !!kw;
        rows.push('<div class="chap' + (open ? ' open' : '') + '" data-chap="' + c.id + '"><div class="chap-hd">' +
          '<span class="cn">' + esc(c.no ? c.no + '　' + c.name : c.name) + '</span>' +
          '<span class="chip gray tiny">' + cardCount(c.id) + ' 卡</span></div><div class="chap-bd">');
        if (open) rows.push(entriesHTML(c.id, kw, list));
        rows.push('</div></div>');
      });
      if (rows.length) out.push('<div class="part-hd">' + esc(pt.no) + '　' + esc(pt.name) + '</div>' + rows.join(''));
    });
    if (!hit) return UI.emptyBox('没有找到「' + kw + '」', '试试结构名（如 股骨）或英文（femur）');
    return out.join('');
  }

  function entriesHTML(chId, kw, pre) {
    var es = pre || chapEntries(chId);
    var out = ['<div class="ec-list">'], curSec = null;
    es.forEach(function (e) {
      if (e.kind === 'group') {
        out.push('<div class="ec-sub lv1" style="padding-left:' + pad(depthOf(e)) + 'px">' + esc(fx(e.name)) + '</div>');
        return;
      }
      if (!kw) {
        var sec = Z.sectionById(e.sectionId);
        if (sec && sec.id !== curSec) {
          curSec = sec.id;
          if (!sec.implicit && sec.no) out.push('<div class="ec-sec">' + esc(sec.no) + '　' + esc(sec.name) + '</div>');
        }
      }
      out.push(rowHTML(e, depthOf(e)));
    });
    out.push('</div>');
    return out.join('');
  }

  function rowHTML(e, depth) {
    var hid = Z.isHidden(e.id);
    var k = e.kind === 'intro' ? 'intro' : 'topic';
    var badge = e.kind === 'intro' ? '述' : '概';
    var cnt = e.kind !== 'group' ? (e.blocks || []).length : 0;
    return '<a class="er' + (hid ? ' hid' : '') + '" style="padding-left:' + pad(depth) + 'px" href="#/entry/' + e.id + '">' +
      '<span class="er-kind ' + k + '">' + badge + '</span>' +
      '<span class="er-nm">' + esc(fx(e.name)) +
      (e.subName && e.kind === 'intro' ? ' <span class="tiny dim">' + esc(e.subName) + '</span>' : '') +
      (e.en ? ' <span class="tiny dim">' + esc(e.en) + '</span>' : '') + '</span>' +
      (Z.isFav(e.id) ? '<span class="flag gold">☆</span>' : '') + '</a>';
  }

  function bind(main) {
    main.querySelectorAll('[data-chap] .chap-hd').forEach(function (hd) {
      hd.onclick = function () {
        var box = hd.closest('[data-chap]');
        var id = box.getAttribute('data-chap');
        st.open[id] = !st.open[id];
        box.classList.toggle('open', !!st.open[id]);
        var bd = box.querySelector('.chap-bd');
        if (st.open[id] && bd && !bd.innerHTML.trim()) bd.innerHTML = entriesHTML(id, '');
      };
    });
  }

  /* ---------------- 卡片页 ---------------- */
  function renderEntry(main, p) {
    var raw = Z.matBy[p[0]];
    if (!raw) { main.innerHTML = UI.emptyBox('卡片不存在'); return; }
    var v = Z.viewEntry(raw);
    var ch = Z.chapterById(v.chapterId), sec = Z.sectionById(v.sectionId);
    UI.header({ title: fx(v.name), sub: v.en || (ch ? (ch.no ? ch.no + ' ' + ch.name : ch.name) : ''), back: true, backTo: '#/mat' });
    var h = [];
    h.push('<div class="card card-main"><div class="ct-hd"><div class="ct-name">' + esc(fx(v.name)) +
      (v.en ? '<span class="ct-en">' + esc(v.en) + '</span>' : '') + '</div>' +
      '<div class="ct-sub">' + esc(ch ? (ch.no ? ch.no + ' ' + ch.name : ch.name) : '') +
      (sec && sec.name && !sec.implicit ? ' · ' + esc(sec.name) : '') + '</div></div>');
    var tcnt = tablesIn(v.id), icnt = imgsIn(v.id);
    h.push('<div class="meta-row"><span class="chip ' + (v.kind === 'intro' ? 'gold' : 'gray') + '">' +
      (v.kind === 'intro' ? '概述' : '概念卡') + '</span>' +
      (icnt ? '<span class="chip">' + icnt + ' 图</span>' : '') +
      (tcnt ? '<span class="chip gray">' + tcnt + ' 表</span>' : '') + '</div>');
    var anc = Z.ancestorsOf(v.id);
    if (anc.length) {
      h.push('<div class="crumb-row">' + anc.map(function (a) {
        return a.kind === 'group' ? '<span class="crumb">' + esc(fx(a.name)) + '</span>'
          : '<a class="crumb" href="#/entry/' + a.id + '">' + esc(fx(a.name)) + '</a>';
      }).join('<span class="crumb-sep">›</span>') + '</div>');
    }
    h.push('<div class="ct-body rich" id="ct-body">' + bodyHTML(v) + '</div>');
    h.push('<div class="ct-acts">' +
      '<button class="btn sm" data-act="note">' + icon('note') + '笔记</button>' +
      '<button class="btn sm' + (Z.isFav(v.id) ? ' on' : '') + '" data-act="fav">' + icon('star') + (Z.isFav(v.id) ? '已藏' : '收藏') + '</button>' +
      '<button class="btn sm" data-act="edit">' + icon('edit') + '编辑</button>' +
      '<button class="btn sm" data-act="hide">' + icon('hide') + '隐藏</button></div>' +
      '<div id="card-panel"></div></div>');
    var prev = Z.navEntry(v.id, -1), next = Z.navEntry(v.id, 1);
    h.push('<div class="pager-row"><button class="btn sm" id="e-prev"' + (prev ? '' : ' disabled') + '>‹ 上一条</button>' +
      '<span class="tiny dim">' + (v.kind === 'intro' ? '概述卡' : '概念卡') + '</span>' +
      '<button class="btn sm" id="e-next"' + (next ? '' : ' disabled') + '>下一条 ›</button></div>');
    main.innerHTML = h.join('');
    Z.store.last.entry = v.id; Z.save();
    bindImgs(main);
    main.querySelector('#e-prev').onclick = function () { if (prev) UI.replaceHash('#/entry/' + prev); };
    main.querySelector('#e-next').onclick = function () { if (next) UI.replaceHash('#/entry/' + next); };
    main.querySelectorAll('[data-act]').forEach(function (b) {
      b.onclick = function () { openPanel(main, b.getAttribute('data-act'), v); };
    });
  }

  function bindImgs(main) {
    main.querySelectorAll('.rich-img img').forEach(function (img) {
      img.onclick = function () { UI.lightbox(img.getAttribute('src')); };
    });
  }

  function bodyHTML(v) {
    var h = Z.renderRich(v.blocks);
    var kids = Z.childrenOf(v.id).filter(function (k) { return k.kind !== 'group'; });
    var gkids = Z.childrenOf(v.id).filter(function (k) { return k.kind === 'group'; });
    gkids.forEach(function (g) {
      Z.childrenOf(g.id).forEach(function (k) { if (k.kind !== 'group') kids.push(k); });
    });
    if (kids.length) {
      h += '<section class="sec"><h2 class="sec-h">下级卡片</h2><div class="kid-links">' +
        kids.map(function (k) {
          return '<a class="kl' + (Z.isHidden(k.id) ? ' hid' : '') + '" href="#/entry/' + k.id + '">' +
            '<span class="kl-n">' + esc(fx(k.name)) + '</span><span class="kl-go">›</span></a>';
        }).join('') + '</div></section>';
    }
    return h || '<div class="empty">本条未收录正文</div>';
  }

  function countsIn(id, type) {
    var n = 0, stack = [id];
    while (stack.length) {
      var cur = stack.pop(), e = Z.matBy[cur];
      if (e) (e.blocks || []).forEach(function (b) { if (b && b.t === type) n++; });
      Z.childrenOf(cur).forEach(function (k) { stack.push(k.id); });
    }
    return n;
  }
  function tablesIn(id) { return countsIn(id, 'table'); }
  function imgsIn(id) { return countsIn(id, 'img'); }

  /* ---------------- 面板：笔记 / 收藏 / 编辑 / 隐藏 ---------------- */
  function openPanel(main, kind, v) {
    var host = document.getElementById('card-panel');
    if (!host) return;
    var html = '';
    if (kind === 'note') {
      html = '<div class="panel"><div class="p-hd"><span>笔记</span><button class="btn xs ghost" data-pc="close">收起</button></div>' +
        '<textarea class="textarea" id="note-txt" placeholder="写下记忆点 / 易错点…">' + esc(Z.note(v.id)) + '</textarea>' +
        '<div class="p-ft"><button class="btn sm" data-pc="note-del">清除</button><button class="btn sm primary" data-pc="note-save">保存</button></div></div>';
    } else if (kind === 'fav') {
      html = '<div class="panel"><div class="p-hd"><span>收藏</span><button class="btn xs ghost" data-pc="close">收起</button></div>' +
        '<p class="small muted">' + (Z.isFav(v.id) ? '已收藏，再点一次取消。' : '收藏后可在「我的 → 收藏」快速找到。') + '</p>' +
        '<div class="p-ft"><button class="btn sm primary" data-pc="fav-do">' + (Z.isFav(v.id) ? '取消收藏' : '收藏') + '</button></div></div>';
    } else if (kind === 'hide') {
      html = '<div class="panel"><div class="p-hd"><span>隐藏</span><button class="btn xs ghost" data-pc="close">收起</button></div>' +
        '<p class="small muted">隐藏后目录里显示删除线，翻页跳过。</p><div class="p-ft"><button class="btn sm primary" data-pc="hide-do">' +
        (Z.isHidden(v.id) ? '取消隐藏' : '确认隐藏') + '</button></div></div>';
    } else {
      var secs = Z.splitSections(v.blocks);
      var body = secs.map(function (sec, i) {
        return '<div class="ef"><label>' + (sec.title ? esc(sec.title) : (i === 0 ? '开头（无小标题部分）' : '第 ' + (i + 1) + ' 段')) +
          '</label><textarea class="textarea ef-ta" data-sec="' + i + '">' + esc(Z.blocksText(sec.blocks)) + '</textarea></div>';
      }).join('');
      html = '<div class="panel"><div class="p-hd"><span>编辑内容</span><button class="btn xs ghost" data-pc="close">收起</button></div>' +
        '<p class="tiny dim">按原文结构分段编辑（每段一行一段，<b>**文字**</b> 为加粗）；标题行不可改。仅本机生效，可恢复原文。</p>' +
        body + '<div class="p-ft"><button class="btn sm" data-pc="edit-reset">恢复原文</button>' +
        '<button class="btn sm primary" data-pc="edit-save">保存修改</button></div></div>';
    }
    host.innerHTML = html;
    host.querySelectorAll('[data-pc="close"]').forEach(function (b) { b.onclick = function () { host.innerHTML = ''; }; });
    var sv = host.querySelector('[data-pc="note-save"]');
    if (sv) sv.onclick = function () { Z.setNote(v.id, host.querySelector('#note-txt').value); UI.toast('笔记已保存'); host.innerHTML = ''; };
    var dl = host.querySelector('[data-pc="note-del"]');
    if (dl) dl.onclick = function () { Z.setNote(v.id, ''); host.innerHTML = ''; };
    var fd = host.querySelector('[data-pc="fav-do"]');
    if (fd) fd.onclick = function () { Z.toggleFav(v.id); UI.toast(Z.isFav(v.id) ? '已收藏' : '已取消'); UI.render(); };
    var hd = host.querySelector('[data-pc="hide-do"]');
    if (hd) hd.onclick = function () { Z.setHidden(v.id, !Z.isHidden(v.id)); UI.toast('已更新'); UI.render(); };
    var er = host.querySelector('[data-pc="edit-reset"]');
    if (er) er.onclick = function () { delete Z.store.edits[v.id]; Z.save(true); UI.toast('已恢复原文'); UI.render(); };
    var es = host.querySelector('[data-pc="edit-save"]');
    if (es) es.onclick = function () {
      var secs2 = Z.splitSections(v.blocks), out = [];
      var changed = false;
      host.querySelectorAll('.ef-ta').forEach(function (ta) {
        var i = +ta.getAttribute('data-sec');
        var nb = Z.mdToBlocks(ta.value);
        var orig = Z.blocksText(secs2[i].blocks).trim();
        if ((ta.value || '').trim() !== orig) changed = true;
        out.push({ title: secs2[i].title, blocks: nb });
      });
      if (!changed) { UI.toast('没有改动'); return; }
      Z.store.edits[v.id] = { blocks: Z.joinSections(out) };
      Z.save(true); UI.toast('已保存（仅本机）'); host.innerHTML = ''; UI.render();
    };
  }

  Z.entryEditPanel = openPanel;
  UI.VIEWS.mat = renderMat;
  UI.VIEWS.entry = renderEntry;
})();
