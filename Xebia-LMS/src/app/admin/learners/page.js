"use client";

import React, { useState } from "react";
import Card from "../../../components/common/Card";
import Button from "../../../components/common/Button";
import Input from "../../../components/common/Input";
import Modal, { ConfirmModal } from "../../../components/common/Modal";
import { TableSkeleton } from "../../../components/common/Skeleton";
import ErrorState from "../../../components/common/ErrorState";
import useToast from "../../../hooks/useToast";
import PageHeader from "../../../components/common/PageHeader";
import SearchFilterBar from "../../../components/common/SearchFilterBar";
import DataTable from "../../../components/common/DataTable";
import StatusBadge from "../../../components/common/StatusBadge";
import MetricCard from "../../../components/common/MetricCard";
import {
  useCreateLearnerCredential,
  useDeleteLearnerCredential,
  useGetLearnerCredentials,
} from "../../../hooks/useLearnerCredentials";
import { Copy, KeyRound, Plus, ShieldCheck, Trash2, UserPlus, Users } from "lucide-react";

export default function AdminLearnersPage() {
  const toast = useToast();
  const { data: credentials, isLoading, isError, refetch } = useGetLearnerCredentials();
  const createMutation = useCreateLearnerCredential();
  const deleteMutation = useDeleteLearnerCredential();

  const [modalOpen, setModalOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [createdCredential, setCreatedCredential] = useState(null);
  
  // Search & Filters State
  const [search, setSearch] = useState("");
  const [batchFilter, setBatchFilter] = useState("All");

  const [formErrors, setFormErrors] = useState({});
  const [form, setForm] = useState({
    learnerName: "",
    email: "",
    username: "",
    password: "",
    tenantId: "xebia-enterprise",
    batchId: "batch-a",
    batchName: "Batch A",
    forcePasswordReset: true,
  });

  const openCreate = () => {
    setForm({
      learnerName: "",
      email: "",
      username: "",
      password: "",
      tenantId: "xebia-enterprise",
      batchId: "batch-a",
      batchName: "Batch A",
      forcePasswordReset: true,
    });
    setCreatedCredential(null);
    setFormErrors({});
    setModalOpen(true);
  };

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const validateForm = () => {
    const errors = {};
    if (!form.learnerName.trim()) errors.learnerName = "Learner name is required";
    if (!form.email.trim()) {
      errors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      errors.email = "Use a valid learner email";
    }
    if (form.password && form.password.trim().length < 8) {
      errors.password = "Temporary password must be at least 8 characters";
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = (event) => {
    event.preventDefault();
    if (!validateForm()) return;

    createMutation.mutate(
      {
        learnerName: form.learnerName,
        email: form.email,
        username: form.username,
        password: form.password,
        tenantId: form.tenantId,
        batchId: form.batchId,
        batchName: form.batchName,
        forcePasswordReset: form.forcePasswordReset,
      },
      {
        onSuccess: (credential) => {
          setCreatedCredential(credential);
          toast.addToast("Learner credential created successfully.", "success");
        },
        onError: (error) => {
          toast.addToast(`Credential creation failed: ${error.message}`, "error");
        },
      }
    );
  };

  const copyCredential = async () => {
    if (!createdCredential) return;
    const text = [
      `Learner: ${createdCredential.learnerName}`,
      `Email: ${createdCredential.email}`,
      `Username: ${createdCredential.username}`,
      `Temporary password: ${createdCredential.temporaryPassword}`,
      `Tenant: ${createdCredential.tenantId}`,
      `Batch: ${createdCredential.batchId}`,
    ].join("\n");
    await navigator.clipboard.writeText(text);
    toast.addToast("Credential details copied.", "success");
  };

  const openDelete = (id) => {
    setDeletingId(id);
    setDeleteOpen(true);
  };

  const handleDeleteConfirm = () => {
    deleteMutation.mutate(deletingId, {
      onSuccess: () => {
        toast.addToast("Learner credential removed.", "success");
        setDeleteOpen(false);
      },
      onError: (error) => {
        toast.addToast(`Deletion failed: ${error.message}`, "error");
      },
    });
  };

  // Filter learners list
  const filteredCredentials = (credentials || []).filter((cred) => {
    const matchesSearch =
      cred.learnerName.toLowerCase().includes(search.toLowerCase()) ||
      cred.email.toLowerCase().includes(search.toLowerCase()) ||
      cred.username.toLowerCase().includes(search.toLowerCase());
    const matchesBatch = batchFilter === "All" || cred.batchId === batchFilter;
    return matchesSearch && matchesBatch;
  });

  const columns = [
    {
      header: "Learner Details",
      key: "learnerName",
      render: (row) => (
        <div>
          <span className="font-bold text-foreground block">{row.learnerName}</span>
          <span className="text-[10px] text-text-muted font-semibold block">{row.email}</span>
        </div>
      )
    },
    {
      header: "Username",
      key: "username",
      render: (row) => <span className="font-semibold text-foreground/80 block">{row.username}</span>
    },
    {
      header: "IAM Tenant ID",
      key: "tenantId",
      render: (row) => <span className="text-[10px] bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded font-mono font-semibold block w-fit">{row.tenantId}</span>
    },
    {
      header: "Batch Group",
      key: "batch",
      render: (row) => <span className="font-bold text-foreground/80 text-[10px] block uppercase">{row.batch || row.batchId}</span>
    },
    {
      header: "Credential Status",
      key: "status",
      render: (row) => <StatusBadge status={row.status || "ACTIVE"} />
    },
    {
      header: "Actions",
      key: "actions",
      render: (row) => (
        <div className="flex items-center justify-end">
          <Button variant="outline" size="sm" onClick={() => openDelete(row.id)}>
            <Trash2 className="w-3.5 h-3.5 text-rose-600" />
          </Button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Learner Credentials"
        description="Provision learner IAM accounts with tenant, batch group, and forced password reset security controls."
        breadcrumbs={[
          { label: "Admin Console", href: "/admin" },
          { label: "Learners", href: "/admin/learners" }
        ]}
        actions={
          <Button variant="primary" size="md" className="flex items-center gap-1.5 shadow-sm" onClick={openCreate}>
            <UserPlus className="w-4.5 h-4.5" />
            <span>Create Credential</span>
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard
          title="Active Learner Logins"
          value={credentials?.length || 0}
          icon={Users}
          description="Provisioned user accounts in tenant"
        />
        <MetricCard
          title="Password Hash Storage"
          value="BCrypt"
          icon={KeyRound}
          description="Default secure hash strategy"
        />
        <MetricCard
          title="Default RBAC Role"
          value="LEARNER"
          icon={ShieldCheck}
          description="Role scope for credential template"
        />
      </div>

      <div className="space-y-4">
        <SearchFilterBar
          search={search}
          onSearchChange={setSearch}
          placeholder="Search by name, email, or username..."
          filters={[
            {
              value: batchFilter,
              onChange: setBatchFilter,
              placeholder: "All Batches",
              options: [
                { value: "default-batch", label: "Default Batch" },
                { value: "frontend-batch", label: "Frontend Academy" },
                { value: "cloud-batch", label: "Cloud Engineering" }
              ]
            }
          ]}
          onClear={() => {
            setSearch("");
            setBatchFilter("All");
          }}
        />

        {isLoading ? (
          <TableSkeleton rows={4} cols={6} />
        ) : isError ? (
          <ErrorState onRetry={refetch} />
        ) : (
          <DataTable
            columns={columns}
            data={filteredCredentials}
            emptyTitle="No learner credentials registered"
            emptyDescription="Create the first learner login for this tenant to provision access keys."
          />
        )}
      </div>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={createdCredential ? "Credential Created" : "Create Learner Credential"}
        size="lg"
      >
        {createdCredential ? (
          <div className="space-y-5">
            <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-4">
              <p className="text-sm font-extrabold text-emerald-800">Share these details with the learner once.</p>
              <p className="text-xs text-emerald-700 mt-1">The backend stores only the password hash after creation.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-text-muted font-mono">Username</p>
                <p className="font-extrabold text-foreground">{createdCredential.username}</p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-text-muted font-mono">Temporary Password</p>
                <p className="font-extrabold text-foreground font-mono bg-gray-100 px-2 py-1 rounded w-fit select-all">
                  {createdCredential.temporaryPassword}
                </p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-text-muted font-mono">Tenant ID</p>
                <p className="font-extrabold text-foreground">{createdCredential.tenantId}</p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-text-muted font-mono">Batch ID</p>
                <p className="font-extrabold text-foreground">{createdCredential.batchId}</p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
              <Button variant="outline" onClick={copyCredential} className="flex items-center gap-1">
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Details</span>
              </Button>
              <Button variant="primary" onClick={() => setModalOpen(false)}>
                Done
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Learner Full Name"
                placeholder="John Doe"
                value={form.learnerName}
                onChange={(e) => updateField("learnerName", e.target.value)}
                error={formErrors.learnerName}
              />
              <Input
                label="Learner Email Address"
                placeholder="john.doe@xebia.com"
                type="email"
                value={form.email}
                onChange={(e) => updateField("email", e.target.value)}
                error={formErrors.email}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Custom Username (Optional)"
                placeholder="johndoe"
                value={form.username}
                onChange={(e) => updateField("username", e.target.value)}
                helperText="Leave empty to auto-generate from email prefix."
              />
              <Input
                label="Temporary Password (Optional)"
                placeholder="Min 8 characters"
                type="password"
                value={form.password}
                onChange={(e) => updateField("password", e.target.value)}
                error={formErrors.password}
                helperText="Leave empty to auto-generate a random secure password."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Tenant ID"
                placeholder="xebia-enterprise"
                value={form.tenantId}
                onChange={(e) => updateField("tenantId", e.target.value)}
              />
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Assign to Batch</label>
                <select
                  value={form.batchName}
                  onChange={(e) => {
                    const selected = e.target.value;
                    // Map human name to batchId slug
                    const idMap = {
                      "Batch A": "batch-a",
                      "Batch B": "batch-b",
                      "Batch C": "batch-c",
                      "Batch D": "batch-d",
                      "Batch E": "batch-e",
                    };
                    updateField("batchName", selected);
                    updateField("batchId", idMap[selected] || "batch-a");
                  }}
                  className="w-full px-3 py-2 border border-border bg-white rounded-xl text-sm focus:outline-none focus:border-primary/50 cursor-pointer"
                >
                  <option value="Batch A">Batch A</option>
                  <option value="Batch B">Batch B</option>
                  <option value="Batch C">Batch C</option>
                  <option value="Batch D">Batch D</option>
                  <option value="Batch E">Batch E</option>
                </select>
                <p className="text-[10px] text-text-muted">Must match the batch assigned to assessments</p>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="forcePasswordReset"
                checked={form.forcePasswordReset}
                onChange={(e) => updateField("forcePasswordReset", e.target.checked)}
                className="w-4 h-4 text-primary focus:ring-primary border-gray-300 rounded cursor-pointer"
              />
              <label htmlFor="forcePasswordReset" className="text-xs font-bold text-foreground cursor-pointer select-none">
                Force password reset upon first log in credential validation
              </label>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
              <Button variant="outline" onClick={() => setModalOpen(false)} disabled={createMutation.isPending}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" loading={createMutation.isPending}>
                Generate Credentials
              </Button>
            </div>
          </form>
        )}
      </Modal>

      <ConfirmModal
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDeleteConfirm}
        loading={deleteMutation.isPending}
        title="Delete Learner IAM login?"
        message="Are you sure you want to remove this learner? They will immediately lose authorization access keys to curriculum pages."
      />
    </div>
  );
}
