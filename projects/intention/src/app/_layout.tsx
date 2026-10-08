import { Stack } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';
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
  return (
    <DatabaseErrorBoundary>
      <GestureHandlerRootView style={styles.fill}>
        <SQLiteProvider
          databaseName="intention.db"
          onInit={(database) => initializeDatabase(database as unknown as DatabaseClient)}>
          <Stack screenOptions={{ headerShown: false, animation: 'slide_from_left', contentStyle: { backgroundColor: colors.background } }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="create" options={{ presentation: 'card' }} />
            <Stack.Screen name="habit/[id]" />
            <Stack.Screen name="habit/[id]/edit" />
            <Stack.Screen name="archived" />
          </Stack>
        </SQLiteProvider>
      </GestureHandlerRootView>
    </DatabaseErrorBoundary>
  );
}

const styles = StyleSheet.create({ fill: { flex: 1, direction: 'rtl' } });
