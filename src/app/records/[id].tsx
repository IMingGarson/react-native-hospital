/* eslint-disable @typescript-eslint/no-explicit-any */
import { MaterialIcons } from '@expo/vector-icons'
import Ionicons from '@expo/vector-icons/Ionicons'
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker'
import { useLocalSearchParams, useRouter } from 'expo-router'
import React, { useCallback, useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView, // CHANGED: 讓它包在整頁
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native'
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context'
import { PatientProgressionData, Survey } from '../interfaces'
import { AsyncStorageGetItem, isJsonString } from '../utils'

const BG = '#f0f5f9'
const CARD_BG = '#fff'
const BORDER = '#d1d7dd'
const TEXT = '#1f2d3a'
const MUTED = '#6b7280'
const PRIMARY = '#6366F1'
const TEXT_SECONDARY = '#33475b'
const symptoms = ['尿失禁', '頻尿', '腹瀉', '便祕', '疲憊', '情緒低落', '緊張', '缺乏活力', '熱潮紅', '其他']

export default function SurveyRecordScreen() {
  const { id: PATH_ID } = useLocalSearchParams()
  const router = useRouter()
  const [selectedPatient, setSelectedPatient] = useState<PatientProgressionData>()
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [showDate, setShowDate] = useState<boolean>(false)
  const [name, setName] = useState<string>('')

  const [answers, setAnswers] = useState<Survey[]>(() =>
    symptoms.map((symptom) => ({
      symptom,
      hasSymptom: false,
      severity: 0,
      customSymptom: symptom === '其他' ? '' : null
    }))
  )
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(true) // ADDED: 初次載入 loading 狀態

  useEffect(() => {
    fetchPatientData()
  }, [])

  useEffect(() => {
    const rec = selectedPatient?.records?.find((r) => r.date === date)
    if (rec?.data?.length) {
      setAnswers(rec.data)
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
  }, [selectedPatient, date])

  const fetchPatientData = async () => {
    try {
      setLoading(true) // CHANGED: 進入 loading
      const id = Array.isArray(PATH_ID) ? PATH_ID[0] : PATH_ID
      const token = await AsyncStorageGetItem('jwt')
      const res = await fetch('https://allgood.peiren.info/api/patient', {
        headers: { Authorization: `Bearer ${token}` }
      })
      const { patients } = await res.json()
      const found = patients.find((p: any) => p.id == id)
      if (!found) {
        Alert.alert('錯誤', '找不到病患資料')
        return
      }
      const data: PatientProgressionData = {
        id: found.id,
        name: found.name,
        document: isJsonString(found.document_progression_data) ? JSON.parse(found.document_progression_data) : [],
        video: isJsonString(found.video_progression_data) ? JSON.parse(found.video_progression_data) : [],
        survey: isJsonString(found.survey_data) ? JSON.parse(found.survey_data) : [],
        records: found.symptom_records?.map((s: Record<string, string>) => ({
          date: s.date,
          data: isJsonString(s.survey_data) ? JSON.parse(s.survey_data) : []
        })),
        pushToken: found.push_token
      }
      setSelectedPatient(data)
      setName(data.name)
    } catch {
      Alert.alert('錯誤', '無法取得資料')
    } finally {
      setLoading(false) // CHANGED: 收尾
    }
  }

  const onChange = (_: DateTimePickerEvent, selectedDate: Date | undefined) => {
    if (typeof selectedDate !== 'undefined') {
      setDate(selectedDate.toISOString().split('T')[0])
    }
    setShowDate(false)
  }

  const toggleSymptom = useCallback((index: number, hasSymptom: boolean) => {
    setAnswers((prev) =>
      prev.map((answer, idx) =>
        idx === index ? { ...answer, hasSymptom, severity: hasSymptom ? answer.severity : 0 } : answer
      )
    )
  }, [])

  const changeSeverity = useCallback((index: number, severity: number) => {
    setAnswers((prev) =>
      prev.map((answer, idx) => (idx === index ? { ...answer, hasSymptom: true, severity } : answer))
    )
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
        setSubmitting(false) // CHANGED: early return 前也要還原
        return
      }

      const response = await fetch('https://allgood.peiren.info/api/user/update_patient_symptom', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          patient_id: Array.isArray(PATH_ID) ? PATH_ID[0] : PATH_ID,
          // NOTE: 如果後端預期是字串，就維持 stringify(answers)；
          // 若後端預期是 JSON 物件，請改成 survey_data: answers
          survey_data: JSON.stringify(answers), // CHANGED: 留下注解
          date: date
        })
      })

      if (response.ok) {
        // CHANGED: 先跳 Alert，資料刷新放背景（不要 await）
        Alert.alert('成功', '儲存症狀成功')
        fetchPatientData().catch(() => { }) // 背景更新，不阻塞 UI
      } else {
        const text = await response.text().catch(() => '')
        Alert.alert('失敗', text || '儲存失敗')
      }
    } catch (error) {
      Alert.alert('失敗', '儲存進度時發生錯誤')
      console.error('Error submitting survey:', error)
    } finally {
      setSubmitting(false) // CHANGED: 保證收尾
    }
  }

  // REMOVED: 內層 ScrollView，避免 nested ScrollView + KAV 造成底部空白
  const renderRecords = () => {
    if (!answers) return null
    return (
      <View style={styles.card /* CHANGED: 讓 card 當容器，不再是 ScrollView */}>
        {/* Questions */}
        {answers.map((ans, idx) => (
          <View key={idx} style={styles.questionBlock}>
            <Text style={styles.question}>{ans.symptom}</Text>

            {ans.symptom === '其他' ? (
              <TextInput
                style={styles.input}
                placeholder="請輸入症狀"
                value={ans.customSymptom ?? ''}
                onChangeText={changeCustomSymptom}
              />
            ) : (
              <View style={styles.segment}>
                <TouchableOpacity
                  style={[styles.segmentBtn, styles.leftBtn, ans.hasSymptom && styles.segmentActive]}
                  onPress={() => toggleSymptom(idx, true)}
                >
                  <Text style={[styles.segmentText, ans.hasSymptom && styles.segmentTextActive]}>有症狀</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.segmentBtn, styles.rightBtn, !ans.hasSymptom && styles.segmentActive]}
                  onPress={() => toggleSymptom(idx, false)}
                >
                  <Text style={[styles.segmentText, !ans.hasSymptom && styles.segmentTextActive]}>無症狀</Text>
                </TouchableOpacity>
              </View>
            )}

            {(ans.hasSymptom || ans.symptom === '其他') && (
              <>
                <Text style={styles.subQuestion}>困擾程度</Text>
                <View style={styles.severityRow}>
                  {[0, 1, 2, 3].map((s) => (
                    <TouchableOpacity
                      key={s}
                      style={[styles.sevBtn, ans.severity === s && styles.sevActive]}
                      onPress={() => changeSeverity(idx, s)}
                    >
                      <Text style={[styles.sevText, ans.severity === s && styles.sevTextActive]}>
                        {s === 0 ? '無' : s === 1 ? '小' : s === 2 ? '中' : '大'}
                      </Text>
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
      </View>
    )
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView edges={['top']} style={styles.topSafe}>
        {/* CHANGED: 用 KeyboardAvoidingView 包住整頁；Android 用 'height' 比較穩 */}
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0} // 可視你的 header 高度調整
        >
          <View style={styles.page}>
            <View style={styles.header}>
              <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                <Ionicons name="arrow-back-circle" size={25} color={TEXT} style={{ marginTop: 2.5 }} />
                <Text style={styles.backText}>上一頁</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              contentContainerStyle={styles.content}
              keyboardShouldPersistTaps="handled" // CHANGED
              keyboardDismissMode="on-drag" // CHANGED
            >
              <View style={styles.card}>
                <Text style={styles.title}>{`姓名：${name}`}</Text>

                {Platform.OS === 'android' ? (
                  <Pressable onPress={() => setShowDate(true)} style={styles.dateInputWrap}>
                    <TextInput style={styles.dateInput} value={date} editable={false} />
                    <MaterialIcons name="date-range" size={24} color={MUTED} style={styles.dateIcon} />
                    {showDate && (
                      <DateTimePicker value={new Date(date)} mode="date" display="calendar" onChange={onChange} />
                    )}
                  </Pressable>
                ) : (
                  <View style={styles.iosPicker}>
                    <Text style={styles.pickerLabel}>選擇日期</Text>
                    <DateTimePicker value={new Date(date)} mode="date" onChange={onChange} />
                  </View>
                )}
              </View>

              {loading ? (
                <View style={[styles.card, { alignItems: 'center' }]}>
                  <ActivityIndicator />
                </View>
              ) : (
                renderRecords()
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </SafeAreaProvider>
  )
}

const styles = StyleSheet.create({
  topSafe: {
    flex: 1,
    backgroundColor: BG
  },
  page: { flex: 1, backgroundColor: BG, paddingVertical: 16 },
  header: { paddingHorizontal: 16, backgroundColor: BG },
  backBtn: { flexDirection: 'row', alignItems: 'center' },
  backText: { marginLeft: 6, fontSize: 16, color: TEXT },

  // CHANGED: 避免過大的底部 padding 誘發莫名空白，可適度縮小
  content: { padding: 16, paddingBottom: 32 }, // CHANGED: 80 -> 32

  card: {
    backgroundColor: CARD_BG,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3
  },

  wrapper: {
    // REMOVED: 不再需要內層 ScrollView 的 flex:1 容器
  },

  questionBlock: {
    gap: 2
  },
  question: {
    fontSize: 16,
    paddingVertical: 12,
    fontWeight: '600',
    color: TEXT
  },
  label: {
    fontSize: 16,
    color: TEXT,
    marginBottom: 8
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
  },

  title: { fontSize: 20, fontWeight: '600', color: TEXT, marginBottom: 12 },
  dateInputWrap: { display: 'flex' },
  dateInput: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 8,
    padding: 10,
    color: TEXT,
    backgroundColor: BG
  },
  dateIcon: { position: 'absolute', right: 12, top: '50%', marginTop: -12 },
  iosPicker: {
    display: 'flex',
    flexDirection: 'row',
    marginBottom: 8,
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  pickerLabel: { fontSize: 16, color: TEXT, marginVertical: 'auto' },

  // 以下 record 樣式目前沒用到，但先保留
  recordCard: {
    display: 'flex',
    backgroundColor: CARD_BG,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2
  },
  recordRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 5 },
  symptomText: { fontSize: 16, color: TEXT, flex: 1 },
  tag: { borderRadius: 6, paddingVertical: 4, paddingHorizontal: 12 },
  tagWarn: { backgroundColor: '#dc0530' },
  tagNorm: { backgroundColor: '#2775c3' },
  tagText: { color: '#fff', fontSize: 14 }
})
