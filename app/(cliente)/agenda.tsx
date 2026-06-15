import React, { useState, useEffect } from 'react';
import { ScrollView, View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { COLORS, SPACING, FONT, RADIUS } from '../../src/constants/theme';
import { useAuthStore } from '../../src/stores/authStore';
import { supabase } from '../../src/lib/supabase';
import { Card } from '../../src/components/ui/Card';
import { Badge } from '../../src/components/ui/Badge';
import { IconText } from '../../src/components/ui/Icon';
import { Database } from '../../src/types/database';

type Slot = Database['public']['Tables']['agenda_otimizacao']['Row'];
type SlotWithProfile = Slot & { profiles: { nome: string } | null };

function groupByDay(slots: SlotWithProfile[]) {
  const map = new Map<string, SlotWithProfile[]>();
  for (const s of slots) {
    const day = s.data_hora.slice(0, 10);
    if (!map.has(day)) map.set(day, []);
    map.get(day)!.push(s);
  }
  return map;
}

const STATUS_BADGE: Record<string, { label: string; variant: 'success' | 'gold' | 'gray' | 'danger' }> = {
  concluido: { label: 'Concluído', variant: 'success' },
  em_andamento: { label: 'Em andamento', variant: 'gold' },
  agendado: { label: 'Agendado', variant: 'gray' },
  cancelado: { label: 'Cancelado', variant: 'danger' },
};

export default function AgendaClienteScreen() {
  const { clienteId } = useAuthStore();
  const [slots, setSlots] = useState<SlotWithProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!clienteId) return;
    (async () => {
      const { data } = await supabase
        .from('agenda_otimizacao')
        .select('*, profiles!funcionario_id(nome)')
        .eq('cliente_id', clienteId)
        .order('data_hora');
      setSlots((data as unknown as SlotWithProfile[]) ?? []);
      setLoading(false);
    })();
  }, [clienteId]);

  if (loading) return <View style={styles.center}><ActivityIndicator color={COLORS.gold} /></View>;

  const grouped = groupByDay(slots);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Card style={styles.infoCard}>
        <IconText name="agenda" size={15} color={COLORS.gold} textStyle={styles.infoTitle}>Transparência total</IconText>
        <Text style={styles.infoText}>
          Aqui você acompanha com antecedência quando seu gestor estará otimizando suas campanhas.
        </Text>
      </Card>

      {grouped.size === 0 ? (
        <Text style={styles.vazio}>Nenhum agendamento para exibir.</Text>
      ) : (
        Array.from(grouped.entries()).map(([day, daySlots]) => (
          <View key={day}>
            <Text style={styles.dayLabel}>
              {new Date(day + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
            </Text>
            {daySlots.map((slot) => {
              const badge = STATUS_BADGE[slot.status] ?? STATUS_BADGE.agendado;
              const hora = slot.data_hora.slice(11, 16);
              return (
                <View key={slot.id} style={styles.slotCard}>
                  <Text style={styles.hora}>{hora}</Text>
                  <View style={styles.slotInfo}>
                    <Text style={styles.gestor}>{slot.profiles?.nome ?? 'Gestor'}</Text>
                    <Text style={styles.desc}>{slot.descricao}</Text>
                    {slot.plataformas.length > 0 && (
                      <Text style={styles.plats}>{slot.plataformas.join(' · ')}</Text>
                    )}
                  </View>
                  <Badge label={badge.label} variant={badge.variant} />
                </View>
              );
            })}
          </View>
        ))
      )}

      <TouchableOpacity style={styles.extraBtn} activeOpacity={0.8}>
        <Text style={styles.extraText}>+ Solicitar análise extra</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.black },
  content: { padding: SPACING.lg, gap: SPACING.lg, paddingBottom: SPACING.xxl },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.black },
  infoCard: { borderColor: COLORS.border, gap: SPACING.xs },
  infoTitle: { color: COLORS.gold, fontSize: 14, ...FONT.bold },
  infoText: { color: COLORS.text2, fontSize: 13, lineHeight: 19 },
  vazio: { color: COLORS.text3, fontSize: 13 },
  dayLabel: { color: COLORS.text2, fontSize: 13, ...FONT.medium, textTransform: 'capitalize', marginBottom: SPACING.sm },
  slotCard: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.md, backgroundColor: COLORS.surface2, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.borderWeak, padding: SPACING.md, marginBottom: SPACING.sm },
  hora: { color: COLORS.gold, fontSize: 14, ...FONT.bold, minWidth: 40 },
  slotInfo: { flex: 1, gap: 2 },
  gestor: { color: COLORS.text, fontSize: 13, ...FONT.medium },
  desc: { color: COLORS.text2, fontSize: 12 },
  plats: { color: COLORS.text3, fontSize: 11 },
  extraBtn: { backgroundColor: COLORS.surface2, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.md, alignItems: 'center' },
  extraText: { color: COLORS.gold, fontSize: 14, ...FONT.medium },
});
