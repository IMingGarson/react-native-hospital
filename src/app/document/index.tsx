import React, { useState, useEffect } from 'react';
import { View, Button, StyleSheet, Alert, Text } from 'react-native';
import { WebView } from 'react-native-webview';
// import { Picker } from '@react-native-picker/picker';
import RNPickerSelect from 'react-native-picker-select';
import { AsyncStorageGetItem } from '../utils';
import { useRouter } from 'expo-router';
import BottomTabs from '../bottomTabs';

interface PDFInterface {
  id: string;
  label: string;
  value: string;
  path?: string;
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
  const [currentPDF, setCurrentPDF] = useState<PDFInterface>({ 
    id: '1', 
    label: '活動不漏尿', 
    value: 'https://drive.google.com/file/d/1uc_dBdoZC250EeVFyHRFSx-mAIVaaEVJ/view?usp=sharing', 
    duration: 0 
  });
  const [pdfs] = useState<PDFInterface[]>([
    { id: '1', label: '活動不漏尿', value: 'https://drive.google.com/file/d/1uc_dBdoZC250EeVFyHRFSx-mAIVaaEVJ/view?usp=sharing', duration: 0 },
    { id: '2', label: '認識高血壓：症狀與治療', value: 'https://drive.google.com/file/d/1_E-Qx-6BeCHTRjQMeFk2g4LgzIrgt2EN/view?usp=sharing', duration: 0 },
    // { id: '3', label: '健康飲食的五大黃金法則', value: 'https://drive.google.com/file/d/1uc_dBdoZC250EeVFyHRFSx-mAIVaaEVJ/view?usp=sharing', duration: 0 },
    // { id: '4', label: '心臟病的早期警訊與預防', value: 'https://drive.google.com/file/d/1uc_dBdoZC250EeVFyHRFSx-mAIVaaEVJ/view?usp=sharing', duration: 0 },
    // { id: '5', label: '戒菸成功的10個實用技巧', value: 'https://drive.google.com/file/d/1uc_dBdoZC250EeVFyHRFSx-mAIVaaEVJ/view?usp=sharing', duration: 0 },
    // { id: '6', label: '運動與健康：每天10分鐘就夠', value: 'https://drive.google.com/file/d/1uc_dBdoZC250EeVFyHRFSx-mAIVaaEVJ/view?usp=sharing', duration: 0 },
    // { id: '7', label: '遠離壓力：正念練習入門', value: 'https://drive.google.com/file/d/1uc_dBdoZC250EeVFyHRFSx-mAIVaaEVJ/view?usp=sharing', duration: 0 },
    // { id: '8', label: '失眠困擾？改善睡眠的好方法', value: 'https://drive.google.com/file/d/1uc_dBdoZC250EeVFyHRFSx-mAIVaaEVJ/view?usp=sharing', duration: 0 },
    // { id: '9', label: '疫苗的重要性與接種須知', value: 'https://drive.google.com/file/d/1uc_dBdoZC250EeVFyHRFSx-mAIVaaEVJ/view?usp=sharing', duration: 0 },
    // { id: '10', label: '認識骨質疏鬆與日常保養', value: 'https://drive.google.com/file/d/1uc_dBdoZC250EeVFyHRFSx-mAIVaaEVJ/view?usp=sharing', duration: 0 },
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
        const response = await fetch('https://allgood.peiren.info/api/patient/get', {
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
    } else {
      // default data
      const currentProgress: ProgressState = {};
      pdfs.forEach((document: PDFInterface) => {
        currentProgress[document.id] = { ...document };
      });
      setProgress(currentProgress);
      setCurrentPDF(pdfs[0]);
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchProgress();
  }, []);

  const selectPDF = (selectedValue: string) => {
    const pdf = pdfs.find((p) => p.value === selectedValue);
    if (!pdf || !pdf.id) {
      Alert.alert('錯誤', '無法找到該 PDF');
      return false;
    }
    const accumulatedTime = Math.ceil((Date.now() - startTime) / 1000);
    setProgress((prev) => ({
      ...prev,
      [currentPDF.id]: {
        ...currentPDF,
        duration: accumulatedTime + progress[currentPDF.id].duration,
      }
    }));
    setCurrentPDF(progress[pdf.id]);
    setStartTime(Date.now());
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
            label: progress[documentId].label,
            value: progress[documentId].value,
            duration: accumulatedTime + progress[documentId].duration
          }
        }
        return {
          id: documentId,
          label: progress[documentId].label,
          value: progress[documentId].value,
          duration: progress[documentId].duration
        }
      });
      const response = await fetch('https://allgood.peiren.info/api/patient/update_data', {
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
      {/* <Picker
        selectedValue={currentPDF.id}
        onValueChange={(itemValue) => selectPDF(itemValue)}
        style={styles.picker}
      >
        {pdfs.map((pdf) => (
          <Picker.Item style={styles.pickerText} key={pdf.id} label={`${pdf.id}. ${pdf.title}`} value={pdf.id} />
        ))}
      </Picker> */}
      <RNPickerSelect
        placeholder={{ label: "請選擇", value: "", color: "#000" }}
        value={currentPDF.value}
        onValueChange={(itemValue: string) => selectPDF(itemValue)}
        items={pdfs}
        style={StyleSheet.create({
            inputIOSContainer: {
              paddingVertical: 15,
              paddingHorizontal: 10,
            },
        })}
      />
      { currentPDF ? (
        <View style={styles.webviewContainer}>
          <WebView
            source={{ uri: currentPDF.value }}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            startInLoadingState={false}
            scalesPageToFit={true}
            style={styles.webview}
          />
        </View>
      ): null}
      { currentRole === 'P' ? <Button onPress={() => saveProgress()} title="儲存閱讀進度" /> : null }
      <BottomTabs role={currentRole} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffd59a',
    paddingTop: 45,
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