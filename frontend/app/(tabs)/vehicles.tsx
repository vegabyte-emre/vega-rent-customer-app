import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, ScrollView, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { vehicleAPI } from '../../services/api';
import { VehicleCard } from '../../components';
import { Vehicle, FilterParams } from '../../types';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS } from '../../constants/theme';

const SEGMENTS = ['Tümü', 'Ekonomi', 'Orta', 'Lüks', 'SUV', 'Minivan'];
const TRANSMISSIONS = ['Tümü', 'Otomatik', 'Manuel'];
const FUEL_TYPES = ['Tümü', 'Benzin', 'Dizel', 'Hibrit', 'Elektrik'];

export default function VehiclesScreen() {
  const router = useRouter();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterParams>({});
  const [activeSegment, setActiveSegment] = useState('Tümü');
  const [sortBy, setSortBy] = useState<'price_asc' | 'price_desc' | 'year'>('price_asc');

  useEffect(() => {
    fetchVehicles();
  }, [filters, sortBy]);

  const fetchVehicles = async () => {
    try {
      const params: Record<string, any> = { ...filters };
      
      if (sortBy === 'price_asc') {
        params.sort_by = 'daily_price';
        params.sort_order = 'asc';
      } else if (sortBy === 'price_desc') {
        params.sort_by = 'daily_price';
        params.sort_order = 'desc';
      } else {
        params.sort_by = 'year';
        params.sort_order = 'desc';
      }
      
      const data = await vehicleAPI.getVehicles(params);
      setVehicles(data);
    } catch (error) {
      console.error('Error fetching vehicles:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchVehicles();
    setRefreshing(false);
  };

  const handleSegmentChange = (segment: string) => {
    setActiveSegment(segment);
    if (segment === 'Tümü') {
      const { segment: _, ...rest } = filters;
      setFilters(rest);
    } else {
      setFilters({ ...filters, segment });
    }
  };

  const applyFilters = (newFilters: FilterParams) => {
    setFilters(newFilters);
    setShowFilters(false);
  };

  const clearFilters = () => {
    setFilters({});
    setActiveSegment('Tümü');
  };

  const renderVehicle = useCallback(({ item }: { item: Vehicle }) => (
    <View style={styles.vehicleWrapper}>
      <VehicleCard
        vehicle={item}
        onPress={() => router.push(`/vehicle/${item.vehicle_id}`)}
      />
    </View>
  ), []);

  const hasActiveFilters = Object.keys(filters).length > 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Araçlar</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.filterButton, hasActiveFilters && styles.filterButtonActive]}
            onPress={() => setShowFilters(true)}
          >
            <Ionicons name="options-outline" size={20} color={hasActiveFilters ? COLORS.white : COLORS.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Segment Tabs */}
      <View style={styles.segmentContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.segmentScroll}>
          {SEGMENTS.map((segment) => (
            <TouchableOpacity
              key={segment}
              style={[styles.segmentTab, activeSegment === segment && styles.segmentTabActive]}
              onPress={() => handleSegmentChange(segment)}
            >
              <Text style={[styles.segmentText, activeSegment === segment && styles.segmentTextActive]}>
                {segment}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Sort Bar */}
      <View style={styles.sortBar}>
        <Text style={styles.resultCount}>{vehicles.length} araç bulundu</Text>
        <TouchableOpacity
          style={styles.sortButton}
          onPress={() => {
            if (sortBy === 'price_asc') setSortBy('price_desc');
            else if (sortBy === 'price_desc') setSortBy('year');
            else setSortBy('price_asc');
          }}
        >
          <Ionicons name="swap-vertical" size={16} color={COLORS.primary} />
          <Text style={styles.sortText}>
            {sortBy === 'price_asc' ? 'Fiyat (Artan)' : sortBy === 'price_desc' ? 'Fiyat (Azalan)' : 'En Yeni'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Vehicle List */}
      <FlatList
        data={vehicles}
        renderItem={renderVehicle}
        keyExtractor={(item) => item.vehicle_id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="car-outline" size={64} color={COLORS.textMuted} />
            <Text style={styles.emptyTitle}>Araç Bulunamadı</Text>
            <Text style={styles.emptyText}>Farklı filtreler deneyebilirsiniz</Text>
            {hasActiveFilters && (
              <TouchableOpacity style={styles.clearButton} onPress={clearFilters}>
                <Text style={styles.clearButtonText}>Filtreleri Temizle</Text>
              </TouchableOpacity>
            )}
          </View>
        }
      />

      {/* Filter Modal */}
      <FilterModal
        visible={showFilters}
        onClose={() => setShowFilters(false)}
        filters={filters}
        onApply={applyFilters}
        onClear={clearFilters}
      />
    </SafeAreaView>
  );
}

interface FilterModalProps {
  visible: boolean;
  onClose: () => void;
  filters: FilterParams;
  onApply: (filters: FilterParams) => void;
  onClear: () => void;
}

const FilterModal: React.FC<FilterModalProps> = ({ visible, onClose, filters, onApply, onClear }) => {
  const [localFilters, setLocalFilters] = useState<FilterParams>(filters);

  useEffect(() => {
    setLocalFilters(filters);
  }, [filters, visible]);

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filtrele</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Transmission */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Vites Tipi</Text>
              <View style={styles.filterOptions}>
                {TRANSMISSIONS.map((item) => (
                  <TouchableOpacity
                    key={item}
                    style={[
                      styles.filterOption,
                      (item === 'Tümü' ? !localFilters.transmission : localFilters.transmission === item) && styles.filterOptionActive,
                    ]}
                    onPress={() => {
                      if (item === 'Tümü') {
                        const { transmission, ...rest } = localFilters;
                        setLocalFilters(rest);
                      } else {
                        setLocalFilters({ ...localFilters, transmission: item });
                      }
                    }}
                  >
                    <Text style={[
                      styles.filterOptionText,
                      (item === 'Tümü' ? !localFilters.transmission : localFilters.transmission === item) && styles.filterOptionTextActive,
                    ]}>
                      {item}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Fuel Type */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Yakıt Tipi</Text>
              <View style={styles.filterOptions}>
                {FUEL_TYPES.map((item) => (
                  <TouchableOpacity
                    key={item}
                    style={[
                      styles.filterOption,
                      (item === 'Tümü' ? !localFilters.fuel_type : localFilters.fuel_type === item) && styles.filterOptionActive,
                    ]}
                    onPress={() => {
                      if (item === 'Tümü') {
                        const { fuel_type, ...rest } = localFilters;
                        setLocalFilters(rest);
                      } else {
                        setLocalFilters({ ...localFilters, fuel_type: item });
                      }
                    }}
                  >
                    <Text style={[
                      styles.filterOptionText,
                      (item === 'Tümü' ? !localFilters.fuel_type : localFilters.fuel_type === item) && styles.filterOptionTextActive,
                    ]}>
                      {item}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.clearFiltersButton} onPress={() => { onClear(); onClose(); }}>
              <Text style={styles.clearFiltersText}>Temizle</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.applyButton} onPress={() => onApply(localFilters)}>
              <Text style={styles.applyButtonText}>Uygula</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

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
  title: {
    fontSize: FONT_SIZES.title,
    fontWeight: '700',
    color: COLORS.text,
  },
  headerActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  filterButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  filterButtonActive: {
    backgroundColor: COLORS.primary,
  },
  segmentContainer: {
    paddingVertical: SPACING.sm,
  },
  segmentScroll: {
    paddingHorizontal: SPACING.lg,
    gap: SPACING.sm,
  },
  segmentTab: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.white,
    marginRight: SPACING.sm,
  },
  segmentTabActive: {
    backgroundColor: COLORS.primary,
  },
  segmentText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    fontWeight: '500',
  },
  segmentTextActive: {
    color: COLORS.white,
  },
  sortBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
  },
  resultCount: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  sortText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.primary,
    fontWeight: '500',
  },
  list: {
    padding: SPACING.lg,
  },
  vehicleWrapper: {
    marginBottom: SPACING.md,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING.xxl,
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
  },
  clearButton: {
    marginTop: SPACING.lg,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.lg,
  },
  clearButtonText: {
    color: COLORS.white,
    fontWeight: '600',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: BORDER_RADIUS.xxl,
    borderTopRightRadius: BORDER_RADIUS.xxl,
    paddingTop: SPACING.lg,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  modalTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
    color: COLORS.text,
  },
  filterSection: {
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  filterLabel: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  filterOption: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterOptionActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterOptionText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
  },
  filterOptionTextActive: {
    color: COLORS.white,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: SPACING.lg,
    gap: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  clearFiltersButton: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  clearFiltersText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.text,
  },
  applyButton: {
    flex: 2,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.white,
  },
});
