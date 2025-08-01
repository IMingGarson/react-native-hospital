import React, { useState, useEffect } from 'react'
import { View, StyleSheet, Alert, Text, Modal, TouchableOpacity, AppState } from 'react-native'
import { WebView } from 'react-native-webview'
import RNPickerSelect from 'react-native-picker-select'
import { AsyncStorageGetItem, AsyncStorageRemoveItem, isJsonString } from '../utils'
import { Link, useRouter } from 'expo-router'
import { MaterialCommunityIcons, MaterialIcons, Foundation, FontAwesome } from '@expo/vector-icons'
import { appTheme } from 'src/config/theme'
import { SafeAreaView } from 'react-native-safe-area-context'
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

const pdfs: PDFInterface[] = [
  { id: '0', label: '共好學習', value: 'https://drive.google.com/file/d/1ysZ10K6QvaE2kSYSfKm0OspC6SFX2TOZ/view?usp=sharing', duration: 0 },
  { id: '1', label: '愛-溝通', value: 'https://drive.google.com/file/d/13N_jqOAt-4FYCzSIv9GFy7nbvBB9XVZm/view?usp=sharing', duration: 0 },
  { id: '2', label: '資源補帖', value: 'https://drive.google.com/file/d/16chZcF4R8HMMNUvzoU4t38GSP3ky-DwV/view?usp=sharing', duration: 0 },
  { id: '3', label: '疲憊防護', value: 'https://drive.google.com/file/d/1cgAJcd9nFlcuRw1MeTMGXprgXeKA-yc-/view?usp=sharing', duration: 0 },
  { id: '4', label: '照顧心靈', value: 'https://drive.google.com/file/d/1bJ8kWurRxuTa4bmYOZvUkKUsgSXpIE8G/view?usp=sharing', duration: 0 },
  { id: '5', label: '排尿康復', value: 'https://drive.google.com/file/d/1YEGYaeOscOm6ZjD2fD67ZRsItDPz-592/view?usp=sharing', duration: 0 },
  { id: '6', label: '性福滿分', value: 'https://drive.google.com/file/d/1fHtg63DfxM9ymXcFX8IoKwPkKpdqd2e8/view?usp=sharing', duration: 0 },
  { id: '7', label: '電療筆記', value: 'https://drive.google.com/file/d/14Ke1sZc-2HpU54Sk35NN3DQtAdTPP5kG/view?usp=sharing', duration: 0 },
  { id: '8', label: '荷爾蒙站', value: 'https://drive.google.com/file/d/13EkPN3Ar2_4vnvJdot2vwo3XVFy1vaU0/view?usp=sharing', duration: 0 },
  { id: '9', label: '共好統整', value: 'https://drive.google.com/file/d/13EkPN3Ar2_4vnvJdot2vwo3XVFy1vaU0/view?usp=sharing', duration: 0 }
]

