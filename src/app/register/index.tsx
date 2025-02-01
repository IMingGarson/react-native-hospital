import styled from 'styled-components/native'
import { StyleSheet, TextInput, View, Alert, TouchableOpacity, Button, Platform, Keyboard, TouchableWithoutFeedback, ScrollView, KeyboardAvoidingView } from "react-native";
import React, { useState } from "react";
import { appTheme } from 'src/config/theme'
import { MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useRouter } from "expo-router";
import { usePushNotifications } from '../utils/usePushNotification';

export default function RegisterScreen() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showAgainPassword, setShowAgainPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [show, setShow] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const router = useRouter();
  const { expoPushToken } = usePushNotifications();

  const onChange = (_: DateTimePickerEvent, selectedDate: Date | undefined) => {
    const currentDate = selectedDate;
    setDate(currentDate);
    setShow(false);
  };

  const showMode = () => {
    setShow(true);
  };

  const toggleShowPassword = () => {
    setShowPassword(!showPassword);
  };

  const toggleShowAgainPassword = () => {
    setShowAgainPassword(!showAgainPassword);
  }

  const handleSignup = async () => {
    if (!email || !password || !confirmPassword || !name || !date || !inviteCode) {
      Alert.alert('錯誤', '所有欄位皆為必填');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('錯誤', '確認密碼有誤');
      return;
    }
    if (inviteCode !== '123456') {
      Alert.alert('錯誤', '無效的邀請碼');
      return;
    }
    setLoading(true);
    try {
      const response = await fetch('https://allgood.peiren.info/api/patient', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          name,
          birthday: date.toISOString().split('T')[0],
          inviteCode,
          pushToken: expoPushToken
        }),
      });

      const data = await response.json();
      if (response.ok) {
        Alert.alert('註冊成功', '請回到首頁登入');
        router.replace('/login');
      } else {
        Alert.alert('註冊失敗', data.message || '請稍後再試');
      }
    } catch (error) {
      Alert.alert('錯誤', '無法連接伺服器，請稍後再試');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.ScreenContainer}
        enabled
      >
        <ScrollView showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false} overScrollMode='never'>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View>
              <S.Text>帳號</S.Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={[styles.input]}
                  value={email}
                  onChangeText={setEmail}
                />
              </View>
              <S.Text>密碼</S.Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={[styles.input]}
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                />
                <MaterialCommunityIcons
                  name={showPassword ? 'eye-off' : 'eye'}
                  size={20}
                  color="#000"
                  onPress={toggleShowPassword}
                  style={{ 'marginLeft': -30 }}
                />
              </View>
              <S.Text>確認密碼</S.Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={[styles.input]}
                  secureTextEntry={!showAgainPassword}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                />
                <MaterialCommunityIcons
                    name={showAgainPassword ? 'eye-off' : 'eye'}
                    size={20}
                    color="#000"
                    onPress={toggleShowAgainPassword}
                    style={{ 'marginLeft': -30 }}
                />
              </View>
              <S.Text>姓名</S.Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={[styles.input]}
                  value={name}
                  onChangeText={setName}
                />
              </View>
              <S.Text>邀請碼</S.Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={[styles.input]}
                  value={inviteCode}
                  onChangeText={setInviteCode}
                />
              </View>
              <S.Text>生日</S.Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={[styles.input]}
                  value={date?.toISOString().split('T')[0]}
                  readOnly
                />
                {show && (
                  <DateTimePicker
                    display='spinner'
                    value={date || new Date()}
                    mode="date"
                    onChange={onChange}
                  />
                )}
              </View>
              <Button onPress={showMode} title="選擇日期" />
          
            </View>
          </TouchableWithoutFeedback>
          <TouchableOpacity
            onPress={handleSignup}
            style={bottomsList.container}
            disabled={loading}
          >
            <View style={bottomsList.button}>
              <S.Text>送出</S.Text>
            </View>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
  )
}

const bottomsList = StyleSheet.create({
  container: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    marginTop: 20,
  },
  button: {
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderColor: 'gray',
    color: '#000',
    borderRadius: 5,
    backgroundColor: '#fff',
    marginHorizontal: 45,
  },
});

const styles = StyleSheet.create({
    ScreenContainer: {
      flex: 1, 
      height: '100%',
      flexDirection: 'column', 
      justifyContent: 'center',
      backgroundColor: appTheme.background,   
      paddingHorizontal: 20,
      paddingTop: 100,
    },
    button: {
      borderWidth: 1,
      paddingTop: 10,
      paddingBottom: 10,
      paddingLeft: 20,
      paddingRight: 20,
      borderColor: 'black',
      borderRadius: 5,
      backgroundColor: 'transparent',
    },
    inputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      borderColor: '#000',
      paddingVertical: 10,
    },
    input: {
      width: '100%',
      paddingVertical: 8,
      paddingHorizontal: 12,
      fontSize: 24,
      backgroundColor: '#f9f9f9',
      borderWidth: 1,
      borderColor: '#d1d1d6',
      borderRadius: 8,
    },
    focusedInput: {
      borderColor: '#007aff',
      shadowColor: '#007aff',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.25,
      shadowRadius: 3,
    },
    darkInput: {
      color: '#f2f2f7',
      backgroundColor: '#1c1c1e',
      borderColor: '#3a3a3c',
    },
  });

 const S = {
    View: styled.View`
      gap: 10px;
      background-color: ${appTheme.background};
    `,
    Content: styled.View`
      gap: 10px;
    `,
    Title: styled.Text`
      font-size: ${(p) => p.theme.size(150, 'px')};
    `,
    Text: styled.Text`
      color: ${(p) => p.theme.text};
      font-family: madeRegular;
      font-size: ${(p) => p.theme.size(18, 'px')};
    `
  }