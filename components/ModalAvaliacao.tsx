import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
} from 'react-native';
import { FontAwesome5, Feather } from '@expo/vector-icons';

export interface ModalAvaliacaoProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (avaliacao: DadosAvaliacao) => void;
  professorNome?: string;
  disciplinaNome?: string;
  dataAula?: string;
}

export interface DadosAvaliacao {
  notaGeral: number;
  notaDidatica: number;
  notaPontualidade: number;
  notaDominio: number;
  tagsSelecionadas: string[];
  comentario: string;
}

const TAGS_ELOGIOS_PADRAO = [
  'Excelente Didática',
  'Muito Paciente',
  'Domínio do Conteúdo',
  'Exercícios Práticos',
  'Pontualíssimo',
  'Material Útil',
  'Explicação Clara',
  'Resolução Passo a Passo',
];

const LABELS_NOTAS: Record<number, string> = {
  1: 'Precisa melhorar',
  2: 'Regular',
  3: 'Boa aula',
  4: 'Muito boa!',
  5: 'Excelente! Incrível ⭐',
};

export const ModalAvaliacao: React.FC<ModalAvaliacaoProps> = ({
  visible,
  onClose,
  onSubmit,
  professorNome = 'Prof. Lucas Rocha',
  disciplinaNome = 'Cálculo I',
  dataAula = 'Hoje, 14:00',
}) => {
  const [notaGeral, setNotaGeral] = useState<number>(5);
  const [notaDidatica, setNotaDidatica] = useState<number>(5);
  const [notaPontualidade, setNotaPontualidade] = useState<number>(5);
  const [notaDominio, setNotaDominio] = useState<number>(5);
  const [tagsSelecionadas, setTagsSelecionadas] = useState<string[]>([
    'Excelente Didática',
    'Domínio do Conteúdo',
  ]);
  const [comentario, setComentario] = useState<string>('');
  const [enviadoComSucesso, setEnviadoComSucesso] = useState<boolean>(false);

  const toggleTag = (tag: string) => {
    if (tagsSelecionadas.includes(tag)) {
      setTagsSelecionadas(tagsSelecionadas.filter((t) => t !== tag));
    } else {
      setTagsSelecionadas([...tagsSelecionadas, tag]);
    }
  };

  const handleConfirmar = () => {
    setEnviadoComSucesso(true);
    setTimeout(() => {
      onSubmit({
        notaGeral,
        notaDidatica,
        notaPontualidade,
        notaDominio,
        tagsSelecionadas,
        comentario,
      });
      setEnviadoComSucesso(false);
      onClose();
    }, 1200);
  };

  const renderEstrelas = (
    valorAtual: number,
    onChange: (val: number) => void,
    tamanho: number = 26,
    gap: number = 6
  ) => {
    return (
      <View style={[styles.estrelasRow, { gap }]}>
        {[1, 2, 3, 4, 5].map((star) => {
          const ativa = star <= valorAtual;
          return (
            <TouchableOpacity
              key={star}
              onPress={() => onChange(star)}
              activeOpacity={0.7}
              hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
            >
              <FontAwesome5
                name="star"
                solid={ativa}
                size={tamanho}
                color={ativa ? '#F59E0B' : '#E2E8F0'}
              />
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          {enviadoComSucesso ? (
            <View style={styles.sucessoContainer}>
              <View style={styles.sucessoIconWrap}>
                <Feather name="check-circle" size={44} color="#059669" />
              </View>
              <Text style={styles.sucessoTitulo}>Avaliação Registrada!</Text>
              <Text style={styles.sucessoTexto}>
                Muito obrigado por contribuir com a comunidade pedagógica do Orienta 2.0.
              </Text>
            </View>
          ) : (
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              {/* Header do Modal */}
              <View style={styles.header}>
                <View style={styles.iconTituloWrap}>
                  <View style={styles.iconeEstrelaWrap}>
                    <FontAwesome5 name="star" size={16} color="#D97706" solid />
                  </View>
                  <View style={styles.textosHeader}>
                    <Text style={styles.titulo}>Avaliar Mentoria</Text>
                    <Text style={styles.subtituloHeader}>
                      {professorNome} • {disciplinaNome}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity onPress={onClose} style={styles.btnFechar} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Feather name="x" size={18} color="#64748B" />
                </TouchableOpacity>
              </View>

              <Text style={styles.instrucaoTexto}>
                Sua avaliação mútua é indispensável para o algoritmo de qualidade pedagógica e formação acadêmica contínua.
              </Text>

              {/* Critério Principal: Nota Geral */}
              <View style={styles.boxNotaGeral}>
                <Text style={styles.labelNotaGeral}>Nota Geral da Aula</Text>
                {renderEstrelas(notaGeral, setNotaGeral, 30, 8)}
                <Text style={styles.labelDescricaoNota}>
                  {LABELS_NOTAS[notaGeral] || ''}
                </Text>
              </View>

              {/* Critérios Específicos */}
              <View style={styles.subCriteriosContainer}>
                <View style={styles.subCriterioItem}>
                  <Text style={styles.subCriterioTitulo}>Didática & Clareza</Text>
                  {renderEstrelas(notaDidatica, setNotaDidatica, 18, 4)}
                </View>

                <View style={styles.subCriterioItem}>
                  <Text style={styles.subCriterioTitulo}>Pontualidade & Compromisso</Text>
                  {renderEstrelas(notaPontualidade, setNotaPontualidade, 18, 4)}
                </View>

                <View style={styles.subCriterioItem}>
                  <Text style={styles.subCriterioTitulo}>Domínio do Conteúdo</Text>
                  {renderEstrelas(notaDominio, setNotaDominio, 18, 4)}
                </View>
              </View>

              {/* Tags de Destaques Positivos */}
              <View style={styles.secaoTags}>
                <Text style={styles.secaoTitulo}>Destaques Positivos (opcional)</Text>
                <View style={styles.tagsGrid}>
                  {TAGS_ELOGIOS_PADRAO.map((tag) => {
                    const ativa = tagsSelecionadas.includes(tag);
                    return (
                      <TouchableOpacity
                        key={tag}
                        style={[styles.chipTag, ativa && styles.chipTagAtivo]}
                        onPress={() => toggleTag(tag)}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.chipTagTexto, ativa && styles.chipTagTextoAtivo]}>
                          {ativa ? '✓ ' : '+ '}
                          {tag}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Campo de Comentário Aberto */}
              <View style={styles.secaoComentario}>
                <View style={styles.comentarioHeader}>
                  <Text style={styles.secaoTitulo}>Deixe um depoimento</Text>
                  <Text style={styles.caracteresCount}>{comentario.length}/500</Text>
                </View>
                <TextInput
                  style={styles.inputComentario}
                  placeholder="Compartilhe como foi a dinâmica, se o mentor tirou todas as suas dúvidas e como a aula te ajudou nos estudos..."
                  placeholderTextColor="#94A3B8"
                  multiline
                  maxLength={500}
                  value={comentario}
                  onChangeText={setComentario}
                />
              </View>

              {/* Ações Inferiores */}
              <View style={styles.acoesContainer}>
                <TouchableOpacity
                  style={styles.btnDepois}
                  onPress={onClose}
                  activeOpacity={0.7}
                >
                  <Text style={styles.btnDepoisTexto}>Depois</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.btnEnviar}
                  onPress={handleConfirmar}
                  activeOpacity={0.8}
                >
                  <FontAwesome5 name="paper-plane" size={13} color="#FFFFFF" />
                  <Text style={styles.btnEnviarTexto}>Enviar Avaliação</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 480,
    maxHeight: '90%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    ...Platform.select({
      web: {
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
      },
      default: {
        elevation: 8,
      },
    }),
  },
  scrollContent: {
    padding: 20,
    gap: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 12,
  },
  iconTituloWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  iconeEstrelaWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  textosHeader: {
    flex: 1,
  },
  titulo: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
  },
  subtituloHeader: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  btnFechar: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  instrucaoTexto: {
    fontSize: 12,
    lineHeight: 18,
    color: '#64748B',
  },
  boxNotaGeral: {
    backgroundColor: '#FFF7ED',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FFEDD5',
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  labelNotaGeral: {
    fontSize: 13,
    fontWeight: '700',
    color: '#9A3412',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  estrelasRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  labelDescricaoNota: {
    fontSize: 13,
    fontWeight: '700',
    color: '#D97706',
  },
  subCriteriosContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    gap: 12,
  },
  subCriterioItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  subCriterioTitulo: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  secaoTags: {
    gap: 8,
  },
  secaoTitulo: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  tagsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chipTag: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  chipTagAtivo: {
    backgroundColor: '#FFF7ED',
    borderColor: '#FF5A1F',
  },
  chipTagTexto: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  chipTagTextoAtivo: {
    color: '#FF5A1F',
    fontWeight: '700',
  },
  secaoComentario: {
    gap: 6,
  },
  comentarioHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  caracteresCount: {
    fontSize: 11,
    color: '#94A3B8',
  },
  inputComentario: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    fontSize: 13,
    color: '#0F172A',
    minHeight: 74,
    textAlignVertical: 'top',
  },
  acoesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 8,
  },
  btnDepois: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnDepoisTexto: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  btnEnviar: {
    flex: 2,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FF5A1F',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    ...Platform.select({
      web: {
        boxShadow: '0 4px 10px rgba(255, 90, 31, 0.3)',
      },
      default: {
        elevation: 3,
      },
    }),
  },
  btnEnviarTexto: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  sucessoContainer: {
    padding: 32,
    alignItems: 'center',
    gap: 12,
  },
  sucessoIconWrap: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sucessoTitulo: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
  },
  sucessoTexto: {
    fontSize: 13,
    lineHeight: 18,
    color: '#64748B',
    textAlign: 'center',
    maxWidth: 320,
  },
});
