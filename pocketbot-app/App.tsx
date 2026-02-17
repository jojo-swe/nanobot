import { useEffect, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { ConnectionProvider, useConnection } from './src/context/ConnectionContext';
import AppNavigator from './src/navigation/AppNavigator';
import {
  getExpoPushToken,
  registerPushToken,
  setupAndroidChannel,
  addNotificationResponseListener,
} from './src/services/push';

function PushSetup() {
  const { conn, isConfigured } = useConnection();
  const tokenRef = useRef<string | null>(null);

  useEffect(() => {
    setupAndroidChannel();
  }, []);

  useEffect(() => {
    if (!isConfigured) return;
    (async () => {
      const token = await getExpoPushToken();
      if (token) {
        tokenRef.current = token;
        await registerPushToken(conn, token);
      }
    })();
  }, [isConfigured, conn.url]);

  useEffect(() => {
    const sub = addNotificationResponseListener(() => {
      // Notification tapped — app is already opening to Chat tab
    });
    return () => sub.remove();
  }, []);

  return null;
}

export default function App() {
  return (
    <ConnectionProvider>
      <StatusBar style="light" />
      <PushSetup />
      <AppNavigator />
    </ConnectionProvider>
  );
}
