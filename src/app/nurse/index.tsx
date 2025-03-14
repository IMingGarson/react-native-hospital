// import React, { useEffect, useState } from 'react';
// import { Alert, View, Text, TouchableOpacity, StyleSheet, Animated, ScrollView, Platform, StatusBar } from "react-native";
// import { AsyncStorageGetItem, isJsonString } from '../utils';
// import BottomTabs from '../bottomTabs';
// import { useRouter } from 'expo-router';
// import { Document, Video, PatientProgressionData } from '../interfaces';
// import { appTheme } from 'src/config/theme';
// import { SafeAreaView } from 'react-native-safe-area-context';
// import { usePushNotifications, sendPushNotification } from '../utils/usePushNotification';

// type AccordionProps = {
//   item: PatientProgressionData,
// }

// export default function NurseScreen() {
//   const { expoPushToken } = usePushNotifications();
//   const [patientData, setPatientData] = useState<PatientProgressionData[]>([]);
//   const [currentRole, setCurrentRole] = useState<string>("");
//   const [loading, setLoading] = useState<boolean>(true);
//   const router = useRouter();

//   const fetchPatientData = async () => {
//     try {
//       const token = await AsyncStorageGetItem('jwt');
//       const role = await AsyncStorageGetItem('role');
//       if (
//         typeof token === 'string'
//         && typeof role === 'string'
//         && token.length
//         && ['M', 'P'].includes(role)
//       ) {
//         setCurrentRole(role);
//       } else {
//         Alert.alert('錯誤', '無法取得資料');
//         router.replace('/login');
//       }
//       const response = await fetch('https://allgood.peiren.info/api/patient', {
//         method: 'GET',
//         headers: {
//           'Content-Type': 'application/json',
//           'Authorization': `Bearer ${token}`,
//         },
//       });
//       const data = await response.json();
//       if (response.ok) {
//         const patients = data.patients.map((d: { id: string; name: string; document_progression_data: string; video_progression_data: string; survey_data: string; symptom_records: { date: string, survey_data: string }[], push_token: string | null }) => {
//           return {
//             id: d.id,
//             name: d.name,
//             document:isJsonString(d.document_progression_data) ? JSON.parse(d.document_progression_data) : [],
//             video: isJsonString(d.video_progression_data) ? JSON.parse(d.video_progression_data) : [],
//             survey: isJsonString(d.survey_data) ? JSON.parse(d.survey_data) : [],
//             records: d.symptom_records?.map((s: { date: string, survey_data: string }) => {
//              return { 
//                 date: s.date, 
//                 data: isJsonString(s.survey_data) ? JSON.parse(s.survey_data) : []
//               }
//             }),
//             pushToken: d.push_token,
//           }
//         });
//         setPatientData(patients);
//       } else {
//         Alert.alert('失敗', data.message);
//         router.replace('/login');
//       }
//     } catch (error) {
//       Alert.alert('錯誤', '無法連接伺服器，請稍後再試');
//       console.error(error);
//     } finally {
//       setLoading(false);
//     }
//   }

//   useEffect(() => {
//     fetchPatientData();
//   }, []);

//   const notifyPatient = async (pid: string, type: string, targetID: number = 0) => {
//     if (expoPushToken && typeof expoPushToken.data !== 'undefined') {
//       Alert.alert("推播測試", `看到這個Alert表示有call API, TOKEN: ${expoPushToken.data}`);
//       await sendPushNotification(expoPushToken.data);
//     }
//     // try {
//     //   const token = await AsyncStorageGetItem('jwt');
//     //   if (typeof token === 'string' && token.length) {
//     //     const response = await fetch('https://allgood.peiren.info/api/user/notify_patient', {
//     //       method: 'POST',
//     //       headers: {
//     //         'Content-Type': 'application/json',
//     //         'Authorization': `Bearer ${token}`,
//     //       },
//     //       body: JSON.stringify({ pid: pid, target_id: targetID, type: type }),
//     //     });
//     //     const data = await response.json();
//     //     if (response.ok) {
//     //       Alert.alert('通知成功', data.message);
//     //     } else {
//     //       Alert.alert('通知失敗', data.message);
//     //     }
//     //   } else {
//     //     Alert.alert('通知錯誤', '無法取得資料');
//     //     router.replace('/login');
//     //   }
//     // } catch (error) {
//     //   Alert.alert('錯誤', '無法連接伺服器，請稍後再試');
//     //   console.error(error);
//     // }
//   };

