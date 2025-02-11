import React, { useEffect, useState } from 'react';
import { Alert, View, Text, TouchableOpacity, StyleSheet, Animated, ScrollView } from "react-native";
import { AsyncStorageGetItem, AsyncStorageSetItem, isJsonString } from '../utils';
import BottomTabs from '../bottomTabs';
import { useRouter } from 'expo-router';
import { Document, Video, PatientProgressionData } from '../interfaces';

type AccordionProps = {
  item: PatientProgressionData,
}

export default function NurseScreen() {
  const [patientData, setPatientData] = useState<PatientProgressionData[]>([]);
  const [currentRole, setCurrentRole] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const router = useRouter();

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
      const response = await fetch('https://allgood.peiren.info/api/patient', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (response.ok) {
        const patients = data.patients.map((d: { id: string; name: string; document_progression_data: string; video_progression_data: string; survey_data: string; symptom_records: { date: string, survey_data: string }[] }) => {
          return {
            id: d.id,
            name: d.name,
            document:isJsonString(d.document_progression_data) ? JSON.parse(d.document_progression_data) : [],
            video: isJsonString(d.video_progression_data) ? JSON.parse(d.video_progression_data) : [],
            survey: isJsonString(d.survey_data) ? JSON.parse(d.survey_data) : [],
            records: d.symptom_records?.map((s: { date: string, survey_data: string }) => {
             return { 
                date: s.date, 
                data: isJsonString(s.survey_data) ? JSON.parse(s.survey_data) : []
              }
            })
          }
        });
        await AsyncStorageSetItem('patientData', JSON.stringify(patients));
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

  const notifyPatient = async (pid: string, type: string, targetID: number = 0) => {
    try {
      const token = await AsyncStorageGetItem('jwt');
      if (typeof token === 'string' && token.length) {
        const response = await fetch('https://allgood.peiren.info/api/user/notify_patient', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ pid: pid, target_id: targetID, type: type }),
        });
        const data = await response.json();
        if (response.ok) {
          Alert.alert('通知成功', data.message);
        } else {
          Alert.alert('通知失敗', data.message);
        }
      } else {
        Alert.alert('通知錯誤', '無法取得資料');
        router.replace('/login');
      }
    } catch (error) {
      Alert.alert('錯誤', '無法連接伺服器，請稍後再試');
      console.error(error);
    }
  };

  const ListItemAccordion = ({ item }: AccordionProps) => {
    const [isExpanded, setIsExpanded] = useState(false);

    const toggleExpand = () => {
        if (isExpanded) {
            setIsExpanded(false)
        } else {
            setIsExpanded(true);
        }
    };

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
        <View style={styles.item} >
          <TouchableOpacity 
            activeOpacity={1} 
            onPress={toggleExpand}
            style={styles.header}
          >
            <Text style={styles.name}>{`ID: ${item.id}`}</Text>
            <Text style={styles.name}>{`姓名: ${item.name}`}</Text>
          </TouchableOpacity>
          <Animated.View
            onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); }} 
            style={[styles.content, {'display': isExpanded ? 'flex' : 'none'}]}
            pointerEvents='auto'
          >
            <View style={styles.hiddenContent}>
              <TouchableOpacity
                style={styles.notifyButton}
                onPress={() => notifyPatient(item.id.toString(), 'all')}
              >
                <Text style={styles.notifyText}>通知病人觀看影片或文件</Text>
              </TouchableOpacity>
              <Text style={styles.progressTitle}>🎥 影片進度</Text>
              { item.video.map((v: Video, idx: number) => {
                  return (
                    <View key={idx.toString()}>
                      <Text style={styles.progress}>
                        {`${idx + 1}. ${v.title}`}
                      </Text>
                      <Text style={styles.progress}>
                        {`累積閱讀時間 ${timeStamp(v.duration)}`}
                      </Text>
                      <TouchableOpacity
                        style={styles.notifyButton}
                        onPress={() => notifyPatient(item.id.toString(), 'video', idx + 1)}
                      >
                        <Text style={styles.notifyText}>通知病人觀看影片</Text>
                      </TouchableOpacity>
                    </View>
                  )
              })}
              <Text style={styles.progressTitle}>📄 文件進度</Text>
              { item.document.map((d: Document, idx: number) => {
                return (
                  <View key={idx} >
                    <Text style={styles.progress}>
                      {`${idx + 1}. ${d.label}`}
                    </Text>
                    <Text style={styles.progress}>
                      {`累積閱讀時間 ${timeStamp(d.duration)}`}
                    </Text>
                    <TouchableOpacity
                      style={styles.notifyButton}
                      onPress={() => notifyPatient(item.id.toString(), 'document', idx + 1)}
                    >
                      <Text style={styles.notifyText}>通知病人閱讀文件</Text>
                    </TouchableOpacity>
                  </View>
                )
              })}
              <Text style={styles.progressTitle}>
                📋 病人狀況 {'  '}
                <Text style={styles.more} onPress={() => { router.push({ pathname: `/records/${item.id}` }); }}>
                  查看資料
                </Text>
              </Text>
            </View>
          </Animated.View>
        </View>
    );
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
      <ScrollView>
        { patientData.length && patientData.map((p: PatientProgressionData, idx: number) => {
          return (
            <View key={idx.toString()}  style={{ paddingVertical: 5, paddingHorizontal: 8 }}>
              <ListItemAccordion
                item={p} 
              />
            </View>
          )
        })}
      </ScrollView>
      <BottomTabs role={currentRole} />
    </View>
  );
}

const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#fff6e5',
      paddingTop: 45,
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
    more: {
      fontSize: 18,
      fontWeight: 'normal',
      color: '#dc0530'
    },
    progress: {
      fontSize: 18,
      color: '#663300',
      fontFamily: 'System',
      marginVertical: 8,
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