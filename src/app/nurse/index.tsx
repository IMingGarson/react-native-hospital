import AntDesign from '@expo/vector-icons/AntDesign'
import { useRouter } from 'expo-router'
import React, { useEffect, useState } from 'react'
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context'
import BottomTabs from '../bottomTabs'
import { APIPatientProgressionData, APISymptomRecord, PatientProgressionData } from '../interfaces'
import { AsyncStorageGetItem, isJsonString } from '../utils'

const PRIMARY = '#6366F1'
const BG = '#f0f5f9'
const CARD_BG = '#fff'
const BORDER = '#d1d7dd'
const TEXT = '#1f2d3a'
const videosTotalTime = [
  0,
  4 * 60 + 17,
  16 * 60 + 44,
  11 * 60 + 17,
  23 * 60 * 29,
  18 * 60 + 27,
  11 * 60 + 34,
  14 * 60 + 40,
  7 * 60 + 25,
  6 * 60 + 52,
  3 * 60 + 52,
]

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
    ; (async () => {
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
          birthday: d.birthday ? toMinguoDate(d.birthday) : '未提供生日',
          is_active: d.deleted_at ? false : true
        }))
        setPatientData(patients)
      } catch (e) {
        Alert.alert('錯誤', '無法取得資料')
        router.replace('/login')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const toggleExpand = (id: number) => {
    setExpandedId(expandedId === String(id) ? null : String(id))
  }

  const videoTotalTime = (id: number, sec: number) => {
    return videosTotalTime[id] <= sec ? `觀看完畢` : timeStamp(sec)
  }

  const timeStamp = (sec: number) => `${Math.floor(sec / 60)}分${String(sec % 60).padStart(2, '0')}秒`

  const deletePatient = async (pid: number) => {
    try {
      const token = await AsyncStorageGetItem('jwt')
      if (typeof token !== 'string' || !token) {
        throw new Error()
      }
      const res = await fetch('https://allgood.peiren.info/api/user/delete_patient', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ patient_id: pid }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.message)
      }
      setPatientData(prev =>
        prev.map(p => (p.id === pid ? { ...p, is_active: false } : p))
      )
      Alert.alert('成功', '病患已刪除')
    } catch (e) {
      Alert.alert('錯誤', '刪除失敗')
    }
  }

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
            <Pressable key={p.id} style={[styles.card, !p.is_active && styles.cardInactive]} onPress={() => toggleExpand(p.id)}>
              <View style={styles.row}>
                <Text style={styles.name}>{p.name}</Text>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{p.birthday}</Text>
                </View>
              </View>
              {expandedId === String(p.id) && (
                <View style={styles.section}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={styles.sectionTitle}>影片觀看進度</Text>
                    <Text style={styles.sectionTitle}>已觀看時數</Text>
                  </View>
                  {p.video.length === 0 && <Text style={{ fontSize: 16, color: TEXT, paddingVertical: 12 }}>尚未觀看影片</Text>}
                  {p.video.map((v, i) => (
                    <View key={i} style={styles.detailRow}>
                      <Text style={styles.detailLabel}>{v.title}</Text>
                      <Text style={styles.detailTime}>{videoTotalTime(parseInt(v.id), v.duration)}</Text>
                    </View>
                  ))}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={styles.sectionTitle}>文件閱讀進度</Text>
                    <Text style={styles.sectionTitle}>已閱讀時數</Text>
                  </View>
                  {p.document.length === 0 && <Text style={{ fontSize: 16, color: TEXT, paddingVertical: 12 }}>尚未閱讀文件</Text>}
                  {p.document.map((d, i) => (
                    <View key={i} style={styles.detailRow}>
                      <Text style={styles.detailLabel}>{d.label}</Text>
                      <Text style={styles.detailTime}>{timeStamp(d.duration)}</Text>
                    </View>
                  ))}
                  <Pressable style={styles.viewRecords} onPress={() => router.push(`/records/${p.id}`)}>
                    <Text style={styles.viewText}>查看症狀紀錄</Text>
                    <AntDesign name="rightcircle" size={20} color={TEXT} style={{ marginTop: 2.5 }} />
                  </Pressable>
                  <Pressable
                    style={[
                      styles.deleteBtn,
                      !p.is_active && styles.deleteBtnDisabled
                    ]}
                    onPress={() => deletePatient(p.id)}
                    disabled={!p.is_active}
                  >
                    <Text
                      style={[
                        styles.deleteText,
                        !p.is_active && styles.deleteTextDisabled
                      ]}
                    >
                      {p.is_active ? '刪除病患' : '已刪除'}
                    </Text>
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
  cardInactive: {
    opacity: 0.5
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
    justifyContent: 'space-between',
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
    color: TEXT
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
  deleteBtn: {
    marginTop: 12,
    alignSelf: 'flex-start',
    backgroundColor: '#ef4444',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6
  },
  deleteBtnDisabled: {
    backgroundColor: BORDER
  },
  deleteText: {
    color: CARD_BG,
    fontSize: 14,
    fontWeight: '600'
  },
  deleteTextDisabled: {
    color: TEXT
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: BG
  }
})
