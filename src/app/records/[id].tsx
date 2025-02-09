import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput, Button } from "react-native";
import { useLocalSearchParams, useRouter } from 'expo-router';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { AsyncStorageGetItem, isJsonString } from '../utils';
import { PatientProgressionData, SymptomRecord, Survey } from '../interfaces';

export default function SurveyRecordScreen() {
    const { id: PATH_ID } = useLocalSearchParams();
    const [selectedPatient, setSelectedPatient] = useState<PatientProgressionData>();
    const router = useRouter();
    const [date, setDate] = useState<string>("");
    const [showDate, setShowDate] = useState<boolean>(false);
    const [name, setName] = useState<string>("");
    const onChange = (_: DateTimePickerEvent, selectedDate: Date | undefined) => {
        if (typeof selectedDate !== 'undefined') {
            setDate(selectedDate.toISOString().split('T')[0]);
        }
        setShowDate(false);
    };

    useEffect(() => {
        const fetchData = async () => {
            const pData = await AsyncStorageGetItem('patientData') as string;
            const id = Array.isArray(PATH_ID) ? +PATH_ID[0] : +PATH_ID;
            if (isJsonString(pData)) {
                const patientData = JSON.parse(pData)?.find((d: PatientProgressionData) => d.id === id);
                setName(patientData.name);
                setSelectedPatient(patientData);
            }
        }
        fetchData();
    }, []);
    
    const DisplayRecordByDate = () => {
        if (!date || !selectedPatient || !selectedPatient?.records) {
            return null;
        }
        const record: SymptomRecord | undefined = selectedPatient.records.find((r: SymptomRecord) => r.date === date);
        if (!record) {
            return null;
        }
        return record.data.map((s: Survey, idx: number) => {
            if (s.hasSymptom) {
                if (s.symptom === '其他' && s.customSymptom) {
                    return (
                        <View key={idx} style={styles.progress}>
                            <View style={styles.tagContainer}>
                                <Text style={styles.symptomText}>{`${idx + 1}. ${s.customSymptom}`}</Text>
                                <View style={[styles.tag, styles.warning]}>
                                <Text style={styles.tagText}>有症狀</Text>
                                </View>
                                <Text style={styles.severityText}>嚴重程度：{severity(s.severity.toString())}</Text>
                            </View>
                        </View>
                    )
                }
                return (
                    <View key={idx} style={styles.progress}>
                        <View style={styles.tagContainer}>
                            <Text style={styles.symptomText}>{`${idx + 1}. ${s.symptom}`}</Text>
                            <View style={[styles.tag, styles.warning]}>
                                <Text style={styles.tagText}>有症狀</Text>
                            </View>
                            <Text style={styles.severityText}>嚴重程度：{severity(s.severity.toString())}</Text>
                        </View>
                    </View>
                )
            } else {
                if (s.symptom === '其他' && s.customSymptom) {
                return (
                    <View key={idx} style={styles.progress}>
                        <View style={styles.tagContainer}>
                            <Text style={styles.symptomText}>{`${idx + 1}. ${s.customSymptom}`}</Text>
                            <View style={[styles.tag, styles.warning]}>
                            <Text style={styles.tagText}>有症狀</Text>
                            </View>
                            <Text style={styles.severityText}>嚴重程度：{severity(s.severity.toString())}</Text>
                        </View>
                        </View>
                    )
                }
                return (
                    <View key={idx} style={styles.progress}>
                        <View style={styles.tagContainer}>
                        <Text style={styles.symptomText}>{`${idx + 1}. ${s.symptom}`}</Text>
                        <View style={[styles.tag, styles.normal]}>
                            <Text style={styles.tagText}>無症狀</Text>
                        </View>
                        <Text style={styles.severityText}>{''}</Text>
                        </View>
                    </View>
                )
            }
        })
    }
    
    const severity = (text: string) => {
      switch (text) {
        case '0':
          return '無';
        case '1':
          return '小'
        case '2':
          return '中'
        default:
          return '大';
      }
    }

    return (
        <View style={styles.item}>
            <Text style={styles.name}>{`姓名: ${name}`}</Text>
            { showDate && (
                <DateTimePicker
                    display='calendar'
                    value={new Date(date)}
                    mode="date"
                    onChange={onChange}
                />
            )}
            <TextInput
                readOnly
                style={styles.input}
                value={date}
            />
            <Button onPress={() => setShowDate(true)} color="#007BFF" title="選擇日期" />
            <View style={{ height: "1%" }}></View>
            <Button onPress={() => router.back()} color="#007BFF" title="回上一頁" />
            {DisplayRecordByDate()}
        </View>
    )
}

const styles = StyleSheet.create({
    item: {
        backgroundColor: '#fff6e5',
        overflow: 'hidden',
        paddingTop: 60,
        paddingBottom: 20,
        paddingHorizontal: 16
    },
    button: {
        width: '100%',
        fontSize: 18,
        paddingVertical: 8,
        paddingHorizontal: 12,
        flex: 1,
    },
    name: {
        fontSize: 24,
        fontWeight: '500',
        color: '#005',
        fontFamily: 'System',
        marginBottom: 15,
    },
    input: {
        backgroundColor: '#f1f1f1',
        padding: 15,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#ddd',
        marginBottom: 15,
    },
    progress: {
        fontSize: 18,
        color: '#4d2701',
        fontFamily: 'System',
        marginVertical: 12,
    },
    tagContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    symptomText: {
        width: '33%',
        fontSize: 20,
        color: '#7d3e01',
        fontFamily: 'System',
        paddingVertical: 2,
    },
    tagText: {
        fontSize: 18,
        color: '#fff',
    },
    severityText: {
        width: '33%',
        fontSize: 18,
        color: '#7d3e01',
    },
    tag: {
        borderRadius: 5,
        paddingVertical: 2,
        paddingHorizontal: 16,
        fontSize: 18,
        height: 30,
    },
    warning: {
        backgroundColor: '#dc0530',
        color: '#fff'
    },
    normal: {
        backgroundColor: '#2775c3',
        color: '#fff'
    },
});