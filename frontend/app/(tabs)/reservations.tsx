import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import { reservationAPI, vehicleAPI } from '../../services/api';
import { Reservation, Vehicle } from '../../types';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS } from '../../constants/theme';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

const TABS = [
  { key: 'active', label: 'Aktif' },
  { key: 'past', label: 'Geçmiş' },
  { key: 'cancelled', label: 'İptal' },
];

export default function ReservationsScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [activeTab, setActiveTab] = useState('active');
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [vehicles, setVehicles] = useState<Record<string, Vehicle>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      fetchReservations();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated, activeTab]);

  const fetchReservations = async () => {
    try {
      const data = await reservationAPI.getReservations();
      
      // Filter based on tab
      let filtered = data;
      if (activeTab === 'active') {
        filtered = data.filter((r: Reservation) => ['pending', 'confirmed', 'active'].includes(r.status));
      } else if (activeTab === 'past') {
        filtered = data.filter((r: Reservation) => r.status === 'completed');
      } else {
        filtered = data.filter((r: Reservation) => r.status === 'cancelled');
      }
      
      setReservations(filtered);
      
      // Fetch vehicles for reservations
      const vehicleIds = [...new Set(filtered.map((r: Reservation) => r.vehicle_id))];
      const vehiclePromises = vehicleIds.map((id) => vehicleAPI.getVehicle(id));
      const vehiclesData = await Promise.all(vehiclePromises);
      const vehiclesMap: Record<string, Vehicle> = {};
      vehiclesData.forEach((v) => {
        vehiclesMap[v.vehicle_id] = v;
      });
      setVehicles(vehiclesMap);
    } catch (error) {
      console.error('Error fetching reservations:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchReservations();
    setRefreshing(false);
  };

  const handleCancel = async (reservationId: string) => {
    Alert.alert(
      'İptal Onayı',
      'Bu rezervasyonu iptal etmek istediğinize emin misiniz?',
      [
        { text: 'Hayır', style: 'cancel' },
        {
          text: 'Evet, İptal Et',
          style: 'destructive',
          onPress: async () => {
            try {
              await reservationAPI.cancelReservation(reservationId);
              Alert.alert('Başarılı', 'Rezervasyon iptal edildi');
              fetchReservations();
            } catch (error) {
              Alert.alert('Hata', 'Rezervasyon iptal edilemedi');
            }
          },
        },
      ]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return COLORS.success;
      case 'pending':
        return COLORS.warning;
      case 'active':
        return COLORS.primaryLight;
      case 'completed':
        return COLORS.textLight;
      case 'cancelled':
        return COLORS.danger;
      default:
        return COLORS.textMuted;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'Onaylandı';
      case 'pending':
        return 'Onay Bekliyor';
      case 'active':
        return 'Aktif';
      case 'completed':
        return 'Tamamlandı';
      case 'cancelled':
        return 'İptal Edildi';
      default:
        return status;
    }
  };

  const renderReservation = useCallback(({ item }: { item: Reservation }) => {
    const vehicle = vehicles[item.vehicle_id];
    
    return (
      <TouchableOpacity style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
            <View style={[styles.statusDot, { backgroundColor: getStatusColor(item.status) }]} />
            <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
              {getStatusText(item.status)}
            </Text>
          </View>
          <Text style={styles.reservationId}>#{item.reservation_id.slice(-8).toUpperCase()}</Text>
        </View>
        
        {vehicle && (
          <View style={styles.vehicleInfo}>
            <Text style={styles.vehicleName}>{vehicle.brand} {vehicle.model}</Text>
            <Text style={styles.vehicleYear}>{vehicle.year}</Text>
          </View>
        )}
        
        <View style={styles.dateRow}>
          <View style={styles.dateItem}>
            <Ionicons name="calendar-outline" size={16} color={COLORS.textLight} />
            <View>
              <Text style={styles.dateLabel}>Alış</Text>
              <Text style={styles.dateValue}>
                {format(new Date(item.pickup_date), 'd MMM yyyy', { locale: tr })}
              </Text>
            </View>
          </View>
          <Ionicons name="arrow-forward" size={16} color={COLORS.textMuted} />
          <View style={styles.dateItem}>
            <Ionicons name="calendar-outline" size={16} color={COLORS.textLight} />
            <View>
              <Text style={styles.dateLabel}>İade</Text>
              <Text style={styles.dateValue}>
                {format(new Date(item.return_date), 'd MMM yyyy', { locale: tr })}
              </Text>
            </View>
          </View>
        </View>
        
        <View style={styles.cardFooter}>
          <View style={styles.priceContainer}>
            <Text style={styles.priceLabel}>Toplam</Text>
            <Text style={styles.price}>₺{item.total_price.toLocaleString('tr-TR')}</Text>
          </View>
          {(item.status === 'pending' || item.status === 'confirmed') && (
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => handleCancel(item.reservation_id)}
            >
              <Text style={styles.cancelButtonText}>İptal Et</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  }, [vehicles]);

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.title}>Rezervasyonlarım</Text>
        </View>
        <View style={styles.emptyState}>
          <Ionicons name="lock-closed-outline" size={64} color={COLORS.textMuted} />
          <Text style={styles.emptyTitle}>Giriş Yapın</Text>
          <Text style={styles.emptyText}>Rezervasyonlarınızı görmek için giriş yapmanız gerekiyor</Text>
          <TouchableOpacity style={styles.loginButton} onPress={() => router.push('/(auth)/login')}>
            <Text style={styles.loginButtonText}>Giriş Yap</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Rezervasyonlarım</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={reservations}
        renderItem={renderReservation}
        keyExtractor={(item) => item.reservation_id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={64} color={COLORS.textMuted} />
            <Text style={styles.emptyTitle}>Rezervasyon Yok</Text>
            <Text style={styles.emptyText}>
              {activeTab === 'active'
                ? 'Henüz aktif rezervasyonunuz bulunmuyor'
                : activeTab === 'past'
                ? 'Geçmiş rezervasyonunuz bulunmuyor'
                : 'İptal edilmiş rezervasyonunuz bulunmuyor'}
            </Text>
            <TouchableOpacity style={styles.browseButton} onPress={() => router.push('/(tabs)/vehicles')}>
              <Text style={styles.browseButtonText}>Araçlara Göz At</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  title: {
    fontSize: FONT_SIZES.title,
    fontWeight: '700',
    color: COLORS.text,
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  tab: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.white,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: COLORS.primary,
  },
  tabText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.text,
  },
  tabTextActive: {
    color: COLORS.white,
  },
  list: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
    gap: SPACING.xs,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
  },
  reservationId: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  vehicleInfo: {
    marginBottom: SPACING.md,
  },
  vehicleName: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
    color: COLORS.text,
  },
  vehicleYear: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.background,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.md,
  },
  dateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  dateLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textMuted,
  },
  dateValue: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.text,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceContainer: {},
  priceLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textMuted,
  },
  price: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
    color: COLORS.primary,
  },
  cancelButton: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.danger + '15',
  },
  cancelButtonText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.danger,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING.xxl,
    paddingHorizontal: SPACING.lg,
  },
  emptyTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: SPACING.md,
  },
  emptyText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textLight,
    marginTop: SPACING.sm,
    textAlign: 'center',
  },
  loginButton: {
    marginTop: SPACING.lg,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.lg,
  },
  loginButtonText: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: FONT_SIZES.md,
  },
  browseButton: {
    marginTop: SPACING.lg,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.lg,
  },
  browseButtonText: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: FONT_SIZES.md,
  },
});
