import { describe, expect, it } from 'vitest';
import { createRazorpayFake } from '../helpers/razorpay';

describe('typed Razorpay fake', () => {
  it('returns order and payment fields required by payment verification', async () => {
    const razorpay = createRazorpayFake();
    const order = await razorpay.orders.create({ amount: 1000, currency: 'INR' });
    const payment = await razorpay.payments.fetch('pay_mock123');

    expect(order).toMatchObject({
      id: 'order_mock123',
      entity: 'order',
      amount: 1000,
      amount_paid: 0,
      amount_due: 1000,
      currency: 'INR',
      status: 'created',
    });
    expect(payment).toMatchObject({
      id: 'pay_mock123',
      entity: 'payment',
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      status: 'captured',
      captured: true,
    });
  });
});
