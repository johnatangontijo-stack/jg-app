import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { useAuthStore } from '../../src/stores/authStore';
import { Icon } from '../../src/components/ui/Icon';
import { COLORS, RADIUS, SPACING, FONT } from '../../src/constants/theme';
import { GoldButton } from '../../src/components/ui/GoldButton';

export default function LoginScreen() {
  const { signIn, loading } = useAuthStore();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [showSenha, setShowSenha] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [biometriaDisponivel, setBiometriaDisponivel] = useState(false);

  useEffect(() => {
    checkBiometria();
  }, []);

  const checkBiometria = async () => {
    const compatible = await LocalAuthentication.hasHardwareAsync();
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    setBiometriaDisponivel(compatible && enrolled);
  };

  const handleLogin = async () => {
    if (!email.trim() || !senha.trim()) {
      setError('Preencha email e senha.');
      return;
    }
    setSigningIn(true);
    setError(null);
    try {
      await signIn(email.trim(), senha);
      await SecureStore.setItemAsync('saved_email', email.trim());
    } catch {
      setError('Email ou senha incorretos. Tente novamente.');
    } finally {
      setSigningIn(false);
    }
  };

  const handleBiometria = async () => {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Use sua biometria para entrar',
      fallbackLabel: 'Usar senha',
    });

    if (result.success) {
      const savedEmail = await SecureStore.getItemAsync('saved_email');
      if (savedEmail) {
        setEmail(savedEmail);
        setError('Autenticação biométrica aprovada! Digite sua senha.');
      }
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
        {/* Logo */}
        <View style={styles.logoArea}>
          <View style={styles.logoRing}>
            <Text style={styles.logoText}>JG</Text>
          </View>
          <Text style={styles.brandName}>JG App</Text>
          <Text style={styles.brandSub}>Joni Gontijo Gestão T.P.</Text>
        </View>

        {/* Formulário */}
        <View style={styles.form}>
          <View style={styles.fieldWrap}>
            <Text style={styles.fieldLabel}>E-mail</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="seu@email.com"
              placeholderTextColor={COLORS.text3}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.fieldWrap}>
            <Text style={styles.fieldLabel}>Senha</Text>
            <View style={styles.senhaRow}>
              <TextInput
                style={[styles.input, styles.senhaInput]}
                value={senha}
                onChangeText={setSenha}
                placeholder="••••••••"
                placeholderTextColor={COLORS.text3}
                secureTextEntry={!showSenha}
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={styles.eyeBtn}
                onPress={() => setShowSenha((v) => !v)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Icon name={showSenha ? 'eyeOff' : 'eye'} size={20} color={COLORS.text3} />
              </TouchableOpacity>
            </View>
          </View>

          {error && <Text style={styles.errorText}>{error}</Text>}

          <GoldButton
            label="Entrar"
            onPress={handleLogin}
            loading={signingIn || loading}
            style={styles.loginBtn}
          />

          {biometriaDisponivel && (
            <TouchableOpacity style={styles.bioBtn} onPress={handleBiometria} activeOpacity={0.8}>
              <Text style={styles.bioIcon}>⬡</Text>
              <Text style={styles.bioText}>Entrar com biometria</Text>
            </TouchableOpacity>
          )}
        </View>

        <Text style={styles.footer}>Deixa com a gente!</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.black,
  },
  inner: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: SPACING.xxl,
    gap: SPACING.xxl,
  },
  logoArea: {
    alignItems: 'center',
    gap: SPACING.sm,
  },
  logoRing: {
    width: 80,
    height: 80,
    borderRadius: RADIUS.full,
    borderWidth: 2,
    borderColor: COLORS.gold,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(201,168,76,0.08)',
  },
  logoText: {
    fontSize: 28,
    color: COLORS.gold,
    ...FONT.bold,
  },
  brandName: {
    fontSize: 24,
    color: COLORS.text,
    ...FONT.bold,
  },
  brandSub: {
    fontSize: 13,
    color: COLORS.text3,
  },
  form: {
    gap: SPACING.lg,
  },
  fieldWrap: {
    gap: SPACING.xs,
  },
  fieldLabel: {
    color: COLORS.text2,
    fontSize: 13,
    ...FONT.medium,
  },
  input: {
    backgroundColor: COLORS.surface2,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    color: COLORS.text,
    fontSize: 15,
    height: 50,
  },
  senhaRow: {
    position: 'relative',
  },
  senhaInput: {
    paddingRight: 48,
  },
  eyeBtn: {
    position: 'absolute',
    right: SPACING.md,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  eyeIcon: {
    fontSize: 18,
  },
  errorText: {
    color: COLORS.danger,
    fontSize: 13,
    textAlign: 'center',
  },
  loginBtn: {
    marginTop: SPACING.sm,
  },
  bioBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  bioIcon: {
    fontSize: 20,
    color: COLORS.gold,
  },
  bioText: {
    color: COLORS.gold,
    fontSize: 14,
    ...FONT.medium,
  },
  footer: {
    textAlign: 'center',
    color: COLORS.gold,
    fontSize: 14,
    ...FONT.medium,
  },
});
