// Set darkmode
document.getElementById('mode').addEventListener('click', () => {
  document.body.classList.toggle('dark');
  let theme = document.body.classList.contains('dark') ? 'dark' : 'light';
  localStorage.setItem('theme', theme);
  // Remark42 assigns changeTheme inside createInstance, i.e. only once embed.mjs has
  // loaded, so an early click would otherwise throw on undefined. Optional chaining both
  // levels rather than an `if`, because the widget is absent entirely on non-post pages.
  window.REMARK42?.changeTheme?.(theme);
});
  
// Enforce local storage setting but also fallback to user-agent preferences
if (localStorage.getItem('theme') === 'dark' || (!localStorage.getItem('theme') && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
  document.body.classList.add('dark');
}
