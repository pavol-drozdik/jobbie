import { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../../lib/auth-context';
import { api, getApiBaseUrl } from '../../lib/api';

type Message = {
  id: string;
  room_id: string;
  sender_id: string;
  content: string;
  created_at: string;
};

export default function ChatRoomScreen() {
  const { roomId } = useLocalSearchParams<{ roomId: string }>();
  const { session, user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!roomId || !session?.access_token) return;

    const load = async () => {
      const res = await api<Message[]>(`/api/chat/rooms/${roomId}/messages`, {
        token: session.access_token,
        query: { limit: '100', offset: '0' },
      });
      setMessages(Array.isArray(res.data) ? res.data : []);
    };
    load().finally(() => setLoading(false));

    const base = getApiBaseUrl().replace(/^http/, 'http');
    const socket = io(base, {
      path: '/socket.io',
      auth: { token: `Bearer ${session.access_token}` },
      transports: ['websocket', 'polling'],
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join_room', { room_id: roomId });
    });
    socket.on('message', (msg: Message) => {
      setMessages((prev) =>
        prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]
      );
    });

    return () => {
      socket.off('message');
      socket.disconnect();
      socketRef.current = null;
    };
  }, [roomId, session?.access_token]);

  const send = async () => {
    const content = input.trim();
    if (!content || !roomId || !session?.access_token || sending) return;
    setSending(true);
    setInput('');
    const socket = socketRef.current;
    if (socket?.connected) {
      socket.emit('message', { room_id: roomId, content }, (ack: { ok?: boolean; error?: string }) => {
        if (!ack?.ok) setInput(content);
        setSending(false);
      });
    } else {
      const res = await api<Message>('/api/chat/messages', {
        token: session.access_token,
        method: 'POST',
        body: { room_id: roomId, content },
      });
      if (res.ok && res.data) {
        setMessages((prev) => [...prev, res.data!]);
      } else {
        setInput(content);
      }
      setSending(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={100}
    >
      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const isMe = user?.id === item.sender_id;
          return (
            <View
              style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem]}
            >
              <Text
                style={[
                  styles.bubbleText,
                  isMe ? styles.bubbleTextMe : styles.bubbleTextThem,
                ]}
              >
                {item.content}
              </Text>
              <Text style={styles.time}>
                {new Date(item.created_at).toLocaleTimeString('sk-SK', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </View>
          );
        }}
      />
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Správa..."
          multiline
          maxLength={4000}
          editable={!sending}
        />
        <TouchableOpacity
          style={[styles.sendBtn, sending && styles.sendDisabled]}
          onPress={send}
          disabled={sending || !input.trim()}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.sendText}>Odoslať</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 16, paddingBottom: 8 },
  bubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
    marginBottom: 8,
  },
  bubbleMe: {
    alignSelf: 'flex-end',
    backgroundColor: '#007AFF',
  },
  bubbleThem: {
    alignSelf: 'flex-start',
    backgroundColor: '#e5e5ea',
  },
  bubbleText: { fontSize: 16, color: '#000' },
  time: { fontSize: 11, color: '#666', marginTop: 4 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 8,
    paddingBottom: 24,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderColor: '#eee',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 100,
    fontSize: 16,
    marginRight: 8,
  },
  sendBtn: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    justifyContent: 'center',
    minHeight: 44,
  },
  sendDisabled: { opacity: 0.6 },
  sendText: { color: '#fff', fontWeight: '600' },
});
