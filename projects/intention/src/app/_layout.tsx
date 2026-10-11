import { AuthProvider, useAuth } from '@/cloud/auth-provider';
import { SyncProvider } from '@/cloud/sync-provider';
import { accountDatabaseName, initializeSyncStore } from '@/cloud/sync-store';
import { ReminderObserver } from '@/components/reminder-observer';
import { Stack } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Platform, StyleSheet } from 'react-native';
import { useFonts } from 'expo-font';
import { LoadingState } from '@/components/states';
import { Screen } from '@/components/screen';
import { colors } from '@/theme/theme';
import { initializeDatabase } from '@/database/schema';
import type { DatabaseClient } from '@/database/client';
import { DatabaseErrorBoundary } from '@/components/database-error-boundary';

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Tajawal: require('../../assets/fonts/Tajawal-Regular.ttf'),
    TajawalBold: require('../../assets/fonts/Tajawal-Bold.ttf'),
    Amiri: require('../../assets/fonts/Amiri-Regular.ttf'),
  });
  if (!fontsLoaded && !fontError) return <Screen><LoadingState label="أهلًا بك في نية…" /></Screen>;
  return <AuthProvider><SessionLayout /></AuthProvider>;
}

function SessionLayout() {
  const { user, loading } = useAuth();
  if (loading) return <Screen><LoadingState label="جارٍ استعادة حسابك…" /></Screen>;
  return (
    <DatabaseErrorBoundary key={user?.uid ?? 'guest'}>
      <GestureHandlerRootView style={styles.fill}>
        <SQLiteProvider
          key={user?.uid ?? 'guest'}
          databaseName={user ? accountDatabaseName(user.uid) : 'intention.db'}
          onInit={async (database) => {
            const db = database as unknown as DatabaseClient;
            await initializeDatabase(db);
            if (user) await initializeSyncStore(db);
          }}>
          <SyncProvider>
          <ReminderObserver />
          <Stack screenOptions={{ headerShown: false, animation: 'slide_from_left', contentStyle: { backgroundColor: colors.background } }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="account" />
            <Stack.Screen name="create" options={{ presentation: 'card' }} />
            <Stack.Screen name="habit/[id]" />
            <Stack.Screen name="habit/[id]/edit" />
            <Stack.Screen name="archived" />
          </Stack>
          </SyncProvider>
        </SQLiteProvider>
      </GestureHandlerRootView>
    </DatabaseErrorBoundary>
  );
}

const styles = StyleSheet.create({ fill: { flex: 1, ...(Platform.OS !== 'web' && { direction: 'rtl' as const }) } });
