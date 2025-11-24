// Set darkmode
document.getElementById('mode').addEventListener('click', () => {
  document.body.classList.toggle('dark');
  let theme = document.body.classList.contains('dark') ? 'dark' : 'light';
  localStorage.setItem('theme', theme);
  if (window.CUSDIS) {
    window.CUSDIS.setTheme(theme);
  }
});
  
// Enforce local storage setting but also fallback to user-agent preferences
if (localStorage.getItem('theme') === 'dark' || (!localStorage.getItem('theme') && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
  document.body.classList.add('dark');
}
