import React, { useEffect, useState } from 'react'
import { FontAwesome, Foundation, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useVideoPlayer, VideoView } from 'expo-video'
import { useEventListener } from 'expo'
import { AppState, Modal, Pressable, StyleSheet, Text, TouchableOpacity, ActivityIndicator, useWindowDimensions, View, ScrollView, Alert } from 'react-native'
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context'
import { ProgressState, VideoInterface } from '../interfaces'
import { AsyncStorageGetItem, AsyncStorageRemoveItem, isJsonString } from '../utils'

const PRIMARY = '#6366F1'
const BG = '#f0f5f9'
const SURFACE = '#fff'
const BORDER = '#e2e8f0'
const TEXT_PRIMARY = '#1f2d3a'
const TEXT_SECONDARY = '#33475b'
const MUTED = '#6b7280'

export default function VideoScreen() {
  const [videos] = useState<VideoInterface[]>([
    {
      id: '1',
      title: '共好學習',
      uri: 'https://allgood-hospital-static-files-bucket.s3.us-east-1.amazonaws.com/healthcare-videos/section-1.mp4',
      timestamp: 0,
      watched: false,
      duration: 0,
      length: '04:17'
    },
    {
      id: '2',
      title: '愛-溝通',
      uri: 'https://allgood-hospital-static-files-bucket.s3.us-east-1.amazonaws.com/healthcare-videos/section-2.mp4',
      timestamp: 0,
      watched: false,
      duration: 0,
      length: '16:44'
    },
    {
      id: '3',
      title: '資源補帖',
      uri: 'https://allgood-hospital-static-files-bucket.s3.us-east-1.amazonaws.com/healthcare-videos/section-3.mp4',
      timestamp: 0,
      watched: false,
      duration: 0,
      length: '11:17'
    },
    {
      id: '4',
      title: '疲憊防護',
      uri: 'https://allgood-hospital-static-files-bucket.s3.us-east-1.amazonaws.com/healthcare-videos/section-4.mp4',
      timestamp: 0,
      watched: false,
      duration: 0,
      length: '3:11'
    },
    {
      id: '5',
      title: '照顧心靈',
      uri: 'https://allgood-hospital-static-files-bucket.s3.us-east-1.amazonaws.com/healthcare-videos/section-5.mp4',
      timestamp: 0,
      watched: false,
      duration: 0,
      length: '18:27'
    },
    {
      id: '6',
      title: '排尿康復',
      uri: 'https://allgood-hospital-static-files-bucket.s3.us-east-1.amazonaws.com/healthcare-videos/section-6-1.mp4',
      timestamp: 0,
      watched: false,
      duration: 0,
      length: '11:34'
    },
    {
      id: '7',
      title: '性福滿分',
      uri: 'https://allgood-hospital-static-files-bucket.s3.us-east-1.amazonaws.com/healthcare-videos/section-6-2.mp4',
      timestamp: 0,
      watched: false,
      duration: 0,
      length: '14:40'
    },
    {
      id: '8',
      title: '電療筆記',
      uri: 'https://allgood-hospital-static-files-bucket.s3.us-east-1.amazonaws.com/healthcare-videos/section-7-1.mp4',
      timestamp: 0,
      watched: false,
      duration: 0,
      length: '07:25'
    },
    {
      id: '9',
      title: '荷爾蒙站',
      uri: 'https://allgood-hospital-static-files-bucket.s3.us-east-1.amazonaws.com/healthcare-videos/section-7-2.mp4',
      timestamp: 0,
      watched: false,
      duration: 0,
      length: '06:52'
    },
    {
      id: '10',
      title: '共好統整',
      uri: 'https://allgood-hospital-static-files-bucket.s3.us-east-1.amazonaws.com/healthcare-videos/section-8.mp4',
      timestamp: 0,
      watched: false,
      duration: 0,
      length: '03:52'
    }
  ])
  const router = useRouter()
  const { width } = useWindowDimensions()
  const [currentVideo, setCurrentVideo] = useState<VideoInterface>(videos[0])
  const [progress, setProgress] = useState<ProgressState>({})
  const [startTime, setStartTime] = useState<number>(Date.now())
  const [currentRole, setCurrentRole] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(false)

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
          const updatedProgress: ProgressState = {}
          if (isJsonString(data.patient.video_progression_data)) {
            const progressionData = JSON.parse(data.patient.video_progression_data)
            progressionData.forEach((item: VideoInterface) => {
              updatedProgress[item.id] = { ...item }
            })
            setCurrentVideo(progressionData[0])
          } else {
            videos.forEach((item: VideoInterface) => {
              updatedProgress[item.id] = { ...item }
            })
            setCurrentVideo(videos[0])
          }
          setProgress(updatedProgress)
        }
      } catch (error) {
        console.error('獲取觀看記錄時發生錯誤:', error)
      } finally {
        setLoading(false)
      }
    } else {
      setLoading(false)
      const updatedProgress: ProgressState = {}
      videos.forEach((item: VideoInterface) => {
        updatedProgress[item.id] = { ...item }
      })
      setCurrentVideo(videos[0])
      setProgress(updatedProgress)
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

  const saveProgress = async (background: boolean = false) => {
    try {
      const token = await AsyncStorageGetItem('jwt')
      if (!token) {
        if (!background) {
          Alert.alert('錯誤', '無法儲存進度')
        }
        return
      }

      const data = Object.keys(progress).map(function (videoId: string) {
        if (videoId === currentVideo.id) {
          const accumulatedTime = Math.ceil((Date.now() - startTime) / 1000)
          return {
            id: videoId,
            title: progress[videoId].title,
            uri: progress[videoId].uri,
            timestamp: progress[videoId].timestamp,
            watched: true,
            duration: accumulatedTime + (progress[videoId]?.duration || 0)
          }
        }
        return {
          id: videoId,
          title: progress[videoId].title,
          uri: progress[videoId].uri,
          timestamp: progress[videoId].timestamp,
          watched: progress[videoId].watched,
          duration: progress[videoId].duration
        }
      })
      setStartTime(Date.now())
      const response = await fetch('https://allgood.peiren.info/api/patient/update_data', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          video_progression_data: JSON.stringify(data)
        })
      })
      await response.json()
      if (response.ok) {
        if (!background) {
          Alert.alert('成功', '儲存進度成功')
          router.reload()
        }
      }
    } catch (error) {
      if (!background) {
        Alert.alert('失敗', '儲存進度時發生錯誤')
        console.error('儲存進度時發生錯誤:', error)
      }
    }
  }

  const handleVideoProgress = (seconds: number) => {
    const accumulatedTime = Math.ceil((Date.now() - startTime) / 1000)
    setProgress((prev) => ({
      ...prev,
      [currentVideo.id]: {
        ...prev[currentVideo.id],
        timestamp: seconds,
        duration: accumulatedTime + (prev[currentVideo.id]?.duration || 0)
      }
    }))
    setStartTime(Date.now())
  }

  const handleVideoEnd = (seconds: number) => {
    setProgress((prev) => ({
      ...prev,
      [currentVideo.id]: { ...prev[currentVideo.id], watched: true, timestamp: seconds }
    }))
  }

  const player = useVideoPlayer(currentVideo.uri, (p) => {
    p.play()
    p.currentTime = progress[currentVideo.id]?.timestamp || 0
  })

  useEventListener(player, 'statusChange', () => {
    handleVideoProgress(player.currentTime)
    if (Math.abs(player.duration - player.currentTime) <= 10) {
      handleVideoEnd(player.currentTime)
    }
  })

  useEventListener(player, 'playingChange', () => {
    handleVideoProgress(player.currentTime)
    if (Math.abs(player.duration - player.currentTime) <= 10) {
      handleVideoEnd(player.currentTime)
    }
  })

  const selectVideo = (video: VideoInterface) => {
    handleVideoProgress(player.currentTime)
    setCurrentVideo(video)
  }

  const fontSize = Math.max(14, Math.min(18, width * 0.045))

  if (loading) {
    return (
      <SafeAreaProvider>
        <SafeAreaView edges={['top', 'left', 'right']} style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={PRIMARY} />
          <Text style={styles.loadingText}>取得資料中</Text>
        </SafeAreaView>
      </SafeAreaProvider>
    )
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.container}>
        <View style={styles.videoWrapper}>
          <VideoView style={styles.video} player={player} allowsFullscreen allowsPictureInPicture />
        </View>
        <ScrollView contentContainerStyle={styles.scrollList}>
          {videos.map((item) => {
            const active = item.id === currentVideo.id
            return (
              <Pressable key={item.id} style={[styles.itemCard, active && styles.itemCardActive]} onPress={() => selectVideo(item)}>
                <View style={styles.itemText}>
                  <Text style={[styles.itemTitle, { fontSize }]} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <View style={styles.itemMeta}>
                    <MaterialCommunityIcons name="clock-outline" size={14} color={MUTED} />
                    <Text style={styles.itemMetaText}>{item.length}</Text>
                  </View>
                </View>
                {active && <MaterialCommunityIcons name="play-circle" size={28} color={PRIMARY} />}
              </Pressable>
            )
          })}
        </ScrollView>
      </SafeAreaView>
      <BottomTabs role={currentRole} />
    </SafeAreaProvider>
  )
}

