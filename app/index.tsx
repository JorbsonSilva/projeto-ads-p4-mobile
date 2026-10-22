import { Colors } from '@/constants/colors';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

export default function SplashScreen() {
  const router = useRouter();
  const { usuarioId, carregandoAuth } = useAuth();
  const [animacaoConcluida, setAnimacaoConcluida] = useState(false);

  // Valores para a animação
  const opacidade = useRef(new Animated.Value(0)).current;
  const escala = useRef(new Animated.Value(0.3)).current; // Começa bem pequeno

  useEffect(() => {
    Animated.parallel([
      // Surgimento suave
      Animated.timing(opacidade, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: true,
      }),
      // Efeito de mola (crescimento)
      Animated.spring(escala, {
        toValue: 1,
        friction: 5, // Controle da resistência da mola
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setTimeout(() => {
        setAnimacaoConcluida(true);
      }, 3500);
    });
  }, [escala, opacidade]);

  // Navega somente quando a animação terminar E a sessão tiver sido carregada
  useEffect(() => {
    if (!animacaoConcluida || carregandoAuth) return;

    if (usuarioId) {
      router.replace('/(tabs)');
    } else {
      router.replace('/login');
    }
  }, [animacaoConcluida, carregandoAuth, usuarioId, router]);

  return (
    <View style={style.container}>
      <Animated.View
        style={{
          opacity: opacidade,
          transform: [{ scale: escala }],
          alignItems: 'center',
        }}
      >
        {/* Logo PNG */}
        <Animated.Image
          source={require('@/src/assets/images/logo.png')}
          style={style.logo}
          resizeMode="contain"
        />
        
        <Text style={style.subtitulo}>CONECTANDO CONHECIMENTOS</Text>
      </Animated.View>
    </View>
  );
}

const style = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF', // Fundo branco para combinar com a logo
  },
  logo: {
    width: 350,
    height: 350,
  },
  subtitulo: {
    fontSize: 12,
    color: Colors.secondary, 
    letterSpacing: 3,
    marginTop: -5,
  }
});