"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import JSZip from "jszip";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Database,
  Download,
  Eye,
  FileCode2,
  GitBranch,
  History,
  KeyRound,
  Layers3,
  Network,
  ShieldAlert,
  Sparkles,
  Table2,
  UploadCloud,
  Wand2,
} from "lucide-react";

type MetadataColumn = {
  sourceSystem: string;
  schemaName: string;
  tableName: string;
  columnName: string;
  dataType: string;
  nullable: boolean;
  description: string;
  sampleValues: string[];
};

type TableModel = {
  name: string;
  sourceSystem: string;
  schemaName: string;
  columns: MetadataColumn[];
};

type SemanticType =
  | "BUSINESS_KEY"
  | "FOREIGN_KEY"
  | "TIMESTAMP"
  | "AUDIT_FIELD"
  | "STATUS"
  | "MEASURE"
  | "PHI"
  | "DESCRIPTIVE_ATTRIBUTE"
  | "EXCLUDED";

type ClassifiedColumn = MetadataColumn & {
  semanticType: SemanticType;
  score: number;
  evidence: string[];
  isPhi: boolean;
  isExcluded: boolean;
};

type ClassifiedTable = Omit<TableModel, "columns"> & {
  columns: ClassifiedColumn[];
  businessKey?: ClassifiedColumn;
};

type Relationship = {
  fromTable: string;
  fromColumn: string;
  toTable: string;
  toColumn: string;
  confidence: number;
  evidence: string[];
};

type VaultObject = {
  id: string;
  name: string;
  type: "Hub" | "Link" | "Satellite";
  sourceTables: string[];
  columns: string[];
  evidence: string[];
};

type GeneratedFile = {
  path: string;
  content: string;
};

type ReportingDimension = {
  name: string;
  sourceHub: string;
  sourceSatellites: string[];
  attributes: string[];
  excludedPhiAttributes: string[];
  grain: string;
  evidence: string[];
};

type ReportingFact = {
  name: string;
  sourceLinks: string[];
  sourceSatellites: string[];
  foreignKeys: string[];
  measures: string[];
  dates: string[];
  grain: string;
  evidence: string[];
  sourceTable: string;
};

type ReportingMetric = {
  name: string;
  label: string;
  expression: string;
  sourceFact: string;
  measureColumn: string;
  aggregation: "sum" | "count" | "avg" | "count_distinct";
  evidence: string[];
};

type ReportingLayer = {
  dimensions: ReportingDimension[];
  facts: ReportingFact[];
  metrics: ReportingMetric[];
  excludedPhiFields: string[];
};

type OverrideState = Record<string, { isPhi?: boolean; isExcluded?: boolean }>;

const healthcareMetadata: MetadataColumn[] = [
  column(
    "ehr",
    "raw_healthcare",
    "patients",
    "patient_id",
    "varchar",
    false,
    "Internal patient business identifier",
    ["PAT-1001", "PAT-1002"],
  ),
  column(
    "ehr",
    "raw_healthcare",
    "patients",
    "patient_mrn",
    "varchar",
    false,
    "Medical record number",
    ["MRN-88391", "MRN-88392"],
  ),
  column(
    "ehr",
    "raw_healthcare",
    "patients",
    "ssn",
    "varchar",
    true,
    "Social Security number",
    ["***-**-1234"],
  ),
  column(
    "ehr",
    "raw_healthcare",
    "patients",
    "date_of_birth",
    "date",
    true,
    "Patient date of birth",
    ["1984-03-14"],
  ),
  column(
    "ehr",
    "raw_healthcare",
    "patients",
    "email",
    "varchar",
    true,
    "Patient email",
    ["patient@example.com"],
  ),
  column(
    "ehr",
    "raw_healthcare",
    "patients",
    "phone",
    "varchar",
    true,
    "Patient phone number",
    ["555-0100"],
  ),
  column(
    "ehr",
    "raw_healthcare",
    "patients",
    "address_line_1",
    "varchar",
    true,
    "Patient street address",
    ["100 Main St"],
  ),
  column(
    "ehr",
    "raw_healthcare",
    "patients",
    "city",
    "varchar",
    true,
    "Patient city",
    ["Chicago"],
  ),
  column(
    "ehr",
    "raw_healthcare",
    "patients",
    "state",
    "varchar",
    true,
    "Patient state",
    ["IL"],
  ),
  column(
    "ehr",
    "raw_healthcare",
    "patients",
    "zip_code",
    "varchar",
    true,
    "Patient ZIP code",
    ["60601"],
  ),
  column(
    "ehr",
    "raw_healthcare",
    "patients",
    "patient_status",
    "varchar",
    true,
    "Active or inactive patient status",
    ["active", "inactive"],
  ),
  column(
    "ehr",
    "raw_healthcare",
    "patients",
    "updated_at",
    "timestamp",
    false,
    "Last source update timestamp",
    ["2026-01-04T10:31:00Z"],
  ),
  column(
    "ehr",
    "raw_healthcare",
    "encounters",
    "encounter_id",
    "varchar",
    false,
    "Encounter visit identifier",
    ["ENC-7001"],
  ),
  column(
    "ehr",
    "raw_healthcare",
    "encounters",
    "patient_id",
    "varchar",
    false,
    "Patient attached to the encounter",
    ["PAT-1001"],
  ),
  column(
    "ehr",
    "raw_healthcare",
    "encounters",
    "provider_id",
    "varchar",
    false,
    "Rendering provider",
    ["PRV-300"],
  ),
  column(
    "ehr",
    "raw_healthcare",
    "encounters",
    "department_id",
    "varchar",
    true,
    "Clinical department",
    ["DEP-CARD"],
  ),
  column(
    "ehr",
    "raw_healthcare",
    "encounters",
    "encounter_type",
    "varchar",
    true,
    "Visit type",
    ["office_visit"],
  ),
  column(
    "ehr",
    "raw_healthcare",
    "encounters",
    "encounter_status",
    "varchar",
    true,
    "Encounter lifecycle status",
    ["closed"],
  ),
  column(
    "ehr",
    "raw_healthcare",
    "encounters",
    "admit_datetime",
    "timestamp",
    true,
    "Admission timestamp",
    ["2026-01-02T08:00:00Z"],
  ),
  column(
    "ehr",
    "raw_healthcare",
    "encounters",
    "discharge_datetime",
    "timestamp",
    true,
    "Discharge timestamp",
    ["2026-01-02T12:30:00Z"],
  ),
  column(
    "ehr",
    "raw_healthcare",
    "providers",
    "provider_id",
    "varchar",
    false,
    "Provider business identifier",
    ["PRV-300"],
  ),
  column(
    "ehr",
    "raw_healthcare",
    "providers",
    "department_id",
    "varchar",
    true,
    "Provider department",
    ["DEP-CARD"],
  ),
  column(
    "ehr",
    "raw_healthcare",
    "providers",
    "npi",
    "varchar",
    true,
    "National Provider Identifier",
    ["1234567890"],
  ),
  column(
    "ehr",
    "raw_healthcare",
    "providers",
    "provider_name",
    "varchar",
    true,
    "Provider full name",
    ["Dr. Avery Patel"],
  ),
  column(
    "ehr",
    "raw_healthcare",
    "providers",
    "specialty",
    "varchar",
    true,
    "Provider specialty",
    ["Cardiology"],
  ),
  column(
    "ehr",
    "raw_healthcare",
    "departments",
    "department_id",
    "varchar",
    false,
    "Department business identifier",
    ["DEP-CARD"],
  ),
  column(
    "ehr",
    "raw_healthcare",
    "departments",
    "department_name",
    "varchar",
    true,
    "Department display name",
    ["Cardiology"],
  ),
  column(
    "ehr",
    "raw_healthcare",
    "departments",
    "facility_name",
    "varchar",
    true,
    "Facility name",
    ["North Campus"],
  ),
  column(
    "claims",
    "raw_healthcare",
    "claims",
    "claim_id",
    "varchar",
    false,
    "Claim business identifier",
    ["CLM-9001"],
  ),
  column(
    "claims",
    "raw_healthcare",
    "claims",
    "patient_id",
    "varchar",
    false,
    "Claim patient",
    ["PAT-1001"],
  ),
  column(
    "claims",
    "raw_healthcare",
    "claims",
    "encounter_id",
    "varchar",
    true,
    "Related encounter",
    ["ENC-7001"],
  ),
  column(
    "claims",
    "raw_healthcare",
    "claims",
    "payer_id",
    "varchar",
    false,
    "Responsible payer",
    ["PAY-22"],
  ),
  column(
    "claims",
    "raw_healthcare",
    "claims",
    "claim_status",
    "varchar",
    true,
    "Claim lifecycle status",
    ["submitted", "paid"],
  ),
  column(
    "claims",
    "raw_healthcare",
    "claims",
    "total_charge_amount",
    "number",
    true,
    "Total billed charge",
    ["500.00"],
  ),
  column(
    "claims",
    "raw_healthcare",
    "claims",
    "allowed_amount",
    "number",
    true,
    "Allowed amount",
    ["370.00"],
  ),
  column(
    "claims",
    "raw_healthcare",
    "claims",
    "paid_amount",
    "number",
    true,
    "Paid amount",
    ["310.00"],
  ),
  column(
    "claims",
    "raw_healthcare",
    "claim_lines",
    "claim_line_id",
    "varchar",
    false,
    "Claim line business identifier",
    ["CLM-9001-1"],
  ),
  column(
    "claims",
    "raw_healthcare",
    "claim_lines",
    "claim_id",
    "varchar",
    false,
    "Parent claim",
    ["CLM-9001"],
  ),
  column(
    "claims",
    "raw_healthcare",
    "claim_lines",
    "diagnosis_code",
    "varchar",
    true,
    "ICD diagnosis code",
    ["I10"],
  ),
  column(
    "claims",
    "raw_healthcare",
    "claim_lines",
    "procedure_code",
    "varchar",
    true,
    "CPT procedure code",
    ["99213"],
  ),
  column(
    "claims",
    "raw_healthcare",
    "claim_lines",
    "line_charge_amount",
    "number",
    true,
    "Line charge amount",
    ["250.00"],
  ),
  column(
    "claims",
    "raw_healthcare",
    "diagnoses",
    "diagnosis_code",
    "varchar",
    false,
    "ICD diagnosis code",
    ["I10"],
  ),
  column(
    "claims",
    "raw_healthcare",
    "diagnoses",
    "diagnosis_description",
    "varchar",
    true,
    "Diagnosis description",
    ["Essential hypertension"],
  ),
  column(
    "claims",
    "raw_healthcare",
    "procedures",
    "procedure_code",
    "varchar",
    false,
    "CPT procedure code",
    ["99213"],
  ),
  column(
    "claims",
    "raw_healthcare",
    "procedures",
    "procedure_description",
    "varchar",
    true,
    "Procedure description",
    ["Office outpatient visit"],
  ),
  column(
    "claims",
    "raw_healthcare",
    "payers",
    "payer_id",
    "varchar",
    false,
    "Payer business identifier",
    ["PAY-22"],
  ),
  column(
    "claims",
    "raw_healthcare",
    "payers",
    "payer_name",
    "varchar",
    true,
    "Payer name",
    ["Acme Health Plan"],
  ),
  column(
    "claims",
    "raw_healthcare",
    "payers",
    "payer_type",
    "varchar",
    true,
    "Commercial, Medicare, Medicaid, or self-pay",
    ["commercial"],
  ),
];

