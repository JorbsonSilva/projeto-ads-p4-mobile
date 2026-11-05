import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Calendar, AlertCircle, ArrowRight, CheckCircle2 } from 'lucide-react-native';

export interface ActionCardProps {
  professorId: number;
  professorNome: string;
  disciplinaNome: string;
  assuntoNome: string;
  modalidade: string;
  valorHora: number;
  onNavigateToBooking: (professorId: number) => void;
}

/**
 * Card de Ação do Assistente (F9-T4 & F9-T7):
 * Apresenta o resumo do professor recomendado no Design System Claro Oficial
 * e direciona o aluno para a tela oficial de agendamento.
 */
export const AssistantSummaryCard: React.FC<ActionCardProps> = ({
  professorId,
  professorNome,
  disciplinaNome,
  assuntoNome,
  modalidade,
  valorHora,
  onNavigateToBooking,
}) => {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <CheckCircle2 size={18} color="#059669" />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title}>Professor Recomendado</Text>
          <Text style={styles.subtitle}>Resumo para Agendamento</Text>
        </View>
      </View>

      <View style={styles.body}>
        <View style={styles.row}>
          <Text style={styles.label}>Docente:</Text>
          <Text style={styles.valueHighlight}>{professorNome}</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Disciplina:</Text>
          <Text style={styles.value}>{disciplinaNome}</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Tópico / Foco:</Text>
          <Text style={styles.value}>{assuntoNome}</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Modalidade:</Text>
          <View style={styles.modalityBadge}>
            <Text style={styles.modalityText}>{modalidade}</Text>
          </View>
        </View>

        <View style={styles.priceRow}>
          <Text style={styles.priceLabel}>Valor hora/aula:</Text>
          <Text style={styles.priceValue}>R$ {valorHora.toFixed(2).replace('.', ',')}/h</Text>
        </View>
      </View>

      {/* Trava de Segurança e Ação Manual */}
      <View style={styles.securityBox}>
        <AlertCircle size={14} color="#D97706" />
        <Text style={styles.securityText}>
          Agendamento Manual Seguro: O assistente não realiza débitos ou reservas sem a sua conferência.
        </Text>
      </View>

      <TouchableOpacity
        style={styles.actionButton}
        onPress={() => onNavigateToBooking(professorId)}
        activeOpacity={0.8}
      >
        <Calendar size={16} color="#FFFFFF" />
        <Text style={styles.actionButtonText}>Escolher Horário e Agendar</Text>
        <ArrowRight size={16} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Platform.select({
      web: {
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05)',
      },
      default: {
        elevation: 2,
      },
    }),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 10,
    marginBottom: 12,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerText: {
    flex: 1,
  },
  title: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '700',
  },
  subtitle: {
    color: '#64748B',
    fontSize: 11,
  },
  body: {
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    color: '#64748B',
    fontSize: 12,
  },
  value: {
    color: '#1E293B',
    fontSize: 12,
    fontWeight: '500',
  },
  valueHighlight: {
    color: '#FF5A1F',
    fontSize: 13,
    fontWeight: '700',
  },
  modalityBadge: {
    backgroundColor: '#EFF6FF',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  modalityText: {
    color: '#2563EB',
    fontSize: 11,
    fontWeight: '600',
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  priceLabel: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '600',
  },
  priceValue: {
    color: '#059669',
    fontSize: 16,
    fontWeight: '800',
  },
  securityBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 8,
    padding: 10,
    marginVertical: 12,
  },
  securityText: {
    color: '#92400E',
    fontSize: 11,
    flex: 1,
    lineHeight: 15,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FF5A1F',
    paddingVertical: 12,
    borderRadius: 10,
    ...Platform.select({
      web: {
        boxShadow: '0 4px 10px rgba(255, 90, 31, 0.25)',
      },
      default: {
        elevation: 2,
      },
    }),
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
