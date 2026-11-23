// Turns a study page into a slideshow: one slide per <h2> section (plus an intro slide).
// The HTML stays a normal single page; if this script fails, the page still works.
(function () {
  function build() {
    var main = document.querySelector('main');
    if (!main) return;

    // Group main's children: everything before the first <h2> is the intro slide.
    var groups = [[]];
    Array.prototype.slice.call(main.childNodes).forEach(function (node) {
      if (node.nodeType === 1 && node.tagName === 'H2') groups.push([]);
      groups[groups.length - 1].push(node);
    });
    groups = groups.filter(function (g) {
      return g.some(function (n) { return n.nodeType === 1 || (n.textContent || '').trim(); });
    });

    var deck = document.createElement('div');
    deck.className = 'deck';
    var slides = groups.map(function (g, i) {
      var s = document.createElement('section');
      s.className = 'slide';
      var inner = document.createElement('div');
      inner.className = 'slide-inner';
      g.forEach(function (n) { inner.appendChild(n); });
      s.appendChild(inner);
      var h2 = inner.querySelector('h2');
      var h1 = inner.querySelector('h1');
      s.dataset.title = h2 ? h2.textContent : (h1 ? h1.textContent : 'Intro');
      s.dataset.key = h2 && h2.id ? h2.id : (i === 0 ? 'intro' : 'slide' + i);
      deck.appendChild(s);
      return s;
    });
    main.appendChild(deck);

    // Chrome: top bar, side arrows, progress line.
    var bar = document.createElement('div');
    bar.className = 'deck-bar';
    bar.innerHTML = '<span class="deck-title"></span><span class="deck-right"><span class="deck-count"></span>' +
      '<button type="button" class="deck-toggle">All on one page</button></span>';
    var prev = document.createElement('button');
    prev.className = 'deck-nav deck-prev'; prev.type = 'button'; prev.setAttribute('aria-label', 'Previous section'); prev.innerHTML = '&#8249;';
    var next = document.createElement('button');
    next.className = 'deck-nav deck-next'; next.type = 'button'; next.setAttribute('aria-label', 'Next section'); next.innerHTML = '&#8250;';
    var prog = document.createElement('div');
    prog.className = 'deck-progress';
    document.body.appendChild(bar);
    document.body.appendChild(prev);
    document.body.appendChild(next);
    document.body.appendChild(prog);

    var titleEl = bar.querySelector('.deck-title');
    var countEl = bar.querySelector('.deck-count');
    var toggle = bar.querySelector('.deck-toggle');
    var current = 0;

    function show(i, opts) {
      opts = opts || {};
      if (i < 0 || i >= slides.length) return;
      var dir = i > current ? 'enter-next' : (i < current ? 'enter-prev' : '');
      slides[current].classList.remove('active', 'enter-next', 'enter-prev');
      current = i;
      var s = slides[i];
      s.classList.remove('enter-next', 'enter-prev');
      void s.offsetWidth; // restart the animation
      s.classList.add('active');
      if (dir && !document.body.classList.contains('deck-off')) s.classList.add(dir);
      titleEl.textContent = s.dataset.title;
      countEl.textContent = (i + 1) + ' / ' + slides.length;
      prev.disabled = i === 0;
      next.disabled = i === slides.length - 1;
      prog.style.width = (100 * (i + 1) / slides.length) + '%';
      if (opts.target) {
        opts.target.scrollIntoView();
        s.scrollTop = Math.max(0, s.scrollTop - 48); // clear the top bar
      } else if (!opts.keepScroll) {
        s.scrollTop = 0;
      }
      if (opts.updateHash !== false) {
        var key = opts.hash || s.dataset.key;
        if (location.hash.slice(1) !== key) history.replaceState(null, '', '#' + key);
      }
      try { localStorage.setItem('deck:' + location.pathname, String(i)); } catch (e) {}
    }

    function slideOf(el) {
      for (var k = 0; k < slides.length; k++) if (slides[k].contains(el)) return k;
      return -1;
    }

    function goToHash(hash, pushed) {
      var id = decodeURIComponent((hash || '').replace(/^#/, ''));
      if (!id) return false;
      for (var k = 0; k < slides.length; k++) {
        if (slides[k].dataset.key === id) { show(k, { updateHash: false }); return true; }
      }
      var el = document.getElementById(id);
      if (!el) return false;
      var k2 = slideOf(el);
      if (k2 < 0) return false;
      show(k2, { target: el, updateHash: false });
      return true;
    }

    prev.addEventListener('click', function () { show(current - 1); });
    next.addEventListener('click', function () { show(current + 1); });

    document.addEventListener('keydown', function (e) {
      if (document.body.classList.contains('deck-off')) return;
      if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      var t = e.target;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      if (e.key === 'ArrowRight') { e.preventDefault(); show(current + 1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); show(current - 1); }
    });

    // In-page links (#id) jump to the slide that contains the target.
    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[href^="#"]');
      if (!a || document.body.classList.contains('deck-off')) return;
      var hash = a.getAttribute('href');
      if (goToHash(hash)) { e.preventDefault(); history.pushState(null, '', hash); }
    });
    window.addEventListener('hashchange', function () { goToHash(location.hash); });
    window.addEventListener('popstate', function () { goToHash(location.hash); });

    toggle.addEventListener('click', function () {
      var off = document.body.classList.toggle('deck-off');
      document.body.classList.toggle('deck-on', !off);
      toggle.textContent = off ? 'Slideshow' : 'All on one page';
      if (off) {
        titleEl.textContent = document.querySelector('h1') ? document.querySelector('h1').textContent : '';
        slides[current].scrollIntoView();
      } else {
        show(current, { keepScroll: true });
      }
      try { localStorage.setItem('deck:mode', off ? 'off' : 'on'); } catch (e) {}
    });

    document.body.classList.add('deck-on');
    slides.forEach(function (s) { s.classList.remove('active'); });
    slides[0].classList.add('active');
    if (!goToHash(location.hash)) {
      var saved = 0;
      try { saved = parseInt(localStorage.getItem('deck:' + location.pathname) || '0', 10) || 0; } catch (e) {}
      show(Math.min(saved, slides.length - 1));
    }
    var mode = null;
    try { mode = localStorage.getItem('deck:mode'); } catch (e) {}
    if (mode === 'off') toggle.click();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
  else build();
})();
