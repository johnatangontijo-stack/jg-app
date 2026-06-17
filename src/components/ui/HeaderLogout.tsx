import React from 'react';
import { TouchableOpacity, StyleSheet, Platform, Alert } from 'react-native';
import { COLORS } from '../../constants/theme';
import { Icon } from './Icon';
import { useAuthStore } from '../../stores/authStore';

/** Botão "Sair" do header das abas. Confirma antes de deslogar.
 *  Após signOut o profile zera e o guard do root redireciona pro login. */
export function HeaderLogout() {
  const { signOut } = useAuthStore();

  const sair = () => { void signOut(); };

  const confirmar = () => {
    if (Platform.OS === 'web') {
      // Alert.alert não dispara botões no RN web; usa o confirm nativo do browser.
      if (typeof window !== 'undefined' && window.confirm('Deseja sair da sua conta?')) sair();
      return;
    }
    Alert.alert('Sair', 'Deseja sair da sua conta?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: sair },
    ]);
  };

  return (
    <TouchableOpacity
      style={styles.btn}
      activeOpacity={0.7}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      onPress={confirmar}
      accessibilityLabel="Sair da conta"
    >
      <Icon name="logout" size={22} color={COLORS.text} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: { marginRight: 16, padding: 2 },
});
