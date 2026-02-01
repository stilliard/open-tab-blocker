chrome.storage.sync.get(['trackBlockCounts', 'blockCounts'], (result) => {
    if (!result.trackBlockCounts) return;

    const blockCounts = result.blockCounts || {};
    const today = new Date().toISOString().slice(0, 10);
    const todayCounts = blockCounts[today];
    if (!todayCounts || Object.keys(todayCounts).length === 0) return;

    const params = new URLSearchParams(window.location.search);
    const triggeredBucket = params.get('bucket');

    const sorted = Object.entries(todayCounts).sort((a, b) => b[1] - a[1]);
    const total = sorted.reduce((sum, [, count]) => sum + count, 0);

    let html = `<h2>Today's Blocks</h2>`;
    for (const [bucket, count] of sorted) {
        const highlight = bucket === triggeredBucket ? ' highlight' : '';
        html += `<div class="block-count-row${highlight}">
            <span class="block-count-name">${bucket}</span>
            <span class="block-count-badge">${count}</span>
        </div>`;
    }
    html += `<div class="block-total">${total} block${total !== 1 ? 's' : ''} today</div>`;

    const container = document.getElementById('blockCounts');
    container.innerHTML = html;
    container.style.display = 'block';
});
