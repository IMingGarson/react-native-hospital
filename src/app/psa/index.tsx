import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, ScrollView, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import BottomTabs from '../bottomTabs';
import { PatientProgressionData, PSAData } from '../interfaces';
import { AsyncStorageGetItem, isJsonString } from '../utils';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';

export default function PSAList() {
  const [patients, setPatients] = useState<PatientProgressionData[]>([]);
  const [patientName, setPatientName] = useState<string>("");
  const [patientId, setPickPatientID] = useState<number>(1);
  const [pickedIndex, setPickedIndex] = useState<number>(0);
  const [psaData, setPsaData] = useState<PSAData[]>([]);
  const [psa, setPsa] = useState<string>('');
  const [searchStartDate, setSearchStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [searchEndDate, setSearchEndDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [addDate, setAddDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [currentRole, setCurrentRole] = useState<string>('');
  const [isSearchModalVisible, setSearchModalVisible] = useState<boolean>(false);
  const [showStartDate, setShowStartDate] = useState<boolean>(false);
  const [showEndDate, setShowEndDate] = useState<boolean>(false);
  const [showAddDate, setShowAddDate] = useState<boolean>(false);
  const [isCreateModalVisible, setCreateModalVisible] = useState<boolean>(false);
  const router = useRouter();
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
          const patientData = await AsyncStorageGetItem('patientData') as string;
          if (typeof patientData === 'string' && isJsonString(patientData)) {
            const pData = JSON.parse(patientData).map((d: PatientProgressionData) => {
              return {
                id: d.id,
                name: d.name,
              }
            });
            setPatients(pData);
            setPickPatientID(pData[0].id);
          }
        }
      } catch (error) {
        console.error('獲取PSA記錄時發生錯誤:', error);
      }
    };

    fetchData();
  }, []);

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
    if (currentRole === 'M' && pickedIndex >= patients.length) {
      Alert.alert('錯誤', '病患資料有誤'); 
      return;
    }
    try {
      const patientId = patients && currentRole === 'M' ? patients[pickedIndex].id : 0;
      const body = currentRole === 'M' ? { date, psa: parseFloat(psa), pid: patientId } : { date, psa: parseFloat(psa) }
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
    const startDate = searchStartDate;
    const endDate = searchEndDate;
    if (pickedIndex < patients.length) {
      setPickPatientID(patients[pickedIndex].id);
      setPatientName(patients[pickedIndex].name);
    }

    try {
      const token = await AsyncStorageGetItem('jwt');
      const url = currentRole === 'M' 
        ? `https://allgood.peiren.info/api/patient/psa_on_date?start_date=${startDate}&end_date=${endDate}&pid=${patientId}&role=${currentRole}`
        : `https://allgood.peiren.info/api/patient/psa_on_date?start_date=${startDate}&end_date=${endDate}&role=${currentRole}`;
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
    setSearchModalVisible(false);
  };

  const showPSAData = () => {
    return psaData?.filter((item) => {
      const date = new Date(item.date);
      return date >= new Date(searchStartDate) && date <= new Date(searchEndDate);
    });
  };

  const onPicked = (pickedIndex: number) => {
    if (pickedIndex < patients.length) {
      setPickedIndex(pickedIndex);
      setPickPatientID(patients[pickedIndex].id);
      setPatientName(patients[pickedIndex].name);
    }
  }
  
  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>PSA 資料</Text>
        { currentRole === 'M' && patientName.length > 0 ? (
          <Text style={styles.title}>
            病人名稱: {`${patientName}`}
          </Text>
        ) : null}
        { showPSAData()?.map((item, index) => (
          <View key={index} style={styles.listItem}>
            <Text style={styles.listItemText}>日期: {item.date}</Text>
            <Text style={[styles.listItemText, styles.listPSAText]}>PSA: {item.psa}</Text>
          </View>
        ))}
      </ScrollView>
      <View style={styles.buttonContainer}>
        <View style={styles.modalBottons}>
          <Button title="搜尋" onPress={() => setSearchModalVisible(true)} />
        </View>
        <View style={styles.modalBottons}>
          <Button title="新增" onPress={() => setCreateModalVisible(true)} />
        </View>
      </View>
      <BottomTabs role={currentRole} />

      {/* 搜尋 PSA 的 Modal */}
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
              <Picker
                style={styles.picker}
                selectedValue={patientId - 1}
                onValueChange={(v) => onPicked(v)}
              > 
              { patients.map((d, i) => {
                  return <Picker.Item style={styles.pickerItem} key={i} label={d.name} value={i} />
                })
              }
              </Picker>
            )}
            { showStartDate && (
              <DateTimePicker
                display='calendar'
                value={new Date()}
                mode="date"
                onChange={searchStartDateonChange}
              />
            )}   
            <TextInput
              readOnly
              style={styles.input}
              value={searchStartDate}
            />
            <Button onPress={() => setShowStartDate(true)} title="開始日期" />
            { showEndDate && (
              <DateTimePicker
                display='calendar'
                value={new Date()}
                mode="date"
                onChange={searchEndDateonChange}
              />
            )}   
            <TextInput
              readOnly
              style={styles.input}
              value={searchEndDate}
            />
            <Button onPress={() => setShowEndDate(true)} title="結束日期" />
            <View style={styles.modalButtonContainer}>
              <Button title="搜尋" onPress={searchPSAData} />
              <Button title="取消" onPress={() => setSearchModalVisible(false)} />
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
              <Picker
                style={styles.picker}
                selectedValue={patientId - 1}
                onValueChange={(v) => onPicked(v)}
              > 
              { patients.map((d, i) => {
                  return <Picker.Item style={styles.pickerItem} key={i} label={d.name} value={i} />
                })
              }
              </Picker>
            )}
            { showAddDate && (
              <DateTimePicker
                display='calendar'
                value={new Date()}
                mode="date"
                onChange={addDateonChange}
              />
            )}   
            <TextInput
              readOnly
              style={styles.input}
              value={addDate}
            />
            <Button onPress={() => setShowAddDate(true)} title="選擇日期" />
            <TextInput
              style={styles.input}
              placeholder="PSA 數值"
              value={psa}
              onChangeText={setPsa}
              keyboardType="numeric"
            />
            <View style={styles.modalButtonContainer}>
              <Button title="新增" onPress={addPSAData} />
              <Button title="取消" onPress={() => setCreateModalVisible(false)} />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff6e5',
    paddingTop: 45,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 80,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#663300',
    marginBottom: 20,
  },
  listItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#d1a679',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 5,
    marginBottom: 10,
  },
  listItemText: {
    fontSize: 16,
    color: '#663300',
  },
  listPSAText: {
    fontWeight: 'bold',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    borderRadius: 15,
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
    borderColor: '#ddd',
    borderRadius: 5,
    padding: 10,
    marginVertical: 5,
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
    fontSize: 20,
    fontWeight: 'bold',
    // marginBottom: 20,
    color: '#663300',
  },
  modalButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  picker: {
    backgroundColor: '#fff',
    padding: 10,
  },
  pickerItem: {
    fontSize: 18,
    color: '#000'
  }
});