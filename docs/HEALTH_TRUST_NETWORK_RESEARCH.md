# Crop and animal health trust network — research and product design

**Review draft · 26 November 2026.** This is a proposed production architecture, not a description of deployed features or a claim of regulatory approval. Duducare currently has separate crop and animal health demos, simulated local evidence, a crop case review queue, and a simulated agrovet directory. No live regulator, diagnostic laboratory, supplier inventory, product serialization, or licensing API is connected.

## 1. Product promise and decision boundaries

Help a farmer document a problem, understand plausible causes, obtain qualified review when needed, and find a **verified business** that can discuss a **currently authorized product or service**. These are distinct claims:

| Claim | Required evidence | Farmer-facing wording |
| --- | --- | --- |
| Possible cause | Observations matched to reviewed disease knowledge | “Possible match; needs confirmation” |
| Reviewed case | Named qualified reviewer, date, evidence, scope, decision | “Reviewed by [role]; see limitations” |
| Laboratory confirmed case | Traceable laboratory result and method | “Laboratory confirmed” only for that case |
| Registered product | Current regulator record and applicable crop/animal, target, formulation and label | “Registration checked on [date]” |
| Licensed shop | Current premises/business licence, matching address and category | “Licence checked on [date]” |
| Product pack authenticated | Manufacturer/authorized serialization verification for this exact pack | “Pack code verified by issuer”; never inferred from registration alone |
| Stock available | Recent shop inventory assertion, timestamp, ideally independent confirmation | “Shop-reported stock as of [time]” |

An administrator's approval is an **application review decision**, not government certification, laboratory diagnosis, product authorization or shop licensure. Never turn an AI finding or a case review into a public outbreak alert automatically.

## 2. Evidence and clinical workflow

### Crop health

1. Farmer confirms crop, exact affected plant part, location at an appropriate precision, date, onset/spread, and one or more photographs. Keep original farmer statements separate from AI observations.
2. Image analysis describes observable features and quality; it does not name a disease. Ask for a second view or a focused distinguishing observation when necessary.
3. Retrieve reviewed disease records for the crop and **exact selected plant part**. Compare supporting and contradicting features across plausible causes. Include nutrient, pest, weather, storage, and physical damage alternatives when relevant. A lexical overlap is retrieval only, not proof.
4. Return a bounded differential, uncertainty, evidence provenance, and a “cannot determine” state. Escalate suspected regulated/high-impact conditions for expert or laboratory review. Kenya's KEPHIS describes laboratory diagnostic services for plant pathogens, including tuber samples [1].
5. Reviewer records `possible`, `confirmed_by_expert`, `laboratory_confirmed`, `rejected`, or `inconclusive`, with identity, credentials, evidence, date and rationale. The original AI output remains immutable. Case approval and outbreak publication require separate decisions.

### Animal health

Use a separate veterinary workflow: species, age group, signs, duration, number affected, urgent warning signs, and optional veterinarian history. An animal photo cannot reliably establish many internal or infectious conditions. Urgent or potentially reportable patterns go directly to a veterinarian or relevant authority; no retail product is suggested before qualified assessment. WOAH describes laboratory confirmation and epidemiological investigation as part of effective animal disease surveillance [2], and diagnostic test standards for pathogen identification [3]. Preserve the current animal demo's conservative triage until locally reviewed protocols exist.

### Quality bar before farmer-facing disease claims

Create a local, independently labelled field set covering crops/species, plant parts, diseases and important lookalikes, healthy examples, photo quality, counties, devices, and seasons. Have qualified reviewers adjudicate disagreements and include laboratory truth where appropriate. Measure per-condition sensitivity, false positive rate, abstention, calibration, subgroup performance and referral timeliness; set release thresholds with the clinical/agronomic governance group rather than inventing a universal percentage. Run silent prospective evaluation, then monitored pilot and regular revalidation. Controlled-image accuracy is not enough: a 2026 cross-domain benchmark reports a substantial reliability gap when systems move to field photos [4].

