import { FontAwesome, Foundation, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons'
import { useEventListener } from 'expo'
import { useRouter } from 'expo-router'
import * as ScreenOrientation from 'expo-screen-orientation'
import { useVideoPlayer, VideoView } from 'expo-video'
import React, { useEffect, useRef, useState } from 'react'
import { ActivityIndicator, Alert, AppState, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native'
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context'
import { ProgressState, VideoInterface } from '../interfaces'
import { AsyncStorageGetItem, AsyncStorageRemoveItem, isJsonString } from '../utils'
interface Props {
  role: string
}

const PRIMARY = '#6366F1'
const SURFACE = '#fff'
const CARD_BG = '#fff'
const BORDER = '#d1d7dd'
const TEXT = '#1f2d3a'
const MUTED = '#6b7280'
const TEXT_SECONDARY = '#33475b'
const BG = '#f0f5f9'

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
  const [loading, setLoading] = useState<boolean>(true)

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
          let parsed = videos;
          if (isJsonString(data.patient.video_progression_data)) {
            const d = JSON.parse(data.patient.video_progression_data);
            if (d.length) {
              parsed = d;
            }
          }

          const updatedProgress: ProgressState = {}
          for (const item of parsed) {
            updatedProgress[item.id] = { ...item }
          }
          setCurrentVideo(parsed[0])
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
    fetchProgress();
    const subscription = AppState.addEventListener('change', async (s) => {
      if (s === 'inactive' || s === 'background') {
        if (currentRole === 'P') {
          await saveProgress(true)
        }
      }
    })
    return () => subscription.remove()
  }, [])

  const saveProgress = async (background: boolean = false) => {
    if (loading) {
      return true;
    }
    try {
      const token = await AsyncStorageGetItem('jwt')
      if (!token) {
        if (!background) {
          Alert.alert('錯誤', '無法儲存進度')
        }
        return
      }
      const time = Date.now();
      const data = Object.keys(progress).map(function (videoId: string) {
        if (videoId === currentVideo.id) {
          const accumulatedTime = Math.ceil((time - startTime) / 1000)
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
      setStartTime(time)
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
    const time = Date.now()
    const accumulatedTime = Math.ceil((time - startTime) / 1000)
    setProgress((prev) => ({
      ...prev,
      [currentVideo.id]: {
        ...prev[currentVideo.id],
        timestamp: seconds,
        duration: accumulatedTime + (prev[currentVideo.id]?.duration || 0)
      }
    }))
    setStartTime(time)
    console.log("handleVideoProgress");
    saveProgress(true)
  }

  const handleVideoEnd = (seconds: number) => {
    setProgress((prev) => ({
      ...prev,
      [currentVideo.id]: { ...prev[currentVideo.id], watched: true, timestamp: seconds }
    }))
    console.log("handleVideoEnd");
    saveProgress(true)
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

  const videoRef = useRef<VideoView>(null)
  const [isLandscape, setIsLandscape] = useState<boolean>(false)

  useEffect(() => {
    const sub = ScreenOrientation.addOrientationChangeListener((event) => {
      const o = event.orientationInfo.orientation
      if (o === ScreenOrientation.Orientation.LANDSCAPE_LEFT || o === ScreenOrientation.Orientation.LANDSCAPE_RIGHT) {
        setIsLandscape(false)
        videoRef.current?.enterFullscreen()
      } else {
        setIsLandscape(true)
      }
    })

      ; (async () => {
        const o = await ScreenOrientation.getOrientationAsync()
        if (o === ScreenOrientation.Orientation.LANDSCAPE_LEFT || o === ScreenOrientation.Orientation.LANDSCAPE_RIGHT) {
          setIsLandscape(false)
          videoRef.current?.enterFullscreen()
        } else {
          setIsLandscape(true)
        }
      })()

    return () => ScreenOrientation.removeOrientationChangeListener(sub)
  }, [isLandscape])

  const selectVideo = (video: VideoInterface) => {
    handleVideoProgress(player.currentTime)
    setCurrentVideo(video)
  }

  const fontSize = Math.max(14, Math.min(18, width * 0.045))

  const BottomTabs: React.FC<Props> = ({ role }: Props) => {
    const router = useRouter()
    const [showModal, setShowModal] = useState(false)

    const handleSignOut = async () => {
      await AsyncStorageRemoveItem('jwt')
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
            <TabItem label="症狀" icon={<FontAwesome name="pencil-square-o" size={24} />} href="/survey" onPress={() => saveProgress(true)} />
          )}
          <TabItem label="影片" icon={<Foundation name="play-video" size={24} />} href="/video" onPress={role === 'P' ? () => saveProgress(true) : undefined} />
          <TabItem label="PSA" icon={<MaterialCommunityIcons name="file-chart-outline" size={24} />} href="/psa" onPress={role === 'P' ? () => saveProgress(true) : undefined} />
          <TabItem label="手冊" icon={<MaterialCommunityIcons name="file-document-multiple-outline" size={24} />} href="/document" onPress={role === 'P' ? () => saveProgress(true) : undefined} />
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
                <TouchableOpacity
                  style={[modal.btn, modal.primary]}
                  onPress={() => {
                    handleSignOut()
                    if (currentRole === 'P') {
                      saveProgress(true)
                    }
                  }}>
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

  function TabItem({ label, icon, href, onPress }: { label: string; icon: React.ReactNode; href: string; onPress?: () => void }) {
    const router = useRouter()

    const handlePress = () => {
      if (onPress) {
        onPress()
      }
      router.push(href)
    }

    return (
      <TouchableOpacity style={bottoms.tabItem} onPress={(e) => { e.preventDefault(); handlePress(); }}>
        <View style={bottoms.tabIcon}>{icon}</View>
        <View style={bottoms.tab}>
          <Text style={bottoms.tabText}>{label}</Text>
        </View>
      </TouchableOpacity>
    )
  }

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
        <View style={[styles.videoWrapper, Platform.OS === 'android' && { marginTop: 16 }]}>
          <VideoView style={styles.video} player={player} ref={videoRef} allowsFullscreen allowsPictureInPicture />
        </View>
        <ScrollView showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollList}>
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
      {isLandscape && <BottomTabs role={currentRole} />}
    </SafeAreaProvider>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG, paddingHorizontal: 16 },
  videoWrapper: { width: '100%', aspectRatio: 16 / 9, borderRadius: 12, overflow: 'hidden', backgroundColor: '#000' },
  video: { width: '100%', height: '100%' },
  scrollList: { paddingTop: 6, paddingBottom: 32 },
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
  itemTitle: { color: TEXT, fontWeight: '600', flexShrink: 1 },
  itemMeta: { flexDirection: 'row', alignItems: 'center', marginLeft: 12 },
  itemMetaText: { marginLeft: 4, fontSize: 14, color: MUTED },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: PRIMARY },
  loadingText: { marginTop: 8, fontSize: 18, color: '#fff', fontWeight: '500' }
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
