 
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Link, useRouter } from 'expo-router';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import {
  MaterialCommunityIcons,
  FontAwesome,
  Foundation,
  MaterialIcons,
} from '@expo/vector-icons';
import { appTheme } from 'src/config/theme';
import { Survey } from '../interfaces';
import { AsyncStorageGetItem, AsyncStorageRemoveItem, isJsonString } from '../utils';
import registerNNPushToken ,{ registerIndieID } from 'native-notify';

const symptoms = [
  '尿失禁',
  '頻尿',
  '腹瀉',
  '便祕',
  '疲憊',
  '情緒低落',
  '緊張',
  '缺乏活力',
  '熱潮紅',
  '其他',
];

interface PastSurvey {
  [key: string]: Survey[];
}

interface Styles {
  [key: string]: string | number;
}

interface BottomTabsProps {
  role: string;
  customedStyle?: Styles;
}

/** 自訂 hook：處理 push notifications 的註冊與監聽 */
const usePushNotifications = (): { expoPushToken: string; deepLink: string } => {
  const [expoPushToken, setExpoPushToken] = useState<string>('');
  const [deepLink, setDeepLink] = useState<string>('');
  const notificationListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

  const registerForPushNotificationsAsync = useCallback(async (): Promise<string> => {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('allgood-project', {
        name: 'allgood-project',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') {
        Alert.alert('Error', 'Failed to get push token for push notification!');
        return '';
      }
      try {
        const projectId =
          Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
        if (!projectId) {
          throw new Error('Project ID not found');
        }
        // const tokenResponse = await Notifications.getExpoPushTokenAsync({ projectId });
        const tokenResponse = await Notifications.getDevicePushTokenAsync();
        return tokenResponse.data;
      } catch (error) {
        return String(error);
      }
    } else {
      Alert.alert('Error', 'Must use physical device for Push Notifications');
      return '';
    }
  }, []);

  useEffect(() => {
    registerForPushNotificationsAsync().then((token) => {
      if (token) setExpoPushToken(token);
    });

    notificationListener.current = Notifications.addNotificationReceivedListener((notification) => {
      console.log('Notification Received:', notification.request.content);
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      console.log('Notification Response:', response.notification.request.content);
      Notifications.dismissAllNotificationsAsync();
      const url = response.notification.request.content.data?._page;
      if (url) {
        switch (url) {
          case "video":
          case "document":
            setDeepLink(url);
            break;
          default:
            break;
        }
      }
    });

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, [registerForPushNotificationsAsync]);

  return { expoPushToken, deepLink };
};

const SurveyScreen: React.FC = () => {
  registerNNPushToken(
    Constants.expoConfig.env.nativeNotify.appID, 
    Constants.expoConfig.env.nativeNotify.appToken
  );
  const BASE_URL = Constants.expoConfig.env.BASE_URL;
  const router = useRouter();
  const { expoPushToken, deepLink } = usePushNotifications();
  const [answers, setAnswers] = useState<Survey[]>(() =>
    symptoms.map((symptom) => ({
      symptom,
      hasSymptom: false,
      severity: 0,
      customSymptom: symptom === '其他' ? '' : null,
    }))
  );
  const [date, setDate] = useState<Date>(new Date());
  const [showDate, setShowDate] = useState<boolean>(false);
  const [pastSurvey, setPastSurvey] = useState<PastSurvey>({});

  // 根據 deep link 做頁面跳轉
  useEffect(() => {
    if (deepLink === 'video' || deepLink === 'document') {
      router.replace(`/${deepLink}`);
    }
  }, [deepLink, router]);

  const updatePushToken = useCallback(async () => {
    try {
      const token = await AsyncStorageGetItem('jwt') as string;
      const role = await AsyncStorageGetItem('role') as string;
      if (!token || !role || !['M', 'P'].includes(role)) {
        Alert.alert('錯誤', '無法取得資料');
        router.replace('/login');
        return;
      }
      await fetch('https://allgood.peiren.info/api/patient/token', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ token: expoPushToken }),
      });
    } catch (error) {
      Alert.alert('Error', '系統更新錯誤');
      console.error('Error updating push token:', error);
    }
  }, [expoPushToken, router]);

  useEffect(() => {
    if (expoPushToken) {
      updatePushToken();
    }
  }, [expoPushToken, updatePushToken]);

  const fetchData = useCallback(async () => {
    try {
      const token = await AsyncStorageGetItem('jwt') as string;
      const role = await AsyncStorageGetItem('role') as string;
      if (!token || !role || !['M', 'P'].includes(role)) {
        Alert.alert('錯誤', '無法取得資料');
        router.replace('/login');
        return;
      }
      const response = await fetch(`${BASE_URL}/api/patient/get`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (response.ok) {
        if (isJsonString(data.patient.survey_data)) {
          setAnswers(JSON.parse(data.patient.survey_data));
        }
        if (data.symptom_data) {
          const newPastSurvey: PastSurvey = {};
          data.symptom_data.forEach((d: any) => {
            if (isJsonString(d.survey_data)) {
              newPastSurvey[d.date] = JSON.parse(d.survey_data);
            }
          });
          setPastSurvey(newPastSurvey);
          const dateKey = date.toISOString().split('T')[0];
          if (dateKey in newPastSurvey) {
            setAnswers(newPastSurvey[dateKey]);
          } else {
            setAnswers(
              symptoms.map((symptom) => ({
                symptom,
                hasSymptom: false,
                severity: 0,
                customSymptom: symptom === '其他' ? '' : null,
              }))
            );
          }
        }
        registerIndieID(
          `PUSH_ID_${data.patient.id}`, 
          Constants.expoConfig.env.nativeNotify.appID, 
          Constants.expoConfig.env.nativeNotify.appToken
        );
      }
    } catch (error) {
      console.error('Error fetching survey data:', error);
    }
  }, [date, router]);

  useEffect(() => {
    fetchData();
  }, []);

  const toggleSymptom = useCallback((index: number, hasSymptom: boolean) => {
    setAnswers((prev) =>
      prev.map((answer, idx) =>
        idx === index
          ? { ...answer, hasSymptom, severity: hasSymptom ? answer.severity : 0 }
          : answer
      )
    );
  }, []);

  const changeSeverity = useCallback((index: number, severity: number) => {
    setAnswers((prev) =>
      prev.map((answer, idx) =>
        idx === index ? { ...answer, hasSymptom: true, severity } : answer
      )
    );
  }, []);

  const changeCustomSymptom = useCallback((text: string) => {
    setAnswers((prev) => {
      const lastIndex = prev.length - 1;
      return prev.map((answer, idx) =>
        idx === lastIndex ? { ...answer, customSymptom: text } : answer
      );
    });
  }, []);

  const handleSubmit = async () => {
    try {
      const token = await AsyncStorageGetItem('jwt');
      if (!token) {
        Alert.alert('錯誤', '無法儲存進度');
        return;
      }
      const response = await fetch('https://allgood.peiren.info/api/patient/symptom_survey', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          survey_data: JSON.stringify(answers),
          date: date.toISOString().split('T')[0],
        }),
      });
      if (response.ok) {
        await fetchData();
        Alert.alert('成功', '儲存症狀成功');
      }
    } catch (error) {
      Alert.alert('失敗', '儲存進度時發生錯誤');
      console.error('Error submitting survey:', error);
    }
  };

  const onDateChange = useCallback(
    (_: DateTimePickerEvent, selectedDate: Date | undefined) => {
      if (selectedDate) {
        const newDate = selectedDate.toISOString().split('T')[0];
        if (newDate in pastSurvey) {
          setAnswers(pastSurvey[newDate]);
        } else {
          setAnswers(
            symptoms.map((symptom) => ({
              symptom,
              hasSymptom: false,
              severity: 0,
              customSymptom: symptom === '其他' ? '' : null,
            }))
          );
        }
        setDate(selectedDate);
      }
      setShowDate(false);
  }, [pastSurvey]);

  return (
    <SafeAreaProvider>
      <View style={{ flex: 1 }}>
        <SafeAreaView edges={['top']} style={styles.topSafeview}>
          <View style={styles.container}>
            {/* <Text style={styles.questionText}>{expoPushToken}</Text> */}
            <ScrollView contentContainerStyle={styles.scrollContent}>
              { Platform.OS === 'android' && (
                <Pressable onPress={() => setShowDate(true)}>
                  <View style={styles.inputContainer}>
                    <TextInput
                      style={[styles.input]}
                      value={date?.toISOString().split('T')[0]}
                      readOnly
                    />
                    <MaterialIcons
                      name={'touch-app'}
                      size={30}
                      color="#000"
                      style={{ 'marginLeft': -40 }}
                    />
                    {showDate && (
                      <DateTimePicker
                        display="spinner"
                        value={date}
                        mode="date"
                        onChange={onDateChange}
                      />
                    )}
                  </View>
                </Pressable>
              )}
              {Platform.OS === 'ios' && (
                <View style={styles.datePickerContainer}>
                  <Text style={styles.datePickerLabel}>選擇日期</Text>
                  <DateTimePicker
                    display="default"
                    value={date}
                    mode="date"
                    onChange={onDateChange}
                  />
                </View>
              )}
              {answers.map((answer, index) => (
                <View key={index}>
                  <Text style={styles.questionText}>{answer.symptom}</Text>
                  {answer.symptom === '其他' ? (
                    <TextInput
                      style={styles.input}
                      placeholder="請輸入症狀"
                      value={answer.customSymptom || ''}
                      onChangeText={changeCustomSymptom}
                    />
                  ) : (
                    <View style={styles.optionsContainer}>
                      <TouchableOpacity
                        style={[
                          styles.optionButton,
                          styles.optionLeft,
                          answer.hasSymptom && styles.selectedOption,
                        ]}
                        onPress={() => toggleSymptom(index, true)}
                      >
                        <Text style={styles.optionText}>有症狀</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.optionButton,
                          styles.optionRight,
                          !answer.hasSymptom && styles.selectedOption,
                        ]}
                        onPress={() => toggleSymptom(index, false)}
                      >
                        <Text style={styles.optionText}>無症狀</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                  {answer.hasSymptom && <Text style={styles.questionSubText}>困擾程度</Text>}
                  {(answer.hasSymptom || answer.symptom === '其他') && (
                    <View style={styles.severityContainer}>
                      {[0, 1, 2, 3].map((severity) => (
                        <TouchableOpacity
                          key={severity}
                          style={[
                            styles.severityButton,
                            answer.severity === severity && styles.selectedSeverity,
                          ]}
                          onPress={() => changeSeverity(index, severity)}
                        >
                          <Text style={styles.severityText}>
                            {severity === 0
                              ? '無'
                              : severity === 1
                              ? '小'
                              : severity === 2
                              ? '中'
                              : '大'}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              ))}
              <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
                <Text style={styles.submitButtonText}>儲存</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </SafeAreaView>
        <BottomTabs role="P" />
      </View>
    </SafeAreaProvider>
  );
};

const BottomTabs: React.FC<BottomTabsProps> = ({ role, customedStyle }) => {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);

  const handleSignOut = useCallback(async () => {
    await AsyncStorageRemoveItem('token');
    await AsyncStorageRemoveItem('role');
    setShowModal(false);
    Alert.alert('登出成功');
    router.replace('/login');
  }, [router]);

  return (
    <SafeAreaView
      edges={['bottom']}
      style={[
        bottomsList.bottomSafeview,
        { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'white' },
      ]}
    >
      <View style={[bottomsList.container, customedStyle]}>
        {role === 'M' ? (
          <View style={bottomsList.tabItem}>
            <Link href="/nurse">
              <MaterialCommunityIcons name="emoticon-sick-outline" style={bottomsList.tabIcon} />
            </Link>
            <Link href="/nurse">
              <Text style={bottomsList.tabText}>病人列表</Text>
            </Link>
          </View>
        ) : (
          <View style={bottomsList.tabItem}>
            <Link href="/survey">
              <FontAwesome name="pencil-square-o" size={24} style={bottomsList.tabIcon} />
            </Link>
            <Link href="/survey">
              <Text style={bottomsList.tabText}>症狀</Text>
            </Link>
          </View>
        )}
        <View style={bottomsList.tabItem}>
          <Link href="/video">
            <Foundation name="play-video" style={bottomsList.tabIcon} />
          </Link>
          <Link href="/video">
            <Text style={bottomsList.tabText}>影片</Text>
          </Link>
        </View>
        <View style={bottomsList.tabItem}>
          <Link href="/psa">
            <MaterialCommunityIcons name="file-chart-outline" size={24} style={bottomsList.tabIcon} />
          </Link>
          <Link href="/psa">
            <Text style={bottomsList.tabText}>PSA</Text>
          </Link>
        </View>
        <View style={bottomsList.tabItem}>
          <Link href="/document">
            <MaterialCommunityIcons
              name="file-document-multiple-outline"
              style={bottomsList.tabIcon}
            />
          </Link>
          <Link href="/document">
            <Text style={bottomsList.tabText}>手冊</Text>
          </Link>
        </View>
        <View style={bottomsList.tabItem}>
          <MaterialIcons onPress={() => setShowModal(true)} name="logout" style={bottomsList.tabIcon} />
          <TouchableOpacity onPress={() => setShowModal(true)}>
            <Text style={bottomsList.tabText}>登出</Text>
          </TouchableOpacity>
        </View>
        <Modal visible={showModal} transparent onRequestClose={() => setShowModal(false)}>
          <View style={modal.modalContainer}>
            <View style={modal.modalContent}>
              <Text style={modal.modalTitle}>確定登出？</Text>
              <View style={modal.buttonContainer}>
                <TouchableOpacity onPress={handleSignOut} style={modal.button}>
                  <Text>確定</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setShowModal(false)} style={modal.button}>
                  <Text>取消</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  topSafeview: {
    flex: 0,
    backgroundColor: appTheme.primary,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  container: {
    flex: 0,
    backgroundColor: appTheme.primary,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 170 : 75,
  },
  questionText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#663300',
    paddingTop: 20,
    paddingBottom: 10,
  },
  questionSubText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#663300',
    paddingVertical: 10,
  },
  optionsContainer: {
    flex: 1,
    flexDirection: 'row',
    marginBottom: 10,
  },
  optionButton: {
    flex: 1,
    padding: 10,
    backgroundColor: '#ddd',
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'space-evenly',
  },
  optionLeft: {
    marginRight: 5,
  },
  optionRight: {
    marginLeft: 5,
  },
  selectedOption: {
    backgroundColor: '#ff7043',
  },
  optionText: {
    fontSize: 20,
    color: '#fff',
  },
  severityContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  severityButton: {
    padding: 10,
    backgroundColor: '#ddd',
    borderRadius: 5,
  },
  selectedSeverity: {
    backgroundColor: '#28A745',
  },
  severityText: {
    fontSize: 18,
    color: '#fff',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderColor: '#000',
    paddingVertical: 10,
  },
  input: {
    width: '100%',
    paddingVertical: 8,
    paddingHorizontal: 12,
    fontSize: 24,
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#d1d1d6',
    borderRadius: 8,
  },
  submitButton: {
    padding: 15,
    backgroundColor: '#007BFF',
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 20,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  datePickerContainer: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  datePickerLabel: {
    fontSize: 25,
    color: '#000',
  },
});

const modal = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    width: '80%',
    height: 150,
    justifyContent: 'space-around',
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 20,
  },
  modalTitle: {
    fontSize: 20,
    color: '#000',
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  button: {
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderColor: 'gray',
    borderRadius: 5,
    backgroundColor: '#fff',
    marginHorizontal: 10,
  },
});

const bottomsList = StyleSheet.create({
  bottomSafeview: {
    backgroundColor: appTheme.background,
  },
  container: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.3)',
    paddingVertical: 5,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabText: {
    fontSize: 14,
    color: 'black',
  },
  tabIcon: {
    fontSize: 34,
    color: '#303030',
  },
});

export default SurveyScreen;
