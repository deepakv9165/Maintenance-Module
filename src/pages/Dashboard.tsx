import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
  FileText,
  CheckCircle,
  UserPlus,
  Wrench,
  ClipboardCheck,
  DollarSign,
  TrendingUp,
  AlertCircle
} from 'lucide-react';

interface DashboardStats {
  totalIndents: number;
  pendingApproval: number;
  approved: number;
  rejected: number;
  pendingAssignment: number;
  assigned: number;
  workPending: number;
  workCompleted: number;
  pendingInspection: number;
  inspected: number;
  pendingPayment: number;
  paymentDone: number;
  highPriority: number;
  mediumPriority: number;
  lowPriority: number;
}

interface RecentActivity {
  id: string;
  indent_no: string;
  machine_name: string;
  priority: string;
  status: string;
  created_at: string;
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalIndents: 0,
    pendingApproval: 0,
    approved: 0,
    rejected: 0,
    pendingAssignment: 0,
    assigned: 0,
    workPending: 0,
    workCompleted: 0,
    pendingInspection: 0,
    inspected: 0,
    pendingPayment: 0,
    paymentDone: 0,
    highPriority: 0,
    mediumPriority: 0,
    lowPriority: 0,
  });
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  async function fetchDashboardData() {
    try {
      const { data: indentsData } = await supabase.from('indents').select('*').order('created_at', { ascending: false });
      const { data: approvalsData } = await supabase.from('approvals').select('*');
      const { data: assignmentsData } = await supabase.from('technician_assignments').select('*');
      const { data: trackingData } = await supabase.from('work_tracking').select('*');
      const { data: inspectionsData } = await supabase.from('inspections').select('*');
      const { data: paymentsData } = await supabase.from('payments').select('*');

      const indents = indentsData || [];
      const approvals = approvalsData || [];
      const assignments = assignmentsData || [];
      const tracking = trackingData || [];
      const inspections = inspectionsData || [];
      const payments = paymentsData || [];

      const pendingApprovals = indents.filter(indent =>
        !approvals.find(a => a.indent_id === indent.id && a.approval_status !== 'Pending')
      );

      const approvedIndents = approvals.filter(a => a.approval_status === 'Approved');
      const rejectedIndents = approvals.filter(a => a.approval_status === 'Rejected');

      const approvedIds = approvedIndents.map(a => a.indent_id);
      const pendingAssignments = approvedIds.filter(id => !assignments.find(a => a.indent_id === id));

      const assignedIds = assignments.map(a => a.indent_id);
      const workPending = assignedIds.filter(id => {
        const work = tracking.find(t => t.indent_id === id);
        return !work || work.completion_status === 'Pending';
      });

      const completedWork = tracking.filter(t => t.completion_status === 'Completed');
      const completedIds = completedWork.map(t => t.indent_id);

      const pendingInspections = completedIds.filter(id => !inspections.find(i => i.indent_id === id));
      const doneInspections = inspections.filter(i => i.inspection_result === 'Done');
      const doneIds = doneInspections.map(i => i.indent_id);

      const pendingPayments = doneIds.filter(id => !payments.find(p => p.indent_id === id));

      setStats({
        totalIndents: indents.length,
        pendingApproval: pendingApprovals.length,
        approved: approvedIndents.length,
        rejected: rejectedIndents.length,
        pendingAssignment: pendingAssignments.length,
        assigned: assignments.length,
        workPending: workPending.length,
        workCompleted: completedWork.length,
        pendingInspection: pendingInspections.length,
        inspected: doneInspections.length,
        pendingPayment: pendingPayments.length,
        paymentDone: payments.length,
        highPriority: indents.filter(i => i.priority === 'High').length,
        mediumPriority: indents.filter(i => i.priority === 'Medium').length,
        lowPriority: indents.filter(i => i.priority === 'Low').length,
      });

      const recent = indents.slice(0, 10).map(indent => {
        const approval = approvals.find(a => a.indent_id === indent.id);
        const assignment = assignments.find(a => a.indent_id === indent.id);
        const work = tracking.find(t => t.indent_id === indent.id);
        const inspection = inspections.find(i => i.indent_id === indent.id);
        const payment = payments.find(p => p.indent_id === indent.id);

        let status = 'Pending Approval';
        if (payment) status = 'Payment Done';
        else if (inspection) status = 'Inspected';
        else if (work?.completion_status === 'Completed') status = 'Work Completed';
        else if (assignment) status = 'In Progress';
        else if (approval?.approval_status === 'Approved') status = 'Approved';
        else if (approval?.approval_status === 'Rejected') status = 'Rejected';

        return {
          id: indent.id,
          indent_no: indent.indent_no,
          machine_name: indent.machine_name,
          priority: indent.priority,
          status,
          created_at: indent.created_at,
        };
      });

      setRecentActivities(recent);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">Overview of maintenance system activity</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium">Total Indents</p>
              <p className="text-3xl font-bold mt-2">{stats.totalIndents}</p>
            </div>
            <div className="bg-blue-400 bg-opacity-30 p-3 rounded-lg">
              <FileText className="h-8 w-8" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-blue-100 text-sm">
            <TrendingUp className="h-4 w-4 mr-1" />
            <span>All time</span>
          </div>
        </div>

        <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-yellow-100 text-sm font-medium">Pending Approval</p>
              <p className="text-3xl font-bold mt-2">{stats.pendingApproval}</p>
            </div>
            <div className="bg-yellow-400 bg-opacity-30 p-3 rounded-lg">
              <AlertCircle className="h-8 w-8" />
            </div>
          </div>
          <div className="mt-4 text-yellow-100 text-sm">
            Requires attention
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm font-medium">Approved</p>
              <p className="text-3xl font-bold mt-2">{stats.approved}</p>
            </div>
            <div className="bg-green-400 bg-opacity-30 p-3 rounded-lg">
              <CheckCircle className="h-8 w-8" />
            </div>
          </div>
          <div className="mt-4 text-green-100 text-sm">
            Ready for assignment
          </div>
        </div>

        <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-red-100 text-sm font-medium">High Priority</p>
              <p className="text-3xl font-bold mt-2">{stats.highPriority}</p>
            </div>
            <div className="bg-red-400 bg-opacity-30 p-3 rounded-lg">
              <AlertCircle className="h-8 w-8" />
            </div>
          </div>
          <div className="mt-4 text-red-100 text-sm">
            Urgent items
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Workflow Progress</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="bg-blue-600 p-2 rounded-lg">
                  <UserPlus className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Technician Assignment</p>
                  <p className="text-sm text-gray-600">Pending: {stats.pendingAssignment}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-blue-600">{stats.assigned}</p>
                <p className="text-xs text-gray-600">Assigned</p>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="bg-yellow-600 p-2 rounded-lg">
                  <Wrench className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Work Tracking</p>
                  <p className="text-sm text-gray-600">In Progress: {stats.workPending}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-yellow-600">{stats.workCompleted}</p>
                <p className="text-xs text-gray-600">Completed</p>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="bg-purple-600 p-2 rounded-lg">
                  <ClipboardCheck className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Inspection</p>
                  <p className="text-sm text-gray-600">Pending: {stats.pendingInspection}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-purple-600">{stats.inspected}</p>
                <p className="text-xs text-gray-600">Inspected</p>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="bg-green-600 p-2 rounded-lg">
                  <DollarSign className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Payment</p>
                  <p className="text-sm text-gray-600">Pending: {stats.pendingPayment}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-green-600">{stats.paymentDone}</p>
                <p className="text-xs text-gray-600">Completed</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Priority Distribution</h2>
          <div className="space-y-6">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">High Priority</span>
                <span className="text-sm font-bold text-red-600">{stats.highPriority}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-red-600 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${(stats.highPriority / stats.totalIndents) * 100}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Medium Priority</span>
                <span className="text-sm font-bold text-yellow-600">{stats.mediumPriority}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-yellow-600 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${(stats.mediumPriority / stats.totalIndents) * 100}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Low Priority</span>
                <span className="text-sm font-bold text-green-600">{stats.lowPriority}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-green-600 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${(stats.lowPriority / stats.totalIndents) * 100}%` }}
                />
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-200">
              <h3 className="text-lg font-semibold mb-3">Status Summary</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
                  <p className="text-xs text-gray-600">Approved</p>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
                  <p className="text-xs text-gray-600">Rejected</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold">Recent Activity</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full hidden md:table">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Indent No.</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Machine Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Priority</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {recentActivities.map((activity) => (
                <tr key={activity.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{activity.indent_no}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{activity.machine_name}</td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      activity.priority === 'High' ? 'bg-red-100 text-red-700' :
                      activity.priority === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {activity.priority}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      activity.status === 'Payment Done' ? 'bg-green-100 text-green-700' :
                      activity.status === 'Rejected' ? 'bg-red-100 text-red-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {activity.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {new Date(activity.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="md:hidden divide-y divide-gray-200">
            {recentActivities.map((activity) => (
              <div key={activity.id} className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-semibold text-gray-900">{activity.indent_no}</p>
                    <p className="text-sm text-gray-600">{activity.machine_name}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    activity.priority === 'High' ? 'bg-red-100 text-red-700' :
                    activity.priority === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-green-100 text-green-700'
                  }`}>
                    {activity.priority}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    activity.status === 'Payment Done' ? 'bg-green-100 text-green-700' :
                    activity.status === 'Rejected' ? 'bg-red-100 text-red-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>
                    {activity.status}
                  </span>
                  <span className="text-sm text-gray-600">
                    {new Date(activity.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {recentActivities.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No recent activity found.
          </div>
        )}
      </div>
    </div>
  );
}