const phiTerms = [
  "ssn",
  "mrn",
  "medical_record",
  "date_of_birth",
  "dob",
  "email",
  "phone",
  "address",
  "zip",
  "member_id",
  "subscriber",
  "diagnosis",
  "procedure",
];

const domainKeys = new Set([
  "patient_id",
  "patient_mrn",
  "encounter_id",
  "provider_id",
  "department_id",
  "claim_id",
  "claim_line_id",
  "payer_id",
  "diagnosis_code",
  "procedure_code",
]);

function column(
  sourceSystem: string,
  schemaName: string,
  tableName: string,
  columnName: string,
  dataType: string,
  nullable: boolean,
  description: string,
  sampleValues: string[],
): MetadataColumn {
  return {
    sourceSystem,
    schemaName,
    tableName,
    columnName,
    dataType,
    nullable,
    description,
    sampleValues,
  };
}

function normalize(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

function singularTableName(tableName: string) {
  const map: Record<string, string> = {
    patients: "patient",
    encounters: "encounter",
    providers: "provider",
    departments: "department",
    claims: "claim",
    claim_lines: "claim_line",
    diagnoses: "diagnosis",
    procedures: "procedure",
    payers: "payer",
  };
  return map[tableName] ?? tableName.replace(/s$/, "");
}

function titleCase(value: string) {
  return value
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function groupTables(metadata: MetadataColumn[]): TableModel[] {
  const tables = new Map<string, TableModel>();

  for (const item of metadata) {
    const table = tables.get(item.tableName);
    if (table) {
      table.columns.push(item);
    } else {
      tables.set(item.tableName, {
        name: item.tableName,
        sourceSystem: item.sourceSystem,
        schemaName: item.schemaName,
        columns: [item],
      });
    }
  }

  return Array.from(tables.values());
}

function classifyTables(
  tables: TableModel[],
  overrides: OverrideState,
): ClassifiedTable[] {
  const columnNamesByTable = new Map(
    tables.map((table) => [
      table.name,
      new Set(table.columns.map((col) => col.columnName)),
    ]),
  );

  const classified = tables.map<ClassifiedTable>((table) => {
    const singular = singularTableName(table.name);
    const columns = table.columns.map<ClassifiedColumn>((col) => {
      const columnName = normalize(col.columnName);
      const override = overrides[`${table.name}.${col.columnName}`] ?? {};
      const evidence: string[] = [];
      let semanticType: SemanticType = "DESCRIPTIVE_ATTRIBUTE";
      let score = 64;

      const matchesPhi = phiTerms.some((term) => columnName.includes(term));
      const isKnownBusinessKey =
        domainKeys.has(columnName) &&
        (columnName === `${singular}_id` ||
          columnName === `${singular}_code` ||
          (table.name === "patients" && columnName === "patient_mrn"));
      const referencedElsewhere = Array.from(columnNamesByTable.entries()).some(
        ([otherTable, names]) =>
          otherTable !== table.name && names.has(col.columnName),
      );

      if (
        columnName.includes("updated_at") ||
        columnName.includes("created_at") ||
        columnName.includes("load_datetime")
      ) {
        semanticType = "AUDIT_FIELD";
        score = 91;
        evidence.push("Name matches common audit timestamp pattern.");
      } else if (
        columnName.includes("datetime") ||
        columnName.endsWith("_date") ||
        col.dataType.toLowerCase().includes("timestamp")
      ) {
        semanticType = "TIMESTAMP";
        score = 84;
        evidence.push("Date or timestamp type supports historical context.");
      }

      if (columnName.includes("status") || columnName.includes("type")) {
        semanticType = "STATUS";
        score = 82;
        evidence.push(
          "Low-cardinality naming pattern suggests lifecycle or classification attribute.",
        );
      }

      if (
        columnName.includes("amount") ||
        columnName.includes("charge") ||
        columnName.includes("paid") ||
        columnName.includes("allowed")
      ) {
        semanticType = "MEASURE";
        score = 88;
        evidence.push(
          "Financial amount naming pattern suggests measurable claim value.",
        );
      }

      if (
        isKnownBusinessKey ||
        columnName === `${singular}_id` ||
        columnName === `${singular}_code`
      ) {
        semanticType = "BUSINESS_KEY";
        score = columnName.includes("mrn") ? 89 : 96;
        evidence.push(
          "Column matches the table grain and healthcare domain key naming.",
        );
      } else if (domainKeys.has(columnName) && referencedElsewhere) {
        semanticType = "FOREIGN_KEY";
        score = 92;
        evidence.push(
          "Column reuses a known business key from another source table.",
        );
      }

      if (matchesPhi || override.isPhi) {
        semanticType =
          semanticType === "BUSINESS_KEY" || semanticType === "FOREIGN_KEY"
            ? semanticType
            : "PHI";
        score = Math.max(score, 93);
        evidence.push(
          "Healthcare PHI/PII rule matched this column name or description.",
        );
      }

      if (
        !col.nullable &&
        (semanticType === "BUSINESS_KEY" || semanticType === "FOREIGN_KEY")
      ) {
        evidence.push("Column is non-null in the source metadata.");
      }

      if (override.isExcluded) {
        semanticType = "EXCLUDED";
        evidence.push(
          "User override excluded this column from generated vault objects.",
        );
      }

      if (evidence.length === 0) {
        evidence.push(
          "Defaulted to descriptive satellite attribute for Data Vault history tracking.",
        );
      }

      return {
        ...col,
        semanticType,
        score,
        evidence,
        isPhi: Boolean(matchesPhi || override.isPhi),
        isExcluded: Boolean(override.isExcluded),
      };
    });

    const businessKey = columns
      .filter((col) => col.semanticType === "BUSINESS_KEY")
      .sort((a, b) => b.score - a.score)[0];

    return { ...table, columns, businessKey };
  });

  return classified;
}

function inferRelationships(tables: ClassifiedTable[]): Relationship[] {
  const businessKeys = tables.flatMap((table) =>
    table.businessKey
      ? [
          {
            tableName: table.name,
            keyColumn: table.businessKey.columnName,
          },
        ]
      : [],
  );

  return tables.flatMap((table) =>
    table.columns
      .filter((column) => column.semanticType === "FOREIGN_KEY")
      .flatMap((column) =>
        businessKeys
          .filter(
            (key) =>
              key.tableName !== table.name &&
              key.keyColumn === column.columnName,
          )
          .map((key) => ({
            fromTable: table.name,
            fromColumn: column.columnName,
            toTable: key.tableName,
            toColumn: key.keyColumn,
            confidence: 94,
            evidence: [
              "Foreign key column name matches a hub business key.",
              `${key.tableName}.${key.keyColumn} is classified as a business key.`,
              `${table.name}.${column.columnName} appears on a related transaction/context table.`,
            ],
          })),
      ),
  );
}

function buildVaultModel(
  tables: ClassifiedTable[],
  relationships: Relationship[],
) {
  const hubs: VaultObject[] = tables
    .filter((table) => table.businessKey)
    .map((table) => {
      const entity = singularTableName(table.name);
      return {
        id: `hub_${entity}`,
        name: `hub_${entity}`,
        type: "Hub",
        sourceTables: [table.name],
        columns: [
          `${entity}_hk`,
          table.businessKey?.columnName ?? "",
          "load_datetime",
          "record_source",
        ].filter(Boolean),
        evidence: [
          `${table.businessKey?.columnName} is the highest-scoring business key for ${table.name}.`,
        ],
      };
    });

  const links: VaultObject[] = relationships.map((relationship) => {
    const fromEntity = singularTableName(relationship.fromTable);
    const toEntity = singularTableName(relationship.toTable);
    const name = `link_${toEntity}_${fromEntity}`;

    return {
      id: name,
      name,
      type: "Link",
      sourceTables: [relationship.fromTable, relationship.toTable],
      columns: [
        `${toEntity}_${fromEntity}_hk`,
        `${toEntity}_hk`,
        `${fromEntity}_hk`,
        "load_datetime",
        "record_source",
      ],
      evidence: relationship.evidence,
    };
  });

  const satellites: VaultObject[] = tables.flatMap((table) => {
    if (!table.businessKey) {
      return [];
    }

    const entity = singularTableName(table.name);
    const descriptiveColumns = table.columns.filter(
      (column) =>
        !column.isExcluded &&
        column.semanticType !== "BUSINESS_KEY" &&
        column.semanticType !== "FOREIGN_KEY" &&
        column.semanticType !== "AUDIT_FIELD",
    );
    const phiColumns = descriptiveColumns.filter((column) => column.isPhi);
    const nonPhiColumns = descriptiveColumns.filter((column) => !column.isPhi);
    const sats: VaultObject[] = [];

    if (nonPhiColumns.length > 0) {
      sats.push({
        id: `sat_${entity}_details`,
        name: `sat_${entity}_details`,
        type: "Satellite",
        sourceTables: [table.name],
        columns: [
          `${entity}_hk`,
          ...nonPhiColumns.map((column) => column.columnName),
          "hashdiff",
          "load_datetime",
          "record_source",
        ],
        evidence: [
          "Non-key descriptive attributes are grouped into a standard history satellite.",
        ],
      });
    }

    if (phiColumns.length > 0) {
      sats.push({
        id: `sat_${entity}_phi`,
        name: `sat_${entity}_phi`,
        type: "Satellite",
        sourceTables: [table.name],
        columns: [
          `${entity}_hk`,
          ...phiColumns.map((column) => column.columnName),
          "hashdiff",
          "load_datetime",
          "record_source",
        ],
        evidence: [
          "PHI/PII attributes are isolated into a separate satellite for governance and access control.",
        ],
      });
    }

    return sats;
  });

  return { hubs, links, satellites };
}

function buildReportingLayer(
  tables: ClassifiedTable[],
  relationships: Relationship[],
  vault: ReturnType<typeof buildVaultModel>,
): ReportingLayer {
  const excludedPhiFields = tables.flatMap((table) =>
    table.columns
      .filter((column) => column.isPhi && !column.isExcluded)
      .map((column) => `${table.name}.${column.columnName}`),
  );

  const dimensions: ReportingDimension[] = vault.hubs.flatMap((hub) => {
    const table = tables.find((item) => item.name === hub.sourceTables[0]);
    if (!table) return [];

    const entity = singularTableName(table.name);
    const attributes = table.columns
      .filter(
        (column) =>
          !column.isExcluded &&
          !column.isPhi &&
          column.semanticType !== "BUSINESS_KEY" &&
          column.semanticType !== "FOREIGN_KEY" &&
          column.semanticType !== "AUDIT_FIELD" &&
          column.semanticType !== "MEASURE",
      )
      .map((column) => column.columnName);
    const excludedPhiAttributes = table.columns
      .filter((column) => column.isPhi && !column.isExcluded)
      .map((column) => column.columnName);
    const sourceSatellites = vault.satellites
      .filter(
        (satellite) =>
          satellite.sourceTables[0] === table.name &&
          !satellite.name.endsWith("_phi"),
      )
      .map((satellite) => satellite.name);

    if (attributes.length === 0 && excludedPhiAttributes.length === 0) {
      return [];
    }

    return [
      {
        name: `dim_${entity}`,
        sourceHub: hub.name,
        sourceSatellites,
        attributes,
        excludedPhiAttributes,
        grain: `One row per ${entity} business key.`,
        evidence: [
          `${hub.name} provides the durable ${entity} key.`,
          "Non-PHI descriptive attributes are safe defaults for BI dimensions.",
          excludedPhiAttributes.length > 0
            ? "PHI/PII attributes were excluded from the reporting dimension."
            : "No PHI/PII attributes were detected for this dimension.",
        ],
      },
    ];
  });

  const relationshipByFromTable = relationships.reduce<
    Record<string, Relationship[]>
  >((accumulator, relationship) => {
    accumulator[relationship.fromTable] = [
      ...(accumulator[relationship.fromTable] ?? []),
      relationship,
    ];
    return accumulator;
  }, {});

  const facts: ReportingFact[] = tables.flatMap((table) => {
    if (!table.businessKey) return [];

    const entity = singularTableName(table.name);
    const measures = table.columns
      .filter(
        (column) => !column.isExcluded && column.semanticType === "MEASURE",
      )
      .map((column) => column.columnName);
    const dates = table.columns
      .filter(
        (column) =>
          !column.isExcluded &&
          (column.semanticType === "TIMESTAMP" ||
            column.dataType.toLowerCase() === "date"),
      )
      .map((column) => column.columnName);
    const relationshipsFromTable = relationshipByFromTable[table.name] ?? [];
    const isEventLike =
      measures.length > 0 ||
      dates.length > 0 ||
      relationshipsFromTable.length > 1 ||
      ["encounter", "claim", "line", "event", "batch"].some((term) =>
        table.name.includes(term),
      );

    if (!isEventLike) return [];

    const sourceSatellites = vault.satellites
      .filter(
        (satellite) =>
          satellite.sourceTables[0] === table.name &&
          !satellite.name.endsWith("_phi"),
      )
      .map((satellite) => satellite.name);
    const sourceLinks = vault.links
      .filter((link) => link.sourceTables.includes(table.name))
      .map((link) => link.name);
    const foreignKeys = [
      `${entity}_hk`,
      ...relationshipsFromTable.map(
        (relationship) => `${singularTableName(relationship.toTable)}_hk`,
      ),
    ];

    return [
      {
        name: `fact_${entity}`,
        sourceLinks,
        sourceSatellites,
        foreignKeys,
        measures,
        dates,
        grain: `One row per ${entity} business event.`,
        evidence: [
          measures.length > 0
            ? "Measure columns make this source useful as a BI fact."
            : "Event-like relationships make this source useful as a BI fact.",
          "Fact model uses vault links for dimensional foreign keys.",
          "PHI/PII satellites are not joined into reporting facts by default.",
        ],
        sourceTable: table.name,
      },
    ];
  });

  const metrics: ReportingMetric[] = facts.flatMap((fact) => {
    const countMetric: ReportingMetric = {
      name: `${fact.name.replace(/^fact_/, "")}_count`,
      label: `${titleCase(fact.name.replace(/^fact_/, ""))} Count`,
      expression: `count(${fact.foreignKeys[0]})`,
      sourceFact: fact.name,
      measureColumn: fact.foreignKeys[0],
      aggregation: "count",
      evidence: [
        "Every fact can support a count metric at its declared grain.",
      ],
    };
    const measureMetrics = fact.measures.flatMap<ReportingMetric>((measure) => [
      {
        name: `total_${measure}`,
        label: `Total ${titleCase(measure)}`,
        expression: `sum(${measure})`,
        sourceFact: fact.name,
        measureColumn: measure,
        aggregation: "sum",
        evidence: ["Financial and quantity measures default to sum metrics."],
      },
      {
        name: `average_${measure}`,
        label: `Average ${titleCase(measure)}`,
        expression: `avg(${measure})`,
        sourceFact: fact.name,
        measureColumn: measure,
        aggregation: "avg",
        evidence: [
          "Average metric supports downstream rate and benchmark views.",
        ],
      },
    ]);

    const chargeMeasure = fact.measures.find((measure) =>
      measure.includes("charge"),
    );
    const paidMeasure = fact.measures.find((measure) =>
      measure.includes("paid"),
    );
    const allowedMeasure = fact.measures.find((measure) =>
      measure.includes("allowed"),
    );
    const rateMetrics: ReportingMetric[] = [];

    if (chargeMeasure && paidMeasure) {
      rateMetrics.push({
        name: `${fact.name.replace(/^fact_/, "")}_payment_rate`,
        label: `${titleCase(fact.name.replace(/^fact_/, ""))} Payment Rate`,
        expression: `sum(${paidMeasure}) / nullif(sum(${chargeMeasure}), 0)`,
        sourceFact: fact.name,
        measureColumn: paidMeasure,
        aggregation: "sum",
        evidence: [
          "Paid and charge measures support a downstream payment-rate KPI.",
        ],
      });
    }

    if (chargeMeasure && allowedMeasure) {
      rateMetrics.push({
        name: `${fact.name.replace(/^fact_/, "")}_allowed_rate`,
        label: `${titleCase(fact.name.replace(/^fact_/, ""))} Allowed Rate`,
        expression: `sum(${allowedMeasure}) / nullif(sum(${chargeMeasure}), 0)`,
        sourceFact: fact.name,
        measureColumn: allowedMeasure,
        aggregation: "sum",
        evidence: [
          "Allowed and charge measures support a downstream allowed-rate KPI.",
        ],
      });
    }

    return [countMetric, ...measureMetrics, ...rateMetrics];
  });

  return {
    dimensions,
    facts,
    metrics,
    excludedPhiFields,
  };
}

function csvEscape(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}

function metadataToCsv(metadata: MetadataColumn[]) {
  const header = [
    "source_system",
    "schema_name",
    "table_name",
    "column_name",
    "data_type",
    "nullable",
    "description",
    "sample_values",
  ];
  const rows = metadata.map((item) => [
    item.sourceSystem,
    item.schemaName,
    item.tableName,
    item.columnName,
    item.dataType,
    String(item.nullable),
    item.description,
    item.sampleValues.join("|"),
  ]);

  return [header, ...rows]
    .map((row) => row.map(csvEscape).join(","))
    .join("\n");
}

function parseCsvLine(line: string) {
  const values: string[] = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"' && quoted && next === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      values.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  values.push(current);
  return values;
}

function parseMetadataCsv(text: string): MetadataColumn[] {
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
  const header = parseCsvLine(lines[0] ?? "").map((item) => normalize(item));

  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const row = Object.fromEntries(
      header.map((key, index) => [key, values[index] ?? ""]),
    );

    return column(
      row.source_system || "csv",
      row.schema_name || "raw_healthcare",
      normalize(row.table_name),
      normalize(row.column_name),
      row.data_type || "varchar",
      !["false", "no", "0"].includes((row.nullable ?? "").toLowerCase()),
      row.description ?? "",
      (row.sample_values ?? "").split("|").filter(Boolean),
    );
  });
}

