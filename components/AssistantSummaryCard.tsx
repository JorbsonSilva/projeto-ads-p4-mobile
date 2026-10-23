import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
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
 * Apresenta o resumo do professor recomendado e exige clique manual do aluno
 * para navegar à tela oficial de agendamento. O assistente é impedido de realizar agendamento direto.
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
          <CheckCircle2 size={18} color="#10b981" />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title}>Professor Selecionado</Text>
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
          <Text style={styles.priceValue}>R$ {valorHora.toFixed(2)}/h</Text>
        </View>
      </View>

      {/* Trava de Segurança LGPD & F9-T7 */}
      <View style={styles.securityBox}>
        <AlertCircle size={14} color="#f59e0b" />
        <Text style={styles.securityText}>
          Ação Manual Obrigatória: O assistente não grava no banco nem agenda automaticamente.
          Clique abaixo para escolher o horário oficial.
        </Text>
      </View>

      <TouchableOpacity
        style={styles.actionButton}
        onPress={() => onNavigateToBooking(professorId)}
        activeOpacity={0.8}
      >
        <Calendar size={16} color="#0f172a" />
        <Text style={styles.actionButtonText}>Escolher Horário e Agendar</Text>
        <ArrowRight size={16} color="#0f172a" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: '#334155',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
    paddingBottom: 10,
    marginBottom: 12,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerText: {
    flex: 1,
  },
  title: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  subtitle: {
    color: '#94a3b8',
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
    color: '#94a3b8',
    fontSize: 12,
  },
  value: {
    color: '#f1f5f9',
    fontSize: 12,
    fontWeight: '500',
  },
  valueHighlight: {
    color: '#38bdf8',
    fontSize: 13,
    fontWeight: '700',
  },
  modalityBadge: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  modalityText: {
    color: '#38bdf8',
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
    borderTopColor: '#334155',
  },
  priceLabel: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '600',
  },
  priceValue: {
    color: '#10b981',
    fontSize: 16,
    fontWeight: '800',
  },
  securityBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
    borderRadius: 8,
    padding: 10,
    marginVertical: 12,
  },
  securityText: {
    color: '#fde68a',
    fontSize: 11,
    flex: 1,
    lineHeight: 15,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#10b981',
    paddingVertical: 12,
    borderRadius: 10,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  actionButtonText: {
    color: '#0f172a',
    fontSize: 13,
    fontWeight: '700',
  },
});