interface Props {
  role: string
}

function BottomTabs({ role }: Props) {
  const router = useRouter()
  const [showModal, setShowModal] = useState(false)

  const handleSignOut = async () => {
    setShowModal(false)
    await AsyncStorageRemoveItem('token')
    await AsyncStorageRemoveItem('role')
    Alert.alert('登出成功')
    router.replace('/login')
    return
  }

  return (
    <SafeAreaView edges={['bottom']} style={bottoms.bottomSafeview}>
      <View style={bottoms.container}>
        {role === 'M' ? (
          <Tab label="病人列表" icon={<MaterialCommunityIcons name="emoticon-sick-outline" size={24} />} onPress={() => router.replace('/nurse')} />
        ) : (
          <Tab label="症狀" icon={<FontAwesome name="pencil-square-o" size={24} />} onPress={() => router.replace('/survey')} />
        )}
        <Tab label="影片" icon={<Foundation name="play-video" size={24} />} onPress={() => router.replace('/video')} />
        <Tab label="PSA" icon={<MaterialCommunityIcons name="file-chart-outline" size={24} />} onPress={() => router.replace('/psa')} />
        <Tab label="手冊" icon={<MaterialCommunityIcons name="file-document-multiple-outline" size={24} />} onPress={() => router.replace('/document')} />
        <Tab label="登出" icon={<MaterialIcons name="logout" size={24} />} onPress={() => setShowModal(true)} />
      </View>
      <Modal visible={showModal} transparent onRequestClose={() => setShowModal(false)}>
        <View style={modalStyles.container}>
          <View style={modalStyles.content}>
            <Text style={modalStyles.title}>確定登出？</Text>
            <View style={modalStyles.actions}>
              <TouchableOpacity style={[modalStyles.btn, modalStyles.primary]} onPress={handleSignOut}>
                <Text style={[modalStyles.btnText, { color: '#fff' }]}>確定</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[modalStyles.btn, modalStyles.secondary]} onPress={() => setShowModal(false)}>
                <Text style={[modalStyles.btnText, { color: TEXT_SECONDARY }]}>取消</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

interface TabProps {
  label: string
  icon: React.ReactNode
  onPress: () => void
}

function Tab({ label, icon, onPress }: TabProps) {
  return (
    <TouchableOpacity style={bottoms.tab} onPress={onPress}>
      {icon}
      <Text style={bottoms.tabText}>{label}</Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG, paddingHorizontal: 16 },
  videoWrapper: { width: '100%', aspectRatio: 16 / 9, marginTop: 16, borderRadius: 12, overflow: 'hidden', backgroundColor: '#000' },
  video: { width: '100%', height: '100%' },
  scrollList: { paddingTop: 16, paddingBottom: 32 },
  itemCard: {
    backgroundColor: SURFACE,
    borderRadius: 12,
    marginVertical: 8,
    marginHorizontal: 0,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3
  },
  itemCardActive: {
    borderColor: PRIMARY,
    borderWidth: 2
  },
  itemText: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  itemTitle: { color: TEXT_PRIMARY, fontWeight: '600', flexShrink: 1 },
  itemMeta: { flexDirection: 'row', alignItems: 'center', marginLeft: 12 },
  itemMetaText: { marginLeft: 4, fontSize: 14, color: MUTED },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: PRIMARY },
  loadingText: { marginTop: 8, fontSize: 18, color: '#fff', fontWeight: '500' }
})

const bottoms = StyleSheet.create({
  bottomSafeview: { backgroundColor: SURFACE },
  container: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingVertical: 8, borderTopWidth: 1, borderTopColor: BORDER, backgroundColor: SURFACE },
  tab: { alignItems: 'center', justifyContent: 'center' },
  tabText: { marginTop: 2, fontSize: 12, color: TEXT_SECONDARY, fontWeight: '500' }
})

const modalStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center' },
  content: { width: '80%', backgroundColor: SURFACE, borderRadius: 12, padding: 20, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 12, elevation: 6 },
  title: { fontSize: 18, fontWeight: '700', color: TEXT_PRIMARY, marginBottom: 16, textAlign: 'center' },
  actions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  btn: { flex: 1, borderRadius: 8, paddingVertical: 12, alignItems: 'center', borderWidth: 1 },
  primary: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  secondary: { backgroundColor: SURFACE, borderColor: MUTED },
  btnText: { fontSize: 15, fontWeight: '600' }
})