function snowflakeType(type: string) {
  const normalized = type.toLowerCase();
  if (normalized.includes("timestamp") || normalized.includes("datetime"))
    return "timestamp_ntz";
  if (normalized === "date") return "date";
  if (
    normalized.includes("number") ||
    normalized.includes("decimal") ||
    normalized.includes("amount")
  )
    return "number";
  return "varchar";
}

function latestSatelliteCte(name: string, alias: string, hashKey: string) {
  return `${alias} as (\n    select * from {{ ref('${name}') }}\n    qualify row_number() over (\n        partition by ${hashKey}\n        order by load_datetime desc\n    ) = 1\n)`;
}

function generateDimensionSql(
  dimension: ReportingDimension,
  tables: ClassifiedTable[],
  vault: ReturnType<typeof buildVaultModel>,
) {
  const hub = vault.hubs.find((item) => item.name === dimension.sourceHub);
  const table = tables.find((item) => item.name === hub?.sourceTables[0]);
  if (!hub || !table?.businessKey) return "";

  const entity = singularTableName(table.name);
  const hashKey = `${entity}_hk`;
  const satelliteCtes = dimension.sourceSatellites.map((satellite, index) =>
    latestSatelliteCte(satellite, `sat_${index}`, hashKey),
  );
  const selectedAttributes = dimension.attributes.map((attribute, index) => {
    const satelliteIndex = dimension.sourceSatellites.findIndex((satellite) =>
      vault.satellites
        .find((item) => item.name === satellite)
        ?.columns.includes(attribute),
    );
    const alias =
      satelliteIndex >= 0 ? `sat_${satelliteIndex}` : `sat_${index}`;
    return `        ${alias}.${attribute}`;
  });
  const joins = dimension.sourceSatellites
    .map(
      (_satellite, index) =>
        `left join sat_${index}\n        on hub.${hashKey} = sat_${index}.${hashKey}`,
    )
    .join("\n");

  return `with hub as (\n    select * from {{ ref('${dimension.sourceHub}') }}\n)${satelliteCtes.length > 0 ? `,\n\n${satelliteCtes.join(",\n\n")}` : ""},\n\nfinal as (\n    select\n        hub.${hashKey},\n        hub.${table.businessKey.columnName}${selectedAttributes.length > 0 ? `,\n${selectedAttributes.join(",\n")}` : ""}\n    from hub\n    ${joins || ""}\n)\n\nselect * from final\n`;
}

