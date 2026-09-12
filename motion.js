(() => {
  'use strict';
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const motionToggle = $('.motion-toggle');
  motionToggle.hidden = reducedMotion.matches;
  motionToggle.addEventListener('click', () => {
    const paused = document.body.classList.toggle('motion-paused');
    motionToggle.setAttribute('aria-pressed', String(paused));
    motionToggle.textContent = paused ? '播放循环动效 ▷' : '暂停循环动效 Ⅱ';
  });
  if (!reducedMotion.matches && 'IntersectionObserver' in window) {
    document.documentElement.classList.add('js-motion');
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('is-visible'); observer.unobserve(entry.target); }
    }), { threshold: 0.06 });
    $$('.reveal').forEach(el => observer.observe(el));
    $$('.hero h1 .line > span').forEach((el, i) => el.animate([{ transform: 'translateY(110%)' }, { transform: 'translateY(0)' }], { duration: 950, delay: 80 + i * 120, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'backwards' }));
  }
  const clock = $('#local-time');
  function updateClock() { clock.textContent = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Shanghai', hour: '2-digit', minute: '2-digit' }).format(new Date()); }
  updateClock(); setInterval(updateClock, 60000);
  let scrollFrame = 0;
  function updateScroll() {
    const max = document.documentElement.scrollHeight - innerHeight;
    $('.page-progress').style.transform = `scaleX(${max > 0 ? scrollY / max : 0})`;
    let current = '';
    ['work', 'about', 'contact'].forEach(id => { if (document.getElementById(id).getBoundingClientRect().top < innerHeight * .45) current = id; });
    $$('[data-section]').forEach(link => { const active = link.dataset.section === current; link.classList.toggle('is-active', active); if (active) link.setAttribute('aria-current', 'location'); else link.removeAttribute('aria-current'); });
    scrollFrame = 0;
  }
  addEventListener('scroll', () => { if (!scrollFrame) scrollFrame = requestAnimationFrame(updateScroll); }, { passive: true });
  addEventListener('resize', updateScroll); updateScroll();

  // Only the deliberate chapter-entry links use the circle. Wheel and touch remain native.
  let navigating = false;
  $$('[data-portal]').forEach(link => link.addEventListener('click', async event => {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0 || reducedMotion.matches) return;
    event.preventDefault(); if (navigating) return;
    const target = document.querySelector(link.hash); if (!target) return;
    navigating = true;
    const portal = $('.portal');
    const rect = link.getBoundingClientRect();
    const x = event.detail ? event.clientX : rect.x + rect.width / 2;
    const y = event.detail ? event.clientY : rect.y + rect.height / 2;
    const scale = Math.hypot(innerWidth, innerHeight) / 10;
    Object.assign(portal.style, { left: `${x - 12}px`, top: `${y - 12}px`, visibility: 'visible' });
    try {
      await portal.animate([{ transform: 'scale(0)' }, { transform: `scale(${scale})` }], { duration: 250, easing: 'cubic-bezier(.55,0,1,.45)', fill: 'forwards' }).finished;
      const html = document.documentElement; const oldBehavior = html.style.scrollBehavior;
      html.style.scrollBehavior = 'auto'; target.scrollIntoView({ behavior: 'instant' }); html.style.scrollBehavior = oldBehavior;
      history.pushState(null, '', link.hash);
      target.setAttribute('tabindex', '-1'); target.focus({ preventScroll: true });
      await portal.animate([{ transform: `scale(${scale})` }, { transform: 'scale(0)' }], { duration: 650, easing: 'cubic-bezier(0,.55,.45,1)', fill: 'forwards' }).finished;
    } finally { portal.getAnimations().forEach(a => a.cancel()); portal.style.visibility = 'hidden'; navigating = false; }
  }));

  const projects = {
    claude: { number: '01', label: 'INDEPENDENT PRODUCT / 独立产品', title: '让连接，变得简单。', intro: 'Claude 网络配置工具：从一个反复出现的使用障碍，到服务 100 多位付费用户的独立产品。', sections: [['起点', '离职后，我发现不少用户因为网络配置问题无法正常使用 Claude。这个反复出现的难题，让我看到了可以动手解决的需求。'], ['我的工作', '独立开发全自动配置程序，并完成定价、销售、交付与售后。从写出工具，到处理用户真正遇到的问题，我参与了整个过程。'], ['走到哪里', '已经服务 100 多位付费客户。它让我第一次完整经历：发现需求、做成产品、交付使用，再根据反馈继续改进。']], note: '项目封面为连接主题的概念视觉，并非产品界面截图。用户数量来自本站原有经历介绍。' },
    workflow: { number: '02', label: 'AI AUTOMATION / 电商运营', title: '从个人脚本，到团队工具。', intro: '在真实的店铺运营里发现重复工作，再用 AI 辅助开发，把效率工具交给团队。', sections: [['业务现场', '大三时，我在宝尊电子商务有限公司实习，参与 PUMA 拼多多店铺运营。日报、调价与活动执行中的重复流程，让我看见了工作流被优化的空间。'], ['我的工作', '我使用 Codex 与 Claude Code 搭建了一套 AI 驱动的自动化脚本，先优化自己的工作流，再分发给团队成员使用。'], ['我的收获', '从自己手边的问题开始，比先设想一个宏大的产品更容易得到真实反馈。工具有没有价值，要回到它被使用的场景里看。']], note: '项目封面为运营流程的概念排版。暂无可公开的内部界面或量化效率数据，因此不展示未经验证的提升比例。' },
    journal: { number: '03', label: 'LEARNING IN PUBLIC / 内容创作', title: '让过程，也有价值。', intro: '把项目、方法和踩过的坑记录下来，让实践过程被看见。', sections: [['为什么记录', '产品和方向会变化，但真正帮助过别人的内容会留下来。我希望积累不依附于单一项目的内容与信任。'], ['正在做什么', '在小红书和抖音记录正在做的项目、使用的方法和踩过的坑，让真实过程被有需要的人找到。'], ['持续探索', '企业真正愿意付钱的 AI 场景是哪些？个人 IP 攒下的信任能换来什么？传统生意里，哪些环节值得用 AI 重做一遍？这些问题会继续带着我往前走。']], note: '这是持续进行的实践记录。你可以通过页尾的小红书账号，找到我的公开内容。' }
  };
  const caseDialog = $('#case-dialog');
  $$('[data-project]').forEach(button => button.addEventListener('click', () => {
    const p = projects[button.dataset.project];
    $('#case-content').innerHTML = `<p class="mono">${p.number} / ${p.label}</p><h2 id="case-title">${p.title}</h2><p class="case-intro">${p.intro}</p>${p.sections.map(([title, body]) => `<section class="case-section"><h3>${title}</h3><p>${body}</p></section>`).join('')}<p class="case-note">${p.note}</p><a class="case-contact" href="mailto:2069490556@qq.com">聊聊这个项目 ↗</a>`;
    caseDialog.showModal(); caseDialog.scrollTop = 0;
  }));
  const socialDialog = $('#social-dialog');
  $$('[data-social]').forEach(button => button.addEventListener('click', () => {
    const wechat = button.dataset.social === 'wechat';
    $('#social-title').textContent = wechat ? '微信联系' : '在小红书，继续看';
    $('#social-image').src = wechat ? 'assets/wechat-qr-jael.png' : 'assets/xiaohongshu-jael-card.jpg';
    $('#social-image').alt = wechat ? 'Jael 的微信二维码' : 'Jael 的小红书个人名片';
    $('#social-description').textContent = wechat ? '微信号：Jaelane0729 · 添加时请备注来意' : '小红书号：4217588599 · 一位爱折腾 AI 的大学生';
    $('#social-copy').dataset.copy = wechat ? 'Jaelane0729' : '4217588599';
    socialDialog.showModal();
  }));
  $$('[data-close]').forEach(button => button.addEventListener('click', () => button.closest('dialog').close()));
  $$('dialog').forEach(dialog => dialog.addEventListener('click', event => { if (event.target === dialog) { const r = dialog.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close(); } }));
  let toastTimer;
  function notify(message) {
    const toast = $('.toast');
    // Place status inside the active modal so it remains accessible in the top layer.
    (document.querySelector('dialog[open]') || document.body).append(toast);
    toast.textContent = message; toast.classList.add('is-visible');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 3200);
  }
  $$('[data-copy]').forEach(button => button.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(button.dataset.copy); notify('已复制，期待与你聊聊。'); }
    catch { notify(`暂时无法自动复制，请手动复制：${button.dataset.copy}`); }
  }));
})();
