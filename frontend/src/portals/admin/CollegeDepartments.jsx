"use client";

import { useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';

import { ArrowLeftIcon } from 'lucide-react';
import { api } from '@/services/api';
import HierarchyBreadcrumb from '@/components/common/HierarchyBreadcrumb';
import { useAuth } from '@/context/AuthContext';

const parseDepartments = (departmentValue) => {
  if (!departmentValue || typeof departmentValue !== 'string') return ['General'];
  const parts = departmentValue
    .split(/[|,/]/)
    .map((item) => item.trim())
    .filter(Boolean);
  return parts.length ? parts : ['General'];
};

const normalizeDepartmentItems = (items = []) => items
  .map((item, index) => {
    if (typeof item === 'string') {
      return {
        _id: `legacy-${item}-${index}`,
        name: item,
        isAssigned: true,
        permissions: ['view'],
      };
    }

    const name = item?.name || item?.title || item?.department || `Department ${index + 1}`;
    const rawPermissions = Array.isArray(item?.permissions) ? item.permissions : ['view'];
    const permissions = [...new Set(rawPermissions.map((value) => String(value || '').trim().toLowerCase()).filter(Boolean))];
    return {
      _id: item?._id || `legacy-${name}-${index}`,
      name,
      isAssigned: Boolean(item?.isAssigned),
      permissions: permissions.length ? permissions : ['view'],
    };
  })
  .filter((item) => item.name);

const hasPermission = (permissions = [], requiredPermission = 'view') => {
  const normalized = permissions.map((value) => String(value || '').trim().toLowerCase());
  if (!normalized.length) return requiredPermission === 'view';
  return normalized.includes(requiredPermission) || normalized.includes('*') || normalized.includes('all');
};

const CollegeDepartments = () => {
  const router = useRouter();
  const { id } = useParams();
  const { currentUser } = useAuth();
  const {
    data: departmentData,
    isLoading: loading,
    error,
  } = useQuery({
    queryKey: ['college-departments', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const [detailsResponse, departmentsResponse] = await Promise.all([
        api.get(`/colleges/${id}/details`),
        api.get(`/departments/my?collegeId=${id}`),
      ]);

      return {
        college: detailsResponse?.college || null,
        days: detailsResponse?.days || [],
        visibleDepartments: normalizeDepartmentItems(
          Array.isArray(departmentsResponse?.departments) ? departmentsResponse.departments : [],
        ),
      };
    },
  });
  const college = departmentData?.college || null;
  const days = departmentData?.days || [];
  const visibleDepartments = useMemo(() => {
    if (Array.isArray(departmentData?.visibleDepartments)) return departmentData.visibleDepartments;
    return [];
  }, [departmentData?.visibleDepartments]);

  const departments = useMemo(() => {
    if (visibleDepartments.length) return visibleDepartments;
    return normalizeDepartmentItems(parseDepartments(college?.department));
  }, [college?.department, visibleDepartments]);
  const completedDays = days.filter((day) => day.status === 'Completed').length;
  const courseIdValue = college?.courseId?._id || college?.courseId?.id || (typeof college?.courseId === 'string' ? college.courseId : null);
  const daysCount = days.length;
  const role = String(currentUser?.role || '').toLowerCase();

  const openDepartment = (departmentName) => {
    router.push(`/dashboard/companies/college/${id}/department/${encodeURIComponent(departmentName)}`);
  };

  const breadcrumbItems = [
    { label: 'Company', value: college?.companyId?.name || 'Company', to: '/dashboard/companies' },
    { label: 'Course', value: college?.courseId?.title || college?.courseId?.name || 'Course', to: (college?.companyId?._id && courseIdValue) ? `/dashboard/companies/${college.companyId._id}/courses/${courseIdValue}` : '/dashboard/companies' },
    { label: 'College', value: college?.name || 'College' },
    { label: 'Department', value: `${departments.length} Departments` },
  ];

  if (loading) return <div className="p-8 text-center">Loading departments...</div>;
  if (error) return <div className="p-8 text-center text-red-600">{error.message || 'Failed to load college departments'}</div>;
  if (!college) return <div className="p-8 text-center">College not found.</div>;

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <button
        type="button"
        onClick={() => router.back()}
        className="mb-4 inline-flex items-center text-sm font-medium text-gray-600 hover:text-gray-900"
      >
        <ArrowLeftIcon className="mr-2 h-4 w-4" />
        Back
      </button>

      <HierarchyBreadcrumb items={breadcrumbItems} />

      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900">{college.name}</h1>
        <p className="mt-1 text-sm text-gray-600">College Page -&gt; Department Cards</p>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase text-gray-500">College</p>
          <p className="mt-1 text-sm font-semibold text-gray-900">{college.name}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase text-gray-500">Departments</p>
          <p className="mt-1 text-sm font-semibold text-gray-900">{departments.length}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase text-gray-500">Completed Days</p>
          <p className="mt-1 text-sm font-semibold text-gray-900">{completedDays} / {days.length}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {departments.map((department) => (
          <div
            key={department._id}
            onClick={() => hasPermission(department.permissions, 'view') && openDepartment(department.name)}
            className={`bg-gradient-to-br from-blue-50 to-white p-6 rounded-2xl border border-gray-200 transition shadow-sm hover:shadow-lg ${hasPermission(department.permissions, 'view') ? 'hover:border-blue-400 cursor-pointer' : 'opacity-70 cursor-not-allowed'}`}
          >
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-800">
                {department.name}
              </h3>
              {department.isAssigned ? (
                <span className="bg-green-100 text-green-600 text-xs px-2 py-1 rounded">
                  Assigned
                </span>
              ) : null}
            </div>

            <div className="mt-4 text-sm text-gray-500">
              {daysCount} Active Days
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {role === 'trainer' && hasPermission(department.permissions, 'attendance') && (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    openDepartment(department.name);
                  }}
                  className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
                >
                  Mark Attendance
                </button>
              )}

              {(role === 'companyadmin' || role === 'company') && hasPermission(department.permissions, 'edit') && (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    openDepartment(department.name);
                  }}
                  className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100"
                >
                  Edit Department
                </button>
              )}

              {(role === 'accountant' || role === 'accountnt') && hasPermission(department.permissions, 'finance') && (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    openDepartment(department.name);
                  }}
                  className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-100"
                >
                  Finance Access
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {departments.length === 0 && (
        <div className="mt-6 rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center text-sm text-gray-500 shadow-sm">
          No departments are visible for your current role.
        </div>
      )}
    </div>
  );
};

export default CollegeDepartments;