function generateFactSql(
  fact: ReportingFact,
  tables: ClassifiedTable[],
  vault: ReturnType<typeof buildVaultModel>,
) {
  const table = tables.find((item) => item.name === fact.sourceTable);
  if (!table?.businessKey) return "";

  const entity = singularTableName(table.name);
  const hashKey = `${entity}_hk`;
  const hubName = `hub_${entity}`;
  const selectedSatellites = fact.sourceSatellites;
  const satelliteCtes = selectedSatellites.map((satellite, index) =>
    latestSatelliteCte(satellite, `sat_${index}`, hashKey),
  );
  const sourceLinks = fact.sourceLinks
    .map((linkName, index) => {
      const link = vault.links.find((item) => item.name === linkName);
      return link ? { ...link, alias: `link_${index}` } : null;
    })
    .filter((link): link is VaultObject & { alias: string } => Boolean(link));
  const linkCtes = sourceLinks.map(
    (link) =>
      `${link.alias} as (\n    select * from {{ ref('${link.name}') }}\n)`,
  );
  const satAttributes = table.columns
    .filter(
      (column) =>
        !column.isExcluded &&
        !column.isPhi &&
        ["MEASURE", "TIMESTAMP", "STATUS"].includes(column.semanticType),
    )
    .map((column) => column.columnName);
  const satSelects = satAttributes.map((attribute) => {
    const satelliteIndex = selectedSatellites.findIndex((satellite) =>
      vault.satellites
        .find((item) => item.name === satellite)
        ?.columns.includes(attribute),
    );
    const alias = satelliteIndex >= 0 ? `sat_${satelliteIndex}` : "sat_0";
    return `        ${alias}.${attribute}`;
  });
  const linkSelects = sourceLinks.flatMap((link) =>
    link.columns
      .filter((column) => column.endsWith("_hk") && column !== hashKey)
      .map((column) => `        ${link.alias}.${column}`),
  );
  const satelliteJoins = selectedSatellites
    .map(
      (_satellite, index) =>
        `left join sat_${index}\n        on hub.${hashKey} = sat_${index}.${hashKey}`,
    )
    .join("\n    ");
  const linkJoins = sourceLinks
    .map(
      (link) =>
        `left join ${link.alias}\n        on hub.${hashKey} = ${link.alias}.${hashKey}`,
    )
    .join("\n    ");
  const selectLines = [
    `        hub.${hashKey}`,
    `        hub.${table.businessKey.columnName}`,
    ...Array.from(new Set(linkSelects)),
    ...satSelects,
  ];

  return `with hub as (\n    select * from {{ ref('${hubName}') }}\n)${satelliteCtes.length > 0 ? `,\n\n${satelliteCtes.join(",\n\n")}` : ""}${linkCtes.length > 0 ? `,\n\n${linkCtes.join(",\n\n")}` : ""},\n\nfinal as (\n    select\n${selectLines.join(",\n")}\n    from hub\n    ${[satelliteJoins, linkJoins].filter(Boolean).join("\n    ")}\n)\n\nselect * from final\n`;
}

