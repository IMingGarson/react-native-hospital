/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useCallback, useEffect, useState } from 'react'
import { Alert, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, ActivityIndicator } from 'react-native'
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context'
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker'
import { Link, useRouter } from 'expo-router'
import { MaterialCommunityIcons, FontAwesome, Foundation, MaterialIcons } from '@expo/vector-icons'
import { Survey } from '../interfaces'
import { AsyncStorageGetItem, AsyncStorageRemoveItem, isJsonString } from '../utils'
// import Constants from 'expo-constants'
// import * as Device from 'expo-device'
// import * as Notifications from 'expo-notifications
// import registerNNPushToken ,{ registerIndieID } from 'native-notify';

const symptoms = ['尿失禁', '頻尿', '腹瀉', '便祕', '疲憊', '情緒低落', '緊張', '缺乏活力', '熱潮紅', '其他']
const PRIMARY = '#6366F1'
const SURFACE = '#fff'
const CARD_BG = '#fff'
const BORDER = '#d1d7dd'
const TEXT = '#1f2d3a'
const MUTED = '#6b7280'
const TEXT_SECONDARY = '#33475b'
const BG = '#f0f5f9'

interface PastSurvey {
  [key: string]: Survey[]
}

interface Styles {
  [key: string]: string | number
}

interface BottomTabsProps {
  role: string
  customedStyle?: Styles
}

/** 自訂 hook：處理 push notifications 的註冊與監聽 */
// const usePushNotifications = (): { expoPushToken: string; deepLink: string } => {
//   const [expoPushToken, setExpoPushToken] = useState<string>('')
//   const [deepLink, setDeepLink] = useState<string>('')
//   const notificationListener = useRef<Notifications.EventSubscription | null>(null)
//   const responseListener = useRef<Notifications.EventSubscription | null>(null)

//   const registerForPushNotificationsAsync = useCallback(async (): Promise<string> => {
//     if (Platform.OS === 'android') {
//       await Notifications.setNotificationChannelAsync('allgood-project', {
//         name: 'allgood-project',
//         importance: Notifications.AndroidImportance.MAX,
//         vibrationPattern: [0, 250, 250, 250],
//         lightColor: '#FF231F7C'
//       })
//     }

//     if (Device.isDevice) {
//       const { status: existingStatus } = await Notifications.getPermissionsAsync()
//       let finalStatus = existingStatus
//       if (existingStatus !== 'granted') {
//         const { status } = await Notifications.requestPermissionsAsync()
//         finalStatus = status
//       }
//       if (finalStatus !== 'granted') {
//         Alert.alert('Error', 'Failed to get push token for push notification!')
//         return ''
//       }
//       try {
//         const projectId = Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId
//         if (!projectId) {
//           throw new Error('Project ID not found')
//         }
//         // const tokenResponse = await Notifications.getExpoPushTokenAsync({ projectId });
//         const tokenResponse = await Notifications.getDevicePushTokenAsync()
//         return tokenResponse.data
//       } catch (error) {
//         return String(error)
//       }
//     } else {
//       Alert.alert('Error', 'Must use physical device for Push Notifications')
//       return ''
//     }
//   }, [])

//   useEffect(() => {
//     registerForPushNotificationsAsync().then((token) => {
//       if (token) setExpoPushToken(token)
//     })

//     notificationListener.current = Notifications.addNotificationReceivedListener((notification) => {
//       console.log('Notification Received:', notification.request.content)
//     })

//     responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
//       console.log('Notification Response:', response.notification.request.content)
//       Notifications.dismissAllNotificationsAsync()
//       const url = response.notification.request.content.data?._page
//       if (url) {
//         switch (url) {
//           case 'video':
//           case 'document':
//             setDeepLink(url)
//             break
//           default:
//             break
//         }
//       }
//     })

//     return () => {
//       if (notificationListener.current) {
//         Notifications.removeNotificationSubscription(notificationListener.current)
//       }
//       if (responseListener.current) {
//         Notifications.removeNotificationSubscription(responseListener.current)
//       }
//     }
//   }, [registerForPushNotificationsAsync])

//   return { expoPushToken, deepLink }
// }

