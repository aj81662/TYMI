/* ============================================================
 * storage.js
 * FINAL FIX FOR REDECLARATION ERROR
 * ============================================================ */

// 1. Internal Constant Declaration (This must be the only place it is declared)
const STORAGE_KEY_PREFIX = 'TYMI_'; 

// 2. SAFELY determine the execution environment
const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';
const isReactNativeWebView = isBrowser && !!window.ReactNativeWebView;

// 3. Promise Queue for Asynchronous getItem Resolution (WebView only)
const nativeStorageQueue = {}; 

function generateTransactionId() {
    return Math.random().toString(36).substring(2, 15);
}

// Global function called by the React Native side 
function resolveNativeStorageResponse(message) {
    if (message.type !== 'STORAGE_RESPONSE') return;
    // ... (rest of the resolveNativeStorageResponse implementation)
    const { txId, value, error } = message;
    const promiseHandlers = nativeStorageQueue[txId];

    if (promiseHandlers) {
        delete nativeStorageQueue[txId];
        if (error) {
            console.error(`WebView Storage Error (Tx:${txId}):`, error);
            promiseHandlers.reject(new Error(error));
        } else {
            promiseHandlers.resolve(value); 
        }
    }
}

// Sends a storage operation request to the native side
function sendNativeStorageRequest(action, key, value = null) {
    if (!isReactNativeWebView) {
        return Promise.reject(new Error("Attempted native storage outside WebView."));
    }

    const txId = generateTransactionId();

    return new Promise((resolve, reject) => {
        // 🔑 FIX: Store ALL promises in the queue, regardless of action.
        // This forces the JS to wait until the native side sends a response.
        nativeStorageQueue[txId] = { resolve, reject };

        try {
            console.log(`[WebView] Sending ${action} request for key: ${key}, TxID: ${txId}`);
            
            window.ReactNativeWebView.postMessage(
                JSON.stringify({
                    type: "STORAGE_OPERATION",
                    action: action,
                    key: key,
                    value: value,
                    txId: txId, 
                })
            );
        } catch (e) {
            // Clean up the promise queue if the postMessage itself failed
            if (nativeStorageQueue[txId]) delete nativeStorageQueue[txId]; 
            console.error("Failed to send native storage request:", e);
            reject(e);
        }
    });
}


/* ------------------------------------------------ */
/* --- EXPORTED ASYNCHRONOUS FUNCTIONS --- */
/* ------------------------------------------------ */

async function getItem(key) {
    const fullKey = STORAGE_KEY_PREFIX + key;
    if (!isBrowser) return null;
    
    if (isReactNativeWebView) {
        return sendNativeStorageRequest('getItem', fullKey);
    } else {
        return Promise.resolve(localStorage.getItem(fullKey));
    }
}

async function setItem(key, value) {
    const fullKey = STORAGE_KEY_PREFIX + key;
    if (!isBrowser) return;

    if (isReactNativeWebView) {
        return sendNativeStorageRequest('setItem', fullKey, value);
    } else {
        localStorage.setItem(fullKey, value);
        return Promise.resolve();
    }
}

async function removeItem(key) {
    const fullKey = STORAGE_KEY_PREFIX + key;
    if (!isBrowser) return;

    if (isReactNativeWebView) {
        return sendNativeStorageRequest('removeItem', fullKey);
    } else {
        localStorage.removeItem(fullKey);
        return Promise.resolve();
    }
}

/* ------------------------------------------------ */
/* --- GLOBAL SCOPE INITIALIZATION (Client Only) --- */
/* ------------------------------------------------ */

// 4. Create a global Storage object for easy access in other dashboard scripts
if (isBrowser) {
    // Assign the exports to the global window object for use in the static HTML file
    window.Storage = {
        getItem: getItem,
        setItem: setItem,
        removeItem: removeItem,
    };

    // Attach the global listener for native replies
    if (isReactNativeWebView) {
    // ⚠️ CRITICAL FIX: Listen on the window object for the event dispatched by RN.
    window.addEventListener('message', (event) => {
        try {
            // event.data may be a JSON string or already an object depending on
            // how the native side injected the message. Handle both.
            let data = event.data;
            if (typeof data === 'string') {
                data = JSON.parse(data);
            }

            if (data && data.type === 'STORAGE_RESPONSE') {
                resolveNativeStorageResponse(data);
            }
        } catch (e) {
            console.error("Error parsing native response in listener:", e);
        }
    });
}
}
import AsyncStorage from "@react-native-async-storage/async-storage";

export async function saveMedication(med) {
  try {
    const stored = await AsyncStorage.getItem("medications");
    const meds = stored ? JSON.parse(stored) : [];

    meds.push(med);

    await AsyncStorage.setItem("medications", JSON.stringify(meds));
    return true;
  } catch (err) {
    console.error("saveMedication error:", err);
    return false;
  }
}

export async function loadMedications() {
  try {
    const stored = await AsyncStorage.getItem("medications");
    return stored ? JSON.parse(stored) : [];
  } catch (err) {
    console.error("loadMedications error:", err);
    return [];
  }
}
