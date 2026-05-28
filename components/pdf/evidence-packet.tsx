import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer'
import { TEXAS_TAX_CODE_CITATIONS } from '@/config/legal-citations'

// ─── Palette ─────────────────────────────────────────────────────────────────
const C = {
  navy:    '#1e3a5f',
  text:    '#0f172a',
  muted:   '#64748b',
  border:  '#e2e8f0',
  alt:     '#f8fafc',
  green:   '#059669',
  red:     '#dc2626',
  blue50:  '#eff6ff',
  blue200: '#bfdbfe',
  white:   '#ffffff',
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  // Shared page shells
  // Letter uses tighter padding + flex-column so footer never overlaps content
  letterPage: {
    fontFamily: 'Helvetica', fontSize: 9, color: C.text,
    paddingHorizontal: 44, paddingTop: 36, paddingBottom: 36,
    display: 'flex', flexDirection: 'column',
  },
  page: {
    fontFamily: 'Helvetica', fontSize: 9.5, color: C.text,
    paddingHorizontal: 48, paddingTop: 44, paddingBottom: 36,
    display: 'flex', flexDirection: 'column',
  },

  // Flex helpers
  row:  { flexDirection: 'row' },
  col:  { flexDirection: 'column' },
  flex1: { flex: 1 },
  grow: { flexGrow: 1 },

  // ── LETTER PAGE ─────────────────────────────────────────────────────────────
  letterHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 14 },
  letterLogo:   { fontSize: 13, fontFamily: 'Helvetica-Bold', color: C.navy },
  letterTagline:{ fontSize: 7.5, color: C.muted },
  letterDate:   { fontSize: 8, color: C.muted },

  letterTitle:  { fontSize: 12, fontFamily: 'Helvetica-Bold', color: C.navy, letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 3 },
  letterSub:    { fontSize: 7.5, color: C.muted, marginBottom: 14 },
  divider:      { height: 1, backgroundColor: C.border, marginBottom: 14 },

  // Two-column info block
  infoGrid:    { flexDirection: 'row', marginBottom: 14 },
  infoCol:     { flex: 1 },
  infoLabel:   { fontSize: 7, fontFamily: 'Helvetica-Bold', color: C.muted, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 4 },
  infoName:    { fontSize: 9, fontFamily: 'Helvetica-Bold', color: C.text, marginBottom: 1 },
  infoSub:     { fontSize: 7.5, color: C.muted },
  infoRow:     { flexDirection: 'row', marginBottom: 2 },
  infoKey:     { width: 120, fontSize: 8, color: C.muted },
  infoVal:     { flex: 1, fontSize: 8, fontFamily: 'Helvetica-Bold', color: C.text },

  // Grounds
  groundsHeader: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: C.muted, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 5 },
  groundItem:    { flexDirection: 'row', marginBottom: 4 },
  groundNum:     { width: 14, fontSize: 8, fontFamily: 'Helvetica-Bold', color: C.navy },
  groundBody:    { flex: 1, flexDirection: 'column' },
  groundCite:    { fontSize: 8, fontFamily: 'Helvetica-Bold', color: C.navy, marginBottom: 1 },
  groundText:    { fontSize: 8, color: C.text, lineHeight: 1.4 },

  // Valuation summary (letter)
  valHeader: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: C.muted, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 5 },
  valRow:    { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: C.border },
  valLabel:  { fontSize: 8.5, color: C.text },
  valAmt:    { fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: C.text },
  valTarget: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 7, paddingHorizontal: 8, backgroundColor: C.blue50, borderWidth: 1, borderColor: C.blue200, borderRadius: 3, marginTop: 3, marginBottom: 12 },
  valTargetLabel: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: C.navy },
  valTargetAmt:   { fontSize: 9, fontFamily: 'Helvetica-Bold', color: C.navy },

  // Declaration + signature
  declaration:    { fontSize: 8, color: C.text, lineHeight: 1.5, marginBottom: 14 },
  sigBlock:       { marginBottom: 6 },
  sigLine:        { width: 200, height: 1, backgroundColor: C.text, marginTop: 26, marginBottom: 3 },
  sigLabel:       { fontSize: 7.5, color: C.muted },

  // Letter footer (non-absolute — flex pushes it to bottom)
  letterFooter:      { borderTopWidth: 1, borderTopColor: C.border, paddingTop: 7, marginTop: 'auto' },
  letterFooterText:  { fontSize: 7, color: C.muted, lineHeight: 1.4 },

  // ── COVER PAGE ──────────────────────────────────────────────────────────────
  coverGrow:    { flexGrow: 1 },
  coverLogo:    { fontSize: 20, fontFamily: 'Helvetica-Bold', color: C.navy, marginBottom: 4 },
  coverTagline: { fontSize: 10, color: C.muted, marginBottom: 44 },
  coverTitle:   { fontSize: 24, fontFamily: 'Helvetica-Bold', color: C.navy, marginBottom: 8 },
  coverYear:    { fontSize: 12, color: C.muted, marginBottom: 40 },
  coverDivider: { height: 1, backgroundColor: C.border, marginBottom: 20 },
  coverMetaLabel:{ fontSize: 8.5, color: C.muted, fontFamily: 'Helvetica-Bold', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 2 },
  coverMeta:    { fontSize: 11, color: C.text, lineHeight: 1.6 },
  coverMetaBlock: { marginBottom: 14 },
  coverFooter:  { borderTopWidth: 1, borderTopColor: C.border, paddingTop: 8 },
  coverFooterText: { fontSize: 7.5, color: C.muted, lineHeight: 1.5 },

  // ── SECTION HEADERS ─────────────────────────────────────────────────────────
  secLabel:  { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: C.muted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 },
  secTitle:  { fontSize: 14, fontFamily: 'Helvetica-Bold', color: C.navy, marginBottom: 4 },
  secIntro:  { fontSize: 8.5, color: C.muted, lineHeight: 1.6, marginBottom: 14 },

  // ── VALUE TABLE ─────────────────────────────────────────────────────────────
  tRow:      { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: C.border, paddingVertical: 8, paddingHorizontal: 6 },
  tRowAlt:   { backgroundColor: C.alt },
  tLabel:    { flex: 1, fontSize: 9.5, color: C.text },
  tSub:      { flex: 1, fontSize: 8, color: C.muted, marginTop: 2 },
  tVal:      { fontSize: 9.5, fontFamily: 'Helvetica-Bold', color: C.text, textAlign: 'right' },
  tHighlight:{ flexDirection: 'row', backgroundColor: C.blue50, borderWidth: 1, borderColor: C.blue200, borderRadius: 4, paddingVertical: 10, paddingHorizontal: 8, marginTop: 6 },
  tHLabel:   { flex: 1, fontSize: 11, fontFamily: 'Helvetica-Bold', color: C.navy },
  tHVal:     { fontSize: 11, fontFamily: 'Helvetica-Bold', color: C.navy, textAlign: 'right' },

  savingsBox:   { backgroundColor: '#ecfdf5', borderWidth: 1, borderColor: '#a7f3d0', borderRadius: 6, padding: 14, marginTop: 18, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  savingsLabel: { fontSize: 8, color: C.muted, fontFamily: 'Helvetica-Bold', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 3 },
  savingsAmt:   { fontSize: 20, fontFamily: 'Helvetica-Bold', color: C.green },
  savingsSub:   { fontSize: 7.5, color: C.muted, marginTop: 3 },

  // ── COMP TABLE ──────────────────────────────────────────────────────────────
  compHead:    { flexDirection: 'row', backgroundColor: C.navy, paddingVertical: 7, paddingHorizontal: 6, borderRadius: 2 },
  compHeadCell:{ fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: C.white },
  compRow:     { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: C.border, paddingVertical: 6, paddingHorizontal: 6 },
  compCell:    { fontSize: 8.5, color: C.text },

  // ── CONDITION REPORT ────────────────────────────────────────────────────────
  deficitCard:     { borderWidth: 1, borderColor: C.border, borderRadius: 5, marginBottom: 12 },
  deficitHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: C.alt, paddingVertical: 8, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: C.border, borderTopLeftRadius: 5, borderTopRightRadius: 5 },
  deficitCategory: { fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: C.navy, textTransform: 'uppercase', letterSpacing: 0.5 },
  deficitCost:     { fontSize: 10, fontFamily: 'Helvetica-Bold', color: C.red },
  deficitBody:     { padding: 12 },
  deficitDesc:     { fontSize: 9, color: C.text, lineHeight: 1.55, marginBottom: 8 },
  deficitPhotos:   { flexDirection: 'row', flexWrap: 'wrap' },
  deficitPhotoWrap:{ width: '48%', borderWidth: 1, borderColor: C.border, borderRadius: 3, overflow: 'hidden', marginBottom: 6 },
  deficitPhotoOdd: { marginLeft: '4%' },
  deficitPhotoImg: { width: '100%', height: 160, objectFit: 'cover' },
  deficitPhotoCaption: { padding: 5, backgroundColor: C.alt },
  deficitPhotoLabel:   { fontSize: 7, fontFamily: 'Helvetica-Bold', color: C.navy, marginBottom: 1 },
  deficitPhotoTs:      { fontSize: 6.5, color: C.muted },
  noDeficits: { padding: 16, backgroundColor: C.alt, borderRadius: 4, borderWidth: 1, borderColor: C.border },
  noDeficitsText: { fontSize: 9, color: C.muted, textAlign: 'center' },

  // ── TOTALS ──────────────────────────────────────────────────────────────────
  totalRow: { flexDirection: 'row', backgroundColor: C.blue50, borderWidth: 1, borderColor: C.blue200, borderRadius: 4, paddingVertical: 10, paddingHorizontal: 12, marginTop: 4 },
  totalLabel: { flex: 1, fontSize: 10, fontFamily: 'Helvetica-Bold', color: C.navy },
  totalVal:   { fontSize: 10, fontFamily: 'Helvetica-Bold', color: C.red, textAlign: 'right' },

  // ── OWNER'S STATEMENT ───────────────────────────────────────────────────────
  stmtMeta:       { flexDirection: 'row', marginBottom: 16 },
  stmtMetaCol:    { flex: 1 },
  stmtMetaLabel:  { fontSize: 7, fontFamily: 'Helvetica-Bold', color: C.muted, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 2 },
  stmtMetaVal:    { fontSize: 8.5, color: C.text },
  stmtBody:       { fontSize: 9.5, color: C.text, lineHeight: 1.65, marginBottom: 20 },
  stmtSigBlock:   { marginTop: 'auto' as unknown as number },
  stmtSigRow:     { flexDirection: 'row', gap: 40, marginBottom: 20 },
  stmtSigLine:    { width: 180, height: 1, backgroundColor: C.text, marginTop: 28, marginBottom: 3 },
  stmtSigLabel:   { fontSize: 7.5, color: C.muted },
  stmtNotary:     { borderWidth: 1, borderColor: C.border, borderRadius: 3, padding: 12, marginTop: 16 },
  stmtNotaryTitle:{ fontSize: 7, fontFamily: 'Helvetica-Bold', color: C.muted, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6 },
  stmtNotaryLine: { height: 1, backgroundColor: C.border, marginBottom: 10 },
  stmtNotaryText: { fontSize: 7.5, color: C.muted, lineHeight: 1.5 },

  // ── PAGE FOOTER (non-absolute) ───────────────────────────────────────────────
  pageFooter:     { borderTopWidth: 1, borderTopColor: C.border, paddingTop: 7, marginTop: 'auto' },
  pageFooterText: { fontSize: 7, color: C.muted },
})

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtUSD = (v: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v)

