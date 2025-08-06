import React from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity } from 'react-native';
import { Stack } from 'expo-router';
import { Settings, LogOut, ChevronRight, Camera, Shirt, Bell, CreditCard, HelpCircle, Shield, Crown } from 'lucide-react-native';

import { useAuth } from '@/hooks/auth-store';
import Button from '@/components/Button';
import Card from '@/components/Card';
import { COLORS } from '@/constants/colors';

export default function ProfileScreen() {
  const { user, logout, isPremium, upgradeToPremium } = useAuth();

  // Mock data
  const analysisCount = 12;

  return (
    <ScrollView style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: 'Profile',
          headerRight: () => (
            <TouchableOpacity style={styles.headerButton}>
              <Settings size={24} color={COLORS.textDark} />
            </TouchableOpacity>
          ),
        }} 
      />

      <View style={styles.profileHeader}>
        <Image
          source={{ uri: user?.avatar_url || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=500&auto=format&fit=crop' }}
          style={styles.profileImage}
        />
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>{user?.name || 'Guest User'}</Text>
          <Text style={styles.profileEmail}>{user?.email || 'guest@example.com'}</Text>
          <View style={[styles.subscriptionBadge, isPremium && styles.premiumBadge]}>
            {isPremium && <Crown size={14} color={COLORS.gold} style={{ marginRight: 4 }} />}
            <Text style={[styles.subscriptionText, isPremium && styles.premiumText]}>
              {isPremium ? 'Premium' : 'Free'} Plan
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{analysisCount}</Text>
          <Text style={styles.statLabel}>Analyses</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>30</Text>
          <Text style={styles.statLabel}>Day Streak</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>78</Text>
          <Text style={styles.statLabel}>Glow Score</Text>
        </View>
      </View>

      {!isPremium && (
        <Card style={styles.upgradeCard} gradient>
          <View style={styles.upgradeContent}>
            <View>
              <Text style={styles.upgradeTitle}>Upgrade to Premium</Text>
              <Text style={styles.upgradeDescription}>
                Get unlimited analyses, personalized coaching, and exclusive content.
              </Text>
            </View>
            <Button
              title="Upgrade"
              size="small"
              style={styles.upgradeButton}
              onPress={upgradeToPremium}
              leftIcon={<Crown size={16} color={COLORS.white} style={{ marginRight: 4 }} />}
            />
          </View>
        </Card>
      )}
      
      {isPremium && (
        <Card style={styles.premiumCard} gradient>
          <View style={styles.premiumContent}>
            <Crown size={24} color={COLORS.gold} />
            <View style={styles.premiumInfo}>
              <Text style={styles.premiumTitle}>Premium Member</Text>
              <Text style={styles.premiumDescription}>
                You have access to all premium features including unlimited analyses and personalized coaching.
              </Text>
            </View>
          </View>
        </Card>
      )}

      <View style={[styles.sectionHeader, isPremium && styles.sectionHeaderAfterPremium]}>
        <Text style={styles.sectionTitle}>Recent Activity</Text>
      </View>

      <View style={styles.activityList}>
        <TouchableOpacity style={styles.activityItem}>
          <View style={[styles.activityIcon, { backgroundColor: COLORS.primary + '20' }]}>
            <Camera size={20} color={COLORS.primary} />
          </View>
          <View style={styles.activityInfo}>
            <Text style={styles.activityTitle}>Glow Analysis</Text>
            <Text style={styles.activityDate}>Today, 10:30 AM</Text>
          </View>
          <Text style={styles.activityScore}>78</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.activityItem}>
          <View style={[styles.activityIcon, { backgroundColor: COLORS.secondary + '20' }]}>
            <Shirt size={20} color={COLORS.secondary} />
          </View>
          <View style={styles.activityInfo}>
            <Text style={styles.activityTitle}>Outfit Analysis</Text>
            <Text style={styles.activityDate}>Yesterday, 6:15 PM</Text>
          </View>
          <Text style={styles.activityScore}>85</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Settings</Text>
      </View>

      <View style={styles.settingsList}>
        <TouchableOpacity style={styles.settingsItem}>
          <Bell size={20} color={COLORS.textDark} style={styles.settingsIcon} />
          <Text style={styles.settingsText}>Notifications</Text>
          <ChevronRight size={18} color={COLORS.textLight} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.settingsItem}>
          <CreditCard size={20} color={COLORS.textDark} style={styles.settingsIcon} />
          <Text style={styles.settingsText}>Subscription</Text>
          <ChevronRight size={18} color={COLORS.textLight} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.settingsItem}>
          <Shield size={20} color={COLORS.textDark} style={styles.settingsIcon} />
          <Text style={styles.settingsText}>Privacy</Text>
          <ChevronRight size={18} color={COLORS.textLight} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.settingsItem}>
          <HelpCircle size={20} color={COLORS.textDark} style={styles.settingsIcon} />
          <Text style={styles.settingsText}>Help & Support</Text>
          <ChevronRight size={18} color={COLORS.textLight} />
        </TouchableOpacity>
      </View>

      <Button
        title="Log Out"
        variant="outline"
        onPress={() => logout()}
        leftIcon={<LogOut size={18} color={COLORS.primary} style={{ marginRight: 8 }} />}
        style={styles.logoutButton}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  headerButton: {
    marginRight: 16,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 20,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.textDark,
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: COLORS.textLight,
    marginBottom: 8,
  },
  subscriptionBadge: {
    backgroundColor: COLORS.primary + '20',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
  },
  premiumBadge: {
    backgroundColor: COLORS.gold + '20',
  },
  subscriptionText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  premiumText: {
    color: COLORS.gold,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: 16,
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 16,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.textDark,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  statDivider: {
    width: 1,
    height: '80%',
    backgroundColor: COLORS.border,
  },
  upgradeCard: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  upgradeContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  upgradeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.textDark,
    marginBottom: 4,
  },
  upgradeDescription: {
    fontSize: 14,
    color: COLORS.textLight,
    width: '70%',
    lineHeight: 20,
  },
  upgradeButton: {
    minWidth: 100,
  },
  premiumCard: {
    marginHorizontal: 20,
    marginBottom: 16,
  },
  premiumContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  premiumInfo: {
    flex: 1,
    marginLeft: 12,
  },
  premiumTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.textDark,
    marginBottom: 4,
  },
  premiumDescription: {
    fontSize: 14,
    color: COLORS.textLight,
    lineHeight: 20,
  },
  sectionHeader: {
    paddingHorizontal: 20,
    marginBottom: 12,
    marginTop: 8,
  },
  sectionHeaderAfterPremium: {
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textDark,
  },
  activityList: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 8,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityInfo: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.textDark,
    marginBottom: 4,
  },
  activityDate: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  activityScore: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  settingsList: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    marginHorizontal: 20,
    marginBottom: 20,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  settingsIcon: {
    marginRight: 16,
  },
  settingsText: {
    flex: 1,
    fontSize: 16,
    color: COLORS.textDark,
  },
  logoutButton: {
    marginHorizontal: 20,
    marginBottom: 40,
  },
});