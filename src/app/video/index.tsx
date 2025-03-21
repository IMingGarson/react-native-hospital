import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Dimensions,
  Alert,
  AppState,
  Modal,
  Platform,
} from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEventListener  } from 'expo';
import { AsyncStorageGetItem, AsyncStorageRemoveItem, isJsonString } from '../utils';
import { Link, useRouter } from 'expo-router';
import { VideoInterface, ProgressState } from '../interfaces';
import { MaterialCommunityIcons, MaterialIcons, Foundation, FontAwesome } from '@expo/vector-icons';
import { appTheme } from 'src/config/theme';
import { SafeAreaView } from 'react-native-safe-area-context';
interface Props {
  role: string,
}

export default function VideoScreen() {
  const [currentVideo, setCurrentVideo] = useState<VideoInterface>({
    id: '1', 
    title: '正確洗手方法，你做對了嗎？',
    uri: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/VolkswagenGTIReview.mp4',
    timestamp: 0,
    watched: false,
    duration: 0,
  });
  const router = useRouter();
  const [startTime, setStartTime] = useState<number>(Date.now());
  const [loading, setLoading] = useState<boolean>(true);
  const [progress, setProgress] = useState<ProgressState>({});
  const [videos] = useState<VideoInterface[]>([
    {
      id: '1', 
      title: '正確洗手方法，你做對了嗎？',
      uri: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/VolkswagenGTIReview.mp4',
      timestamp: 0,
      watched: false,
      duration: 0
    },
    {
      id: '2', 
      title: '遠離三高：健康飲食祕訣',
      uri: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
      timestamp: 0,
      watched: false,
      duration: 0
    },
    {
      id: '3', 
      title: '如何輕鬆養成規律運動習慣？',
      uri: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
      timestamp: 0,
      watched: false,
      duration: 0
    }
  ]);
  const [currentRole, setCurrentRole] = useState<string>("");

  const fetchProgress = async () => {
    const token = await AsyncStorageGetItem('jwt');
    const role = await AsyncStorageGetItem('role');
    if (
      typeof token === 'string'
      && typeof role === 'string'
      && token.length
      && ['M', 'P'].includes(role)
    ) {
      setCurrentRole(role);
    } else {
      Alert.alert('錯誤', '無法取得資料');
      router.replace('/login');
    }
    if (role === 'P') {
      try {
        const response = await fetch('https://allgood.peiren.info/api/patient/get', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          }
        });

        const data = await response.json();
        if (response.ok) {
          const updatedProgress: ProgressState = {};
          if (isJsonString(data.patient.video_progression_data)) {
            const progressionData = JSON.parse(data.patient.video_progression_data);
            progressionData.forEach((item: VideoInterface) => {
              updatedProgress[item.id] = { ...item };
            });
            setCurrentVideo(progressionData[0]);
          } else {
            videos.forEach((item: VideoInterface) => {
              updatedProgress[item.id] = { ...item };
            });
            setCurrentVideo(videos[0]);
          }
          setProgress(updatedProgress);
        }
      } catch (error) {
        console.error('獲取觀看記錄時發生錯誤:', error);
      } finally {
        setLoading(false);
      }
    } else {
      setLoading(false);
      const updatedProgress: ProgressState = {};
      videos.forEach((item: VideoInterface) => {
        updatedProgress[item.id] = { ...item };
      });
      setCurrentVideo(videos[0]);
      setProgress(updatedProgress);
    }
  };

  useEffect(() => {
    fetchProgress();
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState.match(/inactive|background/)) {
        if (currentRole === 'P') {
          saveProgress(true);
        }
      }
    });
    return () => {
      subscription.remove();
    };
  }, []);

  const saveProgress = async (background: boolean = false) => {
    try {
      const token = await AsyncStorageGetItem('jwt');
      if (!token) {
        if (!background) {
          Alert.alert('錯誤', '無法儲存進度');
        }
        return;
      }
      
      const data = Object.keys(progress).map(function(videoId: string) {
        if (videoId === currentVideo.id) {
          const accumulatedTime = Math.ceil((Date.now() - startTime) / 1000);
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
          duration: progress[videoId].duration,
        }
      });
      setStartTime(Date.now());
      // https://allgood.peiren.info
      const response = await fetch('https://allgood.peiren.info/api/patient/update_data', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          video_progression_data: JSON.stringify(data)
        }),
      });
      await response.json();
      if (response.ok) {
        if (!background) {
          Alert.alert('成功', '儲存進度成功');
          router.reload();
        }
      }
    } catch (error) {
      if (!background) {
        Alert.alert('失敗', '儲存進度時發生錯誤');
        console.error('儲存進度時發生錯誤:', error);
      }
    }
  };

  const handleVideoProgress = (seconds: number) => {
    const accumulatedTime = Math.ceil((Date.now() - startTime) / 1000);
    setProgress((prev) => ({
      ...prev,
      [currentVideo.id]: { 
        ...prev[currentVideo.id], 
        timestamp: seconds, 
        duration: accumulatedTime + (prev[currentVideo.id]?.duration || 0)
      },
    }));
    setStartTime(Date.now());
  };

  const handleVideoEnd = (seconds: number) => {
    setProgress((prev) => ({
      ...prev,
      [currentVideo.id]: { ...prev[currentVideo.id], watched: true, timestamp: seconds },
    }));
  };

  const selectVideo = (video: VideoInterface) => {
    handleVideoProgress(player.currentTime);
    setCurrentVideo(video);
  };

  const player = useVideoPlayer(currentVideo.uri, player => {
    player.pause();
    player.currentTime = progress[currentVideo.id]?.timestamp || 0;
  });

  useEventListener(player, 'statusChange', () => {
    handleVideoProgress(player.currentTime);
    if (Math.abs(player.duration - player.currentTime) <= 10) {
      handleVideoEnd(player.currentTime);
    }
  });

  useEventListener(player, 'playingChange', () => {
    handleVideoProgress(player.currentTime);
    if (Math.abs(player.duration - player.currentTime) <= 10) {
      handleVideoEnd(player.currentTime);
    }
  });

  const BottomTabs = ({ role }: Props) => {
    const router = useRouter();
    const [showModal, setShowModal] = useState<boolean>(false);

    const handleSignOut = async () => {
      saveProgress(true);
      await AsyncStorageRemoveItem('token');
      await AsyncStorageRemoveItem('role');
      setShowModal(false);
      Alert.alert("登出成功");
      router.replace('/login');
      return;
    }

    return (
      <SafeAreaView edges={['bottom']} style={bottomsList.bottomSafeview}>
        <View style={[bottomsList.container]}>
          { role === 'M' ? (
            <View style={bottomsList.tabItem}>
              <Link href="/nurse">
                <MaterialCommunityIcons name="emoticon-sick-outline" style={bottomsList.tabIcon}/>
              </Link>
              <Link href="/nurse">
                <Text style={bottomsList.tabText}>病人列表</Text>
              </Link>
            </View>
            ) : (
              <View style={bottomsList.tabItem}>
                <Link href="/survey" onPress={() => { saveProgress(true); }}>
                  <FontAwesome name="pencil-square-o" size={24} style={bottomsList.tabIcon} />
                </Link>
                <Link href="/survey" onPress={() => { saveProgress(true); }}>
                  <Text style={bottomsList.tabText}>症狀</Text>
                </Link>
              </View>
            )}
            <View style={[bottomsList.tabItem]}>
              <Link href="/video" onPress={() => { saveProgress(true); }}>
                <Foundation name="play-video" style={bottomsList.tabIcon} />
              </Link>
              <Link href="/video" onPress={() => { saveProgress(true); }}>
                <Text style={bottomsList.tabText}>影片</Text>
              </Link>
            </View>
            <View style={bottomsList.tabItem}>
              <Link href="/psa" onPress={() => { saveProgress(true); }}>
                <MaterialCommunityIcons name="file-chart-outline" size={24} style={bottomsList.tabIcon} />
              </Link>
              <Link href="/psa" onPress={() => { saveProgress(true); }}>
                <Text style={bottomsList.tabText}>PSA</Text>
              </Link>
            </View>
            <View style={bottomsList.tabItem}>
              <Link href="/document" onPress={() => { saveProgress(true); }}>
                <MaterialCommunityIcons name="file-document-multiple-outline" style={bottomsList.tabIcon}/>
              </Link>
              <Link href="/document" onPress={() => { saveProgress(true); }}>
                <Text style={bottomsList.tabText}>手冊</Text>
              </Link>
            </View>
            <View style={bottomsList.tabItem}>
              <MaterialIcons onPress={() => { setShowModal(true); }} name="logout" style={bottomsList.tabIcon}/>
              <TouchableOpacity
                onPress={() => { setShowModal(true); }}
              >
                <Text style={bottomsList.tabText}>登出</Text>
              </TouchableOpacity>
            </View>
            <Modal
              visible={showModal}
              transparent={true}
              onRequestClose={() => setShowModal(false)}
            >
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
    );
  }
  return (
    <>
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.topSafeview}>
        <View style={styles.videoContainer}>
          <VideoView 
            style={styles.video} 
            player={player}
            allowsFullscreen 
            allowsPictureInPicture
          />
        </View>
        <FlatList
          data={Object.values(progress)}
          keyExtractor={(_, index) => index.toString()}
          renderItem={({ item }) => {
            const isCurrentVideo = item.id === currentVideo.id;
            return (
              <TouchableOpacity
                style={[styles.listItem, isCurrentVideo && styles.activeListItem]}
                onPress={() => selectVideo(item)}
              >
                <Text style={styles.listItemTitle}>{item.title}</Text>
              </TouchableOpacity>
            );
          }}
        />
      </SafeAreaView>
      <BottomTabs role={currentRole} />
    </>
  );
};

const modal = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '80%',
    height: 150,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-around',
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 20,
  },
  modalTitle: {
    display: 'flex',
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
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
    marginHorizontal: 45,
  },
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
    borderTopColor: 'rgba(0, 0, 0, 0.3)',
  },
  tabItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 5,
  },
  tabText: {
    display: 'flex',
    fontSize: 14,
    color: 'black',
  },
  tabIcon: {
    display: 'flex',
    fontSize: 34,
    color: '#303030',
  },
});

const styles = StyleSheet.create({
  topSafeview: { 
    flex: 1, 
    backgroundColor: appTheme.primary, 
    paddingTop: Platform.OS === 'android' ? 0 : 10
  },
  saveBotton: {
    paddingVertical: 5,
  },
  videoContainer: {
    backgroundColor: '#ffe4b2',
    width: '100%',
    height: Dimensions.get('window').width * 0.5625,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  video: {
    width: '100%',
    height: '100%',
  },
  listItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#d1a679',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  activeListItem: {
    backgroundColor: '#ffd59a',
  },
  listItemTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#663300',
  },
  listItemStatus: {
    fontSize: 14,
    color: '#804000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: appTheme.primary,
  },
  loadingText: {
    fontSize: 18,
    color: '#804000',
  },
});