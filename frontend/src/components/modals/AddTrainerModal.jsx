"use client";

import { Fragment, useState, useEffect } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { XMarkIcon, EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";
import { createTrainer } from "@/services/trainerService";
import { getCities, addCity } from "@/services/cityService";
import useMutationWithToast from "@/hooks/useMutationWithToast";
import getErrorMessage from "@/lib/getErrorMessage";

const AddTrainerModal = ({ isOpen, onClose, onTrainerAdded }) => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    specialization: "",
    city: "",
  });
  const [cities, setCities] = useState([]);
  const [isAddingCity, setIsAddingCity] = useState(false);
  const [newCityName, setNewCityName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);

  const createTrainerMutation = useMutationWithToast({
    mutationFn: createTrainer,
    queryKeys: [["trainers"]],
    toast: {
      loading: "Saving trainer...",
      success: "Trainer added successfully",
      error: (err) => getErrorMessage(err, "Failed to create trainer"),
    },
  });

  const addCityMutation = useMutationWithToast({
    mutationFn: addCity,
    queryKeys: [["cities"]],
    toast: {
      loading: "Adding city...",
      success: "City added successfully",
      error: (err) => getErrorMessage(err, "Failed to add city"),
    },
  });

  const fetchCitiesData = async () => {
    try {
      const data = await getCities();
      setCities(data || []);
    } catch (err) {
      console.error("Failed to fetch cities");
    }
  };

  useEffect(() => {
    if (isOpen) {
      // Reset form and UI state when modal opens
      setFormData({
        name: "",
        email: "",
        password: "",
        phone: "",
        specialization: "",
        city: "",
      });
      setIsAddingCity(false);
      setNewCityName("");
      setShowPassword(false);
      setError(null);
      fetchCitiesData();
    }
  }, [isOpen]);

  const handleAddNewCity = async () => {
    if (!newCityName.trim() || addCityMutation.isPending) return;
    try {
      setError(null);
      const response = await addCityMutation.mutateWithToast({ name: newCityName });
      const data = response.city ? response : response.data; // Handle potential axios vs fetch structure difference

      // Re-fetch or manually append? Service usually returns response.data
      // Let's assume response.data contains { success: true, city: ... } from backend
      if (data.success || data.city) {
        const newCity = data.city || data;
        setCities([...cities, newCity]);
        setFormData((prev) => ({ ...prev, city: newCity.name }));
        setIsAddingCity(false);
        setNewCityName("");
      } else {
        setError("Failed to add city");
      }
    } catch (err) {
      console.error("Failed to add city", err);
      setError(getErrorMessage(err, "Failed to add city"));
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    try {
      // Auto-append domain if missing
      let submissionData = { ...formData };
      if (submissionData.email && !submissionData.email.includes("@")) {
        submissionData.email = `${submissionData.email}@mbkcarrierz.com`;
      }

      await createTrainerMutation.mutateWithToast(submissionData);
      await onTrainerAdded?.();
      onClose();
      setFormData({
        name: "",
        email: "",
        password: "",
        phone: "",
        specialization: "",
        city: "",
      });
    } catch (err) {
      console.error("Error creating trainer:", err);
      setError(getErrorMessage(err, "Failed to create trainer"));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-500 bg-opacity-75">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-500"
        >
          <XMarkIcon className="h-6 w-6" />
        </button>

        <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
          Add New Trainer
        </h3>

        {error && (
          <div className="mb-4 bg-red-50 border-l-4 border-red-400 p-4">
            <div className="flex">
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-700"
            >
              Name
            </label>
            <input
              type="text"
              name="name"
              id="name"
              required
              value={formData.name}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
            />
          </div>

          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700"
            >
              Email or Login ID
            </label>
            <input
              type="text"
              name="email"
              id="email"
              required
              value={formData.email}
              onChange={handleChange}
              placeholder="user@example.com or userid"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700"
            >
              Password
            </label>
            <div className="relative mt-1">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                id="password"
                required
                minLength={6}
                value={formData.password}
                onChange={handleChange}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2 pr-10"
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 flex items-center pr-3"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeSlashIcon
                    className="h-5 w-5 text-gray-400"
                    aria-hidden="true"
                  />
                ) : (
                  <EyeIcon
                    className="h-5 w-5 text-gray-400"
                    aria-hidden="true"
                  />
                )}
              </button>
            </div>
          </div>

          <div>
            <label
              htmlFor="phone"
              className="block text-sm font-medium text-gray-700"
            >
              Phone
            </label>
            <input
              type="tel"
              name="phone"
              id="phone"
              value={formData.phone}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
            />
          </div>

          <div>
            <label
              htmlFor="city"
              className="block text-sm font-medium text-gray-700"
            >
              City
            </label>
            {!isAddingCity ? (
              <div className="flex gap-2">
                <select
                  name="city"
                  id="city"
                  value={formData.city}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2 text-black"
                >
                  <option value="">Select a City</option>
                  {cities.map((city) => (
                    <option key={city._id} value={city.name}>
                      {city.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setIsAddingCity(true)}
                  className="mt-1 inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
                >
                  + Add
                </button>
              </div>
            ) : (
              <div className="flex gap-2 mt-1">
                <input
                  type="text"
                  id="new-city"
                  name="newCity"
                  value={newCityName}
                  onChange={(e) => setNewCityName(e.target.value)}
                  placeholder="Enter city name"
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                />
                <button
                  type="button"
                  onClick={handleAddNewCity}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingCity(false);
                    setNewCityName("");
                  }}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          <div>
            <label
              htmlFor="specialization"
              className="block text-sm font-medium text-gray-700"
            >
              Specialization
            </label>
            <input
              type="text"
              name="specialization"
              id="specialization"
              value={formData.specialization}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
            />
          </div>

          <div className="mt-5 sm:mt-6">
            <button
              type="submit"
              disabled={createTrainerMutation.isPending}
              className="inline-flex w-full justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:text-sm disabled:opacity-50"
            >
              {createTrainerMutation.isPending ? "Creating..." : "Create Trainer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddTrainerModal;
