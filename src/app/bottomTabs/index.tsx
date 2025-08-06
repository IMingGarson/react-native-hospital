import React, { useState } from 'react'
import { MaterialCommunityIcons, Foundation, MaterialIcons } from '@expo/vector-icons'
import FontAwesome from '@expo/vector-icons/FontAwesome'
import { useRouter, Link } from 'expo-router'
import { Modal, Text, View, StyleSheet, TouchableOpacity, Alert } from 'react-native'
import { AsyncStorageRemoveItem } from '../utils'
import { SafeAreaView } from 'react-native-safe-area-context'

const PRIMARY = '#6366F1'
const SURFACE = '#fff'
const BORDER = '#d1d7dd'
const TEXT = '#1f2d3a'
const MUTED = '#6b7280'
const TEXT_SECONDARY = '#33475b'
interface Styles {
  [key: string]: string | number
}

interface Props {
  role: string
  customedStyle?: Record<string, Styles>
}

export default function BottomTabs({ role, customedStyle }: Props) {
  const router = useRouter()
  const [showModal, setShowModal] = useState(false)

  const handleSignOut = async () => {
    await AsyncStorageRemoveItem('token')
    await AsyncStorageRemoveItem('role')
    setShowModal(false)
    Alert.alert('登出成功')
    router.replace('/login')
  }

  return (
    <SafeAreaView edges={['bottom']} style={bottoms.bottomSafeview}>
      <View style={[bottoms.container, customedStyle]}>
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

const bottoms = StyleSheet.create({
  bottomSafeview: {
    backgroundColor: SURFACE
  },
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: BORDER,
    backgroundColor: SURFACE,
    paddingVertical: 8
  },
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

const modal = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  content: {
    width: '80%',
    backgroundColor: SURFACE,
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
    backgroundColor: SURFACE,
    borderColor: MUTED
  },
  btnText: {
    fontSize: 15,
    fontWeight: '600'
  }
})
