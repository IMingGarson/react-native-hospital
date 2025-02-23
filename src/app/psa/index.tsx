import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, ScrollView, Modal, Platform, TouchableOpacity, StatusBar, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import BottomTabs from '../bottomTabs';
import { PSAData } from '../interfaces';
import { AsyncStorageGetItem } from '../utils';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import RNPickerSelect from 'react-native-picker-select';
import { appTheme } from 'src/config/theme';
import { SafeAreaView } from 'react-native-safe-area-context';

const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - Math.abs(n));
  return d;
};

export default function PSAList() {
  const [psaData, setPsaData] = useState<PSAData[]>([]);
  const [psa, setPsa] = useState<string>('');
  const [searchStartDate, setSearchStartDate] = useState<string>(daysAgo(7).toISOString().split('T')[0]);
  const [searchEndDate, setSearchEndDate] = useState<string>(daysAgo(0).toISOString().split('T')[0]);
  const [addDate, setAddDate] = useState<string>(daysAgo(0).toISOString().split('T')[0]);
  const [currentRole, setCurrentRole] = useState<string>('');
  const [isSearchModalVisible, setSearchModalVisible] = useState<boolean>(false);
  const [showStartDate, setShowStartDate] = useState<boolean>(false);
  const [showEndDate, setShowEndDate] = useState<boolean>(false);
  const [showAddDate, setShowAddDate] = useState<boolean>(false);
  const [isCreateModalVisible, setCreateModalVisible] = useState<boolean>(false);
  const router = useRouter();
  const [patientOptions, setPatientOptions] = useState<{ id: number, name: string, value: string, label: string }[]>([]);
  const [currentPatient, setCurrentPatient] = useState<{ id: number, name: string, value: string, label: string }>({
    id: -1,
    name: '',
    value: '',
    label: ''
  });
  const searchStartDateonChange = (_: DateTimePickerEvent, selectedDate: Date | undefined) => {
    if (typeof selectedDate !== 'undefined') {
      setSearchStartDate(selectedDate.toISOString().split('T')[0]);
    }
    setShowStartDate(false);
  };
  const searchEndDateonChange = (_: DateTimePickerEvent, selectedDate: Date | undefined) => {
    if (searchStartDate && selectedDate && selectedDate < new Date(searchStartDate)) {
      Alert.alert('錯誤', '結束日期不可早於開始日期');
      setShowEndDate(false);
      return;
    }
    if (typeof selectedDate !== 'undefined') {
      setSearchEndDate(selectedDate.toISOString().split('T')[0]);
    }
    setShowEndDate(false);
  }
  const addDateonChange = (_: DateTimePickerEvent, selectedDate: Date | undefined) => {
    if (selectedDate) {
      if (selectedDate > new Date()) {
        Alert.alert('錯誤', '不可選擇未來日期');
        setShowAddDate(false);
        return;
      }
      setAddDate(selectedDate?.toISOString().split('T')[0]);
    }
    setShowAddDate(false);
  }
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = await AsyncStorageGetItem('jwt');
        const role = await AsyncStorageGetItem('role');
        if (!(typeof token === 'string' && typeof role === 'string' && token.length && ['M', 'P'].includes(role))) {
          Alert.alert('錯誤', '無法取得資料');
          router.replace('/login');
        }
        setCurrentRole(role as string);
        if (role === 'P') {
          const response = await fetch('https://allgood.peiren.info/api/patient/psa', {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
          });

          const data = await response.json();
          if (response.ok) {
            setPsaData(data.psa.sort((a: PSAData, b: PSAData) => (a.date > b.date ? 1 : a.date < b.date ? -1 : 0)));
          }
        } else {
          const r = await fetchPatientData();
          if (!r) {
            console.error('獲取全病患資料時發生錯誤');
          }
        }
      } catch (error) {
        console.error('獲取PSA記錄時發生錯誤:', error);
      }
    };

    fetchData();
  }, []);

  const fetchPatientData = async () => {
    const token = await AsyncStorageGetItem('jwt');
    const response = await fetch('https://allgood.peiren.info/api/patient', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });
    const data = await response.json();
    if (response.ok) {
      const pData = data.patients.map((d: { id: string; name: string; document_progression_data: string; video_progression_data: string; survey_data: string; symptom_records: { date: string, survey_data: string }[] }) => {
        return {
          id: d.id,
          name: d.name,
          value: `${d.id}. ${d.name}`,
          label: d.name
        }
      });
      setPatientOptions(pData);
    } else {
      return false;
    }
    return true;
  }

  const addPSAData = async () => {
    const date = addDate;
    if (!date || !psa) {
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
      const body = currentRole === 'M' ? { date, psa: parseFloat(psa), pid: currentPatient.id } : { date, psa: parseFloat(psa) }
      const token = await AsyncStorageGetItem('jwt');
      const response = await fetch('https://allgood.peiren.info/api/patient/psa', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      await response.json();
      if (response.ok) {
        Alert.alert('成功', '新增成功');
      }
      await fetchPatientData();
    } catch (error) {
      Alert.alert('錯誤', '無法新增PSA記錄');
      console.error('無法新增PSA記錄:', error);
    }
    const updatedData = [...psaData, { date, psa: parseFloat(psa) } as PSAData];
    const mergedData: PSAData[] = Object.values(
      updatedData.reduce((acc: { [key: string]: PSAData }, entry: PSAData) => {
        if (!acc[entry.date]) {
            acc[entry.date] = { date: entry.date, psa: entry.psa };
        } else {
            acc[entry.date].psa = entry.psa;
        }
        return acc;
      }, {} as { [key: string]: PSAData })
    ).sort((a, b) => (a.date > b.date ? 1 : a.date < b.date ? -1 : 0));
    setPsaData(mergedData);
    setPsa('');
    setCreateModalVisible(false);
  };

  const searchPSAData = async () => {
    if (currentRole === 'M' && (!currentPatient || currentPatient.id < 0)) {
      Alert.alert('錯誤', '無法搜尋PSA記錄');
      return;
    }
    try {
      const token = await AsyncStorageGetItem('jwt');
      const url = currentRole === 'M'
        ? `https://allgood.peiren.info/api/patient/psa_on_date?start_date=${searchStartDate}&end_date=${searchEndDate}&pid=${currentPatient.id}&role=${currentRole}`
        : `https://allgood.peiren.info/api/patient/psa_on_date?start_date=${searchStartDate}&end_date=${searchEndDate}&role=${currentRole}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (response.ok) {
        setPsaData(data?.psa?.sort((a: PSAData, b: PSAData) => (a.date > b.date ? 1 : a.date < b.date ? -1 : 0)));
      }
    } catch (error) {
      Alert.alert('錯誤', '無法搜尋PSA記錄');
      console.error('無法搜尋PSA記錄:', error);
    }
  };

  const showPSAData = () => {
    return psaData?.filter((item) => {
      const date = new Date(item.date);
      return date >= new Date(searchStartDate) && date <= new Date(searchEndDate);
    });
  };

  const AndroidDateTimePicker = () => {
    return (
      <>
      { showStartDate && (
        <DateTimePicker
          display='calendar'
          value={new Date(searchStartDate)}
          mode="date"
          onChange={searchStartDateonChange}
        />
      )}
      <View style={{ 
          display: 'flex',
          flexDirection: 'row', 
          width: '100%', 
          justifyContent: 'space-around',
          alignItems: 'center',
        }}
      >
        <Text style={{ display: 'flex', fontSize: 18, color: '#000' }}>開始日期: </Text>
        <TouchableOpacity 
          onPress={(e) => {e.preventDefault(); setShowStartDate(true); }} 
          style={{ zIndex: 1, width: '50%' }}
        >
          <TextInput
            readOnly
            style={styles.input}
            value={searchStartDate}
          />
        </TouchableOpacity>
      </View>
      
      { showEndDate && (
        <DateTimePicker
          display='calendar'
          value={new Date(searchEndDate)}
          mode="date"
          onChange={searchEndDateonChange}
        />
      )}
      <View style={{ 
        display: 'flex',
        flexDirection: 'row', 
        width: '100%', 
        justifyContent: 'space-around', 
        alignItems: 'center',
      }}>
        <Text style={{ display: 'flex', fontSize: 18, color: '#000' }}>結束日期: </Text>
        <TouchableOpacity 
          onPress={(e) => { e.preventDefault(); setShowEndDate(true); }} 
          style={{ zIndex: 1, width: '50%' }}
        >
          <TextInput
            readOnly
            style={styles.input}
            value={searchEndDate}
          />
        </TouchableOpacity>
      </View>
      </>
    )
  }

  const IOSDateTimePicker = () => {
    return (
      <>
        <View style={{ 
            display: 'flex',
            flexDirection: 'row', 
            width: '100%', 
            justifyContent: 'space-around',
            alignItems: 'center',
          }}
        >
          <Text style={{ display: 'flex', fontSize: 18, color: '#000' }}>開始日期: </Text>
          <DateTimePicker
            display={'default'}
            value={new Date(searchStartDate)}
            mode="date"
            onChange={searchStartDateonChange}
          />
        </View>
        <View style={{ 
          display: 'flex',
          flexDirection: 'row', 
          width: '100%', 
          justifyContent: 'space-around', 
          alignItems: 'center',
        }}>
          <Text style={{ display: 'flex', fontSize: 18, color: '#000' }}>結束日期: </Text>
          <DateTimePicker
            display={'default'}
            value={new Date(searchEndDate)}
            mode="date"
            onChange={searchEndDateonChange}
          />
        </View>
      </>
    )
  }

  const selectPatient = (selectedValue: string) => {
    const patient = patientOptions.find((p) => p.value === selectedValue);
    if (!patient) {
      return false;
    }
    setCurrentPatient(patient);
  }

  return (
    <>
      <View style={styles.container}>
        <SafeAreaView edges={['top', 'left', 'right']} style={styles.topSafeview}>
          <View style={styles.header}>
            { currentRole === 'M' ? (
              <View style={{ display: 'flex' }}>
                <Text style={styles.title}>
                  病人: {`${currentPatient.name}`}
                </Text>
                <Text style={styles.title}>日期: {searchStartDate} ~ {searchEndDate}</Text>
              </View>
            ) : 
              <View style={{ display: 'flex' }}>
                <Text style={styles.title}>日期: {searchStartDate} ~ {searchEndDate}</Text>
              </View>
            }
          </View>
          <View style={{
            display: 'flex',
            flexDirection: 'row',
            width: Dimensions.get('window').width,
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingHorizontal: 10,
            paddingBottom: 10
          }}>
            <TouchableOpacity 
              onPress={() => {
                setSearchModalVisible(true);
              }}
              style={{
                display: 'flex',
                width: 80,
                height: 40,
                borderRadius: 15,
                backgroundColor: appTheme.highlight,
                justifyContent: 'center',
                alignItems: 'center'
              }}
            >
              <Text style={styles.textStyle}>搜尋</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                setCreateModalVisible(true)
              }}
              style={{
                display: 'flex',
                width: 80,
                height: 40,
                borderRadius: 15,
                backgroundColor: appTheme.highlight,
                justifyContent: 'center',
                alignItems: 'center'
              }}
            >
              <Text style={styles.textStyle}>新增</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
        <View style={styles.scrollWrapper}>
          <ScrollView contentContainerStyle={{ padding: 10 }}>
            { showPSAData()?.map((item, index) => (
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
      {/* 搜尋病人 PSA 的 Modal */}
      <Modal
        visible={isSearchModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setSearchModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>搜尋資料</Text>
            { currentRole === 'M' && (
              <RNPickerSelect
                placeholder={{ label: "選擇病人", value: "NONE", color: "#000" }}
                value={currentPatient.value}
                onValueChange={(itemValue: string) => {
                  if (itemValue !== currentPatient.value) {
                    selectPatient(itemValue);
                  }
                }}
                items={patientOptions}
                style={StyleSheet.create({
                  inputIOSContainer: {
                    paddingVertical: 15,
                    paddingHorizontal: 10,
                  },
                  placeholder: {color: "#000" },
                  inputIOS: { color: "#000" },
                  inputAndroid: { color: "#000" },
                })}
              />
            )}
            { Platform.OS === 'ios' ? <IOSDateTimePicker /> : <AndroidDateTimePicker /> }
            <View style={{
              display: 'flex',
              flexDirection: 'row',
              width: '100%',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingHorizontal: 10,
              paddingTop: 10
            }}>
              <TouchableOpacity 
                onPress={() => {
                  searchPSAData();
                  setSearchModalVisible(false);
                }}
                style={{
                  display: 'flex',
                  width: 80,
                  height: 40,
                  borderRadius: 15,
                  backgroundColor: appTheme.highlight,
                  justifyContent: 'center',
                  alignItems: 'center'
                }}
              >
                <Text style={styles.textStyle}>搜尋</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setSearchModalVisible(false);
                }}
                style={{
                  display: 'flex',
                  width: 80,
                  height: 40,
                  borderRadius: 15,
                  backgroundColor: appTheme.highlight,
                  justifyContent: 'center',
                  alignItems: 'center'
                }}
              >
                <Text style={styles.textStyle}>取消</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      {/* 醫護人員新增 PSA 的 Modal */}
      <Modal
        visible={isCreateModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setCreateModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>新增資料</Text>
            { currentRole === 'M' && (
              <RNPickerSelect
                placeholder={{ label: "選擇病人", value: "NONE", color: "#000" }}
                value={currentPatient.value}
                onValueChange={(itemValue: string) => {
                  if (itemValue !== currentPatient.value) {
                    selectPatient(itemValue);
                  }
                }}
                items={patientOptions}
                style={StyleSheet.create({
                  inputIOSContainer: {
                    paddingVertical: 15,
                    paddingHorizontal: 10,
                  },
                  placeholder: {color: "#000" },
                  inputIOS: { color: "#000" },
                  inputAndroid: { color: "#000" },
                })}
              />
            )}
            { Platform.OS === 'ios' && (
              <View style={{ 
                display: 'flex',
                flexDirection: 'row', 
                width: '100%', 
                justifyContent: 'space-around', 
                alignItems: 'center',
              }}>
                <Text style={{ display: 'flex', fontSize: 18, color: '#000' }}>選擇日期: </Text>
                <DateTimePicker
                  display='default'
                  value={new Date()}
                  mode="date"
                  onChange={addDateonChange}
                />
              </View>
            )}
            { Platform.OS === 'android' && (
              <>
                { showAddDate && (
                  <DateTimePicker
                    display='calendar'
                    value={new Date()}
                    mode="date"
                    onChange={addDateonChange}
                  />
                )}
                <View style={{ 
                  display: 'flex',
                  flexDirection: 'row', 
                  width: '100%', 
                  justifyContent: 'space-around', 
                  alignItems: 'center',
                }}>
                  <Text style={{ display: 'flex', fontSize: 18, color: '#000' }}>選擇日期: </Text>
                  <TouchableOpacity 
                    onPress={(e) => {e.preventDefault(); setShowAddDate(true); }} 
                    style={{ zIndex: 1, width: '50%' }}
                  >
                    <TextInput
                      readOnly
                      style={styles.input}
                      value={addDate}
                    />
                  </TouchableOpacity>
                </View>
              </>
            )}
            

            <View style={{ 
              display: 'flex',
              flexDirection: 'row', 
              width: '100%', 
              justifyContent: 'space-around', 
              alignItems: 'center',
            }}>
              <Text style={{ display: 'flex', fontSize: 18, color: '#000' }}>輸入數值: </Text>
              <TextInput
                style={[styles.input, { width: '50%' }]}
                placeholder="PSA 數值"
                value={psa}
                onChangeText={setPsa}
                keyboardType="numeric"
              />
            </View>
            <View style={{
              display: 'flex',
              flexDirection: 'row',
              width: '100%',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingHorizontal: 10,
              paddingTop: 10
            }}>
              <TouchableOpacity 
                onPress={() => {
                  addPSAData();
                  setCreateModalVisible(false);
                  searchPSAData();
                }}
                style={{
                  display: 'flex',
                  width: 80,
                  height: 40,
                  borderRadius: 15,
                  backgroundColor: appTheme.highlight,
                  justifyContent: 'center',
                  alignItems: 'center'
                }}
              >
                <Text style={styles.textStyle}>新增</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setCreateModalVisible(false);
                }}
                style={{
                  display: 'flex',
                  width: 80,
                  height: 40,
                  borderRadius: 15,
                  backgroundColor: appTheme.highlight,
                  justifyContent: 'center',
                  alignItems: 'center'
                }}
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
  topSafeview: { 
    flex: 0, 
    backgroundColor: appTheme.primary,
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
  },
  container: {
    flex: 1,
    backgroundColor: appTheme.primary,
  },
  header: {
    width: Dimensions.get('window').width,
    paddingHorizontal: 10,
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
  title: {
    fontSize: 20,
    color: appTheme.text,
    marginBottom: 10,
    fontWeight: 500
  },
  listTag: { 
    display: 'flex', 
    width: 100, 
    flexDirection: 'row', 
    backgroundColor: '#ff0', 
    borderRadius: 5, 
    borderColor: '#ffd', 
    borderWidth: 1, 
    paddingHorizontal: 10, 
    paddingVertical: 5 
  },
  listItem: {
    padding: 16,
    borderColor: appTheme.highlight,
    borderWidth: 2,
    borderRadius: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginBottom: 10,
  },
  listItemText: {
    fontSize: 16,
    color: appTheme.text,
  },
  listPSAText: {
    fontWeight: 'bold',
  },
  buttonContainer: {
    width: Dimensions.get('window').width,
    backgroundColor: appTheme.background,
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalBottons: {
    width: '50%',
    paddingHorizontal: 10,
  },
  inputContainer: {
    marginTop: 20,
  },
  input: {
    fontSize: 18,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#000',
    borderRadius: 10,
    paddingHorizontal: 5,
    marginVertical: 5,
    display: 'flex',
  },
  submitButton: {
    padding: 15,
    backgroundColor: '#007BFF',
    borderRadius: 5,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
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
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
  },
  modalTitle: {
    fontSize: 18,
    paddingHorizontal: 20,
    fontWeight: 'bold',
    color: appTheme.text,
  },
  modalButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingTop: 10
  },
  picker: {
    backgroundColor: '#fff',
    borderWidth: 5,
  },
  pickerItem: {
    fontSize: 18,
    color: '#000'
  },
  textStyle: {
    display: 'flex',
    color: '#5A3E2B',
    fontSize: 20,
    lineHeight: 28,
    fontWeight: 500
  },
});