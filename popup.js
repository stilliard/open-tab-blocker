let buckets = [];
let editingBucketIndex = null;

document.addEventListener('DOMContentLoaded', () => {
    loadBuckets();
    setupEventListeners();
});

function setupEventListeners() {
    // Tab switching
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => switchTab(tab.dataset.tab));
    });

    // Bucket form handlers
    document.getElementById('saveBucket').addEventListener('click', handleBucketSubmit);
    document.getElementById('cancelEdit').addEventListener('click', cancelEdit);

    // Bucket list event delegation
    document.getElementById('bucketList').addEventListener('click', (e) => {
        const target = e.target;

        if (target.tagName === 'BUTTON') {
            const bucketItem = target.closest('.bucket-item');
            if (!bucketItem) return;

            const bucketIndex = parseInt(bucketItem.dataset.bucketIndex);
            const siteItem = target.closest('.site-item');

            if (target.classList.contains('delete-bucket-btn')) {
                deleteBucket(bucketIndex);
            } else if (target.classList.contains('edit-bucket-btn')) {
                editBucket(bucketIndex);
            } else if (target.classList.contains('delete-site-btn')) {
                deleteSite(bucketIndex, parseInt(siteItem.dataset.siteIndex));
            } else if (target.classList.contains('add-site-btn')) {
                const input = bucketItem.querySelector('.add-site-input');
                addSiteToBucket(bucketIndex, input.value);
                input.value = ''; // Clear input after adding
            }
        } else if (target.type === 'checkbox') {
            const bucketIndex = parseInt(target.closest('.bucket-item').dataset.bucketIndex);
            toggleBucket(bucketIndex, target.checked);
        }
    });

    document.getElementById('alwaysBlock').addEventListener('change', toggleTimeSettings);
}

function toggleTimeSettings() {
    const timeSettings = document.getElementById('timeSettings');
    const alwaysBlock = document.getElementById('alwaysBlock').checked;
    timeSettings.style.display = alwaysBlock ? 'none' : 'block';
}

function switchTab(tabName) {
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.tab === tabName);
    });

    // Toggle visibility of both views
    document.getElementById('addForm').style.display = tabName === 'add' ? 'block' : 'none';
    document.getElementById('manageView').style.display = tabName === 'manage' ? 'block' : 'none';

    if (tabName === 'manage' && editingBucketIndex !== null) {
        cancelEdit();
    }
}

function renderBuckets() {
    const bucketList = document.getElementById('bucketList');
    bucketList.innerHTML = '';

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    buckets.forEach((bucket, bucketIndex) => {
        const bucketElement = document.createElement('div');
        bucketElement.className = 'bucket-item';
        bucketElement.dataset.bucketIndex = bucketIndex;

        const daysText = bucket.days && bucket.days.length > 0
            ? `on ${bucket.days.map(d => dayNames[d]).join(', ')}`
            : 'every day';

        bucketElement.innerHTML = `
      <div class="bucket-header">
        <h3>${bucket.name}</h3>
        <div>
          <label class="toggle-switch">
            <input type="checkbox" ${bucket.enabled ? 'checked' : ''}>
            <span class="slider"></span>
          </label>
          <button class="edit-bucket-btn">Edit</button>
          <button class="delete-bucket-btn">Delete</button>
        </div>
      </div>
      <div class="bucket-timing ${bucket.alwaysBlock ? 'always' : ''}">
        ${bucket.alwaysBlock ? 'Always Blocked' : `Blocked from ${bucket.startTime} to ${bucket.endTime} ${daysText}`}
      </div>
      <div class="bucket-sites">
        ${bucket.sites.map((site, siteIndex) => `
          <div class="site-item" data-site-index="${siteIndex}">
            ${site.url}
            <button class="delete-site-btn">&#128473;</button>
          </div>
        `).join('')}
        <div class="add-site-form">
          <input type="text" class="add-site-input" placeholder="Enter website (e.g., youtube.com)">
          <button class="add-site-btn">Add Site</button>
        </div>
      </div>
    `;

        bucketList.appendChild(bucketElement);
    });
}

