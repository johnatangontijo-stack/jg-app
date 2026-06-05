import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Modal, ActivityIndicator } from 'react-native';
import { COLORS, RADIUS, SPACING, FONT } from '../../constants/theme';
import { GoldButton } from '../ui/GoldButton';

type TipoFeedback = 'elogio' | 'sugestao' | 'reclamacao';

interface FeedbackFormProps {
  visible: boolean;
  tipo: TipoFeedback;
  onClose: () => void;
  onSubmit: (mensagem: string) => Promise<void>;
}

const TIPO_CONFIG: Record<TipoFeedback, { label: string; color: string }> = {
  elogio: { label: 'Elogio', color: COLORS.success },
  sugestao: { label: 'Sugestão', color: COLORS.warning },
  reclamacao: { label: 'Reclamação', color: COLORS.danger },
};

export function FeedbackForm({ visible, tipo, onClose, onSubmit }: FeedbackFormProps) {
  const [mensagem, setMensagem] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const config = TIPO_CONFIG[tipo];

  const handleSubmit = async () => {
    if (!mensagem.trim()) return;
    setLoading(true);
    try {
      await onSubmit(mensagem.trim());
      setSent(true);
      setMensagem('');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSent(false);
    setMensagem('');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {sent ? (
            <View style={styles.success}>
              <Text style={styles.successIcon}>✓</Text>
              <Text style={styles.successTitle}>Enviado!</Text>
              <Text style={styles.successSub}>Deixa com a gente!</Text>
              <GoldButton label="Fechar" onPress={handleClose} style={styles.closeBtn} />
            </View>
          ) : (
            <>
              <View style={[styles.typeDot, { backgroundColor: config.color }]} />
              <Text style={[styles.title, { color: config.color }]}>{config.label}</Text>
              <Text style={styles.hint}>Cai diretamente no painel do Joni Gontijo.</Text>
              <TextInput
                style={styles.input}
                value={mensagem}
                onChangeText={setMensagem}
                placeholder="Escreva sua mensagem..."
                placeholderTextColor={COLORS.text3}
                multiline
                numberOfLines={5}
                textAlignVertical="top"
              />
              <View style={styles.actions}>
                <GoldButton label="Cancelar" onPress={handleClose} variant="ghost" style={styles.flex} />
                <GoldButton label="Enviar" onPress={handleSubmit} loading={loading} style={styles.flex} />
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: COLORS.surface2,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    padding: SPACING.xxl,
    gap: SPACING.md,
  },
  typeDot: {
    width: 10,
    height: 10,
    borderRadius: RADIUS.full,
    alignSelf: 'center',
  },
  title: {
    fontSize: 20,
    ...FONT.bold,
    textAlign: 'center',
  },
  hint: {
    color: COLORS.text3,
    fontSize: 13,
    textAlign: 'center',
  },
  input: {
    backgroundColor: COLORS.surface3,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.borderWeak,
    padding: SPACING.md,
    color: COLORS.text,
    fontSize: 14,
    minHeight: 100,
  },
  actions: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  flex: { flex: 1 },
  success: {
    alignItems: 'center',
    gap: SPACING.md,
    paddingVertical: SPACING.xl,
  },
  successIcon: {
    fontSize: 40,
    color: COLORS.success,
  },
  successTitle: {
    fontSize: 22,
    color: COLORS.text,
    ...FONT.bold,
  },
  successSub: {
    fontSize: 14,
    color: COLORS.gold,
    ...FONT.medium,
  },
  closeBtn: {
    marginTop: SPACING.md,
  },
});
