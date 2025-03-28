import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Alert,
  ScrollView,
  Modal,
  Platform,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import RNPickerSelect from 'react-native-picker-select';
import AntDesign from '@expo/vector-icons/AntDesign';
import BottomTabs from '../bottomTabs';
import { PSAData } from '../interfaces';
import { AsyncStorageGetItem } from '../utils';
import { appTheme } from 'src/config/theme';

// 回傳 n 天前的日期
const daysAgo = (n: number): Date => {
  const d = new Date();
  d.setDate(d.getDate() - Math.abs(n));
  return d;
};

export default function PSAList() {
  const router = useRouter();

  // 狀態定義
  const [allPSAData, setAllPSAData] = useState<PSAData[]>([]);
  const [psa, setPsa] = useState<string>('');

  // 預設顯示過去兩週的資料 (P 與 M 都如此)
  const [searchStartDate, setSearchStartDate] = useState<string>(
    daysAgo(14).toISOString().split('T')[0]
  );
  const [searchEndDate, setSearchEndDate] = useState<string>(
    daysAgo(0).toISOString().split('T')[0]
  );
  const [addDate, setAddDate] = useState<string>(
    daysAgo(0).toISOString().split('T')[0]
  );

  const [currentRole, setCurrentRole] = useState<string>('');
  const [isSearchModalVisible, setSearchModalVisible] = useState<boolean>(false);
  const [isCreateModalVisible, setCreateModalVisible] = useState<boolean>(false);
  const [showStartDate, setShowStartDate] = useState<boolean>(false);
  const [showEndDate, setShowEndDate] = useState<boolean>(false);
  const [showAddDate, setShowAddDate] = useState<boolean>(false);

  // 當角色為 M 時，需有病患選擇功能
  const [patientOptions, setPatientOptions] = useState<
    { id: number; name: string; value: string; label: string }[]
  >([]);
  const [currentPatient, setCurrentPatient] = useState<{
    id: number;
    name: string;
    value: string;
    label: string;
  }>({ id: -1, name: '', value: '', label: '' });

  // 根據搜尋日期過濾資料
  const filteredData = useMemo(() => {
    return allPSAData.filter((item) => {
      const itemDate = new Date(item.date);
      return itemDate >= new Date(searchStartDate) && itemDate <= new Date(searchEndDate);
    });
  }, [allPSAData, searchStartDate, searchEndDate]);

  // 日期 picker onChange 回呼
  const searchStartDateOnChange = useCallback(
    (_: DateTimePickerEvent, selectedDate: Date | undefined) => {
      if (selectedDate) {
        setSearchStartDate(selectedDate.toISOString().split('T')[0]);
      }
      setShowStartDate(false);
    },
    []
  );

  const searchEndDateOnChange = useCallback(
    (_: DateTimePickerEvent, selectedDate: Date | undefined) => {
      if (selectedDate) {
        if (selectedDate < new Date(searchStartDate)) {
          Alert.alert('錯誤', '結束日期不可早於開始日期');
          setShowEndDate(false);
          return;
        }
        setSearchEndDate(selectedDate.toISOString().split('T')[0]);
      }
      setShowEndDate(false);
    },
    [searchStartDate]
  );

  const addDateOnChange = useCallback(
    (_: DateTimePickerEvent, selectedDate: Date | undefined) => {
      if (selectedDate) {
        if (selectedDate > new Date()) {
          Alert.alert('錯誤', '不可選擇未來日期');
          setShowAddDate(false);
          return;
        }
        setAddDate(selectedDate.toISOString().split('T')[0]);
      }
      setShowAddDate(false);
    },
    []
  );

  // 取得所有病患資料 (僅角色為 M 時使用)
  const fetchPatientData = async (): Promise<boolean> => {
    try {
      const token = await AsyncStorageGetItem('jwt');
      const response = await fetch('https://allgood.peiren.info/api/patient', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (response.ok && data?.patients) {
        const pData = data.patients.map(
          (d: {
            id: string;
            name: string;
            document_progression_data: string;
            video_progression_data: string;
            survey_data: string;
            symptom_records: { date: string; survey_data: string }[];
          }) => ({
            id: Number(d.id),
            name: d.name,
            value: `${d.id}. ${d.name}`,
            label: d.name,
          })
        );
        if (pData.length > 0) {
          setPatientOptions(pData);
          setCurrentPatient(pData[0]);
        }
        return true;
      }
    } catch (error) {
      console.error('fetchPatientData error:', error);
    }
    return false;
  };

  const fetchData = async () => {
    try {
      const token = await AsyncStorageGetItem('jwt');
      const role = await AsyncStorageGetItem('role');
      if (!token || !role || !['M', 'P'].includes(role)) {
        Alert.alert('錯誤', '無法取得資料');
        router.replace('/login');
        return;
      }
      setCurrentRole(role);
      if (role === 'P') {
        // 病患抓自己的 PSA 資料
        const response = await fetch('https://allgood.peiren.info/api/patient/psa', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await response.json();
        if (response.ok && data.psa) {
          const sortedData = data.psa.sort((a: PSAData, b: PSAData) =>
            a.date.localeCompare(b.date)
          );
          setAllPSAData(sortedData);
        }
      } else {
        // 醫護人員抓取所有病患資料，並預設抓取第一位病患的 PSA 資料
        const success = await fetchPatientData();
        if (!success) {
          console.error('獲取全病患資料時發生錯誤');
        } else if (currentPatient && currentPatient.id !== -1) {
          await searchPSAData();
        }
      }
    } catch (error) {
      console.error('fetchData error:', error);
    }
  };

  const searchPSAData = async () => {
    try {
      const token = await AsyncStorageGetItem('jwt');
      let url = '';
      if (currentRole === 'M') {
        if (!currentPatient || currentPatient.id < 0) {
          Alert.alert('錯誤', '無法搜尋PSA記錄');
          return;
        }
        url = `https://allgood.peiren.info/api/patient/psa_on_date?start_date=${searchStartDate}&end_date=${searchEndDate}&pid=${currentPatient.id}&role=${currentRole}`;
      } else {
        url = `https://allgood.peiren.info/api/patient/psa_on_date?start_date=${searchStartDate}&end_date=${searchEndDate}&role=${currentRole}`;
      }
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (response.ok && data.psa) {
        const sortedData = data.psa.sort((a: PSAData, b: PSAData) =>
          a.date.localeCompare(b.date)
        );
        setAllPSAData(sortedData);
      }
    } catch (error) {
      Alert.alert('錯誤', '無法搜尋PSA記錄');
      console.error('searchPSAData error:', error);
    }
  };

  const addPSAData = async () => {
    if (!addDate || !psa) {
      Alert.alert('錯誤', '請輸入日期跟數值');
      return;
    }
    if (isNaN(parseFloat(psa))) {
      Alert.alert('錯誤', 'PSA 資料有誤');
      return;
    }
    if (currentRole === 'M' && (!currentPatient || currentPatient.id < 0)) {
      Alert.alert('錯誤', '病患資料有誤');
      return;
    }
    try {
      const token = await AsyncStorageGetItem('jwt');
      const body =
        currentRole === 'M'
          ? { date: addDate, psa: parseFloat(psa), pid: currentPatient.id }
          : { date: addDate, psa: parseFloat(psa) };
      const response = await fetch('https://allgood.peiren.info/api/patient/psa', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      await response.json();
      if (response.ok) {
        Alert.alert('成功', '新增成功');
        // 更新原始 PSA 資料：如果已存在同一日期則更新，否則加入新紀錄
        setAllPSAData((prevData) => {
          const dataMap = new Map(prevData.map((item) => [item.date, item]));
          dataMap.set(addDate, { date: addDate, psa: parseFloat(psa) });
          return Array.from(dataMap.values()).sort((a, b) =>
            a.date.localeCompare(b.date)
          );
        });
      } else {
        Alert.alert('錯誤', '無法新增PSA記錄');
      }
    } catch (error) {
      Alert.alert('錯誤', '無法新增PSA記錄');
      console.error('addPSAData error:', error);
    } finally {
      setPsa('');
      setCreateModalVisible(false);
    }
  };

  useEffect(() => {
    if (currentRole === 'M') {
      searchPSAData();
    }
  }, [currentPatient]);

  useEffect(() => {
    fetchData();
  }, []);

  const selectPatient = (selectedValue: string) => {
    const patient = patientOptions.find((p) => p.value === selectedValue);
    if (patient) {
      setCurrentPatient(patient);
    }
  };

  const AndroidDateTimePicker = () => (
    <>
      {showStartDate && (
        <DateTimePicker
          display="calendar"
          value={new Date(searchStartDate)}
          mode="date"
          onChange={searchStartDateOnChange}
        />
      )}
      <View style={localStyles.rowContainer}>
        <Text style={localStyles.label}>開始日期: </Text>
        <TouchableOpacity
          onPress={(e) => {
            e.preventDefault();
            setShowStartDate(true);
          }}
          style={localStyles.touchableInput}
        >
          <TextInput readOnly style={styles.input} value={searchStartDate} />
        </TouchableOpacity>
      </View>
      {showEndDate && (
        <DateTimePicker
          display="calendar"
          value={new Date(searchEndDate)}
          mode="date"
          onChange={searchEndDateOnChange}
        />
      )}
      <View style={localStyles.rowContainer}>
        <Text style={localStyles.label}>結束日期: </Text>
        <TouchableOpacity
          onPress={(e) => {
            e.preventDefault();
            setShowEndDate(true);
          }}
          style={localStyles.touchableInput}
        >
          <TextInput readOnly style={styles.input} value={searchEndDate} />
        </TouchableOpacity>
      </View>
    </>
  );

  const IOSDateTimePicker = () => (
    <>
      <View style={[localStyles.rowContainer, localStyles.marginBottom]}>
        <Text style={localStyles.label}>開始日期: </Text>
        <DateTimePicker
          style={localStyles.datePicker}
          display="default"
          value={new Date(searchStartDate)}
          mode="date"
          onChange={searchStartDateOnChange}
        />
      </View>
      <View style={localStyles.rowContainer}>
        <Text style={localStyles.label}>結束日期: </Text>
        <DateTimePicker
          style={localStyles.datePicker}
          display="default"
          value={new Date(searchEndDate)}
          mode="date"
          onChange={searchEndDateOnChange}
        />
      </View>
    </>
  );

  return (
    <>
      <View style={styles.container}>
        <SafeAreaView edges={['top', 'left', 'right']} style={styles.topSafeview}>
          <View style={styles.header}>
            {currentRole === 'M' ? (
              <View style={localStyles.flexColumn}>
                <Text style={styles.title}>病人: {currentPatient.name}</Text>
                <Text style={styles.title}>
                  日期: {searchStartDate} ~ {searchEndDate}
                </Text>
              </View>
            ) : (
              <View style={localStyles.flexColumn}>
                <Text style={styles.title}>
                  日期: {searchStartDate} ~ {searchEndDate}
                </Text>
              </View>
            )}
          </View>
          <View style={localStyles.actionContainer}>
            <TouchableOpacity
              onPress={() => setSearchModalVisible(true)}
              style={localStyles.actionButton}
            >
              <Text style={styles.textStyle}>搜尋</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setCreateModalVisible(true)}
              style={localStyles.actionButton}
            >
              <Text style={styles.textStyle}>新增</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
        <View style={styles.scrollWrapper}>
          <ScrollView contentContainerStyle={localStyles.scrollContent}>
            {filteredData.map((item, index) => (
              <View key={index} style={styles.listItem}>
                <Text style={[styles.listItemText, { flex: 1 }]}>日期: {item.date}</Text>
                <View style={styles.listTag}>
                  <Text style={[styles.listItemText, styles.listPSAText]}>PSA: </Text>
                  <Text style={[styles.listItemText, styles.listPSAText]}>{item.psa}</Text>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
      {/* 搜尋 Modal */}
      <Modal
        visible={isSearchModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setSearchModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>搜尋資料</Text>
            {currentRole === 'M' && (
              <RNPickerSelect
                placeholder={{ label: '選擇病人', value: 'NONE', color: '#000' }}
                value={currentPatient.value}
                onValueChange={(itemValue: string) => {
                  if (itemValue !== currentPatient.value) {
                    selectPatient(itemValue);
                  }
                }}
                items={patientOptions}
                useNativeAndroidPickerStyle={false}
                fixAndroidTouchableBug={true}
                Icon={() => <AntDesign name="downcircleo" style={localStyles.pickerIcon} />}
                style={pickerSelectStyles}
              />
            )}
            {Platform.OS === 'ios' ? <IOSDateTimePicker /> : <AndroidDateTimePicker />}
            <View style={localStyles.modalButtonContainer}>
              <TouchableOpacity
                onPress={() => {
                  searchPSAData();
                  setSearchModalVisible(false);
                }}
                style={localStyles.modalButton}
              >
                <Text style={styles.textStyle}>搜尋</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setSearchModalVisible(false)}
                style={localStyles.modalButton}
              >
                <Text style={styles.textStyle}>取消</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      {/* 新增/修改 PSA Modal */}
      <Modal
        visible={isCreateModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCreateModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>新增資料</Text>
            {currentRole === 'M' && (
              <RNPickerSelect
                placeholder={{ label: '選擇病人', value: 'NONE', color: '#000' }}
                value={currentPatient.value}
                onValueChange={(itemValue: string) => {
                  if (itemValue !== currentPatient.value) {
                    selectPatient(itemValue);
                  }
                }}
                items={patientOptions}
                useNativeAndroidPickerStyle={false}
                fixAndroidTouchableBug={true}
                style={pickerSelectStyles}
                Icon={() => <AntDesign name="downcircleo" style={localStyles.pickerIcon} />}
              />
            )}
            {Platform.OS === 'ios' ? (
              <View style={localStyles.rowContainer}>
                <Text style={localStyles.label}>選擇日期: </Text>
                <DateTimePicker
                  display="default"
                  value={new Date()}
                  mode="date"
                  onChange={addDateOnChange}
                  style={localStyles.datePicker}
                />
              </View>
            ) : (
              <>
                {showAddDate && (
                  <DateTimePicker
                    display="calendar"
                    value={new Date()}
                    mode="date"
                    onChange={addDateOnChange}
                  />
                )}
                <View style={localStyles.rowContainer}>
                  <Text style={localStyles.label}>選擇日期: </Text>
                  <TouchableOpacity
                    onPress={(e) => {
                      e.preventDefault();
                      setShowAddDate(true);
                    }}
                    style={localStyles.touchableInput}
                  >
                    <TextInput readOnly style={styles.input} value={addDate} />
                  </TouchableOpacity>
                </View>
              </>
            )}
            <View style={localStyles.rowContainer}>
              <Text style={localStyles.label}>輸入數值: </Text>
              <TextInput
                style={[styles.input, localStyles.inputHalf]}
                placeholder="PSA 數值"
                value={psa}
                onChangeText={setPsa}
                keyboardType="numeric"
              />
            </View>
            <View style={localStyles.modalButtonContainer}>
              <TouchableOpacity
                onPress={() => {
                  addPSAData();
                }}
                style={localStyles.modalButton}
              >
                <Text style={styles.textStyle}>新增</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setCreateModalVisible(false)}
                style={localStyles.modalButton}
              >
                <Text style={styles.textStyle}>取消</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      <BottomTabs role={currentRole} />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: appTheme.primary,
  },
  topSafeview: {
    flex: 0,
    backgroundColor: appTheme.primary,
    paddingTop: 10,
  },
  header: {
    width: Dimensions.get('window').width,
    paddingHorizontal: 10,
  },
  title: {
    fontSize: 20,
    color: appTheme.text,
    marginBottom: 10,
    fontWeight: '500',
  },
  input: {
    fontSize: 16,
    backgroundColor: appTheme.background,
    borderWidth: 1,
    borderColor: '#000',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginVertical: 5,
  },
  scrollWrapper: {
    flex: 1,
    borderTopWidth: 2,
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    borderTopColor: appTheme.highlight,
    borderRightWidth: 2,
    borderRightColor: appTheme.highlight,
    borderLeftWidth: 2,
    borderLeftColor: appTheme.highlight,
    backgroundColor: appTheme.background,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  listItem: {
    padding: 16,
    borderColor: appTheme.highlight,
    borderWidth: 2,
    borderRadius: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: appTheme.background,
    marginBottom: 10,
  },
  listItemText: {
    fontSize: 16,
    color: appTheme.text,
  },
  listTag: {
    flexDirection: 'row',
    width: 120,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ff0',
    borderRadius: 5,
    borderColor: '#ff4',
    borderWidth: 2,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  listPSAText: {
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '80%',
    backgroundColor: appTheme.background,
    padding: 20,
    borderRadius: 10,
  },
  modalTitle: {
    fontSize: 22,
    marginBottom: 10,
    fontWeight: 'bold',
    color: appTheme.text,
    textAlign: 'center',
  },
  textStyle: {
    color: '#5A3E2B',
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '500',
  },
});

const localStyles = StyleSheet.create({
  flexColumn: {
    flexDirection: 'column',
  },
  actionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingBottom: 10,
    width: Dimensions.get('window').width,
  },
  actionButton: {
    width: 80,
    height: 40,
    borderRadius: 15,
    backgroundColor: appTheme.highlight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    width: '100%',
  },
  label: {
    fontSize: 18,
    color: '#000',
  },
  touchableInput: {
    zIndex: 1,
    width: '50%',
  },
  datePicker: {
    width: '100%',
  },
  marginBottom: {
    marginBottom: 10,
  },
  modalButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingTop: 10,
    width: '100%',
  },
  modalButton: {
    width: 80,
    height: 40,
    borderRadius: 15,
    backgroundColor: appTheme.highlight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputHalf: {
    width: '50%',
  },
  scrollContent: {
    padding: 10,
  },
  pickerIcon: {
    fontSize: 20,
    color: '#303030',
    marginRight: Platform.OS === 'ios' ? 20 : 22,
    marginTop: Platform.OS === 'ios' ? 10 : 15,
  },
});

const pickerSelectStyles = StyleSheet.create({
  placeHolder: {
    fontSize: 20,
    marginHorizontal: 12,
    marginVertical: 5,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    color: 'black',
  },
  inputIOS: {
    fontSize: 20,
    marginHorizontal: 12,
    marginVertical: 5,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    color: 'black',
  },
  inputAndroid: {
    fontSize: 20,
    marginHorizontal: 12,
    marginVertical: 5,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    color: 'black',
  },
});