const SurveyScreen: React.FC = () => {
  // registerNNPushToken(28399, "UWdYG1804clZ7YhxKB1yMd");
  // const { expoPushToken, deepLink } = usePushNotifications()
  const router = useRouter()
  const [answers, setAnswers] = useState<Survey[]>(() =>
    symptoms.map((symptom) => ({
      symptom,
      hasSymptom: false,
      severity: 0,
      customSymptom: symptom === '其他' ? '' : null
    }))
  )
  const [date, setDate] = useState<Date>(new Date())
  const [showDate, setShowDate] = useState<boolean>(false)
  const [pastSurvey, setPastSurvey] = useState<PastSurvey>({})
  const [submitting, setSubmitting] = useState(false)

  // 根據 deep link 做頁面跳轉
  // useEffect(() => {
  //   if (deepLink === 'video' || deepLink === 'document') {
  //     router.replace(`/${deepLink}`)
  //   }
  // }, [deepLink, router])

  // const updatePushToken = useCallback(async () => {
  //   try {
  //     const token = (await AsyncStorageGetItem('jwt')) as string
  //     const role = (await AsyncStorageGetItem('role')) as string
  //     if (!token || !role || !['M', 'P'].includes(role)) {
  //       Alert.alert('錯誤', '無法取得資料')
  //       router.replace('/login')
  //       return
  //     }
  //     await fetch('https://allgood.peiren.info/api/patient/token', {
  //       method: 'PATCH',
  //       headers: {
  //         'Content-Type': 'application/json',
  //         Authorization: `Bearer ${token}`
  //       },
  //       body: JSON.stringify({ token: expoPushToken })
  //     })
  //   } catch (error) {
  //     Alert.alert('Error', '系統更新錯誤')
  //     console.error('Error updating push token:', error)
  //   }
  // }, [expoPushToken, router])

  // useEffect(() => {
  //   if (expoPushToken) {
  //     updatePushToken()
  //   }
  // }, [expoPushToken, updatePushToken])

  const fetchData = useCallback(async () => {
    try {
      const token = (await AsyncStorageGetItem('jwt')) as string
      const role = (await AsyncStorageGetItem('role')) as string
      if (!token || !role || !['M', 'P'].includes(role)) {
        Alert.alert('錯誤', '無法取得資料')
        router.replace('/login')
        return
      }
      const response = await fetch(`https://allgood.peiren.info/api/patient/get`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      })
      const data = await response.json()
      if (response.ok) {
        if (isJsonString(data.patient.survey_data)) {
          setAnswers(JSON.parse(data.patient.survey_data))
        }
        if (data.symptom_data) {
          const newPastSurvey: PastSurvey = {}
          data.symptom_data.forEach((d: any) => {
            if (isJsonString(d.survey_data)) {
              newPastSurvey[d.date] = JSON.parse(d.survey_data)
            }
          })
          setPastSurvey(newPastSurvey)
          const dateKey = date.toISOString().split('T')[0]
          if (dateKey in newPastSurvey) {
            setAnswers(newPastSurvey[dateKey])
          } else {
            setAnswers(
              symptoms.map((symptom) => ({
                symptom,
                hasSymptom: false,
                severity: 0,
                customSymptom: symptom === '其他' ? '' : null
              }))
            )
          }
        }
        // registerIndieID(`PUSH_ID_${data.patient.id}`, 28399, "UWdYG1804clZ7YhxKB1yMd");
      }
    } catch (error) {
      console.error('Error fetching survey data:', error)
    }
  }, [date, router])

  useEffect(() => {
    fetchData()
  }, [])

  const toggleSymptom = useCallback((index: number, hasSymptom: boolean) => {
    setAnswers((prev) => prev.map((answer, idx) => (idx === index ? { ...answer, hasSymptom, severity: hasSymptom ? answer.severity : 0 } : answer)))
  }, [])

  const changeSeverity = useCallback((index: number, severity: number) => {
    setAnswers((prev) => prev.map((answer, idx) => (idx === index ? { ...answer, hasSymptom: true, severity } : answer)))
  }, [])

  const changeCustomSymptom = useCallback((text: string) => {
    setAnswers((prev) => {
      const lastIndex = prev.length - 1
      return prev.map((answer, idx) => (idx === lastIndex ? { ...answer, customSymptom: text } : answer))
    })
  }, [])

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      const token = await AsyncStorageGetItem('jwt')
      if (!token) {
        Alert.alert('錯誤', '無法儲存進度')
        return
      }
      const response = await fetch('https://allgood.peiren.info/api/patient/symptom_survey', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          survey_data: JSON.stringify(answers),
          date: date.toISOString().split('T')[0]
        })
      })
      if (response.ok) {
        await fetchData()
        Alert.alert('成功', '儲存症狀成功')
      }
    } catch (error) {
      Alert.alert('失敗', '儲存進度時發生錯誤')
      console.error('Error submitting survey:', error)
    }
    setSubmitting(false)
  }

  const onDateChange = useCallback(
    (_: DateTimePickerEvent, selectedDate: Date | undefined) => {
      if (selectedDate) {
        const newDate = selectedDate.toISOString().split('T')[0]
        if (newDate in pastSurvey) {
          setAnswers(pastSurvey[newDate])
        } else {
          setAnswers(
            symptoms.map((symptom) => ({
              symptom,
              hasSymptom: false,
              severity: 0,
              customSymptom: symptom === '其他' ? '' : null
            }))
          )
        }
        setDate(selectedDate)
      }
      setShowDate(false)
    },
    [pastSurvey]
  )

  return (
    <SafeAreaProvider>
      <SafeAreaView edges={['top']} style={styles.topSafe}>
        <View style={styles.wrapper}>
          <ScrollView contentContainerStyle={styles.card}>
            {/* Date Picker */}
            {Platform.OS === 'android' ? (
              <Pressable onPress={() => setShowDate(true)} style={styles.inputWrapper}>
                <TextInput style={styles.input} value={date.toISOString().slice(0, 10)} editable={false} />
                <MaterialIcons name="date-range" size={24} color={MUTED} style={styles.inputIcon} />
                {showDate && <DateTimePicker value={date} mode="date" display="spinner" onChange={onDateChange} />}
              </Pressable>
            ) : (
              <View style={styles.inputWrapperIOS}>
                <Text style={styles.label}>選擇日期</Text>
                <DateTimePicker value={date} mode="date" display="default" onChange={onDateChange} />
              </View>
            )}

            {/* Questions */}
            {answers.map((ans, idx) => (
              <View key={idx} style={styles.questionBlock}>
                <Text style={styles.question}>{ans.symptom}</Text>

                {ans.symptom === '其他' ? (
                  <TextInput style={styles.input} placeholder="請輸入症狀" value={ans.customSymptom ?? ''} onChangeText={changeCustomSymptom} />
                ) : (
                  <View style={styles.segment}>
                    <TouchableOpacity style={[styles.segmentBtn, styles.leftBtn, ans.hasSymptom && styles.segmentActive]} onPress={() => toggleSymptom(idx, true)}>
                      <Text style={[styles.segmentText, ans.hasSymptom && styles.segmentTextActive]}>有症狀</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.segmentBtn, styles.rightBtn, !ans.hasSymptom && styles.segmentActive]} onPress={() => toggleSymptom(idx, false)}>
                      <Text style={[styles.segmentText, !ans.hasSymptom && styles.segmentTextActive]}>無症狀</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {(ans.hasSymptom || ans.symptom === '其他') && (
                  <>
                    <Text style={styles.subQuestion}>困擾程度</Text>
                    <View style={styles.severityRow}>
                      {[0, 1, 2, 3].map((s) => (
                        <TouchableOpacity key={s} style={[styles.sevBtn, ans.severity === s && styles.sevActive]} onPress={() => changeSeverity(idx, s)}>
                          <Text style={[styles.sevText, ans.severity === s && styles.sevTextActive]}>{s === 0 ? '無' : s === 1 ? '小' : s === 2 ? '中' : '大'}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </>
                )}
              </View>
            ))}

            <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={submitting}>
              {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>儲存</Text>}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </SafeAreaView>
      <BottomTabs role="P" />
    </SafeAreaProvider>
  )
}

const BottomTabs: React.FC<BottomTabsProps> = ({ role, customedStyle }) => {
  const router = useRouter()
  const [showModal, setShowModal] = useState(false)

  const handleSignOut = async () => {
    await AsyncStorageRemoveItem('token')
    await AsyncStorageRemoveItem('role')
    setShowModal(false)
    Alert.alert('登出成功')
    router.replace('/login')
  }

  return (
    <SafeAreaView edges={['bottom']} style={bottoms.bottomSafeview}>
      <View style={[bottoms.container, customedStyle]}>
        {role === 'M' ? (
          <View>
            <TabItem label="病人列表" icon={<MaterialCommunityIcons name="emoticon-sick-outline" size={24} />} href="/nurse" />
          </View>
        ) : (
          <TabItem label="症狀" icon={<FontAwesome name="pencil-square-o" size={24} />} href="/survey" />
        )}
        <TabItem label="影片" icon={<Foundation name="play-video" size={24} />} href="/video" />
        <TabItem label="PSA" icon={<MaterialCommunityIcons name="file-chart-outline" size={24} />} href="/psa" />
        <TabItem label="手冊" icon={<MaterialCommunityIcons name="file-document-multiple-outline" size={24} />} href="/document" />
        <TouchableOpacity style={bottoms.tab} onPress={() => setShowModal(true)}>
          <MaterialIcons name="logout" size={24} color={TEXT} />
          <Text style={bottoms.tabText}>登出</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={showModal} transparent onRequestClose={() => setShowModal(false)}>
        <View style={modal.overlay}>
          <View style={modal.content}>
            <Text style={modal.title}>確定登出？</Text>
            <View style={modal.actions}>
              <TouchableOpacity style={[modal.btn, modal.primary]} onPress={handleSignOut}>
                <Text style={[modal.btnText, { color: SURFACE }]}>確定</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[modal.btn, modal.secondary]} onPress={() => setShowModal(false)}>
                <Text style={[modal.btnText, { color: TEXT }]}>取消</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

function TabItem({ label, icon, href }: { label: string; icon: React.ReactNode; href: string }) {
  return (
    <View style={bottoms.tabItem}>
      <Link href={href} style={bottoms.tabIcon}>
        {icon}
      </Link>
      <Link href={href} style={bottoms.tab}>
        <Text style={bottoms.tabText}>{label}</Text>
      </Link>
    </View>
  )
}

const styles = StyleSheet.create({
  topSafe: {
    flex: 1,
    backgroundColor: BG
  },
  wrapper: {
    flex: 1,
    backgroundColor: BG
  },
  card: {
    backgroundColor: CARD_BG,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    elevation: 4,
    gap: 16
  },
  inputWrapper: {
    position: 'relative',
    marginBottom: 12
  },
  input: {
    backgroundColor: BG,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    color: TEXT
  },
  inputIcon: {
    position: 'absolute',
    right: 12,
    top: '50%',
    marginTop: -12
  },
  inputWrapperIOS: {
    marginBottom: 12
  },
  label: {
    fontSize: 16,
    color: TEXT,
    marginBottom: 8
  },
  questionBlock: {
    gap: 8
  },
  question: {
    fontSize: 16,
    fontWeight: '600',
    color: TEXT
  },
  segment: {
    flexDirection: 'row',
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: BORDER
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: CARD_BG
  },
  leftBtn: {
    borderRightWidth: 1,
    borderRightColor: BORDER
  },
  rightBtn: {},
  segmentActive: {
    backgroundColor: PRIMARY
  },
  segmentText: {
    color: TEXT_SECONDARY,
    fontWeight: '600'
  },
  segmentTextActive: {
    color: '#fff'
  },
  subQuestion: {
    marginTop: 8,
    fontSize: 14,
    color: TEXT
  },
  severityRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4
  },
  sevBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: 'center',
    backgroundColor: CARD_BG
  },
  sevActive: {
    backgroundColor: PRIMARY,
    borderColor: PRIMARY
  },
  sevText: {
    color: TEXT_SECONDARY,
    fontWeight: '500'
  },
  sevTextActive: {
    color: '#fff'
  },
  submitBtn: {
    marginTop: 24,
    backgroundColor: PRIMARY,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center'
  },
  submitText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  }
})

const modal = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  content: {
    width: '80%',
    backgroundColor: CARD_BG,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: TEXT,
    marginBottom: 16,
    textAlign: 'center'
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  btn: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1
  },
  primary: {
    backgroundColor: PRIMARY,
    borderColor: PRIMARY,
    marginRight: 8
  },
  secondary: {
    backgroundColor: CARD_BG,
    borderColor: MUTED
  },
  btnText: {
    fontSize: 15,
    fontWeight: '600'
  }
})

const bottoms = StyleSheet.create({
  bottomSafeview: { backgroundColor: SURFACE },
  container: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingVertical: 8, borderTopWidth: 1, borderTopColor: BORDER, backgroundColor: SURFACE },
  tab: {
    alignItems: 'center',
    justifyContent: 'center'
  },
  tabItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 5
  },
  tabIcon: {
    display: 'flex',
    fontSize: 34,
    color: '#303030'
  },
  tabText: {
    marginTop: 2,
    fontSize: 12,
    color: TEXT_SECONDARY,
    fontWeight: '500'
  }
})

export default SurveyScreen
