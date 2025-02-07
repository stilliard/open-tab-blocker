let sites = [];

document.addEventListener('DOMContentLoaded', () => {
  loadSites();
  setupEventListeners();
  loadExtensionState();
});

function setupEventListeners() {
  document.getElementById('addSite').addEventListener('click', addNewSite);
  document.getElementById('alwaysBlock').addEventListener('change', toggleTimeSettings);
  document.getElementById('extensionEnabled').addEventListener('change', toggleExtension);
}

function loadExtensionState() {
  chrome.storage.sync.get(['enabled'], (result) => {
    document.getElementById('extensionEnabled').checked = result.enabled !== false;
  });
}

function toggleExtension(e) {
  const enabled = e.target.checked;
  chrome.storage.sync.set({ enabled });
}

function loadSites() {
  chrome.storage.sync.get(['sites'], (result) => {
    sites = result.sites || [];
    renderSites();
  });
}

function renderSites() {
  const siteList = document.getElementById('siteList');
  siteList.innerHTML = '';

  sites.forEach((site, index) => {
    const siteElement = document.createElement('div');
    siteElement.className = 'site-item';
    siteElement.innerHTML = `
      <div>
        <strong>${site.url}</strong>
        <button onclick="deleteSite(${index})">Delete</button>
      </div>
      <div>
        ${site.alwaysBlock ? 'Always Blocked' : 
          `Blocked from ${site.startTime} to ${site.endTime}`}
      </div>
    `;
    siteList.appendChild(siteElement);
  });
}

function addNewSite() {
  const url = document.getElementById('newSite').value.trim();
  const alwaysBlock = document.getElementById('alwaysBlock').checked;
  const startTime = document.getElementById('startTime').value;
  const endTime = document.getElementById('endTime').value;

  if (!url) {
    alert('Please enter a website URL');
    return;
  }

  if (!alwaysBlock && (!startTime || !endTime)) {
    alert('Please set both start and end times');
    return;
  }

  const newSite = {
    url: url.toLowerCase(),
    alwaysBlock,
    startTime: alwaysBlock ? null : startTime,
    endTime: alwaysBlock ? null : endTime
  };

  sites.push(newSite);
  chrome.storage.sync.set({ sites }, () => {
    document.getElementById('newSite').value = '';
    document.getElementById('startTime').value = '';
    document.getElementById('endTime').value = '';
    document.getElementById('alwaysBlock').checked = false;
    renderSites();
  });
}

function deleteSite(index) {
  sites.splice(index, 1);
  chrome.storage.sync.set({ sites }, renderSites);
}

function toggleTimeSettings() {
  const timeSettings = document.getElementById('timeSettings');
  timeSettings.style.display = document.getElementById('alwaysBlock').checked ? 'none' : 'block';
}