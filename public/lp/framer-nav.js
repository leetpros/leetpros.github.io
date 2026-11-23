// Runs on the mirrored Framer pages only. Framer's script rebuilds those pages
// after load, so their markup can't be edited in place. This does two things.
(() => {
  // 1. Links to the hand-built pages get a full page load. Framer's script
  //    otherwise handles them itself, without leaving the page, and draws the old
  //    Framer home page it still carries.
  const HAND_BUILT = new Set(['/', '/index', '/erpnext']);
  addEventListener('click', (event) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = event.target.closest && event.target.closest('a[href]');
    if (!link || link.target === '_blank') return;
    const url = new URL(link.getAttribute('href'), location.href);
    if (url.origin !== location.origin) return;
    const path = url.pathname.replace(/\/+$/, '') || '/';
    if (!HAND_BUILT.has(path)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    location.assign(url.href);
  }, true);

  // 2. An "ERPNext" link is added before "Pricing" in the navigation bar and the
  //    phone menu (both are fixed to the screen; footer links are not), and put
  //    back if Framer redraws them.
  const MARK = 'data-lp-erp';
  const inFixedLayer = (el) => {
    for (let node = el; node && node !== document.body; node = node.parentElement) {
      const position = getComputedStyle(node).position;
      if (position === 'fixed' || position === 'sticky') return true;
    }
    return false;
  };
  // Matched on the path, because Framer carries query strings (ad and tracking
  // parameters) over onto its links.
  const isPricing = (link) => {
    try { return /\/pricing\/?$/.test(new URL(link.getAttribute('href'), location.href).pathname); } catch { return false; }
  };
  const add = () => {
    for (const pricing of document.querySelectorAll('a[href]')) {
      if (!isPricing(pricing)) continue;
      if (pricing.closest('[' + MARK + ']')) continue;
      if (pricing.getBoundingClientRect().width === 0 || !inFixedLayer(pricing)) continue;
      // The link sits inside a wrapper; the wrapper is the item in the row of links.
      let item = pricing;
      while (item.parentElement && item.parentElement.children.length === 1) item = item.parentElement;
      const before = item.previousElementSibling;
      if (before && before.hasAttribute(MARK)) continue;
      const copy = item.cloneNode(true);
      copy.setAttribute(MARK, '');
      const link = copy.matches('a') ? copy : copy.querySelector('a');
      link.setAttribute('href', '/erpnext');
      copy.querySelectorAll('[id]').forEach((el) => el.removeAttribute('id'));
      copy.removeAttribute('id');
      link.removeAttribute('data-framer-page-link-current');
      const walker = document.createTreeWalker(copy, NodeFilter.SHOW_TEXT);
      for (let node; (node = walker.nextNode());) if (node.nodeValue.trim() === 'Pricing') node.nodeValue = 'ERPNext';
      item.parentElement.insertBefore(copy, item);
    }
  };
  let queued = false;
  const schedule = () => { if (queued) return; queued = true; setTimeout(() => { queued = false; add(); }, 300); };
  const start = () => { setTimeout(add, 1200); new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true }); };
  document.readyState === 'complete' ? start() : addEventListener('load', start);
})();
