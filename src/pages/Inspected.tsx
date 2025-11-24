import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { ClipboardCheck, Clock } from 'lucide-react';

interface InspectionData {
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
  inspected_by?: string;
  inspection_date?: string;
  inspection_result?: string;
  inspection_remarks?: string;
}

export default function Inspected() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');
  const [pendingInspections, setPendingInspections] = useState<InspectionData[]>([]);
  const [historyInspections, setHistoryInspections] = useState<InspectionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InspectionData | null>(null);

  const [formData, setFormData] = useState({
    inspected_by: '',
    inspection_date: new Date().toISOString().split('T')[0],
    inspection_result: 'Done',
    remarks: '',
  });

  useEffect(() => {
    fetchInspectionData();
  }, []);

  async function fetchInspectionData() {
    try {
      const { data: indentsData } = await supabase.from('indents').select('*').order('created_at', { ascending: false });
      const { data: approvalsData } = await supabase.from('approvals').select('*');
      const { data: assignmentsData } = await supabase.from('technician_assignments').select('*');
      const { data: trackingData } = await supabase.from('work_tracking').select('*');
      const { data: inspectionsData } = await supabase.from('inspections').select('*');

      const completedWorkIds = trackingData?.filter((t) => t.completion_status === 'Completed').map((t) => t.indent_id) || [];
      const completedIndents = indentsData?.filter((i) => completedWorkIds.includes(i.id)) || [];

      const inspectionList = completedIndents.map((indent) => {
        const approval = approvalsData?.find((a) => a.indent_id === indent.id);
        const assignment = assignmentsData?.find((a) => a.indent_id === indent.id);
        const tracking = trackingData?.find((t) => t.indent_id === indent.id);
        const inspection = inspectionsData?.find((i) => i.indent_id === indent.id);
        return {
          ...indent,
          approval_status: approval?.approval_status || '',
          technician_name: assignment?.technician_name || '',
          phone_number: assignment?.phone_number || '',
          assigned_date: assignment?.assigned_date || '',
          work_notes: assignment?.work_notes || '',
          additional_notes: tracking?.additional_notes || '',
          completion_status: tracking?.completion_status || '',
          inspected_by: inspection?.inspected_by,
          inspection_date: inspection?.inspection_date,
          inspection_result: inspection?.inspection_result,
          inspection_remarks: inspection?.remarks,
        };
      });

      setPendingInspections(inspectionList.filter((i) => !i.inspection_result));
      setHistoryInspections(inspectionList.filter((i) => i.inspection_result));
    } catch (error) {
      console.error('Error fetching inspection data:', error);
    } finally {
      setLoading(false);
    }
  }

  function openModal(item: InspectionData) {
    setSelectedItem(item);
    setFormData({
      inspected_by: '',
      inspection_date: new Date().toISOString().split('T')[0],
      inspection_result: 'Done',
      remarks: '',
    });
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedItem || !user) return;

    try {
      const { error } = await supabase.from('inspections').insert([
        {
          indent_id: selectedItem.id,
          ...formData,
          created_by: user.id,
        },
      ]);

      if (error) throw error;

      setShowModal(false);
      setSelectedItem(null);
      fetchInspectionData();
      alert('Inspection completed successfully!');
    } catch (error) {
      console.error('Error creating inspection:', error);
      alert('Error creating inspection');
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  const currentItems = activeTab === 'pending' ? pendingInspections : historyInspections;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Inspection Management</h1>
        <p className="text-gray-600 mt-1">Inspect completed maintenance work</p>
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
            Pending Inspection ({pendingInspections.length})
          </div>
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-6 py-3 font-medium transition ${
            activeTab === 'history'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Inspection History ({historyInspections.length})
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
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-900">Phone</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-900">Status</th>
                {activeTab === 'history' && (
                  <>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-900">Inspected By</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-900">Date</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-900">Result</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-900">Remarks</th>
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
                  <td className="px-3 py-3 text-xs text-gray-900">{item.phone_number}</td>
                  <td className="px-3 py-3 text-xs">
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                      {item.completion_status}
                    </span>
                  </td>
                  {activeTab === 'history' && (
                    <>
                      <td className="px-3 py-3 text-xs text-gray-900">{item.inspected_by}</td>
                      <td className="px-3 py-3 text-xs text-gray-900">{item.inspection_date}</td>
                      <td className="px-3 py-3 text-xs">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          item.inspection_result === 'Done' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {item.inspection_result}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-xs text-gray-600">{item.inspection_remarks || '-'}</td>
                    </>
                  )}
                  {activeTab === 'pending' && (
                    <td className="px-3 py-3 text-xs">
                      <button
                        onClick={() => openModal(item)}
                        className="bg-blue-600 text-white px-3 py-1 rounded-lg text-xs font-medium hover:bg-blue-700 transition flex items-center gap-1"
                      >
                        <ClipboardCheck className="h-3 w-3" />
                        Inspect
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
                  <p><span className="font-medium">Phone:</span> {item.phone_number}</p>
                  <p>
                    <span className="font-medium">Status:</span>{' '}
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                      {item.completion_status}
                    </span>
                  </p>
                  {activeTab === 'history' && (
                    <>
                      <p><span className="font-medium">Inspected By:</span> {item.inspected_by}</p>
                      <p><span className="font-medium">Date:</span> {item.inspection_date}</p>
                      <p>
                        <span className="font-medium">Result:</span>{' '}
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          item.inspection_result === 'Done' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {item.inspection_result}
                        </span>
                      </p>
                      <p><span className="font-medium">Remarks:</span> {item.inspection_remarks || '-'}</p>
                    </>
                  )}
                </div>
                {activeTab === 'pending' && (
                  <button
                    onClick={() => openModal(item)}
                    className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition flex items-center justify-center gap-2"
                  >
                    <ClipboardCheck className="h-4 w-4" />
                    Inspect Work
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {currentItems.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No {activeTab === 'pending' ? 'pending inspections' : 'inspection history'} found.
          </div>
        )}
      </div>

      {showModal && selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-semibold mb-4">Inspect Work</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <p className="text-sm text-gray-600">Indent No:</p>
                <p className="font-medium">{selectedItem.indent_no}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Inspected By
                </label>
                <input
                  type="text"
                  required
                  value={formData.inspected_by}
                  onChange={(e) => setFormData({ ...formData, inspected_by: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Inspection Date
                </label>
                <input
                  type="date"
                  required
                  value={formData.inspection_date}
                  onChange={(e) => setFormData({ ...formData, inspection_date: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Inspection Result
                </label>
                <select
                  required
                  value={formData.inspection_result}
                  onChange={(e) => setFormData({ ...formData, inspection_result: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="Done">Done</option>
                  <option value="Not Done">Not Done</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Remarks
                </label>
                <textarea
                  value={formData.remarks}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Add inspection remarks..."
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition"
                >
                  Submit Inspection
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
