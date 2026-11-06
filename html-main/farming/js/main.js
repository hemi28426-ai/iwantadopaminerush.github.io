// Farming Unblocked — boot: runs every registered module's init, then starts the loop.
(function () {
  'use strict';
  if (!window.THREE || !window.FU || !FU.boot) {
    var el = document.getElementById('fu-error');
    if (el) { el.style.display = 'block'; el.textContent = 'Farming Unblocked could not load (three.js missing). Check your internet and reload.'; }
    return;
  }
  FU.boot();
})();
