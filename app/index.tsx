import { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WebView } from 'react-native-webview';

const htmlFiles: Record<string, any> = {
  'index.html': require('../assets/site/index.html'),
  'doctor-login.html': require('../assets/site/doctor-login.html'),
  'patient-login.html': require('../assets/site/patient-login.html'),
  'doctor-dashboard.html': require('../assets/site/doctor-dashboard.html'),
  'patient-dashboard.html': require('../assets/site/patient-dashboard.html'),
  'create-account.html': require('../assets/site/create-account.html'),
  'change-password.html': require('../assets/site/change-password.html'),
};

export default function HomeScreen() {
  const [currentFile, setCurrentFile] = useState('index.html');
  const [injectedJS, setInjectedJS] = useState('');
  const webviewRef = useRef(null);

  // -----------------------------------
  // Load values from AsyncStorage
  // -----------------------------------
  useEffect(() => {
    const loadStoredData = async () => {
      try {
        const loggedIn = await AsyncStorage.getItem('loggedIn');
        const patientName = await AsyncStorage.getItem('patientName');
        const medications = await AsyncStorage.getItem('medications');

        // Build injected JavaScript to set HTML localStorage
        const js = `
          localStorage.setItem("loggedIn", "${loggedIn || 'false'}");
          localStorage.setItem("patientName", "${patientName || ''}");
          localStorage.setItem("medications", \`${medications || '[]'}\`);
          true;
        `;

        setInjectedJS(js);
      } catch (e) {
        console.error('Error loading AsyncStorage:', e);
      }
    };

    loadStoredData();
  }, []);

  const fileSource = htmlFiles[currentFile];

  // -----------------------------------
  // WEB FALLBACK via iframe
  // -----------------------------------
  if (Platform.OS === 'web') {
    return (
      <View style={styles.container}>
        <iframe
          src={fileSource}
          style={{ width: '100%', height: '100%', border: 'none' }}
        />
      </View>
    );
  }

  // -----------------------------------
  // NATIVE (Android + iOS)
  // -----------------------------------
  return (
    <View style={styles.container}>
      <WebView
        ref={webviewRef}
        originWhitelist={['*']}
        source={fileSource}
        style={{ flex: 1 }}

        // Inject REAL user data from AsyncStorage
        injectedJavaScript={injectedJS}

        onNavigationStateChange={(event) => {
          const url = event.url;

          if (!url.startsWith('data:text/html')) return;

          const match = url.match(/\.\/([a-zA-Z0-9-]+\.html)/);

          if (match && match[1] && htmlFiles[match[1]]) {
            setCurrentFile(match[1]);
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
