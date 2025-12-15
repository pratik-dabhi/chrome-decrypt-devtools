const requestListEl = document.getElementById("request-list");
const requestSummaryEl = document.getElementById("request-summary");
const reqCountEl = document.getElementById("req-count");
const clearBtn = document.getElementById("clear-btn");

const headersRawEl = document.getElementById("headers-raw");
const headersTreeEl = document.getElementById("headers-tree");
const paramsRawEl = document.getElementById("params-raw");
const paramsTreeEl = document.getElementById("params-tree");
const payloadRawEl = document.getElementById("payload-raw");
const payloadTreeEl = document.getElementById("payload-tree");
const responseRawEl = document.getElementById("response-raw");
const responseTreeEl = document.getElementById("response-tree");

const headersModeBadge = document.getElementById("headers-mode");
const payloadModeBadge = document.getElementById("payload-mode");
const paramsModeBadge = document.getElementById("params-mode");
const responseModeBadge = document.getElementById("response-mode");

const payloadDecryptBtn = document.getElementById("payload-decrypt-btn");
const responseDecryptBtn = document.getElementById("response-decrypt-btn");
const paramsDecryptBtn = document.getElementById("params-decrypt-btn");

const mainLayout = document.getElementById("main");

const tabButtons = Array.from(document.querySelectorAll(".tab-button"));
const tabPanes = {
  headers: document.getElementById("tab-headers"),
  params: document.getElementById("tab-params"),
  payload: document.getElementById("tab-payload"),
  response: document.getElementById("tab-response")
};

let requests = [];
let selectedRequestId = null;
let viewModes = {
  headers: "raw",
  params: "raw",
  payload: "raw",
  response: "raw"
};

/* Reset the view mode to raw */
function resetViewModes() {
  viewModes = {
    headers: "raw",
    params: "raw",
    payload: "raw",
    response: "raw"
  };
  headersModeBadge.textContent = "raw";
  paramsModeBadge.textContent = "raw";
  payloadModeBadge.textContent = "raw";
  responseModeBadge.textContent = "raw";
}

/* Executes multiple actions at the same time */
function selectRequest(id) {
  selectedRequestId = id;
  resetViewModes();
  renderRequestList();
  renderDetail();
}

/* Render all requests */
function renderRequestList() {
  requestListEl.innerHTML = "";

  if (!requests.length) {
    const msg = document.createElement("div");
    msg.className = "empty-message";
    msg.style.padding = "8px";
    msg.textContent = "No XHR / Fetch requests captured yet.";
    requestListEl.appendChild(msg);
  }

  for (const req of requests) {
    const item = document.createElement("div");
    item.className = "request-item" + (req.id === selectedRequestId ? " active" : "");

    const top = document.createElement("div");
    top.className = "req-top-line";

    const methodEl = document.createElement("div");
    methodEl.className = "req-method";
    methodEl.textContent = req.method || "GET";

    const statusEl = document.createElement("div");
    statusEl.className =
      "req-status " + (req.status && req.status < 400 ? "ok" : "err");
    statusEl.textContent = req.status ? String(req.status) : "-";

    top.appendChild(methodEl);
    top.appendChild(statusEl);

    const urlEl = document.createElement("div");
    urlEl.className = "req-url";
    urlEl.textContent = req.shortUrl || req.url;

    item.appendChild(top);
    item.appendChild(urlEl);

    item.addEventListener("click", () => selectRequest(req.id));

    requestListEl.appendChild(item);
  }

  reqCountEl.textContent = String(requests.length);
}

/* Render the selected request */
function renderDetail() {
  const req = requests.find((r) => r.id === selectedRequestId);
  if (!req) {
    requestSummaryEl.textContent = "No request selected.";
    headersRawEl.textContent = "";
    headersTreeEl.innerHTML = "";
    payloadRawEl.textContent = "";
    payloadTreeEl.innerHTML = "";
    paramsRawEl.textContent = "";
    paramsTreeEl.innerHTML = "";
    responseRawEl.textContent = "";
    responseTreeEl.innerHTML = "";
    mainLayout.style.display = "none";
    return;
  }

  mainLayout.style.display = "block";

  requestSummaryEl.textContent =
    (req.method || "GET") + " " + req.url + (req.status ? " (" + req.status + ")" : "");

  const reqHeadersStr = (req.requestHeaders || [])
    .map((h) => h.name + ": " + h.value)
    .join("\n");
  const resHeadersStr = (req.responseHeaders || [])
    .map((h) => h.name + ": " + h.value)
    .join("\n");

  const headersCombined =
    (reqHeadersStr ? "Request headers:\n" + reqHeadersStr : "") +
    (resHeadersStr
      ? (reqHeadersStr ? "\n\n" : "") + "Response headers:\n" + resHeadersStr
      : "");

  headersRawEl.textContent = headersCombined || "(no headers)";
  headersTreeEl.innerHTML = "";
  headersRawEl.style.display = "block";

  const url = req.url || req.request?.url || "";
  const param = getFirstQueryParam(url);

  paramsRawEl.textContent = JSON.stringify(param, null, 2) || "(no params)";
  paramsTreeEl.innerHTML = "";
  paramsRawEl.style.display = "block";
  paramsDecryptBtn.style.display = "block"
  if(!JSON.stringify(param, null, 2)){
    paramsDecryptBtn.style.display = "none"
  }
  
  payloadRawEl.textContent = JSON.stringify(req.requestBody) || "(no payload)";
  payloadTreeEl.innerHTML = "";
  payloadRawEl.style.display = "block";
  payloadDecryptBtn.style.display = "block"
  if(!req.requestBody){
    payloadDecryptBtn.style.display = "none"
  }

  responseRawEl.textContent = req.responseBody || "(empty response)";
  responseTreeEl.innerHTML = "";
  responseRawEl.style.display = "block";
  responseDecryptBtn.style.display = "block"
  if(!req.responseBody){
    responseDecryptBtn.style.display = "none"
  }

}

