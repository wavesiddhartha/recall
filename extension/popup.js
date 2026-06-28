// Recall Extension Popup Script

document.getElementById('open-app').addEventListener('click', (e) => {
  e.preventDefault();
  chrome.tabs.create({ url: 'http://localhost:5173' });
});
