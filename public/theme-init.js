// Applies the saved (or system) theme before first paint to avoid a flash.
// Kept as an external file so the Content-Security-Policy can forbid inline scripts.
(function () {
  try {
    var t = localStorage.getItem('ur.theme');
    if (t !== 'light' && t !== 'dark') {
      t = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    document.documentElement.classList.toggle('dark', t === 'dark');
    document.documentElement.style.colorScheme = t;
  } catch (e) {}
})();
