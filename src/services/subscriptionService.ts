import { supabase } from '../lib/supabase';
import { db, type Subscription, type PaymentRecord } from '../db/database';

export const subscriptionService = {
  async getSubscription(): Promise<Subscription | null> {
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*, payment_history(*)')
        .limit(1);

      if (!error && data && data.length > 0) {
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
      }
    } catch (e) {
      console.warn('Supabase subscription fetch error, fallback to local DB:', e);
    }
    const localList = await db.subscription.toArray();
    return localList[0] || null;
  },

  async saveSubscription(sub: Omit<Subscription, 'id' | 'paymentHistory'>): Promise<boolean> {
    const localList = await db.subscription.toArray();
    if (localList[0]?.id) {
      await db.subscription.update(localList[0].id, sub);
    } else {
      await db.subscription.add(sub as Subscription);
    }

    try {
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

      const existing = await this.getSubscription();
      if (existing?.id) {
        await supabase.from('subscriptions').update(payload).eq('id', existing.id);
      } else {
        await supabase.from('subscriptions').insert([payload]);
      }
    } catch (e) {
      console.warn('Supabase subscription save skipped/failed:', e);
    }
    return true;
  }
};
