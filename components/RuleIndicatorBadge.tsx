import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ShieldCheck, Cpu } from 'lucide-react-native';

/**
 * Componente visual obrigatório (F9-T6):
 * Informa com clareza ao aluno que a interação é baseada em regras determinísticas do Orienta,
 * garantindo transparência, precisão matemática e ausência de cobranças de IA externa.
 */
export const RuleIndicatorBadge: React.FC = () => {
  return (
    <View style={styles.container}>
      <View style={styles.badge}>
        <Cpu size={12} color="#10b981" />
        <Text style={styles.badgeText}>TRIAGEM POR REGRAS DETERMINÍSTICAS</Text>
      </View>
      <Text style={styles.subtext}>
        Sem alucinação • Custo Zero • Não realiza agendamento sem sua confirmação manual
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0f172a',
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  badgeText: {
    color: '#34d399',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  subtext: {
    color: '#94a3b8',
    fontSize: 10,
    marginTop: 3,
    textAlign: 'center',
  },
});
