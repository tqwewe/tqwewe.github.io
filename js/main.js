// Set darkmode
document.getElementById('mode').addEventListener('click', () => {
  document.body.classList.toggle('dark');
  localStorage.setItem('theme', document.body.classList.contains('dark') ? 'dark' : 'light');
});
  
// Enforce local storage setting but also fallback to user-agent preferences
if (localStorage.getItem('theme') === 'dark' || (!localStorage.getItem('theme') && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
  document.body.classList.add('dark');
}

// Random status on homepage
// const options = [
//   'Lazy but efficient ☕',
//   'Diving deep into Rust 🦀',
// ]

// const taglineEl = document.getElementById('tagline');
// taglineEl.textContent = options[Math.floor(Math.random()*options.length)];
