const requestListEl = document.getElementById("request-list");
const requestSummaryEl = document.getElementById("request-summary");
const reqCountEl = document.getElementById("req-count");
const clearBtn = document.getElementById("clear-btn");
const mainLayout = document.getElementById("main");
const envSelector = document.getElementById("env-selector");

const tabButtons = Array.from(document.querySelectorAll(".tab-button"));
const tabPanes = {
  headers: document.getElementById("tab-headers"),
  params: document.getElementById("tab-params"),
  payload: document.getElementById("tab-payload"),
  response: document.getElementById("tab-response"),
};

const sections = {
  headers: {
    rawEl: document.getElementById("headers-raw"),
    treeEl: document.getElementById("headers-tree"),
    modeBadge: document.getElementById("headers-mode"),
    decryptBtn: document.getElementById("headers-decrypt-btn"),
    copyBtn: document.getElementById("headers-copy-btn"),
    emptyText: "(no headers)",
  },
  params: {
    rawEl: document.getElementById("params-raw"),
    treeEl: document.getElementById("params-tree"),
    modeBadge: document.getElementById("params-mode"),
    decryptBtn: document.getElementById("params-decrypt-btn"),
    copyBtn: document.getElementById("params-copy-btn"),
    emptyText: "(no params)",
  },
  payload: {
    rawEl: document.getElementById("payload-raw"),
    treeEl: document.getElementById("payload-tree"),
    modeBadge: document.getElementById("payload-mode"),
    decryptBtn: document.getElementById("payload-decrypt-btn"),
    copyBtn: document.getElementById("payload-copy-btn"),
    emptyText: "(no payload)",
  },
  response: {
    rawEl: document.getElementById("response-raw"),
    treeEl: document.getElementById("response-tree"),
    modeBadge: document.getElementById("response-mode"),
    decryptBtn: document.getElementById("response-decrypt-btn"),
    copyBtn: document.getElementById("response-copy-btn"),
    emptyText: "(empty response)",
  },
};

let requests = [];
let selectedRequestId = null;
let viewModes = {
  headers: "raw",
  params: "raw",
  payload: "raw",
  response: "raw",
};
let sectionData = createEmptySectionData();

function createEmptySectionData() {
  return {
    headers: { raw: null, decrypted: null },
    params: { raw: null, decrypted: null },
    payload: { raw: null, decrypted: null },
    response: { raw: null, decrypted: null },
  };
}

function getActiveTab() {
  const activeButton = document.querySelector(".tab-button.active");
  return activeButton?.getAttribute("data-tab") || "headers";
}

function setActiveTab(tab) {
  tabButtons.forEach((button) => {
    button.classList.toggle("active", button.getAttribute("data-tab") === tab);
  });

  Object.entries(tabPanes).forEach(([name, pane]) => {
    pane.classList.toggle("active", name === tab);
  });
}

function resetViewModes() {
  viewModes = {
    headers: "raw",
    params: "raw",
    payload: "raw",
    response: "raw",
  };

  Object.keys(sections).forEach((tab) => {
    syncSectionButtons(tab);
  });
}

function currentSelected() {
  return requests.find((request) => request.id === selectedRequestId) || null;
}

function hasContent(value) {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") return Object.keys(value).length > 0;
  return true;
}

function hasHeaderContent(headersView) {
  if (!headersView || typeof headersView !== "object") return false;

  return ["request", "response"].some((key) =>
    hasContent(headersView[key]) && Object.keys(headersView[key]).length > 0,
  );
}

function hasDecryptableHeaders(headersView) {
  for (const sectionName of ["request", "response"]) {
    const headers = headersView?.[sectionName] || {};
    for (const [name, value] of Object.entries(headers)) {
      if (name.toLowerCase() !== "authorization") continue;
      if (hasContent(value)) return true;
    }
  }

  return false;
}

function getSectionRawValue(tab, req) {
  if (tab === "headers") return buildHeadersView(req);
  if (tab === "params") {
    const url = req?.url || req?.request?.url || "";
    return getFirstQueryParam(url);
  }
  if (tab === "payload") return req?.requestBody ?? null;
  if (tab === "response") return req?.responseBody ?? "";
  return null;
}

