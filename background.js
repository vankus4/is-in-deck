const CSS = "body { border: 20px solid red; }";
const TITLE_APPLY = "Apply CSS";
const TITLE_REMOVE = "Remove CSS";
const APPLICABLE_PROTOCOLS = ["http:", "https:"];

// Toggle CSS: based on the current title, insert or remove the CSS and update the action
function toggleCSS(tab) {

  function gotTitle(title) {
    if (title === TITLE_APPLY) {
      browser.pageAction.setIcon({tabId: tab.id, path: "icons/on.svg"});
      browser.pageAction.setTitle({tabId: tab.id, title: TITLE_REMOVE});
      browser.tabs.insertCSS({code: CSS});
    } else {
      browser.pageAction.setIcon({tabId: tab.id, path: "icons/off.svg"});
      browser.pageAction.setTitle({tabId: tab.id, title: TITLE_APPLY});
      browser.tabs.removeCSS({code: CSS});
    }
  }

  let gettingTitle = browser.pageAction.getTitle({tabId: tab.id});
  gettingTitle.then(gotTitle);
}

// Returns true only if the URL's protocol is in APPLICABLE_PROTOCOLS.
function protocolIsApplicable(url) {
  const protocol = (new URL(url)).protocol;
  return APPLICABLE_PROTOCOLS.includes(protocol);
}

// Initialize the page action: set icon and title, then show.
function initializePageAction(tab) {
  if (protocolIsApplicable(tab.url) && tab.url.includes("moxfield.com")) {
    browser.pageAction.setIcon({tabId: tab.id, path: "icons/off.svg"});
    browser.pageAction.setTitle({tabId: tab.id, title: TITLE_APPLY});
    browser.pageAction.show(tab.id);
  }
}

// When first loaded, initialize the page action for all tabs.
let gettingAllTabs = browser.tabs.query({});
gettingAllTabs.then((tabs) => {
  for (let tab of tabs) {
    initializePageAction(tab);
  }
});

// Each time a tab is updated, initialize
browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  initializePageAction(tab);
});

// Toggle CSS when the page action is clicked.
browser.pageAction.onClicked.addListener(toggleCSS);