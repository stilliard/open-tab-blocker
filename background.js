chrome.webNavigation.onBeforeNavigate.addListener((details) => {
    if (details.frameId !== 0) return; // Only block main frame navigation

    chrome.storage.sync.get(['buckets'], (result) => {
        const buckets = result.buckets || [];
        const url = new URL(details.url);

        // Check each enabled bucket
        for (const bucket of buckets) {
            if (!bucket.enabled) continue;

            // Check if the URL matches any site in this bucket
            const matchingSite = bucket.sites.find(site =>
                // url.hostname.includes(site.url) || site.url.includes(url.hostname) // the problem with this was if you had x.com blocked it'd also block abcx.com, we only want to block x.com and any subdomains
                url.hostname === site.url || url.hostname.endsWith('.' + site.url) // this is the fix
            );

            if (matchingSite && shouldBlockForBucket(bucket)) {
                chrome.tabs.update(details.tabId, {
                    url: chrome.runtime.getURL('blocked.html')
                });
                return;
            }
        }
    });
});

function shouldBlockForBucket(bucket) {
    if (bucket.alwaysBlock) return true;

    const now = new Date();
    const currentTime = now.getHours().toString().padStart(2, '0') + ':' +
        now.getMinutes().toString().padStart(2, '0');

    const startTime = bucket.startTime;
    const endTime = bucket.endTime;

    // Handle time comparison
    if (startTime <= endTime) {
        return currentTime >= startTime && currentTime <= endTime;
    } else {
        // Handle cases where block period crosses midnight
        return currentTime >= startTime || currentTime <= endTime;
    }
}
