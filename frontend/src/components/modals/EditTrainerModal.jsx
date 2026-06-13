"use client";

import { useState, useEffect } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { api } from "@/services/api";
import { getCities } from "@/services/cityService";

const buildTrainerNameParts = (trainer = {}) => {
  const existingFirstName = String(
    trainer.firstName || trainer.userId?.firstName || "",
  ).trim();
  const existingLastName = String(
    trainer.lastName || trainer.userId?.lastName || "",
  ).trim();

  if (existingFirstName || existingLastName) {
    return {
      firstName: existingFirstName,
      lastName: existingLastName,
    };
  }

  const fallbackName = String(trainer.name || trainer.userId?.name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  return {
    firstName: fallbackName[0] || "",
    lastName: fallbackName.length > 1 ? fallbackName.slice(1).join(" ") : "",
  };
};

const buildFormData = (trainer = {}) => {
  const { firstName, lastName } = buildTrainerNameParts(trainer);

  return {
    trainerCode: trainer.trainerCode || trainer.trainerId || "",
    email: trainer.email || trainer.userId?.email || "",
    firstName,
    lastName,
    phone: trainer.mobile || trainer.phone || trainer.userId?.phoneNumber || "",
    cityId: trainer.cityId?._id || trainer.cityId || "",
    qualification: trainer.qualification || "",
    specialization: trainer.specialization || trainer.userId?.specialization || "",
    experience:
      trainer.experience === null || trainer.experience === undefined
        ? trainer.userId?.experience === null || trainer.userId?.experience === undefined
          ? ""
          : String(trainer.userId.experience)
        : String(trainer.experience),
    address: trainer.address || "",
    status: String(trainer.status || "PENDING").trim().toUpperCase(),
  };
};

export default function EditTrainerModal({
  isOpen,
  onClose,
  trainer,
  onUpdate,
}) {
  const [formData, setFormData] = useState(() => buildFormData());
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchCitiesData = async () => {
      try {
        const citiesData = await getCities();
        setCities(citiesData || []);
      } catch (fetchError) {
        console.error("Failed to fetch cities", fetchError);
      }
    };

    if (isOpen) {
      fetchCitiesData();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!trainer) {
      return;
    }

    setFormData(buildFormData(trainer));
    setError("");
  }, [trainer]);

  useEffect(() => {
    if (!trainer || formData.cityId || cities.length === 0) {
      return;
    }

    const currentCityName = String(trainer.city || trainer.userId?.city || "")
      .trim()
      .toLowerCase();

    if (!currentCityName) {
      return;
    }

    const matchedCity = cities.find(
      (city) => String(city.name || "").trim().toLowerCase() === currentCityName,
    );

    if (matchedCity) {
      setFormData((current) => ({
        ...current,
        cityId: matchedCity._id || matchedCity.id || "",
      }));
    }
  }, [cities, formData.cityId, trainer]);

  const handleFieldChange = (key) => (event) => {
    setFormData((current) => ({
      ...current,
      [key]: event.target.value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      await api.put(`/trainers/${trainer.id || trainer._id}`, {
        trainerCode: formData.trainerCode,
        email: formData.email,
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
        cityId: formData.cityId,
        qualification: formData.qualification,
        specialization: formData.specialization,
        experience: formData.experience,
        address: formData.address,
        status: formData.status,
      });
      onUpdate();
      onClose();
    } catch (submitError) {
      setError(submitError.message || "Failed to update trainer");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="dashboard-modal-overlay fixed inset-0 z-50 flex items-center justify-center bg-gray-500/75 p-4">
      <div className="dashboard-modal-panel relative w-full max-w-3xl rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Edit Trainer Registration Details
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Update the Step 2 personal details saved during trainer registration.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 transition hover:text-gray-500"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Trainer ID
              </label>
              <input
                type="text"
                value={formData.trainerCode}
                onChange={handleFieldChange("trainerCode")}
                className="mt-1 block w-full rounded-md border border-gray-300 p-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={handleFieldChange("email")}
                className="mt-1 block w-full rounded-md border border-gray-300 p-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                required
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                First Name
              </label>
              <input
                type="text"
                value={formData.firstName}
                onChange={handleFieldChange("firstName")}
                className="mt-1 block w-full rounded-md border border-gray-300 p-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Last Name
              </label>
              <input
                type="text"
                value={formData.lastName}
                onChange={handleFieldChange("lastName")}
                className="mt-1 block w-full rounded-md border border-gray-300 p-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                required
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Phone
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={handleFieldChange("phone")}
                className="mt-1 block w-full rounded-md border border-gray-300 p-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                placeholder="10-digit number"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                City
              </label>
              <select
                value={formData.cityId}
                onChange={handleFieldChange("cityId")}
                className="mt-1 block w-full rounded-md border border-gray-300 p-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              >
                <option value="">Select a City</option>
                {cities.map((city) => (
                  <option
                    key={city._id || city.id || city.name}
                    value={city._id || city.id || ""}
                  >
                    {city.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Qualification
              </label>
              <input
                type="text"
                value={formData.qualification}
                onChange={handleFieldChange("qualification")}
                className="mt-1 block w-full rounded-md border border-gray-300 p-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                placeholder="e.g. B.Tech, MBA"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Specialization
              </label>
              <input
                type="text"
                value={formData.specialization}
                onChange={handleFieldChange("specialization")}
                className="mt-1 block w-full rounded-md border border-gray-300 p-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                placeholder="e.g. Python, IoT"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-[180px,1fr]">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Experience
              </label>
              <input
                type="number"
                min="0"
                value={formData.experience}
                onChange={handleFieldChange("experience")}
                className="mt-1 block w-full rounded-md border border-gray-300 p-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                placeholder="e.g. 5"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Full Address
              </label>
              <textarea
                value={formData.address}
                onChange={handleFieldChange("address")}
                rows={3}
                className="mt-1 block w-full rounded-md border border-gray-300 p-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                placeholder="House no, Street, Area"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Status
              </label>
              <select
                value={formData.status}
                onChange={handleFieldChange("status")}
                className="mt-1 block w-full rounded-md border border-gray-300 p-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              >
                <option value="PENDING">Pending</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
