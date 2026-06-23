import React from 'react';
import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import type { EquifyWizardState } from '../wizard/map_equify_wizard';
import { buildValuationInputsFromEquifyState } from '../wizard/build_valuation_inputs';
import {
  computeScenarios,
  computeValuation,
  fmtK,
  type ValuationComputed,
} from '../valuation';
import { registerValubotPdfFonts } from './fonts/register';

/** Fallback דרך @react-pdf/renderer — כשאין Puppeteer/Chromium (Edge / serverless מוגבל) */
registerValubotPdfFonts();

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Heebo',
    fontSize: 11,
    padding: 36,
    color: '#1E3A36',
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 2,
    borderBottomColor: '#00C2B8',
    paddingBottom: 8,
    marginBottom: 16,
  },
  logo: { fontSize: 18, fontWeight: 700, color: '#163530' },
  rid: { fontSize: 8, color: '#527570' },
  hero: { fontSize: 48, fontWeight: 700, color: '#163530', textAlign: 'center', marginVertical: 16 },
  sub: { fontSize: 10, color: '#527570', textAlign: 'center', marginBottom: 12 },
  krow: { flexDirection: 'row', gap: 10, marginTop: 50 },
  kc: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#D6E8E4',
    borderRadius: 8,
    paddingVertical: 16,
    paddingHorizontal: 12,
    minHeight: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kcVal: { fontSize: 26, fontWeight: 700, color: '#163530', textAlign: 'center' },
  kcLbl: { fontSize: 13, fontWeight: 700, color: '#1E3A36', marginTop: 6, textAlign: 'center' },
  table: { marginTop: 12 },
  row: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#D6E8E4', paddingVertical: 6 },
  cell: { flex: 1, fontSize: 10 },
  cellNum: { flex: 1, fontSize: 10, textAlign: 'left' },
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 36,
    right: 36,
    fontSize: 8,
    color: '#527570',
    borderTopWidth: 1,
    borderTopColor: '#D6E8E4',
    paddingTop: 8,
  },
});

export interface WizardSummaryPdfProps {
  state: EquifyWizardState;
  computed?: ValuationComputed;
  reportId?: string;
}

export function WizardSummaryPdfDocument({
  state,
  computed: computedProp,
  reportId,
}: WizardSummaryPdfProps) {
  const inputs = buildValuationInputsFromEquifyState(state);
  const computed = computedProp ?? computeValuation(inputs);
  const scenarios = computeScenarios(computed, inputs);
  const today = new Date().toLocaleDateString('he-IL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const id =
    reportId ?? `EQ-${Date.now().toString(36).toUpperCase().slice(-6)}`;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.logo}>equify. BY SBC</Text>
          <Text style={styles.rid}>
            REPORT #{id} · {today}
          </Text>
        </View>

        <Text style={{ fontSize: 12, color: '#00A89F', marginBottom: 4 }}>
          דוח הערכת שווי · {today}
        </Text>
        <Text style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>
          {state.profile.companyName || 'שם החברה'}
        </Text>
        <Text style={styles.sub}>
          מטרת ההערכה: {state.goal || 'כללי'} · מוגש ל: {state.profile.fullName}
        </Text>

        <Text style={styles.hero}>{fmtK(computed.equity)}</Text>
        <Text style={styles.sub}>
          שווי לבעלים (Equity Value) · תרחיש בסיס · טווח {fmtK(scenarios.bearEq)} –{' '}
          {fmtK(scenarios.bullEq)}
        </Text>

        <View style={styles.krow}>
          <View style={styles.kc}>
            <Text style={styles.kcVal}>{fmtK(computed.ev)}</Text>
            <Text style={styles.kcLbl}>שווי פעילות (EV)</Text>
          </View>
          <View style={styles.kc}>
            <Text style={styles.kcVal}>{computed.wacc.toFixed(1)}%</Text>
            <Text style={styles.kcLbl}>WACC אפקטיבי</Text>
          </View>
          <View style={styles.kc}>
            <Text style={styles.kcVal}>×{computed.effectiveMult.toFixed(1)}</Text>
            <Text style={styles.kcLbl}>מכפיל EBITDA</Text>
          </View>
          <View style={styles.kc}>
            <Text style={styles.kcVal}>
              {computed.qsGrade} · {computed.qs}
            </Text>
            <Text style={styles.kcLbl}>Quality Score</Text>
          </View>
        </View>

        <View style={styles.table}>
          <Text style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>
            תרחישים
          </Text>
          {scenarios.rows.map((row) => (
            <View key={row.label} style={styles.row}>
              <Text style={styles.cell}>{row.label}</Text>
              <Text style={styles.cellNum}>{row.growthPct}%</Text>
              <Text style={styles.cellNum}>{row.waccPct.toFixed(1)}%</Text>
              <Text style={styles.cellNum}>{fmtK(row.equity)}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.footer}>
          EQUIFY VALUATION ENGINE © 2026 equify BY SBC · אינדיקציה אלגוריתמית בלבד
        </Text>
      </Page>
    </Document>
  );
}
