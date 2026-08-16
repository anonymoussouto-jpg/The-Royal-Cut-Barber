import { createFileRoute } from '@tanstack/react-router';
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute('/api/public/asaas-webhook')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const authHeader = request.headers.get('asaas-access-token');
          
          const { data: secretSetting } = await supabase
            .from('system_settings')
            .select('value')
            .eq('key', 'asaas_webhook_secret')
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
            return new Response('Unauthorized', { status: 401 });
          }

          const body = await request.json();
          const event = body.event;
          const payment = body.payment;
          const orderId = payment.externalReference;

          if (!orderId) {
            return new Response('OK', { status: 200 });
          }

          if (event === 'PAYMENT_CONFIRMED' || event === 'PAYMENT_RECEIVED') {
            const updateData: any = {
              status: 'PAID',
              paid_at: new Date().toISOString(),
              net_value: payment.netValue || 0,
            };

            if (['PIX', 'CREDIT_CARD', 'BOLETO'].includes(payment.billingType)) {
              updateData.payment_method = payment.billingType;
            }

            // Try updating orders first
            const { data: order } = await supabase
              .from('orders')
              .update(updateData)
              .eq('id', orderId)
              .select()
              .maybeSingle();
            
            // If no order found, try appointments
            if (!order) {
              await supabase
                .from('appointments')
                .update({ 
                  status: 'confirmed',
                  payment_status: 'paid'
                })
                .eq('id', orderId);
            }
          } else if (event === 'PAYMENT_REFUNDED') {
            await supabase.from('orders').update({ status: 'REFUNDED' }).eq('id', orderId);
            await supabase.from('appointments').update({ status: 'cancelled', payment_status: 'refunded' }).eq('id', orderId);
          } else if (event === 'PAYMENT_OVERDUE') {
            await supabase.from('orders').update({ status: 'OVERDUE' }).eq('id', orderId);
            // We don't automatically cancel appointments for overdue, let admin decide
          }

          return new Response('OK', { status: 200 });
        } catch (error) {
          console.error("Webhook Error:", error);
          return new Response('Internal Server Error', { status: 500 });
        }
      }
    }
  }
});