function generateDbtFiles(
  tables: ClassifiedTable[],
  relationships: Relationship[],
  vault: ReturnType<typeof buildVaultModel>,
  reportingLayer: ReportingLayer,
): GeneratedFile[] {
  const files: GeneratedFile[] = [
    {
      path: "source2vault_export/dbt_project.yml",
      content: `name: source2vault_healthcare\nversion: 1.0.0\nconfig-version: 2\nprofile: source2vault_healthcare\n\nmodel-paths: [\"models\"]\nmacro-paths: [\"macros\"]\n\nmodels:\n  source2vault_healthcare:\n    staging:\n      +schema: staging\n      +materialized: view\n    vault:\n      +schema: vault\n    marts:\n      +schema: marts\n      +materialized: view\n`,
    },
    {
      path: "source2vault_export/macros/source2vault_hash.sql",
      content: `{% macro source2vault_hash(columns) %}\n    md5(\n        {%- for column in columns -%}\n            coalesce(cast({{ column }} as varchar), ''){% if not loop.last %} || '|' || {% endif %}\n        {%- endfor -%}\n    )\n{% endmacro %}\n`,
    },
  ];

  files.push({
    path: "source2vault_export/models/sources/_sources.yml",
    content: `version: 2\n\nsources:\n  - name: healthcare_raw\n    schema: raw_healthcare\n    description: Healthcare capstone source metadata loaded into Snowflake raw tables.\n    tables:\n${tables
      .map(
        (table) =>
          `      - name: ${table.name}\n        description: Raw ${titleCase(table.name)} source table from ${table.sourceSystem}.\n        columns:\n${table.columns
            .map(
              (column) =>
                `          - name: ${column.columnName}\n            description: ${column.description || "Source metadata column."}`,
            )
            .join("\n")}`,
      )
      .join("\n")}\n`,
  });

  for (const table of tables) {
    files.push({
      path: `source2vault_export/models/staging/stg_${table.name}.sql`,
      content: `with source as (\n    select * from {{ source('healthcare_raw', '${table.name}') }}\n),\n\nrenamed as (\n    select\n${table.columns
        .map(
          (column) =>
            `        cast(${column.columnName} as ${snowflakeType(column.dataType)}) as ${column.columnName}`,
        )
        .join(
          ",\n",
        )},\n        current_timestamp() as source2vault_loaded_at\n    from source\n)\n\nselect * from renamed\n`,
    });
  }

  for (const hub of vault.hubs) {
    const table = tables.find((item) => item.name === hub.sourceTables[0]);
    if (!table?.businessKey) continue;
    const entity = singularTableName(table.name);

    files.push({
      path: `source2vault_export/models/vault/hubs/${hub.name}.sql`,
      content: `{{ config(materialized='incremental', unique_key='${entity}_hk') }}\n\nwith staged as (\n    select * from {{ ref('stg_${table.name}') }}\n),\n\nfinal as (\n    select distinct\n        {{ source2vault_hash([\"${table.businessKey.columnName}\"]) }} as ${entity}_hk,\n        ${table.businessKey.columnName},\n        current_timestamp() as load_datetime,\n        '${table.sourceSystem}.${table.name}' as record_source\n    from staged\n    where ${table.businessKey.columnName} is not null\n)\n\nselect * from final\n`,
    });
  }

  for (const link of vault.links) {
    const relationship = relationships.find(
      (item) =>
        link.sourceTables.includes(item.fromTable) &&
        link.sourceTables.includes(item.toTable),
    );
    if (!relationship) continue;
    const fromTable = tables.find(
      (item) => item.name === relationship.fromTable,
    );
    const toTable = tables.find((item) => item.name === relationship.toTable);
    if (!fromTable?.businessKey || !toTable?.businessKey) continue;
    const fromEntity = singularTableName(fromTable.name);
    const toEntity = singularTableName(toTable.name);
    const linkKey = `${toEntity}_${fromEntity}_hk`;

    files.push({
      path: `source2vault_export/models/vault/links/${link.name}.sql`,
      content: `{{ config(materialized='incremental', unique_key='${linkKey}') }}\n\nwith staged as (\n    select * from {{ ref('stg_${fromTable.name}') }}\n),\n\nfinal as (\n    select distinct\n        {{ source2vault_hash([\"${relationship.toColumn}\", \"${fromTable.businessKey.columnName}\"]) }} as ${linkKey},\n        {{ source2vault_hash([\"${relationship.toColumn}\"]) }} as ${toEntity}_hk,\n        {{ source2vault_hash([\"${fromTable.businessKey.columnName}\"]) }} as ${fromEntity}_hk,\n        current_timestamp() as load_datetime,\n        '${fromTable.sourceSystem}.${fromTable.name}' as record_source\n    from staged\n    where ${relationship.toColumn} is not null\n      and ${fromTable.businessKey.columnName} is not null\n)\n\nselect * from final\n`,
    });
  }

  for (const satellite of vault.satellites) {
    const table = tables.find(
      (item) => item.name === satellite.sourceTables[0],
    );
    if (!table?.businessKey) continue;
    const entity = singularTableName(table.name);
    const satelliteColumns = satellite.columns.filter(
      (name) =>
        ![
          `${entity}_hk`,
          "hashdiff",
          "load_datetime",
          "record_source",
        ].includes(name),
    );

    files.push({
      path: `source2vault_export/models/vault/satellites/${satellite.name}.sql`,
      content: `{{ config(materialized='incremental', unique_key=['${entity}_hk', 'hashdiff']) }}\n\nwith staged as (\n    select\n        {{ source2vault_hash([\"${table.businessKey.columnName}\"]) }} as ${entity}_hk,\n${satelliteColumns.map((name) => `        ${name}`).join(",\n")},\n        {{ source2vault_hash([${satelliteColumns.map((name) => `"${name}"`).join(", ")}]) }} as hashdiff,\n        current_timestamp() as load_datetime,\n        '${table.sourceSystem}.${table.name}' as record_source\n    from {{ ref('stg_${table.name}') }}\n    where ${table.businessKey.columnName} is not null\n),\n\nfinal as (\n    select * from staged\n    {% if is_incremental() %}\n    where not exists (\n        select 1\n        from {{ this }} existing\n        where existing.${entity}_hk = staged.${entity}_hk\n          and existing.hashdiff = staged.hashdiff\n    )\n    {% endif %}\n)\n\nselect * from final\n`,
    });
  }

  files.push({
    path: "source2vault_export/models/vault/vault.yml",
    content: `version: 2\n\nmodels:\n${[
      ...vault.hubs,
      ...vault.links,
      ...vault.satellites,
    ]
      .map(
        (object) =>
          `  - name: ${object.name}\n    description: ${object.type} generated by Source2Vault from ${object.sourceTables.join(", ")}.\n    columns:\n${object.columns
            .map(
              (name) =>
                `      - name: ${name}\n        tests:\n          - not_null`,
            )
            .join("\n")}`,
      )
      .join("\n")}\n`,
  });

  for (const dimension of reportingLayer.dimensions) {
    files.push({
      path: `source2vault_export/models/marts/dimensions/${dimension.name}.sql`,
      content: generateDimensionSql(dimension, tables, vault),
    });
  }

  for (const fact of reportingLayer.facts) {
    files.push({
      path: `source2vault_export/models/marts/facts/${fact.name}.sql`,
      content: generateFactSql(fact, tables, vault),
    });
  }

  files.push({
    path: "source2vault_export/models/marts/marts.yml",
    content: `version: 2\n\nmodels:\n${[
      ...reportingLayer.dimensions.map((dimension) => ({
        name: dimension.name,
        description: `${dimension.grain} PHI/PII fields are excluded by default.`,
        columns: [
          `${dimension.name.replace(/^dim_/, "")}_hk`,
          ...dimension.attributes,
        ],
      })),
      ...reportingLayer.facts.map((fact) => ({
        name: fact.name,
        description: `${fact.grain} Measures and dates are sourced from non-PHI vault satellites.`,
        columns: [...fact.foreignKeys, ...fact.measures, ...fact.dates],
      })),
    ]
      .map(
        (model) =>
          `  - name: ${model.name}\n    description: ${model.description}\n    columns:\n${Array.from(
            new Set(model.columns),
          )
            .map(
              (name) =>
                `      - name: ${name}\n        description: Generated reporting column from the reviewed Source2Vault model.`,
            )
            .join("\n")}`,
      )
      .join("\n")}\n`,
  });

  files.push({
    path: "source2vault_export/docs/reporting_layer.md",
    content: `# Source2Vault Reporting Layer\n\n## Dimensions\n\n${reportingLayer.dimensions
      .map(
        (dimension) =>
          `- **${dimension.name}**: ${dimension.grain} Uses ${dimension.sourceHub}${dimension.sourceSatellites.length > 0 ? ` and ${dimension.sourceSatellites.join(", ")}` : ""}.`,
      )
      .join("\n")}\n\n## Facts\n\n${reportingLayer.facts
      .map(
        (fact) =>
          `- **${fact.name}**: ${fact.grain} Measures: ${fact.measures.length > 0 ? fact.measures.join(", ") : "none detected"}.`,
      )
      .join("\n")}\n\n## Metrics\n\n${reportingLayer.metrics
      .map(
        (metric) =>
          `- **${metric.label}** (${metric.sourceFact}): \`${metric.expression}\``,
      )
      .join(
        "\n",
      )}\n\n## PHI/PII Excluded From Reporting\n\n${reportingLayer.excludedPhiFields.length > 0 ? reportingLayer.excludedPhiFields.map((field) => `- ${field}`).join("\n") : "- No PHI/PII fields were detected in the loaded metadata."}\n\n## Suggested Dashboard Questions\n\n- Claims paid amount by payer\n- Encounter count by department\n- Claim status trend by service month\n- Total charge vs paid amount by payer type\n- Provider group encounter volume\n`,
  });

  return files;
}

