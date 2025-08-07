/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useState } from 'react'
import { View, Text, ScrollView, Pressable, TouchableOpacity, TextInput, StyleSheet, Platform, Alert } from 'react-native'
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker'
import { useLocalSearchParams, useRouter } from 'expo-router'
import Ionicons from '@expo/vector-icons/Ionicons'
import { MaterialIcons } from '@expo/vector-icons'
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context'
import { AsyncStorageGetItem, isJsonString } from '../utils'
import { PatientProgressionData, Survey } from '../interfaces'

const BG = '#f0f5f9'
const CARD_BG = '#fff'
const BORDER = '#d1d7dd'
const TEXT = '#1f2d3a'
const MUTED = '#6b7280'

export default function SurveyRecordScreen() {
  const { id: PATH_ID } = useLocalSearchParams()
  const [selectedPatient, setSelectedPatient] = useState<PatientProgressionData>()
  const router = useRouter()
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [showDate, setShowDate] = useState<boolean>(false)
  const [name, setName] = useState<string>('')

  useEffect(() => {
    fetchPatientData()
  }, [])

  const fetchPatientData = async () => {
    try {
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
    }
  }

  const onChange = (_: DateTimePickerEvent, selectedDate: Date | undefined) => {
    if (typeof selectedDate !== 'undefined') {
      setDate(selectedDate.toISOString().split('T')[0])
    }
    setShowDate(false)
  }

  const severityLabel = (n: number) => ['無', '小', '中', '大'][n] || '無'

  const renderRecords = () => {
    if (!selectedPatient?.records) return null
    const rec = selectedPatient.records.find((r) => r.date === date)
    if (!rec) return null
    return rec.data.map((s: Survey, i: number) => (
      <View key={i} style={styles.recordCard}>
        <View style={styles.recordRow}>
          <Text style={styles.symptomText}>{`${i + 1}. ${s.symptom === '其他' ? s.customSymptom : s.symptom}`}</Text>
          <View style={[styles.tag, s.hasSymptom ? styles.tagWarn : styles.tagNorm]}>
            <Text style={styles.tagText}>{s.hasSymptom ? '有症狀' : '無症狀'}</Text>
          </View>
        </View>
        {s.hasSymptom && <Text style={styles.sevText}>嚴重程度：{severityLabel(s.severity)}</Text>}
      </View>
    ))
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView edges={['top']} style={styles.topSafe}>
        <View style={styles.page}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Ionicons name="arrow-back-circle" size={25} color={TEXT} style={{ marginTop: 2.5 }} />
              <Text style={styles.backText}>回上一頁</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.content}>
            <View style={styles.card}>
              <Text style={styles.title}>{`姓名：${name}`}</Text>
              {Platform.OS === 'android' ? (
                <Pressable onPress={() => setShowDate(true)} style={styles.dateInputWrap}>
                  <TextInput style={styles.dateInput} value={date} editable={false} />
                  <MaterialIcons name="date-range" size={24} color={MUTED} style={styles.dateIcon} />
                  {showDate && <DateTimePicker value={new Date(date)} mode="date" display="calendar" onChange={onChange} />}
                </Pressable>
              ) : (
                <View style={styles.iosPicker}>
                  <Text style={styles.pickerLabel}>選擇日期</Text>
                  <DateTimePicker value={new Date(date)} mode="date" onChange={onChange} />
                </View>
              )}
            </View>
            {renderRecords()}
          </ScrollView>
        </View>
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
  content: { padding: 16, paddingBottom: 80 },
  card: {
    backgroundColor: CARD_BG,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3
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
  iosPicker: { display: 'flex', flexDirection: 'row', marginBottom: 16, alignItems: 'center', justifyContent: 'space-between' },
  pickerLabel: { fontSize: 16, color: TEXT, marginVertical: 'auto' },
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
  tagText: { color: '#fff', fontSize: 14 },
  sevText: { color: TEXT, fontSize: 14 }
})
