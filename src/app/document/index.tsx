import { FontAwesome, Foundation, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons'
import { Link, useRouter } from 'expo-router'
import React, { useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, Alert, AppState, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native'
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context'
import { WebView } from 'react-native-webview'
import { AsyncStorageGetItem, AsyncStorageRemoveItem, isJsonString } from '../utils'

interface PDFInterface {
  id: string
  label: string
  value: string
  path?: string
  duration: number
}

interface Props {
  role: string
}
interface ProgressState {
  [key: string]: PDFInterface
}

const iOS_PDFS: PDFInterface[] = [
  { id: '0', label: '共好學習', value: `https://allgood-hospital-static-files-bucket.s3.us-east-1.amazonaws.com/healthcare-documents/section-1.pdf`, duration: 0 },
  { id: '1', label: '愛-溝通', value: `https://allgood-hospital-static-files-bucket.s3.us-east-1.amazonaws.com/healthcare-documents/section-2.pdf`, duration: 0 },
  { id: '2', label: '資源補帖', value: `https://allgood-hospital-static-files-bucket.s3.us-east-1.amazonaws.com/healthcare-documents/section-3.pdf`, duration: 0 },
  { id: '3', label: '疲憊防護', value: `https://allgood-hospital-static-files-bucket.s3.us-east-1.amazonaws.com/healthcare-documents/section-4.pdf`, duration: 0 },
  { id: '4', label: '照顧心靈', value: `https://allgood-hospital-static-files-bucket.s3.us-east-1.amazonaws.com/healthcare-documents/section-5.pdf`, duration: 0 },
  { id: '5', label: '排尿康復', value: `https://allgood-hospital-static-files-bucket.s3.us-east-1.amazonaws.com/healthcare-documents/section-6-1.pdf`, duration: 0 },
  { id: '6', label: '性福滿分', value: `https://allgood-hospital-static-files-bucket.s3.us-east-1.amazonaws.com/healthcare-documents/section-6-2.pdf`, duration: 0 },
  { id: '7', label: '電療筆記', value: `https://allgood-hospital-static-files-bucket.s3.us-east-1.amazonaws.com/healthcare-documents/section-7-1.pdf`, duration: 0 },
  { id: '8', label: '荷爾蒙站', value: `https://allgood-hospital-static-files-bucket.s3.us-east-1.amazonaws.com/healthcare-documents/section-7-2.pdf`, duration: 0 },
  { id: '9', label: '共好統整', value: `https://allgood-hospital-static-files-bucket.s3.us-east-1.amazonaws.com/healthcare-documents/section-8.pdf`, duration: 0 }
]

const HOST_PREFIX = 'https://docs.google.com/gview?embedded=true&url='
const ANDRIOD_PDFS: PDFInterface[] = [
  { id: '0', label: '共好學習', value: `${HOST_PREFIX}https://allgood-hospital-static-files-bucket.s3.us-east-1.amazonaws.com/healthcare-documents/section-1.pdf`, duration: 0 },
  { id: '1', label: '愛-溝通', value: `${HOST_PREFIX}https://allgood-hospital-static-files-bucket.s3.us-east-1.amazonaws.com/healthcare-documents/section-2.pdf`, duration: 0 },
  { id: '2', label: '資源補帖', value: `${HOST_PREFIX}https://allgood-hospital-static-files-bucket.s3.us-east-1.amazonaws.com/healthcare-documents/section-3.pdf`, duration: 0 },
  { id: '3', label: '疲憊防護', value: `${HOST_PREFIX}https://allgood-hospital-static-files-bucket.s3.us-east-1.amazonaws.com/healthcare-documents/section-4.pdf`, duration: 0 },
  { id: '4', label: '照顧心靈', value: `${HOST_PREFIX}https://allgood-hospital-static-files-bucket.s3.us-east-1.amazonaws.com/healthcare-documents/section-5.pdf`, duration: 0 },
  { id: '5', label: '排尿康復', value: `${HOST_PREFIX}https://allgood-hospital-static-files-bucket.s3.us-east-1.amazonaws.com/healthcare-documents/section-6-1.pdf`, duration: 0 },
  { id: '6', label: '性福滿分', value: `${HOST_PREFIX}https://allgood-hospital-static-files-bucket.s3.us-east-1.amazonaws.com/healthcare-documents/section-6-2.pdf`, duration: 0 },
  { id: '7', label: '電療筆記', value: `${HOST_PREFIX}https://allgood-hospital-static-files-bucket.s3.us-east-1.amazonaws.com/healthcare-documents/section-7-1.pdf`, duration: 0 },
  { id: '8', label: '荷爾蒙站', value: `${HOST_PREFIX}https://allgood-hospital-static-files-bucket.s3.us-east-1.amazonaws.com/healthcare-documents/section-7-2.pdf`, duration: 0 },
  { id: '9', label: '共好統整', value: `${HOST_PREFIX}https://allgood-hospital-static-files-bucket.s3.us-east-1.amazonaws.com/healthcare-documents/section-8.pdf`, duration: 0 }
]

export default function PDFScreen() {
  const [currentPDF, setCurrentPDF] = useState<PDFInterface>(Platform.OS === 'android' ? ANDRIOD_PDFS[0] : iOS_PDFS[0])
  const [progress, setProgress] = useState<ProgressState>({})
  const [startTime, setStartTime] = useState<number>(Date.now())
  const [currentRole, setCurrentRole] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  const [showDropdown, setShowDropdown] = useState(false)
  const { width } = useWindowDimensions()

  const dynamic = useMemo(() => {
    const header = Math.max(18, Math.min(24, width * 0.06))
    const item = Math.max(14, Math.min(18, width * 0.045))
    return { header, item }
  }, [width])

  const modalHeight = 'auto'

  const _source = () => {
    if (Platform.OS === 'android') {
      return ANDRIOD_PDFS
    }
    return iOS_PDFS
  }

  const fetchProgress = async () => {
    const token = await AsyncStorageGetItem('jwt')
    const role = await AsyncStorageGetItem('role')
    if (typeof token === 'string' && typeof role === 'string' && token.length && ['M', 'P'].includes(role)) {
      setCurrentRole(role)
    } else {
      Alert.alert('錯誤', '無法取得資料')
      router.replace('/login')
    }
    if (role === 'P') {
      try {
        const response = await fetch('https://allgood.peiren.info/api/patient/get', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          }
        })

        const data = await response.json()
        if (response.ok) {
          // Set progress
          const currentProgress: ProgressState = {}
          if (isJsonString(data.patient.document_progression_data)) {
            const progressionData = JSON.parse(data.patient.document_progression_data)
            if (Object.keys(progressionData).length === 0) {
              // default data
              _source().forEach((document: PDFInterface) => {
                currentProgress[parseInt(document.id)] = { ...document }
              })
              setProgress(currentProgress)
            } else {
              progressionData.forEach((document: PDFInterface) => {
                currentProgress[parseInt(document.id)] = { ...document }
              })
              setProgress(progressionData)
              setCurrentPDF(progressionData[0])
            }
          } else {
            // default data
            _source().forEach((document: PDFInterface) => {
              currentProgress[parseInt(document.id)] = { ...document }
            })
            setProgress(currentProgress)
            setCurrentPDF(Platform.OS === 'android' ? ANDRIOD_PDFS[0] : iOS_PDFS[0])
          }
        }
      } catch (error) {
        console.error('獲取觀看記錄時發生錯誤:', error)
      } finally {
        setLoading(false)
      }
    } else {
      // default data
      const currentProgress: ProgressState = {}
      _source().forEach((document: PDFInterface) => {
        currentProgress[parseInt(document.id)] = { ...document }
      })
      setProgress(currentProgress)
      setCurrentPDF(Platform.OS === 'android' ? ANDRIOD_PDFS[0] : iOS_PDFS[0])
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProgress()
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState.match(/inactive|background/)) {
        if (currentRole === 'P') {
          saveProgress(true)
        }
      }
    })
    return () => {
      subscription.remove()
    }
  }, [])

  const handleSelectPDF = (pdf: PDFInterface) => {
    const accumulatedTime = Math.ceil((Date.now() - startTime) / 1000)
    setProgress((prev) => ({
      ...prev,
      [pdf.id]: {
        ...pdf,
        duration: accumulatedTime + (progress[pdf.id]?.duration ?? 0)
      }
    }))
    setCurrentPDF(pdf)
    setStartTime(Date.now())
    return true
  }

  const saveProgress = async (background = false) => {
    try {
      const token = await AsyncStorageGetItem('jwt')
      if (!token) {
        if (!background) {
          Alert.alert('錯誤', '無法儲存進度')
        }
        return
      }
      const data = Object.keys(progress).map(function (documentId: string) {
        if (documentId === currentPDF.id) {
          const accumulatedTime = Math.ceil((Date.now() - startTime) / 1000)
          return {
            id: documentId,
            label: progress[documentId].label,
            value: progress[documentId].value,
            duration: accumulatedTime + progress[documentId].duration
          }
        }
        return {
          id: documentId,
          label: progress[documentId].label,
          value: progress[documentId].value,
          duration: progress[documentId].duration
        }
      })
      const response = await fetch('https://allgood.peiren.info/api/patient/update_data', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          document_progression_data: JSON.stringify(data)
        })
      })
      await response.json()
      if (response.ok && !background) {
        Alert.alert('成功', '儲存進度成功')
      }
    } catch (error) {
      if (!background) {
        Alert.alert('失敗', '儲存進度時發生錯誤')
      }
      console.error('儲存進度時發生錯誤:', error)
    }
  }

  const BottomTabs: React.FC<Props> = ({ role }: Props) => {
    const router = useRouter()
    const [showModal, setShowModal] = useState(false)

    const handleSignOut = async () => {
      saveProgress(true)
      await AsyncStorageRemoveItem('token')
      await AsyncStorageRemoveItem('role')
      setShowModal(false)
      Alert.alert('登出成功')
      router.replace('/login')
      return
    }

    return (
      <SafeAreaView edges={['bottom']} style={bottoms.bottomSafeview}>
        <View style={bottoms.container}>
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

  return (
    <SafeAreaProvider>
      <SafeAreaView edges={['top']} style={styles.container}>
        {/* Dropdown */}
        <Pressable style={styles.dropdown} onPress={() => setShowDropdown(true)}>
          <Text style={[styles.dropdownText, { fontSize: dynamic.item }]}>{currentPDF?.label ?? '請選擇 PDF'}</Text>
          <MaterialCommunityIcons name="chevron-down" size={20} color="#333" />
        </Pressable>

        {/* Dropdown Modal */}
        <Modal transparent visible={showDropdown} animationType="fade" onRequestClose={() => setShowDropdown(false)}>
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPressOut={() => setShowDropdown(false)}>
            <View style={[styles.modalContent, { height: modalHeight }]}>
              <ScrollView>
                {_source().map((pdf) => (
                  <Pressable
                    key={pdf.id}
                    style={[styles.modalItem, currentPDF?.id === pdf.id && styles.modalItemActive]}
                    onPress={() => {
                      handleSelectPDF(pdf)
                      setShowDropdown(false)
                    }}>
                    <Text style={[styles.modalText, { fontSize: dynamic.item }, currentPDF?.id === pdf.id && styles.modalTextActive]}>{pdf.label}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* PDF Viewer */}
        <View style={styles.webviewContainer}>
          {currentPDF ? (
            <>
              {loading && (
                <View style={styles.overlay}>
                  <ActivityIndicator size="large" color="#6366F1" />
                </View>
              )}
              <WebView source={{ uri: currentPDF.value }} style={styles.webview} onLoadStart={() => setLoading(true)} onLoadEnd={() => setLoading(false)} />
            </>
          ) : (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>請選擇文件</Text>
            </View>
          )}
        </View>
      </SafeAreaView>
      <BottomTabs role={currentRole} />
    </SafeAreaProvider>
  )
}

const PRIMARY = '#6366F1'
const SURFACE = '#fff'
const CARD_BG = '#fff'
const BORDER = '#d1d7dd'
const TEXT = '#1f2d3a'
const MUTED = '#6b7280'
const TEXT_SECONDARY = '#33475b'
const BG = '#f0f5f9'

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG
  },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: CARD_BG,
    borderColor: BORDER,
    borderWidth: 1,
    borderRadius: 8,
    margin: 14,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  dropdownText: {
    color: TEXT,
    fontWeight: '500'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.2)',
    justifyContent: 'flex-start',
    paddingTop: Platform.OS === 'android' ? 100 : 200
  },
  modalContent: {
    backgroundColor: CARD_BG,
    marginHorizontal: 16,
    borderRadius: 8,
    overflow: 'hidden'
  },
  modalItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomColor: BORDER,
    borderBottomWidth: 1
  },
  modalItemActive: {
    backgroundColor: PRIMARY
  },
  modalText: {
    color: TEXT
  },
  modalTextActive: {
    color: '#fff',
    fontWeight: '600'
  },
  webviewContainer: {
    flex: 1,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: CARD_BG
  },
  webview: {
    flex: 1
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  emptyText: {
    fontSize: 16,
    color: MUTED
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
