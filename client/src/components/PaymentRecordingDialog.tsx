import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { CreditCard, Smartphone, Banknote, Building, Receipt } from "lucide-react";

const paymentFormSchema = z.object({
  amount: z.number().min(0.01, "Amount must be greater than 0"),
  paymentMode: z.enum(['UPI', 'Cash', 'Card', 'Net Banking', 'Cheque'], {
    required_error: "Please select a payment mode",
  }),
  transactionId: z.string().optional(),
  notes: z.string().optional(),
});

type PaymentFormValues = z.infer<typeof paymentFormSchema>;

interface PaymentRecordingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: any;
}

const PAYMENT_MODES = [
  { value: 'UPI', label: 'UPI', icon: Smartphone, color: 'text-blue-600' },
  { value: 'Cash', label: 'Cash', icon: Banknote, color: 'text-green-600' },
  { value: 'Card', label: 'Debit/Credit Card', icon: CreditCard, color: 'text-purple-600' },
  { value: 'Net Banking', label: 'Net Banking', icon: Building, color: 'text-orange-600' },
  { value: 'Cheque', label: 'Cheque', icon: Receipt, color: 'text-gray-600' },
];

export function PaymentRecordingDialog({ open, onOpenChange, invoice }: PaymentRecordingDialogProps) {
  const { toast } = useToast();
  const [showRazorpay, setShowRazorpay] = useState(false);

  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: {
      amount: invoice?.dueAmount || 0,
      paymentMode: 'Cash',
      transactionId: '',
      notes: '',
    },
  });

  const paymentMode = form.watch('paymentMode');

  const recordPaymentMutation = useMutation({
    mutationFn: (data: PaymentFormValues) =>
      apiRequest('POST', `/api/invoices/${invoice._id}/payments`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
      toast({ title: "Payment recorded successfully" });
      onOpenChange(false);
      form.reset();
    },
    onError: (error: any) => {
      const errorMessage = error?.message || "Failed to record payment";
      toast({ 
        title: "Failed to record payment", 
        description: errorMessage,
        variant: "destructive" 
      });
    },
  });

  const onSubmit = (data: PaymentFormValues) => {
    recordPaymentMutation.mutate(data);
  };

  const handleRazorpayPayment = () => {
    setShowRazorpay(true);
    setTimeout(() => {
      toast({
        title: "Razorpay Integration (Demo)",
        description: "This is a dummy Razorpay integration. In production, this would process the payment.",
      });
      setShowRazorpay(false);
    }, 2000);
  };

  const selectedMode = PAYMENT_MODES.find(m => m.value === paymentMode);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl" data-testid="dialog-record-payment">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Record Payment
          </DialogTitle>
          <DialogDescription>
            Invoice: {invoice?.invoiceNumber} | Customer: {invoice?.customerName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-sm text-muted-foreground">Total Amount</p>
                  <p className="text-2xl font-bold">₹{invoice?.totalAmount.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Paid</p>
                  <p className="text-2xl font-bold text-green-600">₹{invoice?.paidAmount.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Due</p>
                  <p className="text-2xl font-bold text-red-600">₹{invoice?.dueAmount.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Separator />

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Amount</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        data-testid="input-payment-amount"
                      />
                    </FormControl>
                    <FormDescription>
                      Maximum amount: ₹{invoice?.dueAmount.toLocaleString()}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="paymentMode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Mode</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger data-testid="select-payment-mode">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {PAYMENT_MODES.map(mode => (
                          <SelectItem key={mode.value} value={mode.value}>
                            <div className="flex items-center gap-2">
                              <mode.icon className={`h-4 w-4 ${mode.color}`} />
                              {mode.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {selectedMode && selectedMode.value !== 'Cash' && (
                <FormField
                  control={form.control}
                  name="transactionId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Transaction ID / Reference Number</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder={
                            selectedMode.value === 'UPI' ? 'UPI Transaction ID' :
                            selectedMode.value === 'Card' ? 'Card Transaction ID' :
                            selectedMode.value === 'Cheque' ? 'Cheque Number' :
                            'Transaction Reference'
                          }
                          data-testid="input-transaction-id"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Additional payment notes..."
                        data-testid="textarea-payment-notes"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Separator />

              <div className="space-y-2">
                <p className="text-sm font-medium">Quick Payment Options</p>
                <div className="flex gap-2 flex-wrap">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => form.setValue('amount', invoice?.dueAmount || 0)}
                    data-testid="button-pay-full"
                  >
                    Pay Full Amount (₹{invoice?.dueAmount.toLocaleString()})
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => form.setValue('amount', Math.round((invoice?.dueAmount || 0) / 2))}
                    data-testid="button-pay-half"
                  >
                    Pay Half (₹{Math.round((invoice?.dueAmount || 0) / 2).toLocaleString()})
                  </Button>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <p className="text-sm font-medium">Online Payment (Demo)</p>
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full"
                  onClick={handleRazorpayPayment}
                  disabled={showRazorpay}
                  data-testid="button-razorpay"
                >
                  {showRazorpay ? (
                    "Processing with Razorpay..."
                  ) : (
                    <>
                      <CreditCard className="h-4 w-4 mr-2" />
                      Pay with Razorpay (Demo)
                    </>
                  )}
                </Button>
                <p className="text-xs text-muted-foreground">
                  Note: This is a dummy Razorpay integration for demonstration purposes
                </p>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  data-testid="button-cancel-payment"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={recordPaymentMutation.isPending}
                  data-testid="button-submit-payment"
                >
                  {recordPaymentMutation.isPending ? "Recording..." : "Record Payment"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
