import fs from "node:fs";

const file = "src/modules/crm/actions.ts";
let content = fs.readFileSync(file, "utf8");

const importNeedle = 'import { nextInternalReference } from "@/modules/numbering/reference-service";\n';
const referenceImport = `import {
  issueBusinessReference,
  REFERENCE_TRACK_CODES,
  REFERENCE_TYPE_CODES,
  trackCodeForOpportunityTrack,
} from "@/modules/crm/references";
`;

if (!content.includes('from "@/modules/crm/references"')) {
  if (!content.includes(importNeedle)) {
    throw new Error("Could not find nextInternalReference import.");
  }

  content = content.replace(importNeedle, `${importNeedle}${referenceImport}`);
}

const leadPattern =
  /const reference = await nextInternalReference\(\s*tx,\s*"[^"]+",\s*"LEAD",\s*\);\s*const dataQualityStatus = contactDataQuality\(parsed\.data\);/;

if (leadPattern.test(content)) {
  content = content.replace(
    leadPattern,
    `const reference = await issueBusinessReference(tx, {
        trackCode: parsed.data.track
          ? trackCodeForOpportunityTrack(parsed.data.track)
          : REFERENCE_TRACK_CODES.RETAIL,
        typeCode: REFERENCE_TYPE_CODES.LEAD,
        year: new Date().getFullYear(),
      });
      const dataQualityStatus = contactDataQuality(parsed.data);`,
  );
} else if (!content.includes("typeCode: REFERENCE_TYPE_CODES.LEAD")) {
  throw new Error("Could not wire lead reference generation.");
}

const opportunityPattern =
  /const opportunityReference = await nextInternalReference\(\s*tx,\s*"[^"]+",\s*"[^"]+",\s*\);/;

if (opportunityPattern.test(content)) {
  content = content.replace(
    opportunityPattern,
    `const opportunityReference = await issueBusinessReference(tx, {
        trackCode: parsed.data.track
          ? trackCodeForOpportunityTrack(parsed.data.track)
          : REFERENCE_TRACK_CODES.RETAIL,
        typeCode: REFERENCE_TYPE_CODES.OPPORTUNITY,
        year: new Date().getFullYear(),
      });`,
  );
} else if (!content.includes("typeCode: REFERENCE_TYPE_CODES.OPPORTUNITY")) {
  throw new Error("Could not wire opportunity reference generation.");
}

fs.writeFileSync(file, content, "utf8");

console.log("Wired Lead and Opportunity references to DB-backed ReferenceSequence.");
