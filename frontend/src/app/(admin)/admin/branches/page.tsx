'use client';

import { useState } from 'react';
import PageWrapper from '@/components/layout/PageWrapper';
import { Table, Button, Input, Modal, Badge } from '@/components/ui';
import { apiClient } from '@/lib/apiClient';
import { useToast } from '@/context/ToastContext';
import { useAdminBranches, adminQueryKeys } from '@/hooks/queries/useAdminQueries';
import { queryClient } from '@/lib/queryClient';

interface Branch {
  id: string;
  name: string;
  location: string | null;
  contact_number: string | null;
  is_active: boolean;
  created_at: string;
}

export default function BranchesPage() {
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    contact_number: '',
    is_active: true,
  });
  const [formLoading, setFormLoading] = useState(false);

  const toast = useToast();

  // React Query hook — branches list cached 30 min
  const { data: branchesRaw = [], isLoading: branchesLoading } = useAdminBranches();
  const branches = branchesRaw as Branch[];
  const isBusy = branchesLoading || loading;

  const handleAddBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      await apiClient.post('/admin/branches', formData);
      toast.success('Branch created successfully');
      setShowAddModal(false);
      setFormData({ name: '', location: '', contact_number: '', is_active: true });
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.branches() });
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to create branch');
    } finally {
      setFormLoading(false);
    }
  };

  const handleEditBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBranch) return;
    setFormLoading(true);
    try {
      await apiClient.put(`/admin/branches/${selectedBranch.id}`, formData);
      toast.success('Branch updated successfully');
      setShowEditModal(false);
      setSelectedBranch(null);
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.branches() });
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update branch');
    } finally {
      setFormLoading(false);
    }
  };

  const columns = [
    {
      key: 'name',
      label: 'Name',
      render: (branch: Branch) => <span className="font-medium text-gray-900 dark:text-slate-100">{branch.name}</span>,
    },
    {
      key: 'location',
      label: 'Location',
      render: (branch: Branch) => branch.location || '-',
    },
    {
      key: 'contact_number',
      label: 'Contact',
      render: (branch: Branch) => branch.contact_number || '-',
    },
    {
      key: 'status',
      label: 'Status',
      render: (branch: Branch) => (
        <Badge variant={branch.is_active ? 'success' : 'danger'}>
          {branch.is_active ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (branch: Branch) => (
        <div className="flex items-center space-x-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setSelectedBranch(branch);
              setFormData({
                name: branch.name,
                location: branch.location || '',
                contact_number: branch.contact_number || '',
                is_active: branch.is_active,
              });
              setShowEditModal(true);
            }}
          >
            Edit
          </Button>
        </div>
      ),
    },
  ];

  return (
    <PageWrapper
      title="Branch Management"
      actions={<Button onClick={() => setShowAddModal(true)}>Add Branch</Button>}
    >
      <Table columns={columns} data={branches} loading={isBusy} emptyMessage="No branches found" />

      {/* Add Branch Modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Add New Branch" size="md">
        <form onSubmit={handleAddBranch}>
          <div className="space-y-4">
            <Input
              label="Branch Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
            <Input
              label="Location"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            />
            <Input
              label="Contact Number"
              value={formData.contact_number}
              onChange={(e) => setFormData({ ...formData, contact_number: e.target.value })}
            />
          </div>
          <div className="mt-6 flex justify-end space-x-3">
            <Button variant="outline" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={formLoading}>
              Add Branch
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Branch Modal */}
      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Branch" size="md">
        <form onSubmit={handleEditBranch}>
          <div className="space-y-4">
            <Input
              label="Branch Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
            <Input
              label="Location"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            />
            <Input
              label="Contact Number"
              value={formData.contact_number}
              onChange={(e) => setFormData({ ...formData, contact_number: e.target.value })}
            />
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded dark:border-slate-500"
              />
              <label htmlFor="is_active" className="text-sm font-medium text-gray-700 dark:text-slate-200">
                Active
              </label>
            </div>
          </div>
          <div className="mt-6 flex justify-end space-x-3">
            <Button variant="outline" onClick={() => setShowEditModal(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={formLoading}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>
    </PageWrapper>
  );
}
