# Decrypt Network Inspector (Chrome DevTools Extension)

A Chrome DevTools extension that captures **XHR / Fetch** network requests and allows developers to easily debug encrypted APIs.  
It works like a custom Network tab with added decryption support, JSON tree viewing, and raw/decrypted toggles.

## 🚀 Features

- Capture all **XHR / Fetch** requests  
- View **Headers, Params, Payload, and Response**  
- Toggle between **RAW** and **DECRYPTED** versions  
- Pretty JSON Tree Viewer for structured inspection  
- Copy decrypted data instantly  
- Filter logic for `/v1/` API endpoints  
- Debug encrypted APIs without editing your application code  

---

## 🔑 Add Your Encryption Key

Open **decrypt.js** and insert:

```
const secretKey = "PUT_YOUR_ENCRYPTION_KEY";
```

⚠️ Only for personal debugging. Don't publish with your real key.

---

## 📦 Install the Extension in Chrome

1. Open Chrome and go to:  
   `chrome://extensions/`

2. Enable **Developer Mode** (top-right)

3. Click **Load unpacked**

4. Select the extension folder (containing manifest.json)

5. Open DevTools → You will see a tab named **Decrypt**

---

## 🧰 Usage Instructions

1. Open your web application in Chrome  
2. Open DevTools → click on the **Decrypt** tab  
3. Make any API calls (XHR / Fetch)  
4. Requests will appear on the left sidebar  
5. Click a request to inspect its:
   - Headers  
   - Params  
   - Payload  
   - Response  

6. Click **Decrypt / Show Raw** to toggle between encrypted/decoded  
7. Use **Copy** button to copy JSON result  
8. JSON Tree Viewer auto-formats the decrypted data  

---

## 🛠 How It Works

1. The extension hooks into:
   `chrome.devtools.network.onRequestFinished`

2. Captures:
   - URL  
   - Method  
   - Headers  
   - Query Params  
   - Request Body  
   - Response Body  

3. Decrypts using the AES key from `decrypt.js`  
4. Renders output in a structured JSON tree UI  

---

## ⚠️ Notes & Limitations

- For **local debugging only**  
- Encryption key is stored locally in your extension  
- Do NOT publish with a real encryption key  
- Requires valid CORS if decrypt endpoint is used  
- Only captures **XHR / Fetch** requests (not WebSockets / Streams)

---

## 📬 Need Help?

If you want enhancements:
- Better UI  
- Light/Dark mode  
- Auto-detect encrypted fields  
- Laravel/Node decrypt endpoint  

Just ask!