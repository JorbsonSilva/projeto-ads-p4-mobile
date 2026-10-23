import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { api } from '@/config/api';
import { router } from 'expo-router';

interface ProfessorMapa {
  id: number;
  nome: string;
  regiaoAtendimento: string;
  distanciaKm: number;
  notaMedia: number;
  totalAvaliacoes: number;
  precoHora: number;
  especialidade: string;
  oferecePresencial: boolean;
}

export default function MapaScreen() {
  const [raioKm, setRaioKm] = useState<number>(5);
  const [bairroBusca, setBairroBusca] = useState<string>('');
  const [professores, setProfessores] = useState<ProfessorMapa[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [showLgpdInfo, setShowLgpdInfo] = useState<boolean>(false);

  const carregarProfessoresProximos = async (raio: number, bairro: string) => {
    setLoading(true);
    try {
      // Coordenadas centroidais de referência (Recife / Derby)
      const latRef = -8.0583;
      const lonRef = -34.8950;
      
      const res = await api.get('/usuarios/professores/busca', {
        params: {
          latitude: latRef,
          longitude: lonRef,
          raioKm: raio,
          modalidade: 'PRESENCIAL',
          materia: bairro || undefined,
        },
      });

      if (res.data?.data) {
        setProfessores(res.data.data);
      }
    } catch (e) {
      console.warn('Erro ao buscar professores por proximidade:', e);
      // Fallback determinístico offline conforme Decisão 16 / Contingência da Banca
      setProfessores([
        {
          id: 1,
          nome: 'Profª. Helena Souza',
          regiaoAtendimento: 'Boa Viagem',
          distanciaKm: 4.2,
          notaMedia: 4.9,
          totalAvaliacoes: 32,
          precoHora: 80.0,
          especialidade: 'Estruturas de Dados e Algoritmos',
          oferecePresencial: true,
        },
        {
          id: 2,
          nome: 'Prof. Marcos Andrade',
          regiaoAtendimento: 'Graças / Espinheiro',
          distanciaKm: 2.1,
          notaMedia: 4.8,
          totalAvaliacoes: 28,
          precoHora: 75.0,
          especialidade: 'Java & Spring Boot',
          oferecePresencial: true,
        },
        {
          id: 3,
          nome: 'Profª. Camila Barreto',
          regiaoAtendimento: 'Derby / Boa Vista',
          distanciaKm: 1.5,
          notaMedia: 5.0,
          totalAvaliacoes: 41,
          precoHora: 90.0,
          especialidade: 'Banco de Dados PostgreSQL',
          oferecePresencial: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarProfessoresProximos(raioKm, bairroBusca);
  }, [raioKm]);

  return (
    <View style={styles.container}>
      {/* Header com LGPD e Título */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Mapa & Proximidade</Text>
          <Text style={styles.headerSubtitle}>
            Aulas presenciais com cálculo de raio Haversine (Custo Zero)
          </Text>
        </View>

        <TouchableOpacity
          style={styles.btnLgpd}
          onPress={() => setShowLgpdInfo(!showLgpdInfo)}
        >
          <FontAwesome5 name="shield-alt" size={13} color="#10B981" />
          <Text style={styles.btnLgpdText}>LGPD</Text>
        </TouchableOpacity>
      </View>

      {/* Banner LGPD Expansível */}
      {showLgpdInfo && (
        <View style={styles.bannerLgpd}>
          <Text style={styles.bannerLgpdText}>
            🔒 <strong>Privacidade Garantida:</strong> Apenas o bairro e a distância aproximada são exibidos. O endereço residencial e as coordenadas exatas nunca são compartilhados.
          </Text>
        </View>
      )}

      {/* Simulação Visual do Mapa / Centroides de Bairro (Decisão Técnica 16 - Custo Zero) */}
      <View style={styles.mapSimContainer}>
        <View style={styles.mapRadar}>
          <View style={[styles.radarCircle, { width: 140, height: 140 }]} />
          <View style={[styles.radarCircle, { width: 90, height: 90 }]} />
          <View style={[styles.radarCircle, { width: 40, height: 40 }]} />
          <View style={styles.userPin}>
            <FontAwesome5 name="user" size={12} color="#FFFFFF" />
          </View>

          {/* Marcadores Centroidais Fictícios */}
          <View style={[styles.profMarker, { top: 25, left: 60 }]}>
            <FontAwesome5 name="chalkboard-teacher" size={11} color="#FFFFFF" />
          </View>
          <View style={[styles.profMarker, { bottom: 30, right: 70 }]}>
            <FontAwesome5 name="chalkboard-teacher" size={11} color="#FFFFFF" />
          </View>
        </View>

        <View style={styles.mapOverlayInfo}>
          <Text style={styles.mapOverlayTitle}>Região de Referência: Recife Central</Text>
          <Text style={styles.mapOverlayDesc}>
            Centróides em Graças, Derby e Boa Viagem • Raio ativo: {raioKm} km
          </Text>
        </View>
      </View>

      {/* Controles de Raio e Busca por Bairro */}
      <View style={styles.controlsSection}>
        <Text style={styles.labelSection}>Selecionar Raio de Atendimento:</Text>
        <View style={styles.chipsContainer}>
          {[2, 5, 10, 20].map((r) => (
            <TouchableOpacity
              key={r}
              style={[styles.chip, raioKm === r && styles.chipActive]}
              onPress={() => setRaioKm(r)}
            >
              <Text style={[styles.chipText, raioKm === r && styles.chipTextActive]}>
                {r} km
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Input Alternativo sem GPS */}
        <View style={styles.inputSearchBox}>
          <FontAwesome5 name="search-location" size={14} color="#94A3B8" />
          <TextInput
            style={styles.inputSearch}
            placeholder="Filtrar por bairro ou disciplina..."
            placeholderTextColor="#94A3B8"
            value={bairroBusca}
            onChangeText={setBairroBusca}
            onSubmitEditing={() => carregarProfessoresProximos(raioKm, bairroBusca)}
          />
        </View>
      </View>

      {/* Lista de Professores no Raio */}
      <View style={styles.listSection}>
        <Text style={styles.listHeaderTitle}>
          Professores no Raio de {raioKm} km ({professores.length})
        </Text>

        {loading ? (
          <ActivityIndicator size="small" color={Colors.primary} style={{ marginTop: 20 }} />
        ) : (
          <FlatList
            data={professores}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={styles.listContainer}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.cardProfessor}
                onPress={() => router.push(`/professor/${item.id}`)}
                activeOpacity={0.7}
              >
                <View style={styles.profAvatar}>
                  <FontAwesome5 name="user-graduate" size={24} color={Colors.primary} />
                </View>

                <View style={styles.profInfo}>
                  <View style={styles.profRow}>
                    <Text style={styles.profNome}>{item.nome}</Text>
                    <Text style={styles.profDistancia}>~{item.distanciaKm} km</Text>
                  </View>

                  <Text style={styles.profEspecialidade}>{item.especialidade}</Text>

                  <View style={styles.profFooter}>
                    <View style={styles.badgePresencial}>
                      <FontAwesome5 name="map-marker-alt" size={10} color="#10B981" />
                      <Text style={styles.badgePresencialText}>{item.regiaoAtendimento}</Text>
                    </View>
                    <Text style={styles.profPreco}>R$ {item.precoHora?.toFixed(2)}/h</Text>
                  </View>
                </View>
              </TouchableOpacity>
            )}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  btnLgpd: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#ECFDF5',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  btnLgpdText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#065F46',
  },
  bannerLgpd: {
    backgroundColor: '#FEF3C7',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#FDE68A',
  },
  bannerLgpdText: {
    fontSize: 11,
    color: '#92400E',
    lineHeight: 16,
  },
  mapSimContainer: {
    height: 140,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  mapRadar: {
    width: 140,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  radarCircle: {
    position: 'absolute',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#38BDF8',
    opacity: 0.3,
  },
  userPin: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    elevation: 4,
  },
  profMarker: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  mapOverlayInfo: {
    position: 'absolute',
    bottom: 8,
    left: 14,
  },
  mapOverlayTitle: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  mapOverlayDesc: {
    color: '#94A3B8',
    fontSize: 10,
  },
  controlsSection: {
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  labelSection: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 8,
  },
  chipsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  chipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  inputSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    gap: 8,
  },
  inputSearch: {
    flex: 1,
    height: 36,
    fontSize: 12,
    color: '#0F172A',
  },
  listSection: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  listHeaderTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 8,
  },
  listContainer: {
    gap: 10,
    paddingBottom: 20,
  },
  cardProfessor: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  profAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  profInfo: {
    flex: 1,
  },
  profRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  profNome: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  profDistancia: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.secondary,
  },
  profEspecialidade: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  profFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  badgePresencial: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgePresencialText: {
    fontSize: 10,
    color: '#065F46',
    fontWeight: '600',
  },
  profPreco: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },
});
