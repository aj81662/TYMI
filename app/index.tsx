import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
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
  const [currentFile, setCurrentFile] = useState(htmlFiles['index.html']);

  return (
    <View style={styles.container}>
      <WebView
        originWhitelist={['*']}
        source={currentFile}
        style={{ flex: 1 }}
        onNavigationStateChange={(event) => {
          const url = event.url;

          // Only handle local HTML links
          if (!url.startsWith('data:text/html')) return;

          // Extract the file name from the URL
          const match = url.match(/\.\/([a-zA-Z0-9-]+\.html)/);
          if (match && match[1] && htmlFiles[match[1]]) {
            setCurrentFile(htmlFiles[match[1]]);
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
