import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuthStore } from '../store/authStore';
import { COLORS } from '../constants/theme';

export default function RootLayout() {
  const { checkAuth, isLoading } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, []);

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" options={{ animation: 'fade' }} />
        <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
        <Stack.Screen 
          name="vehicle/[id]" 
          options={{ 
            headerShown: true,
            headerTitle: 'Araç Detay',
            headerBackTitle: 'Geri',
            animation: 'slide_from_right',
          }} 
        />
        <Stack.Screen 
          name="reservation/[vehicleId]" 
          options={{ 
            headerShown: true,
            headerTitle: 'Rezervasyon',
            headerBackTitle: 'Geri',
            animation: 'slide_from_right',
          }} 
        />
      </Stack>
    </>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
});
