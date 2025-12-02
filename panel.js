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

const headersDecryptBtn = document.getElementById("headers-decrypt-btn");
const payloadDecryptBtn = document.getElementById("payload-decrypt-btn");
const responseDecryptBtn = document.getElementById("response-decrypt-btn");
const paramsDecryptBtn = document.getElementById("params-decrypt-btn");

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


function isFetchOrXhr(req) {
  try {
    const url = req.request?.url;

    if (!url || !url.startsWith("http")) return false;

    return url.includes("/v1/");
  } catch (e) {
    console.warn("XHR/FETCH detect failed:", e);
    return false;
  }
}

function prettyJson(val) {
  if (val == null) return "";
  if (typeof val === "string") return val;
  try {
    return JSON.stringify(val, null, 2);
  } catch {
    return String(val);
  }
}

function buildJsonNode(value, key) {
  const type = Object.prototype.toString.call(value).slice(8, -1).toLowerCase();

  if (type === "object" || type === "array") {
    const details = document.createElement("details");
    details.open = true;

    const summary = document.createElement("summary");
    if (key !== undefined && key !== null) {
      summary.innerHTML =
        '<span class="json-key">' +
        key +
        "</span>: " +
        (type === "array" ? "Array[" + value.length + "]" : "Object");
    } else {
      summary.textContent =
        type === "array" ? "Array[" + value.length + "]" : "Object";
    }
    details.appendChild(summary);

    const entries = type === "array" ? value.entries() : Object.entries(value);
    for (const [k, v] of entries) {
      const child = buildJsonNode(v, k);
      details.appendChild(child);
    }
    return details;
  }

  const line = document.createElement("div");
  line.className = "json-primitive";

  const keyPart =
    key !== undefined && key !== null
      ? '<span class="json-key">' + key + "</span>: "
      : "";

  if (value === null) {
    line.innerHTML = keyPart + '<span class="json-null">null</span>';
  } else if (typeof value === "string") {
    line.innerHTML =
      keyPart + '<span class="json-string">"' + value + '"</span>';
  } else if (typeof value === "number") {
    line.innerHTML = keyPart + '<span class="json-number">' + value + "</span>";
  } else if (typeof value === "boolean") {
    line.innerHTML =
      keyPart + '<span class="json-boolean">' + value + "</span>";
  } else {
    line.textContent = keyPart + String(value);
  }

  return line;
}

function renderJsonTree(container, value) {
  container.innerHTML = "";
  if (value === undefined || value === null || value === "") {
    const msg = document.createElement("div");
    msg.className = "empty-message";
    msg.textContent = "No JSON content.";
    container.appendChild(msg);
    return;
  }

  const type = Object.prototype.toString.call(value).slice(8, -1).toLowerCase();
  if (type !== "object" && type !== "array") {
    const msg = document.createElement("div");
    msg.className = "empty-message";
    msg.textContent = "Not JSON (showing as text).";
    container.appendChild(msg);
    return;
  }

  const root = buildJsonNode(value, null);
  container.appendChild(root);
}

function resetViewModes() {
  viewModes = {
    headers: "raw",
    payload: "raw",
    response: "raw"
  };
  headersModeBadge.textContent = "raw";
  paramsModeBadge.textContent = "raw";
  payloadModeBadge.textContent = "raw";
  responseModeBadge.textContent = "raw";
}

function selectRequest(id) {
  selectedRequestId = id;
  resetViewModes();
  renderRequestList();
  renderDetail();
}

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
    return;
  }

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
  
  payloadRawEl.textContent = req.requestBody || "(no payload)";
  payloadTreeEl.innerHTML = "";
  payloadRawEl.style.display = "block";

  responseRawEl.textContent = req.responseBody || "(empty response)";
  responseTreeEl.innerHTML = "";
  responseRawEl.style.display = "block";
}

function currentSelected() {
  return requests.find((r) => r.id === selectedRequestId) || null;
}

function toggleDecrypt(tab) {
  const req = currentSelected();
  if (!req) return;

  if (viewModes[tab] === "raw") {
    if (tab === "headers") {
      const raw = headersRawEl.textContent || "";
      headersRawEl.textContent =
        typeof raw === "string" ? raw : prettyJson(raw);
    } else if (tab === "params") {
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
    renderDetail();
    viewModes[tab] = "raw";
    if (tab === "headers") headersModeBadge.textContent = "raw";
    if (tab === "payload") payloadModeBadge.textContent = "raw";
    if (tab === "response") responseModeBadge.textContent = "raw";
    if (tab === "params") paramsModeBadge.textContent = "raw";
  }
}

headersDecryptBtn.addEventListener("click", () => toggleDecrypt("headers"));
paramsDecryptBtn.addEventListener("click", () => toggleDecrypt("params"));
payloadDecryptBtn.addEventListener("click", () => toggleDecrypt("payload"));
responseDecryptBtn.addEventListener("click", () => toggleDecrypt("response"));

tabButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const tab = btn.getAttribute("data-tab");

    tabButtons.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");

    Object.keys(tabPanes).forEach((name) => {
      tabPanes[name].classList.toggle("active", name === tab);
    });
  });
});

clearBtn.addEventListener("click", () => {
  requests = [];
  selectedRequestId = null;
  renderRequestList();
  renderDetail();
});

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
      requestBody:
        req.request && req.request.postData && req.request.postData.text
          ? req.request.postData.text
          : "",
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

function getFirstQueryParam(url) {
  try {
    const u = new URL(url);
    const keys = [...u.searchParams.keys()];

    if (keys.length === 0) return null;

    const firstKey = keys[0];
    const firstValue = u.searchParams.get(firstKey);

    return { key: firstKey, value: firstValue };
  } catch (e) {
    console.warn("Query param parse failed:", e);
    return null;
  }
}

function safeParseJson(str) {
  if (!str || typeof str !== "string") return str;

  str = str.trim();

  if (
    (str.startsWith('"') && str.endsWith('"')) ||
    (str.startsWith("'") && str.endsWith("'"))
  ) {
    str = str.slice(1, -1);
  }

  try {
    return JSON.parse(str);
  } catch {
    return str; 
  }
}

renderRequestList();
renderDetail();
