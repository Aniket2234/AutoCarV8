import { z } from "zod";

export const insertCustomerSchema = z.object({
  fullName: z.string().min(1, "Full name is required"),
  mobileNumber: z.string().min(10, "Mobile number must be at least 10 digits"),
  alternativeNumber: z.string().optional(),
  email: z.string().email("Invalid email address"),
  address: z.string().min(1, "Address is required"),
  city: z.string().min(1, "City is required"),
  taluka: z.string().min(1, "Taluka is required"),
  district: z.string().min(1, "District is required"),
  state: z.string().min(1, "State is required"),
  pinCode: z.string().min(6, "Pin code must be 6 digits"),
  referralSource: z.string().optional(),
});

const warrantyCardSchema = z.object({
  partId: z.string(),
  partName: z.string(),
  fileData: z.string(),
});

export const insertVehicleSchema = z.object({
  customerId: z.string().min(1, "Customer ID is required"),
  vehicleNumber: z.string().optional(),
  vehicleBrand: z.string().min(1, "Vehicle brand is required"),
  vehicleModel: z.string().min(1, "Vehicle model is required"),
  customModel: z.string().optional(),
  variant: z.enum(['Top', 'Base']).optional(),
  color: z.string().optional(),
  yearOfPurchase: z.number().optional(),
  vehiclePhoto: z.string().min(1, "Vehicle photo is required"),
  isNewVehicle: z.boolean().optional(),
  chassisNumber: z.string().optional(),
  selectedParts: z.array(z.string()).optional(),
  warrantyCards: z.array(warrantyCardSchema).optional(),
});

export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type InsertVehicle = z.infer<typeof insertVehicleSchema>;