//   const ListItemAccordion = ({ item }: AccordionProps) => {
//     const [isExpanded, setIsExpanded] = useState(false);

//     const toggleExpand = () => {
//         if (isExpanded) {
//             setIsExpanded(false)
//         } else {
//             setIsExpanded(true);
//         }
//     };

//     const timeStamp = (time: number) => {
//       const minutes = ~~(time / 60);
//       const seconds = ~~(time % 60);
//       const minuteString = minutes.toString();
//       let secondString = seconds.toString();
//       if (seconds < 10) {
//         secondString = "0" + seconds.toString();
//       }
//       return `${minuteString} 分 ${secondString} 秒`;
//     }

//     return (
//         <View style={styles.item} >
//           <TouchableOpacity 
//             activeOpacity={1} 
//             onPress={toggleExpand}
//             style={styles.header}
//           >
//             <Text style={styles.name}>{`ID: ${item.id}`}</Text>
//             <Text style={styles.name}>{`姓名: ${item.name}`}</Text>
//             <Text style={styles.name}>{`Token: ${item?.pushToken || "None"} (測試用, 未來會移除)`}</Text>
//           </TouchableOpacity>
//           <Animated.View
//             onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); }} 
//             style={[styles.content, {'display': isExpanded ? 'flex' : 'none'}]}
//             pointerEvents='auto'
//           >
//             <View style={styles.hiddenContent}>
//               <TouchableOpacity
//                 style={styles.notifyButton}
//                 onPress={() => notifyPatient(item.id.toString(), 'all')}
//               >
//                 <Text style={styles.notifyText}>通知病人觀看影片或文件</Text>
//               </TouchableOpacity>
//               <Text style={styles.progressTitle}>🎥 影片進度</Text>
//               { item.video.map((v: Video, idx: number) => {
//                   return (
//                     <View key={idx.toString()}>
//                       <Text style={styles.progress}>
//                         {`${idx + 1}. ${v.title}`}
//                       </Text>
//                       <Text style={styles.progress}>
//                         {`累積閱讀時間 ${timeStamp(v.duration)}`}
//                       </Text>
//                       <TouchableOpacity
//                         style={styles.notifyButton}
//                         onPress={() => notifyPatient(item.id.toString(), 'video', idx + 1)}
//                       >
//                         <Text style={styles.notifyText}>通知病人觀看影片</Text>
//                       </TouchableOpacity>
//                     </View>
//                   )
//               })}
//               <Text style={styles.progressTitle}>📄 文件進度</Text>
//               { item.document.map((d: Document, idx: number) => {
//                 return (
//                   <View key={idx} >
//                     <Text style={styles.progress}>
//                       {`${idx + 1}. ${d.label}`}
//                     </Text>
//                     <Text style={styles.progress}>
//                       {`累積閱讀時間 ${timeStamp(d.duration)}`}
//                     </Text>
//                     <TouchableOpacity
//                       style={styles.notifyButton}
//                       onPress={() => notifyPatient(item.id.toString(), 'document', idx + 1)}
//                     >
//                       <Text style={styles.notifyText}>通知病人閱讀文件</Text>
//                     </TouchableOpacity>
//                   </View>
//                 )
//               })}
//               <Text style={styles.progressTitle}>
//                 📋 病人狀況 {'  '}
//                 <Text style={styles.more} onPress={() => { router.push({ pathname: `/records/${item.id}` }); }}>
//                   查看資料
//                 </Text>
//               </Text>
//             </View>
//           </Animated.View>
//         </View>
//     );
//   };

//   if (loading) {
//     return (
//       <View style={styles.loadingContainer}>
//         <Text style={styles.loadingText}>取得資料中</Text>
//       </View>
//     );
//   }
//   return (
//     <>
//       <View style={styles.container}>
//         <SafeAreaView edges={['top', 'left', 'right']} style={styles.topSafeview}>
//           <ScrollView>
//             { patientData.length && patientData.map((p: PatientProgressionData, idx: number) => {
//               return (
//                 <View key={idx.toString()}  style={{ paddingVertical: 5, paddingHorizontal: 8 }}>
//                   <ListItemAccordion
//                     item={p} 
//                   />
//                 </View>
//               )
//             })}
//           </ScrollView>
//         </SafeAreaView>
//       </View>
//       <BottomTabs role={currentRole} />
//     </>
//   );
// }

