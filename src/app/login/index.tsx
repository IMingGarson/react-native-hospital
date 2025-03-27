import styled from 'styled-components/native';
import React, { useEffect, useState } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  StyleSheet,
  Alert,
  View,
  TextInput,
  Text,
  TouchableOpacity,
  Keyboard,
  TouchableWithoutFeedback,
  ActivityIndicator,
} from 'react-native';
import { appTheme } from 'src/config/theme';
import { AsyncStorageGetItem, AsyncStorageSetItem } from '../utils';
import { Link } from 'expo-router';
import { RadioButton } from 'react-native-paper';
import { useRouter } from 'expo-router';

const LoginScreen: React.FC = (): JSX.Element => {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [role, setRole] = useState<string>('2');
  const [loading, setLoading] = useState<boolean>(false);
  const router = useRouter();

  const fetchLoginData = async (): Promise<void> => {
    const token = await AsyncStorageGetItem('jwt');
    const storedRole = await AsyncStorageGetItem('role');
    if (!token || !storedRole) return;
    // 自動登入
    router.replace(storedRole === 'M' ? '/nurse' : '/survey');
  };

  useEffect(() => {
    fetchLoginData();
  }, []);

  const toggleShowPassword = (): void => {
    setShowPassword((prev) => !prev);
  };

  const handleSignIn = async (): Promise<void> => {
    setLoading(true);
    try {
      if (!email || !password || !['0', '1'].includes(role)) {
        Alert.alert('錯誤', '所有欄位皆為必填');
        return;
      }
      const apiUrl = `https://allgood.peiren.info/api/${role === '0' ? 'user' : 'patient'}/signin`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (response.ok) {
        const token = data.access_token;
        const resRole = data.role;
        if (!token || !['M', 'P'].includes(resRole)) {
          Alert.alert('登入錯誤', '請通知負責人員');
        } else {
          const setTokenResult = await AsyncStorageSetItem('jwt', token);
          const setRoleResult = await AsyncStorageSetItem('role', resRole);
          if (!setTokenResult || !setRoleResult) {
            Alert.alert('登入錯誤', '請先再試一次');
          } else {
            Alert.alert('登入成功');
            // 註冊 Push Notification Token
            if (resRole === 'P') {
              router.replace('/survey');
            } else {
              router.replace('/nurse');
            }
          }
        }
      } else {
        Alert.alert('登入錯誤', '帳號密碼有誤');
      }
    } catch (error) {
      Alert.alert('登入錯誤', '無法連接伺服器，請稍後再試');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#fff" />
          <LoadingText>登入中</LoadingText>
        </View>
      )}
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.screenContainer}>
          <Content testID="home-screen-content">
            <Wrapper>
              <Label>帳號</Label>
              <TextInput
                style={styles.input}
                value={email}
                autoFocus
                onChangeText={setEmail}
              />
              <Label>密碼</Label>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                />
                <MaterialCommunityIcons
                  name={showPassword ? 'eye-off' : 'eye'}
                  size={30}
                  color="#000"
                  onPress={toggleShowPassword}
                  style={{ marginLeft: -40 }}
                />
              </View>
              <View style={styles.inputContainer}>
                <View style={radioStyle.container}>
                  <View style={radioStyle.radioGroup}>
                    <View style={radioStyle.radioButton}>
                      <RadioButton.Android
                        value="0"
                        status={role === '0' ? 'checked' : 'unchecked'}
                        onPress={() => setRole('0')}
                        color="#007BFF"
                      />
                      <Text style={radioStyle.radioLabel}>醫護人員</Text>
                    </View>
                    <View style={radioStyle.radioButton}>
                      <RadioButton.Android
                        value="1"
                        status={role === '1' ? 'checked' : 'unchecked'}
                        onPress={() => setRole('1')}
                        color="#007BFF"
                      />
                      <Text style={radioStyle.radioLabel}>一般民眾</Text>
                    </View>
                  </View>
                </View>
              </View>
              <View style={bottomsList.container}>
                <TouchableOpacity onPress={handleSignIn} style={{ zIndex: 1 }}>
                  <View style={bottomsList.button}>
                    <Text style={{ fontSize: 20 }}>登入</Text>
                  </View>
                </TouchableOpacity>
                <Link href="/register" style={bottomsList.button}>
                  <Text style={{ fontSize: 20 }}>註冊</Text>
                </Link>
              </View>
            </Wrapper>
          </Content>
        </View>
      </TouchableWithoutFeedback>
    </View>
  );
};

export default LoginScreen;

const bottomsList = StyleSheet.create({
  container: {
    width: '100%',
    display: 'flex',
    justifyContent: 'center',
    flexDirection: 'row',
    paddingTop: 20,
  },
  button: {
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderColor: 'gray',
    borderRadius: 5,
    backgroundColor: '#fff',
    marginHorizontal: 45,
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: appTheme.primary,
  },
  screenContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderColor: '#000',
  },
  input: {
    width: '100%',
    paddingVertical: 8,
    paddingHorizontal: 12,
    fontSize: 24,
    backgroundColor: appTheme.background,
    borderWidth: 1,
    borderColor: '#d1d1d6',
    borderRadius: 8,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
});

const Content = styled.View`
  gap: 10px;
`;

const Wrapper = styled.View`
  gap: 10px;
  background-color: ${appTheme.primary};
`;

const Label = styled.Text`
  color: ${(p) => p.theme.text};
  font-family: madeRegular;
  font-size: ${(p) => p.theme.size(18, 'px')};
`;

const LoadingText = styled.Text`
  color: #fff;
  margin-top: 10px;
  font-size: 18px;
`;

const radioStyle = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: appTheme.primary,
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
