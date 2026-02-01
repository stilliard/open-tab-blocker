let buckets = [];
let editingBucketIndex = null;
let frictionMode = false;
let recordUnlocks = false;
let unlockLog = [];
let pendingFrictionCallback = null;

const frictionSentences = [
    "I am choosing to procrastinate right now",
    "I am giving up on my goals for today",
    "This distraction is more important than my work",
    "I would rather scroll than be productive",
    "My future self will be disappointed in me",
    "I am choosing instant gratification over long term success",
    "I do not respect my own time",
    "I am not strong enough to stay focused",
    "I am wasting the one life I have on this",
    "Nobody who achieves their dreams does this",
    "I am letting down everyone who believes in me",
    "I will regret this when the deadline hits",
];

document.addEventListener('DOMContentLoaded', () => {
    loadBuckets();
    loadSettings();
    loadUnlockLog();
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

    document.getElementById('alwaysBlock').addEventListener('change', toggleTimeSettings);

    // Time period control icons
    document.querySelector('.add-time').addEventListener('click', showSecondPeriod);
    document.querySelector('.remove-time').addEventListener('click', hideSecondPeriod);

    // Friction mode toggle
    document.getElementById('frictionModeToggle').addEventListener('change', (e) => {
        if (e.target.checked) {
            frictionMode = true;
            saveSettings();
        } else {
            // Turning OFF requires challenge
            e.target.checked = true;
            showFrictionChallenge(() => {
                frictionMode = false;
                saveSettings();
                renderSettings();
            });
        }
    });

    // Record Unlocks toggle
    document.getElementById('recordUnlocksToggle').addEventListener('change', (e) => {
        recordUnlocks = e.target.checked;
        saveSettings();
        renderSettings();
    });

    // Clear history button
    document.getElementById('clearHistory').addEventListener('click', () => {
        unlockLog = [];
        saveUnlockLog();
        renderHistory();
    });

    // Friction modal buttons
    document.getElementById('frictionCancel').addEventListener('click', hideFrictionChallenge);
    document.getElementById('frictionConfirm').addEventListener('click', () => {
        if (pendingFrictionCallback) {
            pendingFrictionCallback();
            pendingFrictionCallback = null;
        }
        hideFrictionChallenge();
    });

    // Friction input — prevent paste, real-time matching
    const frictionInput = document.getElementById('frictionInput');
    frictionInput.addEventListener('paste', (e) => e.preventDefault());
    frictionInput.addEventListener('drop', (e) => e.preventDefault());
    frictionInput.addEventListener('input', () => {
        const sentence = document.getElementById('frictionSentence').textContent;
        const matches = frictionInput.value.toLowerCase() === sentence.toLowerCase();
        document.getElementById('frictionConfirm').disabled = !matches;
        frictionInput.classList.toggle('match', matches);
        frictionInput.classList.toggle('no-match', !matches && frictionInput.value.length > 0);
    });

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
}

function toggleTimeSettings() {
    const timeSettings = document.getElementById('timeSettings');
    const alwaysBlock = document.getElementById('alwaysBlock').checked;
    timeSettings.style.display = alwaysBlock ? 'none' : 'block';
}

function toggleSecondPeriod() {
    const secondPeriod = document.querySelector('.second-period');
    const button = document.getElementById('toggleSecondPeriod');
    if (secondPeriod.style.display === 'none') {
        secondPeriod.style.display = 'flex';
        button.textContent = 'Remove Second Period';
    } else {
        secondPeriod.style.display = 'none';
        button.textContent = 'Add Second Period';
        document.getElementById('startTime2').value = '';
        document.getElementById('endTime2').value = '';
    }
}

function showSecondPeriod() {
    document.querySelector('.second-period').style.display = 'flex';
    document.querySelector('.add-time').style.display = 'none';
}

function hideSecondPeriod() {
    const secondPeriod = document.querySelector('.second-period');
    secondPeriod.style.display = 'none';
    document.getElementById('startTime2').value = '';
    document.getElementById('endTime2').value = '';
    document.querySelector('.add-time').style.display = 'inline-flex';
}

function switchTab(tabName) {
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.tab === tabName);
    });

    document.getElementById('addForm').style.display = tabName === 'add' ? 'block' : 'none';
    document.getElementById('manageView').style.display = tabName === 'manage' ? 'block' : 'none';
    document.getElementById('settingsView').style.display = tabName === 'settings' ? 'block' : 'none';
    document.getElementById('historyView').style.display = tabName === 'history' ? 'block' : 'none';

    if (tabName === 'history') {
        renderHistory();
    }

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

        let timingText = 'Always Blocked';
        if (!bucket.alwaysBlock) {
            timingText = `Blocked from ${bucket.startTime} to ${bucket.endTime}`;
            if (bucket.startTime2 && bucket.endTime2) {
                timingText += ` and ${bucket.startTime2} to ${bucket.endTime2}`;
            }
            timingText += ` ${daysText}`;
        }

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
        ${timingText}
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
    const startTime2 = document.getElementById('startTime2').value;
    const endTime2 = document.getElementById('endTime2').value;
    const selectedDays = Array.from(document.querySelectorAll('.day-checkbox:checked'))
        .map(checkbox => parseInt(checkbox.value));

    if (!name) {
        alert('Please enter a bucket name');
        return;
    }

    if (!alwaysBlock && !startTime && !endTime && !startTime2 && !endTime2) {
        alert('Please set at least one time period');
        return;
    }

    if (!alwaysBlock && ((startTime && !endTime) || (!startTime && endTime) ||
        (startTime2 && !endTime2) || (!startTime2 && endTime2))) {
        alert('Please set both start and end times for each time period');
        return;
    }

    const bucketData = {
        name,
        alwaysBlock,
        startTime: alwaysBlock ? null : startTime,
        endTime: alwaysBlock ? null : endTime,
        startTime2: alwaysBlock ? null : startTime2,
        endTime2: alwaysBlock ? null : endTime2,
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
        document.getElementById('startTime').value = bucket.startTime || '';
        document.getElementById('endTime').value = bucket.endTime || '';
        document.getElementById('startTime2').value = bucket.startTime2 || '';
        document.getElementById('endTime2').value = bucket.endTime2 || '';

        const secondPeriod = document.querySelector('.second-period');
        const addTimeIcon = document.querySelector('.add-time');
        if (bucket.startTime2 || bucket.endTime2) {
            secondPeriod.style.display = 'flex';
            addTimeIcon.style.display = 'none';
        } else {
            secondPeriod.style.display = 'none';
            addTimeIcon.style.display = 'inline-flex';
        }

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
    if (frictionMode) {
        showFrictionChallenge(() => {
            buckets.splice(index, 1);
            saveBuckets();
        });
    } else {
        if (confirm('Are you sure you want to delete this bucket and all its sites?')) {
            buckets.splice(index, 1);
            saveBuckets();
        }
    }
}

