import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const Route = createFileRoute("/api/public/asaas-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const authHeader = request.headers.get("asaas-access-token");

          const { data: secretSetting } = await supabaseAdmin
            .from("system_settings")
            .select("value")
            .eq("key", "asaas_webhook_secret")
            .maybeSingle();

          let expectedSecret = "";
          if (secretSetting?.value) {
            try {
              expectedSecret = JSON.parse(secretSetting.value as string);
            } catch {
              expectedSecret = secretSetting.value as string;
            }
          }

          if (!authHeader || authHeader !== expectedSecret) {
            console.error("Invalid Asaas Webhook Token");
            return new Response("Unauthorized", { status: 401 });
          }

          const body = await request.json();
          const event = body.event;
          const payment = body.payment;
          const orderId = payment.externalReference;

          if (!orderId) {
            return new Response("OK", { status: 200 });
          }

          if (event === "PAYMENT_CONFIRMED" || event === "PAYMENT_RECEIVED") {
            const updateData: any = {
              status: "PAID",
              paid_at: new Date().toISOString(),
              net_value: payment.netValue || 0,
            };

            if (["PIX", "CREDIT_CARD", "BOLETO"].includes(payment.billingType)) {
              updateData.payment_method = payment.billingType;
            }

            // Try updating orders first where asaas_payment_id matches
            const { data: order } = await supabaseAdmin
              .from("orders")
              .update(updateData)
              .eq("asaas_payment_id", payment.id)
              .select()
              .maybeSingle();

            // Also try updating appointments where asaas_payment_id matches
            await supabaseAdmin
              .from("appointments")
              .update({
                status: "confirmed",
                payment_status: "paid",
              })
              .eq("asaas_payment_id", payment.id);

            // Update subscriptions and award points
            const { data: subscription } = await supabaseAdmin
              .from("subscriptions")
              .select("id, client_id, barber_points_monthly")
              .eq("asaas_payment_id", payment.id)
              .maybeSingle();

            if (subscription) {
              await supabaseAdmin
                .from("subscriptions")
                .update({ status: "active" })
                .eq("id", subscription.id);

              if (subscription.barber_points_monthly > 0) {
                const { data: profile } = await supabaseAdmin
                  .from("profiles")
                  .select("barber_points")
                  .eq("id", subscription.client_id)
                  .single();

                if (profile) {
                  await supabaseAdmin
                    .from("profiles")
                    .update({
                      barber_points: (profile.barber_points || 0) + subscription.barber_points_monthly
                    })
                    .eq("id", subscription.client_id);
                }
              }
            }

            console.log(`Payment confirmed for ID: ${payment.id}`);
          } else if (event === "PAYMENT_REFUNDED") {
            await supabaseAdmin.from("orders").update({ status: "REFUNDED" }).eq("asaas_payment_id", payment.id);
            await supabaseAdmin
              .from("appointments")
              .update({ status: "cancelled", payment_status: "refunded" })
              .eq("asaas_payment_id", payment.id);
          } else if (event === "PAYMENT_OVERDUE") {
            await supabaseAdmin.from("orders").update({ status: "OVERDUE" }).eq("asaas_payment_id", payment.id);
            await supabaseAdmin
              .from("appointments")
              .update({ status: "pending", payment_status: "overdue" })
              .eq("asaas_payment_id", payment.id);
          }

          return new Response("OK", { status: 200 });
        } catch (error) {
          console.error("Webhook Error:", error);
          return new Response("Internal Server Error", { status: 500 });
        }
      },
    },
  },
});
