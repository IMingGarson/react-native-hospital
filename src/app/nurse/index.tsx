 
 import React, { useEffect, useState } from 'react';
import { Alert, GestureResponderEvent, View, Text, TextInput, Modal, TouchableOpacity, FlatList, StyleSheet, Animated } from "react-native";
import { AsyncStorageGetItem } from '../utils';
import BottomTabs from '../bottomTabs';
import { useRouter } from 'expo-router';

interface Document {
  title: string;
  content: string;
  duration: number;
}

interface Video {
  id: string;
  title: string;
  uri: string;
  watched: boolean;
  timestamp: number;
  duration: number;
}

interface Survey {
  symptom: string;
  hasSymptom: boolean;
  severity: number;
  customSymptom: string | null;
}

interface PatientProgressionData {
  id: number,
  name: string,
  video: Video[],
  survey: Survey[],
  document: Document[]
}

type AccordionProps = {
  item: PatientProgressionData,
  onNotify: (event: GestureResponderEvent) => void
}

export default function NurseScreen() {
  const [modalVisible, setModalVisible] = useState(false);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [patientData, setPatientData] = useState<PatientProgressionData[]>([]);
  const [currentRole, setCurrentRole] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const router = useRouter();

  function isJsonString(data: string | null) {
    if (!data) {
      return false;
    }
    try {
        JSON.parse(data);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (e: unknown) {
      // console.error("isJsonString", e);
      return false;
    }
    return true;
  }

  const fetchPatientData = async () => {
    try {
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
      const response = await fetch('http://10.0.2.2:5000/api/patient', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (response.ok) {
        const patients = data.patients.map((d: { id: string; name: string; document_progression_data: string; video_progression_data: string; survey_data: string; }) => {
          return {
            id: d.id,
            name: d.name,
            document: isJsonString(d.document_progression_data) ? JSON.parse(d.document_progression_data) : [],
            video: isJsonString(d.video_progression_data) ? JSON.parse(d.video_progression_data) : [],
            survey: isJsonString(d.survey_data) ? JSON.parse(d.survey_data) : [],
          }
        });
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
  }

  useEffect(() => {
    fetchPatientData();
  }, []);

  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()';
    let generatedPassword = '';
    for (let i = 0; i < 6; i++) {
      generatedPassword += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(generatedPassword);
  };

  const handleSubmit = async () => {
    if (!email && !name) {
      Alert.alert('錯誤', '必須提供 Email 或名稱');
      return;
    }
    if (!password) {
      Alert.alert('錯誤', '請輸入密碼');
      return;
    }
    try {
      const response = await fetch('http://10.0.2.2:5000/api/patient', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          name,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        Alert.alert('成功', '資料建立完成');
      } else {
        Alert.alert('失敗', data.message);
      }
    } catch (error) {
      Alert.alert('錯誤', '無法連接伺服器，請稍後再試');
      console.error(error);
    } finally {
      setModalVisible(false);
      setEmail('');
      setName('');
      setPassword('');
    }
  };

  const ListItemAccordion = ({ item, onNotify }: AccordionProps) => {
    const [isExpanded, setIsExpanded] = useState(false);

    const toggleExpand = () => {
        if (isExpanded) {
            setIsExpanded(false)
        } else {
            setIsExpanded(true);
        }
    };

    const severity = (text: string) => {
      switch (text) {
        case '0':
          return '無';
        case '1':
          return '小'
        case '2':
          return '中'
        default:
          return '大';
      }
    }

    const timeStamp = (time: number) => {
      const minutes = ~~(time / 60);
      const seconds = ~~(time % 60);
      const minuteString = minutes.toString();
      let secondString = seconds.toString();
      if (seconds < 10) {
        secondString = "0" + seconds.toString();
      }
      return `${minuteString} 分 ${secondString} 秒`;
    }
      
    return (
        <View style={styles.item}>
          <TouchableOpacity activeOpacity={1} onPress={toggleExpand} style={styles.header}>
              <Text style={styles.name}>{`ID: ${item.id}`}</Text>
              <Text style={styles.name}>{`姓名: ${item.name}`}</Text>
          </TouchableOpacity>
          <Animated.View
              style={[styles.content, {'display': isExpanded ? 'flex' : 'none'}]}
              pointerEvents='auto'
          >
            <View style={styles.hiddenContent}>
              <Text style={styles.progressTitle}>🎥 影片進度：</Text>
              { item.video.map((v: Video, idx: number) => {
                  return (
                    <View key={idx.toString()}>
                      <Text key={idx} style={styles.progress}>
                        {`${idx + 1}. ${v.title}，累積觀看時間 ${timeStamp(v.duration)}`}
                      </Text>
                      <TouchableOpacity
                        style={styles.notifyButton}
                        onPress={onNotify}
                      >
                        <Text style={styles.notifyText}>通知病人觀看影片</Text>
                      </TouchableOpacity>
                    </View>
                  )
              })}
              <Text style={styles.progressTitle}>📄 文件進度：</Text>
              { item.document.map((d: Document, idx: number) => {
                return (
                  <View key={idx} >
                    <Text style={styles.progress}>
                      {`${idx + 1}. ${d.title}，累積閱讀時間 ${timeStamp(d.duration)}`}
                    </Text>
                    <TouchableOpacity
                      style={styles.notifyButton}
                      onPress={onNotify}
                    >
                      <Text style={styles.notifyText}>通知病人閱讀文件</Text>
                    </TouchableOpacity>
                  </View>
                )
              })}
              <Text style={styles.progressTitle}>📋 病人狀況：</Text>
              { item.survey.map((s: Survey, idx: number) => {
                if (s.hasSymptom) {
                  if (s.symptom === '其他' && s.customSymptom) {
                    return (
                      <View key={idx} style={styles.progress}>
                        <View style={styles.tagContainer}>
                          <Text style={styles.symptomText}>{`${idx + 1}. ${s.customSymptom}`}</Text>
                          <View style={[styles.tag, styles.warning]}>
                            <Text style={styles.tagText}>有症狀</Text>
                          </View>
                          <Text style={styles.severityText}>嚴重程度：{severity(s.severity.toString())}</Text>
                        </View>
                      </View>
                    )
                  }
                  return (
                    <View key={idx} style={styles.progress}>
                      <View style={styles.tagContainer}>
                        <Text style={styles.symptomText}>{`${idx + 1}. ${s.symptom}`}</Text>
                        <View style={[styles.tag, styles.warning]}>
                          <Text style={styles.tagText}>有症狀</Text>
                        </View>
                        <Text style={styles.severityText}>嚴重程度：{severity(s.severity.toString())}</Text>
                      </View>
                    </View>
                  )
                } else {
                  if (s.symptom === '其他' && s.customSymptom) {
                    return (
                      <View key={idx} style={styles.progress}>
                        <View style={styles.tagContainer}>
                          <Text style={styles.symptomText}>{`${idx + 1}. ${s.customSymptom}`}</Text>
                          <View style={[styles.tag, styles.warning]}>
                            <Text style={styles.tagText}>有症狀</Text>
                          </View>
                          <Text style={styles.severityText}>嚴重程度：{severity(s.severity.toString())}</Text>
                        </View>
                      </View>
                    )
                  }
                  return (
                    <View key={idx} style={styles.progress}>
                      <View style={styles.tagContainer}>
                        <Text style={styles.symptomText}>{`${idx + 1}. ${s.symptom}`}</Text>
                        <View style={[styles.tag, styles.normal]}>
                          <Text style={styles.tagText}>無症狀</Text>
                        </View>
                        <Text style={styles.severityText}>{''}</Text>
                      </View>
                    </View>
                  )
                }
              })}
              <TouchableOpacity
                style={styles.notifyButton}
                onPress={onNotify}
              >
                  <Text style={styles.notifyText}>通知病人觀看影片或文件</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
    );
  };
  
  // TODO: notify patient
  const notifyPatient = async (patient: PatientProgressionData) => {
    console.log(patient);
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
      <TouchableOpacity
        style={styles.floatingButton}
        onPress={() => setModalVisible(true)}
      >
        <Text style={styles.floatingButtonText}>{'+'}</Text>
      </TouchableOpacity>
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>新增資料</Text>
            <TextInput
              style={styles.input}
              placeholder="Email"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
            <TextInput
              style={styles.input}
              placeholder="名稱"
              value={name}
              onChangeText={setName}
            />
            <TextInput
              style={styles.input}
              placeholder="密碼"
              value={password}
              onChangeText={setPassword}
            />
            <TouchableOpacity
              style={styles.generateButton}
              onPress={generatePassword}
            >
              <Text style={styles.generateButtonText}>自動產生密碼</Text>
            </TouchableOpacity>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.submitButton}
                onPress={handleSubmit}
              >
                <Text style={styles.buttonText}>送出</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.buttonText}>取消</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      <FlatList
        style={{ paddingVertical: 12, paddingHorizontal: 16 }}
        data={patientData}
        keyExtractor={(_, index) => index.toString()}
        renderItem={({ item }) => (
          <ListItemAccordion
            item={item}
            onNotify={() => notifyPatient(item)}
          />
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
      <BottomTabs role={currentRole} />
    </View>
  );
}

const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#fff6e5',
      paddingTop: 16,
    },
    floatingButton: {
      position: 'absolute',
      right: 20,
      bottom: 80,
      backgroundColor: '#fff',
      width: 60,
      height: 60,
      borderRadius: 30,
      justifyContent: 'center',
      alignItems: 'center',
      elevation: 5,
      zIndex: 999,
    },
    floatingButtonText: {
      color: '#000',
      fontSize: 30,
      fontWeight: 'bold',
    },
    item: {
      backgroundColor: '#fff6e5',
      borderRadius: 12,
      shadowColor: '#452b01',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.5,
      shadowRadius: 4,
      elevation: 3,
      overflow: 'hidden',
    },
    header: {
      padding: 16,
      backgroundColor: '#ffa726',
      borderTopLeftRadius: 12,
      borderTopRightRadius: 12,
    },
    name: {
      fontSize: 18,
      fontWeight: '600',
      color: '#005',
      fontFamily: 'System',
    },
    content: {
      backgroundColor: '#fff9f0',
      overflow: 'hidden',
    },
    hiddenContent: {
      padding: 16,
    },
    progressTitle: {
      fontSize: 20,
      color: '#663300',
      fontWeight: 'bold',
      fontFamily: 'System',
      marginVertical: 10,
    },
    progress: {
      fontSize: 18,
      color: '#663300',
      fontFamily: 'System',
      marginVertical: 8,
      // marginBottom: 18,
    },
    notifyButton: {
      padding: 12,
      backgroundColor: '#ff7043',
      borderRadius: 8,
      alignItems: 'center',
    },
    notifyText: {
      fontSize: 16,
      color: '#ffffff',
      fontWeight: '600',
    },
    separator: {
      height: 8,
    },
    modalContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContent: {
      width: '90%',
      backgroundColor: '#fff',
      borderRadius: 10,
      padding: 20,
      elevation: 10,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      marginBottom: 20,
      textAlign: 'center',
    },
    input: {
      backgroundColor: '#f1f1f1',
      padding: 15,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: '#ddd',
      marginBottom: 15,
    },
    generateButton: {
      backgroundColor: '#28A745',
      padding: 10,
      borderRadius: 8,
      alignItems: 'center',
      marginBottom: 20,
    },
    generateButtonText: {
      color: '#fff',
      fontSize: 16,
    },
    modalButtons: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    submitButton: {
      backgroundColor: '#007BFF',
      padding: 15,
      borderRadius: 8,
      flex: 1,
      marginRight: 10,
      alignItems: 'center',
    },
    cancelButton: {
      backgroundColor: '#DC3545',
      padding: 15,
      borderRadius: 8,
      flex: 1,
      marginLeft: 10,
      alignItems: 'center',
    },
    buttonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: 'bold',
    },
    tagContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    symptomText: {
      width: '30%',
      fontSize: 18,
      color: '#663300',
      fontFamily: 'System',
      paddingVertical: 2,
    },
    tagText: {
      fontSize: 18,
      color: '#fff',
    },
    severityText: {
      width: '33%',
      fontSize: 18,
      color: '#000',
    },
    tag: {
      borderRadius: 5,
      paddingVertical: 2,
      paddingHorizontal: 16,
      fontSize: 18,
      height: 30,
    },
    warning: {
      backgroundColor: '#dc0530',
      color: '#fff'
    },
    normal: {
      backgroundColor: '#2775c3',
      color: '#fff'
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
});