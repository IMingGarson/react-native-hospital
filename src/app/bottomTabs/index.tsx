import { MaterialCommunityIcons, Foundation, MaterialIcons } from "@expo/vector-icons";
import { useRouter, Link } from "expo-router";
import { Text, View, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { AsyncStorageRemoveItem } from "../utils";

interface Props {
  role: string,
  customedStyle?: Styles
}

interface Styles {
  [key: string]: string | number
}

export default function BottomTabs({ role, customedStyle }: Props) {
  const router = useRouter();

  const handleSignOut = async () => {
    await AsyncStorageRemoveItem('token');
    await AsyncStorageRemoveItem('role');
    Alert.alert("登出成功");
    router.replace('/login');
    return;
  }
  return (
    <View style={[bottomsList.container, {...customedStyle}]}>
      { role === 'M' ? (
        <View style={bottomsList.tabItem}>
          <MaterialCommunityIcons name="emoticon-sick-outline" style={bottomsList.tabIcon}/>
            <Link href="/nurse">
                <Text style={bottomsList.tabText}>病人列表</Text>
            </Link>
        </View>
        ) : (<View style={bottomsList.tabItem}>
            <Link href="/survey"><MaterialIcons name="question-answer" size={24} color="black" style={bottomsList.tabIcon} /></Link>
              <Link href="/survey">
                <Text style={bottomsList.tabText}>自我評量</Text>
              </Link>
          </View>)
        }
        <View style={[bottomsList.tabItem]}>
        <Foundation name="play-video" style={bottomsList.tabIcon} />
          <Link href="/video">
              <Text style={bottomsList.tabText}>衛教影片</Text>
          </Link>
        </View>
        <View style={bottomsList.tabItem}>
          <MaterialCommunityIcons name="file-document-multiple-outline" style={bottomsList.tabIcon}/>
          <Link href="/psa">
              <Text style={bottomsList.tabText}>PSA紀錄</Text>
          </Link>
        </View>
        <View style={bottomsList.tabItem}>
          <MaterialCommunityIcons name="file-document-multiple-outline" style={bottomsList.tabIcon}/>
          <Link href="/document">
              <Text style={bottomsList.tabText}>衛教文件</Text>
          </Link>
        </View>
        <View style={bottomsList.tabItem}>
          <MaterialIcons name="logout" style={bottomsList.tabIcon}/>
          <TouchableOpacity
            onPress={handleSignOut}
          >
            <Text style={bottomsList.tabText}>登出</Text>
          </TouchableOpacity>
        </View>
    </View>
  )
}

const bottomsList = StyleSheet.create({
  container: {
    width: '100%',
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    bottom: 0,
    backgroundColor: '#F8F8F8',
    borderTopWidth: 1,
    borderTopColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
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
    // fontWeight: 'bold',
  },
  tabIcon: {
    display: 'flex',
    fontSize: 34,
    color: '#303030',
  },
});