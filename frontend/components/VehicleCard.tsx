import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS } from '../constants/theme';
import { Vehicle } from '../types';

interface VehicleCardProps {
  vehicle: Vehicle;
  onPress: () => void;
  compact?: boolean;
}

export const VehicleCard: React.FC<VehicleCardProps> = ({ vehicle, onPress, compact = false }) => {
  const getSegmentColor = () => {
    switch (vehicle.segment) {
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

  if (compact) {
    return (
      <TouchableOpacity style={styles.compactCard} onPress={onPress} activeOpacity={0.7}>
        <Image
          source={{ uri: vehicle.images[0] || 'https://via.placeholder.com/200x120' }}
          style={styles.compactImage}
          resizeMode="cover"
        />
        <View style={styles.compactContent}>
          <Text style={styles.compactBrand}>{vehicle.brand}</Text>
          <Text style={styles.compactModel} numberOfLines={1}>{vehicle.model}</Text>
          <Text style={styles.compactPrice}>₺{vehicle.daily_price}/gün</Text>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <Image
        source={{ uri: vehicle.images[0] || 'https://via.placeholder.com/400x200' }}
        style={styles.image}
        resizeMode="cover"
      />
      <View style={[styles.segmentBadge, { backgroundColor: getSegmentColor() }]}>
        <Text style={styles.segmentText}>{vehicle.segment}</Text>
      </View>
      <View style={styles.content}>
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>{vehicle.brand}</Text>
            <Text style={styles.model}>{vehicle.model}</Text>
          </View>
          <View style={styles.priceContainer}>
            <Text style={styles.price}>₺{vehicle.daily_price}</Text>
            <Text style={styles.priceUnit}>/gün</Text>
          </View>
        </View>
        <View style={styles.features}>
          <View style={styles.feature}>
            <Ionicons name="settings-outline" size={16} color={COLORS.textLight} />
            <Text style={styles.featureText}>{vehicle.transmission}</Text>
          </View>
          <View style={styles.feature}>
            <Ionicons name="water-outline" size={16} color={COLORS.textLight} />
            <Text style={styles.featureText}>{vehicle.fuel_type}</Text>
          </View>
          <View style={styles.feature}>
            <Ionicons name="people-outline" size={16} color={COLORS.textLight} />
            <Text style={styles.featureText}>{vehicle.seats} Kişi</Text>
          </View>
        </View>
        {!vehicle.available && (
          <View style={styles.unavailableBadge}>
            <Text style={styles.unavailableText}>Müsait Değil</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    overflow: 'hidden',
    marginBottom: SPACING.md,
    ...SHADOWS.md,
  },
  image: {
    width: '100%',
    height: 180,
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
  content: {
    padding: SPACING.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  brand: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
    fontWeight: '500',
  },
  model: {
    fontSize: FONT_SIZES.xl,
    color: COLORS.text,
    fontWeight: '700',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  price: {
    fontSize: FONT_SIZES.xxl,
    color: COLORS.primary,
    fontWeight: '700',
  },
  priceUnit: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
    marginLeft: 2,
  },
  features: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  featureText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
  },
  unavailableBadge: {
    marginTop: SPACING.md,
    backgroundColor: COLORS.danger + '20',
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignSelf: 'flex-start',
  },
  unavailableText: {
    color: COLORS.danger,
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
  },
  // Compact styles
  compactCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
    width: 160,
    marginRight: SPACING.md,
    ...SHADOWS.sm,
  },
  compactImage: {
    width: '100%',
    height: 100,
  },
  compactContent: {
    padding: SPACING.sm,
  },
  compactBrand: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textLight,
  },
  compactModel: {
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    fontWeight: '600',
  },
  compactPrice: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.primary,
    fontWeight: '700',
    marginTop: SPACING.xs,
  },
});
