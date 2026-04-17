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
  if (typeof val === "string") {
    const parsed = safeParseJson(val);
    if (parsed !== val) return prettyJson(parsed);
    return val;
  }
  try {
    return JSON.stringify(val, null, 2);
  } catch {
    return String(val);
  }
}

function appendKey(target, key) {
  if (key === undefined || key === null) return;

  const keyEl = document.createElement("span");
  keyEl.className = "json-key";
  keyEl.textContent = String(key);
  target.appendChild(keyEl);
  target.appendChild(document.createTextNode(": "));
}

function normalizeJsonValue(value) {
  if (typeof value !== "string") return value;

  const trimmed = value.trim();
  if (!trimmed) return value;

  const parsed = safeParseJson(trimmed);
  return parsed;
}

function buildJsonNode(value, key) {
  value = normalizeJsonValue(value);
  const type = Object.prototype.toString.call(value).slice(8, -1).toLowerCase();

  if (type === "object" || type === "array") {
    const details = document.createElement("details");
    details.open = true;

    const summary = document.createElement("summary");
    appendKey(summary, key);
    summary.appendChild(
      document.createTextNode(
        type === "array"
          ? "Array[" + value.length + "]"
          : "Object{" + Object.keys(value).length + "}",
      ),
    );
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

  appendKey(line, key);
  const valueEl = document.createElement("span");

  if (value === null) {
    valueEl.className = "json-null";
    valueEl.textContent = "null";
  } else if (typeof value === "string") {
    valueEl.className = "json-string";
    valueEl.textContent = '"' + value + '"';
  } else if (typeof value === "number") {
    valueEl.className = "json-number";
    valueEl.textContent = String(value);
  } else if (typeof value === "boolean") {
    valueEl.className = "json-boolean";
    valueEl.textContent = String(value);
  } else {
    valueEl.textContent = String(value);
  }

  line.appendChild(valueEl);
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

  value = normalizeJsonValue(value);
  const type = Object.prototype.toString.call(value).slice(8, -1).toLowerCase();
  const root =
    type === "object" || type === "array"
      ? buildJsonNode(value, null)
      : buildJsonNode(value);
  container.appendChild(root);
}

function headersToObject(headers) {
  const result = {};

  for (const header of headers || []) {
    if (!header || !header.name) continue;

    const name = header.name;
    const value = header.value ?? "";

    if (Object.prototype.hasOwnProperty.call(result, name)) {
      if (Array.isArray(result[name])) {
        result[name].push(value);
      } else {
        result[name] = [result[name], value];
      }
    } else {
      result[name] = value;
    }
  }

  return result;
}

function buildHeadersView(req) {
  return {
    request: headersToObject(req?.requestHeaders || []),
    response: headersToObject(req?.responseHeaders || []),
  };
}

function decryptAuthorizationHeaders(headersView) {
  const nextHeaders = {
    request: { ...(headersView?.request || {}) },
    response: { ...(headersView?.response || {}) },
  };

  for (const section of ["request", "response"]) {
    const entries = Object.entries(nextHeaders[section]);

    for (const [name, value] of entries) {
      if (name.toLowerCase() !== "authorization") continue;

      nextHeaders[section][name] = decryptAuthorizationValue(value);
    }
  }

  return nextHeaders;
}

function decryptAuthorizationValue(value) {
  if (Array.isArray(value)) {
    return value.map((item) => decryptAuthorizationValue(item));
  }

  if (typeof value !== "string" || !value.trim()) {
    return value;
  }

  try {
    return window.decryptPayload(value.trim());
  } catch (e) {
    console.warn("Decrypt authorization failed:", e);
    return value;
  }
}

function serializeForClipboard(value) {
  if (value === undefined || value === null) return "";

  if (typeof value === "string") {
    const parsed = safeParseJson(value);
    if (parsed !== value) {
      return prettyJson(parsed);
    }
    return value;
  }

  return prettyJson(value);
}

async function copyText(text) {
  const nextText = text ?? "";

  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(nextText);
    return;
  }

  const textArea = document.createElement("textarea");
  textArea.value = nextText;
  textArea.setAttribute("readonly", "true");
  textArea.style.position = "fixed";
  textArea.style.opacity = "0";
  document.body.appendChild(textArea);
  textArea.select();
  document.execCommand("copy");
  document.body.removeChild(textArea);
}

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

function getPostEncryptedPayload(req) {
  const request = req?.request;
  if (!request || request.method !== "POST") return null;

  const postData = request.postData;
  if (!postData) return null;
  
  if (Array.isArray(postData.params) && postData.params.length) {
    const { name, value } = postData.params[0];
    return { [name]: value };
  }

  const text = postData.text?.trim();
  if (text && text.startsWith("{") && text.endsWith("}")) {
    try {
      const json = JSON.parse(text);
      const firstKey = Object.keys(json)[0];
      return { [firstKey]: json[firstKey] };
    } catch {
      return null;
    }
  }

  return null;
}
