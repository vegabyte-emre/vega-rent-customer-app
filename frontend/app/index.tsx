import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../store/authStore';
import { seedAPI } from '../services/api';
import { COLORS, SPACING, FONT_SIZES } from '../constants/theme';

const COMPANY_NAME = "Vega Rent";
const TAGLINE = "Premium Araç Kiralama";

export default function SplashScreen() {
  const router = useRouter();
  const { isLoading } = useAuthStore();
  const [fadeAnim] = useState(new Animated.Value(0));
  const [scaleAnim] = useState(new Animated.Value(0.8));
  const [typedText, setTypedText] = useState('');
  const [showTagline, setShowTagline] = useState(false);
  const [taglineOpacity] = useState(new Animated.Value(0));
  const [showCursor, setShowCursor] = useState(true);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const loaderWidth = useRef(new Animated.Value(0)).current;
  const cursorOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Start animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 4,
        useNativeDriver: true,
      }),
    ]).start();

    // Pulse animation for icon
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Blinking cursor animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(cursorOpacity, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(cursorOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Typewriter effect
    let currentIndex = 0;
    const typeInterval = setInterval(() => {
      if (currentIndex <= COMPANY_NAME.length) {
        setTypedText(COMPANY_NAME.slice(0, currentIndex));
        currentIndex++;
      } else {
        clearInterval(typeInterval);
        setShowCursor(false);
        setShowTagline(true);
        Animated.timing(taglineOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }).start();
      }
    }, 120);

    // Loader animation
    Animated.timing(loaderWidth, {
      toValue: 1,
      duration: 2500,
      easing: Easing.linear,
      useNativeDriver: false,
    }).start();

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
      }, 3000);
    };

    initApp();

    return () => clearInterval(typeInterval);
  }, [isLoading]);

  return (
    <View style={styles.container}>
      {/* Background gradient effect */}
      <View style={styles.gradientOverlay} />
      
      <Animated.View
        style={[
          styles.logoContainer,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <Animated.View style={[styles.iconContainer, { transform: [{ scale: pulseAnim }] }]}>
          <Ionicons name="car-sport" size={70} color={COLORS.white} />
        </Animated.View>
        
        <View style={styles.titleContainer}>
          <Text style={styles.title}>{typedText}</Text>
          <View style={styles.cursor} />
        </View>
        
        {showTagline && (
          <Animated.Text style={[styles.tagline, { opacity: taglineOpacity }]}>
            {TAGLINE}
          </Animated.Text>
        )}
      </Animated.View>

      {/* Features */}
      <Animated.View style={[styles.featuresContainer, { opacity: fadeAnim }]}>
        <View style={styles.featureItem}>
          <Ionicons name="shield-checkmark" size={20} color="rgba(255,255,255,0.7)" />
          <Text style={styles.featureText}>Güvenli Kiralama</Text>
        </View>
        <View style={styles.featureItem}>
          <Ionicons name="flash" size={20} color="rgba(255,255,255,0.7)" />
          <Text style={styles.featureText}>Hızlı Teslimat</Text>
        </View>
        <View style={styles.featureItem}>
          <Ionicons name="heart" size={20} color="rgba(255,255,255,0.7)" />
          <Text style={styles.featureText}>7/24 Destek</Text>
        </View>
      </Animated.View>

      <View style={styles.footer}>
        <View style={styles.loaderContainer}>
          <Animated.View 
            style={[
              styles.loaderInner,
              {
                width: loaderWidth.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '100%'],
                }),
              }
            ]} 
          />
        </View>
        <Text style={styles.loadingText}>Uygulama hazırlanıyor...</Text>
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
  gradientOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
  logoContainer: {
    alignItems: 'center',
  },
  iconContainer: {
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 50,
  },
  title: {
    fontSize: 38,
    fontWeight: '800',
    color: COLORS.white,
    letterSpacing: 2,
  },
  cursor: {
    width: 3,
    height: 35,
    backgroundColor: COLORS.white,
    marginLeft: 2,
    opacity: 0.8,
  },
  tagline: {
    fontSize: FONT_SIZES.lg,
    color: 'rgba(255,255,255,0.85)',
    marginTop: SPACING.sm,
    fontWeight: '500',
    letterSpacing: 1,
  },
  featuresContainer: {
    flexDirection: 'row',
    marginTop: SPACING.xxl,
    gap: SPACING.lg,
  },
  featureItem: {
    alignItems: 'center',
    gap: SPACING.xs,
  },
  featureText: {
    fontSize: FONT_SIZES.xs,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500',
  },
  footer: {
    position: 'absolute',
    bottom: 80,
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: SPACING.xxl,
  },
  loaderContainer: {
    width: 200,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: SPACING.md,
  },
  loaderInner: {
    height: '100%',
    backgroundColor: COLORS.white,
    borderRadius: 2,
  },
  loadingText: {
    fontSize: FONT_SIZES.sm,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500',
  },
});
