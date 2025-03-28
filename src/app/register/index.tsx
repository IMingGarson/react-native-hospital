import styled from 'styled-components/native';
import { Text, StyleSheet, TextInput, View, Alert, TouchableOpacity, Platform, Keyboard, TouchableWithoutFeedback, ScrollView, KeyboardAvoidingView, Pressable } from "react-native";
import React, { useState } from "react";
import { appTheme } from 'src/config/theme'
import { MaterialCommunityIcons } from '@expo/vector-icons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useRouter } from "expo-router";
import Ionicons from '@expo/vector-icons/Ionicons';

export default function RegisterScreen() {
  const [email, setEmail] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showAgainPassword, setShowAgainPassword] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [show, setShow] = useState<boolean>(false);
  const [inviteCode, setInviteCode] = useState<string>('');
  const router = useRouter();

  const onChange = (_: DateTimePickerEvent, selectedDate: Date | undefined): void => {
    setDate(selectedDate);
    setShow(false);
  };

  const showMode = (): void => {
    setShow(true);
  };

  const toggleShowPassword = (): void => {
    setShowPassword((prev) => !prev);
  };

  const toggleShowAgainPassword = (): void => {
    setShowAgainPassword((prev) => !prev);
  };

  const handleSignup = async (): Promise<void> => {
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
    <View style={styles.container}>
      <View style={styles.header}>
          <TouchableOpacity 
            style={{ zIndex: 1, width: '30%' }}
            onPress={() => router.back()}
          >
            <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="arrow-back-circle-sharp" style={[styles.prevBtn, { paddingTop: 2 }]} />
              <Text style={{ fontSize: 15, paddingLeft: 5 }}>{"回上一頁"}</Text>
            </View>
          </TouchableOpacity>
      </View>
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
              <Pressable onPress={showMode}>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={[styles.input]}
                    value={date?.toISOString().split('T')[0]}
                    readOnly
                  />
                  <MaterialIcons
                    name={'touch-app'}
                    size={20}
                    color="#000"
                    style={{ 'marginLeft': -30 }}
                  />
                  {show && (
                    <DateTimePicker
                      display={Platform.OS === 'ios' ? 'default' : 'spinner'}
                      value={date || new Date()}
                      mode="date"
                      onChange={onChange}
                    />
                  )}
                </View>
              </Pressable>
              
              {/* <Button onPress={showMode} title="選擇日期" /> */}
          
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
    </View>
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
      backgroundColor: appTheme.primary,   
      paddingTop: 20,
    },
    container: {
      backgroundColor: '#fff6e5',
      height: '100%',
      paddingHorizontal: 20,
    },
    header: {
      backgroundColor: '#fff6e5',
      paddingTop: 45,
    },
    prevBtn: {
      display: 'flex',
      fontSize: 34,
      color: '#303030',
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