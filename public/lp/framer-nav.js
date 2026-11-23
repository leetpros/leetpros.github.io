// Runs on the mirrored Framer pages only. Framer's script rebuilds those pages
// after load, so their markup can't be edited in place; this adds an "ERPNext"
// link next to "Pricing" in the top navigation once the page has settled, and
// puts it back if Framer redraws the bar.
(() => {
  const MARK = 'data-lp-erp';
  const add = () => {
    for (const pricing of document.querySelectorAll('a[href$="pricing"]')) {
      if (pricing.closest('[' + MARK + ']')) continue;
      const box = pricing.getBoundingClientRect();
      const inTopBar = box.width > 0 && box.top < 140 && box.top >= 0 && !pricing.closest('footer');
      if (!inTopBar) continue;
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
