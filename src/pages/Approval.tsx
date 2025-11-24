import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { CheckCircle, XCircle, Clock } from 'lucide-react';

interface IndentWithApproval {
  id: string;
  indent_no: string;
  machine_name: string;
  department: string;
  problem: string;
  priority: string;
  expected_delivery_days: number;
  image_url: string | null;
  approval_id?: string;
  approval_status?: string;
  remarks?: string;
  approved_at?: string;
}

export default function Approval() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');
  const [pendingIndents, setPendingIndents] = useState<IndentWithApproval[]>([]);
  const [historyIndents, setHistoryIndents] = useState<IndentWithApproval[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIndent, setSelectedIndent] = useState<IndentWithApproval | null>(null);
  const [remarks, setRemarks] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'reject'>('approve');

  useEffect(() => {
    fetchIndents();
  }, []);

  async function fetchIndents() {
    try {
      const { data: indentsData, error: indentsError } = await supabase
        .from('indents')
        .select('*')
        .order('created_at', { ascending: false });

      if (indentsError) throw indentsError;

      const { data: approvalsData, error: approvalsError } = await supabase
        .from('approvals')
        .select('*');

      if (approvalsError) throw approvalsError;

      const indentsWithApprovals = indentsData.map((indent) => {
        const approval = approvalsData.find((a) => a.indent_id === indent.id);
        return {
          ...indent,
          approval_id: approval?.id,
          approval_status: approval?.approval_status || 'Pending',
          remarks: approval?.remarks,
          approved_at: approval?.approved_at,
        };
      });

      setPendingIndents(indentsWithApprovals.filter((i) => i.approval_status === 'Pending'));
      setHistoryIndents(indentsWithApprovals.filter((i) => i.approval_status !== 'Pending'));
    } catch (error) {
      console.error('Error fetching indents:', error);
    } finally {
      setLoading(false);
    }
  }

  function openModal(indent: IndentWithApproval, action: 'approve' | 'reject') {
    setSelectedIndent(indent);
    setActionType(action);
    setRemarks('');
    setShowModal(true);
  }

  async function handleSubmit() {
    if (!selectedIndent || !user) return;

    try {
      const status = actionType === 'approve' ? 'Approved' : 'Rejected';

      if (selectedIndent.approval_id) {
        const { error } = await supabase
          .from('approvals')
          .update({
            approval_status: status,
            remarks,
            approved_by: user.id,
          })
          .eq('id', selectedIndent.approval_id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from('approvals').insert([
          {
            indent_id: selectedIndent.id,
            approval_status: status,
            remarks,
            approved_by: user.id,
          },
        ]);

        if (error) throw error;
      }

      setShowModal(false);
      setSelectedIndent(null);
      setRemarks('');
      fetchIndents();
      alert(`Indent ${status.toLowerCase()} successfully!`);
    } catch (error) {
      console.error('Error updating approval:', error);
      alert('Error updating approval');
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  const currentIndents = activeTab === 'pending' ? pendingIndents : historyIndents;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Approval Management</h1>
        <p className="text-gray-600 mt-1">Review and approve maintenance indents</p>
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
            Pending ({pendingIndents.length})
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
          History ({historyIndents.length})
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full hidden md:table">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Indent No.</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Machine Name</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Department</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Problem</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Priority</th>
                {activeTab === 'history' && (
                  <>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Status</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Remarks</th>
                  </>
                )}
                {activeTab === 'pending' && (
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {currentIndents.map((indent) => (
                <tr key={indent.id} className="hover:bg-gray-50 transition">
                  <td className="px-6 py-4 text-sm text-gray-900 font-medium">{indent.indent_no}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{indent.machine_name}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{indent.department}</td>
                  <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">{indent.problem}</td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      indent.priority === 'High' ? 'bg-red-100 text-red-700' :
                      indent.priority === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {indent.priority}
                    </span>
                  </td>
                  {activeTab === 'history' && (
                    <>
                      <td className="px-6 py-4 text-sm">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          indent.approval_status === 'Approved' ? 'bg-green-100 text-green-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {indent.approval_status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{indent.remarks || '-'}</td>
                    </>
                  )}
                  {activeTab === 'pending' && (
                    <td className="px-6 py-4 text-sm">
                      <div className="flex gap-2">
                        <button
                          onClick={() => openModal(indent, 'approve')}
                          className="bg-green-600 text-white px-3 py-1 rounded-lg text-xs font-medium hover:bg-green-700 transition flex items-center gap-1"
                        >
                          <CheckCircle className="h-4 w-4" />
                          Approve
                        </button>
                        <button
                          onClick={() => openModal(indent, 'reject')}
                          className="bg-red-600 text-white px-3 py-1 rounded-lg text-xs font-medium hover:bg-red-700 transition flex items-center gap-1"
                        >
                          <XCircle className="h-4 w-4" />
                          Reject
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>

          <div className="md:hidden divide-y divide-gray-200">
            {currentIndents.map((indent) => (
              <div key={indent.id} className="p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold text-gray-900">{indent.indent_no}</p>
                    <p className="text-sm text-gray-600">{indent.machine_name}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    indent.priority === 'High' ? 'bg-red-100 text-red-700' :
                    indent.priority === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-green-100 text-green-700'
                  }`}>
                    {indent.priority}
                  </span>
                </div>
                <div className="space-y-1 text-sm">
                  <p><span className="font-medium">Department:</span> {indent.department}</p>
                  <p><span className="font-medium">Problem:</span> {indent.problem}</p>
                  {activeTab === 'history' && (
                    <>
                      <p>
                        <span className="font-medium">Status:</span>{' '}
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          indent.approval_status === 'Approved' ? 'bg-green-100 text-green-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {indent.approval_status}
                        </span>
                      </p>
                      <p><span className="font-medium">Remarks:</span> {indent.remarks || '-'}</p>
                    </>
                  )}
                </div>
                {activeTab === 'pending' && (
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => openModal(indent, 'approve')}
                      className="flex-1 bg-green-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition flex items-center justify-center gap-1"
                    >
                      <CheckCircle className="h-4 w-4" />
                      Approve
                    </button>
                    <button
                      onClick={() => openModal(indent, 'reject')}
                      className="flex-1 bg-red-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-red-700 transition flex items-center justify-center gap-1"
                    >
                      <XCircle className="h-4 w-4" />
                      Reject
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {currentIndents.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No {activeTab === 'pending' ? 'pending' : 'approved/rejected'} indents found.
          </div>
        )}
      </div>

      {showModal && selectedIndent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-semibold mb-4">
              {actionType === 'approve' ? 'Approve' : 'Reject'} Indent
            </h3>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600">Indent No:</p>
                <p className="font-medium">{selectedIndent.indent_no}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Machine Name:</p>
                <p className="font-medium">{selectedIndent.machine_name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Remarks
                </label>
                <textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter your remarks..."
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleSubmit}
                  className={`flex-1 text-white px-4 py-2 rounded-lg font-medium transition ${
                    actionType === 'approve'
                      ? 'bg-green-600 hover:bg-green-700'
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  Confirm {actionType === 'approve' ? 'Approval' : 'Rejection'}
                </button>
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-300 transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
