import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { CheckCircle2, Car, User, MapPin } from "lucide-react";
import { getAllBrandNames, getModelsByBrand, getPartsByBrandAndModel } from "@shared/vehicleData";
import { ScreenshotProtection } from "@/components/ScreenshotProtection";

// States in India - predefined list
const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand",
  "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur",
  "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
  "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
  "Uttar Pradesh", "Uttarakhand", "West Bengal"
];

// Vehicle Brands from shared data
const VEHICLE_BRANDS = getAllBrandNames();

// Referral sources
const REFERRAL_SOURCES = [
  "Facebook",
  "Instagram",
  "WhatsApp",
  "Google Search",
  "Friend/Family Referral",
  "Billboard/Hoarding",
  "Newspaper/Magazine",
  "Radio/TV",
  "Direct Visit",
  "Other"
];

// Customer form schema
const customerFormSchema = z.object({
  fullName: z.string().min(1, "Name is required"),
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
  customReferralSource: z.string().optional(),
}).refine((data) => {
  if (data.referralSource === "Other" && !data.customReferralSource) {
    return false;
  }
  return true;
}, {
  message: "Please specify where you heard about us",
  path: ["customReferralSource"],
});

// Warranty card schema
const warrantyCardSchema = z.object({
  partId: z.string(),
  partName: z.string(),
  fileData: z.string(),
});

// Vehicle form schema
const vehicleFormSchema = z.object({
  vehicleNumber: z.string().optional(),
  vehicleBrand: z.string().min(1, "Vehicle brand is required"),
  vehicleModel: z.string().min(1, "Vehicle model is required"),
  customModel: z.string().optional(),
  variant: z.enum(['Top', 'Base']).optional(),
  color: z.string().optional(),
  customColor: z.string().optional(),
  yearOfPurchase: z.string().optional(),
  vehiclePhoto: z.string().min(1, "Vehicle photo is required"),
  isNewVehicle: z.string().min(1, "Please select vehicle condition"),
  chassisNumber: z.string().optional(),
  selectedParts: z.array(z.string()).default([]),
  warrantyCards: z.array(warrantyCardSchema).default([]),
}).refine((data) => {
  if (data.isNewVehicle === "true" && !data.chassisNumber) {
    return false;
  }
  return true;
}, {
  message: "Chassis number is required for new vehicles",
  path: ["chassisNumber"],
}).refine((data) => {
  if (data.isNewVehicle === "false" && !data.vehicleNumber) {
    return false;
  }
  return true;
}, {
  message: "Vehicle number is required for used vehicles",
  path: ["vehicleNumber"],
}).refine((data) => {
  if (data.vehicleModel === "Other" && !data.customModel) {
    return false;
  }
  return true;
}, {
  message: "Please specify the model name",
  path: ["customModel"],
}).refine((data) => {
  if (data.color === "Others" && !data.customColor) {
    return false;
  }
  return true;
}, {
  message: "Please specify the color",
  path: ["customColor"],
});

type CustomerFormData = z.infer<typeof customerFormSchema>;
type VehicleFormData = z.infer<typeof vehicleFormSchema>;

