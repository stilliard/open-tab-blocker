let sites = [];
let editingIndex = null;

document.addEventListener('DOMContentLoaded', () => {
  loadSites();
  setupEventListeners();
  loadExtensionState();
});

function setupEventListeners() {
  document.getElementById('addSite').addEventListener('click', handleSiteSubmit);
  document.getElementById('alwaysBlock').addEventListener('change', toggleTimeSettings);
  document.getElementById('extensionEnabled').addEventListener('change', toggleExtension);
  
  // Add event delegation for the site list
  document.getElementById('siteList').addEventListener('click', (e) => {
    const target = e.target;
    if (target.tagName === 'BUTTON') {
      // Get the index from the data attribute
      const index = parseInt(target.dataset.index);
      
      if (target.classList.contains('edit-btn')) {
        editSite(index);
      } else if (target.classList.contains('delete-btn')) {
        deleteSite(index);
      }
    }
  });
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
        <button class="edit-btn" data-index="${index}">Edit</button>
        <button class="delete-btn" data-index="${index}">Delete</button>
      </div>
      <div>
        ${site.alwaysBlock ? 'Always Blocked' : 
          `Blocked from ${site.startTime} to ${site.endTime}`}
      </div>
    `;
    siteList.appendChild(siteElement);
  });

  // Update the Add/Update button text
  document.getElementById('addSite').textContent = editingIndex !== null ? 'Update Site' : 'Add Site';
  document.getElementById('addSiteTitle').textContent = editingIndex !== null ? 'Update Site' : 'Add Site';
}

function handleSiteSubmit() {
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

  const siteData = {
    url: url.toLowerCase(),
    alwaysBlock,
    startTime: alwaysBlock ? null : startTime,
    endTime: alwaysBlock ? null : endTime
  };

  if (editingIndex !== null) {
    // Update existing site
    sites[editingIndex] = siteData;
    editingIndex = null;
  } else {
    // Add new site
    sites.push(siteData);
  }

  chrome.storage.sync.set({ sites }, () => {
    clearForm();
    renderSites();
  });
}

function editSite(index) {
  editingIndex = index;
  const site = sites[index];
  
  document.getElementById('newSite').value = site.url;
  document.getElementById('alwaysBlock').checked = site.alwaysBlock;
  
  const timeSettings = document.getElementById('timeSettings');
  timeSettings.style.display = site.alwaysBlock ? 'none' : 'block';
  
  if (!site.alwaysBlock) {
    document.getElementById('startTime').value = site.startTime || '';
    document.getElementById('endTime').value = site.endTime || '';
  }

  // Scroll the form into view
  document.getElementById('newSite').scrollIntoView({ behavior: 'smooth' });
  
  // Update button text
  document.getElementById('addSite').textContent = 'Update Site';
  document.getElementById('addSiteTitle').textContent = 'Update Site';
}

function clearForm() {
  document.getElementById('newSite').value = '';
  document.getElementById('startTime').value = '';
  document.getElementById('endTime').value = '';
  document.getElementById('alwaysBlock').checked = false;
  document.getElementById('timeSettings').style.display = 'block';
  editingIndex = null;
  document.getElementById('addSite').textContent = 'Add Site';
  document.getElementById('addSiteTitle').textContent = 'Add Site';
}

function deleteSite(index) {
  if (confirm('Are you sure you want to delete this site?')) {
    sites.splice(index, 1);
    chrome.storage.sync.set({ sites }, () => {
      // If we're currently editing this site, clear the form
      if (editingIndex === index) {
        clearForm();
      } else if (editingIndex !== null && index < editingIndex) {
        // Adjust editingIndex if we deleted a site before it
        editingIndex--;
      }
      renderSites();
    });
  }
}

function toggleTimeSettings() {
  const timeSettings = document.getElementById('timeSettings');
  timeSettings.style.display = document.getElementById('alwaysBlock').checked ? 'none' : 'block';
}