const fmtNum = (v: number) =>
  new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(v)

function capFirst(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

type ArgumentType = 'market_value' | 'equity' | 'both'

function groundsLines(arg: ArgumentType): { cite: string; text: string }[] {
  const market = {
    cite: `${TEXAS_TAX_CODE_CITATIONS.rightToProtest}(a)(1)`,
    text: 'The appraised value of the property exceeds its correct market value.',
  }
  const equity = {
    cite: TEXAS_TAX_CODE_CITATIONS.unequalAppraisal,
    text: 'The property is appraised unequally — its value exceeds the median appraised value of comparable properties, appropriately adjusted.',
  }
  if (arg === 'market_value') return [market]
  if (arg === 'equity') return [equity]
  return [market, equity]
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface Comp {
  street_address: string
  zip_code: string
  total_living_area_sqft: number
  current_proposed_value: number
}

interface Deficit {
  id: string
  category: string
  user_description: string
  estimated_cost_to_cure: number
}

export interface EvidencePhoto {
  exhibitId: string
  deficitId: string
  deficitCategory: string
  description: string
  uploadedAt: string
  dataUri: string
}

interface Props {
  address: string
  countyAccountNumber: string
  countyName: string
  ownerName: string | null
  yearBuilt: number | null
  sqft: number
  currentValue: number
  equityTarget: number
  deficitTotal: number
  targetValue: number
  estimatedSavings: number
  compCount: number
  comps: Comp[]
  deficits: Deficit[]
  photos: EvidencePhoto[]
  preparedDate: string
  argumentType: ArgumentType
  taxYear: string
  auditNarrative?: string | null
}

// ─── Component ────────────────────────────────────────────────────────────────
export function EvidencePacket({
  address, countyAccountNumber, countyName, ownerName, yearBuilt,
  sqft, currentValue, equityTarget, deficitTotal, targetValue,
  estimatedSavings, compCount, comps, deficits, photos,
  preparedDate, argumentType, taxYear, auditNarrative,
}: Props) {
  const district = `${capFirst(countyName)} Central Appraisal District`
  const grounds  = groundsLines(argumentType)
  const perSqft  = (v: number) => (v / sqft).toFixed(2)
  const photosByDeficit = new Map<string, EvidencePhoto[]>()
  for (const p of photos) {
    const arr = photosByDeficit.get(p.deficitId) ?? []
    arr.push(p)
    photosByDeficit.set(p.deficitId, arr)
  }

  return (
    <Document
      title={`FairValue Protest Packet — ${address}`}
      author="FairValue"
      subject="Property Tax Protest Packet"
    >

      {/* ══════════════════════════════════════════════════════════════════
          PAGE 1 — NOTICE OF PROTEST
          Compact single-page letter; footer uses flex not absolute
      ══════════════════════════════════════════════════════════════════ */}
      <Page size="LETTER" style={s.letterPage}>

        {/* Header row: logo left, date right */}
        <View style={s.letterHeader}>
          <View>
            <Text style={s.letterLogo}>FairValue</Text>
            <Text style={s.letterTagline}>Texas Property Tax Protest Service</Text>
          </View>
          <Text style={s.letterDate}>{preparedDate}</Text>
        </View>

        <Text style={s.letterTitle}>Official Notice of Intent to Protest</Text>
        <Text style={s.letterSub}>
          Pursuant to {TEXAS_TAX_CODE_CITATIONS.rightToProtest} and {TEXAS_TAX_CODE_CITATIONS.filingDeadline}
        </Text>
        <View style={s.divider} />

        {/* Two-column info block */}
        <View style={s.infoGrid}>
          <View style={s.infoCol}>
            <Text style={s.infoLabel}>Submitted To</Text>
            <Text style={s.infoName}>{district}</Text>
            <Text style={s.infoSub}>Appraisal Review Board — Tax Year {taxYear}</Text>
          </View>
          <View style={s.infoCol}>
            <Text style={s.infoLabel}>Property</Text>
            <View style={s.infoRow}>
              <Text style={s.infoKey}>Address</Text>
              <Text style={s.infoVal}>{address}</Text>
            </View>
            <View style={s.infoRow}>
              <Text style={s.infoKey}>Account #</Text>
              <Text style={s.infoVal}>{countyAccountNumber}</Text>
            </View>
            {ownerName && (
              <View style={s.infoRow}>
                <Text style={s.infoKey}>Owner of Record</Text>
                <Text style={s.infoVal}>{ownerName}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Grounds */}
        <Text style={s.groundsHeader}>Grounds for Protest</Text>
        {grounds.map((g, i) => (
          <View key={i} style={s.groundItem}>
            <Text style={s.groundNum}>{i + 1}.</Text>
            <View style={s.groundBody}>
              <Text style={s.groundCite}>{g.cite}</Text>
              <Text style={s.groundText}>{g.text}</Text>
            </View>
          </View>
        ))}

        {/* Valuation */}
        <Text style={[s.valHeader, { marginTop: 12 }]}>Valuation</Text>
        <View style={s.valRow}>
          <Text style={s.valLabel}>Current Appraised Value (Protested)</Text>
          <Text style={s.valAmt}>{fmtUSD(currentValue)}</Text>
        </View>
        <View style={s.valTarget}>
          <Text style={s.valTargetLabel}>Requested Appraised Value</Text>
          <Text style={s.valTargetAmt}>{fmtUSD(targetValue)}</Text>
        </View>

        {/* Declaration */}
        <Text style={s.declaration}>
          The property owner respectfully requests that the Appraisal Review Board schedule a hearing
          and correct the appraised value in accordance with the supporting evidence enclosed.
          Comparable sales analysis, property condition documentation, and photographic evidence
          are attached.
        </Text>

        {/* Signature */}
        <View style={s.sigBlock}>
          <Text style={{ fontSize: 8, color: C.muted }}>Respectfully submitted by,</Text>
          <View style={s.sigLine} />
          <Text style={s.sigLabel}>Property Owner Signature &amp; Date</Text>
        </View>

        {/* Footer — pushed to bottom by marginTop: auto on letterFooter */}
        <View style={s.letterFooter}>
          <Text style={s.letterFooterText}>
            Prepared by FairValue · {preparedDate} · Filed pursuant to{' '}
            {TEXAS_TAX_CODE_CITATIONS.rightToProtest}, {TEXAS_TAX_CODE_CITATIONS.unequalAppraisal},{' '}
            {TEXAS_TAX_CODE_CITATIONS.filingDeadline}, {TEXAS_TAX_CODE_CITATIONS.hearingProcedures}.
          </Text>
        </View>
      </Page>

      {/* ══════════════════════════════════════════════════════════════════
          PAGE 2 — COVER / TABLE OF CONTENTS
      ══════════════════════════════════════════════════════════════════ */}
      <Page size="LETTER" style={s.page}>
        <View style={s.coverGrow}>
          <Text style={s.coverLogo}>FairValue</Text>
          <Text style={s.coverTagline}>Texas Property Tax Protest Service</Text>
          <Text style={s.coverTitle}>Property Tax Protest{'\n'}Evidence Packet</Text>
          <Text style={s.coverYear}>Tax Year {taxYear}</Text>
          <View style={s.coverDivider} />
          <View style={s.coverMetaBlock}>
            <Text style={s.coverMetaLabel}>Property Address</Text>
            <Text style={s.coverMeta}>{address}</Text>
          </View>
          <View style={s.coverMetaBlock}>
            <Text style={s.coverMetaLabel}>County Account Number</Text>
            <Text style={s.coverMeta}>{countyAccountNumber}</Text>
          </View>
          <View style={s.coverMetaBlock}>
            <Text style={s.coverMetaLabel}>Appraisal District</Text>
            <Text style={s.coverMeta}>{capFirst(countyName)} CAD</Text>
          </View>
          <View style={s.coverMetaBlock}>
            <Text style={s.coverMetaLabel}>Prepared</Text>
            <Text style={s.coverMeta}>{preparedDate}</Text>
          </View>
        </View>
        <View style={s.coverFooter}>
          <Text style={s.coverFooterText}>
            This packet was prepared by FairValue to support a property tax protest before the
            Appraisal Review Board pursuant to {TEXAS_TAX_CODE_CITATIONS.rightToProtest},{' '}
            {TEXAS_TAX_CODE_CITATIONS.unequalAppraisal}, {TEXAS_TAX_CODE_CITATIONS.filingDeadline},
            and {TEXAS_TAX_CODE_CITATIONS.hearingProcedures}.
          </Text>
        </View>
      </Page>

      {/* ══════════════════════════════════════════════════════════════════
          PAGE 3 — VALUE ANALYSIS SUMMARY
      ══════════════════════════════════════════════════════════════════ */}
      <Page size="LETTER" style={s.page}>
        <View style={s.grow}>
          <Text style={s.secLabel}>Section 1</Text>
          <Text style={s.secTitle}>Value Analysis Summary</Text>

          <View style={[s.tRow, s.tRowAlt]}>
            <View style={s.flex1}>
              <Text style={s.tLabel}>Current Proposed Value</Text>
              <Text style={s.tSub}>Tax Year {taxYear} Appraisal</Text>
            </View>
            <Text style={s.tVal}>{fmtUSD(currentValue)}</Text>
          </View>

          <View style={s.tRow}>
            <View style={s.flex1}>
              <Text style={s.tLabel}>Equity Comparable Target</Text>
              <Text style={s.tSub}>
                Median $/sqft of {compCount} comparable {compCount === 1 ? 'property' : 'properties'} × {fmtNum(sqft)} sqft
              </Text>
            </View>
            <Text style={s.tVal}>{fmtUSD(equityTarget)}</Text>
          </View>

          {deficitTotal > 0 && (
            <View style={[s.tRow, s.tRowAlt]}>
              <View style={s.flex1}>
                <Text style={s.tLabel}>Documented Condition Deduction</Text>
                <Text style={s.tSub}>
                  {deficits.length} documented defect{deficits.length !== 1 ? 's' : ''} — see Section 3
                </Text>
              </View>
              <Text style={[s.tVal, { color: C.red }]}>− {fmtUSD(deficitTotal)}</Text>
            </View>
          )}

          <View style={s.tHighlight}>
            <Text style={s.tHLabel}>Target Protest Value</Text>
            <Text style={s.tHVal}>{fmtUSD(targetValue)}</Text>
          </View>

          <View style={s.savingsBox}>
            <View>
              <Text style={s.savingsLabel}>Estimated Annual Tax Savings</Text>
              <Text style={s.savingsAmt}>{fmtUSD(estimatedSavings)}</Text>
              <Text style={s.savingsSub}>
                Based on {capFirst(countyName)} County composite tax rate
                {yearBuilt ? ` · Built ${yearBuilt}` : ''} · {fmtNum(sqft)} sqft
              </Text>
            </View>
          </View>
        </View>
        <View style={s.pageFooter}>
          <Text style={s.pageFooterText}>FairValue · {address} · Tax Year {taxYear}</Text>
        </View>
      </Page>

      {/* ══════════════════════════════════════════════════════════════════
          PAGE 4 — COMPARABLE PROPERTY ANALYSIS
      ══════════════════════════════════════════════════════════════════ */}
      <Page size="LETTER" style={s.page}>
        <View style={s.grow}>
          <Text style={s.secLabel}>Section 2</Text>
          <Text style={s.secTitle}>Comparable Property Analysis</Text>
          <Text style={s.secIntro}>
            The following properties are in the same ZIP code and within 15% of the subject property's
            living area{yearBuilt ? ' and within 5 years of construction' : ''}. Under{' '}
            {TEXAS_TAX_CODE_CITATIONS.unequalAppraisal}(b), a property is appraised unequally when its
            value exceeds the median appraised value of a reasonable number of comparable properties.
          </Text>

          <View style={s.compHead}>
            <Text style={[s.compHeadCell, { flex: 3 }]}>Address</Text>
            <Text style={[s.compHeadCell, { flex: 1, textAlign: 'right' }]}>Sqft</Text>
            <Text style={[s.compHeadCell, { flex: 1.2, textAlign: 'right' }]}>Value</Text>
            <Text style={[s.compHeadCell, { flex: 1, textAlign: 'right' }]}>$/Sqft</Text>
          </View>

          {comps.slice(0, 20).map((c, i) => (
            <View key={i} style={[s.compRow, i % 2 === 1 ? s.tRowAlt : {}]}>
              <Text style={[s.compCell, { flex: 3 }]}>{c.street_address}</Text>
              <Text style={[s.compCell, { flex: 1, textAlign: 'right' }]}>{fmtNum(c.total_living_area_sqft)}</Text>
              <Text style={[s.compCell, { flex: 1.2, textAlign: 'right' }]}>{fmtUSD(c.current_proposed_value)}</Text>
              <Text style={[s.compCell, { flex: 1, textAlign: 'right' }]}>${perSqft(c.current_proposed_value)}</Text>
            </View>
          ))}

          <View style={[s.tHighlight, { marginTop: 10 }]}>
            <Text style={[s.tHLabel, { flex: 3 }]}>Subject: {address}</Text>
            <Text style={[s.compCell, { flex: 1, textAlign: 'right', fontFamily: 'Helvetica-Bold' }]}>{fmtNum(sqft)}</Text>
            <Text style={[s.compCell, { flex: 1.2, textAlign: 'right', fontFamily: 'Helvetica-Bold' }]}>{fmtUSD(currentValue)}</Text>
            <Text style={[s.compCell, { flex: 1, textAlign: 'right', fontFamily: 'Helvetica-Bold' }]}>${perSqft(currentValue)}</Text>
          </View>
        </View>
        <View style={s.pageFooter}>
          <Text style={s.pageFooterText}>FairValue · {address} · Tax Year {taxYear}</Text>
        </View>
      </Page>

      {/* ══════════════════════════════════════════════════════════════════
          PAGE 5+ — PROPERTY CONDITION REPORT
          Each deficit card includes its photos inline.
          Shown even if empty — appraiser sees "no issues documented."
      ══════════════════════════════════════════════════════════════════ */}
      <Page size="LETTER" style={s.page}>
        <View style={s.grow}>
          <Text style={s.secLabel}>Section 3</Text>
          <Text style={s.secTitle}>Property Condition Report</Text>
          <Text style={s.secIntro}>
            The following defects and deficiencies were documented by the property owner during the
            home condition audit. Each item reduces the functional utility or market appeal of the
            property. Repair cost estimates are provided for each issue; photographs are included
            inline where available.
          </Text>

          {deficits.length === 0 && (
            <View style={s.noDeficits}>
              <Text style={s.noDeficitsText}>No condition issues were documented during the audit.</Text>
            </View>
          )}

          {deficits.map((d, i) => {
            const dPhotos = photosByDeficit.get(d.id) ?? []
            return (
              <View key={i} style={s.deficitCard} wrap={false}>
                {/* Card header */}
                <View style={s.deficitHeader}>
                  <Text style={s.deficitCategory}>{d.category}</Text>
                  <Text style={s.deficitCost}>Est. repair cost: {fmtUSD(d.estimated_cost_to_cure)}</Text>
                </View>

                {/* Card body */}
                <View style={s.deficitBody}>
                  <Text style={s.deficitDesc}>{d.user_description}</Text>

                  {/* Inline photos — 2-up grid */}
                  {dPhotos.length > 0 && (
                    <View style={s.deficitPhotos}>
                      {dPhotos.map((photo, pi) => (
                        <View
                          key={photo.exhibitId}
                          style={[
                            s.deficitPhotoWrap,
                            pi % 2 === 1 ? s.deficitPhotoOdd : {},
                          ]}
                        >
                          <Image src={photo.dataUri} style={s.deficitPhotoImg} />
                          <View style={s.deficitPhotoCaption}>
                            <Text style={s.deficitPhotoLabel}>{photo.exhibitId}</Text>
                            <Text style={s.deficitPhotoTs}>Uploaded {photo.uploadedAt}</Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              </View>
            )
          })}

          {deficits.length > 0 && (
            <View style={s.totalRow}>
              <Text style={s.totalLabel}>Total Documented Condition Deduction</Text>
              <Text style={s.totalVal}>− {fmtUSD(deficitTotal)}</Text>
            </View>
          )}
        </View>
        <View style={s.pageFooter}>
          <Text style={s.pageFooterText}>FairValue · {address} · Tax Year {taxYear}</Text>
        </View>
      </Page>

      {/* ══════════════════════════════════════════════════════════════════
          SECTION 4 — OWNER'S STATEMENT OF PROPERTY CONDITION
          Only rendered when auditNarrative is present.
      ══════════════════════════════════════════════════════════════════ */}
      {auditNarrative && (
        <Page size="LETTER" style={s.letterPage}>

          {/* Header */}
          <View style={s.letterHeader}>
            <View>
              <Text style={s.letterLogo}>FairValue</Text>
              <Text style={s.letterTagline}>Texas Property Tax Protest Service</Text>
            </View>
            <Text style={s.letterDate}>{preparedDate}</Text>
          </View>

          <Text style={s.letterTitle}>Owner's Statement of Property Condition</Text>
          <Text style={s.letterSub}>Section 4 — Sworn Declaration in Support of Protest</Text>
          <View style={s.divider} />

          {/* Property meta */}
          <View style={s.stmtMeta}>
            <View style={s.stmtMetaCol}>
              <Text style={s.stmtMetaLabel}>Property Address</Text>
              <Text style={s.stmtMetaVal}>{address}</Text>
            </View>
            <View style={s.stmtMetaCol}>
              <Text style={s.stmtMetaLabel}>Account Number</Text>
              <Text style={s.stmtMetaVal}>{countyAccountNumber}</Text>
            </View>
            <View style={s.stmtMetaCol}>
              <Text style={s.stmtMetaLabel}>Tax Year</Text>
              <Text style={s.stmtMetaVal}>{taxYear}</Text>
            </View>
          </View>

          {/* Narrative body */}
          <Text style={s.stmtBody}>{auditNarrative}</Text>

          {/* Signature block */}
          <View style={s.stmtSigBlock}>
            <View style={s.stmtSigRow}>
              <View>
                <View style={s.stmtSigLine} />
                <Text style={s.stmtSigLabel}>
                  {ownerName ? ownerName : 'Property Owner'} — Signature
                </Text>
              </View>
              <View>
                <View style={s.stmtSigLine} />
                <Text style={s.stmtSigLabel}>Date</Text>
              </View>
            </View>

            {/* Notary block */}
            <View style={s.stmtNotary}>
              <Text style={s.stmtNotaryTitle}>Notary Acknowledgment (optional — strengthens the record)</Text>
              <View style={s.stmtNotaryLine} />
              <Text style={s.stmtNotaryText}>
                State of Texas, County of ______________________{'\n'}
                Subscribed and sworn to before me on __________________ by ____________________________,
                who is personally known to me or proved to me on the basis of satisfactory evidence to be the
                person whose name is subscribed to the within instrument.
              </Text>
              <View style={[s.stmtSigLine, { marginTop: 20 }]} />
              <Text style={s.stmtSigLabel}>Notary Public — Signature &amp; Seal</Text>
            </View>
          </View>

          {/* Footer */}
          <View style={s.letterFooter}>
            <Text style={s.letterFooterText}>
              Prepared by FairValue · {preparedDate} · {address} · Tax Year {taxYear}
            </Text>
          </View>
        </Page>
      )}

    </Document>
  )
}
