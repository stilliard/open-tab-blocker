const params = new URLSearchParams(window.location.search);
const triggeredBucket = params.get('bucket');

chrome.storage.sync.get(['trackBlockCounts', 'blockCounts', 'buckets'], (result) => {
    // Apply custom block message if the bucket has one
    const buckets = result.buckets || [];
    const bucket = buckets.find(b => b.name === triggeredBucket);
    if (bucket && bucket.blockMessage) {
        document.getElementById('blockHeading').textContent = bucket.blockMessage;
    }

    if (!result.trackBlockCounts) return;

    const blockCounts = result.blockCounts || {};
    const today = new Date().toISOString().slice(0, 10);
    const todayCounts = blockCounts[today];
    if (!todayCounts || Object.keys(todayCounts).length === 0) return;

    const sorted = Object.entries(todayCounts).sort((a, b) => b[1] - a[1]);
    const total = sorted.reduce((sum, [, count]) => sum + count, 0);

    let html = `<h2>Today's Blocks</h2>`;
    for (const [bucketName, count] of sorted) {
        const highlight = bucketName === triggeredBucket ? ' highlight' : '';
        html += `<div class="block-count-row${highlight}">
            <span class="block-count-name">${bucketName}</span>
            <span class="block-count-badge">${count}</span>
        </div>`;
    }
    html += `<div class="block-total">${total} block${total !== 1 ? 's' : ''} today</div>`;

    const container = document.getElementById('blockCounts');
    container.innerHTML = html;
    container.style.display = 'block';
});
