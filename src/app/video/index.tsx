import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Dimensions,
  Button,
  Alert,
} from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEventListener  } from 'expo';
import { AsyncStorageGetItem } from '../utils';
import { useRouter } from 'expo-router';
import BottomTabs from '../bottomTabs';

interface VideoInterface {
  id: string;
  title: string;
  uri: string;
  watched: boolean;
  timestamp: number;
  duration: number;
}

interface ProgressState {
  [key: string]: VideoInterface;
}

export default function VideoScreen() {
  const [currentVideo, setCurrentVideo] = useState<VideoInterface>({
    id: '1', 
    title: '影片 1',
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
      title: '影片 1',
      uri: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/VolkswagenGTIReview.mp4',
      timestamp: 0,
      watched: false,
      duration: 0
    },
    {
      id: '2', 
      title: '影片 2',
      uri: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
      timestamp: 0,
      watched: false,
      duration: 0
    },
    {
      id: '3', 
      title: '影片 3',
      uri: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
      timestamp: 0,
      watched: false,
      duration: 0
    }
  ]);
  const [currentRole, setCurrentRole] = useState<string>("");

  const isJsonString = (data: string | null) => {
    if (!data) {
      return false;
    }
    try {
        JSON.parse(data);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (e: unknown) {
      return false;
    }
    return true;
  }

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
        const response = await fetch('http://10.0.2.2:5000/api/patient/get', {
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
  }, []);

  const saveProgress = async () => {
    try {
      const token = await AsyncStorageGetItem('jwt');
      if (!token) {
        Alert.alert('錯誤', '無法儲存進度');
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
      // http://10.0.2.2:5000
      const response = await fetch('http://10.0.2.2:5000/api/patient/update_data', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          video_progression_data: JSON.stringify(data)
        }),
      });
      Alert.alert('data', JSON.stringify(data, null, 2));
      await response.json();
      if (response.ok) {
        Alert.alert('成功', '儲存進度成功');
      }
    } catch (error) {
      Alert.alert('失敗', '儲存進度時發生錯誤');
      console.error('儲存進度時發生錯誤:', error);
    }
    router.reload();
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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>取得資料中</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
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
      { currentRole === 'P' ? <Button onPress={() => saveProgress()} title="儲存觀看進度" /> : null }
      <BottomTabs role={currentRole} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff6e5',
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
  },
  loadingText: {
    fontSize: 18,
    color: '#804000',
  },
});