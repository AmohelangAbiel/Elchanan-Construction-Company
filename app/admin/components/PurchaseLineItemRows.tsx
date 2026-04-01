type MaterialOption = {
  id: string;
  name: string;
  unit: string;
  category: string | null;
};

type ProcurementItemOption = {
  id: string;
  name: string;
  unit: string;
};

type PurchaseLineItemValue = {
  description?: string | null;
  quantity?: number | string | null;
  unit?: string | null;
  estimatedUnitCost?: number | string | null;
  actualUnitCost?: number | string | null;
  receivedQuantity?: number | string | null;
  materialItemId?: string | null;
  projectProcurementItemId?: string | null;
  notes?: string | null;
};

type PurchaseLineItemRowsProps = {
  materials: MaterialOption[];
  procurementItems: ProcurementItemOption[];
  lineItems?: PurchaseLineItemValue[];
  minRows?: number;
};

export function PurchaseLineItemRows({
  materials,
  procurementItems,
  lineItems = [],
  minRows = 4,
}: PurchaseLineItemRowsProps) {
  const rows = [...lineItems];

  while (rows.length < minRows) {
    rows.push({});
  }

  return (
    <div className="space-y-3">
      {rows.map((lineItem, index) => (
        <div key={`line-item-${index}`} className="rounded-2xl border border-slate-800/70 bg-slate-900/70 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Line {index + 1}</p>
          <div className="mt-3 grid gap-3 lg:grid-cols-4">
            <label className="block lg:col-span-2">
              <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Description</span>
              <input name="lineDescription" defaultValue={lineItem.description || ''} className="interactive-input mt-2" />
            </label>
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Qty</span>
              <input
                name="lineQuantity"
                type="number"
                min={0}
                step="0.01"
                defaultValue={lineItem.quantity ?? ''}
                className="interactive-input mt-2"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Unit</span>
              <input name="lineUnit" defaultValue={lineItem.unit || ''} className="interactive-input mt-2" />
            </label>
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Requirement link</span>
              <select name="lineProjectProcurementItemId" defaultValue={lineItem.projectProcurementItemId || ''} className="interactive-input mt-2">
                <option value="">No linked requirement</option>
                {procurementItems.map((item) => (
                  <option key={item.id} value={item.id}>{item.name} ({item.unit})</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Catalog item</span>
              <select name="lineMaterialItemId" defaultValue={lineItem.materialItemId || ''} className="interactive-input mt-2">
                <option value="">No catalog link</option>
                {materials.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} {item.category ? `(${item.category})` : ''} {item.unit ? `- ${item.unit}` : ''}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Estimated unit cost</span>
              <input
                name="lineEstimatedUnitCost"
                type="number"
                min={0}
                step="0.01"
                defaultValue={lineItem.estimatedUnitCost ?? ''}
                className="interactive-input mt-2"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Actual unit cost</span>
              <input
                name="lineActualUnitCost"
                type="number"
                min={0}
                step="0.01"
                defaultValue={lineItem.actualUnitCost ?? ''}
                className="interactive-input mt-2"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Received qty</span>
              <input
                name="lineReceivedQuantity"
                type="number"
                min={0}
                step="0.01"
                defaultValue={lineItem.receivedQuantity ?? ''}
                className="interactive-input mt-2"
              />
            </label>
            <label className="block lg:col-span-4">
              <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Line notes</span>
              <input name="lineNotes" defaultValue={lineItem.notes || ''} className="interactive-input mt-2" />
            </label>
          </div>
        </div>
      ))}
    </div>
  );
}
