import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Dimensions, Alert } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { vehicleAPI } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { Vehicle } from '../../types';
import { Button } from '../../components';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS } from '../../constants/theme';

const { width } = Dimensions.get('window');

export default function VehicleDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    if (id) {
      fetchVehicle();
    }
  }, [id]);

  const fetchVehicle = async () => {
    try {
      const data = await vehicleAPI.getVehicle(id!);
      setVehicle(data);
    } catch (error) {
      console.error('Error fetching vehicle:', error);
      Alert.alert('Hata', 'Araç bilgileri yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const handleReservation = () => {
    if (!isAuthenticated) {
      Alert.alert(
        'Giriş Gerekli',
        'Rezervasyon yapmak için giriş yapmanız gerekiyor.',
        [
          { text: 'İptal', style: 'cancel' },
          { text: 'Giriş Yap', onPress: () => router.push('/(auth)/login') },
        ]
      );
      return;
    }
    router.push(`/reservation/${id}`);
  };

  const getSegmentColor = () => {
    switch (vehicle?.segment) {
      case 'Lüks':
        return COLORS.warning;
      case 'SUV':
        return COLORS.success;
      case 'Ekonomi':
        return COLORS.primaryLight;
      default:
        return COLORS.textLight;
    }
  };

  if (loading || !vehicle) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Yükleniyor...</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerTitle: `${vehicle.brand} ${vehicle.model}`,
          headerRight: () => (
            <TouchableOpacity onPress={() => setIsFavorite(!isFavorite)}>
              <Ionicons
                name={isFavorite ? 'heart' : 'heart-outline'}
                size={24}
                color={isFavorite ? COLORS.danger : COLORS.text}
              />
            </TouchableOpacity>
          ),
        }}
      />
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Image Gallery */}
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: vehicle.images[currentImageIndex] || 'https://via.placeholder.com/400x250' }}
            style={styles.mainImage}
            resizeMode="cover"
          />
          <View style={[styles.segmentBadge, { backgroundColor: getSegmentColor() }]}>
            <Text style={styles.segmentText}>{vehicle.segment}</Text>
          </View>
          {vehicle.images.length > 1 && (
            <View style={styles.imageDots}>
              {vehicle.images.map((_, index) => (
                <TouchableOpacity
                  key={index}
                  style={[styles.dot, currentImageIndex === index && styles.dotActive]}
                  onPress={() => setCurrentImageIndex(index)}
                />
              ))}
            </View>
          )}
        </View>

        {/* Vehicle Info */}
        <View style={styles.content}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.brand}>{vehicle.brand}</Text>
              <Text style={styles.model}>{vehicle.model}</Text>
            </View>
            <View style={styles.priceContainer}>
              <Text style={styles.price}>₺{vehicle.daily_price.toLocaleString('tr-TR')}</Text>
              <Text style={styles.priceUnit}>/gün</Text>
            </View>
          </View>

          {/* Quick Info */}
          <View style={styles.quickInfo}>
            <View style={styles.quickInfoItem}>
              <Ionicons name="calendar-outline" size={20} color={COLORS.textLight} />
              <Text style={styles.quickInfoText}>{vehicle.year}</Text>
            </View>
            <View style={styles.quickInfoItem}>
              <Ionicons name="speedometer-outline" size={20} color={COLORS.textLight} />
              <Text style={styles.quickInfoText}>{vehicle.km.toLocaleString('tr-TR')} km</Text>
            </View>
            <View style={styles.quickInfoItem}>
              <Ionicons name="color-palette-outline" size={20} color={COLORS.textLight} />
              <Text style={styles.quickInfoText}>{vehicle.color}</Text>
            </View>
          </View>

          {/* Specifications */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Özellikler</Text>
            <View style={styles.specsGrid}>
              <View style={styles.specItem}>
                <View style={styles.specIcon}>
                  <Ionicons name="settings-outline" size={20} color={COLORS.primary} />
                </View>
                <Text style={styles.specLabel}>Vites</Text>
                <Text style={styles.specValue}>{vehicle.transmission}</Text>
              </View>
              <View style={styles.specItem}>
                <View style={styles.specIcon}>
                  <Ionicons name="water-outline" size={20} color={COLORS.primary} />
                </View>
                <Text style={styles.specLabel}>Yakıt</Text>
                <Text style={styles.specValue}>{vehicle.fuel_type}</Text>
              </View>
              <View style={styles.specItem}>
                <View style={styles.specIcon}>
                  <Ionicons name="people-outline" size={20} color={COLORS.primary} />
                </View>
                <Text style={styles.specLabel}>Koltuk</Text>
                <Text style={styles.specValue}>{vehicle.seats} Kişi</Text>
              </View>
              <View style={styles.specItem}>
                <View style={styles.specIcon}>
                  <Ionicons name="car-outline" size={20} color={COLORS.primary} />
                </View>
                <Text style={styles.specLabel}>Kapı</Text>
                <Text style={styles.specValue}>{vehicle.doors} Kapı</Text>
              </View>
              <View style={styles.specItem}>
                <View style={styles.specIcon}>
                  <Ionicons name="briefcase-outline" size={20} color={COLORS.primary} />
                </View>
                <Text style={styles.specLabel}>Bagaj</Text>
                <Text style={styles.specValue}>{vehicle.baggage_capacity}</Text>
              </View>
              <View style={styles.specItem}>
                <View style={styles.specIcon}>
                  <Ionicons name="document-text-outline" size={20} color={COLORS.primary} />
                </View>
                <Text style={styles.specLabel}>Plaka</Text>
                <Text style={styles.specValue}>{vehicle.plate}</Text>
              </View>
            </View>
          </View>

          {/* Features */}
          {vehicle.features.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Donanımlar</Text>
              <View style={styles.featuresGrid}>
                {vehicle.features.map((feature, index) => (
                  <View key={index} style={styles.featureItem}>
                    <Ionicons name="checkmark-circle" size={18} color={COLORS.success} />
                    <Text style={styles.featureText}>{feature}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Rental Terms */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Kiralama Koşulları</Text>
            <View style={styles.termsCard}>
              <View style={styles.termRow}>
                <Text style={styles.termLabel}>Minimum Yaş</Text>
                <Text style={styles.termValue}>{vehicle.min_age} yaş</Text>
              </View>
              <View style={styles.termRow}>
                <Text style={styles.termLabel}>Ehliyet Süresi</Text>
                <Text style={styles.termValue}>En az {vehicle.min_license_years} yıl</Text>
              </View>
              <View style={styles.termRow}>
                <Text style={styles.termLabel}>Depozito</Text>
                <Text style={styles.termValue}>₺{vehicle.deposit.toLocaleString('tr-TR')}</Text>
              </View>
              <View style={styles.termRow}>
                <Text style={styles.termLabel}>KM Limiti</Text>
                <Text style={styles.termValue}>{vehicle.km_limit} km/gün</Text>
              </View>
            </View>
          </View>

          <View style={{ height: 100 }} />
        </View>
      </ScrollView>

      {/* Bottom CTA */}
      <View style={styles.bottomBar}>
        <View style={styles.bottomPriceContainer}>
          <Text style={styles.bottomPriceLabel}>Günlük Fiyat</Text>
          <Text style={styles.bottomPrice}>₺{vehicle.daily_price.toLocaleString('tr-TR')}</Text>
        </View>
        <Button
          title="Hemen Kirala"
          onPress={handleReservation}
          disabled={!vehicle.available}
          style={styles.reserveButton}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageContainer: {
    position: 'relative',
  },
  mainImage: {
    width: width,
    height: 280,
  },
  segmentBadge: {
    position: 'absolute',
    top: SPACING.md,
    left: SPACING.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
  },
  segmentText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
  },
  imageDots: {
    position: 'absolute',
    bottom: SPACING.md,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.xs,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  dotActive: {
    backgroundColor: COLORS.white,
    width: 20,
  },
  content: {
    padding: SPACING.lg,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.lg,
  },
  brand: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textLight,
    fontWeight: '500',
  },
  model: {
    fontSize: FONT_SIZES.hero,
    color: COLORS.text,
    fontWeight: '700',
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  price: {
    fontSize: FONT_SIZES.title,
    color: COLORS.primary,
    fontWeight: '700',
  },
  priceUnit: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
  },
  quickInfo: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    ...SHADOWS.sm,
  },
  quickInfoItem: {
    alignItems: 'center',
    gap: SPACING.xs,
  },
  quickInfoText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    fontWeight: '500',
  },
  section: {
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  specsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
  },
  specItem: {
    width: '30%',
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  specIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  specLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textMuted,
    marginBottom: 2,
  },
  specValue: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    fontWeight: '600',
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.success + '10',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
    gap: SPACING.xs,
  },
  featureText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
  },
  termsCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    ...SHADOWS.sm,
  },
  termRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  termLabel: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textLight,
  },
  termValue: {
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    fontWeight: '600',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.white,
    padding: SPACING.lg,
    paddingBottom: SPACING.xl,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    ...SHADOWS.lg,
  },
  bottomPriceContainer: {},
  bottomPriceLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
  },
  bottomPrice: {
    fontSize: FONT_SIZES.xxl,
    color: COLORS.primary,
    fontWeight: '700',
  },
  reserveButton: {
    flex: 1,
    marginLeft: SPACING.md,
  },
});
