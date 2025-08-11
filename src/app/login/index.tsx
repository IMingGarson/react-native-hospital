import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import React, { useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, Alert, Image, Keyboard, SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, useWindowDimensions, View } from 'react-native'
import { AsyncStorageGetItem, AsyncStorageSetItem } from '../utils'

const IMAGE_SOURCE = require('../../assets/images/main.jpg')

const LoginScreen: React.FC = (): JSX.Element => {
  const [email, setEmail] = useState('hasd093156@gmail.com')
  const [password, setPassword] = useState('securepassword')
  const [showPassword, setShowPassword] = useState(false)
  const [role, setRole] = useState('0')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { width } = useWindowDimensions()
  const isWide = width >= 420

  const dynamic = useMemo(() => {
    const titleFont = Math.min(24, Math.max(20, width * 0.058))
    const labelFont = Math.min(16, Math.max(13, width * 0.037))
    const inputFont = Math.min(17, Math.max(14, width * 0.044))
    const buttonFont = Math.min(17, Math.max(15, width * 0.045))
    const verticalGap = 12
    return { titleFont, labelFont, inputFont, buttonFont, verticalGap }
  }, [width])

  useEffect(() => {
    const fetchLoginData = async () => {
      const token = await AsyncStorageGetItem('jwt')
      const storedRole = await AsyncStorageGetItem('role')
      if (!token || !storedRole) return
      router.replace(storedRole === 'M' ? '/nurse' : '/survey')
    }
    fetchLoginData()
  }, [])

  const handleSignIn = async () => {
    setLoading(true)
    try {
      if (!email || !password || !['0', '1'].includes(role)) {
        Alert.alert('錯誤', '所有欄位皆為必填')
        return
      }
      const apiUrl = `https://allgood.peiren.info/api/${role === '0' ? 'user' : 'patient'}/signin`
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })
      const data = await res.json()
      if (res.ok) {
        const token = data.access_token
        const resRole = data.role
        if (!token || !['M', 'P'].includes(resRole)) {
          Alert.alert('登入錯誤', '請通知負責人員')
        } else {
          await AsyncStorageSetItem('jwt', token)
          await AsyncStorageSetItem('role', resRole)
          if (resRole === 'P') {
            await AsyncStorageSetItem('currentPatient', data.data)
          }
          Alert.alert('登入成功')
          router.replace(resRole === 'P' ? '/survey' : '/nurse')
        }
      } else {
        Alert.alert('登入錯誤', '帳號密碼有誤')
      }
    } catch (e) {
      Alert.alert('登入錯誤', '無法連接伺服器，請稍後再試')
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      {loading && (
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={[styles.loadingText, { fontSize: dynamic.labelFont }]}>登入中...</Text>
        </View>
      )}
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={[styles.inner, { paddingHorizontal: isWide ? 32 : 20 }]}>
          <View
            style={[
              styles.imageWrapper,
              {
                width: isWide ? 220 : width * 0.7,
                height: isWide ? 220 : width * 0.7
              }
            ]}>
            <Image source={IMAGE_SOURCE} style={styles.image} resizeMode="cover" accessibilityLabel="登入插圖" />
          </View>

          <View style={[styles.card, isWide && { maxWidth: 480 }]}>
            <Text style={[styles.title, { fontSize: dynamic.titleFont }]}>登入帳號</Text>

            {/* 帳號 */}
            <View style={{ marginBottom: dynamic.verticalGap }}>
              <Text style={[styles.label, { fontSize: dynamic.labelFont }]}>帳號</Text>
              <TextInput
                placeholder="請輸入帳號"
                value={email}
                onChangeText={setEmail}
                placeholderTextColor="#8f9aa3"
                style={[
                  styles.input,
                  {
                    paddingVertical: 12,
                    paddingHorizontal: 14,
                    fontSize: dynamic.inputFont
                  }
                ]}
              />
            </View>

            {/* 密碼 */}
            <View style={{ marginBottom: dynamic.verticalGap }}>
              <Text style={[styles.label, { fontSize: dynamic.labelFont }]}>密碼</Text>
              <View style={styles.passwordWrapper}>
                <TextInput
                  placeholder="請輸入密碼"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                  placeholderTextColor="#8f9aa3"
                  style={[
                    styles.input,
                    {
                      paddingVertical: 12,
                      paddingHorizontal: 14,
                      fontSize: dynamic.inputFont,
                      paddingRight: 44
                    }
                  ]}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword((v) => !v)}
                  style={styles.eyeButton}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  accessible
                  accessibilityLabel={showPassword ? '隱藏密碼' : '顯示密碼'}>
                  <MaterialCommunityIcons name={showPassword ? 'eye-off' : 'eye'} size={22} color="#4f4f4f" />
                </TouchableOpacity>
              </View>
            </View>

            {/* 角色選擇 segmented */}
            <View style={styles.segmentContainer}>
              <TouchableOpacity
                onPress={() => setRole('0')}
                style={[styles.segmentButton, role === '0' ? styles.segmentActive : { borderRightWidth: 1, borderRightColor: '#cfd9e5' }]}
                disabled={loading}>
                <Text style={[styles.segmentText, { fontSize: dynamic.labelFont }, role === '0' ? styles.segmentTextActive : null]}>醫護人員</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setRole('1')} style={[styles.segmentButton, role === '1' ? styles.segmentActive : null]} disabled={loading}>
                <Text style={[styles.segmentText, { fontSize: dynamic.labelFont }, role === '1' ? styles.segmentTextActive : null]}>一般民眾</Text>
              </TouchableOpacity>
            </View>

            {/* 按鈕列 */}
            <View style={styles.actionRow}>
              <TouchableOpacity onPress={handleSignIn} disabled={loading} style={[styles.primaryBtn, loading && { opacity: 0.65 }]} accessibilityRole="button" accessibilityLabel="登入">
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={[styles.primaryText, { fontSize: dynamic.buttonFont }]}>登入</Text>}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => router.push('/register')} style={[styles.registerBtn]} accessibilityRole="button" accessibilityLabel="註冊">
                <Text style={[styles.registerText, { fontSize: dynamic.buttonFont }]}>註冊</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  )
}

