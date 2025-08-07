import React, { useEffect, useState } from 'react'
import AntDesign from '@expo/vector-icons/AntDesign'
// import axios from 'axios'
import { useRouter } from 'expo-router'
import { Alert, Pressable, ScrollView, StyleSheet, Text, View, ActivityIndicator } from 'react-native'
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context'
import BottomTabs from '../bottomTabs'
import { APIPatientProgressionData, APISymptomRecord, PatientProgressionData } from '../interfaces'
import { AsyncStorageGetItem, isJsonString } from '../utils'

const PRIMARY = '#6366F1'
const BG = '#f0f5f9'
const CARD_BG = '#fff'
const BORDER = '#d1d7dd'
const TEXT = '#1f2d3a'
const MUTED = '#6b7280'

export default function NurseScreen() {
  const [patientData, setPatientData] = useState<PatientProgressionData[]>([])
  const [currentRole, setCurrentRole] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const router = useRouter()

  const toMinguoDate = (dateStr: string) => {
    const d = new Date(dateStr)
    const y = d.getFullYear() - 1911
    const m = d.getMonth() + 1
    const day = d.getDate()
    return `民國 ${y} 年 ${m} 月 ${day} 日`
  }

  useEffect(() => {
    ;(async () => {
      try {
        const token = await AsyncStorageGetItem('jwt')
        const role = await AsyncStorageGetItem('role')
        if (typeof token === 'string' && typeof role === 'string' && token && ['M', 'P'].includes(role)) {
          setCurrentRole(role)
        } else {
          throw new Error()
        }
        const res = await fetch('https://allgood.peiren.info/api/patient', {
          headers: { Authorization: `Bearer ${token}` }
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.message)
        const patients = data.patients.map((d: APIPatientProgressionData) => ({
          id: Number(d.id),
          name: d.name,
          document: isJsonString(d.document_progression_data) ? JSON.parse(d.document_progression_data) : [],
          video: isJsonString(d.video_progression_data) ? JSON.parse(d.video_progression_data) : [],
          survey: isJsonString(d.survey_data) ? JSON.parse(d.survey_data) : [],
          records: d.symptom_records?.map((s: APISymptomRecord) => ({
            date: s.date,
            data: isJsonString(s.survey_data) ? JSON.parse(s.survey_data) : []
          })),
          pushToken: d.push_token ?? undefined,
          birthday: d.birthday ? toMinguoDate(d.birthday) : '未提供生日'
        }))
        setPatientData(patients)
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (e) {
        Alert.alert('錯誤', '無法取得資料')
        router.replace('/login')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  // const notifyPatient = async (pid: string, type: string, idx = 0) => {
  //   let body = ''
  //   if (type === 'all') body = '提醒您記得觀看影片與文件喔 😊'
  //   if (type === 'video') body = `提醒您觀看第${idx}部影片 😊`
  //   if (type === 'document') body = `提醒您閱讀第${idx}篇文件 😊`
  //   await axios.post('https://app.nativenotify.com/api/indie/notification', {
  //     subID: `PUSH_ID_${pid}`,
  //     appId: 28399,
  //     appToken: 'UWdYG1804clZ7YhxKB1yMd',
  //     title: '📢 通知',
  //     message: body,
  //     pushData: { _page: type }
  //   })
  //   Alert.alert('通知已發送')
  // }

  const toggleExpand = (id: number) => {
    setExpandedId(expandedId === String(id) ? null : String(id))
  }

  const timeStamp = (sec: number) => `${Math.floor(sec / 60)}分${String(sec % 60).padStart(2, '0')}秒`

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={PRIMARY} />
      </View>
    )
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.page}>
        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          <Text style={styles.header}>病人列表</Text>
          {patientData.map((p: PatientProgressionData) => (
            <Pressable key={p.id} style={styles.card} onPress={() => toggleExpand(p.id)}>
              <View style={styles.row}>
                <Text style={styles.name}>{p.name}</Text>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{p.birthday}</Text>
                </View>
              </View>
              {expandedId === String(p.id) && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>文件進度</Text>
                  {p.document.map((d, i) => (
                    <View key={i} style={styles.detailRow}>
                      <Text style={styles.detailLabel}>{d.label}</Text>
                      <Text style={styles.detailTime}>{timeStamp(d.duration)}</Text>
                      {/* <TouchableOpacity style={styles.notifyBtn} onPress={() => notifyPatient(String(p.id), 'document', i + 1)}>
                        <Text style={styles.notifyText}>通知</Text>
                      </TouchableOpacity> */}
                    </View>
                  ))}
                  <Text style={styles.sectionTitle}>影片進度</Text>
                  {p.video.map((v, i) => (
                    <View key={i} style={styles.detailRow}>
                      <Text style={styles.detailLabel}>{v.title}</Text>
                      <Text style={styles.detailTime}>{timeStamp(v.duration)}</Text>
                      {/* <TouchableOpacity style={styles.notifyBtn} onPress={() => notifyPatient(String(p.id), 'video', i + 1)}>
                        <Text style={styles.notifyText}>通知</Text>
                      </TouchableOpacity> */}
                    </View>
                  ))}
                  <Pressable style={styles.viewRecords} onPress={() => router.push(`/records/${p.id}`)}>
                    <Text style={styles.viewText}>查看症狀紀錄</Text>
                    <AntDesign name="rightcircle" size={20} color={TEXT} style={{ marginTop: 2.5 }} />
                  </Pressable>
                </View>
              )}
            </Pressable>
          ))}
        </ScrollView>
      </SafeAreaView>
      <BottomTabs role={currentRole} />
    </SafeAreaProvider>
  )
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: BG,
    paddingHorizontal: 16,
    paddingVertical: 16
  },
  list: {
    paddingBottom: 32
  },
  header: {
    fontSize: 28,
    fontWeight: '700',
    color: TEXT,
    paddingBottom: 16
  },
  card: {
    backgroundColor: CARD_BG,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  name: {
    fontSize: 20,
    fontWeight: '600',
    color: TEXT
  },
  badge: {
    backgroundColor: PRIMARY,
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
    width: 180,
    alignItems: 'center'
  },
  badgeText: {
    color: CARD_BG,
    fontSize: 14
  },
  section: {
    paddingVertical: 12
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: TEXT,
    paddingTop: 12
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 5,
    borderBottomColor: BORDER,
    borderBottomWidth: 1
  },
  detailLabel: {
    flex: 1,
    fontSize: 16,
    color: TEXT
  },
  detailTime: {
    width: 80,
    textAlign: 'right',
    fontSize: 16,
    color: MUTED
  },
  notifyBtn: {
    marginLeft: 8,
    backgroundColor: PRIMARY,
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 6
  },
  notifyText: {
    color: CARD_BG,
    fontSize: 14
  },
  viewRecords: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 10
  },
  viewText: {
    fontSize: 16,
    color: TEXT,
    marginRight: 6,
    fontWeight: '600'
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: BG
  }
})
