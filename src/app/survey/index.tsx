import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  ScrollView,
  Button,
  Platform,
  StatusBar,
  Modal,
} from 'react-native';
import { appTheme } from 'src/config/theme'
import { Survey } from '../interfaces';
import { AsyncStorageGetItem, isJsonString } from '../utils';
import { Link, useRouter } from 'expo-router';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import { AsyncStorageRemoveItem } from "../utils";
import { MaterialCommunityIcons, FontAwesome, Foundation, MaterialIcons } from '@expo/vector-icons';
import { usePushNotifications } from '../utils/usePushNotification';

const symptoms = ["尿失禁", "頻尿", "腹瀉", "便祕", "疲憊", "情緒低落", "緊張", "缺乏活力", "熱潮紅", "其他"];
interface PastSurvey {
  [key: string]: Survey[];
}

interface Styles {
  [key: string]: string | number
}
interface Props {
  role: string,
  customedStyle?: Styles
}

export default function SurveyScreen() {
  const [answers, setAnswers] = useState<Survey[]>(
      symptoms.map((symptom) => ({
          symptom,
          hasSymptom: false,
          severity: 0,
          customSymptom: symptom === "其他" ? "" : null,
      }))
  );
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [showDate, setShowDate] = useState<boolean>(false);
  const [pastSurvey, setPastSurvey] = useState<PastSurvey>({});
  const { expoPushToken } = usePushNotifications();
  const router = useRouter();

  const fetchData = async () => {
    try {
        const token = await AsyncStorageGetItem('jwt');
        const role = await AsyncStorageGetItem('role');
        if (
          !(
            typeof token === 'string'
            && typeof role === 'string'
            && token.length
            && ['M', 'P'].includes(role)
          )
        ) {
          Alert.alert('錯誤', '無法取得資料');
          router.replace('/login');
          return;
        }
        const response = await fetch('https://allgood.peiren.info/api/patient/get', {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            }
        });
    
        const data = await response.json();
        if (response.ok) {
          if (expoPushToken && typeof expoPushToken.data !== 'undefined' && !data.patient.push_token) {
            // update push token
            await fetch('https://allgood.peiren.info/api/patient/token', {
                method: 'PATCH',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ token: expoPushToken.data }),
            });
          }
          if (isJsonString(data.patient.survey_data)) {
            setAnswers(JSON.parse(data.patient.survey_data)); // latest survey data
          }
          if (data.symptom_data) {
            const pastSurvey: PastSurvey = {};
            for (const d of data.symptom_data) {
              if (isJsonString(d.survey_data)) {
                pastSurvey[d.date] = JSON.parse(d.survey_data);
              }
            }
            setPastSurvey(pastSurvey); // all survey data
            if (date in pastSurvey) {
              setAnswers(pastSurvey[date]);
            } else {
              setAnswers(
                symptoms.map((symptom) => ({
                  symptom,
                  hasSymptom: false,
                  severity: 0,
                  customSymptom: symptom === "其他" ? "" : null,
                }))
              );
            }
          }
        }
    } catch (error) {
        console.error('獲取問卷記錄時發生錯誤:', error);
    }
  }
  useEffect(() => { fetchData(); }, []);
  
  const handleToggleSymptom = (index: number, hasSymptom: boolean) => {
    setAnswers((prev) => {
        const updated = [...prev];
        updated[index].hasSymptom = hasSymptom;
        if (!hasSymptom) updated[index].severity = 0;
        return updated;
    });
  };

  const handleSeverityChange = (index: number, severity: number) => {
    setAnswers((prev) => {
      const updated = [...prev];
      updated[index].hasSymptom = true;
      updated[index].severity = severity;
      return updated;
    });
  };

  const handleCustomSymptomChange = (text: string) => {
    setAnswers((prev) => {
      const updated = [...prev];
      updated[updated.length - 1].customSymptom = text;
      return updated;
    });
  };

  const handleSubmit = async () => {
    try {
        const token = await AsyncStorageGetItem('jwt');
        if (!token) {
          Alert.alert('錯誤', '無法儲存進度');
          return;
        }
        const response =  await fetch('https://allgood.peiren.info/api/patient/symptom_survey', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            survey_data: JSON.stringify(answers),
            date: date,
          }),
        });
        if (response.ok) {
          await fetchData();
          Alert.alert('成功', '儲存症狀成功');
        }
    } catch (error) {
        Alert.alert('失敗', '儲存進度時發生錯誤');
        console.error('儲存進度時發生錯誤:', error);
    }
    router.reload();
  };

  const onDateChange = (_: DateTimePickerEvent, selectedDate: Date | undefined) => {
    if (typeof selectedDate !== 'undefined') {
      const d = selectedDate.toISOString().split('T')[0];
      if (d in pastSurvey) {
        setAnswers(pastSurvey[d]);
      } else {
        setAnswers(
          symptoms.map((symptom) => ({
            symptom,
            hasSymptom: false,
            severity: 0,
            customSymptom: symptom === "其他" ? "" : null,
          }))
        );
      }
      setDate(d);
    }
    setShowDate(false);
  };

  const BottomTabs = ({ role, customedStyle }: Props) => {
    const router = useRouter();
    const [showModal, setShowModal] = useState(false);

    const handleSignOut = async () => {
      await AsyncStorageRemoveItem('token');
      await AsyncStorageRemoveItem('role');
      setShowModal(false);
      Alert.alert("登出成功");
      router.replace('/login');
      return;
    }

    return (
      <SafeAreaView
        edges={['bottom']}
        style={[
          bottomsList.bottomSafeview,
          {
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: 'white',
          }
        ]}
      >
        <View style={[bottomsList.container, customedStyle]}>
          { role === 'M' ? (
            <View style={bottomsList.tabItem}>
              <Link href="/nurse">
                <MaterialCommunityIcons name="emoticon-sick-outline" style={bottomsList.tabIcon}/>
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
              <MaterialCommunityIcons name="file-document-multiple-outline" style={bottomsList.tabIcon}/>
            </Link>
            <Link href="/document">
              <Text style={bottomsList.tabText}>手冊</Text>
            </Link>
          </View>
          <View style={bottomsList.tabItem}>
            <MaterialIcons onPress={() => setShowModal(true)} name="logout" style={bottomsList.tabIcon}/>
            <TouchableOpacity onPress={() => setShowModal(true)}>
              <Text style={bottomsList.tabText}>登出</Text>
            </TouchableOpacity>
          </View>
          <Modal
            visible={showModal}
            transparent={true}
            animationType="slide"
            onRequestClose={() => setShowModal(false)}
          >
            <View style={modal.modalContainer}>
              <View style={modal.modalContent}>
                <Text style={modal.modalTitle}>確定登出？</Text>
                <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }}>
                  <TouchableOpacity onPress={() => handleSignOut()} style={modal.button}>
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
    )
  }

  return (
    <SafeAreaProvider>
      <View style={{ flex: 1 }}>
        <SafeAreaView edges={['top']} style={styles.topSafeview}>
        <View style={styles.container}>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            { Platform.OS === 'android' && (
              <>
                { showDate && (
                  <DateTimePicker
                    display='spinner'
                    value={new Date(date)}
                    mode="date"
                    onChange={onDateChange}
                  />
                )}
                <TouchableOpacity onPress={() => setShowDate(true)}>
                  <TextInput
                    readOnly
                    style={styles.input}
                    value={date}
                  />
                </TouchableOpacity>
                <Button onPress={() => setShowDate(true)} title="選擇日期" />
              </>
            )}
            { Platform.OS === 'ios' && (
              <View style={{ 
                display: 'flex',
                flexDirection: 'row', 
                width: '100%', 
                justifyContent: 'space-around',
                alignItems: 'center',
              }}
            >
              <Text style={{ display: 'flex', fontSize: 25, color: '#000' }}>選擇日期 </Text>
              <DateTimePicker
                display='default'
                value={new Date(date)}
                mode="date"
                onChange={onDateChange}
              />
            </View>
            )}
            {answers.map((answer, index) => (
              <View key={index}>
                <Text style={styles.questionText}>{answer.symptom}</Text>
                {answer.symptom === "其他" ? (
                  <TextInput
                    style={styles.input}
                    placeholder="請輸入症狀"
                    value={answer.customSymptom || ""}
                    onChangeText={handleCustomSymptomChange}
                  />
                ) : (
                  <View style={styles.optionsContainer}>
                    <TouchableOpacity
                      style={
                        answer.hasSymptom
                          ? [styles.optionButton, styles.selectedOption, styles.optionLeft]
                          : [styles.optionButton, styles.optionLeft]
                      }
                      onPress={() => handleToggleSymptom(index, true)}
                    >
                      <Text style={styles.optionText}>有症狀</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={
                        !answer.hasSymptom
                          ? [styles.optionButton, styles.selectedOption, styles.optionRight]
                          : [styles.optionButton, styles.optionRight]
                      }
                      onPress={() => handleToggleSymptom(index, false)}
                    >
                      <Text style={styles.optionText}>無症狀</Text>
                    </TouchableOpacity>
                  </View>
                )}
                { answer.hasSymptom && (
                    <Text style={styles.questionSubText}>困擾程度</Text>
                )}
                {(answer.hasSymptom || answer.symptom === "其他") && (
                  <View style={styles.severityContainer}>
                    {[0, 1, 2, 3].map((severity) => (
                      <TouchableOpacity
                        key={severity}
                        style={
                          answer.severity === severity
                            ? [styles.severityButton, styles.selectedSeverity]
                            : styles.severityButton
                        }
                        onPress={() => handleSeverityChange(index, severity)}
                      >
                        <Text style={styles.severityText}>
                          {severity === 0 ? "無" : severity === 1 ? "小" : severity === 2 ? "中" : "大"}
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
        <BottomTabs role={"P"} />
      </View>
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
  topSafeview: { 
    flex: 0, 
    backgroundColor: appTheme.primary,
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
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
    paddingBottom: 0,
  },
  optionsContainer: {
    flex: 1,
    flexDirection: "row",
    marginBottom: 10,
  },
  optionButton: {
    flex: 1,
    padding: 10,
    backgroundColor: "#ddd",
    borderRadius: 5,
    alignItems: "center",
    justifyContent: "space-evenly",
  },
  optionLeft: {
    marginRight: 5,
  },
  optionRight: {
    marginLeft: 5,
  },
  selectedOption: {
    backgroundColor: "#ff7043",
  },
  optionText: {
    fontSize: 20,
    color: "#fff",
  },
  severityContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
  severityButton: {
    padding: 10,
    backgroundColor: "#ddd",
    borderRadius: 5,
  },
  selectedSeverity: {
    backgroundColor: "#28A745",
  },
  severityText: {
    fontSize: 18,
    color: "#fff",
  },
  input: {
    fontSize: 20,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 5,
    padding: 10,
    marginBottom: 10,
  },
  submitButton: {
    padding: 15,
    backgroundColor: "#007BFF",
    borderRadius: 5,
    alignItems: "center",
    marginTop: 20,
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});

const modal = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '80%',
    height: 150,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-around',
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 20,
  },
  modalTitle: {
    fontSize: 20,
    color: '#000',
  },
  button: {
    zIndex: 1,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderColor: 'gray',
    color: '#000',
    borderRadius: 5,
    backgroundColor: '#fff',
    marginHorizontal: 45,
  },
})

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
    borderTopColor: 'rgba(0, 0, 0, 0.3)',
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