## 3. Nearby agrovet and qualified expert network

### Registration and verification

An agrovet can create an account, provide business identity, operating address, contact, shop GPS with explicit consent, licence numbers and documents, product/service categories, and authorized staff. These are **self-reported** until an administrator checks them against an authoritative source and records the source, checked date, expiry and reviewer. Recheck on expiry and periodically; suspend on failed checks or complaints. For crop pest-control retail, PCPB publishes registered product and licensed-premises information [5, 6]. For veterinary medicines, VMD publishes registered medicines and authorized retailer/premises information [7, 8]. These public pages are **candidate sources**, not confirmed machine-readable APIs or permission to bulk-copy data. Confirm access, licensing, update cadence and identifier quality with each custodian before integration.

Proposed badges have precise meanings: `Identity checked`, `Premises licence checked`, `Veterinary medicines premises checked`, `Expert credentials checked` and `Verification expired`. Show **no badge** for self-reported or pending claims. Never use a generic “certified treatment” badge. An admin badge must identify who verified what, against which register, and when; it cannot imply regulator endorsement.

### Matching logic

Only offer a shop after the case has an appropriate review state and a verified, applicable product or qualified consultation path exists. For crop products, match current PCPB registration and label use to crop, target, formulation and locality. For animal products, match VMD authorization and relevant prescribing/dispensing restrictions; route prescription decisions to a veterinarian. Keep a non-chemical or referral option available. A shop's self-declared product list is **not** evidence of approval or stock.

Rank shops with current licence, applicable category, farmer-approved area, confirmed service, and distance. Distances should be computed from consented GPS or an explicitly selected area centroid; label estimated distances. Keep exact farmer coordinates private and short lived unless the farmer separately opts into a stored farm profile. Do not disclose farm GPS to a shop merely because it appears in search results. A shop may publish its business coordinates after consent and verification. Support manual location when GPS is declined. Consider travel time only with a verified routing source; do not imply straight-line distance is road distance.

## 4. Farmer product verification endpoint

**Proposed API, not implemented:** `POST /api/v1/products/verify` with product category (`crop` or `veterinary`), registration number or GTIN, optional batch, expiry and serial/code from a pack. A serial number alone is generally insufficient without its issuing scheme and product identity. GS1 identifies GTIN, lot, expiry and serial as distinct data fields [9]. A registration lookup establishes the product's authorization status, **not** that the physical pack is genuine.

Verification sequence: parse and validate identifiers; select PCPB or VMD by category; query an authorized current register or dated curated copy; verify product identity and applicable use; check expiry/recall where an authoritative feed exists; then, **only if the manufacturer or authorized issuer provides a verified serialization service**, check the pack instance, duplicate scans and revocation. The response must separate `registration_status` (`current`, `expired`, `not_found`, `unavailable`), `pack_authentication` (`verified_by_issuer`, `cannot_verify`, `suspect`, `unavailable`), `use_match` (`applicable`, `not_applicable`, `needs_label_review`) and `source_checked_at`. Do not return a single green “genuine” result for a database hit. Unknown or unavailable checks get “Cannot verify; consult the regulator/manufacturer,” with a report-suspect-product path. Rate-limit and minimize code retention to reduce code harvesting and privacy exposure.

No live PCPB/VMD serialization endpoint has been verified for this project. Procurement of issuer access, legal review and anti-counterfeit threat modelling are prerequisites. GS1's verification standard specifies GTIN, lot, serial and expiry as a product-instance identifier, but it does not itself authenticate arbitrary physical packs [10].

## 5. Suggested data and API contracts