function getFirstObjectValue(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

  const keys = Object.keys(value);
  if (!keys.length) return null;

  return value[keys[0]];
}

function getDecryptedValue(tab, req) {
  if (!req) return null;

  if (tab === "headers") {
    const rawHeaders = sectionData.headers.raw ?? buildHeadersView(req);
    if (!hasDecryptableHeaders(rawHeaders)) return rawHeaders;
    return decryptAuthorizationHeaders(rawHeaders);
  }

  if (tab === "params") {
    const param = sectionData.params.raw ?? getSectionRawValue("params", req);
    if (!param?.value) return param;

    try {
      return {
        ...param,
        value: window.decryptPayload(param.value.trim()),
      };
    } catch (e) {
      console.warn("Decrypt params failed", e);
      return param;
    }
  }

  if (tab === "payload") {
    const rawPayload = safeParseJson(req.requestBody);
    const encryptedValue = getFirstObjectValue(rawPayload);

    if (!hasContent(encryptedValue)) return rawPayload;

    try {
      return window.decryptPayload(String(encryptedValue).trim());
    } catch (e) {
      console.warn("Decrypt payload failed", e);
      return rawPayload;
    }
  }

  if (tab === "response") {
    const rawResponse = req.responseBody || "";
    if (!hasContent(rawResponse)) return rawResponse;

    try {
      return window.decryptPayload(rawResponse.trim());
    } catch (e) {
      console.warn("Decrypt response failed", e);
      return rawResponse;
    }
  }

  return null;
}

function canDecryptTab(tab, req) {
  if (!req) return false;

  if (tab === "headers") {
    return hasDecryptableHeaders(sectionData.headers.raw);
  }

  if (tab === "params") {
    return hasContent(sectionData.params.raw?.value);
  }

  if (tab === "payload") {
    return hasContent(getFirstObjectValue(safeParseJson(req.requestBody)));
  }

  if (tab === "response") {
    return hasContent(req.responseBody);
  }

  return false;
}

function renderSection(tab) {
  const section = sections[tab];
  const mode = viewModes[tab];
  const value = sectionData[tab][mode];

  section.modeBadge.textContent = mode;

  if (mode === "raw") {
    const text = serializeForClipboard(value);
    section.rawEl.textContent = text || section.emptyText;
    section.rawEl.style.display = "block";
    section.treeEl.style.display = "none";
    section.treeEl.innerHTML = "";
  } else {
    section.rawEl.style.display = "none";
    section.treeEl.style.display = "block";
    renderJsonTree(section.treeEl, value);
  }

  syncSectionButtons(tab);
}

function syncSectionButtons(tab) {
  const section = sections[tab];
  const req = currentSelected();
  const mode = viewModes[tab];
  const activeValue = sectionData[tab][mode];

  const canCopy = tab === "headers"
    ? hasHeaderContent(activeValue)
    : hasContent(activeValue);

  if (section.copyBtn) {
    section.copyBtn.disabled = !canCopy;
  }

  if (section.decryptBtn) {
    const canDecrypt = canDecryptTab(tab, req);
    section.decryptBtn.disabled = !canDecrypt && mode === "raw";
    section.decryptBtn.textContent = mode === "decrypted" ? "Show Raw" : "Decrypt";
  }
}

function renderDetail() {
  const req = currentSelected();

  if (!req) {
    requestSummaryEl.textContent = "No request selected.";
    sectionData = createEmptySectionData();

    Object.keys(sections).forEach((tab) => {
      const section = sections[tab];
      section.rawEl.textContent = "";
      section.treeEl.innerHTML = "";
      section.rawEl.style.display = "block";
      section.treeEl.style.display = "none";
      syncSectionButtons(tab);
    });

    mainLayout.style.display = "none";
    return;
  }

  mainLayout.style.display = "flex";
  requestSummaryEl.textContent =
    (req.method || "GET") +
    " " +
    req.url +
    (req.status ? " (" + req.status + ")" : "");

  sectionData.headers.raw = getSectionRawValue("headers", req);
  sectionData.headers.decrypted = null;
  sectionData.params.raw = getSectionRawValue("params", req);
  sectionData.params.decrypted = null;
  sectionData.payload.raw = getSectionRawValue("payload", req);
  sectionData.payload.decrypted = null;
  sectionData.response.raw = getSectionRawValue("response", req);
  sectionData.response.decrypted = null;

  Object.keys(sections).forEach((tab) => renderSection(tab));
}

