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
        return "";
    }
}

const getBearerToken = async () => {
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

        return data.refresh.access_token
    } catch (error) {
        console.error('Error during authentication:', error);
        return "";
    }
}

const checkUsage = async (cardName, token) => {
    const url = generateDeckUrl(cardName);
    const deckCount = await getResultsCountFromCard(cardName, token);

    return {
        url,
        label: `found in ${deckCount} deck${deckCount === 1 ? "" : "s"}`
    };
}

const showDeckCount = async (row, token) => {
    const anchor = row.querySelectorAll("td")[1]?.querySelectorAll("a")[0];
    const cardName = anchor.firstChild.data;
    const dots = row.querySelectorAll("td")[10]
    const {url, label} = await checkUsage(cardName, token);

    // needs insertAdjacentHTML to not break existing click listeners
    dots.insertAdjacentHTML("afterend", `<td><a target="_blank" href="${url}">${label}</a></td>`);
};

const startMutationObserver = async (tbody) => {
    const token = await getBearerToken();
    // first load
    const cardRows = tbody.querySelectorAll('tr');
    cardRows.forEach(row => showDeckCount(row, token));

    // extends header so it does not look broken
    document.querySelector("thead tr")?.querySelectorAll("th")[10]?.insertAdjacentHTML("afterend", "<th>Deck Occurency</th>");

    // create an observer to inject upon pagination/sort change
    const observer = new MutationObserver(async (mutationsList) => {
        const token = await getBearerToken();
        console.log()
        mutationsList.filter(mutation => mutation.type === "childList")
            .forEach((mutation) => {
                Array.from(mutation.addedNodes).filter(node => node.tagName === 'TR' && node.closest('tbody'))
                    .forEach((node) => {
                        showDeckCount(node, token);
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




