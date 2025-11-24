import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { UserPlus, Clock } from 'lucide-react';

interface IndentData {
  id: string;
  indent_no: string;
  machine_name: string;
  department: string;
  problem: string;
  priority: string;
  approval_status: string;
  remarks: string;
  technician_name?: string;
  phone_number?: string;
  assigned_date?: string;
  work_notes?: string;
}

export default function TechnicianAssign() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');
  const [pendingIndents, setPendingIndents] = useState<IndentData[]>([]);
  const [historyIndents, setHistoryIndents] = useState<IndentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedIndent, setSelectedIndent] = useState<IndentData | null>(null);

  const [formData, setFormData] = useState({
    technician_name: '',
    phone_number: '',
    assigned_date: new Date().toISOString().split('T')[0],
    work_notes: '',
  });

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
        .select('*')
        .eq('approval_status', 'Approved');

      if (approvalsError) throw approvalsError;

      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('technician_assignments')
        .select('*');

      if (assignmentsError) throw assignmentsError;

      const approvedIndentIds = approvalsData.map((a) => a.indent_id);
      const approvedIndents = indentsData.filter((i) => approvedIndentIds.includes(i.id));

      const indentsWithData = approvedIndents.map((indent) => {
        const approval = approvalsData.find((a) => a.indent_id === indent.id);
        const assignment = assignmentsData.find((a) => a.indent_id === indent.id);
        return {
          ...indent,
          approval_status: approval?.approval_status || 'Pending',
          remarks: approval?.remarks || '',
          technician_name: assignment?.technician_name,
          phone_number: assignment?.phone_number,
          assigned_date: assignment?.assigned_date,
          work_notes: assignment?.work_notes,
        };
      });

      setPendingIndents(indentsWithData.filter((i) => !i.technician_name));
      setHistoryIndents(indentsWithData.filter((i) => i.technician_name));
    } catch (error) {
      console.error('Error fetching indents:', error);
    } finally {
      setLoading(false);
    }
  }

  function openModal(indent: IndentData) {
    setSelectedIndent(indent);
    setFormData({
      technician_name: '',
      phone_number: '',
      assigned_date: new Date().toISOString().split('T')[0],
      work_notes: '',
    });
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedIndent || !user) return;

    try {
      const { error } = await supabase.from('technician_assignments').insert([
        {
          indent_id: selectedIndent.id,
          ...formData,
          assigned_by: user.id,
        },
      ]);

      if (error) throw error;

      setShowModal(false);
      setSelectedIndent(null);
      fetchIndents();
      alert('Technician assigned successfully!');
    } catch (error) {
      console.error('Error assigning technician:', error);
      alert('Error assigning technician');
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
        <h1 className="text-3xl font-bold text-gray-900">Technician Assignment</h1>
        <p className="text-gray-600 mt-1">Assign technicians to approved indents</p>
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
            Pending Assignment ({pendingIndents.length})
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
          Assigned History ({historyIndents.length})
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
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Status</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Remarks</th>
                {activeTab === 'history' && (
                  <>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Technician</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Phone</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Assigned Date</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Notes</th>
                  </>
                )}
                {activeTab === 'pending' && (
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Action</th>
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
                  <td className="px-6 py-4 text-sm">
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                      {indent.approval_status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{indent.remarks || '-'}</td>
                  {activeTab === 'history' && (
                    <>
                      <td className="px-6 py-4 text-sm text-gray-900">{indent.technician_name}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{indent.phone_number}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{indent.assigned_date}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{indent.work_notes || '-'}</td>
                    </>
                  )}
                  {activeTab === 'pending' && (
                    <td className="px-6 py-4 text-sm">
                      <button
                        onClick={() => openModal(indent)}
                        className="bg-blue-600 text-white px-4 py-1 rounded-lg text-xs font-medium hover:bg-blue-700 transition flex items-center gap-1"
                      >
                        <UserPlus className="h-4 w-4" />
                        Assign
                      </button>
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
                  <p>
                    <span className="font-medium">Status:</span>{' '}
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                      {indent.approval_status}
                    </span>
                  </p>
                  <p><span className="font-medium">Remarks:</span> {indent.remarks || '-'}</p>
                  {activeTab === 'history' && (
                    <>
                      <p><span className="font-medium">Technician:</span> {indent.technician_name}</p>
                      <p><span className="font-medium">Phone:</span> {indent.phone_number}</p>
                      <p><span className="font-medium">Assigned:</span> {indent.assigned_date}</p>
                      <p><span className="font-medium">Notes:</span> {indent.work_notes || '-'}</p>
                    </>
                  )}
                </div>
                {activeTab === 'pending' && (
                  <button
                    onClick={() => openModal(indent)}
                    className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition flex items-center justify-center gap-2"
                  >
                    <UserPlus className="h-4 w-4" />
                    Assign Technician
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {currentIndents.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No {activeTab === 'pending' ? 'pending' : 'assigned'} indents found.
          </div>
        )}
      </div>

      {showModal && selectedIndent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-semibold mb-4">Assign Technician</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <p className="text-sm text-gray-600">Indent No:</p>
                <p className="font-medium">{selectedIndent.indent_no}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Technician Name
                </label>
                <input
                  type="text"
                  required
                  value={formData.technician_name}
                  onChange={(e) => setFormData({ ...formData, technician_name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number
                </label>
                <input
                  type="tel"
                  required
                  value={formData.phone_number}
                  onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Assign Date
                </label>
                <input
                  type="date"
                  required
                  value={formData.assigned_date}
                  onChange={(e) => setFormData({ ...formData, assigned_date: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Work Notes / Comments
                </label>
                <textarea
                  value={formData.work_notes}
                  onChange={(e) => setFormData({ ...formData, work_notes: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Add any notes or comments..."
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition"
                >
                  Assign Technician
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
