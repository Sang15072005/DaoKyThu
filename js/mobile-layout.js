/* Mobile-only navigation. Reuses the existing lesson and account actions. */
(function () {
  'use strict';
  const mobile = window.matchMedia('(max-width: 760px)');
  const el = id => document.getElementById(id);
  let activeSheet = null;

  function closeSheet() {
    if (!activeSheet) return;
    activeSheet.hidden = true;
    activeSheet = null;
    document.body.classList.remove('vqc-mobile-sheet-open');
    const trigger = document.querySelector('.vqc-mobile-nav button[aria-expanded="true"]');
    if (trigger) trigger.setAttribute('aria-expanded', 'false');
  }
  function showSheet(sheet, trigger) {
    if (!mobile.matches || !window.accountProfile?.uid) return;
    if (activeSheet === sheet) { closeSheet(); return; }
    closeSheet();
    sheet.hidden = false;
    activeSheet = sheet;
    document.body.classList.add('vqc-mobile-sheet-open');
    if (trigger) trigger.setAttribute('aria-expanded', 'true');
    sheet.querySelector('[data-vqc-sheet-close]')?.focus({ preventScroll: true });
  }
  function makeSheet(id, heading) {
    const overlay = document.createElement('div');
    overlay.id = id;
    overlay.className = 'vqc-mobile-sheet';
    overlay.hidden = true;
    overlay.innerHTML =
      '<div class="vqc-mobile-sheet__scrim" data-vqc-sheet-close="1"></div>' +
      '<section class="vqc-mobile-sheet__panel" role="dialog" aria-modal="true" aria-label="' + heading + '">' +
      '<header class="vqc-mobile-sheet__head"><h2>' + heading + '</h2><button type="button" data-vqc-sheet-close="1" aria-label="Đóng">✕</button></header>' +
      '<div class="vqc-mobile-sheet__content"></div></section>';
    overlay.addEventListener('click', event => {
      if (event.target.closest('[data-vqc-sheet-close]')) closeSheet();
    });
    document.body.appendChild(overlay);
    return overlay;
  }
  const lessonSheet = makeSheet('vqcMobileLessonSheet', '📚 Chọn bài học');
  const moreSheet = makeSheet('vqcMobileMoreSheet', '☰ Các chức năng');

  function board() {
    return document.querySelector('main.app .board-shell') || document.querySelector('main.app .board');
  }
  function toBoard() {
    closeSheet();
    if (!document.body.classList.contains('vqc-mode-class')) {
      if (typeof window.vqcEnterClass === 'function') window.vqcEnterClass();
      else document.querySelector('#vqcModeHome .btn-blue')?.click();
    }
    window.requestAnimationFrame(() => board()?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }
  function toHome() {
    closeSheet();
    if (typeof window.vqcGoHome === 'function') window.vqcGoHome();
  }
  function toClass() {
    closeSheet();
    if (typeof window.vqcEnterClass === 'function') window.vqcEnterClass();
    else document.querySelector('#vqcModeHome .btn-blue')?.click();
  }
  function toWorld() {
    closeSheet();
    if (typeof window.vqcOpenWorld === 'function') window.vqcOpenWorld();
  }
  function triggerExisting(id, fallback) {
    closeSheet();
    if (typeof fallback === 'function') fallback();
    else el(id)?.click();
  }
  function makeAction(parent, label, callback, icon) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'vqc-mobile-sheet__action';
    if (icon) {
      const i = document.createElement('span');
      i.className = 'vqc-mobile-sheet__icon'; i.textContent = icon; b.append(i);
    }
    b.append(document.createTextNode(label));
    b.addEventListener('click', callback);
    parent.append(b);
    return b;
  }
  function populateLessons() {
    const content = lessonSheet.querySelector('.vqc-mobile-sheet__content');
    content.replaceChildren();
    const original = document.querySelector('main.app .sidebar');
    if (!original) {
      const p = document.createElement('p'); p.textContent = 'Chưa tải được danh sách bài học.'; content.append(p); return;
    }
    for (const item of original.querySelectorAll('.lesson-title, .lesson')) {
      if (item.classList.contains('lesson-title')) {
        const h = document.createElement('h3');
        h.textContent = item.textContent.trim();
        content.append(h); continue;
      }
      if (item.hasAttribute('hidden') || item.style.display === 'none') continue;
      const icon = item.querySelector('.lesson-icon')?.textContent.trim() || '♟';
      const name = item.textContent.replace(icon, '').replace(/\s+/g, ' ').trim();
      const b = makeAction(content, name, () => {
        closeSheet();
        item.click();  // Reuse real classroom and exercise logic (including live sync).
        const hasExercise = Array.from(document.querySelectorAll(
          '.capture-overlay.open,.defense-overlay.open,.checkone-overlay.open,.escape-overlay.open,.freecapture-overlay.open,.mate-overlay.open,.mate3-overlay.open,.pawn-game-overlay.open'
        )).some(x => x.getClientRects().length);
        if (!hasExercise) window.requestAnimationFrame(() => board()?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
      }, icon);
      if (item.classList.contains('active')) b.classList.add('is-active');
    }
  }
  function populateMore() {
    const content = moreSheet.querySelector('.vqc-mobile-sheet__content');
    content.replaceChildren();
    makeAction(content, 'Vào lớp học', toClass, '🏫');
    makeAction(content, 'Khám phá các đảo', toWorld, '🏰');
    makeAction(content, 'Gói thành viên', () => triggerExisting('vqcMembershipLaunch', () => window.vqcOpenMembershipSafe?.()), '👑');
    makeAction(content, 'Lời mời thi đấu', () => {
      closeSheet();
      const bell = el('vqcInviteBell');
      if (bell && !bell.hidden) bell.click();
      else if (typeof window.vqcNotify === 'function') window.vqcNotify('Chưa có hộp thư lời mời thi đấu.', 'info');
    }, '🔔');
    makeAction(content, 'Tùy chỉnh bàn cờ', () => triggerExisting('unused', () => window.vqcOpenBoardAppearance?.()), '🎨');
    makeAction(content, 'Hồ sơ cá nhân', () => { closeSheet(); if (typeof window.showAccountPanel === 'function') window.showAccountPanel(); }, '👤');
    makeAction(content, 'Đăng xuất', () => { closeSheet(); if (typeof window.accountSignOut === 'function' && window.confirm('Đăng xuất khỏi Đảo Kỳ Thủ?')) window.accountSignOut(); }, '🚪');
  }
  function syncNav() {
    const logged = !!window.accountProfile?.uid;
    document.body.classList.toggle('vqc-mobile-logged-in', logged);
    const nav = document.querySelector('.vqc-mobile-nav');
    if (nav && nav.parentElement !== document.body) document.body.appendChild(nav);
    if (!logged) closeSheet();
    const mode = document.body.classList.contains('vqc-mode-class') ? 'board' :
      document.body.classList.contains('vqc-mode-world') ? 'home' : 'home';
    document.querySelectorAll('[data-vqc-mobile]').forEach(btn => {
      if (btn.dataset.vqcMobile === mode) btn.setAttribute('aria-current', 'page');
      else if (!activeSheet || !['lessons','more'].includes(btn.dataset.vqcMobile)) btn.removeAttribute('aria-current');
    });
  }
  function installClassShortcut() {
    const center = document.querySelector('main.app .center');
    if (!center || el('vqcMobileLessonsShortcut')) return;
    const b = document.createElement('button');
    b.id = 'vqcMobileLessonsShortcut';
    b.type = 'button';
    b.textContent = '☰ Chọn bài học / Chuyển bài';
    b.addEventListener('click', () => { populateLessons(); showSheet(lessonSheet); });
    center.prepend(b);
  }
  function exerciseNavigation() {
    const overlays = document.querySelectorAll(
      '.capture-overlay,.defense-overlay,.checkone-overlay,.escape-overlay,.freecapture-overlay,.mate-overlay,.mate3-overlay'
    );
    overlays.forEach(overlay => {
      const dialog = overlay.querySelector(
        '.capture-dialog,.defense-dialog,.checkone-dialog,.escape-dialog,.freecapture-dialog,.mate-dialog,.mate3-dialog'
      );
      if (!dialog || dialog.querySelector('.vqc-mobile-steps')) return;
      const originals = Array.from(dialog.querySelectorAll('button'));
      const options = [
        { label: '← Bài trước', pattern: /Bài trước/i },
        { label: '↻ Thử lại', pattern: /Thử lại|Chơi lại/i },
        { label: 'Bài tiếp →', pattern: /Bài tiếp|Bài sau/i }
      ];
      if (!options.some(option => originals.some(b => option.pattern.test(b.textContent)))) return;
      const bar = document.createElement('div'); bar.className = 'vqc-mobile-steps';
      bar.setAttribute('aria-label', 'Điều khiển bài tập trên điện thoại');
      options.forEach(option => {
        const sourceButton = originals.find(b => option.pattern.test(b.textContent));
        if (!sourceButton) return;
        const b = document.createElement('button');
        b.type = 'button'; b.textContent = option.label;
        b.addEventListener('click', () => {
          // Resolve the source button again: exercises can rerender their controls.
          const real = Array.from(dialog.querySelectorAll('button'))
            .find(node => !node.closest('.vqc-mobile-steps') && option.pattern.test(node.textContent));
          if (real && !real.disabled) real.click();
        });
        bar.append(b);
      });
      const top = dialog.querySelector('.mate-top');
      if (top) top.insertAdjacentElement('afterend', bar);
      else dialog.prepend(bar);
    });
  }
  function wire() {
    const nav = document.querySelector('.vqc-mobile-nav');
    if (nav && nav.parentElement !== document.body) document.body.appendChild(nav);
    if (!nav) return;
    nav.addEventListener('click', event => {
      const btn = event.target.closest('[data-vqc-mobile]');
      if (!btn) return;
      event.preventDefault();
      const action = btn.dataset.vqcMobile;
      if (action === 'home') toHome();
      if (action === 'class') toClass();
      if (action === 'board') toBoard();
      if (action === 'lessons') { if (!document.body.classList.contains('vqc-mode-class')) toClass(); populateLessons(); showSheet(lessonSheet, btn); }
      if (action === 'friends') triggerExisting('vqcFriendsOpen');
      if (action === 'account') { closeSheet(); if (typeof window.showAccountPanel === 'function') window.showAccountPanel(); }
      if (action === 'more') { populateMore(); showSheet(moreSheet, btn); }
      syncNav();
    });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeSheet(); });
    window.addEventListener('vqc:account-change', syncNav);
    const classes = new MutationObserver(() => syncNav());
    classes.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    installClassShortcut();
    exerciseNavigation();
    syncNav();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire);
  else wire();
})();
