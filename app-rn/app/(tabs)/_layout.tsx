import { Tabs } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { S } from '../../constants/strings';
import { colors } from '../../constants/theme';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false, 
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.gray400,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
        headerStyle: {
          backgroundColor: colors.background,
          borderBottomColor: colors.cardBorder,
        },
        headerTintColor: colors.foreground,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.primaryMuted,
          borderTopWidth: 2,
          shadowColor: 'rgba(99,102,241,0.12)',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 1,
          shadowRadius: 30,
          elevation: 8,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: S.navDomov,
          tabBarIcon: ({ color, size, focused }) => (
            <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
              <Ionicons
                name="home-outline"
                size={size}
                color={focused ? colors.primary : color}
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="find"
        options={{
          title: S.navHladat,
          tabBarIcon: ({ color, size, focused }) => (
            <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
              <Ionicons
                name="search-outline"
                size={size}
                color={focused ? colors.primary : color}
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="add"
        options={{
          title: S.navPridat,
          tabBarIcon: () => (
            <View style={styles.fab}>
              <Ionicons name="add" size={20} color={colors.primaryForeground} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="offers"
        options={{
          title: S.navPonuky,
          tabBarIcon: ({ color, size, focused }) => (
            <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
              <Ionicons
                name="list-outline"
                size={size}
                color={focused ? colors.primary : color}
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="plans"
        options={{
          title: S.navPlany,
          tabBarIcon: ({ color, size, focused }) => (
            <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
              <Ionicons
                name="card-outline"
                size={size}
                color={focused ? colors.primary : color}
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: S.navProfil,
          tabBarIcon: ({ color, size, focused }) => (
            <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
              <Ionicons
                name="person-outline"
                size={size}
                color={focused ? colors.primary : color}
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          href: null,
          title: S.navSpravy,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapActive: {
    backgroundColor: colors.primaryLight,
  },
  fab: {
    width: 40,
    height: 40,
    borderRadius: 16,
    backgroundColor: colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -16,
    borderWidth: 4,
    borderColor: colors.background,
    shadowColor: 'rgba(99,102,241,0.6)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  fabActive: {
    backgroundColor: colors.primaryDark,
  },
});
