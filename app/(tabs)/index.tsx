import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Dimensions, RefreshControl } from 'react-native';
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
const COMPANY_NAME = "Vega Rent";

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

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Günaydın';
    if (hour < 18) return 'İyi Günler';
    return 'İyi Akşamlar';
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.logoContainer}>
              <Ionicons name="car-sport" size={24} color={COLORS.primary} />
            </View>
            <View>
              <Text style={styles.brandName}>{COMPANY_NAME}</Text>
              <Text style={styles.greeting}>
                {getGreeting()}{user ? `, ${user.name.split(' ')[0]}` : ''}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.notificationButton}
            onPress={() => router.push('/(tabs)/notifications')}
          >
            <Ionicons name="notifications-outline" size={24} color={COLORS.text} />
          </TouchableOpacity>
        </View>

        {/* Hero Banner */}
        <View style={styles.heroBanner}>
          <View style={styles.heroContent}>
            <Text style={styles.heroTitle}>Premium Araç{"\n"}Kiralama Deneyimi</Text>
            <Text style={styles.heroSubtitle}>En geniş araç filosuyla hizmetinizdeyiz</Text>
            <TouchableOpacity style={styles.heroButton} onPress={handleSearch}>
              <Ionicons name="search" size={18} color={COLORS.white} />
              <Text style={styles.heroButtonText}>Araç Bul</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.heroIconContainer}>
            <Ionicons name="car-sport" size={80} color="rgba(255,255,255,0.3)" />
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.quickAction} onPress={() => router.push('/(tabs)/vehicles')}>
            <View style={[styles.quickActionIcon, { backgroundColor: COLORS.primary + '15' }]}>
              <Ionicons name="car" size={22} color={COLORS.primary} />
            </View>
            <Text style={styles.quickActionText}>Tüm Araçlar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickAction} onPress={() => router.push('/(tabs)/reservations')}>
            <View style={[styles.quickActionIcon, { backgroundColor: COLORS.success + '15' }]}>
              <Ionicons name="calendar" size={22} color={COLORS.success} />
            </View>
            <Text style={styles.quickActionText}>Rezervasyonlar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickAction} onPress={() => router.push('/(tabs)/profile')}>
            <View style={[styles.quickActionIcon, { backgroundColor: COLORS.warning + '15' }]}>
              <Ionicons name="person" size={22} color={COLORS.warning} />
            </View>
            <Text style={styles.quickActionText}>Hesabım</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickAction}>
            <View style={[styles.quickActionIcon, { backgroundColor: COLORS.danger + '15' }]}>
              <Ionicons name="call" size={22} color={COLORS.danger} />
            </View>
            <Text style={styles.quickActionText}>Destek</Text>
          </TouchableOpacity>
        </View>

        {/* Campaigns */}
        {campaigns.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Kampanyalar</Text>
              <View style={styles.campaignIndicator}>
                <Ionicons name="pricetag" size={14} color={COLORS.danger} />
                <Text style={styles.campaignCount}>{campaigns.length} Aktif</Text>
              </View>
            </View>
            <View style={styles.campaignCard}>
              <Image
                source={{ uri: campaigns[currentCampaign]?.image }}
                style={styles.campaignImage}
                resizeMode="cover"
              />
              <View style={styles.campaignOverlay}>
                {campaigns[currentCampaign]?.discount_percent > 0 && (
                  <View style={styles.campaignBadge}>
                    <Text style={styles.campaignBadgeText}>
                      %{campaigns[currentCampaign]?.discount_percent} İndirim
                    </Text>
                  </View>
                )}
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
            <TouchableOpacity onPress={() => router.push('/(tabs)/vehicles')} style={styles.seeAllButton}>
              <Text style={styles.seeAll}>Tümünü Gör</Text>
              <Ionicons name="arrow-forward" size={14} color={COLORS.primary} />
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

        {/* Stats */}
        <View style={styles.section}>
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <View style={styles.statIconContainer}>
                <Ionicons name="car-sport" size={24} color={COLORS.primary} />
              </View>
              <Text style={styles.statNumber}>{vehicles.length}+</Text>
              <Text style={styles.statLabel}>Araç</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <View style={styles.statIconContainer}>
                <Ionicons name="location" size={24} color={COLORS.success} />
              </View>
              <Text style={styles.statNumber}>{locations.length}</Text>
              <Text style={styles.statLabel}>Lokasyon</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <View style={styles.statIconContainer}>
                <Ionicons name="star" size={24} color={COLORS.warning} />
              </View>
              <Text style={styles.statNumber}>4.9</Text>
              <Text style={styles.statLabel}>Puan</Text>
            </View>
          </View>
        </View>

        {/* CTA for non-authenticated users */}
        {!isAuthenticated && (
          <View style={styles.ctaCard}>
            <View style={styles.ctaIconContainer}>
              <Ionicons name="gift" size={32} color={COLORS.primary} />
            </View>
            <View style={styles.ctaContent}>
              <Text style={styles.ctaTitle}>Üye Olun!</Text>
              <Text style={styles.ctaDescription}>Özel indirimler ve kampanyalardan yararlanın</Text>
            </View>
            <TouchableOpacity style={styles.ctaButton} onPress={() => router.push('/(auth)/register')}>
              <Text style={styles.ctaButtonText}>Kayıt Ol</Text>
              <Ionicons name="arrow-forward" size={16} color={COLORS.white} />
            </TouchableOpacity>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footerSection}>
          <View style={styles.footerLogo}>
            <Ionicons name="car-sport" size={20} color={COLORS.primary} />
            <Text style={styles.footerBrand}>{COMPANY_NAME}</Text>
          </View>
          <Text style={styles.footerText}>Premium Araç Kiralama Hizmetleri</Text>
          <Text style={styles.footerCopyright}>© 2025 {COMPANY_NAME}. Tüm hakları saklıdır.</Text>
        </View>

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
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  logoContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandName: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.primary,
  },
  greeting: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
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
  heroBanner: {
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.xl,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  heroContent: {
    flex: 1,
  },
  heroTitle: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '700',
    color: COLORS.white,
    lineHeight: 28,
  },
  heroSubtitle: {
    fontSize: FONT_SIZES.sm,
    color: 'rgba(255,255,255,0.8)',
    marginTop: SPACING.sm,
  },
  heroButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
    alignSelf: 'flex-start',
    marginTop: SPACING.lg,
    gap: SPACING.xs,
  },
  heroButtonText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.primary,
  },
  heroIconContainer: {
    position: 'absolute',
    right: -20,
    bottom: -20,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  quickAction: {
    alignItems: 'center',
    gap: SPACING.sm,
  },
  quickActionIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickActionText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.text,
    fontWeight: '500',
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
  },
  campaignIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: COLORS.danger + '10',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
  },
  campaignCount: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.danger,
    fontWeight: '600',
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  seeAll: {
    fontSize: FONT_SIZES.sm,
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
    backgroundColor: 'rgba(0,0,0,0.45)',
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
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    ...SHADOWS.sm,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  statNumber: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '700',
    color: COLORS.text,
  },
  statLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
  },
  statDivider: {
    width: 1,
    backgroundColor: COLORS.borderLight,
    marginHorizontal: SPACING.md,
  },
  ctaCard: {
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.lg,
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.primary + '20',
    ...SHADOWS.sm,
  },
  ctaIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary + '10',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  ctaContent: {
    flex: 1,
  },
  ctaTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.text,
  },
  ctaDescription: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
    marginTop: 2,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.lg,
    gap: SPACING.xs,
  },
  ctaButtonText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.white,
  },
  footerSection: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    marginHorizontal: SPACING.lg,
  },
  footerLogo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  footerBrand: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.primary,
  },
  footerText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
  },
  footerCopyright: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textMuted,
    marginTop: SPACING.sm,
  },
});