function handleBucketSubmit() {
    const name = document.getElementById('bucketName').value.trim();
    const alwaysBlock = document.getElementById('alwaysBlock').checked;
    const startTime = document.getElementById('startTime').value;
    const endTime = document.getElementById('endTime').value;
    const selectedDays = Array.from(document.querySelectorAll('.day-checkbox:checked'))
        .map(checkbox => parseInt(checkbox.value));

    if (!name) {
        alert('Please enter a bucket name');
        return;
    }

    if (!alwaysBlock && (!startTime || !endTime)) {
        alert('Please set both start and end times');
        return;
    }

    const bucketData = {
        name,
        alwaysBlock,
        startTime: alwaysBlock ? null : startTime,
        endTime: alwaysBlock ? null : endTime,
        enabled: true,
        sites: [],
        days: selectedDays
    };

    if (editingBucketIndex !== null) {
        // Preserve existing sites when editing
        bucketData.sites = buckets[editingBucketIndex].sites;
        buckets[editingBucketIndex] = bucketData;
        editingBucketIndex = null;
    } else {
        buckets.push(bucketData);
    }

    saveBuckets();
    clearBucketForm();
    switchTab('manage');
}

function editBucket(index) {
    editingBucketIndex = index;
    const bucket = buckets[index];

    document.getElementById('bucketName').value = bucket.name;
    document.getElementById('alwaysBlock').checked = bucket.alwaysBlock;

    const timeSettings = document.getElementById('timeSettings');
    timeSettings.style.display = bucket.alwaysBlock ? 'none' : 'block';

    if (!bucket.alwaysBlock) {
        document.getElementById('startTime').value = bucket.startTime;
        document.getElementById('endTime').value = bucket.endTime;

        // Set day checkboxes
        document.querySelectorAll('.day-checkbox').forEach(checkbox => {
            checkbox.checked = bucket.days ? bucket.days.includes(parseInt(checkbox.value)) : false;
        });
    }

    document.getElementById('formTitle').textContent = 'Edit Bucket';
    document.getElementById('saveBucket').textContent = 'Update Bucket';
    document.getElementById('cancelEdit').style.display = 'block';

    switchTab('add');
}

function cancelEdit() {
    clearBucketForm();
    document.getElementById('formTitle').textContent = 'Add New Bucket';
    document.getElementById('saveBucket').textContent = 'Create Bucket';
    document.getElementById('cancelEdit').style.display = 'none';
    editingBucketIndex = null;
    switchTab('manage');
}

function addSiteToBucket(bucketIndex, url) {
    url = url.trim().toLowerCase();
    if (!url) {
        alert('Please enter a website URL');
        return;
    }

    buckets[bucketIndex].sites.push({ url });
    saveBuckets();
}

function deleteBucket(index) {
    if (confirm('Are you sure you want to delete this bucket and all its sites?')) {
        buckets.splice(index, 1);
        saveBuckets();
    }
}

function deleteSite(bucketIndex, siteIndex) {
    buckets[bucketIndex].sites.splice(siteIndex, 1);
    saveBuckets();
}

function toggleBucket(index, enabled) {
    buckets[index].enabled = enabled;
    saveBuckets();
}

function clearBucketForm() {
    document.getElementById('bucketName').value = '';
    document.getElementById('alwaysBlock').checked = false;
    document.getElementById('startTime').value = '';
    document.getElementById('endTime').value = '';
    document.getElementById('timeSettings').style.display = 'block';

    // Clear day selections
    document.querySelectorAll('.day-checkbox').forEach(checkbox => {
        checkbox.checked = false;
    });

    document.getElementById('formTitle').textContent = 'Add New Bucket';
    document.getElementById('saveBucket').textContent = 'Create Bucket';
    document.getElementById('cancelEdit').style.display = 'none';
    editingBucketIndex = null;
}

function saveBuckets() {
    chrome.storage.sync.get(['buckets'], () => {
        chrome.storage.sync.set({ buckets }, () => {
            renderBuckets();
        });
    });
}

function loadBuckets() {
    chrome.storage.sync.get(['buckets'], (result) => {
        buckets = result.buckets || [];
        renderBuckets();
    });
}
