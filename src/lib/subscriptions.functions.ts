import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const subscriptionSchema = z.object({
  planName: z.string(),
  planPrice: z.number(),
  userId: z.string(),
  userEmail: z.string(),
  userName: z.string(),
});

export const createSubscriptionPayment = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => subscriptionSchema.parse(data))
  .handler(async ({ data }) => {
    console.log("Starting subscription payment creation...", data);

    // 1. Get Asaas Config
    const { data: settings } = await supabaseAdmin
      .from("system_settings")
      .select("key, value");

    const asaasKeyRaw = settings?.find((s) => s.key === "asaas_api_key")?.value;
    const asaasEnvRaw = settings?.find((s) => s.key === "asaas_env")?.value || "sandbox";
    
    const asaasKey = typeof asaasKeyRaw === 'string' ? asaasKeyRaw : String(asaasKeyRaw);
    const asaasEnv = typeof asaasEnvRaw === 'string' ? asaasEnvRaw : String(asaasEnvRaw);

    if (!asaasKey || asaasKey === 'null') {
      throw new Error("Asaas API key not configured");
    }

    const ASAAS_URL = asaasEnv === "production" 
      ? "https://api.asaas.com/v3" 
      : "https://sandbox.asaas.com/api/v3";

    try {
      // 2. Search or Create Customer
      let customerId;
      const customerResp = await fetch(`${ASAAS_URL}/customers?email=${encodeURIComponent(data.userEmail)}`, {
        headers: { access_token: asaasKey },
      });
      const customers = await customerResp.json();

      if (customers.data && customers.data.length > 0) {
        customerId = customers.data[0].id;
      } else {
        const newCustomerResp = await fetch(`${ASAAS_URL}/customers`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            access_token: asaasKey,
          },
          body: JSON.stringify({
            name: data.userName,
            email: data.userEmail,
          }),
        });
        const newCustomer = await newCustomerResp.json();
        customerId = newCustomer.id;
      }

      // 3. Create PIX Charge
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 1);

      const paymentResp = await fetch(`${ASAAS_URL}/payments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          access_token: asaasKey,
        },
        body: JSON.stringify({
          customer: customerId,
          billingType: "PIX",
          value: data.planPrice,
          dueDate: dueDate.toISOString().split("T")[0],
          description: `Assinatura Plano ${data.planName} - The Royal Cut`,
          externalReference: `sub_${Date.now()}`,
        }),
      });

      const payment = await paymentResp.json();
      if (!payment.id) {
        throw new Error(payment.errors?.[0]?.description || "Failed to create Asaas payment");
      }

      // 4. Get PIX QR Code
      const pixResp = await fetch(`${ASAAS_URL}/payments/${payment.id}/pixQrCode`, {
        headers: { access_token: asaasKey },
      });
      const pixData = await pixResp.json();

      // 5. Insert Subscription as 'pending'
      const { data: subscription, error: subError } = await supabaseAdmin
        .from("subscriptions")
        .insert({
          client_id: data.userId,
          plan_name: data.planName,
          status: "pending",
          price_paid: data.planPrice,
          asaas_payment_id: payment.id,
          asaas_customer_id: customerId,
          started_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        } as any)
        .select()
        .single();

      if (subError) throw subError;

      return {
        encodedImage: pixData.encodedImage as string,
        payload: pixData.payload as string,
        expirationDate: pixData.expirationDate as string,
        subscriptionId: subscription.id as string,
        paymentId: payment.id as string
      };
    } catch (error: any) {
      console.error("Error creating subscription payment:", error);
      throw new Error(error.message || "Failed to process subscription");
    }
  });
