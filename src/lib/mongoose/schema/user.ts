import mongoose from 'mongoose';
import { User } from '../../../game/types';

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    validate: {
      validator: function(v) {
        return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(v);
      },
      message: props => `${props.value} is not a valid email!`
    }
  },
  password: {
    type: String,
    required: true,
    minlength: 6,
    select: false // Exclude password from queries by default
  },
  role: {
    type: String,
    enum: ['USER', 'ADMIN', 'MODERATOR', 'CREATOR'],
    default: 'USER'
  },
  level: {
    type: Number,
    default: 1,
    min: 1
  },
  exp: {
    type: Number,
    default: 0,
    min: 0
  },
  avatar: {
    type: String,
    default: 'https://example.com/default-avatar.png', // Placeholder URL for default avatar
    validate: {
      validator: function(v) {
        return /^(avatar-[a-z0-9\-]+.*\.(?:png|jpg|jpeg|gif))$/.test(v);
      },
      message: props => `${props.value} is not a valid URL for an avatar!`
    }
  },
  balance: {
    type: Number,
    default: 0,
    min: 0
  },
  active: {
    type: Boolean,
    default: true
  },
  first_name: {
    type: String,
    trim: true,
    default: ''
  },
  last_name: {
    type: String,
    trim: true,
    default: ''
  },
  phone: {
    type: String,
    trim: true,
    validate: {
      validator: function(v) {
        return /^(\+\d{1,3}[- ]?)?\d{10}$/.test(v); // Basic phone number validation
      },
      message: props => `${props.value} is not a valid phone number!`
    }
  },
  address_street1: {
    type: String,
    trim: true,
    default: ''
  },
  address_street2: {
    type: String,
    trim: true,
    default: ''
  },
  address_city: {
    type: String,
    trim: true,
    default: ''
  },
  address_state: {
    type: String,
    trim: true,
    default: ''
  },
  address_zip: {
    type: String,
    trim: true,
    validate: {
      validator: function(v) {
        return /^\d{5}(-\d{4})?$/.test(v); // Basic US ZIP code validation
      },
      message: props => `${props.value} is not a valid ZIP code!`
    }
  },
  address_country: {
    type: String,
    trim: true,
    default: 'US' // Default to US, can be changed later
  },
  reset_password_token: {
    type: String,
    default: ''
  },
  reset_password_expires: {
    type: Date,
    default: null
  },
  default_payment_method_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PaymentMethod',
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true, // Automatically manage created_at and updated_at fields
  versionKey: false // Disable __v field
});

const UserModel = mongoose.model<User & mongoose.Document>('User', userSchema);

export default UserModel;
export { userSchema, UserModel };