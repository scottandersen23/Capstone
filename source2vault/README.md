# Source2Vault

Source2Vault is a local healthcare data modeling assistant that converts source metadata into deterministic Data Vault 2.0 recommendations and exports a Snowflake-ready dbt project.

The V1 capstone workflow is:

```text
Load healthcare metadata CSV
→ classify columns
→ flag PHI/PII
→ infer business keys and relationships
→ generate hubs, links, and satellites
→ generate reporting dimensions, facts, and metrics
→ preview dbt files
→ export a dbt project zip
```

The application lives in `source2vault/` and runs as a desktop-like local web app.

## Run Locally

Prerequisites:

- Node.js 20 or newer
- npm 10 or newer

Start the app:

```bash
cd source2vault
npm install
npm run dev
```

Open [http://127.0.0.1:3000](http://127.0.0.1:3000).

The dev script binds to `127.0.0.1` and uses polling so it behaves well as a local-only capstone app.

## Sample Metadata Files

Three example CSV files are included:

- `source2vault/data/healthcare_metadata.csv`
  A healthcare metadata sample with PHI/PII fields such as MRN, SSN, DOB, email, phone, address, diagnosis code, and procedure code.

- `source2vault/data/healthcare_metadata_no_phi.csv`
  A comparison dataset using de-identified and aggregate healthcare operations metadata with no direct PHI/PII fields.

- `source2vault/data/member_visits_provider_companies.csv`
  A benefit-plan network dataset that ties members to visits, visits to providers, providers to care companies, and care companies to primary care or urgent care services.

All sample files use this structure:

```csv
source_system,schema_name,table_name,column_name,data_type,nullable,description,sample_values
```

## How The App Sections Work

### Header Actions

The header controls how data enters and leaves the app.

- `Upload CSV` loads any metadata CSV with the expected columns.
- `Load Healthcare Demo` resets the app to the built-in PHI/PII healthcare example.
- `Export dbt Zip` downloads the generated Snowflake/dbt project based on the currently loaded metadata and any user overrides.

Changing the loaded CSV recalculates every downstream section: source tables, classifications, relationships, vault objects, reporting marts, diagram, and dbt files.

### Summary Cards

The four cards at the top summarize the current model:

- `Business Keys`: columns classified as hub-driving business keys.
- `Relationships`: inferred source-table relationships that become link candidates.
- `Satellites`: generated history satellites using hashdiff tracking.
- `PHI / PII Fields`: fields matched by healthcare privacy rules or manually marked as PHI.

With `healthcare_metadata.csv`, the PHI/PII card should be populated because the file contains direct identifiers and clinical codes. With `healthcare_metadata_no_phi.csv`, the PHI/PII count should be much lower or zero unless a field is manually marked.

### Source Tables

The Source Tables panel groups rows from the loaded CSV by `table_name`.

Each table card shows:

- source system
- table name
- number of metadata columns

Selecting a table changes the Column Classification panel to show only that table's columns. The selected table card also expands and lists the exact column names that make up the column count, so users can quickly verify what was loaded from the CSV.

### Column Classification

Each column receives a deterministic semantic type and confidence score.

Possible classifications include:

- `BUSINESS_KEY`
- `FOREIGN_KEY`
- `TIMESTAMP`
- `AUDIT_FIELD`
- `STATUS`
- `MEASURE`
- `PHI`
- `DESCRIPTIVE_ATTRIBUTE`
- `EXCLUDED`

The confidence score is rule-based. For example:

- table-grain healthcare keys like `patient_id`, `claim_id`, and `payer_id` score highly as business keys
- reused keys on other tables score highly as foreign keys
- `ssn`, `mrn`, `email`, `phone`, `address`, diagnosis, and procedure fields are flagged as PHI/PII
- `amount`, `charge`, `paid`, and `allowed` are classified as measures
- `status` and `type` fields are classified as status/classification attributes

Each column also shows evidence explaining the rule that fired.

### PHI And Exclude Overrides

Each classified column has two controls:

- `PHI`: manually marks or unmarks the column as privacy-sensitive.
- `Exclude`: removes the column from generated vault satellites.

Overrides immediately update:

- PHI/PII count
- satellite grouping
- diagram
- dbt file preview
- exported dbt zip

This lets the demo show how governance decisions affect the final model.

### Recommended Data Vault Model

The central diagram displays the generated Data Vault 2.0 structure.

The app creates:

- `Hub` nodes from durable business keys
- `Link` nodes from inferred relationships
- `Satellite` nodes from descriptive, historical, measure, status, and PHI attributes

PHI-heavy attributes are placed into separate `*_phi` satellites when detected. This demonstrates a governance-aware design where sensitive fields can be isolated for access control.

### Recommended Hubs

The Hubs card lists generated hub tables.

Examples from the PHI healthcare file include:

- `hub_patient`
- `hub_encounter`
- `hub_provider`
- `hub_claim`
- `hub_payer`

The exact list depends on which loaded tables have business-key columns.

### Recommended Links

The Links card lists generated link tables.

Links are inferred when a source table reuses another table's business key. For example:

```text
claims.patient_id → patients.patient_id
encounters.provider_id → providers.provider_id
claim_lines.claim_id → claims.claim_id
```

If the loaded CSV has fewer repeated business keys, fewer links will be generated.

### Governance Strategy

This section explains the modeling decisions used by the app:

- PHI fields are isolated into `*_phi` satellites.
- Satellites use incremental hashdiff tracking.
- `record_source` and `load_datetime` are preserved.

This section is static guidance, but the generated model underneath it changes based on the loaded data and overrides.

### Reporting Layer

The Reporting Layer section turns the generated Data Vault model into downstream BI recommendations.

It shows:

- `Dimensions`: BI-friendly dimension tables generated from hubs and non-PHI satellites.
- `Facts`: event or transaction-style fact tables generated from visit, claim, batch, line, or other measurable source tables.
- `Metrics`: recommended measures such as counts, totals, averages, payment rates, and allowed rates.
- `PHI Excluded`: PHI/PII fields that are intentionally kept out of reporting marts by default.

The Reporting Layer updates whenever a new CSV is uploaded or a PHI/exclude override is changed.

Examples:

- `member_visits.member_visit_id` can become a visit count metric.
- `member_visits.allowed_amount` can become total and average allowed cost metrics.
- `member_visits.plan_paid_amount` can become plan cost per visit.
- PHI columns are excluded from dimensions and facts unless the model is changed later to explicitly allow them.

The `Preview Mart SQL` button jumps the generated dbt preview to the mart files so users can inspect the reporting SQL.

### Generated dbt Project

The dbt panel previews the generated files before export.

The exported zip contains a project like:

```text
source2vault_export/
  dbt_project.yml
  macros/
    source2vault_hash.sql
  models/
    sources/
      _sources.yml
    staging/
      stg_*.sql
    vault/
      hubs/
      links/
      satellites/
      vault.yml
    marts/
      dimensions/
        dim_*.sql
      facts/
        fact_*.sql
      marts.yml
  docs/
    reporting_layer.md
```

Generated SQL conventions:

- staging models use `{{ source() }}`
- vault models use `{{ ref() }}`
- hubs and links use hash keys
- satellites use hashdiffs
- satellite models are incremental
- mart models use vault models as inputs through `{{ ref() }}`
- dimensions select the latest non-PHI satellite records
- facts include hash-key foreign keys, measures, dates, and statuses where available
- SQL is generated for Snowflake

The preview changes whenever a different CSV is loaded or a column override is changed.

## How The Sample CSVs Compare

### `healthcare_metadata.csv`

Use this file to demonstrate privacy-aware Data Vault modeling.

Expected behavior:

- PHI/PII fields are flagged.
- `*_phi` satellites are generated.
- patient, encounter, claim, diagnosis, procedure, provider, department, and payer entities are modeled.
- exported dbt files include sensitive-field satellites.

### `healthcare_metadata_no_phi.csv`

Use this file to demonstrate the same modeling process on de-identified operational metadata.

Expected behavior:

- few or no PHI/PII fields are flagged.
- fewer `*_phi` satellites are generated.
- the model focuses on cohorts, facilities, departments, provider groups, encounter events, payers, claim batches, service categories, and aggregate claim batch lines.
- exported dbt files avoid direct patient identifiers and clinical code fields.

### `member_visits_provider_companies.csv`

Use this file to demonstrate an employer benefit-plan reporting scenario.

It models:

- employers sponsoring benefit plans
- benefit plans covering primary care and urgent care services
- members enrolled in benefit plans
- providers affiliated with care companies
- care companies categorized as `primary_care` or `urgent_care`
- member visits tied to members, providers, care companies, benefit plans, and services
- visit costs and outcomes for downstream reporting

Expected behavior:

- `member_visits` should become a strong fact candidate.
- `member_visit_id` supports total visit count.
- `visit_month` supports date-range or monthly reporting.
- `member_paid_amount`, `plan_paid_amount`, and `allowed_amount` support cost-per-visit reporting.
- providers, care companies, employers, plans, and benefit services should become useful reporting dimensions.

## Validation

From `source2vault/`:

```bash
npm run lint
npm run build
```

Both commands should complete successfully.

## Current V1 Limitations

- The app is local-only and single-user.
- Classification is deterministic and rule-based.
- There is no LLM assistance yet.
- There is no database persistence yet.
- CSV upload expects metadata, not raw patient or claims data.
- Generated dbt files are intended as a capstone-quality starting point, not a fully validated production dbt package.

## Scripts

Run from `source2vault/`:

| Command         | Purpose                         |
| --------------- | ------------------------------- |
| `npm run dev`   | Start the local development app |
| `npm run build` | Build the production version    |
| `npm run start` | Serve the production build      |
| `npm run lint`  | Run ESLint                      |
