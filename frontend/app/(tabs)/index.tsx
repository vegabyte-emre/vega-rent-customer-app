import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Dimensions, RefreshControl, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import { useSearchStore } from '../../store/searchStore';
import { vehicleAPI, campaignAPI, locationAPI } from '../../services/api';
import { VehicleCard } from '../../components';
import { Vehicle, Campaign, Location } from '../../types';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS } from '../../constants/theme';

const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const { setSearchParams } = useSearchStore();
  
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentCampaign, setCurrentCampaign] = useState(0);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (campaigns.length > 1) {
      const interval = setInterval(() => {
        setCurrentCampaign((prev) => (prev + 1) % campaigns.length);
      }, 4000);
      return () => clearInterval(interval);
    }
  }, [campaigns]);

  const fetchData = async () => {
    try {
      const [vehiclesData, campaignsData, locationsData] = await Promise.all([
        vehicleAPI.getVehicles({ available: true }),
        campaignAPI.getCampaigns(),
        locationAPI.getLocations(),
      ]);
      setVehicles(vehiclesData.slice(0, 6));
      setCampaigns(campaignsData);
      setLocations(locationsData);
      if (locationsData.length > 0) {
        setSelectedLocation(locationsData[0].name);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const handleSearch = () => {
    setSearchParams({ pickup_location: selectedLocation });
    router.push('/(tabs)/vehicles');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hoş Geldiniz{user ? `, ${user.name.split(' ')[0]}` : ''} 👋</Text>
            <Text style={styles.subtitle}>Hayalinizdeki aracı bulun</Text>
          </View>
          <TouchableOpacity
            style={styles.notificationButton}
            onPress={() => router.push('/(tabs)/notifications')}
          >
            <Ionicons name="notifications-outline" size={24} color={COLORS.text} />
          </TouchableOpacity>
        </View>

        {/* Search Card */}
        <View style={styles.searchCard}>
          <Text style={styles.searchTitle}>Araç Ara</Text>
          
          <View style={styles.inputGroup}>
            <Ionicons name="location-outline" size={20} color={COLORS.primary} />
            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>Alış Lokasyonu</Text>
              <TouchableOpacity style={styles.selectButton}>
                <Text style={styles.selectText} numberOfLines={1}>
                  {selectedLocation || 'Lokasyon Seçin'}
                </Text>
                <Ionicons name="chevron-down" size={16} color={COLORS.textLight} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.dateRow}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Ionicons name="calendar-outline" size={20} color={COLORS.primary} />
              <View style={styles.inputWrapper}>
                <Text style={styles.inputLabel}>Alış Tarihi</Text>
                <Text style={styles.selectText}>Bugün</Text>
              </View>
            </View>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Ionicons name="calendar-outline" size={20} color={COLORS.primary} />
              <View style={styles.inputWrapper}>
                <Text style={styles.inputLabel}>İade Tarihi</Text>
                <Text style={styles.selectText}>Yarın</Text>
              </View>
            </View>
          </View>

          <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
            <Ionicons name="search" size={20} color={COLORS.white} />
            <Text style={styles.searchButtonText}>Araç Ara</Text>
          </TouchableOpacity>
        </View>

        {/* Campaigns */}
        {campaigns.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Kampanyalar</Text>
            <View style={styles.campaignCard}>
              <Image
                source={{ uri: campaigns[currentCampaign]?.image }}
                style={styles.campaignImage}
                resizeMode="cover"
              />
              <View style={styles.campaignOverlay}>
                <View style={styles.campaignBadge}>
                  <Text style={styles.campaignBadgeText}>
                    %{campaigns[currentCampaign]?.discount_percent} İndirim
                  </Text>
                </View>
                <Text style={styles.campaignTitle}>{campaigns[currentCampaign]?.title}</Text>
                <Text style={styles.campaignDescription}>{campaigns[currentCampaign]?.description}</Text>
              </View>
              <View style={styles.campaignDots}>
                {campaigns.map((_, index) => (
                  <View
                    key={index}
                    style={[styles.dot, currentCampaign === index && styles.dotActive]}
                  />
                ))}
              </View>
            </View>
          </View>
        )}

        {/* Popular Vehicles */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Popüler Araçlar</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/vehicles')}>
              <Text style={styles.seeAll}>Tümünü Gör</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.vehiclesList}>
            {vehicles.map((vehicle) => (
              <VehicleCard
                key={vehicle.vehicle_id}
                vehicle={vehicle}
                compact
                onPress={() => router.push(`/vehicle/${vehicle.vehicle_id}`)}
              />
            ))}
          </ScrollView>
        </View>

        {/* Quick Stats */}
        <View style={styles.section}>
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Ionicons name="car-sport" size={28} color={COLORS.primary} />
              <Text style={styles.statNumber}>{vehicles.length}+</Text>
              <Text style={styles.statLabel}>Araç</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="location" size={28} color={COLORS.success} />
              <Text style={styles.statNumber}>{locations.length}</Text>
              <Text style={styles.statLabel}>Lokasyon</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="star" size={28} color={COLORS.warning} />
              <Text style={styles.statNumber}>4.8</Text>
              <Text style={styles.statLabel}>Puan</Text>
            </View>
          </View>
        </View>

        {/* CTA for non-authenticated users */}
        {!isAuthenticated && (
          <View style={styles.ctaCard}>
            <Ionicons name="gift-outline" size={40} color={COLORS.primary} />
            <Text style={styles.ctaTitle}>Üye Olun, Avantajlardan Yararlanın!</Text>
            <Text style={styles.ctaDescription}>Kayıt olarak özel indirimlerden ve kampanyalardan haberdar olun.</Text>
            <TouchableOpacity style={styles.ctaButton} onPress={() => router.push('/(auth)/register')}>
              <Text style={styles.ctaButtonText}>Ücretsiz Kayıt Ol</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: SPACING.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  greeting: {
    fontSize: FONT_SIZES.title,
    fontWeight: '700',
    color: COLORS.text,
  },
  subtitle: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textLight,
    marginTop: SPACING.xs,
  },
  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  searchCard: {
    margin: SPACING.lg,
    padding: SPACING.lg,
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    ...SHADOWS.md,
  },
  searchTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.lg,
  },
  inputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    gap: SPACING.md,
  },
  inputWrapper: {
    flex: 1,
  },
  inputLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textMuted,
    marginBottom: 2,
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    fontWeight: '500',
  },
  dateRow: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  searchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.lg,
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  searchButtonText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.white,
  },
  section: {
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  seeAll: {
    fontSize: FONT_SIZES.md,
    color: COLORS.primary,
    fontWeight: '600',
  },
  vehiclesList: {
    paddingRight: SPACING.lg,
  },
  campaignCard: {
    borderRadius: BORDER_RADIUS.xl,
    overflow: 'hidden',
    height: 180,
    ...SHADOWS.md,
  },
  campaignImage: {
    width: '100%',
    height: '100%',
  },
  campaignOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    padding: SPACING.lg,
    justifyContent: 'flex-end',
  },
  campaignBadge: {
    backgroundColor: COLORS.danger,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
    alignSelf: 'flex-start',
    marginBottom: SPACING.sm,
  },
  campaignBadgeText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
  },
  campaignTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
    color: COLORS.white,
  },
  campaignDescription: {
    fontSize: FONT_SIZES.sm,
    color: 'rgba(255,255,255,0.9)',
    marginTop: SPACING.xs,
  },
  campaignDots: {
    position: 'absolute',
    bottom: SPACING.md,
    right: SPACING.md,
    flexDirection: 'row',
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
  statsRow: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  statNumber: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: SPACING.sm,
  },
  statLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
  },
  ctaCard: {
    margin: SPACING.lg,
    padding: SPACING.xl,
    backgroundColor: COLORS.primary + '10',
    borderRadius: BORDER_RADIUS.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.primary + '30',
  },
  ctaTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: SPACING.md,
    textAlign: 'center',
  },
  ctaDescription: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textLight,
    textAlign: 'center',
    marginTop: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  ctaButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
  },
  ctaButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.white,
  },
});
