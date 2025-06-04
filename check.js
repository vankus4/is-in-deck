const HEADER_HTML = "<th>Deck Presence</th>";
const TOKEN_OBJECT = {
    token: "",
    time: 0
}

const generateDeckUrl = (searchTerm) => {
    const data = {
      hub: "",
      format: "",
      deckName: "",
      cardId: "",
      cardName: "",
      board: "",
      lastSearch: "",
      filter: searchTerm,
      authUserNames: "",
      commandCardId: "",
      commandCardName: "",
      partnerCardId: "",
      partnerCardName: "",
      commanderSignatureSpellCardId: "",
      commanderSignatureSpellCardName: "",
      partnerSignatureSpellCardId: "",
      partnerSignatureSpellCardName: "",
      companionCardId: "",
      companionCardName: "",
      bracketSetting: "equals",
      bracket: "",
      sortColumn: "name",
      sortDirection: "descending",
      pageNumber: 1,
      pageSize: 64,
      view: "personal"
    };
  
    const jsonData = JSON.stringify(data);
  
    // Base64 encode the JSON string
    const encodedData = btoa(jsonData);
  
    const baseUrl = 'https://moxfield.com/decks/personal?q=';
    const fullUrl = baseUrl + encodeURIComponent(encodedData);  // Encode the Base64 query part
  
    return fullUrl;
  }

const getResultsCountFromCard = async (cardName, token) => {
    const storedState = sessionStorage.getItem("actionState");
    if (storedState !== "show counts") {
        return null;
    }

    try {
        const url = 'https://api2.moxfield.com/v2/decks/personal/search?pageNumber=1&pageSize=64&sortType=name&sortDirection=descending&filter=' + cardName;

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Authorization': "Bearer " + token,         
            },
            credentials: "include"
        });

        if (!response.ok) {
            throw new Error('API request failed');
        }

        const data = await response.json();

        return data.totalResults;

    } catch (error) {
        console.error('Error fetching data from Moxfield API:', error);
        return null;
    }
}

const getBearerToken = async () => {
    const storedState = sessionStorage.getItem("actionState");
    if (storedState !== "show counts") {
        return null;
    }

    // return current token if it is fresher than 5 minutes
    if (TOKEN_OBJECT.time + 1000 * 60 * 5 > Date.now()) {
        return TOKEN_OBJECT.token;
    }

    try {
        // Send a POST request to the authentication endpoint
        const response = await fetch('https://api2.moxfield.com/v1/startup/authenticated', {
            method: 'POST',
            headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
            },
            credentials: 'include', // Make sure cookies (including the HttpOnly refresh_token) are sent with the request
        });

        if (!response.ok) {
            throw new Error('Failed to authenticate');
        }

        const data = await response.json();

        TOKEN_OBJECT.token = data.refresh.access_token;
        TOKEN_OBJECT.time = Date.now();
        return data.refresh.access_token
    } catch (error) {
        console.error('Error during authentication:', error);
        return null;
    }
}

const checkUsage = async (cardName, token) => {
    const url = generateDeckUrl(cardName);
    const deckCount = await getResultsCountFromCard(cardName, token);
    const label = deckCount === null ? "? check" : `${deckCount} deck${deckCount === 1 ? "" : "s"}`;

    return {
        url,
        label
    };
}

const showDeckCount = async (row, token, baseColumnCount) => {
    const anchor = row.querySelectorAll("td")?.[1]?.querySelectorAll("a")[0];
    const cardName = anchor.firstChild.data;
    if (!cardName) {
        return;
    }
    const dots = row.querySelectorAll("td")[baseColumnCount-1]
    let currentColumnCount = row.querySelectorAll("td")?.length || 0;

    // insert placeholder while we await the real result
    if (currentColumnCount > baseColumnCount) {
        row.querySelectorAll("td")[currentColumnCount-1].outerHTML = "<td></td>";
    } else {
        dots.insertAdjacentHTML("afterend", "<td></td>");
        currentColumnCount++;
    }

    const {url, label} = await checkUsage(cardName, token);
    const htmlToInsert = `<td><a target="_blank" href="${url}">${label}</a></td>`;

    if (currentColumnCount > baseColumnCount) {
        row.querySelectorAll("td")[currentColumnCount-1].outerHTML = htmlToInsert;
    } else {
        // needs insertAdjacentHTML to not break existing click listeners
        dots.insertAdjacentHTML("afterend", htmlToInsert);
    }
};

const initHeader = (baseColumnCount) => {
    // extends header so it does not look broken
    const currentColumnCount = document.querySelector("thead tr")?.querySelectorAll("th")?.length || 0;
    if (currentColumnCount <= baseColumnCount){
        document.querySelector("thead tr")?.querySelectorAll("th")?.[baseColumnCount-1]?.insertAdjacentHTML("afterend", HEADER_HTML);
    }
}

const startMutationObserver = async (tbody) => {
    const token = await getBearerToken();

    const baseColumnCount = Array.from(document.querySelector("thead tr")?.querySelectorAll("th")).filter(th => th.outerHTML !== HEADER_HTML).length || 0;
    initHeader(baseColumnCount);

    // first load
    const cardRows = tbody.querySelectorAll('tr');
    cardRows.forEach(row => showDeckCount(row, token, baseColumnCount));

    // create an observer to inject upon pagination/sort change
    const observer = new MutationObserver(async (mutationsList) => {
        const token = await getBearerToken();
        mutationsList.filter(mutation => mutation.type === "childList")
            .forEach((mutation) => {
                Array.from(mutation.addedNodes).filter(node => node.tagName === 'TR' && node.closest('tbody'))
                    .forEach((node) => {
                        showDeckCount(node, token, baseColumnCount);
                    });
            });
    });

    // Start observing tbody for new rows
    observer.observe(tbody, {
        childList: true,  // Observe additions/removals of child elements (rows)
        subtree: true     // Observe the entire subtree of tbody (for added rows)
    });
}

const interval = setInterval(() => {
    const tbody = document.querySelector("tbody");
    if (tbody) {
        startMutationObserver(tbody);
        clearInterval(interval); // Stop polling once tbody is found
    }
}, 500);

browser.runtime.onMessage.addListener(async message => {
    if (message.pageActionState){
        sessionStorage.setItem("actionState", message.pageActionState);
        if (!window.location.pathname.startsWith("/collection")){
            return;
        }
        const token = await getBearerToken();
        const baseColumnCount = Array.from(document.querySelector("thead tr")?.querySelectorAll("th")).filter(th => th.outerHTML !== HEADER_HTML).length || 0;
        initHeader(baseColumnCount);
        const cardRows = document.querySelector("tbody").querySelectorAll('tr');
        cardRows.forEach(row => showDeckCount(row, token, baseColumnCount));
    }
})
