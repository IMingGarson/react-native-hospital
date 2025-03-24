/* eslint-disable @typescript-eslint/no-unused-vars */
 
import React, { useEffect, useRef, useState } from 'react';
import { Alert, View, Text, TouchableOpacity, StyleSheet, ScrollView, Platform, Pressable } from "react-native";
import { AsyncStorageGetItem, isJsonString } from '../utils';
import BottomTabs from '../bottomTabs';
import { useRouter } from 'expo-router';
import { Document, Video, PatientProgressionData, APIPatientProgressionData, APISymptomRecord } from '../interfaces';
import { SafeAreaView } from 'react-native-safe-area-context';
import { appTheme } from 'src/config/theme';
// import axios from 'axios';
// import * as Device from 'expo-device';
// import * as Notifications from 'expo-notifications';
// import Constants from 'expo-constants';

// Notifications.setNotificationHandler({
//   handleNotification: async () => ({
//     shouldShowAlert: true,
//     shouldPlaySound: true,
//     shouldSetBadge: false,
//   }),
// });

export default function NurseScreen() {
  const [patientData, setPatientData] = useState<PatientProgressionData[]>([]);
  const [currentRole, setCurrentRole] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const router = useRouter();
  const toMinguoDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const minguoYear = year - 1911;
    return `民國 ${minguoYear} 年 ${month} 月 ${day} 日`;
  }

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
          birthday: toMinguoDate(d.birthday)
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

  useEffect(() => { 
    fetchPatientData();
  }, []);

  const notifyPatient = async (pid: string, type: string, targetID: number = 0) => {
    let body: string = '';
    if (type == 'all') {
      body = '提醒您記得觀看影片與文件喔 😊';
    } else if (type == 'video') {
      body = `提醒您記得觀看第 ${targetID} 部影片喔 😊`
    } else if (type == 'document') {
      body = `提醒您記得閱讀第 ${targetID} 篇文件喔 😊`;
    }
    // axios.post(`https://app.nativenotify.com/api/indie/notification`, {
    //   subID: `PUSH_TOKEN_${pid}`,
    //   appId: 28399,
    //   appToken: 'UWdYG1804clZ7YhxKB1yMd',
    //   title: '📢 叮咚～您有一則通知',
    //   message: body,
    // });
    // Alert.alert('通知寄送成功');

    const message = {
      to: pid,
      sound: 'default',
      title: '📢 叮咚～您有一則通知',
      body: body,
      data: {
        url: 'video'
      }
    };

    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });
    Alert.alert('通知寄送成功');
    return true;
  };

  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const timeStamp = (time: number) => `${Math.floor(time / 60)}分${(time % 60).toString().padStart(2, '0')}秒`;

  /* EXPO NOTIFICATION SETUP */
  // const [deepLink, setDeepLink] = useState<string>("");
  // const [expoPushToken, setExpoPushToken] = useState('');
  // const [channels, setChannels] = useState<Notifications.NotificationChannel[]>([]);
  // const [notification, setNotification] = useState<Notifications.Notification | undefined>(
  //   undefined
  // );
  // const notificationListener = useRef<Notifications.EventSubscription>();
  // const responseListener = useRef<Notifications.EventSubscription>();
  // const registerForPushNotificationsAsync = async() => {
  //   let token;
  //   if (Platform.OS === 'android') {
  //     await Notifications.setNotificationChannelAsync('allgood-project', {
  //       name: 'allgood-project',
  //       importance: Notifications.AndroidImportance.MAX,
  //       vibrationPattern: [0, 250, 250, 250],
  //       lightColor: '#FF231F7C',
  //     });
  //   }

  //   if (Device.isDevice) {
  //     const { status: existingStatus } = await Notifications.getPermissionsAsync();
  //     let finalStatus = existingStatus;
  //     if (existingStatus !== 'granted') {
  //       const { status } = await Notifications.requestPermissionsAsync();
  //       finalStatus = status;
  //     }
  //     if (finalStatus !== 'granted') {
  //       alert('Failed to get push token for push notification!');
  //       return;
  //     }
  //     try {
  //       const projectId =
  //         Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
  //       if (!projectId) {
  //         throw new Error('Project ID not found');
  //       }
  //       token = (
  //         await Notifications.getExpoPushTokenAsync({
  //           projectId,
  //         })
  //       ).data;
  //     } catch (e) {
  //       token = `${e}`;
  //     }
  //   } else {
  //     alert('Must use physical device for Push Notifications');
  //     return "";
  //   }
  //   return token;
  // }
  // useEffect(() => {
  //   if (deepLink === 'video' || deepLink === 'document') {
  //     router.replace("/" + deepLink);
  //   }
  // }, [deepLink])

  // useEffect(() => {
  //   registerForPushNotificationsAsync().then(token => token && setExpoPushToken(token));

  //   if (Platform.OS === 'android') {
  //     Notifications.getNotificationChannelsAsync().then(value => setChannels(value ?? []));
  //   }
  //   notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
  //     console.log("received", notification.request.content);
  //     setNotification(notification);
  //   });

  //   responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
  //     console.log("response", response.notification.request.content);
  //     Notifications.dismissAllNotificationsAsync();
  //     const url = response.notification.request.content.data?.url;
  //     if (url) {
  //       setDeepLink(url);
  //     }
  //   });

  //   return () => {
  //     notificationListener.current &&
  //       Notifications.removeNotificationSubscription(notificationListener.current);
  //     responseListener.current &&
  //       Notifications.removeNotificationSubscription(responseListener.current);
  //   };
  // }, []);
  /* END OF EXPO NOTIFICATION SETUP */

  if (loading) {
    return (
      <View style={styles.loadingContainer}><Text style={styles.loadingText}>取得資料中</Text></View>
    );
  }
  return (
    <>
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.container}>
        <ScrollView showsHorizontalScrollIndicator={false} showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>病人列表</Text>
          {patientData.map((item: PatientProgressionData) => (
            <Pressable key={item.id} style={styles.patientCard} onPress={() => toggleExpand(item.id.toString())}>
              <Text style={styles.patientName}>{item.name}</Text>
              <View style={styles.tag}><Text style={styles.patientInfo}>{item.birthday}</Text></View>
              {expandedId && expandedId === item.id.toString() && (
                <View>
                  <Text style={styles.sectionTitle}>文件閱讀進度</Text>
                  {item.document.map((doc: Document, idx: number) => (
                    <View key={idx} style={styles.detailContainer}>
                      <Text style={styles.detailText}>{doc.label}</Text>
                      <Text style={styles.timeText}>{timeStamp(doc.duration)}</Text>
                      <TouchableOpacity style={styles.notifyButton} onPress={() => notifyPatient(item.pushToken ?? "", 'document', idx + 1)}>
                        <Text style={styles.notifyText}>通知</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                  <Text style={styles.sectionTitle}>影片觀看進度</Text>
                  {item.video.map((video: Video, idx: number) => (
                    <View key={idx} style={styles.detailContainer}>
                      <Text style={styles.detailText}>{video.title}</Text>
                      <Text style={styles.timeText}>{timeStamp(video.duration)}</Text>
                      <TouchableOpacity style={styles.notifyButton} onPress={() => notifyPatient(item.pushToken ?? "", 'video', idx + 1)}>
                        <Text style={styles.notifyText}>通知</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </Pressable>
          ))}
        </ScrollView>
      </SafeAreaView>
      <BottomTabs role={currentRole} />
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: appTheme.primary, paddingHorizontal: 20, paddingTop: Platform.OS === 'android' ? 0 : 10 },
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
