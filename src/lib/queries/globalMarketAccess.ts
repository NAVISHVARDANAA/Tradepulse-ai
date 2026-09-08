import type { GlobalMarketAccessRecord } from '../../types/domain'
import { supabase } from '../supabase/client'

export async function getGlobalMarketAccessReference(): Promise<GlobalMarketAccessRecord[]> {
  const { data, error } = await supabase
    .from('global_venue_instrument_reference')
    .select('*')
    .order('mic_code')
    .order('display_symbol')
    .order('residency_country')
    .limit(500)

  if (error) throw error

  return (data ?? []).map((row) => ({
    venueId: Number(row.venue_id),
    micCode: row.mic_code,
    venueName: row.venue_name,
    venueCountryCode: row.venue_country_code,
    timezone: row.timezone,
    primaryCurrency: row.primary_currency,
    venueAvailability: row.venue_availability,
    calendarStatus: row.calendar_status,
    holidayCalendarStatus: row.holiday_calendar_status,
    settlementConvention: row.settlement_convention,
    listingId: Number(row.listing_id),
    listingKey: row.listing_key,
    canonicalInstrumentKey: row.canonical_instrument_key,
    displaySymbol: row.display_symbol,
    instrumentName: row.instrument_name,
    instrumentType: row.instrument_type,
    quoteCurrency: row.quote_currency,
    listingStatus: row.listing_status,
    identifierStatus: row.identifier_status,
    providerMappingStatus: row.provider_mapping_status,
    corporateActionStatus: row.corporate_action_status,
    residencyCountry: row.residency_country,
    accessStatus: row.access_status,
    reasonCode: row.reason_code,
    disclosureStatus: row.disclosure_status,
    legalReviewStatus: row.legal_review_status,
    referenceDisplayStatus: row.reference_display_status,
    priceDisplayStatus: row.price_display_status,
    corporateActionDisplayStatus: row.corporate_action_display_status,
    referenceLicenseStatus: row.reference_license_status,
    referenceAsOf: row.reference_as_of,
    liveMarketDataConnectivityEnabled: false,
    customerEntitlementAssignmentEnabled: false,
    automaticJurisdictionApprovalEnabled: false,
    orderPreviewEnabled: false,
    orderRoutingEnabled: false,
    brokerConnectivityEnabled: false,
    customerFundingEnabled: false,
    custodyEnabled: false,
    settlementEnabled: false,
  }))
}