export default function PDFScreen() {
  const [currentPDF, setCurrentPDF] = useState<PDFInterface>(pdfs[0])
  const [progress, setProgress] = useState<ProgressState>({})
  const [startTime, setStartTime] = useState<number>(Date.now())
  const [currentRole, setCurrentRole] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(true)
  const router = useRouter()

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
              pdfs.forEach((document: PDFInterface) => {
                currentProgress[parseInt(document.id)] = { ...document }
              })
              setProgress(currentProgress)
              setCurrentPDF(pdfs[0])
            } else {
              progressionData.forEach((document: PDFInterface) => {
                currentProgress[parseInt(document.id)] = { ...document }
              })
              setProgress(progressionData)
              setCurrentPDF(progressionData[0])
            }
          } else {
            // default data
            pdfs.forEach((document: PDFInterface) => {
              currentProgress[parseInt(document.id)] = { ...document }
            })
            setProgress(currentProgress)
            setCurrentPDF(pdfs[0])
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
      pdfs.forEach((document: PDFInterface) => {
        currentProgress[parseInt(document.id)] = { ...document }
      })
      setProgress(currentProgress)
      setCurrentPDF(pdfs[0])
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

  const selectPDF = (selectedValue: string) => {
    if (selectedValue === 'NONE') {
      return false
    }
    const target = pdfs.find((p: PDFInterface) => p.value == selectedValue)
    if (!target || !target.id) {
      Alert.alert('錯誤', '無法找到該 PDF')
      return false
    }
    const accumulatedTime = Math.ceil((Date.now() - startTime) / 1000)
    setProgress((prev) => ({
      ...prev,
      [currentPDF.id]: {
        ...currentPDF,
        duration: accumulatedTime + progress[currentPDF.id].duration
      }
    }))
    setCurrentPDF(progress[parseInt(target.id)])
    setStartTime(Date.now())
  }

  const saveProgress = async (background: boolean = false) => {
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
    router.reload()
  }

  const BottomTabs = ({ role }: Props) => {
    const router = useRouter()
    const [showModal, setShowModal] = useState<boolean>(false)

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
      <SafeAreaView edges={['bottom']} style={bottomsList.bottomSafeview}>
        <View style={[bottomsList.container]}>
          {role === 'M' ? (
            <View style={bottomsList.tabItem}>
              <Link href="/nurse">
                <MaterialCommunityIcons name="emoticon-sick-outline" style={bottomsList.tabIcon} />
              </Link>
              <Link href="/nurse">
                <Text style={bottomsList.tabText}>病人列表</Text>
              </Link>
            </View>
          ) : (
            <View style={bottomsList.tabItem}>
              <Link
                href="/survey"
                onPress={() => {
                  saveProgress(true)
                }}>
                <FontAwesome name="pencil-square-o" size={24} style={bottomsList.tabIcon} />
              </Link>
              <Link
                href="/survey"
                onPress={() => {
                  saveProgress(true)
                }}>
                <Text style={bottomsList.tabText}>症狀</Text>
              </Link>
            </View>
          )}
          <View style={[bottomsList.tabItem]}>
            <Link
              href="/video"
              onPress={() => {
                saveProgress(true)
              }}>
              <Foundation name="play-video" style={bottomsList.tabIcon} />
            </Link>
            <Link
              href="/video"
              onPress={() => {
                saveProgress(true)
              }}>
              <Text style={bottomsList.tabText}>影片</Text>
            </Link>
          </View>
          <View style={bottomsList.tabItem}>
            <Link
              href="/psa"
              onPress={() => {
                saveProgress(true)
              }}>
              <MaterialCommunityIcons name="file-chart-outline" size={24} style={bottomsList.tabIcon} />
            </Link>
            <Link
              href="/psa"
              onPress={() => {
                saveProgress(true)
              }}>
              <Text style={bottomsList.tabText}>PSA</Text>
            </Link>
          </View>
          <View style={bottomsList.tabItem}>
            <Link
              href="/document"
              onPress={() => {
                saveProgress(true)
              }}>
              <MaterialCommunityIcons name="file-document-multiple-outline" style={bottomsList.tabIcon} />
            </Link>
            <Link
              href="/document"
              onPress={() => {
                saveProgress(true)
              }}>
              <Text style={bottomsList.tabText}>手冊</Text>
            </Link>
          </View>
          <View style={bottomsList.tabItem}>
            <MaterialIcons
              onPress={() => {
                setShowModal(true)
              }}
              name="logout"
              style={bottomsList.tabIcon}
            />
            <TouchableOpacity
              onPress={() => {
                setShowModal(true)
              }}>
              <Text style={bottomsList.tabText}>登出</Text>
            </TouchableOpacity>
          </View>
          <Modal visible={showModal} transparent={true} onRequestClose={() => setShowModal(false)}>
            <View style={modal.modalContainer}>
              <View style={modal.modalContent}>
                <Text style={modal.modalTitle}>確定登出？</Text>
                <View style={{ display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }}>
                  <TouchableOpacity onPress={() => handleSignOut()} style={modal.button}>
                    <Text>確定</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setShowModal(false)} style={modal.button}>
                    <Text>取消</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        </View>
      </SafeAreaView>
    )
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>取得資料中</Text>
      </View>
    )
  }
  return (
    <>
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.topSafeview}></SafeAreaView>
      <View style={styles.container}>
        <RNPickerSelect
          placeholder={{ label: '請選擇', value: 'NONE', color: '#000' }}
          value={currentPDF.value}
          onValueChange={(itemValue: string) => {
            if (itemValue !== currentPDF.value) {
              selectPDF(itemValue)
            }
          }}
          useNativeAndroidPickerStyle={false}
          items={pdfs}
          fixAndroidTouchableBug={true}
          style={StyleSheet.create({
            inputIOSContainer: {
              paddingVertical: 15,
              paddingHorizontal: 10
            },
            placeholder: { color: '#000' },
            inputIOS: {
              fontSize: 16,
              paddingVertical: 12,
              paddingHorizontal: 10,
              color: 'black',
              paddingRight: 30
            },
            inputAndroid: {
              fontSize: 18,
              paddingVertical: 15,
              paddingHorizontal: 15,
              color: 'black',
              paddingRight: 30
            },
            iconContainer: {
              paddingVertical: 15,
              paddingHorizontal: 15
            }
          })}
          Icon={() => {
            return <MaterialCommunityIcons name="chevron-down" size={24} color="black" />
          }}
        />
        {currentPDF ? (
          <View style={styles.webviewContainer}>
            <WebView source={{ uri: currentPDF.value }} javaScriptEnabled={true} domStorageEnabled={true} startInLoadingState={false} scalesPageToFit={true} style={styles.webview} />
          </View>
        ) : null}
        <BottomTabs role={currentRole} />
      </View>
    </>
  )
}

const modal = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)'
  },
  modalContent: {
    width: '80%',
    height: 150,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-around',
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 20
  },
  modalTitle: {
    display: 'flex',
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000'
  },
  button: {
    zIndex: 1,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderColor: 'gray',
    color: '#000',
    borderRadius: 5,
    backgroundColor: '#fff',
    marginHorizontal: 45
  }
})

const bottomsList = StyleSheet.create({
  bottomSafeview: {
    flex: 0,
    backgroundColor: appTheme.background,
    paddingBottom: 0
  },
  container: {
    width: '100%',
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    bottom: 0,
    backgroundColor: appTheme.background,
    borderTopWidth: 1,
    borderTopColor: '#ffffff'
  },
  tabItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 5
  },
  tabText: {
    display: 'flex',
    fontSize: 14,
    color: 'black'
  },
  tabIcon: {
    display: 'flex',
    fontSize: 34,
    color: '#303030'
  }
})

const styles = StyleSheet.create({
  topSafeview: {
    flex: 0,
    backgroundColor: appTheme.primary,
    paddingTop: 0
  },
  container: {
    flex: 1,
    backgroundColor: appTheme.primary
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: {
    fontSize: 18,
    color: '#804000'
  },
  picker: {
    width: '100%',
    backgroundColor: '#fff6e5',
    borderRadius: 5
  },
  pickerText: {
    fontSize: 20,
    color: 'black',
    fontWeight: 'bold'
  },
  webviewContainer: {
    flex: 1
  },
  webview: {
    flex: 1
  },
  saveBotton: {
    paddingVertical: 5
  }
})
