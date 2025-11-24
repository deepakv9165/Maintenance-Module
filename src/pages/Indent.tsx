import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Plus, FileText, Upload } from 'lucide-react';

interface Indent {
  id: string;
  indent_no: string;
  machine_name: string;
  department: string;
  problem: string;
  priority: string;
  expected_delivery_days: number;
  input_date: string;
  image_url: string | null;
}

const departments = ['Production', 'Maintenance', 'Quality', 'Logistics', 'Engineering'];

export default function Indent() {
  const { user } = useAuth();
  const [indents, setIndents] = useState<Indent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [formData, setFormData] = useState({
    machine_name: '',
    department: '',
    problem: '',
    priority: 'Medium',
    expected_delivery_days: 1,
    image_url: '',
  });

  useEffect(() => {
    fetchIndents();
  }, []);

  async function fetchIndents() {
    try {
      const { data, error } = await supabase
        .from('indents')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setIndents(data || []);
    } catch (error) {
      console.error('Error fetching indents:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `indent-images/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('maintenance')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('maintenance')
        .getPublicUrl(filePath);

      setFormData({ ...formData, image_url: publicUrl });
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Error uploading image');
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    try {
      const indentNo = await generateIndentNo();

      const { error } = await supabase.from('indents').insert([
        {
          indent_no: indentNo,
          ...formData,
          created_by: user?.id,
        },
      ]);

      if (error) throw error;

      setFormData({
        machine_name: '',
        department: '',
        problem: '',
        priority: 'Medium',
        expected_delivery_days: 1,
        image_url: '',
      });
      setShowForm(false);
      fetchIndents();
      alert('Indent created successfully!');
    } catch (error) {
      console.error('Error creating indent:', error);
      alert('Error creating indent');
    }
  }

  async function generateIndentNo(): Promise<string> {
    const { data, error } = await supabase.rpc('generate_indent_no');
    if (error) throw error;
    return data;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Indent Management</h1>
          <p className="text-gray-600 mt-1">Create and manage maintenance indents</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition flex items-center gap-2"
        >
          <Plus className="h-5 w-5" />
          New Indent
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Create New Indent
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Machine Name
                </label>
                <input
                  type="text"
                  required
                  value={formData.machine_name}
                  onChange={(e) => setFormData({ ...formData, machine_name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Department
                </label>
                <select
                  required
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select Department</option>
                  {departments.map((dept) => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Problem Description
                </label>
                <textarea
                  required
                  value={formData.problem}
                  onChange={(e) => setFormData({ ...formData, problem: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Priority
                </label>
                <select
                  required
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Expected Delivery Days
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={formData.expected_delivery_days}
                  onChange={(e) => setFormData({ ...formData, expected_delivery_days: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Problem Image
                </label>
                <div className="flex items-center gap-4">
                  <label className="cursor-pointer bg-gray-100 px-4 py-2 rounded-lg hover:bg-gray-200 transition flex items-center gap-2">
                    <Upload className="h-5 w-5" />
                    {uploading ? 'Uploading...' : 'Upload Image'}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      disabled={uploading}
                    />
                  </label>
                  {formData.image_url && (
                    <span className="text-sm text-green-600">Image uploaded successfully</span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition"
              >
                Create Indent
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg font-medium hover:bg-gray-300 transition"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

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
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Expected Days</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Image</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {indents.map((indent) => (
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
                  <td className="px-6 py-4 text-sm text-gray-900">{indent.expected_delivery_days}</td>
                  <td className="px-6 py-4 text-sm">
                    {indent.image_url ? (
                      <a href={indent.image_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        View
                      </a>
                    ) : (
                      <span className="text-gray-400">No image</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="md:hidden divide-y divide-gray-200">
            {indents.map((indent) => (
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
                  <p><span className="font-medium">Expected Days:</span> {indent.expected_delivery_days}</p>
                  {indent.image_url && (
                    <p>
                      <a href={indent.image_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        View Image
                      </a>
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {indents.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No indents found. Create your first indent to get started.
          </div>
        )}
      </div>
    </div>
  );
}
