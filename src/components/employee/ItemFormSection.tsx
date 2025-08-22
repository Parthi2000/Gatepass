import React from 'react';
import { PackageItemSubmission } from '../../types/item';
import { Hash, DollarSign, FileText, Trash2, Package, X } from 'lucide-react';

interface ItemFormSectionProps {
  item: PackageItemSubmission;
  index: number;
  onChange: (index: number, updates: Partial<PackageItemSubmission>) => void;
  onRemove: (index: number) => void;
  showRemoveButton: boolean;
}

export const ItemFormSection: React.FC<ItemFormSectionProps> = ({
  item,
  index,
  onChange,
  onRemove,
  showRemoveButton
}) => {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4 mb-4 shadow-sm hover:shadow-md transition-all duration-200">
      {/* Header with item number and remove button */}
      <div className="flex justify-between items-center mb-3 pb-2 border-b border-slate-200">
        <h4 className="text-md font-semibold text-slate-700 flex items-center">
          <Package className="h-5 w-5 mr-2 text-blue-500" />
          Item {index + 1}
        </h4>
        {showRemoveButton && (
          <button
            type="button"
            onClick={() => onRemove(index)}
            className="text-red-500 hover:text-red-700 p-1 rounded-md hover:bg-red-50 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Line 1: Identification fields - Serial Number and HSN Code */}
      <div className="bg-slate-50 p-3 rounded-md mb-3">
        <div className="text-sm font-medium text-slate-700 mb-2 pb-1 border-b border-slate-200">Item Identification</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
          <div>
            <label htmlFor={`serialNumber-${index}`} className="block mb-1 text-xs font-medium text-slate-700">
              <Hash className="inline h-3 w-3 mr-1" />
              Serial/Part Number*
            </label>
            <input
              type="text"
              id={`serialNumber-${index}`}
              value={item.serialNumber}
              onChange={(e) => onChange(index, { serialNumber: e.target.value })}
              className="w-full px-3 py-1.5 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Unique identifier for item"
              required
            />
          </div>

          <div>
            <label htmlFor={`hsnCode-${index}`} className="block mb-1 text-xs font-medium text-slate-700">
              HSN Code
            </label>
            <input
              type="text"
              id={`hsnCode-${index}`}
              value={item.hsnCode}
              onChange={(e) => onChange(index, { hsnCode: e.target.value })}
              className="w-full px-3 py-1.5 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="e.g., 8471 (Optional)"
            />
          </div>
        </div>
        
        <div>
          <label htmlFor={`description-${index}`} className="block mb-1 text-xs font-medium text-slate-700">
            <FileText className="inline h-3 w-3 mr-1" />
            Item Description
          </label>
          <textarea
            id={`description-${index}`}
            value={item.description || ''}
            onChange={(e) => onChange(index, { description: e.target.value })}
            className="w-full px-3 py-1.5 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="Detailed description of the item"
            rows={2}
          />
        </div>
      </div>

      {/* Line 2: Quantity, pricing and purpose */}
      <div className="bg-slate-50 p-3 rounded-md mb-3">
        <div className="text-sm font-medium text-slate-700 mb-2 pb-1 border-b border-slate-200">Quantity & Purpose</div>
        <div className="flex items-end space-x-2">
          {/* Quantity */}
          <div className="flex-1">
            <label htmlFor={`quantity-${index}`} className="block mb-1 text-xs font-medium text-slate-700">
              Quantity*
            </label>
            <input
              type="number"
              id={`quantity-${index}`}
              value={item.quantity}
              onChange={(e) => {
                const quantity = parseInt(e.target.value) || 0;
                const unitPrice = parseFloat(item.unitPrice) || 0;
                const total = unitPrice * quantity;
                onChange(index, { 
                  quantity: quantity,
                  purpose: total > 0 ? total.toString() : ''
                });
              }}
              min="1"
              className="w-full px-3 py-1.5 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              required
            />
          </div>
          
          {/* X Symbol */}
          <div className="h-10 flex items-center justify-center px-2">
            <span className="text-xl font-bold text-slate-500">×</span>
          </div>
          
          {/* Unit Price */}
          <div className="flex-1">
            <label htmlFor={`unitPrice-${index}`} className="block mb-1 text-xs font-medium text-slate-700">
              <DollarSign className="inline h-3 w-3 mr-1" />
              Unit Price
            </label>
            <input
              type="text"
              id={`unitPrice-${index}`}
              value={item.unitPrice}
              onChange={(e) => {
                const unitPrice = e.target.value;
                const quantity = item.quantity || 0;
                const total = (parseFloat(unitPrice) || 0) * quantity;
                onChange(index, { 
                  unitPrice: unitPrice,
                  purpose: total > 0 ? total.toString() : ''
                });
              }}
              className="w-full px-3 py-1.5 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="e.g., 1000.00"
            />
          </div>
          
          {/* Equals Symbol */}
          <div className="h-10 flex items-center justify-center px-2">
            <span className="text-xl font-bold text-slate-500">=</span>
          </div>
          
          {/* Taxable Value */}
          <div className="flex-1">
            <label htmlFor={`purpose-${index}`} className="block mb-1 text-xs font-medium text-slate-700">
              <FileText className="inline h-3 w-3 mr-1" />
              Taxable Value
            </label>
            <input
              type="text"
              id={`purpose-${index}`}
              value={item.purpose}
              readOnly
              className="w-full px-3 py-1.5 border border-slate-300 rounded-md bg-slate-50"
              placeholder="Auto-calculated"
            />
          </div>
        </div>
      </div>

      {/* No Weight & Additional Info section - moved to a common form area */}
    </div>
  );
};