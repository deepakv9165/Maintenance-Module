import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { DollarSign, Clock, Upload } from 'lucide-react';

interface PaymentData {
  id: string;
  indent_no: string;
  machine_name: string;
  department: string;
  problem: string;
  priority: string;
  approval_status: string;
  technician_name: string;
  phone_number: string;
  assigned_date: string;
  work_notes: string;
  additional_notes: string;
  completion_status: string;
  inspected_by: string;
  inspection_date: string;
  inspection_result: string;
  inspection_remarks: string;
  bill_no?: string;
  total_bill_amount?: number;
  bill_image_url?: string;
}

export default function Payment() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'pending' | 'completed'>('pending');
  const [pendingPayments, setPendingPayments] = useState<PaymentData[]>([]);
  const [completedPayments, setCompletedPayments] = useState<PaymentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<PaymentData | null>(null);
  const [uploading, setUploading] = useState(false);

  const [formData, setFormData] = useState({
    bill_no: '',
    total_bill_amount: '',
    bill_image_url: '',
  });

  useEffect(() => {
    fetchPaymentData();
  }, []);

  async function fetchPaymentData() {
    try {
      const { data: indentsData } = await supabase.from('indents').select('*').order('created_at', { ascending: false });
      const { data: approvalsData } = await supabase.from('approvals').select('*');
      const { data: assignmentsData } = await supabase.from('technician_assignments').select('*');
      const { data: trackingData } = await supabase.from('work_tracking').select('*');
      const { data: inspectionsData } = await supabase.from('inspections').select('*');
      const { data: paymentsData } = await supabase.from('payments').select('*');

      const doneInspectionIds = inspectionsData?.filter((i) => i.inspection_result === 'Done').map((i) => i.indent_id) || [];
      const doneIndents = indentsData?.filter((i) => doneInspectionIds.includes(i.id)) || [];

      const paymentList = doneIndents.map((indent) => {
        const approval = approvalsData?.find((a) => a.indent_id === indent.id);
        const assignment = assignmentsData?.find((a) => a.indent_id === indent.id);
        const tracking = trackingData?.find((t) => t.indent_id === indent.id);
        const inspection = inspectionsData?.find((i) => i.indent_id === indent.id);
        const payment = paymentsData?.find((p) => p.indent_id === indent.id);
        return {
          ...indent,
          approval_status: approval?.approval_status || '',
          technician_name: assignment?.technician_name || '',
          phone_number: assignment?.phone_number || '',
          assigned_date: assignment?.assigned_date || '',
          work_notes: assignment?.work_notes || '',
          additional_notes: tracking?.additional_notes || '',
          completion_status: tracking?.completion_status || '',
          inspected_by: inspection?.inspected_by || '',
          inspection_date: inspection?.inspection_date || '',
          inspection_result: inspection?.inspection_result || '',
          inspection_remarks: inspection?.remarks || '',
          bill_no: payment?.bill_no,
          total_bill_amount: payment?.total_bill_amount,
          bill_image_url: payment?.bill_image_url,
        };
      });

      setPendingPayments(paymentList.filter((p) => !p.bill_no));
      setCompletedPayments(paymentList.filter((p) => p.bill_no));
    } catch (error) {
      console.error('Error fetching payment data:', error);
    } finally {
      setLoading(false);
    }
  }

  function openModal(item: PaymentData) {
    setSelectedItem(item);
    setFormData({
      bill_no: '',
      total_bill_amount: '',
      bill_image_url: '',
    });
    setShowModal(true);
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `payment-bills/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('maintenance')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('maintenance')
        .getPublicUrl(filePath);

      setFormData({ ...formData, bill_image_url: publicUrl });
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Error uploading image');
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedItem || !user) return;

    try {
      const { error } = await supabase.from('payments').insert([
        {
          indent_id: selectedItem.id,
          bill_no: formData.bill_no,
          total_bill_amount: parseFloat(formData.total_bill_amount),
          bill_image_url: formData.bill_image_url,
          created_by: user.id,
        },
      ]);

      if (error) throw error;

      setShowModal(false);
      setSelectedItem(null);
      fetchPaymentData();
      alert('Payment processed successfully!');
    } catch (error) {
      console.error('Error processing payment:', error);
      alert('Error processing payment');
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  const currentItems = activeTab === 'pending' ? pendingPayments : completedPayments;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Payment Management</h1>
        <p className="text-gray-600 mt-1">Process payments for completed work</p>
      </div>

      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('pending')}
          className={`px-6 py-3 font-medium transition ${
            activeTab === 'pending'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Pending Payment ({pendingPayments.length})
          </div>
        </button>
        <button
          onClick={() => setActiveTab('completed')}
          className={`px-6 py-3 font-medium transition ${
            activeTab === 'completed'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Payment Done ({completedPayments.length})
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full hidden lg:table text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-900">Indent No.</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-900">Machine</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-900">Problem</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-900">Priority</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-900">Technician</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-900">Inspected By</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-900">Result</th>
                {activeTab === 'completed' && (
                  <>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-900">Bill No.</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-900">Amount</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-900">Bill</th>
                  </>
                )}
                {activeTab === 'pending' && (
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-900">Action</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {currentItems.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50 transition">
                  <td className="px-3 py-3 text-xs text-gray-900 font-medium">{item.indent_no}</td>
                  <td className="px-3 py-3 text-xs text-gray-900">{item.machine_name}</td>
                  <td className="px-3 py-3 text-xs text-gray-600 max-w-xs truncate">{item.problem}</td>
                  <td className="px-3 py-3 text-xs">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      item.priority === 'High' ? 'bg-red-100 text-red-700' :
                      item.priority === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {item.priority}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-xs text-gray-900">{item.technician_name}</td>
                  <td className="px-3 py-3 text-xs text-gray-900">{item.inspected_by}</td>
                  <td className="px-3 py-3 text-xs">
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                      {item.inspection_result}
                    </span>
                  </td>
                  {activeTab === 'completed' && (
                    <>
                      <td className="px-3 py-3 text-xs text-gray-900 font-medium">{item.bill_no}</td>
                      <td className="px-3 py-3 text-xs text-gray-900">${item.total_bill_amount?.toFixed(2)}</td>
                      <td className="px-3 py-3 text-xs">
                        {item.bill_image_url ? (
                          <a href={item.bill_image_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                            View
                          </a>
                        ) : (
                          <span className="text-gray-400">No image</span>
                        )}
                      </td>
                    </>
                  )}
                  {activeTab === 'pending' && (
                    <td className="px-3 py-3 text-xs">
                      <button
                        onClick={() => openModal(item)}
                        className="bg-green-600 text-white px-3 py-1 rounded-lg text-xs font-medium hover:bg-green-700 transition flex items-center gap-1"
                      >
                        <DollarSign className="h-3 w-3" />
                        Payment
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>

          <div className="lg:hidden divide-y divide-gray-200">
            {currentItems.map((item) => (
              <div key={item.id} className="p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold text-gray-900">{item.indent_no}</p>
                    <p className="text-sm text-gray-600">{item.machine_name}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    item.priority === 'High' ? 'bg-red-100 text-red-700' :
                    item.priority === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-green-100 text-green-700'
                  }`}>
                    {item.priority}
                  </span>
                </div>
                <div className="space-y-1 text-sm">
                  <p><span className="font-medium">Problem:</span> {item.problem}</p>
                  <p><span className="font-medium">Technician:</span> {item.technician_name}</p>
                  <p><span className="font-medium">Inspected By:</span> {item.inspected_by}</p>
                  <p>
                    <span className="font-medium">Result:</span>{' '}
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                      {item.inspection_result}
                    </span>
                  </p>
                  {activeTab === 'completed' && (
                    <>
                      <p><span className="font-medium">Bill No.:</span> {item.bill_no}</p>
                      <p><span className="font-medium">Amount:</span> ${item.total_bill_amount?.toFixed(2)}</p>
                      {item.bill_image_url && (
                        <p>
                          <a href={item.bill_image_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                            View Bill
                          </a>
                        </p>
                      )}
                    </>
                  )}
                </div>
                {activeTab === 'pending' && (
                  <button
                    onClick={() => openModal(item)}
                    className="w-full bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition flex items-center justify-center gap-2"
                  >
                    <DollarSign className="h-4 w-4" />
                    Process Payment
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {currentItems.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No {activeTab === 'pending' ? 'pending payments' : 'payment records'} found.
          </div>
        )}
      </div>

      {showModal && selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-semibold mb-4">Process Payment</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <p className="text-sm text-gray-600">Indent No:</p>
                <p className="font-medium">{selectedItem.indent_no}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bill No.
                </label>
                <input
                  type="text"
                  required
                  value={formData.bill_no}
                  onChange={(e) => setFormData({ ...formData, bill_no: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter bill number"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Total Bill Amount
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={formData.total_bill_amount}
                  onChange={(e) => setFormData({ ...formData, total_bill_amount: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter amount"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bill Image
                </label>
                <div className="flex items-center gap-4">
                  <label className="cursor-pointer bg-gray-100 px-4 py-2 rounded-lg hover:bg-gray-200 transition flex items-center gap-2">
                    <Upload className="h-5 w-5" />
                    {uploading ? 'Uploading...' : 'Upload Bill'}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      disabled={uploading}
                    />
                  </label>
                  {formData.bill_image_url && (
                    <span className="text-sm text-green-600">Image uploaded</span>
                  )}
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition"
                >
                  Submit Payment
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-300 transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
