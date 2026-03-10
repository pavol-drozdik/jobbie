import { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../../lib/auth-context';
import { api } from '../../lib/api';
import { S } from '../../constants/strings';
import { colors, spacing, typography } from '../../constants/theme';
import { Card } from '../../components/ui';
import { Avatar } from '../../components/ui/Avatar';

type Room = {
  id: string;
  application_id: string;
  created_at: string;
   other_user_id?: string;
   other_user_name?: string | null;
   other_user_avatar_url?: string | null;
};

export default function MessagesScreen() {
  const { session } = useAuth();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    if (!session?.access_token) return;
    const res = await api<Room[]>('/api/chat/rooms', {
      token: session.access_token,
      query: { limit: '50', offset: '0' },
    });
    setRooms(Array.isArray(res.data) ? res.data : []);
  };

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [session?.access_token]);

  if (loading) {
    return (
      <View style={[styles.centered, styles.screen]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <FlatList
        data={rooms}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={load}
            colors={[colors.primary]}
          />
        }
        ListEmptyComponent={
          <View style={styles.centered}>
            <Text style={styles.empty}>{S.noConversations}</Text>
          </View>
        }
        contentContainerStyle={rooms.length === 0 ? styles.listEmpty : styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => router.push(`/chat/${item.id}`)}
            activeOpacity={0.8}
          >
            <Card style={styles.card}>
              <View style={styles.cardContent}>
                <Avatar
                  size={40}
                  source={
                    item.other_user_avatar_url
                      ? { uri: item.other_user_avatar_url }
                      : undefined
                  }
                  fallback={item.other_user_name ?? '??'}
                />
                <View style={styles.cardTextWrap}>
                  <Text style={styles.cardTitle} numberOfLines={1}>
                    {item.other_user_name || `Konverzácia ${item.id.slice(0, 8)}...`}
                  </Text>
                  <Text style={styles.cardSubtitle} numberOfLines={1}>
                    {S.chat}
                  </Text>
                </View>
              </View>
            </Card>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.backgroundGradientStart },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  list: { padding: spacing.lg },
  listEmpty: { flexGrow: 1 },
  empty: { ...typography.body, color: colors.mutedForeground },
  card: { marginBottom: spacing.md },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  cardTextWrap: { flex: 1 },
  cardTitle: {
    ...typography.body,
    fontWeight: '600',
    color: colors.foreground,
  },
  cardSubtitle: {
    ...typography.caption,
    color: colors.mutedForeground,
    marginTop: 2,
  },
});
