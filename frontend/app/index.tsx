import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../store/authStore';
import { seedAPI } from '../services/api';
import { COLORS, SPACING, FONT_SIZES } from '../constants/theme';

export default function SplashScreen() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuthStore();
  const [fadeAnim] = useState(new Animated.Value(0));
  const [scaleAnim] = useState(new Animated.Value(0.8));

  useEffect(() => {
    // Start animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 4,
        useNativeDriver: true,
      }),
    ]).start();

    // Seed data and navigate
    const initApp = async () => {
      try {
        await seedAPI.seed();
      } catch (error) {
        console.log('Seed error (might already be seeded):', error);
      }

      // Wait for animation and auth check
      setTimeout(() => {
        if (!isLoading) {
          router.replace('/(tabs)');
        }
      }, 2000);
    };

    initApp();
  }, [isLoading]);

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.logoContainer,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <View style={styles.iconContainer}>
          <Ionicons name="car-sport" size={80} color={COLORS.white} />
        </View>
        <Text style={styles.title}>FleetEase</Text>
        <Text style={styles.subtitle}>Hayalinizdeki Aracı Kiralayın</Text>
      </Animated.View>
      <View style={styles.footer}>
        <View style={styles.loader}>
          <View style={styles.loaderInner} />
        </View>
        <Text style={styles.loadingText}>Yükleniyor...</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
  },
  iconContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  title: {
    fontSize: 42,
    fontWeight: '700',
    color: COLORS.white,
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: FONT_SIZES.lg,
    color: 'rgba(255,255,255,0.8)',
    marginTop: SPACING.sm,
  },
  footer: {
    position: 'absolute',
    bottom: 60,
    alignItems: 'center',
  },
  loader: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: SPACING.md,
  },
  loaderInner: {
    width: '50%',
    height: '100%',
    backgroundColor: COLORS.white,
    borderRadius: 2,
  },
  loadingText: {
    fontSize: FONT_SIZES.sm,
    color: 'rgba(255,255,255,0.7)',
  },
});