export default function CustomerRegistration() {
  const { toast } = useToast();
  const [step, setStep] = useState<"customer" | "otp" | "vehicle" | "success">("customer");
  const [customerId, setCustomerId] = useState<string>("");
  const [otp, setOtp] = useState("");
  const [otpInput, setOtpInput] = useState("");
  const [customerData, setCustomerData] = useState<any>(null);
  const [vehicleData, setVehicleData] = useState<any>(null);
  const [registeredVehicles, setRegisteredVehicles] = useState<any[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<string>("");
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [availableParts, setAvailableParts] = useState<any[]>([]);

  const customerForm = useForm<CustomerFormData>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: {
      fullName: "",
      mobileNumber: "",
      alternativeNumber: "",
      email: "",
      address: "",
      city: "",
      taluka: "",
      district: "",
      state: "",
      pinCode: "",
      referralSource: "",
      customReferralSource: "",
    },
  });

  const vehicleForm = useForm<VehicleFormData>({
    resolver: zodResolver(vehicleFormSchema),
    defaultValues: {
      vehicleNumber: "",
      vehicleBrand: "",
      vehicleModel: "",
      customModel: "",
      variant: undefined,
      color: "",
      customColor: "",
      yearOfPurchase: "",
      vehiclePhoto: "",
      isNewVehicle: "",
      chassisNumber: "",
      selectedParts: [],
      warrantyCards: [],
    },
  });

  // Watch custom model input for compatibility matching
  const customModelValue = vehicleForm.watch("customModel");

  // Fetch compatible products based on selected vehicle brand and model
  const { data: compatibleProducts = [] } = useQuery<any[]>({
    queryKey: ['/api/products', selectedBrand, selectedModel, customModelValue],
    queryFn: async () => {
      if (!selectedBrand || !selectedModel) {
        return [];
      }
      
      // Build the vehicle key based on whether a custom model is being used
      let vehicleKey: string;
      if (selectedModel === "Other" && customModelValue) {
        // For custom models under a known brand, use "Brand - CustomModel" format
        vehicleKey = `${selectedBrand} - ${customModelValue}`;
      } else {
        // For standard models, use "Brand - Model" format
        vehicleKey = `${selectedBrand} - ${selectedModel}`;
      }
      
      const response = await fetch('/api/products', {
        credentials: 'include',
      });
      if (!response.ok) return [];
      const allProducts = await response.json();
      
      // Filter products that have this exact vehicle in their modelCompatibility
      return allProducts.filter((product: any) => 
        product.modelCompatibility && 
        product.modelCompatibility.some((compat: string) => 
          compat === vehicleKey
        )
      );
    },
    enabled: !!selectedBrand && !!selectedModel && (selectedModel !== "Other" || !!customModelValue),
  });

  // Register customer mutation
  const registerCustomer = useMutation({
    mutationFn: async (data: CustomerFormData) => {
      console.log('📱 CUSTOMER REGISTRATION - STARTING');
      console.log('================================');
      console.log('Customer Data:', data);
      console.log('================================\n');
      
      const response = await apiRequest("POST", "/api/registration/customers", data);
      const result = await response.json();
      
      console.log('📱 CUSTOMER REGISTRATION - RESPONSE');
      console.log('================================');
      console.log('Customer ID:', result.customerId);
      console.log('OTP (Dev Mode):', result.otp || 'Not shown in production');
      console.log('WhatsApp OTP Sent:', result.whatsappSent ? '✅ SUCCESS' : '❌ FAILED');
      if (result.whatsappError) {
        console.error('WhatsApp Error:', result.whatsappError);
      }
      console.log('Response:', JSON.stringify(result, null, 2));
      console.log('================================\n');
      
      return result;
    },
    onSuccess: (data) => {
      setCustomerId(data.customerId);
      if (data.otp) setOtp(data.otp); // For development
      setStep("otp");
      
      const description = data.whatsappSent 
        ? "OTP sent to your WhatsApp" 
        : data.whatsappError 
          ? `OTP not sent via WhatsApp: ${data.whatsappError}` 
          : "Please check your mobile for the OTP";
      
      toast({
        title: "OTP Sent",
        description,
        variant: data.whatsappSent ? "default" : "destructive",
      });
    },
    onError: (error: any) => {
      console.error('❌ CUSTOMER REGISTRATION FAILED');
      console.error('Error:', error);
      
      toast({
        title: "Registration Failed",
        description: error.message || "Failed to register customer",
        variant: "destructive",
      });
    },
  });

  // Verify OTP mutation
  const verifyOTP = useMutation({
    mutationFn: async ({ customerId, otp }: { customerId: string; otp: string }) => {
      console.log('📱 OTP VERIFICATION - STARTING');
      console.log('================================');
      console.log('Customer ID:', customerId);
      console.log('OTP Entered:', otp);
      console.log('================================\n');
      
      const response = await apiRequest("POST", "/api/registration/verify-otp", { customerId, otp });
      const result = await response.json();
      
      console.log('📱 OTP VERIFICATION - RESPONSE');
      console.log('================================');
      console.log('Verification Success:', result.success ? '✅' : '❌');
      console.log('Customer Reference Code:', result.customer?.referenceCode);
      console.log('Response:', JSON.stringify(result, null, 2));
      console.log('================================\n');
      
      return result;
    },
    onSuccess: (data) => {
      setCustomerData(data.customer);
      setStep("vehicle");
      
      toast({
        title: "Verification Successful",
        description: "Now add your vehicle details",
      });
    },
    onError: (error: any) => {
      console.error('❌ OTP VERIFICATION FAILED');
      console.error('Error:', error);
      
      toast({
        title: "Verification Failed",
        description: error.message || "Invalid OTP",
        variant: "destructive",
      });
    },
  });

  // Register vehicle mutation
  const registerVehicle = useMutation({
    mutationFn: async (data: VehicleFormData) => {
      console.log('🚗 VEHICLE REGISTRATION - STARTING');
      console.log('================================');
      console.log('Vehicle Data:', data);
      console.log('================================\n');
      
      const response = await apiRequest("POST", "/api/registration/vehicles", {
        ...data,
        customerId,
        vehicleNumber: data.vehicleNumber || undefined,
        customModel: data.vehicleModel === "Other" ? data.customModel : undefined,
        yearOfPurchase: data.yearOfPurchase ? parseInt(data.yearOfPurchase) : undefined,
        isNewVehicle: data.isNewVehicle === "true",
        chassisNumber: data.isNewVehicle === "true" ? data.chassisNumber : undefined,
        selectedParts: data.selectedParts || [],
        warrantyCards: data.warrantyCards || [],
      });
      const result = await response.json();
      
      console.log('🚗 VEHICLE REGISTRATION - RESPONSE');
      console.log('================================');
      console.log('Vehicle ID:', result.vehicle?.vehicleId);
      console.log('Customer Reference Code:', result.customer?.referenceCode);
      console.log('Response:', JSON.stringify(result, null, 2));
      console.log('================================\n');
      
      return result;
    },
    onSuccess: (data) => {
      setRegisteredVehicles(prev => [...prev, data.vehicle]);
      setVehicleData(data.vehicle);
      setCustomerData(data.customer);
      
      // Invalidate vehicles cache for search functionality
      queryClient.invalidateQueries({ queryKey: ["/api/registration/vehicles"] });
      
      toast({
        title: "Vehicle Added!",
        description: `Vehicle registered successfully. Total vehicles: ${registeredVehicles.length + 1}. Click "Complete Registration" when done adding vehicles.`,
      });
      // Reset vehicle form for next vehicle
      vehicleForm.reset({
        vehicleNumber: "",
        vehicleBrand: "",
        vehicleModel: "",
        customModel: "",
        variant: undefined,
        color: "",
        yearOfPurchase: "",
        vehiclePhoto: "",
        isNewVehicle: "",
        chassisNumber: "",
        selectedParts: [],
        warrantyCards: [],
      });
      setSelectedBrand("");
      setSelectedModel("");
      setAvailableModels([]);
      setAvailableParts([]);
    },
    onError: (error: any) => {
      toast({
        title: "Vehicle Registration Failed",
        description: error.message || "Failed to register vehicle",
        variant: "destructive",
      });
    },
  });

  // Complete registration mutation - sends welcome message
  const completeRegistration = useMutation({
    mutationFn: async () => {
      console.log('✅ COMPLETING REGISTRATION - STARTING');
      console.log('================================');
      console.log('Customer ID:', customerId);
      console.log('================================\n');
      
      const response = await apiRequest("POST", "/api/registration/complete", { customerId });
      
      if (!response.ok) {
        console.error('❌ FAILED TO COMPLETE REGISTRATION');
        console.error('Status:', response.status);
        console.error('================================\n');
        throw new Error('Failed to complete registration. Please try again.');
      }
      
      const result = await response.json();
      
      console.log('✅ COMPLETING REGISTRATION - RESPONSE');
      console.log('================================');
      console.log('WhatsApp Welcome Sent:', result.whatsappSent ? '✅ SUCCESS' : '❌ FAILED');
      if (result.whatsappError) {
        console.error('WhatsApp Welcome Error:', result.whatsappError);
      }
      console.log('Response:', JSON.stringify(result, null, 2));
      console.log('================================\n');
      
      // Fetch complete customer data
      const customerResponse = await apiRequest("GET", `/api/registration/customers/${customerId}`);
      
      if (!customerResponse.ok) {
        console.error('❌ FAILED TO FETCH CUSTOMER DATA');
        console.error('Status:', customerResponse.status);
        console.error('================================\n');
        throw new Error('Failed to fetch complete customer data. Please refresh the page to view your details.');
      }
      
      const customerFullData = await customerResponse.json();
      
      console.log('📊 FETCHED COMPLETE CUSTOMER DATA');
      console.log('Customer:', customerFullData.customer);
      console.log('Vehicles:', customerFullData.vehicles);
      console.log('================================\n');
      
      return { ...result, ...customerFullData };
    },
    onSuccess: (data) => {
      // Update customer data with complete information
      if (data.customer) {
        setCustomerData(data.customer);
        // Set the last registered vehicle as vehicleData for display
        if (data.vehicles && data.vehicles.length > 0) {
          setVehicleData(data.vehicles[data.vehicles.length - 1]);
        }
      }
      
      setStep("success");
      
      const description = data.whatsappSent 
        ? `WhatsApp welcome message sent with your Customer ID!`
        : data.whatsappError 
          ? `Registration complete! (WhatsApp message failed: ${data.whatsappError})`
          : 'Registration complete!';
      
      toast({
        title: "Registration Successful!",
        description,
        variant: data.whatsappSent ? "default" : "destructive",
      });
    },
    onError: (error: any) => {
      console.error('❌ COMPLETE REGISTRATION FAILED');
      console.error('Error:', error);
      
      toast({
        title: "Failed to Complete",
        description: error.message || "Failed to complete registration",
        variant: "destructive",
      });
    },
  });

  const onCustomerSubmit = (data: CustomerFormData) => {
    registerCustomer.mutate(data);
  };

  const onOTPSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    verifyOTP.mutate({ customerId, otp: otpInput });
  };

  const onVehicleSubmit = (data: VehicleFormData) => {
    registerVehicle.mutate(data);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        vehicleForm.setValue("vehiclePhoto", reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleWarrantyCardUpload = (partId: string, partName: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const fileData = reader.result as string;
        const currentWarrantyCards = vehicleForm.getValues("warrantyCards") || [];
        const existingIndex = currentWarrantyCards.findIndex(wc => wc.partId === partId);
        
        if (existingIndex >= 0) {
          const updatedCards = [...currentWarrantyCards];
          updatedCards[existingIndex] = { partId, partName, fileData };
          vehicleForm.setValue("warrantyCards", updatedCards);
        } else {
          vehicleForm.setValue("warrantyCards", [...currentWarrantyCards, { partId, partName, fileData }]);
        }
        
        const fileType = file.type.includes('pdf') ? 'PDF' : 'Image';
        toast({
          title: "Warranty Card Uploaded",
          description: `${fileType} warranty card for ${partName} has been uploaded successfully.`,
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const removeWarrantyCard = (partId: string) => {
    const currentWarrantyCards = vehicleForm.getValues("warrantyCards") || [];
    const updatedCards = currentWarrantyCards.filter(wc => wc.partId !== partId);
    vehicleForm.setValue("warrantyCards", updatedCards);
    
    toast({
      title: "Warranty Card Removed",
      description: "The warranty card has been removed.",
    });
  };

  // Step configuration for progress bar
  const steps = [
    { id: 'customer', label: 'Step 1', title: 'Customer Info' },
    { id: 'otp', label: 'Step 2', title: 'OTP Verification' },
    { id: 'vehicle', label: 'Step 3', title: 'Vehicle Details' },
  ];

  const getCurrentStepIndex = () => {
    if (step === 'success') return 3;
    return steps.findIndex(s => s.id === step);
  };

  const currentStepIndex = getCurrentStepIndex();
  const progressPercentage = step === 'success' ? 100 : ((currentStepIndex + 1) / steps.length) * 100;

  return (
    <ScreenshotProtection enabled={step !== 'success'}>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4 sm:p-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2">
              Customer Registration
            </h1>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
              Register your vehicle with us for exclusive services and offers
            </p>
          </div>

          {/* Progress Bar - Only show if not on success page */}
          {step !== 'success' && (
            <div className="mb-8" data-testid="progress-bar-container">
              {/* Step Labels */}
              <div className="flex justify-between mb-3">
                {steps.map((s, index) => (
                  <div key={s.id} className="flex flex-col items-center flex-1">
                    <div className={`text-xs sm:text-sm font-semibold mb-1 ${
                      index <= currentStepIndex 
                        ? 'text-blue-600 dark:text-blue-400' 
                        : 'text-gray-400 dark:text-gray-500'
                    }`} data-testid={`step-label-${index + 1}`}>
                      {s.label}
                    </div>
                    <div className={`text-xs ${
                      index <= currentStepIndex 
                        ? 'text-gray-700 dark:text-gray-300' 
                        : 'text-gray-400 dark:text-gray-500'
                    }`}>
                      {s.title}
                    </div>
                  </div>
                ))}
              </div>

              {/* Progress Bar */}
              <div className="relative">
                {/* Background bar */}
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  {/* Filled portion */}
                  <div 
                    className="h-full bg-gradient-to-r from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 transition-all duration-500 ease-in-out"
                    style={{ width: `${progressPercentage}%` }}
                    data-testid="progress-bar-fill"
                  />
                </div>
                
                {/* Step circles */}
                <div className="absolute top-1/2 -translate-y-1/2 w-full flex justify-between px-1">
                  {steps.map((s, index) => (
                    <div
                      key={s.id}
                      className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
                        index <= currentStepIndex
                          ? 'bg-blue-600 dark:bg-blue-500 border-blue-600 dark:border-blue-500'
                          : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600'
                      }`}
                      data-testid={`step-circle-${index + 1}`}
                    >
                      {index < currentStepIndex && (
                        <CheckCircle2 className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                      )}
                      {index === currentStepIndex && (
                        <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-white" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

        {/* Step 1: Customer Information */}
        {step === "customer" && (
          <Card data-testid="card-customer-form">
            <CardHeader>
              <div className="flex items-center gap-2">
                <User className="w-6 h-6" />
                <CardTitle>Customer Information</CardTitle>
              </div>
              <CardDescription>Please provide your personal details</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...customerForm}>
                <form onSubmit={customerForm.handleSubmit(onCustomerSubmit)} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={customerForm.control}
                      name="fullName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name *</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Enter your full name" data-testid="input-full-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={customerForm.control}
                      name="mobileNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Mobile Number *</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="10-digit mobile number" data-testid="input-mobile" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={customerForm.control}
                      name="alternativeNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Alternative Number</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Optional" data-testid="input-alt-mobile" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={customerForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email Address *</FormLabel>
                          <FormControl>
                            <Input {...field} type="email" placeholder="your@email.com" data-testid="input-email" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={customerForm.control}
                      name="referralSource"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>How did you hear about us?</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-referral-source">
                                <SelectValue placeholder="Select referral source" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {REFERRAL_SOURCES.map((source) => (
                                <SelectItem key={source} value={source}>
                                  {source}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {customerForm.watch("referralSource") === "Other" && (
                      <FormField
                        control={customerForm.control}
                        name="customReferralSource"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Please specify *</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Where did you hear about us?" data-testid="input-custom-referral" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </div>

                  <FormField
                    control={customerForm.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Address *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Street address" data-testid="input-address" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={customerForm.control}
                      name="city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>City/Village *</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="City name" data-testid="input-city" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={customerForm.control}
                      name="taluka"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Taluka *</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Taluka name" data-testid="input-taluka" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={customerForm.control}
                      name="district"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>District *</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="District name" data-testid="input-district" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={customerForm.control}
                      name="state"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>State *</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-state">
                                <SelectValue placeholder="Select state" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {INDIAN_STATES.map((state) => (
                                <SelectItem key={state} value={state}>
                                  {state}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={customerForm.control}
                      name="pinCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Pin Code *</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="6-digit pin code" data-testid="input-pincode" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={registerCustomer.isPending}
                    data-testid="button-submit-customer"
                  >
                    {registerCustomer.isPending ? "Submitting..." : "Submit & Verify"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        )}

        {/* Step 2: OTP Verification */}
        {step === "otp" && (
          <Card data-testid="card-otp-verification">
            <CardHeader>
              <CardTitle>OTP Verification</CardTitle>
              <CardDescription>
                Enter the 6-digit OTP sent to your mobile
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={onOTPSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Enter OTP *</label>
                  <Input
                    type="text"
                    maxLength={6}
                    value={otpInput}
                    onChange={(e) => setOtpInput(e.target.value)}
                    placeholder="Enter 6-digit OTP"
                    className="text-center text-2xl tracking-widest"
                    data-testid="input-otp"
                  />
                </div>

                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={verifyOTP.isPending || otpInput.length !== 6}
                  data-testid="button-verify-otp"
                >
                  {verifyOTP.isPending ? "Verifying..." : "Verify OTP"}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Vehicle Information */}
        {step === "vehicle" && (
          <Card data-testid="card-vehicle-form">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Car className="w-6 h-6" />
                <CardTitle>Vehicle Information</CardTitle>
              </div>
              <CardDescription>
                {registeredVehicles.length > 0 
                  ? `You have added ${registeredVehicles.length} vehicle${registeredVehicles.length > 1 ? 's' : ''}. Add another vehicle or complete registration.`
                  : "Add your vehicle details. You can add multiple vehicles."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...vehicleForm}>
                <form onSubmit={vehicleForm.handleSubmit(onVehicleSubmit)} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={vehicleForm.control}
                      name="isNewVehicle"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Vehicle Condition *</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-vehicle-condition">
                                <SelectValue placeholder="Select condition" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="true">New Vehicle</SelectItem>
                              <SelectItem value="false">Used Vehicle</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {vehicleForm.watch("isNewVehicle") === "false" && (
                      <FormField
                        control={vehicleForm.control}
                        name="vehicleNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Vehicle Number *</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="MH12AB1234" className="uppercase" data-testid="input-vehicle-number" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    <FormField
                      control={vehicleForm.control}
                      name="vehicleBrand"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Vehicle Brand *</FormLabel>
                          <Select 
                            onValueChange={(value) => {
                              field.onChange(value);
                              setSelectedBrand(value);
                              const models = getModelsByBrand(value);
                              setAvailableModels(models.map(m => m.name));
                              vehicleForm.setValue("vehicleModel", "");
                              vehicleForm.setValue("selectedParts", []);
                              setSelectedModel("");
                              setAvailableParts([]);
                            }} 
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger data-testid="select-vehicle-brand">
                                <SelectValue placeholder="Select brand" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {VEHICLE_BRANDS.map((brand) => (
                                <SelectItem key={brand} value={brand}>
                                  {brand}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={vehicleForm.control}
                      name="vehicleModel"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Vehicle Model *</FormLabel>
                          <Select 
                            onValueChange={(value) => {
                              field.onChange(value);
                              setSelectedModel(value);
                              if (value !== "Other") {
                                const parts = getPartsByBrandAndModel(selectedBrand, value);
                                setAvailableParts(parts);
                              }
                            }} 
                            defaultValue={field.value}
                            disabled={!selectedBrand}
                          >
                            <FormControl>
                              <SelectTrigger data-testid="select-vehicle-model">
                                <SelectValue placeholder={selectedBrand ? "Select model" : "Select brand first"} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {availableModels.map((model) => (
                                <SelectItem key={model} value={model}>
                                  {model}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {vehicleForm.watch("vehicleModel") === "Other" && (
                      <FormField
                        control={vehicleForm.control}
                        name="customModel"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Specify Model Name *</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Enter model name" data-testid="input-custom-model" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    <FormField
                      control={vehicleForm.control}
                      name="variant"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Variant</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-variant">
                                <SelectValue placeholder="Select variant" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Top">Top</SelectItem>
                              <SelectItem value="Base">Base</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={vehicleForm.control}
                      name="color"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Color</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-color">
                                <SelectValue placeholder="Select color" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="White">White</SelectItem>
                              <SelectItem value="Black">Black</SelectItem>
                              <SelectItem value="Silver">Silver</SelectItem>
                              <SelectItem value="Grey">Grey</SelectItem>
                              <SelectItem value="Red">Red</SelectItem>
                              <SelectItem value="Blue">Blue</SelectItem>
                              <SelectItem value="Brown">Brown</SelectItem>
                              <SelectItem value="Orange">Orange</SelectItem>
                              <SelectItem value="Green">Green</SelectItem>
                              <SelectItem value="Yellow">Yellow</SelectItem>
                              <SelectItem value="Others">Others</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {vehicleForm.watch("color") === "Others" && (
                      <FormField
                        control={vehicleForm.control}
                        name="customColor"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Specify Color *</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Enter color name" data-testid="input-custom-color" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    <FormField
                      control={vehicleForm.control}
                      name="yearOfPurchase"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Year of Purchase</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="2023" type="number" data-testid="input-year" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {vehicleForm.watch("isNewVehicle") === "true" && (
                    <FormField
                      control={vehicleForm.control}
                      name="chassisNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Chassis Number *</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Enter chassis number" className="uppercase" data-testid="input-chassis-number" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {selectedModel && selectedModel !== "Other" && availableParts.length > 0 && (
                    <FormField
                      control={vehicleForm.control}
                      name="selectedParts"
                      render={() => (
                        <FormItem>
                          <div className="mb-4">
                            <FormLabel className="text-base">Parts Needed for Service/Replacement</FormLabel>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                              Select parts needed for this vehicle
                            </p>
                          </div>
                          <div className="grid grid-cols-1 gap-3 max-h-96 overflow-y-auto border rounded-lg p-4">
                            {availableParts.map((part) => (
                              <FormField
                                key={part.id}
                                control={vehicleForm.control}
                                name="selectedParts"
                                render={({ field }) => {
                                  const isSelected = field.value?.includes(part.id);
                                  const hasWarrantyCard = vehicleForm.watch("warrantyCards")?.some(wc => wc.partId === part.id);
                                  return (
                                    <FormItem
                                      key={part.id}
                                      className="flex flex-col space-y-2 p-3 border rounded-md bg-muted/30"
                                    >
                                      <div className="flex items-start space-x-3">
                                        <FormControl>
                                          <Checkbox
                                            checked={isSelected}
                                            onCheckedChange={(checked) => {
                                              if (checked) {
                                                field.onChange([...field.value, part.id]);
                                              } else {
                                                field.onChange(field.value?.filter((value) => value !== part.id));
                                                removeWarrantyCard(part.id);
                                              }
                                            }}
                                            data-testid={`checkbox-part-${part.id}`}
                                          />
                                        </FormControl>
                                        <div className="flex-1">
                                          <FormLabel className="text-sm font-normal cursor-pointer">
                                            {part.name}
                                            <span className="text-xs text-gray-500 dark:text-gray-400 block">
                                              {part.category}
                                            </span>
                                          </FormLabel>
                                        </div>
                                      </div>
                                    </FormItem>
                                  );
                                }}
                              />
                            ))}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  <FormField
                    control={vehicleForm.control}
                    name="vehiclePhoto"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Vehicle Photo *</FormLabel>
                        <FormControl>
                          <Input 
                            type="file" 
                            accept="image/*"
                            onChange={handlePhotoUpload}
                            data-testid="input-vehicle-photo"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {vehicleForm.watch("warrantyCards")?.length > 0 && (
                    <div className="border rounded-lg p-4 bg-muted/20">
                      <h3 className="text-sm font-semibold mb-3">Uploaded Warranty Cards ({vehicleForm.watch("warrantyCards").length})</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {vehicleForm.watch("warrantyCards").map((wc) => (
                          <div key={wc.partId} className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded border" data-testid={`warranty-card-${wc.partId}`}>
                            <div className="flex items-center gap-2">
                              <div className="w-10 h-10 bg-green-100 dark:bg-green-900 rounded flex items-center justify-center">
                                <span className="text-green-600 dark:text-green-400 text-xs">✓</span>
                              </div>
                              <div>
                                <p className="text-sm font-medium">{wc.partName}</p>
                                <p className="text-xs text-muted-foreground">Warranty card uploaded</p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeWarrantyCard(wc.partId)}
                              className="text-xs text-red-600 dark:text-red-400 hover:underline"
                              data-testid={`button-remove-warranty-display-${wc.partId}`}
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="space-y-3">
                    <Button 
                      type="submit" 
                      className="w-full" 
                      disabled={registerVehicle.isPending}
                      data-testid="button-submit-vehicle"
                    >
                      {registerVehicle.isPending ? "Adding Vehicle..." : registeredVehicles.length > 0 ? "Add Another Vehicle" : "Add Vehicle"}
                    </Button>
                    {registeredVehicles.length > 0 && (
                      <Button 
                        type="button"
                        variant="outline"
                        className="w-full" 
                        onClick={() => completeRegistration.mutate()}
                        disabled={completeRegistration.isPending}
                        data-testid="button-complete-registration"
                      >
                        {completeRegistration.isPending ? "Completing..." : `Complete Registration (${registeredVehicles.length} vehicle${registeredVehicles.length > 1 ? 's' : ''} added)`}
                      </Button>
                    )}
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        )}

        {/* Step 4: Success Message */}
        {step === "success" && customerData && vehicleData && (
          <Card data-testid="card-success" className="bg-green-50 dark:bg-green-900/20">
            <CardHeader>
              <div className="flex items-center justify-center gap-2">
                <CheckCircle2 className="w-12 h-12 text-green-600 dark:text-green-400" />
              </div>
              <CardTitle className="text-center text-2xl">Registration Successful!</CardTitle>
              <CardDescription className="text-center">
                Your vehicle has been registered successfully
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg space-y-3">
                <div className="text-center">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Your Reference ID</p>
                  <p className="text-3xl font-bold text-blue-600 dark:text-blue-400" data-testid="text-reference-code">
                    {customerData.referenceCode}
                  </p>
                </div>
                
                <div className="border-t pt-4 mt-4">
                  <h3 className="font-semibold mb-2">Customer Details:</h3>
                  <p data-testid="text-customer-name">Name: {customerData.fullName}</p>
                  <p data-testid="text-customer-mobile">Mobile: {customerData.mobileNumber}</p>
                  <p data-testid="text-customer-email">Email: {customerData.email}</p>
                </div>

                <div className="border-t pt-4 mt-4">
                  <h3 className="font-semibold mb-2">Vehicle Details:</h3>
                  <p data-testid="text-vehicle-number">
                    {vehicleData.vehicleNumber 
                      ? `Registration Number: ${vehicleData.vehicleNumber}` 
                      : vehicleData.chassisNumber 
                        ? `Chassis Number: ${vehicleData.chassisNumber}`
                        : 'Vehicle Number: Not provided'}
                  </p>
                  <p data-testid="text-vehicle-info">{vehicleData.vehicleBrand} {vehicleData.vehicleModel}</p>
                  {vehicleData.yearOfPurchase && <p>Year: {vehicleData.yearOfPurchase}</p>}
                </div>
              </div>

              <div className="text-center text-sm text-gray-600 dark:text-gray-400">
                <p>You will receive SMS, WhatsApp, and Email confirmations shortly.</p>
                <p className="mt-2">We'll notify you about offers, services & discounts soon!</p>
              </div>

              <Button 
                onClick={() => {
                  // Reset all state
                  setStep("customer");
                  setCustomerId("");
                  setOtp("");
                  setOtpInput("");
                  setCustomerData(null);
                  setVehicleData(null);
                  setRegisteredVehicles([]);
                  setSelectedBrand("");
                  setSelectedModel("");
                  setAvailableModels([]);
                  setAvailableParts([]);
                  
                  // Reset forms
                  customerForm.reset();
                  vehicleForm.reset();
                  
                  console.log('✅ Form reset - Ready for new customer registration');
                }} 
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-6 text-lg shadow-lg"
                data-testid="button-register-another"
              >
                Register Another Customer
              </Button>
            </CardContent>
          </Card>
        )}
        </div>
      </div>
    </ScreenshotProtection>
  );
}
