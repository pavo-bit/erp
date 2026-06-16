'use client';

import { useMyInvoices, apiCall } from '@/lib/student-api-hooks';
import { useEffect } from 'react';

declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function FeesPage() {
  const { data: invoices, mutate } = useMyInvoices();

  useEffect(() => {
    // Load Razorpay script
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const handlePayNow = async (invoice: any) => {
    try {
      // Create Razorpay order
      const orderResponse = await apiCall('/api/payments/create-order', 'POST', {
        invoiceId: invoice.id,
      });

      if (!orderResponse.success) {
        alert('Failed to create payment order');
        return;
      }

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY,
        amount: orderResponse.data.amount,
        currency: 'INR',
        name: 'SSVM College Square',
        description: `Payment for ${invoice.description || 'Fee'}`,
        order_id: orderResponse.data.id,
        handler: async function (response: any) {
          try {
            const verifyResponse = await apiCall('/api/payments/verify', 'POST', {
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
            });

            if (verifyResponse.success) {
              alert('Payment successful!');
              mutate(); // Refresh invoices
            } else {
              alert('Payment verification failed');
            }
          } catch (err) {
            alert('Payment verification error');
          }
        },
        prefill: {
          name: invoice.student?.name || '',
          email: '',
          contact: '',
        },
        theme: {
          color: '#3B82F6',
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      alert('Payment initiation failed');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PAID': return 'bg-green-100 text-green-800';
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      case 'OVERDUE': return 'bg-red-100 text-red-800';
      case 'PARTIAL': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const groupedInvoices = {
    overdue: invoices?.data?.filter((i: any) => i.status === 'OVERDUE') || [],
    pending: invoices?.data?.filter((i: any) => i.status === 'PENDING') || [],
    paid: invoices?.data?.filter((i: any) => i.status === 'PAID') || [],
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Fee Payment</h1>

      {/* Overdue Invoices */}
      {groupedInvoices.overdue.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-xl font-semibold text-red-600 mb-4">Overdue Payments</h2>
          <div className="space-y-4">
            {groupedInvoices.overdue.map((invoice: any) => (
              <div key={invoice.id} className="border border-red-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-gray-900">{invoice.type}</h3>
                      <span className={`px-3 py-1 text-xs font-medium rounded-full ${getStatusColor(invoice.status)}`}>
                        {invoice.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{invoice.description}</p>
                    <div className="flex gap-4 mt-2 text-sm">
                      <span className="text-gray-600">
                        Amount: <span className="font-semibold">₹{invoice.amount}</span>
                      </span>
                      <span className="text-gray-600">
                        Due: <span className="font-semibold">{new Date(invoice.dueDate).toLocaleDateString()}</span>
                      </span>
                      {invoice.fineAmount > 0 && (
                        <span className="text-red-600">
                          Fine: <span className="font-semibold">₹{invoice.fineAmount}</span>
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handlePayNow(invoice)}
                    className="ml-4 px-6 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors"
                  >
                    Pay Now
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pending Invoices */}
      {groupedInvoices.pending.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Pending Payments</h2>
          <div className="space-y-4">
            {groupedInvoices.pending.map((invoice: any) => (
              <div key={invoice.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-gray-900">{invoice.type}</h3>
                      <span className={`px-3 py-1 text-xs font-medium rounded-full ${getStatusColor(invoice.status)}`}>
                        {invoice.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{invoice.description}</p>
                    <div className="flex gap-4 mt-2 text-sm">
                      <span className="text-gray-600">
                        Amount: <span className="font-semibold">₹{invoice.amount}</span>
                      </span>
                      <span className="text-gray-600">
                        Due: <span className="font-semibold">{new Date(invoice.dueDate).toLocaleDateString()}</span>
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handlePayNow(invoice)}
                    className="ml-4 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
                  >
                    Pay Now
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Paid Invoices */}
      {groupedInvoices.paid.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Payment History</h2>
          <div className="space-y-4">
            {groupedInvoices.paid.map((invoice: any) => (
              <div key={invoice.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-gray-900">{invoice.type}</h3>
                      <span className={`px-3 py-1 text-xs font-medium rounded-full ${getStatusColor(invoice.status)}`}>
                        {invoice.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{invoice.description}</p>
                    <div className="flex gap-4 mt-2 text-sm text-gray-600">
                      <span>Amount: ₹{invoice.amount}</span>
                      <span>Paid: {new Date(invoice.paidDate).toLocaleDateString()}</span>
                      {invoice.receiptNo && <span>Receipt: {invoice.receiptNo}</span>}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!invoices?.data?.length && (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <p className="text-gray-500">No fee records found</p>
        </div>
      )}
    </div>
  );
}
