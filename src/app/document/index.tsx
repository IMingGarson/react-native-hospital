import React, { useState, useEffect } from 'react';
import { View, Button, StyleSheet, Alert, Text } from 'react-native';
import { WebView } from 'react-native-webview';
import { Picker } from '@react-native-picker/picker';
import { AsyncStorageGetItem } from '../utils';
import { useRouter } from 'expo-router';
import BottomTabs from '../bottomTabs';

interface PDFInterface {
  id: string;
  title: string;
  uri: string;
  duration: number;
}

interface ProgressState {
  [key: string]: PDFInterface;
}

const isJsonString = (data: string | null) => {
  if (!data) {
    return false;
  }
  try {
      JSON.parse(data);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (e: unknown) {
    return false;
  }
  return true;
}

export default function PDFScreen() {
  const [currentPDF, setCurrentPDF] = useState<PDFInterface>({ id: '1', title: 'PDF 1', uri: 'https://drive.google.com/file/d/1uc_dBdoZC250EeVFyHRFSx-mAIVaaEVJ/view?usp=sharing', duration: 0 });
  const [pdfs] = useState<PDFInterface[]>([
    { id: '1', title: '單元一', uri: 'https://drive.google.com/file/d/1uc_dBdoZC250EeVFyHRFSx-mAIVaaEVJ/view?usp=sharing', duration: 0 },
    { id: '2', title: '單元二', uri: 'https://drive.google.com/file/d/1uc_dBdoZC250EeVFyHRFSx-mAIVaaEVJ/view?usp=sharing', duration: 0 },
    { id: '3', title: '單元三', uri: 'https://drive.google.com/file/d/1uc_dBdoZC250EeVFyHRFSx-mAIVaaEVJ/view?usp=sharing', duration: 0 },
    { id: '4', title: '單元四', uri: 'https://drive.google.com/file/d/1uc_dBdoZC250EeVFyHRFSx-mAIVaaEVJ/view?usp=sharing', duration: 0 },
    { id: '5', title: '單元五', uri: 'https://drive.google.com/file/d/1uc_dBdoZC250EeVFyHRFSx-mAIVaaEVJ/view?usp=sharing', duration: 0 },
    { id: '6', title: '單元六', uri: 'https://drive.google.com/file/d/1uc_dBdoZC250EeVFyHRFSx-mAIVaaEVJ/view?usp=sharing', duration: 0 },
    { id: '7', title: '單元七', uri: 'https://drive.google.com/file/d/1uc_dBdoZC250EeVFyHRFSx-mAIVaaEVJ/view?usp=sharing', duration: 0 },
    { id: '8', title: '單元八', uri: 'https://drive.google.com/file/d/1uc_dBdoZC250EeVFyHRFSx-mAIVaaEVJ/view?usp=sharing', duration: 0 },
    { id: '9', title: '單元九', uri: 'https://drive.google.com/file/d/1uc_dBdoZC250EeVFyHRFSx-mAIVaaEVJ/view?usp=sharing', duration: 0 },
    { id: '10', title: '單元十', uri: 'https://drive.google.com/file/d/1uc_dBdoZC250EeVFyHRFSx-mAIVaaEVJ/view?usp=sharing', duration: 0 },
  ]);
  const [progress, setProgress] = useState<ProgressState>({});
  const [startTime, setStartTime] = useState<number>(Date.now());
  const [currentRole, setCurrentRole] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const router = useRouter();

  const fetchProgress = async () => {
    const token = await AsyncStorageGetItem('jwt');
    const role = await AsyncStorageGetItem('role');
    if (
      typeof token === 'string'
      && typeof role === 'string'
      && token.length
      && ['M', 'P'].includes(role)
    ) {
      setCurrentRole(role);
    } else {
      Alert.alert('錯誤', '無法取得資料');
      router.replace('/login');
    }
    if (role === 'P') {
      try {
        const response = await fetch('http://10.0.2.2:5000/api/patient/get', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          }
        });

        const data = await response.json();
        if (response.ok) {
          // Set progress
          const currentProgress: ProgressState = {};
          if (isJsonString(data.patient.document_progression_data)) {
            const progressionData = JSON.parse(data.patient.document_progression_data);
            if (Object.keys(progressionData).length === 0) {
              // default data
              pdfs.forEach((document: PDFInterface) => {
                currentProgress[document.id] = { ...document };
              });
              setProgress(currentProgress);
              setCurrentPDF(pdfs[0]);
            } else {
              progressionData.forEach((document: PDFInterface) => {
                currentProgress[document.id] = { ...document };
              });
              setProgress(progressionData);
              setCurrentPDF(progressionData[0]);
            }
          } else {
            // default data
            pdfs.forEach((document: PDFInterface) => {
              currentProgress[document.id] = { ...document };
            });
            setProgress(currentProgress);
            setCurrentPDF(pdfs[0]);
          }
        }
      } catch (error) {
        console.error('獲取觀看記錄時發生錯誤:', error);
      } finally {
        setLoading(false);
      }
    }
  }

  useEffect(() => {
    fetchProgress();
  }, []);

  const selectPDF = (pdfId: string) => {
    const accumulatedTime = Math.ceil((Date.now() - startTime) / 1000);
    setProgress((prev) => ({
      ...prev,
      [currentPDF.id]: {
        ...currentPDF,
        duration: accumulatedTime + progress[currentPDF.id].duration
      }
    }));
    setCurrentPDF(progress[pdfId]);
    setStartTime(Date.now());
  };

  const PdfViewer: React.FC<{ path: string }> = ({ path }) => {
    return (
      <View style={styles.webviewContainer}>
        <WebView
          source={{ uri: path }}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          startInLoadingState={false}
          scalesPageToFit={true}
          style={styles.webview}
        />
      </View>
    );
  };

  const saveProgress = async () => {
    try {
      const token = await AsyncStorageGetItem('jwt');
      if (!token) {
        Alert.alert('錯誤', '無法儲存進度');
        return;
      }
      const data = Object.keys(progress).map(function(documentId: string) {
        if (documentId === currentPDF.id) {
          const accumulatedTime = Math.ceil((Date.now() - startTime) / 1000);
          return {
            id: documentId,
            title: progress[documentId].title,
            uri: progress[documentId].uri,
            duration: accumulatedTime + (progress[documentId]?.duration || 0)
          }
        }
        return {
          id: documentId,
          title: progress[documentId].title,
          uri: progress[documentId].uri,
          duration: progress[documentId].duration,
        }
      });
      const response = await fetch('http://10.0.2.2:5000/api/patient/update_data', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          document_progression_data: JSON.stringify(data)
        }),
      });
      await response.json();
      if (response.ok) {
        Alert.alert('成功', '儲存進度成功');
      }
    } catch (error) {
      Alert.alert('失敗', '儲存進度時發生錯誤');
      console.error('儲存進度時發生錯誤:', error);
    }
    router.reload();
  };
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>取得資料中</Text>
      </View>
    );
  }
  return (
    <View style={styles.container}>
      <Picker
        selectedValue={currentPDF.id}
        onValueChange={(itemValue) => selectPDF(itemValue)}
        style={styles.picker}
      >
        {pdfs.map((pdf) => (
          <Picker.Item style={styles.pickerText} key={pdf.id} label={pdf.title} value={pdf.id} />
        ))}
      </Picker>
      { currentPDF && <PdfViewer path={currentPDF.uri} />}
      { currentRole === 'P' ? <Button onPress={() => saveProgress()} title="儲存閱讀進度" /> : null }
      <BottomTabs role={currentRole} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff6e5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    color: '#804000',
  },
  picker: {
    width: '100%',
    backgroundColor: '#fff6e5',
    borderRadius: 5,
  },
  pickerText: {
    fontSize: 20,
    color: 'black',
    fontWeight: 'bold',
  },
  webviewContainer: {
    flex: 1,
  },
  webview: {
    flex: 1,
  },
  saveBotton: {
    paddingVertical: 5,
  },
});