import React, {useState, useRef, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Dimensions,
  Platform,
} from 'react-native';
// `vision-camera-ocr` is imported dynamically at runtime in native only.
import Icon from 'react-native-vector-icons/MaterialIcons';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {RootStackParamList, OCRResult} from '@types';

type Props = NativeStackScreenProps<RootStackParamList, 'LabelCapture'>;

const {width, height} = Dimensions.get('window');

const LabelCaptureScreen: React.FC<Props> = ({navigation}) => {
  const [isScanning, setIsScanning] = useState(false);
  const [flashEnabled, setFlashEnabled] = useState(false);
  const [cameraAvailable, setCameraAvailable] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [device, setDevice] = useState<any>(null);
  const camera = useRef<any>(null);

  // Dynamically import vision-camera only on native platforms
  useEffect(() => {
    let mounted = true;
    async function initCamera() {
      if (Platform.OS === 'web') {
        setCameraAvailable(false);
        setHasPermission(false);
        return;
      }

      try {
        const vc = await import('react-native-vision-camera');
        const { useCameraDevice, useCameraPermission } = vc;

        const permissionResult = await vc.Camera.getCameraPermissionStatus?.();
        // request permission if not authorized
        if (String(permissionResult) !== 'authorized' && vc.Camera.requestCameraPermission) {
          await vc.Camera.requestCameraPermission();
        }

        const devices = vc.useCameraDevice ? vc.useCameraDevice('back') : null;
        if (!mounted) return;
        setDevice(devices);
        setHasPermission(true);
        setCameraAvailable(true);
      } catch (e) {
        console.warn('VisionCamera not available:', e);
        setCameraAvailable(false);
        setHasPermission(false);
      }
    }

    initCamera();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    // noop — permission handled in dynamic import
  }, []);

  const handleCapture = async () => {
    if (!camera.current || !cameraAvailable) {
      Alert.alert('Camera unavailable', 'Camera is not available on this device.');
      return;
    }

    try {
      setIsScanning(true);

      // Take photo
      const photo = await camera.current.takePhoto({
        flash: flashEnabled ? 'on' : 'off',
        qualityPrioritization: 'quality',
      });

      // Dynamically import OCR only when needed (native)
      const ocrModule = await import('vision-camera-ocr');
      const { scanOCR } = ocrModule as any;

      if (!scanOCR) {
        throw new Error('OCR module not available');
      }

      const ocrResult = await scanOCR(photo.path as any);

      if (!ocrResult || !ocrResult.result || ocrResult.result.text.trim().length === 0) {
        Alert.alert(
          'No Text Detected',
          'Could not detect any text in the image. Please ensure the prescription label is clearly visible and try again.',
        );
        setIsScanning(false);
        return;
      }

      navigation.navigate('MedicationReview', {
        parsedData: {
          drugName: '',
          dosage: '',
          frequency: '',
          duration: '',
          instructions: '',
          confidence: 0,
        },
        imageUri: `file://${(photo as any).path}`,
        rawOcrText: ocrResult.result.text,
      });
    } catch (error) {
      console.error('OCR Error:', error);
      Alert.alert('Scan Failed', (error as any)?.message || 'Failed to scan the prescription label.');
    } finally {
      setIsScanning(false);
    }
  };

  const toggleFlash = () => {
    setFlashEnabled(prev => !prev);
  };

  if (Platform.OS === 'web' || !cameraAvailable) {
    return (
      <View style={styles.container}>
        <Text style={styles.permissionText}>
          Camera scanning is not available on web. Use the mobile app to capture labels.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Camera preview: rendered by native camera module when available. */}
      <View style={StyleSheet.absoluteFill} />
      
      {/* Overlay with frame guide */}
      <View style={styles.overlay}>
        <View style={styles.topOverlay}>
          <Text style={styles.instructionText}>
            Position the prescription label within the frame
          </Text>
        </View>
        
        <View style={styles.middleRow}>
          <View style={styles.sideOverlay} />
          <View style={styles.frameGuide} />
          <View style={styles.sideOverlay} />
        </View>
        
        <View style={styles.bottomOverlay} />
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        <TouchableOpacity
          style={styles.flashButton}
          onPress={toggleFlash}>
          <Icon
            name={flashEnabled ? 'flash-on' : 'flash-off'}
            size={30}
            color="white"
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.captureButton, isScanning && styles.captureButtonDisabled]}
          onPress={handleCapture}
          disabled={isScanning}>
          {isScanning ? (
            <ActivityIndicator size="large" color="white" />
          ) : (
            <Icon name="camera" size={40} color="white" />
          )}
        </TouchableOpacity>

        <View style={styles.flashButton} />
      </View>

      {isScanning && (
        <View style={styles.scanningOverlay}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.scanningText}>Scanning label...</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
  },
  topOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  middleRow: {
    flexDirection: 'row',
    height: height * 0.4,
  },
  sideOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  frameGuide: {
    width: width * 0.8,
    borderWidth: 3,
    borderColor: '#007AFF',
    borderRadius: 10,
  },
  bottomOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  instructionText: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
    paddingHorizontal: 20,
    fontWeight: '600',
  },
  controls: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  captureButtonDisabled: {
    backgroundColor: '#666',
  },
  flashButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanningOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanningText: {
    color: 'white',
    fontSize: 18,
    marginTop: 20,
    fontWeight: '600',
  },
  permissionText: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
    paddingHorizontal: 40,
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 10,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default LabelCaptureScreen;
