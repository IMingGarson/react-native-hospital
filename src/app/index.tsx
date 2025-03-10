import React from "react";
import LoginScreen from './login';
import RegisterScreen from "./register";
import NurseScreen from "./nurse";
import VideoScreen from "./video";
import SurveyScreen from "./survey";
import DocumentScreen from "./document";
import PSAListScreen from "./psa";
import SurveyRecordScreen from "./records/[id]";
import { NavigationContainer, NavigationIndependentTree } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationIndependentTree>
      <NavigationContainer>
        <Stack.Navigator initialRouteName="login" screenOptions={{ headerShown: false }}>
          <Stack.Screen name="login" component={LoginScreen} />
          <Stack.Screen name="register" component={RegisterScreen} />
          <Stack.Screen name="nurse" component={NurseScreen} />
          <Stack.Screen name="video" component={VideoScreen} />
          <Stack.Screen name="document" component={DocumentScreen} />
          <Stack.Screen name="survey" component={SurveyScreen}/>
          <Stack.Screen name="psa" component={PSAListScreen}/>
          <Stack.Screen name="records/:id" component={SurveyRecordScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </NavigationIndependentTree>
  )
}