function renderRequestList() {
  requestListEl.innerHTML = "";

  if (!requests.length) {
    const message = document.createElement("div");
    message.className = "empty-message";
    message.style.padding = "8px";
    message.textContent = "No XHR / Fetch requests captured yet.";
    requestListEl.appendChild(message);
  }

  for (const req of requests) {
    const item = document.createElement("div");
    item.className =
      "request-item" + (req.id === selectedRequestId ? " active" : "");

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
    item.addEventListener("click", () => {
      selectedRequestId = req.id;
      resetViewModes();
      renderRequestList();
      renderDetail();
    });

    requestListEl.appendChild(item);
  }

  reqCountEl.textContent = String(requests.length);
}

function toggleDecrypt(tab) {
  const req = currentSelected();
  if (!req) return;

  if (viewModes[tab] === "raw") {
    sectionData[tab].decrypted = getDecryptedValue(tab, req);
    viewModes[tab] = "decrypted";
  } else {
    viewModes[tab] = "raw";
  }

  renderSection(tab);
}

async function handleCopy(tab) {
  const mode = viewModes[tab];
  const value = sectionData[tab][mode];
  const text = serializeForClipboard(value);

  if (!text) return;

  const button = sections[tab].copyBtn;
  const originalText = button.textContent;

  try {
    await copyText(text);
    button.textContent = "Copied";
  } catch (e) {
    console.warn("Copy failed", e);
    button.textContent = "Failed";
  }

  window.setTimeout(() => {
    button.textContent = originalText;
  }, 1200);
}

sections.headers.decryptBtn.addEventListener("click", () => toggleDecrypt("headers"));
sections.params.decryptBtn.addEventListener("click", () => toggleDecrypt("params"));
sections.payload.decryptBtn.addEventListener("click", () => toggleDecrypt("payload"));
sections.response.decryptBtn.addEventListener("click", () => toggleDecrypt("response"));

sections.headers.copyBtn.addEventListener("click", () => handleCopy("headers"));
sections.params.copyBtn.addEventListener("click", () => handleCopy("params"));
sections.payload.copyBtn.addEventListener("click", () => handleCopy("payload"));
sections.response.copyBtn.addEventListener("click", () => handleCopy("response"));

envSelector.addEventListener("change", (event) => {
  const env = event.target.value;
  if (window.setEnvironment) {
    window.setEnvironment(env);
    resetViewModes();
    renderDetail();
  }
});

if (window.setEnvironment) {
  window.setEnvironment(envSelector.value);
}

tabButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setActiveTab(button.getAttribute("data-tab"));
    resetViewModes();
    renderDetail();
  });
});

clearBtn.addEventListener("click", () => {
  requests = [];
  selectedRequestId = null;
  resetViewModes();
  renderRequestList();
  renderDetail();
});

chrome.devtools.network.onRequestFinished.addListener((req) => {
  if (!isFetchOrXhr(req)) return;

  req.getContent((body) => {
    const id = req.requestId || String(Date.now() + Math.random());
    const url = req.request?.url || "";
    const shortUrl = url.split("?")[0];

    const entry = {
      id,
      url,
      shortUrl,
      domain: new URL(url).origin,
      method: req.request?.method,
      status: req.response?.status,
      requestHeaders: req.request?.headers || [],
      responseHeaders: req.response?.headers || [],
      requestBody: getPostEncryptedPayload(req),
      responseBody: body || "",
    };

    requests.push(entry);
    if (!selectedRequestId) {
      selectedRequestId = entry.id;
    }

    renderRequestList();
    renderDetail();
  });
});

setActiveTab(getActiveTab());
resetViewModes();
renderRequestList();
renderDetail();
