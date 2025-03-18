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

// import Constants from 'expo-constants';
// import * as Notifications from 'expo-notifications';
// import React, { useState, useEffect, useRef } from 'react';
// import { Text, View, Button, Platform } from 'react-native';

// Notifications.setNotificationHandler({
//   handleNotification: async () => ({
//     shouldShowAlert: true,
//     shouldPlaySound: true,
//     shouldSetBadge: false,
//   }),
// });

// export default function App() {
//   const [expoPushToken, setExpoPushToken] = useState('');
//   const [notification, setNotification] = useState(false);
//   const notificationListener = useRef();
//   const responseListener = useRef();

//   useEffect(() => {
//     registerForPushNotificationsAsync().then((token) =>
//       setExpoPushToken(token)
//     );

//     notificationListener.current = Notifications.addNotificationReceivedListener(
//       (notification) => {
//         setNotification(notification);
//       }
//     );

//     responseListener.current = Notifications.addNotificationResponseReceivedListener(
//       (response) => {
//         console.log(response);
//       }
//     );

//     return () => {
//       Notifications.removeNotificationSubscription(notificationListener);
//       Notifications.removeNotificationSubscription(responseListener);
//     };
//   }, []);

//   return (
//     <View
//       style={{
//         flex: 1,
//         alignItems: 'center',
//         justifyContent: 'space-around',
//       }}>
//       <Text>Your expo push token: {expoPushToken}</Text>
//       <View style={{ alignItems: 'center', justifyContent: 'center' }}>
//         <Text>
//           Title: {notification && notification.request.content.title}{' '}
//         </Text>
//         <Text>Body: {notification && notification.request.content.body}</Text>
//         <Text>
//           Data:{' '}
//           {notification && JSON.stringify(notification.request.content.data)}
//         </Text>
//       </View>
//       <Button
//         title="Press to schedule a notification"
//         onPress={async () => {
//           await schedulePushNotification();
//         }}
//       />
//     </View>
//   );
// }

// async function schedulePushNotification() {
//   await Notifications.scheduleNotificationAsync({
//     content: {
//       title: "You've got mail! 📬",
//       body: 'Here is the notification body',
//       data: { data: 'goes here' },
//     },
//     trigger: {
//       repeats: false,
//       year: 2021,
//       month: 3,
//       day: 16,
//       hour: 12,
//       minute: 37,
//     },
//   });
// }

// async function registerForPushNotificationsAsync() {
//   let token;
//   if (Constants.isDevice) {
//     const {
//       status: existingStatus,
//     } = await Notifications.getPermissionsAsync();
//     let finalStatus = existingStatus;
//     if (existingStatus !== 'granted') {
//       const { status } = await Notifications.requestPermissionsAsync();
//       finalStatus = status;
//     }
//     if (finalStatus !== 'granted') {
//       alert('Failed to get push token for push notification!');
//       return;
//     }
//     token = (await Notifications.getExpoPushTokenAsync()).data;
//   } else {
//     alert('Must use physical device for Push Notifications');
//   }

//   return token;
// }
