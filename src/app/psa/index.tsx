import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { View, Text, TextInput, StyleSheet, Alert, ScrollView, Modal, Platform, TouchableOpacity } from 'react-native'
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context'
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker'
import AntDesign from '@expo/vector-icons/AntDesign'
import BottomTabs from '../bottomTabs'
import { APIPatientProgressionData, PSAData } from '../interfaces'
import { AsyncStorageGetItem } from '../utils'
import { useRouter } from 'expo-router'
import RNPickerSelect from 'react-native-picker-select'

const PRIMARY = '#6366F1'
const BG = '#f0f5f9'
const CARD_BG = '#fff'
const TEXT = '#1f2d3a'
const MUTED = '#6b7280'
const BORDER = '#d1d7dd'

const daysAgo = (n: number) => {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().split('T')[0]
}

export default function PSAList() {
  const router = useRouter()
  // 狀態定義
  const [allPSAData, setAllPSAData] = useState<PSAData[]>([])
  const [psa, setPsa] = useState<string>('')
  const [currentRole, setCurrentRole] = useState('')

  // 預設顯示過去兩週的資料 (P 與 M 都如此)
  const [searchStartDate, setSearchStartDate] = useState<string>(daysAgo(14))
  const [searchEndDate, setSearchEndDate] = useState<string>(daysAgo(0))
  const [addDate, setAddDate] = useState<string>(daysAgo(0))

  // 當角色為 M 時，需有病患選擇功能
  const [patientOptions, setPatientOptions] = useState<{ id: number; name: string; value: string; label: string }[]>([])
  const [currentPatient, setCurrentPatient] = useState<{
    id: number
    name: string
    value: string
    label: string
  }>({ id: -1, name: '', value: '', label: '' })

  const [showSearchModal, setShowSearchModal] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showStartDate, setShowStartDate] = useState(false)
  const [showEndDate, setShowEndDate] = useState(false)
  const [showAddDate, setShowAddDate] = useState(false)

  const filteredData = useMemo(
    () =>
      allPSAData.filter((item) => {
        const d = new Date(item.date)
        return d >= new Date(searchStartDate) && d <= new Date(searchEndDate)
      }),
    [allPSAData, searchStartDate, searchEndDate]
  )

  const onStartChange = useCallback((_: DateTimePickerEvent, d?: Date) => {
    setShowStartDate(false)
    if (d) setSearchStartDate(d.toISOString().split('T')[0])
  }, [])

  const onEndChange = useCallback(
    (_: DateTimePickerEvent, d?: Date) => {
      setShowEndDate(false)
      if (d && d >= new Date(searchStartDate)) setSearchEndDate(d.toISOString().split('T')[0])
      if (d && d < new Date(searchStartDate)) Alert.alert('錯誤', '結束不可早於開始')
    },
    [searchStartDate]
  )
  const onAddChange = useCallback((_: DateTimePickerEvent, d?: Date) => {
    setShowAddDate(false)
    if (d && d <= new Date()) setAddDate(d.toISOString().split('T')[0])
    if (d && d > new Date()) Alert.alert('錯誤', '不可選未來日期')
  }, [])

  // 取得所有病患資料 (僅角色為 M 時使用)
  const fetchPatientData = async (): Promise<boolean> => {
    try {
      const token = await AsyncStorageGetItem('jwt')
      const response = await fetch('https://allgood.peiren.info/api/patient', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      })
      const data = await response.json()
      if (response.ok && data?.patients) {
        const pData = data.patients.map((d: APIPatientProgressionData) => ({
          id: Number(d.id),
          name: d.name,
          value: `${d.id}. ${d.name}`,
          label: d.name
        }))
        if (pData.length > 0) {
          setPatientOptions(pData)
          setCurrentPatient(pData[0])
        }
        return true
      }
    } catch (error) {
      console.error('fetchPatientData error:', error)
    }
    return false
  }

  const fetchData = async () => {
    try {
      const token = await AsyncStorageGetItem('jwt')
      const role = (await AsyncStorageGetItem('role')) as string
      if (!token || !role || !['M', 'P'].includes(role)) {
        Alert.alert('錯誤', '無法取得資料')
        router.replace('/login')
        return
      }
      setCurrentRole(role)
      if (role === 'P') {
        // 病患抓自己的 PSA 資料
        const response = await fetch('https://allgood.peiren.info/api/patient/psa', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          }
        })
        const data = await response.json()
        if (response.ok && data.psa) {
          const sortedData = data.psa.sort((a: PSAData, b: PSAData) => a.date.localeCompare(b.date))
          setAllPSAData(sortedData)
        }
      } else {
        // 醫護人員抓取所有病患資料，並預設抓取第一位病患的 PSA 資料
        const success = await fetchPatientData()
        if (!success) {
          console.error('獲取全病患資料時發生錯誤')
        } else if (currentPatient && currentPatient.id !== -1) {
          await searchPSAData()
        }
      }
    } catch (error) {
      console.error('fetchData error:', error)
    }
  }

  const searchPSAData = async () => {
    try {
      const token = await AsyncStorageGetItem('jwt')
      let url = ''
      if (currentRole === 'M') {
        if (!currentPatient || currentPatient.id < 0) {
          Alert.alert('錯誤', '無法搜尋PSA記錄')
          return
        }
        url = `https://allgood.peiren.info/api/patient/psa_on_date?start_date=${searchStartDate}&end_date=${searchEndDate}&pid=${currentPatient.id}&role=${currentRole}`
      } else {
        url = `https://allgood.peiren.info/api/patient/psa_on_date?start_date=${searchStartDate}&end_date=${searchEndDate}&role=${currentRole}`
      }
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      })
      const data = await response.json()
      if (response.ok && data.psa) {
        const sortedData = data.psa.sort((a: PSAData, b: PSAData) => a.date.localeCompare(b.date))
        setAllPSAData(sortedData)
      }
    } catch (error) {
      Alert.alert('錯誤', '無法搜尋PSA記錄')
      console.error('searchPSAData error:', error)
    }
  }

  const addPSAData = async () => {
    if (!addDate || !psa) {
      Alert.alert('錯誤', '請輸入日期跟數值')
      return
    }
    if (isNaN(parseFloat(psa))) {
      Alert.alert('錯誤', 'PSA 資料有誤')
      return
    }
    if (currentRole === 'M' && (!currentPatient || currentPatient.id < 0)) {
      Alert.alert('錯誤', '病患資料有誤')
      return
    }
    try {
      const token = await AsyncStorageGetItem('jwt')
      const body = currentRole === 'M' ? { date: addDate, psa: parseFloat(psa), pid: currentPatient.id } : { date: addDate, psa: parseFloat(psa) }
      const response = await fetch('https://allgood.peiren.info/api/patient/psa', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(body)
      })
      await response.json()
      if (response.ok) {
        Alert.alert('成功', '新增成功')
        // 更新原始 PSA 資料：如果已存在同一日期則更新，否則加入新紀錄
        setAllPSAData((prevData) => {
          const dataMap = new Map(prevData.map((item) => [item.date, item]))
          dataMap.set(addDate, { date: addDate, psa: parseFloat(psa) })
          return Array.from(dataMap.values()).sort((a, b) => a.date.localeCompare(b.date))
        })
      } else {
        Alert.alert('錯誤', '無法新增PSA記錄')
      }
    } catch (error) {
      Alert.alert('錯誤', '無法新增PSA記錄')
      console.error('addPSAData error:', error)
    } finally {
      setPsa('')
      setShowCreateModal(false)
    }
  }

  useEffect(() => {
    if (currentRole === 'M') {
      searchPSAData()
    }
  }, [currentPatient])

  useEffect(() => {
    fetchData()
  }, [])

  const selectPatient = (selectedValue: string) => {
    const patient = patientOptions.find((p) => p.value === selectedValue)
    if (patient) {
      setCurrentPatient(patient)
    }
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView edges={['top']} style={styles.page}>
        <View style={styles.header}>
          {currentRole === 'M' && <Text style={styles.headerText}>病患：{currentPatient.name}</Text>}
          <Text style={styles.headerText}>
            {searchStartDate} ~ {searchEndDate}
          </Text>
          <View style={styles.buttons}>
            <TouchableOpacity style={styles.btn} onPress={() => setShowSearchModal(true)}>
              <Text style={styles.btnText}>搜尋</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btn} onPress={() => setShowCreateModal(true)}>
              <Text style={styles.btnText}>新增</Text>
            </TouchableOpacity>
          </View>
        </View>
        <ScrollView contentContainerStyle={styles.list}>
          {filteredData.map((i, idx) => (
            <View key={idx} style={styles.item}>
              <Text style={styles.itemDate}>{i.date}</Text>
              <View style={styles.itemTag}>
                <Text style={styles.itemTagText}>PSA: {i.psa}</Text>
              </View>
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>

      {/* 搜尋 Modal */}
      <Modal visible={showSearchModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>搜尋 PSA</Text>
            {currentRole === 'M' && (
              <RNPickerSelect
                placeholder={{ label: '選擇病人', value: 'NONE', color: '#000' }}
                value={currentPatient.value}
                onValueChange={(itemValue: string) => {
                  if (itemValue !== currentPatient.value) {
                    selectPatient(itemValue)
                  }
                }}
                items={patientOptions}
                useNativeAndroidPickerStyle={false}
                fixAndroidTouchableBug={true}
                Icon={() => <AntDesign name="downcircleo" style={pickerSelectStyles.iconContainer} />}
                style={pickerSelectStyles}
              />
            )}
            {Platform.OS === 'android' ? (
              <>
                <Text>開始日期</Text>
                {showStartDate && <DateTimePicker value={new Date(searchStartDate)} mode="date" display="calendar" onChange={onStartChange} />}
                <TouchableOpacity onPress={() => setShowStartDate(true)} style={styles.modalInput}>
                  <Text>{searchStartDate}</Text>
                </TouchableOpacity>
                <Text>結束日期</Text>
                {showEndDate && <DateTimePicker value={new Date(searchEndDate)} mode="date" display="calendar" onChange={onEndChange} />}
                <TouchableOpacity onPress={() => setShowEndDate(true)} style={styles.modalInput}>
                  <Text>{searchEndDate}</Text>
                </TouchableOpacity>
              </>
            ) : (
              <View style={{ display: 'flex', flexDirection: 'column', gap: '10' }}>
                <View style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text>開始日期</Text>
                  <DateTimePicker value={new Date(searchStartDate)} mode="date" onChange={onStartChange} />
                </View>
                <View style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text>結束日期</Text>
                  <DateTimePicker value={new Date(searchEndDate)} mode="date" onChange={onEndChange} />
                </View>
              </View>
            )}
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalBtn}
                onPress={() => {
                  searchPSAData()
                  setShowSearchModal(false)
                }}>
                <Text style={styles.modalBtnText}>搜尋</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalBtn} onPress={() => setShowSearchModal(false)}>
                <Text style={styles.modalBtnText}>取消</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 新增 Modal */}
      <Modal visible={showCreateModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>新增 PSA</Text>
            {currentRole === 'M' && (
              <RNPickerSelect
                placeholder={{ label: '選擇病人', value: 'NONE', color: '#000' }}
                value={currentPatient.value}
                onValueChange={(itemValue: string) => {
                  if (itemValue !== currentPatient.value) {
                    selectPatient(itemValue)
                  }
                }}
                items={patientOptions}
                useNativeAndroidPickerStyle={false}
                fixAndroidTouchableBug={true}
                Icon={() => <AntDesign name="downcircleo" style={pickerSelectStyles.iconContainer} />}
                style={pickerSelectStyles}
              />
            )}
            {Platform.OS === 'android' ? (
              <>
                <Text>選擇日期</Text>
                {showAddDate && <DateTimePicker value={new Date(addDate)} mode="date" display="calendar" onChange={onAddChange} />}
                <TouchableOpacity onPress={() => setShowAddDate(true)} style={styles.modalInput}>
                  <Text>{addDate}</Text>
                </TouchableOpacity>
              </>
            ) : (
              <View style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text>選擇日期</Text>
                <DateTimePicker value={new Date(addDate)} mode="date" onChange={onAddChange} />
              </View>
            )}
            <TextInput style={styles.modalInput} placeholder="PSA" keyboardType="numeric" value={psa} onChangeText={setPsa} />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalBtn} onPress={addPSAData}>
                <Text style={styles.modalBtnText}>新增</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalBtn} onPress={() => setShowCreateModal(false)}>
                <Text style={styles.modalBtnText}>取消</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <BottomTabs role={currentRole} />
    </SafeAreaProvider>
  )
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: BG
  },
  header: {
    backgroundColor: BG,
    paddingHorizontal: 12
  },
  headerText: {
    fontSize: 18,
    fontWeight: '600',
    color: TEXT,
    marginBottom: 4
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8
  },
  btn: {
    width: 100,
    backgroundColor: PRIMARY,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center'
  },
  btnText: {
    color: CARD_BG,
    fontSize: 16,
    fontWeight: '500'
  },
  list: {
    paddingVertical: 16,
    paddingHorizontal: 12
  },
  item: {
    backgroundColor: CARD_BG,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderColor: BORDER,
    borderWidth: 1
  },
  itemDate: {
    fontSize: 16,
    color: TEXT
  },
  itemTag: {
    backgroundColor: PRIMARY,
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
    width: 80,
    alignItems: 'center'
  },
  itemTagText: {
    color: CARD_BG,
    fontSize: 14
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  modal: {
    width: '80%',
    backgroundColor: CARD_BG,
    borderRadius: 12,
    padding: 16
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: TEXT,
    marginBottom: 12,
    textAlign: 'center'
  },
  modalInput: {
    backgroundColor: BG,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginVertical: 8,
    color: TEXT
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12
  },
  modalBtn: {
    backgroundColor: PRIMARY,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16
  },
  modalBtnText: {
    color: CARD_BG,
    fontSize: 16,
    fontWeight: '500'
  },
  picker: {
    marginVertical: 8
  }
})

const pickerSelectStyles = StyleSheet.create({
  placeholder: {
    fontSize: 16,
    color: MUTED,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  inputIOS: {
    fontSize: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    paddingRight: 40,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 8,
    color: TEXT,
    backgroundColor: CARD_BG,
    marginBottom: 10
  },
  inputAndroid: {
    fontSize: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    paddingRight: 40,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 8,
    color: TEXT,
    backgroundColor: CARD_BG,
    marginBottom: 5
  },
  iconContainer: {
    fontSize: 20,
    color: '#303030',
    marginRight: 5,
    marginTop: Platform.OS === 'ios' ? 3 : 5
  }
})
