import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Linking, StyleSheet, ActivityIndicator, FlatList } from 'react-native';
import { COLORS, SPACING, FONT, RADIUS } from '../../src/constants/theme';
import { useAuthStore } from '../../src/stores/authStore';
import { useClienteStore } from '../../src/stores/clienteStore';
import { supabase } from '../../src/lib/supabase';
import { Card } from '../../src/components/ui/Card';
import { Avatar } from '../../src/components/ui/Avatar';
import { Database } from '../../src/types/database';

type Profile = Database['public']['Tables']['profiles']['Row'];

const ROLE_LABEL: Record<string, string> = {
  admin: 'Fundador',
  gestor_trafego: 'Gestor de Tráfego',
  editor: 'Editor',
  social_media: 'Social Media',
  freelancer: 'Freelancer',
};

export default function WhatsappScreen() {
  const { clienteId } = useAuthStore();
  const { cliente } = useClienteStore();
  const [membros, setMembros] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!clienteId) return;
    (async () => {
      const { data: cu } = await supabase
        .from('cliente_usuarios')
        .select('profile_id')
        .eq('cliente_id', clienteId);

      const ids = (cu ?? []).map((r) => r.profile_id);
      if (ids.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('*')
          .in('id', ids)
          .neq('role', 'cliente');
        setMembros(profiles ?? []);
      }
      setLoading(false);
    })();
  }, [clienteId]);

  if (loading) return <View style={styles.center}><ActivityIndicator color={COLORS.gold} /></View>;

  return (
    <View style={styles.container}>
      <Card style={styles.waCard}>
        <View style={[styles.waIcon, { backgroundColor: COLORS.whatsapp }]}>
          <Text style={styles.waIconText}>W</Text>
        </View>
        <View style={styles.waInfo}>
          <Text style={styles.waTitle}>{cliente?.nome_fantasia ?? '...'} × JG</Text>
          <Text style={styles.waSub}>Grupo de acompanhamento</Text>
        </View>
        <TouchableOpacity
          style={styles.waBtn}
          onPress={() => cliente?.whatsapp_grupo && Linking.openURL(cliente.whatsapp_grupo)}
          activeOpacity={0.8}
        >
          <Text style={styles.waBtnText}>Abrir grupo</Text>
        </TouchableOpacity>
      </Card>

      <Text style={styles.sectionTitle}>Equipe responsável</Text>
      {membros.map((m) => (
        <View key={m.id} style={styles.membroRow}>
          <Avatar name={m.nome} size={44} />
          <View style={styles.membroInfo}>
            <Text style={styles.membroNome}>{m.nome}</Text>
            <Text style={styles.membroCargo}>{ROLE_LABEL[m.role] ?? m.role}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.black, padding: SPACING.lg, gap: SPACING.lg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.black },
  waCard: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, borderColor: `${COLORS.whatsapp}33` },
  waIcon: { width: 48, height: 48, borderRadius: RADIUS.full, alignItems: 'center', justifyContent: 'center' },
  waIconText: { color: '#fff', fontSize: 22, ...FONT.bold },
  waInfo: { flex: 1 },
  waTitle: { color: COLORS.text, fontSize: 14, ...FONT.bold },
  waSub: { color: COLORS.text3, fontSize: 12 },
  waBtn: { backgroundColor: COLORS.whatsapp, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderRadius: RADIUS.md },
  waBtnText: { color: '#fff', fontSize: 13, ...FONT.bold },
  sectionTitle: { color: COLORS.text, fontSize: 16, ...FONT.bold },
  membroRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, paddingVertical: SPACING.sm, borderBottomWidth: 1, borderBottomColor: COLORS.borderWeak },
  membroInfo: { flex: 1 },
  membroNome: { color: COLORS.text, fontSize: 14, ...FONT.medium },
  membroCargo: { color: COLORS.text3, fontSize: 12 },
});
