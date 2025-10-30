import mongoose from 'mongoose';

const registrationCustomerSchema = new mongoose.Schema({
  referenceCode: { type: String, required: true, unique: true },
  fullName: { type: String, required: true },
  mobileNumber: { type: String, required: true, unique: true },
  alternativeNumber: { type: String, default: null },
  email: { type: String, required: true },
  address: { type: String, required: true },
  city: { type: String, required: true },
  taluka: { type: String, required: true },
  district: { type: String, required: true },
  state: { type: String, required: true },
  pinCode: { type: String, required: true },
  referralSource: { type: String, default: null },
  isVerified: { type: Boolean, default: false },
  otp: { type: String, default: null },
  otpExpiresAt: { type: Date, default: null },
  registeredBy: { type: String, default: null },
  registeredByRole: { type: String, default: null },
}, { timestamps: true });

export const RegistrationCustomer = mongoose.models.RegistrationCustomer || mongoose.model('RegistrationCustomer', registrationCustomerSchema);
