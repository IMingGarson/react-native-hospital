import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, ScrollView, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import BottomTabs from '../bottomTabs';
import { AsyncStorageGetItem } from '../utils';

interface PSAData {
  date: string;
  psa: number;
}

export default function PSAList() {
  const [psaData, setPsaData] = useState<PSAData[]>([]);
  const [date, setDate] = useState<string>('');
  const [psa, setPsa] = useState<string>('');
  const [searchStartDate, setSearchStartDate] = useState<string>('');
  const [searchEndDate, setSearchEndDate] = useState<string>('');
  const [currentRole, setCurrentRole] = useState<string>('');
  const [isSearchModalVisible, setSearchModalVisible] = useState<boolean>(false);
  const [isCreateModalVisible, setCreateModalVisible] = useState<boolean>(false);
  const [patientId, setPatientID] = useState<string>('');
  const router = useRouter();

  const validateDate = (date: string) => {
    const datePattern = /^\d{4}-\d{2}-\d{2}$/;
    return datePattern.test(date);
  };

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
          const response = await fetch('http://10.0.2.2:5000/api/patient/psa', {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
          });

          const data = await response.json();
          if (response.ok) {
            setPsaData(data.psa);
          }
        }
      } catch (error) {
        console.error('獲取PSA記錄時發生錯誤:', error);
      }
    };

    fetchData();
  }, []);

  const addPSAData = async () => {
    if (!date || !psa) {
      Alert.alert('錯誤', '請輸入日期跟數值');
      return;
    }
    if (isNaN(parseFloat(psa))) {
      Alert.alert('錯誤', 'PSA 資料有誤'); 
      return;
    }
    if (!validateDate(date)) {
      Alert.alert('錯誤', '日期資料有誤');
      return;
    }
    try {
      const token = await AsyncStorageGetItem('jwt');
      const response = await fetch('http://10.0.2.2:5000/api/patient/psa', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ date, psa: parseFloat(psa) }),
      });

      await response.json();
      if (response.ok) {
        Alert.alert('成功', '新增成功');
      }
    } catch (error) {
      Alert.alert('錯誤', '無法新增PSA記錄');
      console.error('無法新增PSA記錄:', error);
    }
    const newPSAData: PSAData = { date, psa: parseFloat(psa) };
    setPsaData((prevData) => [...prevData, newPSAData]);
    setDate('');
    setPsa('');
    setCreateModalVisible(false);
  };

  const searchPSAData = async () => {
    const startDate = validateDate(searchStartDate) ? searchStartDate : '1901-01-01';
    const endDate = validateDate(searchEndDate) ? searchEndDate : '2300-12-31';
    if (currentRole === 'M' && !patientId) {
      Alert.alert('錯誤', '病患 ID 有誤');
      return;
    }
    try {
      const token = await AsyncStorageGetItem('jwt');
      const response = await fetch(`http://10.0.2.2:5000/api/patient/psa_on_date?start_date=${startDate}&end_date=${endDate}&pid=${patientId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (response.ok) {
        setPsaData(data.psa);
      }
    } catch (error) {
      Alert.alert('錯誤', '無法新增PSA記錄');
      console.error('無法新增PSA記錄:', error);
    }
    setSearchModalVisible(false);
  };

  const showPSAData = () => {
    return psaData.filter((item) => {
      const date = new Date(item.date);
      const startDate = validateDate(searchStartDate) ? new Date(searchStartDate) : new Date('1901-01-01');
      const endDate = validateDate(searchEndDate) ? new Date(searchEndDate) : new Date('2300-12-31');
      return date >= startDate && date <= endDate;
    });
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>PSA 資料</Text>
        { currentRole === 'M' && patientId && (
          <Text style={styles.title}>{`病人 ID: ${patientId}`}</Text>
        )}
        { showPSAData().map((item, index) => (
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
          <Button disabled={currentRole === 'M' }title="新增" onPress={() => setCreateModalVisible(true)} />
        </View>
      </View>
      <BottomTabs role={currentRole} />
      {/* Search Modal */}
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
              <TextInput
                style={styles.input}
                placeholder="病患ID"
                value={patientId}
                onChangeText={setPatientID}
              />
            )}
            <TextInput
              style={styles.input}
              placeholder="起始日期: (2024-01-01)"
              value={searchStartDate}
              onChangeText={setSearchStartDate}
            />
            <TextInput
              style={styles.input}
              placeholder="結束日期: (2024-12-31)"
              value={searchEndDate}
              onChangeText={setSearchEndDate}
            />
            <View style={styles.modalButtonContainer}>
              <Button title="搜尋" onPress={searchPSAData} />
              <Button title="取消" onPress={() => setSearchModalVisible(false)} />
            </View>
          </View>
        </View>
      </Modal>

      {/* Create Modal */}
      <Modal
        visible={isCreateModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setCreateModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>新增資料</Text>
            <TextInput
              style={styles.input}
              placeholder="日期: (2025-01-01)"
              value={date}
              onChangeText={setDate}
            />
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
    marginTop: 20,
  },
  modalBottons: {
    width: '50%',
    paddingHorizontal: 10,
  },
  inputContainer: {
    marginTop: 20,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    padding: 10,
    marginBottom: 10,
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
    marginBottom: 20,
    color: '#663300',
  },
  modalButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
});