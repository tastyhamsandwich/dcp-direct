import mongoose from 'mongoose';

const paymentMethodSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  type: {
    type: String,
    required: true,
    enum: ['credit_card', 'bank_account', 'cashapp', 'paypal']
  },
  last_four: {
    type: String,
    required: true
  },
  payment_token: {
    type: String,
    required: true
  },
  is_default: {
    type: Boolean,
    default: false
  },
  metadata: {
    brand: String,
    expiry_month: Number,
    expiry_year: Number,
    bank_name: String,
    account_type: String,
    cashapp_handle: String,
    paypal_email: String 
  },
  created_at: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true, // Automatically manage created_at and updated_at fields
  versionKey: false // Disable __v field
});

paymentMethodSchema.pre('save', async function() {
  if (this.is_default) {
    await (this as mongoose.Document).model('PaymentMethod').updateMany(
      { user_id: this.user_id, _id: { $ne: this._id } },
      { $set: { is_default: false } }
    );
  }
});

export const PaymentMethod = mongoose.model('PaymentMethod', paymentMethodSchema);
