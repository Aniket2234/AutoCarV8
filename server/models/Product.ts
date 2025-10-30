import mongoose from 'mongoose';

const variantSchema = new mongoose.Schema({
  size: String,
  color: String,
}, { _id: false });

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: { type: String, required: true },
  brand: { type: String, required: true },
  modelCompatibility: [String],
  warranty: String,
  mrp: { type: Number, required: true },
  sellingPrice: { type: Number, required: true },
  discount: { type: Number, default: 0 },
  stockQty: { type: Number, default: 0 },
  minStockLevel: { type: Number, default: 10 },
  status: { 
    type: String, 
    enum: ['in_stock', 'low_stock', 'out_of_stock', 'discontinued'],
    default: 'in_stock'
  },
  variants: [variantSchema],
  images: [String],
  warehouseLocation: { type: String },
  barcode: { type: String },
  supplierId: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier' },
}, { timestamps: true });

productSchema.pre('save', function(next) {
  if (this.stockQty === 0) {
    this.status = 'out_of_stock';
  } else if (this.stockQty <= this.minStockLevel) {
    this.status = 'low_stock';
  } else {
    this.status = 'in_stock';
  }
  next();
});

export const Product = mongoose.models.Product || mongoose.model('Product', productSchema);