// const styles = StyleSheet.create({
//   topSafeview: { 
//     flex: 0, 
//     backgroundColor: appTheme.primary,
//     paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
//   },
//   container: {
//     flex: 1,
//     backgroundColor: appTheme.primary,
//   },
//   floatingButton: {
//     position: 'absolute',
//     right: 20,
//     bottom: 80,
//     backgroundColor: '#fff',
//     width: 60,
//     height: 60,
//     borderRadius: 30,
//     justifyContent: 'center',
//     alignItems: 'center',
//     elevation: 5,
//     zIndex: 999,
//   },
//   floatingButtonText: {
//     color: '#000',
//     fontSize: 30,
//     fontWeight: 'bold',
//   },
//   item: {
//     backgroundColor: appTheme.background,
//     borderRadius: 12,
//     shadowColor: '#452b01',
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.5,
//     shadowRadius: 4,
//     elevation: 3,
//     overflow: 'hidden',
//   },
//   header: {
//     padding: 16,
//     backgroundColor: '#ffa726',
//     borderTopLeftRadius: 12,
//     borderTopRightRadius: 12,
//   },
//   name: {
//     fontSize: 18,
//     fontWeight: '600',
//     color: '#005',
//     fontFamily: 'System',
//   },
//   content: {
//     backgroundColor: '#fff9f0',
//     overflow: 'hidden',
//   },
//   hiddenContent: {
//     padding: 16,
//   },
//   progressTitle: {
//     fontSize: 20,
//     color: '#663300',
//     fontWeight: 'bold',
//     fontFamily: 'System',
//     marginVertical: 10,
//   },
//   more: {
//     fontSize: 18,
//     fontWeight: 'normal',
//     color: '#dc0530'
//   },
//   progress: {
//     fontSize: 18,
//     color: '#663300',
//     fontFamily: 'System',
//     marginVertical: 8,
//   },
//   notifyButton: {
//     padding: 12,
//     backgroundColor: '#ff7043',
//     borderRadius: 8,
//     alignItems: 'center',
//   },
//   notifyText: {
//     fontSize: 16,
//     color: '#ffffff',
//     fontWeight: '600',
//   },
//   separator: {
//     height: 8,
//   },
//   modalContainer: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//     backgroundColor: 'rgba(0, 0, 0, 0.5)',
//   },
//   modalContent: {
//     width: '90%',
//     backgroundColor: '#fff',
//     borderRadius: 10,
//     padding: 20,
//     elevation: 10,
//   },
//   modalTitle: {
//     fontSize: 20,
//     fontWeight: 'bold',
//     marginBottom: 20,
//     textAlign: 'center',
//   },
//   input: {
//     backgroundColor: '#f1f1f1',
//     padding: 15,
//     borderRadius: 8,
//     borderWidth: 1,
//     borderColor: '#ddd',
//     marginBottom: 15,
//   },
//   generateButton: {
//     backgroundColor: '#28A745',
//     padding: 10,
//     borderRadius: 8,
//     alignItems: 'center',
//     marginBottom: 20,
//   },
//   generateButtonText: {
//     color: '#fff',
//     fontSize: 16,
//   },
//   modalButtons: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//   },
//   submitButton: {
//     backgroundColor: '#007BFF',
//     padding: 15,
//     borderRadius: 8,
//     flex: 1,
//     marginRight: 10,
//     alignItems: 'center',
//   },
//   cancelButton: {
//     backgroundColor: '#DC3545',
//     padding: 15,
//     borderRadius: 8,
//     flex: 1,
//     marginLeft: 10,
//     alignItems: 'center',
//   },
//   buttonText: {
//     color: '#fff',
//     fontSize: 16,
//     fontWeight: 'bold',
//   },
//   tagContainer: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//   },
//   symptomText: {
//     width: '30%',
//     fontSize: 18,
//     color: '#663300',
//     fontFamily: 'System',
//     paddingVertical: 2,
//   },
//   tagText: {
//     fontSize: 18,
//     color: '#fff',
//   },
//   severityText: {
//     width: '33%',
//     fontSize: 18,
//     color: '#000',
//   },
//   tag: {
//     borderRadius: 5,
//     paddingVertical: 2,
//     paddingHorizontal: 16,
//     fontSize: 18,
//     height: 30,
//   },
//   warning: {
//     backgroundColor: '#dc0530',
//     color: '#fff'
//   },
//   normal: {
//     backgroundColor: '#2775c3',
//     color: '#fff'
//   },
//   loadingContainer: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//     backgroundColor: appTheme.primary,
//   },
//   loadingText: {
//     fontSize: 18,
//     color: '#804000',
//   },
// });
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
