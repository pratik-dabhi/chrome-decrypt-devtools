const secretKey = "PUT_YOUR_ENCRYPTION_KEY";

function decryptPayload(encryptedBase64) {
  try {
    if (typeof CryptoJS === "undefined") {
      console.warn(
        "CryptoJS is not loaded. Put crypto-js.js next to decrypt.js and reload the extension."
      );
      return encryptedBase64;
    }
    
    encryptedBase64 = encryptedBase64.trim().replace(/^"(.*)"$/, "$1").replace(/\\\//g, "/").replace(/\\n/g, "").replace(/\\r/g, "");

    const key = CryptoJS.SHA256(secretKey);
    const rawData = CryptoJS.enc.Base64.parse(encryptedBase64);

    const iv = CryptoJS.lib.WordArray.create(rawData.words.slice(0, 4));
    const cipherText = CryptoJS.lib.WordArray.create(
      rawData.words.slice(4),
      rawData.sigBytes - 16
    );

    const decrypted = CryptoJS.AES.decrypt(
      { ciphertext: cipherText },
      key,
      {
        iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      }
    );

    const text = decrypted.toString(CryptoJS.enc.Utf8);

    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  } catch (e) {
    console.warn("decryptPayload error:", e);
    return encryptedBase64;
  }
}

window.decryptPayload = decryptPayload;
