import React, { useEffect, useState } from 'react';
import { Alert, View, Text, TouchableOpacity, StyleSheet, ScrollView, Platform, StatusBar } from "react-native";
import { AsyncStorageGetItem, isJsonString } from '../utils';
import BottomTabs from '../bottomTabs';
import { useRouter } from 'expo-router';
import { Document, Video, PatientProgressionData, APIPatientProgressionData, APISymptomRecord } from '../interfaces';
import { SafeAreaView } from 'react-native-safe-area-context';
import { usePushNotifications, sendPushNotification } from '../utils/usePushNotification';
import { appTheme } from 'src/config/theme';

export default function NurseScreen() {
  const { expoPushToken } = usePushNotifications();
  const [patientData, setPatientData] = useState<PatientProgressionData[]>([]);
  const [currentRole, setCurrentRole] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const router = useRouter();

  const fetchPatientData = async () => {
    try {
      const token = await AsyncStorageGetItem('jwt');
      const role = await AsyncStorageGetItem('role');
      if (typeof token === 'string' && typeof role === 'string' && token.length && ['M', 'P'].includes(role)) {
        setCurrentRole(role);
      } else {
        Alert.alert('錯誤', '無法取得資料');
        router.replace('/login');
      }
      const response = await fetch('https://allgood.peiren.info/api/patient', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok) {
        const patients = data.patients.map((d: APIPatientProgressionData) => ({
          id: d.id,
          name: d.name,
          document: isJsonString(d.document_progression_data) ? JSON.parse(d.document_progression_data) : [],
          video: isJsonString(d.video_progression_data) ? JSON.parse(d.video_progression_data) : [],
          survey: isJsonString(d.survey_data) ? JSON.parse(d.survey_data) : [],
          records: d.symptom_records?.map((s: APISymptomRecord) => ({ date: s.date, data: isJsonString(s.survey_data) ? JSON.parse(s.survey_data) : [] })),
          pushToken: d.push_token,
        }));
        setPatientData(patients);
      } else {
        Alert.alert('失敗', data.message);
        router.replace('/login');
      }
    } catch (error) {
      Alert.alert('錯誤', '無法連接伺服器，請稍後再試');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPatientData(); }, []);

  const notifyPatient = async (pid: number, type: string, targetID: number = 0) => {
    if (expoPushToken?.data) {
      Alert.alert("推播測試", `TOKEN: ${expoPushToken.data}`);
      await sendPushNotification(expoPushToken.data);
    }
  };

  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const timeStamp = (time: number) => `${Math.floor(time / 60)}分${(time % 60).toString().padStart(2, '0')}秒`;

  if (loading) {
    return (
      <View style={styles.loadingContainer}><Text style={styles.loadingText}>取得資料中</Text></View>
    );
  }

  return (
    <>
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.container}>
        <ScrollView>
          <Text style={styles.title}>病人列表</Text>
          {patientData.map((item) => (
            <TouchableOpacity key={item.id} style={styles.patientCard} onPress={() => toggleExpand(item.id.toString())}>
              <Text style={styles.patientName}>{item.name}</Text>
              <View style={styles.tag}><Text style={styles.patientInfo}>ID: {item.id}</Text></View>
              {expandedId && expandedId === item.id.toString() && (
                <View>
                  <Text style={styles.sectionTitle}>文件閱讀進度</Text>
                  {item.document.map((doc: Document, idx: number) => (
                    <View key={idx} style={styles.detailContainer}>
                      <Text style={styles.detailText}>{doc.label}</Text>
                      <Text style={styles.timeText}>{timeStamp(doc.duration)}</Text>
                      <TouchableOpacity style={styles.notifyButton} onPress={() => notifyPatient(item.id, 'document', idx + 1)}>
                        <Text style={styles.notifyText}>通知</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                  <Text style={styles.sectionTitle}>影片觀看進度</Text>
                  {item.video.map((video: Video, idx: number) => (
                    <View key={idx} style={styles.detailContainer}>
                      <Text style={styles.detailText}>{video.title}</Text>
                      <Text style={styles.timeText}>{timeStamp(video.duration)}</Text>
                      <TouchableOpacity style={styles.notifyButton} onPress={() => notifyPatient(item.id, 'video', idx + 1)}>
                        <Text style={styles.notifyText}>通知</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </SafeAreaView>
      <BottomTabs role={currentRole} />
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: appTheme.primary, paddingHorizontal: 20, paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 10 },
  title: { fontSize: 28, color: appTheme.text, fontWeight: 'bold', marginVertical: 20 },
  patientCard: { backgroundColor: appTheme.background, borderRadius: 12, padding: 16, marginBottom: 16, shadowOpacity: 0.1, elevation: 3 },
  patientName: { fontSize: 22, color: appTheme.text, fontWeight: 'bold' },
  patientInfo: { fontSize: 16, color: appTheme.background },
  tag: { alignSelf: 'flex-start', backgroundColor: appTheme.highlight, padding: 4, borderRadius: 6, marginVertical: 4 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: appTheme.text, marginTop: 12 },
  detailContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderColor: appTheme.secondary, paddingVertical: 6 },
  detailText: { fontSize: 16, color: appTheme.text, flex: 1 },
  timeText: { fontSize: 16, color: appTheme.accent, flex: 0.6, textAlign: 'right', fontWeight: 500 },
  notifyButton: { padding: 8, backgroundColor: appTheme.highlight, borderRadius: 6, marginLeft: 8 },
  notifyText: { color: '#fff', fontSize: 14 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: appTheme.primary },
  loadingText: { fontSize: 18, color: appTheme.text },
});
