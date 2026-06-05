import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, RADIUS, SPACING, FONT } from '../../constants/theme';
import { Avatar } from '../ui/Avatar';
import { Badge } from '../ui/Badge';
import { Database } from '../../types/database';

type Profile = Database['public']['Tables']['profiles']['Row'];

interface FuncionarioCardProps {
  profile: Profile;
  npsScore?: number;
  totalClientes?: number;
  demandasHoje?: number;
  producoesmes?: number;
}

const ROLE_LABEL: Record<string, string> = {
  gestor_trafego: 'Gestor de Tráfego',
  editor: 'Editor',
  social_media: 'Social Media',
  freelancer: 'Freelancer',
  admin: 'Admin',
};

export function FuncionarioCard({ profile, npsScore, totalClientes, demandasHoje, producoesmes }: FuncionarioCardProps) {
  const bonus = npsScore !== undefined && npsScore >= 80;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Avatar name={profile.nome} size={48} />
        <View style={styles.info}>
          <Text style={styles.nome}>{profile.nome}</Text>
          <Text style={styles.cargo}>{ROLE_LABEL[profile.role] ?? profile.role}</Text>
        </View>
        {npsScore !== undefined && (
          <Badge
            label={bonus ? '⭐ Bônus' : `NPS ${npsScore}`}
            variant={bonus ? 'gold' : npsScore >= 50 ? 'success' : 'danger'}
          />
        )}
      </View>
      <View style={styles.stats}>
        {totalClientes !== undefined && (
          <View style={styles.stat}>
            <Text style={styles.statVal}>{totalClientes}</Text>
            <Text style={styles.statLabel}>Clientes</Text>
          </View>
        )}
        {demandasHoje !== undefined && (
          <View style={styles.stat}>
            <Text style={styles.statVal}>{demandasHoje}</Text>
            <Text style={styles.statLabel}>Demandas hoje</Text>
          </View>
        )}
        {producoesmes !== undefined && (
          <View style={styles.stat}>
            <Text style={styles.statVal}>{producoesmes}</Text>
            <Text style={styles.statLabel}>Produções</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface2,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.borderWeak,
    padding: SPACING.lg,
    marginBottom: SPACING.sm,
    gap: SPACING.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  info: { flex: 1 },
  nome: {
    color: COLORS.text,
    fontSize: 15,
    ...FONT.medium,
  },
  cargo: {
    color: COLORS.text3,
    fontSize: 12,
    marginTop: 2,
  },
  stats: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  stat: {
    alignItems: 'center',
    flex: 1,
    backgroundColor: COLORS.surface3,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
  },
  statVal: {
    color: COLORS.gold,
    fontSize: 18,
    ...FONT.bold,
  },
  statLabel: {
    color: COLORS.text3,
    fontSize: 10,
    textAlign: 'center',
    marginTop: 2,
  },
});