function Badge({
  children,
  tone = "slate",
}: {
  children: React.ReactNode;
  tone?: "emerald" | "blue" | "purple" | "amber" | "rose" | "slate";
}) {
  const tones = {
    emerald: "bg-emerald-500/10 text-emerald-700 border-emerald-200",
    blue: "bg-blue-500/10 text-blue-700 border-blue-200",
    purple: "bg-purple-500/10 text-purple-700 border-purple-200",
    amber: "bg-amber-500/10 text-amber-700 border-amber-200",
    rose: "bg-rose-500/10 text-rose-700 border-rose-200",
    slate: "bg-slate-100 text-slate-700 border-slate-200",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-3xl border border-white/10 bg-white text-slate-950 shadow-xl ${className}`}
    >
      {children}
    </section>
  );
}

function Button({
  children,
  onClick,
  variant = "primary",
  className = "",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "dark";
  className?: string;
}) {
  const variants = {
    primary: "bg-blue-600 text-white hover:bg-blue-500",
    secondary:
      "border border-slate-200 bg-white text-slate-950 hover:bg-slate-50",
    dark: "bg-slate-950 text-white hover:bg-slate-800",
  };

  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center rounded-2xl px-4 py-2 text-sm font-semibold transition ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

function VaultDiagram({
  vault,
}: {
  vault: ReturnType<typeof buildVaultModel>;
}) {
  const nodes = [...vault.hubs, ...vault.links, ...vault.satellites]
    .slice(0, 18)
    .map((node, index) => ({
      ...node,
      x: node.type === "Hub" ? 5 : node.type === "Link" ? 39 : 72,
      y: 8 + (index % 6) * 14,
    }));
  const byId = Object.fromEntries(nodes.map((node) => [node.id, node]));
  const diagramEdges = vault.links.flatMap((link) => {
    const relatedHubs = vault.hubs.filter((hub) =>
      link.sourceTables.some((table) => hub.sourceTables.includes(table)),
    );
    return relatedHubs.map((hub) => [hub.id, link.id]);
  });

  for (const satellite of vault.satellites) {
    const hub = vault.hubs.find(
      (item) => item.sourceTables[0] === satellite.sourceTables[0],
    );
    if (hub) diagramEdges.push([hub.id, satellite.id]);
  }

  return (
    <div className="relative h-[520px] overflow-hidden rounded-3xl border border-slate-200 bg-[radial-gradient(circle_at_top_left,_#eef2ff,_transparent_35%),linear-gradient(180deg,#ffffff,#f8fafc)]">
      <svg className="absolute inset-0 h-full w-full">
        {diagramEdges.map(([from, to], index) => {
          const a = byId[from];
          const b = byId[to];
          if (!a || !b) return null;

          return (
            <motion.line
              key={`${from}-${to}-${index}`}
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ delay: index * 0.03, duration: 0.45 }}
              x1={`${a.x + 10}%`}
              y1={`${a.y + 4}%`}
              x2={`${b.x + 10}%`}
              y2={`${b.y + 4}%`}
              stroke="#94a3b8"
              strokeDasharray="6 7"
              strokeWidth="2"
            />
          );
        })}
      </svg>

      {nodes.map((node) => {
        const tone =
          node.type === "Hub"
            ? "border-blue-300 bg-blue-50"
            : node.type === "Link"
              ? "border-purple-300 bg-purple-50"
              : "border-emerald-300 bg-emerald-50";
        return (
          <motion.div
            key={node.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.35 }}
            className={`absolute w-48 rounded-2xl border ${tone} p-3 shadow-sm`}
            style={{ left: `${node.x}%`, top: `${node.y}%` }}
          >
            <div className="flex items-center gap-2">
              {node.type === "Hub" && (
                <KeyRound className="h-4 w-4 text-blue-700" />
              )}
              {node.type === "Link" && (
                <Network className="h-4 w-4 text-purple-700" />
              )}
              {node.type === "Satellite" && (
                <History className="h-4 w-4 text-emerald-700" />
              )}
              <span className="text-xs font-semibold text-slate-900">
                {node.type}
              </span>
            </div>
            <div className="mt-2 truncate text-sm font-bold text-slate-950">
              {node.name}
            </div>
            <div className="mt-1 truncate text-xs text-slate-500">
              {node.sourceTables.join(", ")}
            </div>
          </motion.div>
        );
      })}

      <div className="absolute bottom-4 left-4 flex flex-wrap gap-2">
        <Badge tone="blue">Hub = hash key</Badge>
        <Badge tone="purple">Link = relationship</Badge>
        <Badge tone="emerald">Satellite = hashdiff history</Badge>
      </div>
    </div>
  );
}

export default function Source2VaultPage() {
  const [metadata, setMetadata] =
    useState<MetadataColumn[]>(healthcareMetadata);
  const [overrides, setOverrides] = useState<OverrideState>({});
  const [selectedTableName, setSelectedTableName] = useState("patients");
  const [selectedFile, setSelectedFile] = useState<GeneratedFile | null>(null);

  const tables = useMemo(() => groupTables(metadata), [metadata]);
  const classifiedTables = useMemo(
    () => classifyTables(tables, overrides),
    [tables, overrides],
  );
  const selectedTable =
    classifiedTables.find((table) => table.name === selectedTableName) ??
    classifiedTables[0];
  const relationships = useMemo(
    () => inferRelationships(classifiedTables),
    [classifiedTables],
  );
  const vault = useMemo(
    () => buildVaultModel(classifiedTables, relationships),
    [classifiedTables, relationships],
  );
  const reportingLayer = useMemo(
    () => buildReportingLayer(classifiedTables, relationships, vault),
    [classifiedTables, relationships, vault],
  );
  const generatedFiles = useMemo(
    () =>
      generateDbtFiles(classifiedTables, relationships, vault, reportingLayer),
    [classifiedTables, relationships, vault, reportingLayer],
  );
  const allColumns = classifiedTables.flatMap((table) => table.columns);
  const phiCount = allColumns.filter(
    (column) => column.isPhi && !column.isExcluded,
  ).length;
  const businessKeyCount = allColumns.filter(
    (column) => column.semanticType === "BUSINESS_KEY",
  ).length;

  async function handleCsvUpload(file: File) {
    const text = await file.text();
    const parsed = parseMetadataCsv(text);
    setMetadata(parsed);
    setOverrides({});
    setSelectedTableName(parsed[0]?.tableName ?? "patients");
  }

  async function downloadDbtZip() {
    const zip = new JSZip();
    for (const file of generatedFiles) {
      zip.file(file.path.replace("source2vault_export/", ""), file.content);
    }
    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "source2vault_export.zip";
    link.click();
    URL.revokeObjectURL(url);
  }

  function updateOverride(columnKey: string, patch: OverrideState[string]) {
    setOverrides((current) => ({
      ...current,
      [columnKey]: {
        ...current[columnKey],
        ...patch,
      },
    }));
  }

  return (
    <main className="min-h-screen bg-slate-950 p-6 text-slate-100">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/5 p-5 shadow-2xl backdrop-blur md:flex-row md:items-center md:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm text-blue-200">
              <Sparkles className="h-4 w-4" />
              Source2Vault Workspace
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-white">
              Healthcare Data Vault Generator
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-300">
              Load healthcare source metadata, classify PHI, infer business keys
              and relationships, and export Snowflake dbt Data Vault 2.0 files.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <label className="inline-flex cursor-pointer items-center rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-slate-200">
              <UploadCloud className="mr-2 h-4 w-4" /> Upload CSV
              <input
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void handleCsvUpload(file);
                }}
              />
            </label>
            <Button onClick={() => setMetadata(healthcareMetadata)}>
              <Wand2 className="mr-2 h-4 w-4" /> Load Healthcare Demo
            </Button>
            <Button variant="dark" onClick={downloadDbtZip}>
              <Download className="mr-2 h-4 w-4" /> Export dbt Zip
            </Button>
          </div>
        </header>

        <div className="mb-6 grid gap-4 md:grid-cols-4">
          {[
            {
              icon: KeyRound,
              title: "Business Keys",
              value: businessKeyCount,
              detail: "Hub candidates with hash keys",
              tone: "emerald" as const,
            },
            {
              icon: GitBranch,
              title: "Relationships",
              value: relationships.length,
              detail: "Link candidates inferred",
              tone: "blue" as const,
            },
            {
              icon: History,
              title: "Satellites",
              value: vault.satellites.length,
              detail: "Incremental hashdiff history",
              tone: "purple" as const,
            },
            {
              icon: ShieldAlert,
              title: "PHI / PII Fields",
              value: phiCount,
              detail: "Isolated for governance",
              tone: "rose" as const,
            },
          ].map((item) => (
            <Card key={item.title}>
              <div className="p-5">
                <div className="flex items-start justify-between">
                  <div className="rounded-2xl bg-slate-100 p-2">
                    <item.icon className="h-5 w-5 text-slate-800" />
                  </div>
                  <Badge tone={item.tone}>{item.value}</Badge>
                </div>
                <div className="mt-4 text-sm font-semibold text-slate-500">
                  {item.title}
                </div>
                <div className="mt-1 text-sm text-slate-700">{item.detail}</div>
              </div>
            </Card>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
          <aside className="space-y-4">
            <Card>
              <div className="p-5">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold">
                    <Database className="h-5 w-5 text-blue-700" /> Source Tables
                  </div>
                  <Badge>{classifiedTables.length} tables</Badge>
                </div>
                <div className="space-y-2">
                  {classifiedTables.map((table) => {
                    const isSelected = selectedTable?.name === table.name;

                    return (
                      <button
                        key={table.name}
                        onClick={() => setSelectedTableName(table.name)}
                        className={`w-full rounded-2xl border p-3 text-left transition ${
                          isSelected
                            ? "border-blue-300 bg-blue-50"
                            : "border-slate-200 bg-white hover:bg-slate-50"
                        }`}
                        aria-expanded={isSelected}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 font-semibold">
                            <Table2 className="h-4 w-4 text-slate-600" />{" "}
                            {table.name}
                          </div>
                          <ChevronRight
                            className={`h-4 w-4 text-slate-400 transition ${
                              isSelected ? "rotate-90" : ""
                            }`}
                          />
                        </div>
                        <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                          <span>{table.sourceSystem}</span>
                          <span>{table.columns.length} columns</span>
                        </div>
                        {isSelected && (
                          <div className="mt-3 rounded-xl border border-blue-100 bg-white/70 p-2">
                            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-blue-700">
                              Column names in this count
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {table.columns.map((column) => (
                                <span
                                  key={`${table.name}-${column.columnName}`}
                                  className="rounded-full border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-700"
                                >
                                  {column.columnName}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </Card>

            <Card>
              <div className="p-5">
                <div className="mb-4 flex items-center gap-2 font-bold">
                  <Layers3 className="h-5 w-5 text-purple-700" /> Column
                  Classification
                </div>
                <div className="space-y-3">
                  {selectedTable?.columns.map((columnItem) => {
                    const key = `${columnItem.tableName}.${columnItem.columnName}`;
                    return (
                      <div
                        key={key}
                        className="rounded-2xl border border-slate-200 bg-slate-50 p-3"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <div className="font-semibold text-slate-900">
                              {columnItem.columnName}
                            </div>
                            <div className="text-xs text-slate-500">
                              {columnItem.dataType}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-bold text-slate-900">
                              {columnItem.score}%
                            </div>
                            <div className="text-xs text-slate-500">
                              confidence
                            </div>
                          </div>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <Badge
                            tone={
                              columnItem.isPhi
                                ? "rose"
                                : columnItem.semanticType.includes("KEY")
                                  ? "blue"
                                  : columnItem.semanticType === "MEASURE"
                                    ? "emerald"
                                    : "slate"
                            }
                          >
                            {columnItem.semanticType.replaceAll("_", " ")}
                          </Badge>
                          {columnItem.isPhi && <Badge tone="rose">PHI</Badge>}
                        </div>
                        <p className="mt-2 text-xs text-slate-500">
                          {columnItem.evidence[0]}
                        </p>
                        <div className="mt-3 flex gap-3 text-xs text-slate-600">
                          <label className="flex items-center gap-1">
                            <input
                              type="checkbox"
                              checked={columnItem.isPhi}
                              onChange={(event) =>
                                updateOverride(key, {
                                  isPhi: event.target.checked,
                                })
                              }
                            />
                            PHI
                          </label>
                          <label className="flex items-center gap-1">
                            <input
                              type="checkbox"
                              checked={columnItem.isExcluded}
                              onChange={(event) =>
                                updateOverride(key, {
                                  isExcluded: event.target.checked,
                                })
                              }
                            />
                            Exclude
                          </label>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </Card>
          </aside>

          <section className="space-y-4">
            <Card>
              <div className="p-5">
                <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-xl font-bold">
                      <Network className="h-5 w-5 text-blue-700" /> Recommended
                      Data Vault Model
                    </div>
                    <p className="mt-1 text-sm text-slate-500">
                      Deterministic Data Vault 2.0 recommendations with hash
                      keys, hashdiffs, PHI satellites, and Snowflake dbt output.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="secondary"
                      onClick={() => setSelectedFile(generatedFiles[0] ?? null)}
                    >
                      <Eye className="mr-2 h-4 w-4" /> Preview dbt
                    </Button>
                    <Button variant="dark" onClick={downloadDbtZip}>
                      <FileCode2 className="mr-2 h-4 w-4" /> Export Files
                    </Button>
                  </div>
                </div>
                <VaultDiagram vault={vault} />
              </div>
            </Card>

            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <div className="p-5">
                  <div className="mb-3 flex items-center gap-2 font-bold">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />{" "}
                    Recommended Hubs
                  </div>
                  <ul className="space-y-2 text-sm text-slate-700">
                    {vault.hubs.slice(0, 8).map((hub) => (
                      <li key={hub.id}>{hub.name}</li>
                    ))}
                  </ul>
                </div>
              </Card>

              <Card>
                <div className="p-5">
                  <div className="mb-3 flex items-center gap-2 font-bold">
                    <GitBranch className="h-5 w-5 text-purple-600" />{" "}
                    Recommended Links
                  </div>
                  <ul className="space-y-2 text-sm text-slate-700">
                    {vault.links.slice(0, 8).map((link) => (
                      <li key={link.id}>{link.name}</li>
                    ))}
                  </ul>
                </div>
              </Card>

              <Card>
                <div className="p-5">
                  <div className="mb-3 flex items-center gap-2 font-bold">
                    <AlertTriangle className="h-5 w-5 text-rose-600" />{" "}
                    Governance Strategy
                  </div>
                  <ul className="space-y-2 text-sm text-slate-700">
                    <li>PHI fields isolated into *_phi satellites</li>
                    <li>Satellites use incremental hashdiff tracking</li>
                    <li>record_source and load_datetime preserved</li>
                  </ul>
                </div>
              </Card>
            </div>

            <Card>
              <div className="p-5">
                <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-xl font-bold">
                      <Database className="h-5 w-5 text-emerald-700" />{" "}
                      Reporting Layer
                    </div>
                    <p className="mt-1 text-sm text-slate-500">
                      BI-ready dimensions, facts, and metrics generated from the
                      reviewed Data Vault model while excluding PHI by default.
                    </p>
                  </div>
                  <Button
                    variant="secondary"
                    onClick={() =>
                      setSelectedFile(
                        generatedFiles.find((file) =>
                          file.path.includes("models/marts/"),
                        ) ?? null,
                      )
                    }
                  >
                    <Eye className="mr-2 h-4 w-4" /> Preview Mart SQL
                  </Button>
                </div>

                <div className="grid gap-4 lg:grid-cols-4">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <div className="font-bold text-slate-900">Dimensions</div>
                      <Badge tone="emerald">
                        {reportingLayer.dimensions.length}
                      </Badge>
                    </div>
                    <ul className="space-y-2 text-sm text-slate-700">
                      {reportingLayer.dimensions
                        .slice(0, 6)
                        .map((dimension) => (
                          <li key={dimension.name}>
                            <span className="font-semibold">
                              {dimension.name}
                            </span>
                            <div className="text-xs text-slate-500">
                              {dimension.attributes.length} safe attributes
                            </div>
                          </li>
                        ))}
                    </ul>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <div className="font-bold text-slate-900">Facts</div>
                      <Badge tone="blue">{reportingLayer.facts.length}</Badge>
                    </div>
                    <ul className="space-y-2 text-sm text-slate-700">
                      {reportingLayer.facts.slice(0, 6).map((fact) => (
                        <li key={fact.name}>
                          <span className="font-semibold">{fact.name}</span>
                          <div className="text-xs text-slate-500">
                            {fact.measures.length} measures, {fact.dates.length}{" "}
                            dates
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <div className="font-bold text-slate-900">Metrics</div>
                      <Badge tone="purple">
                        {reportingLayer.metrics.length}
                      </Badge>
                    </div>
                    <ul className="space-y-2 text-sm text-slate-700">
                      {reportingLayer.metrics.slice(0, 6).map((metric) => (
                        <li key={`${metric.sourceFact}-${metric.name}`}>
                          <span className="font-semibold">{metric.label}</span>
                          <div className="truncate text-xs text-slate-500">
                            {metric.expression}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <div className="font-bold text-slate-900">
                        PHI Excluded
                      </div>
                      <Badge tone="rose">
                        {reportingLayer.excludedPhiFields.length}
                      </Badge>
                    </div>
                    <ul className="space-y-2 text-sm text-slate-700">
                      {reportingLayer.excludedPhiFields.length > 0 ? (
                        reportingLayer.excludedPhiFields
                          .slice(0, 6)
                          .map((field) => <li key={field}>{field}</li>)
                      ) : (
                        <li>No PHI/PII detected in current metadata.</li>
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            </Card>

            <Card>
              <div className="p-5">
                <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-xl font-bold">
                      <FileCode2 className="h-5 w-5 text-slate-700" /> Generated
                      dbt Project
                    </div>
                    <p className="mt-1 text-sm text-slate-500">
                      {generatedFiles.length} Snowflake/dbt files ready for
                      export.
                    </p>
                  </div>
                  <Button
                    variant="secondary"
                    onClick={() =>
                      setSelectedFile({
                        path: "healthcare_metadata.csv",
                        content: metadataToCsv(metadata),
                      })
                    }
                  >
                    Preview Metadata CSV
                  </Button>
                </div>
                <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
                  <div className="max-h-96 space-y-2 overflow-auto rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    {generatedFiles.map((file) => (
                      <button
                        key={file.path}
                        onClick={() => setSelectedFile(file)}
                        className="w-full rounded-xl px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-white"
                      >
                        {file.path.replace("source2vault_export/", "")}
                      </button>
                    ))}
                  </div>
                  <pre className="max-h-96 overflow-auto rounded-2xl bg-slate-950 p-4 text-xs text-slate-100">
                    {selectedFile?.content ?? generatedFiles[0]?.content}
                  </pre>
                </div>
              </div>
            </Card>
          </section>
        </div>
      </div>
    </main>
  );
}
