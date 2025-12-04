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