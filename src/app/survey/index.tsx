import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  ScrollView,
  Button,
  Platform,
} from 'react-native';
import { appTheme } from 'src/config/theme'
import { Survey } from '../interfaces';
import { AsyncStorageGetItem, isJsonString } from '../utils';
import { useRouter } from 'expo-router';
import BottomTabs from '../bottomTabs';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';

const symptoms = ["尿失禁", "頻尿", "腹瀉", "便祕", "疲憊", "情緒低落", "緊張", "缺乏活力", "熱潮紅", "其他"];

export default function SurveyScreen() {
  const [answers, setAnswers] = useState<Survey[]>(
      symptoms.map((symptom) => ({
          symptom,
          hasSymptom: false,
          severity: 0,
          customSymptom: symptom === "其他" ? "" : null,
      }))
  );
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [showDate, setShowDate] = useState<boolean>(false);
  const [currentRole, setCurrentRole] = useState<string>("");
  const router = useRouter();

  const fetchData = async () => {
    try {
        const token = await AsyncStorageGetItem('jwt');
        const role = await AsyncStorageGetItem('role');
        if (
          typeof token === 'string'
          && typeof role === 'string'
          && token.length
          && ['M', 'P'].includes(role)
        ) {
          setCurrentRole(role);
        } else {
          Alert.alert('錯誤', '無法取得資料');
          router.replace('/login');
        }
        const response = await fetch('https://allgood.peiren.info/api/patient/get', {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            }
        });
    
        const data = await response.json();
        if (response.ok) {
          if (isJsonString(data.patient.survey_data)) {
            setAnswers(JSON.parse(data.patient.survey_data));
          }
        }
    } catch (error) {
        console.error('獲取問卷記錄時發生錯誤:', error);
    }
  }
  useEffect(() => { fetchData(); }, []);
  
  const handleToggleSymptom = (index: number, hasSymptom: boolean) => {
    setAnswers((prev) => {
        const updated = [...prev];
        updated[index].hasSymptom = hasSymptom;
        if (!hasSymptom) updated[index].severity = 0;
        return updated;
    });
  };

  const handleSeverityChange = (index: number, severity: number) => {
    setAnswers((prev) => {
      const updated = [...prev];
      updated[index].hasSymptom = true;
      updated[index].severity = severity;
      return updated;
    });
  };

  const handleCustomSymptomChange = (text: string) => {
    setAnswers((prev) => {
      const updated = [...prev];
      updated[updated.length - 1].customSymptom = text;
      return updated;
    });
  };

  const handleSubmit = async () => {
    try {
        const token = await AsyncStorageGetItem('jwt');
        if (!token) {
          Alert.alert('錯誤', '無法儲存進度');
          return;
        }
        // https://allgood.peiren.info
        const response = await fetch('https://allgood.peiren.info/api/patient/update_data', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            survey_data: JSON.stringify(answers)
          }),
        });
        await response.json();
        if (response.ok) {
          Alert.alert('成功', '儲存症狀成功');
        }
        await fetch('https://allgood.peiren.info/api/patient/symptom_survey', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            survey_data: JSON.stringify(answers),
            date: date,
          }),
        });
    } catch (error) {
        Alert.alert('失敗', '儲存進度時發生錯誤');
        console.error('儲存進度時發生錯誤:', error);
    }
  };

  const onDateChange = (_: DateTimePickerEvent, selectedDate: Date | undefined) => {
    if (typeof selectedDate !== 'undefined') {
      setDate(selectedDate.toISOString().split('T')[0]);
    }
    setShowDate(false);
  };
  console.log(answers);
  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        { Platform.OS === 'android' && (
          <>
            { showDate && (
              <DateTimePicker
                display='spinner'
                value={new Date()}
                mode="date"
                onChange={onDateChange}
              />
            )}
            <TouchableOpacity onPress={() => setShowDate(true)}>
              <TextInput
                readOnly
                style={styles.input}
                value={date}
              />
            </TouchableOpacity>
            <Button onPress={() => setShowDate(true)} title="選擇日期" />
          </>
        )}
        { Platform.OS === 'ios' && (
          <View style={{ 
            display: 'flex',
            flexDirection: 'row', 
            width: '100%', 
            justifyContent: 'space-around',
            alignItems: 'center',
          }}
        >
          <Text style={{ display: 'flex', fontSize: 25, color: '#000' }}>選擇日期 </Text>
          <DateTimePicker
            display='default'
            value={new Date()}
            mode="date"
            onChange={onDateChange}
          />
        </View>
        )}
        {answers.map((answer, index) => (
          <View key={index} style={styles.questionContainer}>
            <Text style={styles.questionText}>{answer.symptom}</Text>
            {answer.symptom === "其他" ? (
              <TextInput
                style={styles.input}
                placeholder="請輸入症狀"
                value={answer.customSymptom || ""}
                onChangeText={handleCustomSymptomChange}
              />
            ) : (
              <View style={styles.optionsContainer}>
                <TouchableOpacity
                  style={
                    answer.hasSymptom
                      ? [styles.optionButton, styles.selectedOption, styles.optionLeft]
                      : [styles.optionButton, styles.optionLeft]
                  }
                  onPress={() => handleToggleSymptom(index, true)}
                >
                  <Text style={styles.optionText}>有症狀</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={
                    !answer.hasSymptom
                      ? [styles.optionButton, styles.selectedOption, styles.optionRight]
                      : [styles.optionButton, styles.optionRight]
                  }
                  onPress={() => handleToggleSymptom(index, false)}
                >
                  <Text style={styles.optionText}>無症狀</Text>
                </TouchableOpacity>
              </View>
            )}
            { answer.hasSymptom && (
                <Text style={styles.questionSubText}>困擾程度</Text>
            )}
            {(answer.hasSymptom || answer.symptom === "其他") && (
              <View style={styles.severityContainer}>
                {[0, 1, 2, 3].map((severity) => (
                  <TouchableOpacity
                    key={severity}
                    style={
                      answer.severity === severity
                        ? [styles.severityButton, styles.selectedSeverity]
                        : styles.severityButton
                    }
                    onPress={() => handleSeverityChange(index, severity)}
                  >
                    <Text style={styles.severityText}>
                      {severity === 0 ? "無" : severity === 1 ? "小" : severity === 2 ? "中" : "大"}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        ))}
        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
          <Text style={styles.submitButtonText}>儲存</Text>
        </TouchableOpacity>
      </ScrollView>
      <BottomTabs role={currentRole} customedStyle={{"position": "absolute"}} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: appTheme.primary,
    paddingTop: 45,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 80,
  },
  questionContainer: {
    marginBottom: 10,
  },
  questionText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#663300',
    paddingTop: 20,
    paddingBottom: 10,
  },
  questionSubText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#663300',
    paddingBottom: 0,
  },
  optionsContainer: {
    flex: 1,
    flexDirection: "row",
    marginBottom: 10,
  },
  optionButton: {
    flex: 1,
    padding: 10,
    backgroundColor: "#ddd",
    borderRadius: 5,
    alignItems: "center",
    justifyContent: "space-evenly",
  },
  optionLeft: {
    marginRight: 5,
  },
  optionRight: {
    marginLeft: 5,
  },
  selectedOption: {
    backgroundColor: "#ff7043",
  },
  optionText: {
    fontSize: 20,
    color: "#fff",
  },
  severityContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
  severityButton: {
    padding: 10,
    backgroundColor: "#ddd",
    borderRadius: 5,
  },
  selectedSeverity: {
    backgroundColor: "#28A745",
  },
  severityText: {
    fontSize: 18,
    color: "#fff",
  },
  input: {
    fontSize: 20,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 5,
    padding: 10,
    marginBottom: 10,
  },
  submitButton: {
    padding: 15,
    backgroundColor: "#007BFF",
    borderRadius: 5,
    alignItems: "center",
    marginTop: 20,
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});
