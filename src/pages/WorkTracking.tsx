import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Wrench, Clock } from 'lucide-react';

interface WorkData {
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
  additional_notes?: string;
  completion_status?: string;
}

const completionStatuses = ['Completed', 'Terminate', 'Pending', 'Hold'];

export default function WorkTracking() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');
  const [pendingWork, setPendingWork] = useState<WorkData[]>([]);
  const [historyWork, setHistoryWork] = useState<WorkData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedWork, setSelectedWork] = useState<WorkData | null>(null);

  const [formData, setFormData] = useState({
    additional_notes: '',
    completion_status: 'Pending',
  });

  useEffect(() => {
    fetchWorkData();
  }, []);

  async function fetchWorkData() {
    try {
      const { data: indentsData, error: indentsError } = await supabase
        .from('indents')
        .select('*')
        .order('created_at', { ascending: false });

      if (indentsError) throw indentsError;

      const { data: approvalsData } = await supabase
        .from('approvals')
        .select('*')
        .eq('approval_status', 'Approved');

      const { data: assignmentsData } = await supabase
        .from('technician_assignments')
        .select('*');

      const { data: trackingData } = await supabase
        .from('work_tracking')
        .select('*');

      const assignedIndentIds = assignmentsData?.map((a) => a.indent_id) || [];
      const assignedIndents = indentsData.filter((i) => assignedIndentIds.includes(i.id));

      const workList = assignedIndents.map((indent) => {
        const approval = approvalsData?.find((a) => a.indent_id === indent.id);
        const assignment = assignmentsData?.find((a) => a.indent_id === indent.id);
        const tracking = trackingData?.find((t) => t.indent_id === indent.id);
        return {
          ...indent,
          approval_status: approval?.approval_status || 'Pending',
          technician_name: assignment?.technician_name || '',
          phone_number: assignment?.phone_number || '',
          assigned_date: assignment?.assigned_date || '',
          work_notes: assignment?.work_notes || '',
          additional_notes: tracking?.additional_notes,
          completion_status: tracking?.completion_status,
        };
      });

      setPendingWork(workList.filter((w) => !w.completion_status || w.completion_status === 'Pending'));
      setHistoryWork(workList.filter((w) => w.completion_status && w.completion_status !== 'Pending'));
    } catch (error) {
      console.error('Error fetching work data:', error);
    } finally {
      setLoading(false);
    }
  }

  function openModal(work: WorkData) {
    setSelectedWork(work);
    setFormData({
      additional_notes: work.additional_notes || '',
      completion_status: work.completion_status || 'Pending',
    });
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedWork || !user) return;

    try {
      const { data: existingTracking } = await supabase
        .from('work_tracking')
        .select('*')
        .eq('indent_id', selectedWork.id)
        .maybeSingle();

      if (existingTracking) {
        const { error } = await supabase
          .from('work_tracking')
          .update({
            ...formData,
            updated_by: user.id,
          })
          .eq('indent_id', selectedWork.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from('work_tracking').insert([
          {
            indent_id: selectedWork.id,
            ...formData,
            updated_by: user.id,
          },
        ]);

        if (error) throw error;
      }

      setShowModal(false);
      setSelectedWork(null);
      fetchWorkData();
      alert('Work tracking updated successfully!');
    } catch (error) {
      console.error('Error updating work tracking:', error);
      alert('Error updating work tracking');
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  const currentWork = activeTab === 'pending' ? pendingWork : historyWork;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Work Tracking</h1>
        <p className="text-gray-600 mt-1">Track and update work progress</p>
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
            Pending Work ({pendingWork.length})
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
          Work History ({historyWork.length})
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full hidden md:table">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-4 text-left text-sm font-semibold text-gray-900">Indent No.</th>
                <th className="px-4 py-4 text-left text-sm font-semibold text-gray-900">Machine</th>
                <th className="px-4 py-4 text-left text-sm font-semibold text-gray-900">Department</th>
                <th className="px-4 py-4 text-left text-sm font-semibold text-gray-900">Problem</th>
                <th className="px-4 py-4 text-left text-sm font-semibold text-gray-900">Priority</th>
                <th className="px-4 py-4 text-left text-sm font-semibold text-gray-900">Technician</th>
                <th className="px-4 py-4 text-left text-sm font-semibold text-gray-900">Phone</th>
                <th className="px-4 py-4 text-left text-sm font-semibold text-gray-900">Assigned</th>
                {activeTab === 'history' && (
                  <>
                    <th className="px-4 py-4 text-left text-sm font-semibold text-gray-900">Additional Notes</th>
                    <th className="px-4 py-4 text-left text-sm font-semibold text-gray-900">Status</th>
                  </>
                )}
                {activeTab === 'pending' && (
                  <th className="px-4 py-4 text-left text-sm font-semibold text-gray-900">Action</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {currentWork.map((work) => (
                <tr key={work.id} className="hover:bg-gray-50 transition">
                  <td className="px-4 py-4 text-sm text-gray-900 font-medium">{work.indent_no}</td>
                  <td className="px-4 py-4 text-sm text-gray-900">{work.machine_name}</td>
                  <td className="px-4 py-4 text-sm text-gray-900">{work.department}</td>
                  <td className="px-4 py-4 text-sm text-gray-600 max-w-xs truncate">{work.problem}</td>
                  <td className="px-4 py-4 text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      work.priority === 'High' ? 'bg-red-100 text-red-700' :
                      work.priority === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {work.priority}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-900">{work.technician_name}</td>
                  <td className="px-4 py-4 text-sm text-gray-900">{work.phone_number}</td>
                  <td className="px-4 py-4 text-sm text-gray-900">{work.assigned_date}</td>
                  {activeTab === 'history' && (
                    <>
                      <td className="px-4 py-4 text-sm text-gray-600 max-w-xs truncate">{work.additional_notes || '-'}</td>
                      <td className="px-4 py-4 text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          work.completion_status === 'Completed' ? 'bg-green-100 text-green-700' :
                          work.completion_status === 'Terminate' ? 'bg-red-100 text-red-700' :
                          work.completion_status === 'Hold' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {work.completion_status}
                        </span>
                      </td>
                    </>
                  )}
                  {activeTab === 'pending' && (
                    <td className="px-4 py-4 text-sm">
                      <button
                        onClick={() => openModal(work)}
                        className="bg-blue-600 text-white px-3 py-1 rounded-lg text-xs font-medium hover:bg-blue-700 transition flex items-center gap-1"
                      >
                        <Wrench className="h-4 w-4" />
                        Update
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>

          <div className="md:hidden divide-y divide-gray-200">
            {currentWork.map((work) => (
              <div key={work.id} className="p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold text-gray-900">{work.indent_no}</p>
                    <p className="text-sm text-gray-600">{work.machine_name}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    work.priority === 'High' ? 'bg-red-100 text-red-700' :
                    work.priority === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-green-100 text-green-700'
                  }`}>
                    {work.priority}
                  </span>
                </div>
                <div className="space-y-1 text-sm">
                  <p><span className="font-medium">Department:</span> {work.department}</p>
                  <p><span className="font-medium">Problem:</span> {work.problem}</p>
                  <p><span className="font-medium">Technician:</span> {work.technician_name}</p>
                  <p><span className="font-medium">Phone:</span> {work.phone_number}</p>
                  <p><span className="font-medium">Assigned:</span> {work.assigned_date}</p>
                  {activeTab === 'history' && (
                    <>
                      <p><span className="font-medium">Additional Notes:</span> {work.additional_notes || '-'}</p>
                      <p>
                        <span className="font-medium">Status:</span>{' '}
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          work.completion_status === 'Completed' ? 'bg-green-100 text-green-700' :
                          work.completion_status === 'Terminate' ? 'bg-red-100 text-red-700' :
                          work.completion_status === 'Hold' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {work.completion_status}
                        </span>
                      </p>
                    </>
                  )}
                </div>
                {activeTab === 'pending' && (
                  <button
                    onClick={() => openModal(work)}
                    className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition flex items-center justify-center gap-2"
                  >
                    <Wrench className="h-4 w-4" />
                    Update Work
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {currentWork.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No {activeTab === 'pending' ? 'pending' : 'completed'} work found.
          </div>
        )}
      </div>

      {showModal && selectedWork && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-semibold mb-4">Update Work Status</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <p className="text-sm text-gray-600">Indent No:</p>
                <p className="font-medium">{selectedWork.indent_no}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Technician:</p>
                <p className="font-medium">{selectedWork.technician_name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Additional Notes
                </label>
                <textarea
                  value={formData.additional_notes}
                  onChange={(e) => setFormData({ ...formData, additional_notes: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Add any additional notes..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Completion Status
                </label>
                <select
                  required
                  value={formData.completion_status}
                  onChange={(e) => setFormData({ ...formData, completion_status: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {completionStatuses.map((status) => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition"
                >
                  Update Status
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
