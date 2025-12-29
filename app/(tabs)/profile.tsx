import { APP_VERSION } from '../../constants/version';
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Switch, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS } from '../../constants/theme';

const COMPANY_NAME = "Vega Rent";

interface MenuItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  showArrow?: boolean;
  danger?: boolean;
  rightElement?: React.ReactNode;
}

const MenuItem: React.FC<MenuItemProps> = ({ icon, title, subtitle, onPress, showArrow = true, danger, rightElement }) => (
  <TouchableOpacity style={styles.menuItem} onPress={onPress} disabled={!onPress}>
    <View style={[styles.menuIconContainer, danger && styles.menuIconDanger]}>
      <Ionicons name={icon} size={20} color={danger ? COLORS.danger : COLORS.primary} />
    </View>
    <View style={styles.menuContent}>
      <Text style={[styles.menuTitle, danger && styles.menuTitleDanger]}>{title}</Text>
      {subtitle && <Text style={styles.menuSubtitle}>{subtitle}</Text>}
    </View>
    {rightElement}
    {showArrow && !rightElement && (
      <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
    )}
  </TouchableOpacity>
);

export default function ProfileScreen() {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuthStore();
  const [pushEnabled, setPushEnabled] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  const handleLogout = () => {
    Alert.alert(
      'Çıkış Yap',
      'Hesabınızdan çıkış yapmak istediğinize emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Çıkış Yap',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/(tabs)');
          },
        },
      ]
    );
  };

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.title}>Profil</Text>
        </View>
        
        <View style={styles.guestContainer}>
          <View style={styles.guestIconContainer}>
            <Ionicons name="person" size={50} color={COLORS.primary} />
          </View>
          <Text style={styles.guestTitle}>Hoş Geldiniz!</Text>
          <Text style={styles.guestText}>
            {COMPANY_NAME} üyesi olun, özel fırsatlardan yararlanın
          </Text>
          <TouchableOpacity style={styles.loginButton} onPress={() => router.push('/(auth)/login')}>
            <Ionicons name="log-in-outline" size={20} color={COLORS.white} />
            <Text style={styles.loginButtonText}>Giriş Yap</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.registerButton} onPress={() => router.push('/(auth)/register')}>
            <Ionicons name="person-add-outline" size={20} color={COLORS.primary} />
            <Text style={styles.registerButtonText}>Ücretsiz Kayıt Ol</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Uygulama</Text>
            <View style={styles.menuCard}>
              <MenuItem
                icon="moon-outline"
                title="Koyu Tema"
                showArrow={false}
                rightElement={
                  <Switch
                    value={darkMode}
                    onValueChange={setDarkMode}
                    trackColor={{ false: COLORS.border, true: COLORS.primary + '50' }}
                    thumbColor={darkMode ? COLORS.primary : COLORS.white}
                  />
                }
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Destek</Text>
            <View style={styles.menuCard}>
              <MenuItem icon="help-circle-outline" title="Sık Sorulan Sorular" onPress={() => {}} />
              <MenuItem icon="chatbubbles-outline" title="Canlı Destek" onPress={() => {}} />
              <MenuItem icon="call-outline" title="Bizi Arayın" subtitle="0850 123 4567" onPress={() => {}} />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Yasal</Text>
            <View style={styles.menuCard}>
              <MenuItem icon="document-text-outline" title="Kullanım Koşulları" onPress={() => {}} />
              <MenuItem icon="shield-checkmark-outline" title="Gizlilik Politikası" onPress={() => {}} />
              <MenuItem icon="information-circle-outline" title="KVKK Aydınlatma Metni" onPress={() => {}} />
            </View>
          </View>

          <View style={styles.footerInfo}>
            <View style={styles.footerLogo}>
              <Ionicons name="car-sport" size={18} color={COLORS.primary} />
              <Text style={styles.footerBrand}>{COMPANY_NAME}</Text>
            </View>
            <Text style={styles.versionText}>Versiyon {APP_VERSION}</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Profil</Text>
        </View>

        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{user?.name.charAt(0).toUpperCase()}</Text>
            </View>
            <TouchableOpacity style={styles.editAvatarButton}>
              <Ionicons name="camera" size={14} color={COLORS.white} />
            </TouchableOpacity>
          </View>
          <Text style={styles.userName}>{user?.name}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
          {user?.phone && <Text style={styles.userPhone}>{user.phone}</Text>}
          <TouchableOpacity style={styles.editProfileButton}>
            <Ionicons name="create-outline" size={16} color={COLORS.primary} />
            <Text style={styles.editProfileText}>Profili Düzenle</Text>
          </TouchableOpacity>
        </View>

        {/* Account Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Hesabım</Text>
          <View style={styles.menuCard}>
            <MenuItem icon="person-outline" title="Kişisel Bilgiler" subtitle="Ad, telefon, TC Kimlik" onPress={() => {}} />
            <MenuItem icon="card-outline" title="Ehliyet Bilgileri" subtitle={user?.ehliyet_no ? 'Onaylı' : 'Henüz eklenmedi'} onPress={() => {}} />
            <MenuItem icon="wallet-outline" title="Kayıtlı Kartlarım" onPress={() => {}} />
            <MenuItem icon="location-outline" title="Adreslerim" onPress={() => {}} />
            <MenuItem icon="heart-outline" title="Favorilerim" onPress={() => {}} />
          </View>
        </View>

        {/* Settings Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ayarlar</Text>
          <View style={styles.menuCard}>
            <MenuItem
              icon="notifications-outline"
              title="Bildirimler"
              showArrow={false}
              rightElement={
                <Switch
                  value={pushEnabled}
                  onValueChange={setPushEnabled}
                  trackColor={{ false: COLORS.border, true: COLORS.primary + '50' }}
                  thumbColor={pushEnabled ? COLORS.primary : COLORS.white}
                />
              }
            />
            <MenuItem
              icon="moon-outline"
              title="Koyu Tema"
              showArrow={false}
              rightElement={
                <Switch
                  value={darkMode}
                  onValueChange={setDarkMode}
                  trackColor={{ false: COLORS.border, true: COLORS.primary + '50' }}
                  thumbColor={darkMode ? COLORS.primary : COLORS.white}
                />
              }
            />
            <MenuItem icon="lock-closed-outline" title="Güvenlik" subtitle="Şifre, 2FA" onPress={() => {}} />
            <MenuItem icon="language-outline" title="Dil" subtitle="Türkçe" onPress={() => {}} />
          </View>
        </View>

        {/* Support Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Destek</Text>
          <View style={styles.menuCard}>
            <MenuItem icon="help-circle-outline" title="Sık Sorulan Sorular" onPress={() => {}} />
            <MenuItem icon="chatbubbles-outline" title="Canlı Destek" onPress={() => {}} />
            <MenuItem icon="call-outline" title="Bizi Arayın" subtitle="0850 123 4567" onPress={() => {}} />
          </View>
        </View>

        {/* Legal Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Yasal</Text>
          <View style={styles.menuCard}>
            <MenuItem icon="document-text-outline" title="Kullanım Koşulları" onPress={() => {}} />
            <MenuItem icon="shield-checkmark-outline" title="Gizlilik Politikası" onPress={() => {}} />
            <MenuItem icon="information-circle-outline" title="KVKK Aydınlatma Metni" onPress={() => {}} />
          </View>
        </View>

        {/* Logout */}
        <View style={styles.section}>
          <View style={styles.menuCard}>
            <MenuItem icon="log-out-outline" title="Çıkış Yap" onPress={handleLogout} danger showArrow={false} />
          </View>
        </View>

        <View style={styles.footerInfo}>
          <View style={styles.footerLogo}>
            <Ionicons name="car-sport" size={18} color={COLORS.primary} />
            <Text style={styles.footerBrand}>{COMPANY_NAME}</Text>
          </View>
          <Text style={styles.versionText}>Versiyon {APP_VERSION}</Text>
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
  scrollView: {
    flex: 1,
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
  guestContainer: {
    alignItems: 'center',
    padding: SPACING.xl,
    backgroundColor: COLORS.white,
    marginHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.xl,
    ...SHADOWS.md,
  },
  guestIconContainer: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: COLORS.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  guestTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  guestText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textLight,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  loginButton: {
    flexDirection: 'row',
    width: '100%',
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
    gap: SPACING.sm,
  },
  loginButtonText: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: FONT_SIZES.md,
  },
  registerButton: {
    flexDirection: 'row',
    width: '100%',
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.transparent,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
  },
  registerButtonText: {
    color: COLORS.primary,
    fontWeight: '600',
    fontSize: FONT_SIZES.md,
  },
  profileCard: {
    alignItems: 'center',
    padding: SPACING.xl,
    backgroundColor: COLORS.white,
    marginHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.xl,
    ...SHADOWS.md,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: SPACING.md,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.white,
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  userName: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
    color: COLORS.text,
  },
  userEmail: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
    marginTop: SPACING.xs,
  },
  userPhone: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
    marginTop: 2,
  },
  editProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.primary + '10',
    borderRadius: BORDER_RADIUS.full,
    gap: SPACING.xs,
  },
  editProfileText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.primary,
    fontWeight: '600',
  },
  section: {
    marginTop: SPACING.lg,
    paddingHorizontal: SPACING.lg,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.textMuted,
    marginBottom: SPACING.sm,
    marginLeft: SPACING.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  menuCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
    ...SHADOWS.sm,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  menuIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary + '10',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  menuIconDanger: {
    backgroundColor: COLORS.danger + '10',
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '500',
    color: COLORS.text,
  },
  menuTitleDanger: {
    color: COLORS.danger,
  },
  menuSubtitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
    marginTop: 2,
  },
  footerInfo: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
  },
  footerLogo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  footerBrand: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: COLORS.primary,
  },
  versionText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textMuted,
  },
});