Keep distinct records for `farmer_observation`, `ai_observation`, `disease_knowledge`, `case_review`, `lab_result`, `regulatory_product`, `product_label_use`, `agrovet_business`, `premises_verification`, `shop_listing`, `stock_assertion`, `product_scan`, and `audit_event`. Each evidence record needs source ID, source URL or document, publication/effective date, geographic scope, evidence status, licence/permissions, review date and expiry where applicable. Use stable identifiers and never overwrite historical review decisions; append new versions.

Suggested endpoints: `POST /api/v1/crop-health/cases`, `POST /api/v1/animal-health/cases`, `POST /api/v1/health-cases/{id}/reviews`, `POST /api/v1/agrovets/applications`, `GET /api/v1/agrovets/nearby`, `GET /api/v1/agrovets/{id}/verification`, `POST /api/v1/products/verify`, and `POST /api/v1/products/suspect-reports`. Administrative review and shop-licence changes require role-based authorization, independent audit records and revocation. Separate public profiles from private evidence; never expose exact farm coordinates, case images, serial scans or identity documents in directory responses.

## 6. Privacy, governance and rollout

Farmer GPS and farm location can reveal household or business information. Ask separate, understandable permission for one-time proximity search and stored farm location; permit manual area selection and deletion. Kenya's ODPC guidance says consent should specify purpose, data type, sharing and withdrawal, and the General Regulations address automated decision-making disclosures [11, 12]. Complete legal and security review before production; this document is not legal advice.

**Phase 1:** improve exact-part crop search and safe abstention, source review, and outcome logging. **Phase 2:** expert case review with credential checks and prospective field evaluation. **Phase 3:** verified shop directory and approximate proximity, without products or stock claims. **Phase 4:** regulator-confirmed product-use records, authorized issuer pack verification, and audited shop listings. **Phase 5:** monitored rollout with incident handling, revocation, model drift checks and farmer feedback. Keep crop and animal flows independently usable throughout.

### Questions for custodians and field partners

- PCPB and VMD: machine-readable registers, terms of use, current label/indication fields, licence and recall updates, and product identifier schemes?
- Manufacturers/distributors: authorized pack serialization interface, duplicate-scan semantics, latency, fraud response and data-sharing terms?
- KEPHIS, veterinary laboratories and county officers: referral thresholds, sample handling, turnaround, consent, reportable conditions and validation datasets?
- Farmers and agrovets: preferred location precision, trust in badges, language, connectivity, and whether a shop directory actually improves safe care?

## Sources checked

1. [KEPHIS laboratory services](https://www.kephis.go.ke/laboratory-services).
2. [WOAH Terrestrial Code: quality of Veterinary Services](https://www.woah.org/fileadmin/Home/eng/Health_standards/tahc/current/en_chapitre_vet_serv.htm).
3. [WOAH diagnostic test standards](https://www.woah.org/en/what-we-offer/quality-veterinary-products/developing-standards-for-diagnostic-tests/).
4. [Cross-domain plant disease reliability benchmark, Frontiers in Plant Science, 2026](https://www.frontiersin.org/journals/plant-science/articles/10.3389/fpls.2026.1826962/full).
5. [PCPB registered products](https://www.pcpb.go.ke/registered-products/).
6. [PCPB licensed business and premises](https://www.pcpb.go.ke/pcpb-licensed-business-and-premises/).
7. [VMD registered medicines](https://www.vmd.go.ke/all-registered-medicines).
8. [VMD authorized retailers](https://www.vmd.go.ke/index.php/retailers).
9. [GS1 Application Identifiers](https://ref.gs1.org/ai/?lang=en).
10. [GS1 product identifier verification standard](https://ref.gs1.org/standards/lightweight-verification-messaging/).
11. [Kenya ODPC guidance on consent](https://www.odpc.go.ke/wp-content/uploads/2024/02/ODPC-Guidance-Notes-on-Consent.pdf).
12. [Kenya Data Protection General Regulations](https://www.odpc.go.ke/wp-content/uploads/2024/03/THE-DATA-PROTECTION-GENERAL-REGULATIONS-2021-1.pdf).
