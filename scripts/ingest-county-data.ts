import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { createClient } from '@supabase/supabase-js'
import { parse } from 'csv-parse'
import * as fs from 'fs'
import * as path from 'path'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

interface PropertyRow {
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

const BATCH_SIZE = 500
const DATA_DIR = path.join(process.cwd(), 'scripts/data')

function parseNum(val: string | undefined): number | null {
  if (!val?.trim()) return null
  const n = parseFloat(val.replace(/[,\s]/g, ''))
  return isNaN(n) ? null : n
}

function parseIntVal(val: string | undefined): number | null {
  if (!val?.trim()) return null
  const n = parseInt(val.replace(/[,\s]/g, ''), 10)
  return isNaN(n) ? null : n
}

async function upsertBatch(rows: PropertyRow[]): Promise<void> {
  const { error } = await supabase
    .from('properties')
    .upsert(rows, { onConflict: 'county_account_number' })
  if (error) throw error
}

async function ingestCCAD(filePath: string): Promise<void> {
  console.log('\nIngesting Collin CAD (CCAD)...')
  let processed = 0, skipped = 0, errors = 0
  const batch: PropertyRow[] = []

  const parser = fs.createReadStream(filePath).pipe(
    parse({ columns: true, skip_empty_lines: true, relax_column_count: true })
  )

  for await (const row of parser) {
    // Single-family residential only
    if (row.propCategoryCode !== 'A') { skipped++; continue }

    const sqft = parseIntVal(row.imprvMainArea)
    const totalVal = parseNum(row.currValMarket)
    const zip = row.situsZip?.trim()
    const addr = row.situsConcatShort?.trim()
    if (!sqft || !totalVal || !zip || !addr) { skipped++; continue }

    batch.push({
      county_account_number: String(row.propID).trim(),
      county_name: 'collin',
      street_address: addr,
      zip_code: zip,
      owner_name: row.ownerName?.trim() || null,
      year_built: parseIntVal(row.imprvYearBuilt),
      total_living_area_sqft: sqft,
      current_proposed_value: totalVal,
      market_value_land: parseNum(row.currValLand),
      market_value_improvements: parseNum(row.currValImprv),
      homestead_capped_value: parseNum(row.currValAssessed),
    })

    if (batch.length >= BATCH_SIZE) {
      try {
        await upsertBatch([...batch])
        processed += batch.length
      } catch (e) {
        errors += batch.length
        console.error('  Batch error:', (e as Error).message)
      }
      batch.length = 0
      if (processed % 10000 === 0) console.log(`  ${processed.toLocaleString()} rows...`)
    }
  }

  if (batch.length) {
    try { await upsertBatch(batch); processed += batch.length }
    catch (e) { errors += batch.length; console.error('  Final batch error:', (e as Error).message) }
  }

  console.log(`  Done: ${processed.toLocaleString()} upserted, ${skipped.toLocaleString()} skipped, ${errors} errors`)
}

async function ingestTAD(filePath: string): Promise<void> {
  console.log('\nIngesting Tarrant Appraisal District (TAD)...')
  let processed = 0, skipped = 0, errors = 0
  const batch: PropertyRow[] = []

  const parser = fs.createReadStream(filePath).pipe(
    parse({ columns: true, skip_empty_lines: true, delimiter: '|', relax_column_count: true })
  )

  for await (const row of parser) {
    // 'RP' column = 'R' for real property data rows
    if (row['RP'] !== 'R') { skipped++; continue }
    // Residential only (A1 = single family, A2 = multi-family, etc.)
    const propClass = row.Property_Class?.trim() ?? ''
    if (!propClass.startsWith('A')) { skipped++; continue }

    const sqft = parseIntVal(row.Living_Area)
    const totalVal = parseNum(row.Total_Value)
    const addr = row.Situs_Address?.trim()
    const zip = row.Owner_Zip?.trim()
    if (!sqft || !totalVal || !addr || !zip) { skipped++; continue }

    batch.push({
      county_account_number: row.Account_Num.trim(),
      county_name: 'tarrant',
      street_address: addr,
      zip_code: zip,
      owner_name: row.Owner_Name?.trim() || null,
      year_built: parseIntVal(row.Year_Built),
      total_living_area_sqft: sqft,
      current_proposed_value: totalVal,
      market_value_land: parseNum(row.Land_Value),
      market_value_improvements: parseNum(row.Improvement_Value),
      // Appraised_Value is Total_Value after homestead cap is applied
      homestead_capped_value: parseNum(row.Appraised_Value),
    })

    if (batch.length >= BATCH_SIZE) {
      try {
        await upsertBatch([...batch])
        processed += batch.length
      } catch (e) {
        errors += batch.length
        console.error('  Batch error:', (e as Error).message)
      }
      batch.length = 0
      if (processed % 10000 === 0) console.log(`  ${processed.toLocaleString()} rows...`)
    }
  }

  if (batch.length) {
    try { await upsertBatch(batch); processed += batch.length }
    catch (e) { errors += batch.length; console.error('  Final batch error:', (e as Error).message) }
  }

  console.log(`  Done: ${processed.toLocaleString()} upserted, ${skipped.toLocaleString()} skipped, ${errors} errors`)
}

async function main() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
    process.exit(1)
  }

  console.log('FairValue — County Data Ingestion')
  console.log('==================================')

  const ccadFile = path.join(DATA_DIR, 'ccad_2025.csv')
  const tadFile = path.join(DATA_DIR, 'tad_2025.txt')

  if (!fs.existsSync(ccadFile)) { console.error(`Missing file: ${ccadFile}`); process.exit(1) }
  if (!fs.existsSync(tadFile)) { console.error(`Missing file: ${tadFile}`); process.exit(1) }

  await ingestCCAD(ccadFile)
  await ingestTAD(tadFile)

  console.log('\nIngestion complete.')
}

main().catch(err => { console.error(err); process.exit(1) })
