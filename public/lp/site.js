// Behaviour for the hand-built pages: scroll reveal, the mobile menu and the
// savings calculator. Every page reads fine without it.
(() => {
  // ----- reveal on scroll -----
  const rising = document.querySelectorAll('[data-rise]');
  if ('IntersectionObserver' in window) {
    const seen = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('in');
        seen.unobserve(entry.target);
      }
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    rising.forEach((el) => seen.observe(el));
  } else {
    rising.forEach((el) => el.classList.add('in'));
  }

  // ----- mobile menu closes after a tap on a link -----
  const menu = document.querySelector('.nav__menu');
  if (menu) menu.addEventListener('click', (event) => { if (event.target.closest('a')) menu.removeAttribute('open'); });

  // ----- savings calculator -----
  const calc = document.querySelector('[data-calc]');
  if (!calc) return;

  const SETTINGS = {
    PKR: { users: 25, perUser: [1000, 8000, 100, 2800], own: [5000, 80000, 1000, 15000], format: (n) => 'PKR ' + Math.round(n).toLocaleString('en-US') },
    USD: { users: 25, perUser: [4, 40, 1, 10], own: [20, 400, 5, 50], format: (n) => '$' + Math.round(n).toLocaleString('en-US') },
  };
  const $ = (name) => calc.querySelector(`[data-calc-${name}]`);
  const users = $('users'), perUser = $('peruser'), own = $('own');
  let currency = 'PKR';

  const paint = (input) => {
    const span = input.max - input.min;
    input.style.setProperty('--fill', ((input.value - input.min) / span) * 100 + '%');
  };
  const setRange = (input, [min, max, step, value]) => { input.min = min; input.max = max; input.step = step; input.value = value; };
  const round = (n, to) => Math.round(n / to) * to;

  const update = () => {
    const { format } = SETTINGS[currency];
    const now = users.value * perUser.value * 12;
    const after = own.value * 12;
    const saving = Math.max(0, now - after);
    const unit = currency === 'PKR' ? 5000 : 50;
    $('users-out').textContent = users.value;
    $('peruser-out').textContent = format(perUser.value);
    $('own-out').textContent = format(own.value);
    $('saving').textContent = format(saving);
    $('now').textContent = format(now);
    $('after').textContent = format(after);
    $('fee').textContent = saving > 0 ? `${format(round((saving / 12) * 2, unit))} to ${format(round((saving / 12) * 4, unit))}` : 'Let\'s talk';
    $('share').textContent = now > 0 ? Math.round((after / now) * 100) + '%' : '0%';
    $('meter').style.setProperty('--w', Math.min(100, now > 0 ? (after / now) * 100 : 0) + '%');
    [users, perUser, own].forEach(paint);
  };

  calc.querySelectorAll('[name="currency"]').forEach((radio) => radio.addEventListener('change', () => {
    currency = radio.value;
    setRange(perUser, SETTINGS[currency].perUser);
    setRange(own, SETTINGS[currency].own);
    update();
  }));
  [users, perUser, own].forEach((input) => input.addEventListener('input', update));
  update();
})();
