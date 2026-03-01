import { api } from '@/constants/api';
import { useAuth } from '@/context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Modal,
  ScrollView, StyleSheet, Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { WebView } from 'react-native-webview';
const { width } = Dimensions.get('window');

export default function CCTVPage() {
  const [cameras, setCameras] = useState<any[]>([]);
  const { userToken } = useAuth();
  const [fullscreenCamera, setFullscreenCamera] = useState<any>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [modalVisible, setModalVisible] = useState(false);
  const [cameraName, setCameraName] = useState('');
  const [cameraUrl, setCameraUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingCameraId, setEditingCameraId] = useState<number | null>(null);

  const fetchCameras = async () => {
    try {
      const response = await api.get('/cameras/');
      setCameras(response.data);
    } catch (error) {
      console.error('Failed to fetch cameras', error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchCameras();
    }, [])
  );

  const handleAddCamera = async () => {
    if (!cameraName || !cameraUrl) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    let finalUrl = cameraUrl;
    if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
      finalUrl = 'http://' + finalUrl;
    }

    setIsSubmitting(true);
    try {
      await api.post('/cameras/', {
        name: cameraName,
        source_url: finalUrl,
        camera_type: 'IPWEBCAM'
      });

      setModalVisible(false);
      setCameraName('');
      setCameraUrl('');
      fetchCameras();
      Alert.alert('Success', 'Camera added successfully');
    } catch (error: any) {
      console.log("Backend Error:", error.response?.data);
      Alert.alert("Error", JSON.stringify(error.response?.data));
    }
    finally {
      setIsSubmitting(false);
    }
    setEditingCameraId(null);
  };
  
  const handleRefresh = () => {
   setRefreshKey(prev => prev + 1);
   
  };

  const handleEditCamera = async (cameraId: number) => {
    if (!cameraName || !cameraUrl) {
      Alert.alert('Error', 'Fill all fields');
      return;
    }

    try {
      await api.put(`/cameras/${cameraId}/`, {
        name: cameraName,
        source_url: cameraUrl,
        camera_type: 'IPWEBCAM'
      });

      fetchCameras();
      setModalVisible(false);
      Alert.alert("Updated", "Camera updated successfully");
    } catch (error) {
      console.log(error);
      Alert.alert("Error", "Failed to update");
    }
    setEditingCameraId(null);
  };

  const renderCamera = (camera: any) => {
    return (
      <View key={camera.id} style={styles.cameraContainer}>
        <View style={styles.videoWrapper}>
          <Text style={styles.topCameraName}>{camera.name}</Text>
          <WebView
           key={refreshKey}
            source={{
              html: `<html style="margin:0;padding:0;height:100%;background-color:black;display:flex;justify-content:center;align-items:center;">
                       <img src="${camera.source_url}" 
                            style="width:100%;height:100%;object-fit:contain;" 
                            onerror="document.body.innerHTML='<div style=\\'color:red;font-family:sans-serif;text-align:center;\\'><b>Error loading stream</b><br/><br/><span style=\\'font-size:12px;color:white;\\'>Check if URL is correct and on the same Wi-Fi network:<br/>${camera.source_url}</span></div>'" 
                       />
                     </html>`
            }}
            originWhitelist={['*']}
            mixedContentMode="always"
            allowsInlineMediaPlayback={true}
            style={{ flex: 1 }}
            scrollEnabled={false}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            onError={(e) => console.log('WebView load Error:', e.nativeEvent)}
          />
        </View>

        <View style={styles.controls}>
          {/* ✏ Edit */}
          <TouchableOpacity
            onPress={() => {
              setEditingCameraId(camera.id);
              setCameraName(camera.name);
              setCameraUrl(camera.source_url);
              setModalVisible(true);
            }}
          >
            <Ionicons name="create-outline" size={22} color="white" />
          </TouchableOpacity>

          {/* 🔄 Refresh */}
          <TouchableOpacity onPress={handleRefresh}>
            <Ionicons name="refresh-outline" size={22} color="white" />
          </TouchableOpacity>

          {/* ⛶ Fullscreen */}
          <TouchableOpacity onPress={() => setFullscreenCamera(camera)}>
            <Ionicons name="expand-outline" size={22} color="white" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Live Feed</Text>

      <ScrollView contentContainerStyle={styles.grid}>
        {cameras.length === 0 ? (
          <Text style={{ color: 'gray', textAlign: 'center', marginTop: 20 }}>
            No camera added yet.
          </Text>
        ) : (
          cameras.map(camera => renderCamera(camera))
        )}

        {/* ✅ Show Add Button ONLY if no camera exists */}
        {cameras.length === 0 && (
          <TouchableOpacity
            style={styles.addCameraBtn}
            onPress={() => setModalVisible(true)}
          >
            <Ionicons name="add-circle-outline" size={40} color="#6C4AB6" />
            <Text style={styles.addText}>Add IP Webcam</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add IP Webcam</Text>

            <TextInput
              style={styles.input}
              placeholder="Camera Name (e.g., Front Door)"
              placeholderTextColor="#aaa"
              value={cameraName}
              onChangeText={setCameraName}
            />

            <TextInput
              style={styles.input}
              placeholder="IP Webcam URL (http://192.168.x.x:8080/video)"
              placeholderTextColor="#aaa"
              value={cameraUrl}
              onChangeText={setCameraUrl}
              autoCapitalize="none"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.btnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.saveBtn}
                onPress={() => {
                  if (editingCameraId) {
                    handleEditCamera(editingCameraId);
                  } else {
                    handleAddCamera();
                  }
                }}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.btnText}>Save Camera</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      <Modal
        visible={fullscreenCamera !== null}
        animationType="slide"
        onRequestClose={() => setFullscreenCamera(null)}
      >
        <View style={{ flex: 1, backgroundColor: 'black' }}>
          <WebView
            source={{
              uri: fullscreenCamera?.source_url
            }}
            style={{ flex: 1 }}
          />

          <TouchableOpacity
            style={{
              position: 'absolute',
              top: 40,
              right: 20,
              backgroundColor: 'rgba(0,0,0,0.6)',
              padding: 8,
              borderRadius: 20
            }}
            onPress={() => setFullscreenCamera(null)}
          >
            <Ionicons name="close" size={28} color="white" />
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0f18ff',
    paddingTop: 40,
    paddingHorizontal: 10,
  },

  heading: {
    color: 'white',
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  topCameraName: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    padding: 8,
    textAlign: 'center',
  },
  grid: {
    paddingBottom: 80,
    alignItems: 'center',
  },

  cameraContainer: {
    width: width - 30,
    height: 220,
    backgroundColor: '#1e1e2eff',
    borderRadius: 15,
    marginBottom: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#333',
  },

  videoWrapper: {
    flex: 1,
    backgroundColor: '#000',
  },

  cameraLabel: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    position: 'absolute',
    bottom: 0,
    width: '100%',
  },

  cameraName: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },

  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },

  addCameraBtn: {
    width: width - 30,
    height: 100,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: '#6C4AB6',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: 'rgba(108, 74, 182, 0.1)',
  },

  addText: {
    color: '#6C4AB6',
    marginTop: 5,
    fontWeight: 'bold',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  modalContent: {
    width: '85%',
    backgroundColor: '#1e1e2eff',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#333',
  },
  controls: {
  flexDirection: 'row',
  justifyContent: 'space-around',
  alignItems: 'center',
  paddingVertical: 8,
  backgroundColor: '#111',
  },
  modalTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },

  input: {
    backgroundColor: '#0a0f18ff',
    color: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#333',
  },

  typeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 10,
  },

  typeLabel: {
    color: 'white',
    fontSize: 16,
    marginRight: 10,
  },

  typeBtn: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#6C4AB6',
    alignItems: 'center',
  },

  typeBtnActive: {
    backgroundColor: '#6C4AB6',
  },

  typeBtnText: {
    color: '#6C4AB6',
    fontWeight: 'bold',
  },

  typeBtnTextActive: {
    color: 'white',
  },

  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },

  cancelBtn: {
    flex: 1,
    backgroundColor: '#333',
    padding: 15,
    borderRadius: 10,
    marginRight: 10,
    alignItems: 'center',
  },

  saveBtn: {
    flex: 1,
    backgroundColor: '#6C4AB6',
    padding: 15,
    borderRadius: 10,
    marginLeft: 10,
    alignItems: 'center',
  },

  btnText: {
    color: 'white',
    fontWeight: 'bold',
  },
});