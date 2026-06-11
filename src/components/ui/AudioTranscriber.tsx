/**
 * AudioTranscriber
 * Web: usa Web Speech API (SpeechRecognition) — transcrição em tempo real no Chrome
 * Mobile: grava com expo-av e faz upload para Supabase Storage
 */
import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, Platform, Animated, Easing,
} from 'react-native';
import { COLORS, SPACING, FONT, RADIUS } from '../../constants/theme';

interface Props {
  /** Chamado com o texto transcrito (acumulado até o momento) */
  onTranscript: (text: string) => void;
  /** Texto já existente no campo — para acrescentar ao invés de substituir */
  currentText?: string;
}

export function AudioTranscriber({ onTranscript, currentText = '' }: Props) {
  const [isRecording, setIsRecording] = useState(false);
  const [status, setStatus] = useState<'idle' | 'recording' | 'processing' | 'done' | 'unsupported'>('idle');
  const [interim, setInterim] = useState(''); // texto parcial ainda não confirmado
  const recogRef = useRef<any>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isRecording) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.3, duration: 600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1,   duration: 600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
    }
  }, [isRecording]);

  const startWeb = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setStatus('unsupported');
      return;
    }

    const recog = new SpeechRecognition();
    recog.continuous = true;
    recog.interimResults = true;
    recog.lang = 'pt-BR';
    recogRef.current = recog;

    let accumulated = currentText ? currentText + ' ' : '';

    recog.onresult = (event: any) => {
      let finalChunk = '';
      let interimChunk = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalChunk += transcript + ' ';
        } else {
          interimChunk += transcript;
        }
      }
      if (finalChunk) {
        accumulated += finalChunk;
        onTranscript(accumulated.trim());
      }
      setInterim(interimChunk);
    };

    recog.onerror = () => { stopRecording(); };
    recog.onend = () => {
      setIsRecording(false);
      setStatus('done');
      setInterim('');
    };

    recog.start();
    setIsRecording(true);
    setStatus('recording');
  };

  const stopRecording = () => {
    recogRef.current?.stop();
    setIsRecording(false);
    setStatus('done');
    setInterim('');
  };

  const toggle = () => {
    if (isRecording) {
      stopRecording();
    } else {
      setStatus('idle');
      if (Platform.OS === 'web') {
        startWeb();
      } else {
        // Mobile: mostrar mensagem — gravação nativa requer permissões
        setStatus('unsupported');
      }
    }
  };

  const reset = () => { setStatus('idle'); setInterim(''); };

  return (
    <View style={s.wrap}>
      <View style={s.row}>
        {/* Botão gravar */}
        <TouchableOpacity
          onPress={toggle}
          activeOpacity={0.8}
          style={[s.btn, isRecording && s.btnActive]}
        >
          <Animated.View style={isRecording ? { transform: [{ scale: pulseAnim }] } : undefined}>
            <Text style={s.btnIcon}>{isRecording ? '⏹' : '🎙'}</Text>
          </Animated.View>
          <Text style={[s.btnText, isRecording && s.btnTextActive]}>
            {isRecording ? 'Parar gravação' : 'Gravar áudio'}
          </Text>
        </TouchableOpacity>

        {/* Status */}
        {status === 'recording' && (
          <View style={s.recStatus}>
            <View style={s.recDot} />
            <Text style={s.recText}>Gravando...</Text>
          </View>
        )}
        {status === 'done' && (
          <View style={s.doneStatus}>
            <Text style={s.doneText}>✓ Transcrito</Text>
            <TouchableOpacity onPress={reset} style={s.resetBtn}>
              <Text style={s.resetText}>Gravar novamente</Text>
            </TouchableOpacity>
          </View>
        )}
        {status === 'unsupported' && (
          <Text style={s.unsupText}>Use Chrome para transcrição automática.</Text>
        )}
      </View>

      {/* Prévia do interim (texto ainda sendo dito) */}
      {interim.length > 0 && (
        <View style={s.interimBox}>
          <Text style={s.interimText}>{interim}</Text>
        </View>
      )}

      <Text style={s.hint}>
        {Platform.OS === 'web'
          ? 'Clique em Gravar, fale normalmente em português e o texto aparecerá automaticamente no campo abaixo.'
          : 'A gravação de voz funciona melhor no navegador Chrome.'}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { gap: SPACING.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, flexWrap: 'wrap' },
  btn: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    backgroundColor: COLORS.surface2, borderRadius: RADIUS.full,
    paddingVertical: SPACING.sm, paddingHorizontal: SPACING.md,
    borderWidth: 1, borderColor: COLORS.border,
  },
  btnActive: { borderColor: COLORS.danger, backgroundColor: 'rgba(239,68,68,0.1)' },
  btnIcon: { fontSize: 18 },
  btnText: { color: COLORS.text2, fontSize: 13, ...FONT.medium },
  btnTextActive: { color: COLORS.danger },
  recStatus: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  recDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.danger },
  recText: { color: COLORS.danger, fontSize: 12, ...FONT.medium },
  doneStatus: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  doneText: { color: COLORS.success, fontSize: 12, ...FONT.medium },
  resetBtn: {},
  resetText: { color: COLORS.text3, fontSize: 12, textDecorationLine: 'underline' },
  unsupText: { color: COLORS.warning, fontSize: 12, flex: 1 },
  interimBox: { backgroundColor: 'rgba(201,168,76,0.08)', borderRadius: RADIUS.sm, padding: SPACING.sm, borderWidth: 1, borderColor: 'rgba(201,168,76,0.2)' },
  interimText: { color: COLORS.text3, fontSize: 13, fontStyle: 'italic' },
  hint: { color: COLORS.text3, fontSize: 11, lineHeight: 16 },
});
