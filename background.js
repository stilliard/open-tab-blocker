chrome.webNavigation.onBeforeNavigate.addListener((details) => {
  if (details.frameId !== 0) return; // Only block main frame navigation

  chrome.storage.sync.get(['enabled', 'sites'], (result) => {
    if (result.enabled === false) return;

    const sites = result.sites || [];
    const url = new URL(details.url);
    const matchingSite = sites.find(site => 
      url.hostname.includes(site.url) || site.url.includes(url.hostname)
    );

    if (matchingSite) {
      if (shouldBlock(matchingSite)) {
        chrome.tabs.update(details.tabId, {
          url: chrome.runtime.getURL('blocked.html')
        });
      }
    }
  });
});

function shouldBlock(site) {
  if (site.alwaysBlock) return true;

  const now = new Date();
  const currentTime = now.getHours().toString().padStart(2, '0') + ':' + 
                     now.getMinutes().toString().padStart(2, '0');
  
  const startTime = site.startTime;
  const endTime = site.endTime;

  // Handle time comparison
  if (startTime <= endTime) {
    return currentTime >= startTime && currentTime <= endTime;
  } else {
    // Handle cases where block period crosses midnight
    return currentTime >= startTime || currentTime <= endTime;
  }
}