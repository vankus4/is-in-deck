const TITLE_ON = "show counts";
const TITLE_OFF = "hide counts";
const APPLICABLE_PROTOCOLS = ["http:", "https:"];

// onClick handler
function toggleCSS(tab) {
  //const storedState = sessionStorage.getItem("backgroundState" + tab.id);

  function gotTitle(title) {
    const isTitleOn = title === TITLE_ON;
    browser.pageAction.setIcon({tabId: tab.id, path: isTitleOn ? "icons/on.svg" : "icons/off.svg"});
    browser.pageAction.setTitle({tabId: tab.id, title: isTitleOn ? TITLE_OFF : TITLE_ON});
    sessionStorage.setItem("backgroundState" + tab.id, isTitleOn ? TITLE_ON : TITLE_OFF);
    browser.tabs.sendMessage(tab.id, {pageActionState: isTitleOn ? TITLE_ON : TITLE_OFF});
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
    const storedState = sessionStorage.getItem("backgroundState" + tab.id);

    // initialize the state for the first time
    if (storedState === null){
      sessionStorage.setItem("backgroundState" + tab.id, TITLE_OFF);
      storedState = TITLE_OFF;
    }

    const isStoredStateOn = storedState === TITLE_ON;
    browser.pageAction.setIcon({tabId: tab.id, path: isStoredStateOn ? "icons/on.svg" : "icons/off.svg"});
    browser.pageAction.setTitle({tabId: tab.id, title: isStoredStateOn ? TITLE_OFF : TITLE_ON});
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