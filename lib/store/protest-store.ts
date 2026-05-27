import { create } from 'zustand'

export type Phase = 2 | 3 | 4 | 5
export type ArgumentType = 'market_value' | 'equity' | 'both'
export type ProtestStatus = 'auditing' | 'payment_pending' | 'processing_pdf' | 'completed_ready'

export interface PropertyData {
  id: string
  county_account_number: string
  county_name: string
  street_address: string
  zip_code: string
  owner_name: string | null
  year_built: number | null
  total_living_area_sqft: number
  current_proposed_value: number
  market_value_land: number | null
  market_value_improvements: number | null
  homestead_capped_value: number | null
}

export interface Deficit {
  id: string
  category: string
  user_description: string
  estimated_cost_to_cure: number
}

interface ProtestState {
  phase: Phase
  protestId: string | null
  property: PropertyData | null
  argumentType: ArgumentType | null
  deficits: Deficit[]
  targetProtestValue: number | null
  estimatedSavings: number | null
  equityTarget: number | null
  deficitTotal: number | null
  compCount: number | null
  pdfUrl: string | null
}

interface ProtestActions {
  init: (
    protestId: string,
    property: PropertyData,
    phase: Phase,
    argumentType: ArgumentType | null,
    targetProtestValue?: number | null,
    estimatedSavings?: number | null,
    pdfUrl?: string | null,
  ) => void
  setPhase: (phase: Phase) => void
  setArgumentType: (type: ArgumentType) => void
  updatePropertySqft: (sqft: number) => void
  addDeficit: (deficit: Deficit) => void
  removeDeficit: (id: string) => void
  setTargetValue: (target: number, savings: number, equityTarget: number, deficitTotal: number, compCount: number) => void
  setPdfUrl: (url: string) => void
  reset: () => void
}

export type ProtestStore = ProtestState & ProtestActions

const initialState: ProtestState = {
  phase: 2,
  protestId: null,
  property: null,
  argumentType: null,
  deficits: [],
  targetProtestValue: null,
  estimatedSavings: null,
  equityTarget: null,
  deficitTotal: null,
  compCount: null,
  pdfUrl: null,
}

export const useProtestStore = create<ProtestStore>()((set) => ({
  ...initialState,
  init: (protestId, property, phase, argumentType, targetProtestValue = null, estimatedSavings = null, pdfUrl = null) =>
    set({ protestId, property, phase, argumentType, deficits: [], targetProtestValue, estimatedSavings, equityTarget: null, deficitTotal: null, compCount: null, pdfUrl }),
  setPhase: (phase) => set({ phase }),
  setArgumentType: (argumentType) => set({ argumentType }),
  updatePropertySqft: (sqft) => set((s) => s.property ? { property: { ...s.property, total_living_area_sqft: sqft } } : {}),
  addDeficit: (deficit) => set((s) => ({ deficits: [...s.deficits, deficit] })),
  removeDeficit: (id) => set((s) => ({ deficits: s.deficits.filter((d) => d.id !== id) })),
  setTargetValue: (targetProtestValue, estimatedSavings, equityTarget, deficitTotal, compCount) =>
    set({ targetProtestValue, estimatedSavings, equityTarget, deficitTotal, compCount }),
  setPdfUrl: (pdfUrl) => set({ pdfUrl }),
  reset: () => set(initialState),
}))
