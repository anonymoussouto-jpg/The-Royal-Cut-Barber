import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const createAsaasPayment = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({
        orderId: z.string(),
        amount: z.number(),
        customerName: z.string(),
        mobilePhone: z.string(),
        email: z.string().optional(),
        billingType: z.enum(["PIX", "CREDIT_CARD", "BOLETO"]),
        entityType: z.enum(["order", "appointment"]).default("order"),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    // We import supabaseAdmin inside the handler for server-side privileged access
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 1. Get Asaas Config from DB using supabaseAdmin to ensure we can read settings
    const { data: settings } = await supabaseAdmin.from("system_settings").select("key, value");

    const getSetting = (key: string) => {
      const setting = settings?.find((s) => s.key === key)?.value;
      if (!setting) return null;
      try {
        if (typeof setting === "string") return JSON.parse(setting);
      } catch (e) {
        // Fallback for non-JSON strings
      }
      return setting;
    };

    const apiKey = getSetting("asaas_api_key");
    const env = getSetting("asaas_env") || "sandbox";
    const baseUrl =
      env === "production" ? "https://api.asaas.com/v3" : "https://api-sandbox.asaas.com/v3";

    if (!apiKey) throw new Error("ASAAS_API_KEY not configured");

    const headers = {
      "Content-Type": "application/json",
      access_token: apiKey,
    };

    // 2. Find or Create Customer
    let customerId = "";
    const searchRes = await fetch(
      `${baseUrl}/customers?email=${data.email || ""}&mobilePhone=${data.mobilePhone}`,
      {
        method: "GET",
        headers,
      },
    );
    const searchData = await searchRes.json();

    if (searchData.data && searchData.data.length > 0) {
      customerId = searchData.data[0].id;
    } else {
      const createCustomerRes = await fetch(`${baseUrl}/customers`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          name: data.customerName,
          email: data.email || undefined,
          mobilePhone: data.mobilePhone,
        }),
      });
      const customer = await createCustomerRes.json();
      if (customer.errors) throw new Error(customer.errors[0].description);
      customerId = customer.id;
    }

    // 3. Create Payment
    const paymentRes = await fetch(`${baseUrl}/payments`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        customer: customerId,
        billingType: data.billingType,
        value: data.amount,
        dueDate: new Date(Date.now() + 86400000).toISOString().split("T")[0], // 1 day from now
        externalReference: data.orderId,
        description: `${data.entityType === "appointment" ? "Agendamento" : "Pedido"} ${data.orderId.substring(0, 8)} - The Royal Cut`,
      }),
    });
    const payment = await paymentRes.json();
    if (payment.errors) throw new Error(payment.errors[0].description);

    const paymentId = payment.id;
    let qrCode = null;

    // 4. Get PIX QR Code if PIX
    if (data.billingType === "PIX") {
      const qrCodeRes = await fetch(`${baseUrl}/payments/${paymentId}/pixQrCode`, {
        method: "GET",
        headers,
      });
      qrCode = await qrCodeRes.json();
    }

    // 5. Update Entity in Supabase
    if (data.entityType === "appointment") {
      await supabaseAdmin
        .from("appointments")
        .update({
          asaas_payment_id: paymentId,
          asaas_customer_id: customerId,
          payment_status: "pending",
        })
        .eq("id", data.orderId);
    } else {
      await supabaseAdmin
        .from("orders")
        .update({
          asaas_payment_id: paymentId,
          asaas_customer_id: customerId,
          payment_method: data.billingType,
        })
        .eq("id", data.orderId);
    }

    return {
      paymentId,
      encodedImage: qrCode?.encodedImage,
      payload: qrCode?.payload,
      expirationDate: qrCode?.expirationDate,
      invoiceUrl: payment.invoiceUrl,
    };
  });