/* Find current selected request */
function currentSelected() {
  return requests.find((r) => r.id === selectedRequestId) || null;
}

/* Toggle function to raw/decrypt data */
function toggleDecrypt(tab) {
  const req = currentSelected();
  if (!req) return;

  if (viewModes[tab] === "raw") {
    if (tab === "params") {
      const url = req.url || req.request?.url || "";
      const param = getFirstQueryParam(url);
      let parsed;

      if (param) {
        try {
          parsed = window.decryptPayload(param.value.trim());
        } catch (e) {
          console.warn("Decrypt params failed", e);
          parsed = param;
        }
      }

      paramsRawEl.style.display = "none";
      renderJsonTree(paramsTreeEl, parsed);
      viewModes.params = "decrypted";
      paramsModeBadge.textContent = "decrypted";
    } else if (tab === "payload") {
      const raw = safeParseJson(req.requestBody);
      const encryptedValue = raw[Object.keys(raw)[0]];
      let parsed;
      try {
        parsed = window.decryptPayload(encryptedValue);
      } catch (e) {
        console.warn("Decrypt payload failed", e);
        parsed = raw;
      }
      
      payloadRawEl.style.display = "none";
      renderJsonTree(payloadTreeEl, parsed);
      viewModes.payload = "decrypted";
      payloadModeBadge.textContent = "decrypted";
    } else if (tab === "response") {
      const raw = req.responseBody || "";
      let parsed;
      try {
        parsed = window.decryptPayload(raw.trim());
      } catch (e) {
        console.warn("Decrypt response failed", e);
        parsed = raw;
      }
      responseRawEl.style.display = "none";
      // responseRawEl.textContent =
      //   typeof parsed === "string" ? parsed : prettyJson(parsed);
      renderJsonTree(responseTreeEl, parsed);
      viewModes.response = "decrypted";
      responseModeBadge.textContent = "decrypted";
    }
  } else {
    console.log("no mode found so render again");
    renderDetail();
    viewModes[tab] = "raw";
    if (tab === "headers") headersModeBadge.textContent = "raw";
    if (tab === "payload") payloadModeBadge.textContent = "raw";
    if (tab === "response") responseModeBadge.textContent = "raw";
    if (tab === "params") paramsModeBadge.textContent = "raw";
  }
}

/* Event Listeners for decrypt buttons */
paramsDecryptBtn.addEventListener("click", () => toggleDecrypt("params"));
payloadDecryptBtn.addEventListener("click", () => toggleDecrypt("payload"));
responseDecryptBtn.addEventListener("click", () => toggleDecrypt("response"));

/* Switch the tab (Header, Payload,...) */
tabButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const tab = btn.getAttribute("data-tab");

    tabButtons.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    resetViewModes();
    renderDetail();

    Object.keys(tabPanes).forEach((name) => {
      tabPanes[name].classList.toggle("active", name === tab);
    });
  });
});

/* Clear all requests */
clearBtn.addEventListener("click", () => {
  requests = [];
  selectedRequestId = null;
  renderRequestList();
  renderDetail();
});

/* Listen the network request */
chrome.devtools.network.onRequestFinished.addListener((req) => {
  if (!isFetchOrXhr(req)) return;

  req.getContent((body) => {
    const id = req.requestId || String(Date.now() + Math.random());
    const url = (req.request && req.request.url) || "";
    const shortUrl = url.split("?")[0];

    const entry = {
      id,
      url,
      shortUrl,
      domain: new URL(url).origin,
      method: req.request && req.request.method,
      status: req.response && req.response.status,
      requestHeaders: (req.request && req.request.headers) || [],
      responseHeaders: (req.response && req.response.headers) || [],
      requestBody:getPostEncryptedPayload(req),
      responseBody: body || ""
    };

    requests.push(entry);
    if (!selectedRequestId) {
      selectedRequestId = entry.id;
    }

    renderRequestList();
    renderDetail();
  });
});

renderRequestList();
renderDetail();
