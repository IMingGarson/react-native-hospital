import styled from 'styled-components/native'
import React, { useEffect, useState } from "react";
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  StyleSheet,
  Alert,
  View,
  TextInput,
  Text,
  TouchableOpacity,
} from 'react-native';
import { appTheme } from 'src/config/theme';
import { AsyncStorageGetItem, AsyncStorageSetItem } from '../utils';
import { Link } from 'expo-router';
import { RadioButton } from 'react-native-paper';
import { useRouter } from 'expo-router';

export default function LoginScreen() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [role, setRole] = useState("2");
    const router = useRouter();
    
    const fetchLoginData = async () => {
      const token = await AsyncStorageGetItem('jwt');
      const role = await AsyncStorageGetItem('role');
      if (!token || !role) {
        return true;
      }
      // 自動登入
      if (role === 'M') {
        router.replace('/nurse');
      } else {
        router.replace('/survey');
      }
    }

    useEffect(() => {
      fetchLoginData();
    }, []);

    const toggleShowPassword = () => {
      setShowPassword(!showPassword);
    };

    const handleSignIn = async () => {
      if (!email || !password || !["0", "1"].includes(role)) {
        Alert.alert('錯誤', '所有欄位皆為必填');
        return;
      }
      try {
        // https://stackoverflow.com/questions/70972106/how-to-configure-proxy-in-emulators-in-new-versions-of-android-studio
        const apiUrl = `https://allgood.peiren.info/api/${ role === "0" ? "user" : "patient"}/signin`
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email,
            password,
          }),
        });
  
        const data = await response.json();
        if (response.ok) {
          const token = data.access_token;
          const resRole = data.role;
          if (!token || !['M', 'P'].includes(resRole)) {
            Alert.alert('登入錯誤', '請通知負責人員');
          } else {
            const setToken = await AsyncStorageSetItem('jwt', token);
            const setRole = await AsyncStorageSetItem('role', resRole);
            if (!setToken || !setRole) {
              Alert.alert('登入錯誤', '請先再試一次');
            } else {
              Alert.alert('登入成功');
              // 醫護人員登入後會前往病人列表
              if (resRole === 'M') {
                router.replace('/nurse');
              } else {
                // 病人登入後會前往評量頁面
                router.replace('/survey');
              }
            }
          }
        } else if (response.status === 403) {
          Alert.alert('登入錯誤', '請先驗證帳號後使用');
        } else if (response.status === 401) {
          Alert.alert('登入錯誤', '帳號密碼有誤');
        }
      } catch (error) {
        Alert.alert('登入錯誤', '無法連接伺服器，請稍後再試');
        console.error(error);
      }
    };

    return (
      <View style={styles.ScreenContainer}>
        <S.Content testID="home-screen-content">
          <S.View>
            <S.Text>帳號</S.Text>
              <TextInput
                style={[
                  styles.input
                ]}
                value={email}
                autoFocus={true}
                onChangeText={setEmail}
              />
              <S.Text>密碼</S.Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={[
                    styles.input
                  ]}
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
              <View style={styles.inputContainer}>
                <View style={radioStyle.container}>
                  <View style={radioStyle.radioGroup}>
                      <View style={radioStyle.radioButton}>
                          <RadioButton
                              value="0"
                              status={role === "0" ? 'checked' : 'unchecked'}
                              onPress={() => setRole("0")}
                              color="#007BFF"
                          />
                          <Text style={radioStyle.radioLabel}>醫護人員</Text>
                      </View>
                      <View style={radioStyle.radioButton}>
                          <RadioButton
                              value="1"
                              status={role === "1" ? 'checked' : 'unchecked'}
                              onPress={() => setRole("1")}
                              color="#007BFF"
                          />
                          <Text style={radioStyle.radioLabel}>一般民眾</Text>
                      </View>
                  </View>
                </View>
              </View>
              <View style={bottomsList.container}>
                <TouchableOpacity
                  onPress={handleSignIn}
                  style={{ zIndex: 999 }}
                >
                  <View style={bottomsList.button}>
                    <Text>登入</Text>
                  </View>
                </TouchableOpacity>
                <Link href="#" style={bottomsList.button} onPressIn={handleSignIn}>
                  <Text>登入2</Text>
                </Link>
                <Link href="/register" style={bottomsList.button}>
                  <Text>註冊</Text>
                </Link>
              </View>
          </S.View>
        </S.Content>
      </View>
    )
  }
  
  const bottomsList = StyleSheet.create({
    container: {
      width: '100%',
      display: 'flex',
      justifyContent: 'center',
      flexDirection: 'row',
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
      width: '100%',
      flex: 1,
      backgroundColor: appTheme.background,
      justifyContent: 'center',      
      paddingHorizontal: 20,
    },
    radio: {
      flexDirection: 'row',
    },
    btn: {
      flexDirection: 'row',
      alignItems: 'center',
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
  
  const radioStyle = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: appTheme.background,
        justifyContent: 'center',
        alignItems: 'center',
    },
    radioGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 20,
        borderRadius: 8,
        backgroundColor: 'white',
        padding: 16,
        elevation: 4,
    },
    radioButton: {
        flexDirection: 'row',
    },
    radioLabel: {
        marginRight: 8,
        fontSize: 16,
        color: '#333',
        alignSelf: 'center',
    },
});