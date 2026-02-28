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

type Room = {
  id: string;
  application_id: string;
  created_at: string;
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
              <Text style={styles.cardTitle}>
                Konverzácia {item.id.slice(0, 8)}...
              </Text>
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
  cardTitle: { ...typography.body, fontWeight: '500', color: colors.foreground },
});