export default LoginScreen

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f5f9'
  },
  inner: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12
  },
  imageWrapper: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 8,
    backgroundColor: '#e2e8f0'
  },
  image: {
    width: '100%',
    height: '100%'
  },
  card: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingVertical: 24,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 8,
    gap: 12
  },
  title: {
    fontWeight: '600',
    textAlign: 'center',
    color: '#1f2d3a',
    marginBottom: 4
  },
  label: {
    color: '#2f3e50',
    fontWeight: '500',
    marginBottom: 4
  },
  input: {
    backgroundColor: '#f7f9fb',
    borderWidth: 1,
    borderColor: '#d1d7dd',
    borderRadius: 12,
    color: '#1f2d3a'
  },
  passwordWrapper: {
    position: 'relative'
  },
  eyeButton: {
    position: 'absolute',
    right: 12,
    top: '50%',
    transform: [{ translateY: -11 }]
  },
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: '#eef4f7',
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#d1d7dd',
    marginTop: 6
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center'
  },
  segmentActive: {
    backgroundColor: '#2596be'
  },
  segmentText: {
    fontWeight: '600',
    color: '#33475b'
  },
  segmentTextActive: {
    color: '#fff'
  },
  actionRow: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center'
  },
  primaryBtn: {
    flex: 1,
    backgroundColor: '#2596be',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14
  },
  primaryText: {
    color: '#fff',
    fontWeight: '600'
  },
  registerBtn: {
    flex: 1,
    marginLeft: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    justifyContent: 'center',
    borderColor: '#2596be',
    backgroundColor: '#EEF2FF'
  },
  registerText: {
    color: '#2596be',
    fontWeight: '500'
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 50,
    padding: 20
  },
  loadingText: {
    marginTop: 12,
    color: '#fff'
  }
})