function deleteSite(bucketIndex, siteIndex) {
    buckets[bucketIndex].sites.splice(siteIndex, 1);
    saveBuckets();
}

function toggleBucket(index, enabled) {
    if (frictionMode && !enabled) {
        // Toggling OFF with friction mode — revert checkbox and show challenge
        renderBuckets();
        showFrictionChallenge(() => {
            buckets[index].enabled = false;
            saveBuckets();
            if (recordUnlocks) {
                unlockLog.push({
                    bucketName: buckets[index].name,
                    disabledAt: new Date().toISOString(),
                    enabledAt: null
                });
                saveUnlockLog();
            }
        });
    } else {
        buckets[index].enabled = enabled;
        saveBuckets();
        if (recordUnlocks) {
            if (!enabled) {
                unlockLog.push({
                    bucketName: buckets[index].name,
                    disabledAt: new Date().toISOString(),
                    enabledAt: null
                });
                saveUnlockLog();
            } else {
                // Re-enabling: find the most recent open record for this bucket
                for (let i = unlockLog.length - 1; i >= 0; i--) {
                    if (unlockLog[i].bucketName === buckets[index].name && unlockLog[i].enabledAt === null) {
                        unlockLog[i].enabledAt = new Date().toISOString();
                        saveUnlockLog();
                        break;
                    }
                }
            }
        }
    }
}

