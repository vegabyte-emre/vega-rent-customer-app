import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, TextInput } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { vehicleAPI, reservationAPI, locationAPI } from '../../services/api';
import { Vehicle, Location } from '../../types';
import { Button, Input } from '../../components';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS } from '../../constants/theme';
import { format, addDays, differenceInDays } from 'date-fns';
import { tr } from 'date-fns/locale';

const STEPS = ['Tarih', 'Ek Hizmetler', 'Sürücü', 'Ödeme', 'Onay'];

const EXTRAS = [
  { id: 'ek_surucu', name: 'Ek Sürücü', price: 150, icon: 'person-add-outline' },
  { id: 'bebek_koltugu', name: 'Bebek Koltuğu', price: 100, icon: 'car-sport-outline' },
  { id: 'gps', name: 'GPS Cihazı', price: 75, icon: 'navigate-outline' },
  { id: 'tam_kasko', name: 'Tam Kasko', price: 200, icon: 'shield-checkmark-outline' },
  { id: 'mini_hasar', name: 'Mini Hasar Muafiyeti', price: 100, icon: 'construct-outline' },
];

export default function ReservationScreen() {
  const { vehicleId } = useLocalSearchParams<{ vehicleId: string }>();
  const router = useRouter();
  
  const [currentStep, setCurrentStep] = useState(0);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // Form state
  const [pickupDate, setPickupDate] = useState(new Date());
  const [returnDate, setReturnDate] = useState(addDays(new Date(), 1));
  const [pickupLocation, setPickupLocation] = useState('');
  const [returnLocation, setReturnLocation] = useState('');
  const [selectedExtras, setSelectedExtras] = useState<string[]>([]);
  const [driverInfo, setDriverInfo] = useState({
    tc_kimlik: '',
    ehliyet_no: '',
    ehliyet_sinifi: 'B',
    ehliyet_tarihi: '',
  });
  const [cardInfo, setCardInfo] = useState({
    number: '',
    expiry: '',
    cvv: '',
    name: '',
  });
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [reservationResult, setReservationResult] = useState<any>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [vehicleData, locationsData] = await Promise.all([
        vehicleAPI.getVehicle(vehicleId!),
        locationAPI.getLocations(),
      ]);
      setVehicle(vehicleData);
      setLocations(locationsData);
      if (locationsData.length > 0) {
        setPickupLocation(locationsData[0].name);
        setReturnLocation(locationsData[0].name);
      }
    } catch (error) {
      Alert.alert('Hata', 'Veriler yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const days = Math.max(1, differenceInDays(returnDate, pickupDate));
  const vehiclePrice = (vehicle?.daily_price || 0) * days;
  const extrasPrice = selectedExtras.reduce((sum, id) => {
    const extra = EXTRAS.find((e) => e.id === id);
    return sum + (extra?.price || 0) * days;
  }, 0);
  const totalPrice = vehiclePrice + extrasPrice;

  const toggleExtra = (id: string) => {
    setSelectedExtras((prev) =>
      prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id]
    );
  };

  const validateStep = () => {
    switch (currentStep) {
      case 0:
        if (!pickupLocation || !returnLocation) {
          Alert.alert('Hata', 'Lütfen lokasyonları seçin');
          return false;
        }
        return true;
      case 1:
        return true;
      case 2:
        if (!driverInfo.tc_kimlik || !driverInfo.ehliyet_no) {
          Alert.alert('Hata', 'Lütfen sürücü bilgilerini doldurun');
          return false;
        }
        return true;
      case 3:
        if (!cardInfo.number || !cardInfo.expiry || !cardInfo.cvv || !cardInfo.name) {
          Alert.alert('Hata', 'Lütfen kart bilgilerini doldurun');
          return false;
        }
        return true;
      case 4:
        if (!acceptTerms) {
          Alert.alert('Hata', 'Lütfen koşulları kabul edin');
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (!validateStep()) return;
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    if (!validateStep()) return;
    
    setSubmitting(true);
    try {
      // Create reservation
      const reservation = await reservationAPI.createReservation({
        vehicle_id: vehicleId,
        pickup_date: pickupDate.toISOString(),
        return_date: returnDate.toISOString(),
        pickup_location: pickupLocation,
        return_location: returnLocation,
        extras: selectedExtras,
        driver_info: driverInfo,
      });
      
      // Mock payment
      await reservationAPI.payReservation(reservation.reservation_id);
      
      setReservationResult(reservation);
      setCurrentStep(5); // Success screen
    } catch (error: any) {
      Alert.alert('Hata', error.response?.data?.detail || 'Rezervasyon oluşturulamadı');
    } finally {
      setSubmitting(false);
    }
  };

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      {STEPS.map((step, index) => (
        <View key={index} style={styles.stepItem}>
          <View style={[
            styles.stepCircle,
            index <= currentStep && styles.stepCircleActive,
            index < currentStep && styles.stepCircleCompleted,
          ]}>
            {index < currentStep ? (
              <Ionicons name="checkmark" size={14} color={COLORS.white} />
            ) : (
              <Text style={[
                styles.stepNumber,
                index <= currentStep && styles.stepNumberActive,
              ]}>
                {index + 1}
              </Text>
            )}
          </View>
          {index < STEPS.length - 1 && (
            <View style={[styles.stepLine, index < currentStep && styles.stepLineActive]} />
          )}
        </View>
      ))}
    </View>
  );

  const renderStep0 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Tarih & Lokasyon</Text>
      
      <View style={styles.dateCard}>
        <View style={styles.dateRow}>
          <View style={styles.dateItem}>
            <Text style={styles.dateLabel}>Alış Tarihi</Text>
            <Text style={styles.dateValue}>
              {format(pickupDate, 'd MMMM yyyy', { locale: tr })}
            </Text>
          </View>
          <Ionicons name="arrow-forward" size={20} color={COLORS.textMuted} />
          <View style={styles.dateItem}>
            <Text style={styles.dateLabel}>İade Tarihi</Text>
            <Text style={styles.dateValue}>
              {format(returnDate, 'd MMMM yyyy', { locale: tr })}
            </Text>
          </View>
        </View>
        <Text style={styles.daysText}>{days} gün</Text>
      </View>

      <View style={styles.locationSection}>
        <Text style={styles.inputLabel}>Alış Lokasyonu</Text>
        <View style={styles.locationCard}>
          {locations.map((loc) => (
            <TouchableOpacity
              key={loc.location_id}
              style={[
                styles.locationOption,
                pickupLocation === loc.name && styles.locationOptionActive,
              ]}
              onPress={() => setPickupLocation(loc.name)}
            >
              <Ionicons
                name={loc.type === 'airport' ? 'airplane' : 'business'}
                size={16}
                color={pickupLocation === loc.name ? COLORS.white : COLORS.textLight}
              />
              <Text style={[
                styles.locationText,
                pickupLocation === loc.name && styles.locationTextActive,
              ]}>
                {loc.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <TouchableOpacity
        style={styles.sameLocationButton}
        onPress={() => setReturnLocation(pickupLocation)}
      >
        <Ionicons
          name={returnLocation === pickupLocation ? 'checkbox' : 'square-outline'}
          size={20}
          color={COLORS.primary}
        />
        <Text style={styles.sameLocationText}>İade aynı lokasyona yapılacak</Text>
      </TouchableOpacity>
    </View>
  );

  const renderStep1 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Ek Hizmetler</Text>
      <Text style={styles.stepSubtitle}>Kiralamanıza eklemek istediğiniz hizmetleri seçin</Text>
      
      {EXTRAS.map((extra) => (
        <TouchableOpacity
          key={extra.id}
          style={[
            styles.extraCard,
            selectedExtras.includes(extra.id) && styles.extraCardActive,
          ]}
          onPress={() => toggleExtra(extra.id)}
        >
          <View style={[
            styles.extraIcon,
            selectedExtras.includes(extra.id) && styles.extraIconActive,
          ]}>
            <Ionicons
              name={extra.icon as any}
              size={24}
              color={selectedExtras.includes(extra.id) ? COLORS.white : COLORS.primary}
            />
          </View>
          <View style={styles.extraContent}>
            <Text style={styles.extraName}>{extra.name}</Text>
            <Text style={styles.extraPrice}>₺{extra.price}/gün</Text>
          </View>
          <View style={[
            styles.checkbox,
            selectedExtras.includes(extra.id) && styles.checkboxActive,
          ]}>
            {selectedExtras.includes(extra.id) && (
              <Ionicons name="checkmark" size={16} color={COLORS.white} />
            )}
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Sürücü Bilgileri</Text>
      
      <Input
        label="TC Kimlik No *"
        placeholder="XXXXXXXXXXX"
        value={driverInfo.tc_kimlik}
        onChangeText={(text) => setDriverInfo({ ...driverInfo, tc_kimlik: text })}
        keyboardType="number-pad"
        maxLength={11}
        leftIcon="card-outline"
      />
      
      <Input
        label="Ehliyet No *"
        placeholder="Ehliyet numarasınız"
        value={driverInfo.ehliyet_no}
        onChangeText={(text) => setDriverInfo({ ...driverInfo, ehliyet_no: text })}
        leftIcon="document-outline"
      />
      
      <Input
        label="Ehliyet Alış Tarihi"
        placeholder="GG/AA/YYYY"
        value={driverInfo.ehliyet_tarihi}
        onChangeText={(text) => setDriverInfo({ ...driverInfo, ehliyet_tarihi: text })}
        leftIcon="calendar-outline"
      />
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Ödeme Bilgileri</Text>
      
      <View style={styles.priceBreakdown}>
        <View style={styles.priceRow}>
          <Text style={styles.priceLabel}>Araç ({days} gün)</Text>
          <Text style={styles.priceValue}>₺{vehiclePrice.toLocaleString('tr-TR')}</Text>
        </View>
        {selectedExtras.length > 0 && (
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Ek Hizmetler</Text>
            <Text style={styles.priceValue}>₺{extrasPrice.toLocaleString('tr-TR')}</Text>
          </View>
        )}
        <View style={[styles.priceRow, styles.totalRow]}>
          <Text style={styles.totalLabel}>Toplam</Text>
          <Text style={styles.totalValue}>₺{totalPrice.toLocaleString('tr-TR')}</Text>
        </View>
      </View>

      <Input
        label="Kart Numarası *"
        placeholder="0000 0000 0000 0000"
        value={cardInfo.number}
        onChangeText={(text) => setCardInfo({ ...cardInfo, number: text })}
        keyboardType="number-pad"
        maxLength={19}
        leftIcon="card-outline"
      />
      
      <View style={styles.cardRow}>
        <View style={{ flex: 1 }}>
          <Input
            label="Son Kullanma *"
            placeholder="AA/YY"
            value={cardInfo.expiry}
            onChangeText={(text) => setCardInfo({ ...cardInfo, expiry: text })}
            maxLength={5}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Input
            label="CVV *"
            placeholder="***"
            value={cardInfo.cvv}
            onChangeText={(text) => setCardInfo({ ...cardInfo, cvv: text })}
            keyboardType="number-pad"
            maxLength={3}
            secureTextEntry
          />
        </View>
      </View>
      
      <Input
        label="Kart Üzerindeki İsim *"
        placeholder="AD SOYAD"
        value={cardInfo.name}
        onChangeText={(text) => setCardInfo({ ...cardInfo, name: text })}
        autoCapitalize="characters"
        leftIcon="person-outline"
      />
      
      <View style={styles.secureNote}>
        <Ionicons name="lock-closed" size={16} color={COLORS.success} />
        <Text style={styles.secureText}>256-bit SSL ile güvenli ödeme</Text>
      </View>
    </View>
  );

  const renderStep4 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Rezervasyon Özeti</Text>
      
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>{vehicle?.brand} {vehicle?.model}</Text>
        <View style={styles.summaryRow}>
          <Ionicons name="calendar-outline" size={16} color={COLORS.textLight} />
          <Text style={styles.summaryText}>
            {format(pickupDate, 'd MMM', { locale: tr })} - {format(returnDate, 'd MMM yyyy', { locale: tr })} ({days} gün)
          </Text>
        </View>
        <View style={styles.summaryRow}>
          <Ionicons name="location-outline" size={16} color={COLORS.textLight} />
          <Text style={styles.summaryText}>{pickupLocation}</Text>
        </View>
        {selectedExtras.length > 0 && (
          <View style={styles.summaryRow}>
            <Ionicons name="add-circle-outline" size={16} color={COLORS.textLight} />
            <Text style={styles.summaryText}>
              {selectedExtras.map((id) => EXTRAS.find((e) => e.id === id)?.name).join(', ')}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.totalCard}>
        <Text style={styles.totalCardLabel}>Ödenecek Tutar</Text>
        <Text style={styles.totalCardValue}>₺{totalPrice.toLocaleString('tr-TR')}</Text>
      </View>

      <TouchableOpacity
        style={styles.termsRow}
        onPress={() => setAcceptTerms(!acceptTerms)}
      >
        <View style={[styles.termsCheckbox, acceptTerms && styles.termsCheckboxActive]}>
          {acceptTerms && <Ionicons name="checkmark" size={16} color={COLORS.white} />}
        </View>
        <Text style={styles.termsText}>
          <Text style={styles.termsLink}>Kiralama Sözleşmesi</Text> ve{' '}
          <Text style={styles.termsLink}>KVKK</Text> koşullarını okudum ve kabul ediyorum
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderSuccess = () => (
    <View style={styles.successContainer}>
      <View style={styles.successIcon}>
        <Ionicons name="checkmark-circle" size={80} color={COLORS.success} />
      </View>
      <Text style={styles.successTitle}>Rezervasyon Tamamlandı!</Text>
      <Text style={styles.successSubtitle}>Rezervasyonunuz başarıyla oluşturuldu</Text>
      
      <View style={styles.reservationIdCard}>
        <Text style={styles.reservationIdLabel}>Rezervasyon No</Text>
        <Text style={styles.reservationIdValue}>
          #{reservationResult?.reservation_id?.slice(-8).toUpperCase()}
        </Text>
      </View>

      <View style={styles.qrContainer}>
        <View style={styles.qrPlaceholder}>
          <Ionicons name="qr-code" size={100} color={COLORS.text} />
        </View>
        <Text style={styles.qrText}>Bu QR kodu araç teslimında gösterin</Text>
      </View>

      <Button
        title="Rezervasyonlarıma Git"
        onPress={() => router.replace('/(tabs)/reservations')}
        style={{ marginTop: SPACING.lg }}
      />
      <Button
        title="Ana Sayfaya Dön"
        variant="outline"
        onPress={() => router.replace('/(tabs)')}
        style={{ marginTop: SPACING.sm }}
      />
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Yükleniyor...</Text>
      </View>
    );
  }

  if (currentStep === 5) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <ScrollView style={styles.container} contentContainerStyle={styles.successScroll}>
          {renderSuccess()}
        </ScrollView>
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerTitle: STEPS[currentStep],
        }}
      />
      <View style={styles.container}>
        {renderStepIndicator()}
        
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {currentStep === 0 && renderStep0()}
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
          {currentStep === 4 && renderStep4()}
        </ScrollView>

        <View style={styles.footer}>
          {currentStep > 0 && (
            <Button
              title="Geri"
              variant="outline"
              onPress={handleBack}
              style={{ flex: 1 }}
            />
          )}
          <Button
            title={currentStep === 4 ? 'Rezervasyonu Tamamla' : 'Devam Et'}
            onPress={currentStep === 4 ? handleSubmit : handleNext}
            loading={submitting}
            style={{ flex: currentStep > 0 ? 2 : 1, marginLeft: currentStep > 0 ? SPACING.md : 0 }}
          />
        </View>
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
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.background,
    borderWidth: 2,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepCircleActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.white,
  },
  stepCircleCompleted: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  stepNumber: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  stepNumberActive: {
    color: COLORS.primary,
  },
  stepLine: {
    width: 30,
    height: 2,
    backgroundColor: COLORS.border,
    marginHorizontal: SPACING.xs,
  },
  stepLineActive: {
    backgroundColor: COLORS.primary,
  },
  scrollView: {
    flex: 1,
  },
  stepContent: {
    padding: SPACING.lg,
  },
  stepTitle: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  stepSubtitle: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textLight,
    marginBottom: SPACING.lg,
  },
  dateCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    ...SHADOWS.sm,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateItem: {
    flex: 1,
  },
  dateLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
    marginBottom: SPACING.xs,
  },
  dateValue: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.text,
  },
  daysText: {
    textAlign: 'center',
    fontSize: FONT_SIZES.sm,
    color: COLORS.primary,
    fontWeight: '600',
    marginTop: SPACING.md,
  },
  locationSection: {
    marginBottom: SPACING.md,
  },
  inputLabel: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  locationCard: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  locationOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SPACING.xs,
  },
  locationOptionActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  locationText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
  },
  locationTextActive: {
    color: COLORS.white,
  },
  sameLocationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  sameLocationText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
  },
  extraCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 2,
    borderColor: COLORS.transparent,
    ...SHADOWS.sm,
  },
  extraCardActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '08',
  },
  extraIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  extraIconActive: {
    backgroundColor: COLORS.primary,
  },
  extraContent: {
    flex: 1,
  },
  extraName: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.text,
  },
  extraPrice: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.primary,
    fontWeight: '500',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  priceBreakdown: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    ...SHADOWS.sm,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
  },
  priceLabel: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textLight,
  },
  priceValue: {
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    fontWeight: '500',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    marginTop: SPACING.sm,
    paddingTop: SPACING.md,
  },
  totalLabel: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.text,
  },
  totalValue: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
    color: COLORS.primary,
  },
  cardRow: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  secureNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  secureText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.success,
  },
  summaryCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  summaryTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  summaryText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textLight,
  },
  totalCard: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  totalCardLabel: {
    fontSize: FONT_SIZES.md,
    color: COLORS.white + 'CC',
  },
  totalCardValue: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.white,
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.md,
  },
  termsCheckbox: {
    width: 24,
    height: 24,
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 2,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  termsCheckboxActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  termsText: {
    flex: 1,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
    lineHeight: 20,
  },
  termsLink: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    padding: SPACING.lg,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  // Success styles
  successScroll: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  successContainer: {
    padding: SPACING.xl,
    alignItems: 'center',
  },
  successIcon: {
    marginBottom: SPACING.lg,
  },
  successTitle: {
    fontSize: FONT_SIZES.title,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  successSubtitle: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textLight,
    marginBottom: SPACING.xl,
  },
  reservationIdCard: {
    backgroundColor: COLORS.primary + '10',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.xl,
  },
  reservationIdLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
    textAlign: 'center',
  },
  reservationIdValue: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '700',
    color: COLORS.primary,
    textAlign: 'center',
  },
  qrContainer: {
    alignItems: 'center',
  },
  qrPlaceholder: {
    width: 150,
    height: 150,
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.md,
  },
  qrText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
    marginTop: SPACING.md,
  },
});
