import { MaterialCommunityIcons } from '@expo/vector-icons'
import Ionicons from '@expo/vector-icons/Ionicons'
import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker'
import { useRouter } from 'expo-router'
import { useCallback, useState } from 'react'
import { ActivityIndicator, Alert, Keyboard, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native'
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context'

export default function RegisterScreen() {
  const [email, setEmail] = useState<string>('')
  const [name, setName] = useState<string>('')
  const [password, setPassword] = useState<string>('')
  const [confirmPassword, setConfirmPassword] = useState<string>('')
  const [showPassword, setShowPassword] = useState<boolean>(false)
  const [showAgainPassword, setShowAgainPassword] = useState<boolean>(false)
  const [loading, setLoading] = useState<boolean>(false)
  const [date, setDate] = useState<Date | undefined>(new Date())
  const [show, setShow] = useState<boolean>(false)
  const [inviteCode, setInviteCode] = useState<string>('')
  const router = useRouter()

  const onChange = useCallback((_: DateTimePickerEvent, selectedDate: Date | undefined) => {
    if (selectedDate) {
      if (selectedDate > new Date()) {
        Alert.alert('錯誤', '不可選擇未來日期')
        setShow(false)
        return
      }
      setDate(selectedDate)
    }
    setShow(false)
  }, [])

  const showMode = (): void => {
    setShow(true)
  }

  const toggleShowPassword = (): void => {
    setShowPassword((prev) => !prev)
  }

  const toggleShowAgainPassword = (): void => {
    setShowAgainPassword((prev) => !prev)
  }

  const handleSignup = async (): Promise<void> => {
    if (!email || !password || !confirmPassword || !name || !date || !inviteCode) {
      Alert.alert('錯誤', '所有欄位皆為必填')
      return
    }
    if (password !== confirmPassword) {
      Alert.alert('錯誤', '確認密碼有誤')
      return
    }
    if (inviteCode !== 'FRS24680') {
      Alert.alert('錯誤', '無效的邀請碼')
      return
    }
    setLoading(true)
    try {
      const response = await fetch('https://allgood.peiren.info/api/patient', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email,
          password,
          name,
          birthday: date.toISOString().split('T')[0],
          inviteCode
        })
      })

      const data = await response.json()
      if (response.ok) {
        Alert.alert('註冊成功', '請回到首頁登入')
        router.replace('/login')
      } else {
        Alert.alert('註冊失敗', data.message || '請稍後再試')
      }
    } catch (error) {
      Alert.alert('錯誤', '無法連接伺服器，請稍後再試')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.outerContainer}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtnWrap} onPress={() => router.replace('/login')}>
            <View style={styles.backRow}>
              <Ionicons name="arrow-back-circle-sharp" style={styles.prevBtn} />
              <Text style={styles.backText}>{'上一頁'}</Text>
            </View>
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={0}>
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false} overScrollMode="never">
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>建立帳號</Text>

                {/* 帳號 */}
                <Text style={styles.label}>帳號</Text>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.input}
                    value={email}
                    onChangeText={setEmail}
                    placeholder="可輸入大小寫英文數字或是特殊符號"
                    autoCapitalize="none"
                    editable={!loading}
                    placeholderTextColor="#8f9aa3"
                  />
                </View>

                {/* 密碼 */}
                <Text style={styles.label}>密碼</Text>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.input}
                    secureTextEntry={!showPassword}
                    value={password}
                    onChangeText={setPassword}
                    placeholder="輸入密碼"
                    editable={!loading}
                    placeholderTextColor="#8f9aa3"
                  />
                  <TouchableOpacity onPress={toggleShowPassword} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <MaterialCommunityIcons name={showPassword ? 'eye-off' : 'eye'} size={20} color="#4f4f4f" style={styles.eyeIcon} />
                  </TouchableOpacity>
                </View>

                {/* 確認密碼 */}
                <Text style={styles.label}>確認密碼</Text>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.input}
                    secureTextEntry={!showAgainPassword}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder="再次輸入密碼"
                    editable={!loading}
                    placeholderTextColor="#8f9aa3"
                  />
                  <TouchableOpacity onPress={toggleShowAgainPassword} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <MaterialCommunityIcons name={showAgainPassword ? 'eye-off' : 'eye'} size={20} color="#4f4f4f" style={styles.eyeIcon} />
                  </TouchableOpacity>
                </View>

                {/* 姓名 */}
                <Text style={styles.label}>姓名</Text>
                <View style={styles.inputContainer}>
                  <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="你的名字" editable={!loading} placeholderTextColor="#8f9aa3" />
                </View>

                {/* 邀請碼 */}
                <Text style={styles.label}>邀請碼</Text>
                <View style={styles.inputContainer}>
                  <TextInput style={styles.input} value={inviteCode} onChangeText={setInviteCode} placeholder="填入邀請碼" editable={!loading} placeholderTextColor="#8f9aa3" />
                </View>

                {/* 生日 */}
                <Text style={styles.label}>生日</Text>
                <TouchableOpacity activeOpacity={1} onPress={() => showMode()}>
                  <View style={[styles.inputContainer, styles.dateContainer]}>
                    <TextInput style={[styles.input, { flex: 1 }]} value={date ? date.toISOString().split('T')[0] : ''} editable={false} placeholder="選擇生日" placeholderTextColor="#8f9aa3" />
                    <MaterialIcons name="touch-app" size={20} color="#4f4f4f" style={styles.eyeIcon} />
                    {show && (
                      <DateTimePicker
                        value={date || new Date()}
                        mode="date"
                        display={Platform.OS === 'ios' ? 'default' : 'spinner'}
                        onChange={onChange}
                        maximumDate={new Date()}
                        minimumDate={new Date(1900, 0, 1)}
                      />
                    )}
                  </View>
                </TouchableOpacity>

                {/* Submit */}
                <TouchableOpacity onPress={handleSignup} style={[styles.primaryButton, loading && { opacity: 0.6 }]} disabled={loading} accessibilityRole="button" accessibilityLabel="送出註冊">
                  {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>送出</Text>}
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </SafeAreaProvider>
  )
}

const PRIMARY = '#6366F1'
const BG = '#f0f5f9'
const CARD_BG = '#fff'
const INPUT_BG = '#f7f9fb'
const BORDER = '#d1d7dd'

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    backgroundColor: BG,
    paddingVertical: 8
  },
  header: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: BG
  },
  backBtnWrap: {
    width: '30%'
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  prevBtn: {
    fontSize: 30,
    marginTop: 2.5,
    color: '#303030'
  },
  backText: {
    fontSize: 15,
    paddingLeft: 6,
    color: '#1f2d3a'
  },
  scrollContent: {
    paddingHorizontal: 20,
    alignItems: 'center'
  },
  card: {
    width: '100%',
    maxWidth: 500,
    backgroundColor: CARD_BG,
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 20,
    gap: 10
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '600',
    textAlign: 'center',
    color: '#1f2d3a',
    marginBottom: 12
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#33475b',
    marginBottom: 6,
    marginTop: 6
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: INPUT_BG,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 2
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#1f2d3a',
    padding: 0,
    margin: 0
  },
  eyeIcon: {
    marginLeft: 6
  },
  dateContainer: {
    paddingRight: 8
  },
  primaryButton: {
    marginTop: 18,
    backgroundColor: PRIMARY,
    borderRadius: 12,
    paddingVertical: 14,
    justifyContent: 'center',
    alignItems: 'center'
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600'
  }
})
