import { MaterialCommunityIcons, Foundation, MaterialIcons } from "@expo/vector-icons";
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useRouter, Link } from "expo-router";
import { Modal, Text, View, StyleSheet, TouchableOpacity, Alert, Platform } from "react-native";
import { AsyncStorageRemoveItem } from "../utils";
import { useState } from "react";
import { appTheme } from 'src/config/theme';
import { SafeAreaView } from 'react-native-safe-area-context';
interface Props {
  role: string,
  customedStyle?: Styles
}

interface Styles {
  [key: string]: string | number
}

export default function BottomTabs({ role, customedStyle }: Props) {
  const router = useRouter();
  const [showModal, setShowModal] = useState<boolean>(false);

  const handleSignOut = async () => {
    await AsyncStorageRemoveItem('token');
    await AsyncStorageRemoveItem('role');
    setShowModal(false);
    Alert.alert("登出成功");
    router.replace('/login');
    return;
  }

  return (
    <SafeAreaView edges={['bottom']} style={bottomsList.bottomSafeview}>
      <View style={[bottomsList.container, {...customedStyle}]}>
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
              <Link href="/survey">
                <FontAwesome name="pencil-square-o" size={24} style={bottomsList.tabIcon} />
              </Link>
              <Link href="/survey">
                <Text style={bottomsList.tabText}>症狀</Text>
              </Link>
            </View>
          )}
        <View style={[bottomsList.tabItem]}>
          <Link href="/video">
            <Foundation name="play-video" style={bottomsList.tabIcon} />
          </Link>
          <Link href="/video">
            <Text style={bottomsList.tabText}>影片</Text>
          </Link>
        </View>
        <View style={bottomsList.tabItem}>
          <Link href="/psa">
            <MaterialCommunityIcons name="file-chart-outline" size={24} style={bottomsList.tabIcon} />
          </Link>
          <Link href="/psa">
            <Text style={bottomsList.tabText}>PSA</Text>
          </Link>
        </View>
        <View style={bottomsList.tabItem}>
          <Link href="/document">
            <MaterialCommunityIcons name="file-document-multiple-outline" style={bottomsList.tabIcon}/>
          </Link>
          <Link href="/document">
            <Text style={bottomsList.tabText}>手冊</Text>
          </Link>
        </View>
        <View style={bottomsList.tabItem}>
          <MaterialIcons onPress={() => setShowModal(true)} name="logout" style={bottomsList.tabIcon}/>
          <TouchableOpacity
            onPress={() => setShowModal(true)}
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
    paddingBottom: 0,
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
