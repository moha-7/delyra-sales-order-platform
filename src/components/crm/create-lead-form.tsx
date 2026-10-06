"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/auth/submit-button";
import {
  createLeadAction,
  type CrmActionState,
} from "@/modules/crm/actions";
import { enumLabel } from "@/modules/crm/format";
import {
  BOQ_STATUSES,
  BRANCH_OPTIONS,
  DESIGN_STATUSES,
  MEASUREMENT_STATUSES,
  PROJECT_CLIENT_TYPES,
  PROJECT_TYPES,
  RETAIL_BUDGET_RANGES,
  RETAIL_CHANNELS,
  RETAIL_INTEREST_CATEGORIES,
  RETAIL_LEAD_SOURCES,
  UAE_EMIRATES,
  type OpportunityTrackValue,
} from "@/modules/crm/options";

const initialState: CrmActionState = {};

type OwnerOption = {
  id: string;
  displayName: string;
  initials: string | null;
  department: string;
};

function Errors({ errors }: { errors?: string[] }) {
  return errors?.map((error) => (
    <small className="field-error" key={error}>{error}</small>
  ));
}

function SelectField({
  name,
  label,
  options,
  required = false,
  placeholder = "Select…",
}: {
  name: string;
  label: string;
  options: readonly string[];
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <label>
      <span>{label}</span>
      <select name={name} required={required} defaultValue="">
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option value={option} key={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}

function OwnerSelect({ owners, canAssign }: { owners: OwnerOption[]; canAssign: boolean }) {
  if (!canAssign) return null;
  return (
    <label>
      <span>Owner</span>
      <select name="ownerId" defaultValue="">
        <option value="">Assign to me</option>
        {owners.map((owner) => (
          <option value={owner.id} key={owner.id}>
            {owner.displayName} · {enumLabel(owner.department)}
          </option>
        ))}
      </select>
    </label>
  );
}

export function CreateLeadForm({
  owners,
  canAssign,
  mode,
}: {
  owners: OwnerOption[];
  canAssign: boolean;
  mode: "retail" | "project";
}) {
  const [state, action] = useActionState(createLeadAction, initialState);
  const track: OpportunityTrackValue = mode === "retail" ? "RETAIL" : "PROJECT";

  return (
    <form action={action} className="record-form">
      <input type="hidden" name="track" value={track} />
      <input type="hidden" name="leadMode" value={mode} />
      {state.error ? <p className="form-error form-wide">{state.error}</p> : null}

      {mode === "retail" ? (
        <>
          <label>
            <span>Customer name *</span>
            <input name="name" required maxLength={160} autoFocus />
            <Errors errors={state.fieldErrors?.name} />
          </label>

          <SelectField name="source" label="Source" options={RETAIL_LEAD_SOURCES} required />
          <label>
            <span>Mobile</span>
            <input name="mobile" inputMode="tel" maxLength={40} />
            <Errors errors={state.fieldErrors?.mobile} />
          </label>
          <label>
            <span>Email</span>
            <input name="email" type="email" maxLength={254} />
            <Errors errors={state.fieldErrors?.email} />
          </label>
          <SelectField name="channel" label="Channel" options={RETAIL_CHANNELS} required />
          <SelectField name="branch" label="Branch / showroom" options={BRANCH_OPTIONS} />
          <SelectField name="interestCategory" label="Interest category" options={RETAIL_INTEREST_CATEGORIES} required />
          <SelectField name="budgetRange" label="Budget range" options={RETAIL_BUDGET_RANGES} />
          <label>
            <span>Campaign</span>
            <input name="campaign" maxLength={160} placeholder="Campaign name, if any" />
          </label>
          <label>
            <span>Next follow-up</span>
            <input name="nextFollowUpAt" type="datetime-local" />
            <Errors errors={state.fieldErrors?.nextFollowUpAt} />
          </label>
          <OwnerSelect owners={owners} canAssign={canAssign} />
          <label className="form-wide">
            <span>Notes</span>
            <textarea name="notes" rows={5} maxLength={4000} />
          </label>
        </>
      ) : (
        <>
          <label>
            <span>Project / Villa name *</span>
            <input name="name" required maxLength={160} autoFocus />
            <Errors errors={state.fieldErrors?.name} />
          </label>
          <label>
            <span>Client / company name</span>
            <input name="clientCompany" maxLength={160} />
          </label>
          <label>
            <span>Contact person</span>
            <input name="contactPerson" maxLength={160} />
          </label>
          <label>
            <span>Mobile</span>
            <input name="mobile" inputMode="tel" maxLength={40} />
            <Errors errors={state.fieldErrors?.mobile} />
          </label>
          <label>
            <span>Email</span>
            <input name="email" type="email" maxLength={254} />
            <Errors errors={state.fieldErrors?.email} />
          </label>
          <SelectField name="clientType" label="Client type" options={PROJECT_CLIENT_TYPES} required />
          <SelectField name="interestCategory" label="Project type" options={PROJECT_TYPES} required />
          <SelectField name="emirate" label="Emirate" options={UAE_EMIRATES} required />
          <label>
            <span>Area</span>
            <input name="area" maxLength={120} />
          </label>
          <label className="form-wide">
            <span>Site location / address</span>
            <input name="siteLocation" maxLength={500} />
          </label>
          <label>
            <span>Number of kitchens / units</span>
            <input name="numberOfUnits" inputMode="numeric" maxLength={20} />
          </label>
          <SelectField name="boqStatus" label="BOQ / requirement status" options={BOQ_STATUSES} required />
          <SelectField name="designStatus" label="Design status" options={DESIGN_STATUSES} required />
          <SelectField name="measurementStatus" label="Measurement status" options={MEASUREMENT_STATUSES} required />
          <label>
            <span>Expected quotation date</span>
            <input name="expectedQuotationDate" type="date" />
          </label>
          <label>
            <span>Client tender / BOQ reference</span>
            <input name="tenderReference" maxLength={160} />
          </label>
          <OwnerSelect owners={owners} canAssign={canAssign} />
          <label className="form-wide">
            <span>Notes</span>
            <textarea name="notes" rows={5} maxLength={4000} />
          </label>
        </>
      )}

      <div className="form-wide conversion-note">
        {mode === "retail"
          ? "Retail lead is fixed to Retail by your workspace and permissions. No Project fields are shown."
          : "Project / Villa lead is fixed to Project by your workspace and permissions. Retail fields are not mixed into this flow."}
      </div>

      <div className="form-wide form-actions">
        <SubmitButton idleLabel={mode === "retail" ? "Create retail lead" : "Create project / villa lead"} pendingLabel="Creating lead…" />
      </div>
    </form>
  );
}
