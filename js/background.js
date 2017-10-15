chrome.browserAction.onClicked.addListener(
    (tab) => {
        chrome.tabs.sendMessage(
            tab.id,
            {action: "toggle_search"}
        );
    }
);

chrome.runtime.onMessage.addListener(
    (request, sender, sendResponse) => {
        if (request.action == 'fetch-tab') {
            sendResponse({tab_id: sender.tab.id})
        }
    }
);