import { supabase } from '../lib/supabase';
import type { Subscription, PaymentRecord } from '../db/database';

export const subscriptionService = {
  async getSubscription(): Promise<Subscription | null> {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*, payment_history(*)')
      .limit(1);

    if (error || !data || data.length === 0) {
      return null;
    }

    const row = data[0];
    const rawPayments = row.payment_history || [];

    const paymentHistory: PaymentRecord[] = rawPayments.map((p: any) => ({
      id: p.id,
      date: p.date,
      amount: p.amount,
      plan: p.plan,
      status: p.status as PaymentRecord['status'],
      invoiceUrl: p.invoice_url
    }));

    return {
      id: row.id,
      planName: row.plan_name,
      contactLimit: row.contact_limit,
      messageLimit: row.message_limit,
      contactsUsed: row.contacts_used,
      messagesUsed: row.messages_used,
      paymentHistory,
      status: row.status as Subscription['status'],
      renewalDate: row.renewal_date
    };
  },

  async saveSubscription(sub: Omit<Subscription, 'id' | 'paymentHistory'>): Promise<boolean> {
    const existing = await this.getSubscription();

    const payload = {
      plan_name: sub.planName,
      contact_limit: sub.contactLimit,
      message_limit: sub.messageLimit,
      contacts_used: sub.contactsUsed,
      messages_used: sub.messagesUsed,
      status: sub.status,
      renewal_date: sub.renewalDate,
      updated_at: new Date().toISOString()
    };

    if (existing?.id) {
      const { error } = await supabase.from('subscriptions').update(payload).eq('id', existing.id);
      if (error) {
        console.error('Error updating subscription in Supabase:', error);
        return false;
      }
    } else {
      const { error } = await supabase.from('subscriptions').insert([payload]);
      if (error) {
        console.error('Error inserting subscription in Supabase:', error);
        return false;
      }
    }
    return true;
  },

  async addPaymentRecord(subscriptionId: number, payment: PaymentRecord): Promise<boolean> {
    const { error } = await supabase.from('payment_history').insert({
      id: payment.id || `INV-${Date.now()}`,
      subscription_id: subscriptionId,
      date: payment.date,
      amount: payment.amount,
      plan: payment.plan,
      status: payment.status,
      invoice_url: payment.invoiceUrl
    });

    if (error) {
      console.error('Error adding payment history in Supabase:', error);
      return false;
    }
    return true;
  }
};
