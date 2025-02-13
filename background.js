/**
 * Handles navigation changes and checks if the URL should be blocked
 * @param {object} details - Navigation details from Chrome API
 */
function handleNavigationChange(details) {
    if (details.frameId !== 0) return; // Only block main frame navigation

    chrome.storage.sync.get(['buckets'], (result) => {
        const buckets = result.buckets || [];
        const url = new URL(details.url);

        // Check each enabled bucket
        for (const bucket of buckets) {
            if (!bucket.enabled) continue;

            // Check if the URL matches any site in this bucket
            const matchingSite = bucket.sites.find(site => urlMatchesSite(url, site));

            if (matchingSite && shouldBlockForBucket(bucket)) {
                chrome.tabs.update(details.tabId, {
                    url: chrome.runtime.getURL('blocked.html')
                });
                return;
            }
        }
    });
}

chrome.webNavigation.onBeforeNavigate.addListener(handleNavigationChange); // new page loads
chrome.webNavigation.onHistoryStateUpdated.addListener(handleNavigationChange); // pushState, replaceState, etc

/**
 * Checks if a URL matches a site's blocking pattern
 * block if the hostname matches the site URL or is a subdomain or if the full url (including protocol, path, etc) starts with the site URL
 * @param {URL} url - URL to check
 * @param {object} site - Site configuration object
 * @returns {boolean} - True if URL matches site pattern
 */
function urlMatchesSite(url, site) {
    return url.hostname === site.url
        || url.hostname.endsWith('.' + site.url)
        || url.href.startsWith(site.url);
}

/**
 * Converts time string to minutes since midnight
 * @param {string} timeStr - Time in format "HH:MM"
 * @returns {number} - Minutes since midnight
 */
function timeToMinutes(timeStr) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
}

/**
 * Determines if a bucket should be blocking at the current time
 * @param {object} bucket - The bucket configuration object
 * @returns {boolean} - True if the bucket should be blocking, false otherwise
 */
function shouldBlockForBucket(bucket) {
    if (!bucket.enabled) return false;

    // If always block is enabled, block regardless of time
    if (bucket.alwaysBlock) return true;

    // Get current time and day
    const now = new Date();
    const currentDay = now.getDay(); // 0-6, where 0 is Sunday

    // If days are specified and current day is not included, don't block
    if (bucket.days && bucket.days.length > 0 && !bucket.days.includes(currentDay)) {
        return false;
    }

    // Convert current time to minutes since midnight
    const currentTime = now.getHours() * 60 + now.getMinutes();

    // Convert bucket times to minutes since midnight
    const startTimeMinutes = timeToMinutes(bucket.startTime);
    const endTimeMinutes = timeToMinutes(bucket.endTime);

    // Check if current time falls within blocking period
    if (endTimeMinutes >= startTimeMinutes) {
        // Normal time range (e.g., 9:00 to 17:00)
        return currentTime >= startTimeMinutes && currentTime <= endTimeMinutes;
    } else {
        // Overnight time range (e.g., 22:00 to 06:00)
        return currentTime >= startTimeMinutes || currentTime <= endTimeMinutes;
    }
}
