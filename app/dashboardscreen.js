import React, { useRef } from 'react';
import { View, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {LabelCaptureScreen} from "../LabelCaptureScreen"; 
import { saveMedication } from "../utils/_storage.js";
async function handleScanBottle() {
  try {
    const scanned = await scanBottle();  

    if (!scanned) {
      alert("Unable to scan.");
      return;
    }

    // scanned example:
    // { name: "Metformin", dosage: "500 mg", schedule: "AM" }

    // Save to storage
    await saveMedication(scanned);

    alert("Bottle scanned and medication saved!");

    // Refresh dashboard
    loadMedications();

  } catch (error) {
    console.error(error);
    alert("Scan failed: " + error.message);
  }
}


// ⚠️ IMPORTANT: Use the updated HTML that calls the Good API
const htmlSource = require('../patient-dashboard Good api.html');

export default function DashboardScreen() {
    const webviewRef = useRef(null);

    const handleWebViewMessage = async (event) => {
        let message;
        try {
            message = JSON.parse(event.nativeEvent.data);
        } catch (e) {
            console.error("RN Error: Failed to parse WebView message:", e);
            return;
        }

        if (message.type !== 'STORAGE_OPERATION') return;

        const { action, key, value, txId } = message;
        let result = null;
        let error = null;

        try {
            // 1. PERFORM ASYNCHRONOUS STORAGE OPERATION
            if (action === 'getItem') {
                result = await AsyncStorage.getItem(key);
                // 🚨 DIAGNOSTIC LOG (Useful for debugging authentication failure)
                console.log(`[ASYNCSTORAGE RESULT] Key: ${key}. Data length: ${result ? result.length : 'NULL'}`);
                
            } else if (action === 'setItem') {
                await AsyncStorage.setItem(key, value);
            } else if (action === 'removeItem') {
                await AsyncStorage.removeItem(key);
            }
        } catch (e) {
            error = e.message;
            console.error(`RN Error performing AsyncStorage ${action}:`, e);
        }
        
        // 2. SEND RESPONSE BACK TO THE WEBVIEW JAVASCRIPT (Now required for ALL operations)
        if (action === 'getItem' || action === 'setItem' || action === 'removeItem' || error) {
            const response = {
                type: 'STORAGE_RESPONSE',
                txId: txId,
                value: result,
                error: error
            };

            // Create a JSON string and escape characters so it can be safely embedded
            // inside the injected JavaScript as a single-quoted string literal.
            const jsonResponseString = JSON.stringify(response);
            const escaped = jsonResponseString.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n');

            const injectCode = `
                (function(){
                    const ev = new MessageEvent('message', { data: '${escaped}' });
                    window.dispatchEvent(ev);
                })();
                true;
            `;

            webviewRef.current.injectJavaScript(injectCode);
        }
    };

    return (
        <View style={styles.container}>
            <WebView
                ref={webviewRef}
                source={htmlSource} // Loads your HTML file
                onMessage={handleWebViewMessage} // Listens for storage requests from _storage.js
                javaScriptEnabled={true}
                domStorageEnabled={true}
                renderLoading={() => <ActivityIndicator size="large" color="#0000ff" style={styles.loading} />}
                startInLoadingState={true}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        // Add padding to avoid status bar overlap
        paddingTop: Platform.OS === 'android' ? 30 : 0, 
    },
    loading: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    }
});