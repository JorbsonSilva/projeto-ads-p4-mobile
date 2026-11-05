import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Cpu, ShieldCheck } from 'lucide-react-native';

/**
 * Componente visual de transparência acadêmica e regras determinísticas (F9-T6):
 * Informa com clareza ao aluno que a triagem e o tutor de estudos operam com base
 * em regras do Orienta 2.0 e algoritmos pedagógicos sem agendamento autônomo.
 */
export const RuleIndicatorBadge: React.FC = () => {
  return (
    <View style={styles.container}>
      <View style={styles.badge}>
        <Cpu size={12} color="#059669" />
        <Text style={styles.badgeText}>TUTOR ACADÊMICO & TRIAGEM PEDAGÓGICA</Text>
      </View>
      <Text style={styles.subtext}>
        Resolução guiada de dúvidas • Agendamento 100% sob seu controle manual
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  badgeText: {
    color: '#065F46',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  subtext: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 4,
    textAlign: 'center',
  },
});