function clearBucketForm() {
    document.getElementById('bucketName').value = '';
    document.getElementById('alwaysBlock').checked = false;
    document.getElementById('startTime').value = '';
    document.getElementById('endTime').value = '';
    document.getElementById('startTime2').value = '';
    document.getElementById('endTime2').value = '';
    document.getElementById('timeSettings').style.display = 'block';
    document.querySelector('.second-period').style.display = 'none';
    document.querySelector('.add-time').style.display = 'inline-flex';

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

function loadSettings() {
    chrome.storage.sync.get(['frictionMode', 'recordUnlocks'], (result) => {
        frictionMode = result.frictionMode || false;
        recordUnlocks = result.recordUnlocks || false;
        renderSettings();
    });
}

function saveSettings() {
    chrome.storage.sync.set({ frictionMode, recordUnlocks });
}

function renderSettings() {
    document.getElementById('frictionModeToggle').checked = frictionMode;
    document.getElementById('recordUnlocksToggle').checked = recordUnlocks;
    document.getElementById('historyTab').style.display = recordUnlocks ? 'flex' : 'none';
}

function showFrictionChallenge(callback) {
    pendingFrictionCallback = callback;
    const sentence = frictionSentences[Math.floor(Math.random() * frictionSentences.length)];
    document.getElementById('frictionSentence').textContent = sentence;
    document.getElementById('frictionInput').value = '';
    document.getElementById('frictionInput').classList.remove('match', 'no-match');
    document.getElementById('frictionConfirm').disabled = true;
    document.getElementById('frictionModal').style.display = 'flex';
    document.getElementById('frictionInput').focus();
}

function hideFrictionChallenge() {
    document.getElementById('frictionModal').style.display = 'none';
    document.getElementById('frictionInput').value = '';
    pendingFrictionCallback = null;
}

function loadUnlockLog() {
    chrome.storage.sync.get(['unlockLog'], (result) => {
        unlockLog = result.unlockLog || [];
        pruneUnlockLog();
    });
}

function saveUnlockLog() {
    chrome.storage.sync.set({ unlockLog });
}

function pruneUnlockLog() {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const before = unlockLog.length;
    unlockLog = unlockLog.filter(entry => entry.disabledAt >= sevenDaysAgo);
    if (unlockLog.length !== before) {
        saveUnlockLog();
    }
}

function renderHistory() {
    const container = document.getElementById('historyEntries');

    if (unlockLog.length === 0) {
        container.innerHTML = '<div class="history-empty">No unlock history yet.</div>';
        return;
    }

    // Group by day, most recent first
    const sorted = [...unlockLog].sort((a, b) => b.disabledAt.localeCompare(a.disabledAt));
    const groups = {};
    for (const entry of sorted) {
        const day = entry.disabledAt.slice(0, 10);
        if (!groups[day]) groups[day] = [];
        groups[day].push(entry);
    }

    let html = '';
    for (const [day, entries] of Object.entries(groups)) {
        const dateObj = new Date(day + 'T00:00:00');
        const label = dateObj.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
        html += `<div class="history-day-group">`;
        html += `<div class="history-day-label">${label}</div>`;
        for (const entry of entries) {
            const time = new Date(entry.disabledAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
            let durationHtml;
            if (entry.enabledAt === null) {
                durationHtml = '<span class="history-duration still-off">still off</span>';
            } else {
                const ms = new Date(entry.enabledAt) - new Date(entry.disabledAt);
                durationHtml = `<span class="history-duration">${formatDuration(ms)}</span>`;
            }
            html += `<div class="history-entry">
                <div class="history-entry-info">
                    <span class="history-bucket-name">${entry.bucketName}</span>
                    <span class="history-time">${time}</span>
                </div>
                ${durationHtml}
            </div>`;
        }
        html += `</div>`;
    }

    container.innerHTML = html;
}

function formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainMinutes = minutes % 60;
    if (hours < 24) return remainMinutes > 0 ? `${hours}h ${remainMinutes}m` : `${hours}h`;
    const days = Math.floor(hours / 24);
    const remainHours = hours % 24;
    return remainHours > 0 ? `${days}d ${remainHours}h` : `${days}d`;
}
