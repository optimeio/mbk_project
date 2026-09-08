'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/services/api';
import CTAButton from '@/components/common/CTAButton';
import notify from '@/lib/toast';
import getErrorMessage from '@/lib/getErrorMessage';
import styles from './TrainerRegistration.module.css';

export default function TrainerRegistration() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    qualifications: [],
    profileImage: null,
    documents: [],
  });

  const [newQualification, setNewQualification] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  }, []);

  const handleAddQualification = useCallback(() => {
    if (newQualification.trim()) {
      setFormData(prev => ({
        ...prev,
        qualifications: [...prev.qualifications, newQualification],
      }));
      setNewQualification('');
    }
  }, [newQualification]);

  const handleRemoveQualification = useCallback((index) => {
    setFormData(prev => ({
      ...prev,
      qualifications: prev.qualifications.filter((_, i) => i !== index),
    }));
  }, []);

  const handleProfileImageChange = useCallback((e) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData(prev => ({
        ...prev,
        profileImage: file,
      }));
    }
  }, []);

  const handleDocumentsChange = useCallback((e) => {
    const files = e.target.files;
    if (files) {
      setFormData(prev => ({
        ...prev,
        documents: Array.from(files),
      }));
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.firstName || !formData.lastName || !formData.email || !formData.phone) {
      notify.error('Please fill all required fields');
      return;
    }

    if (formData.qualifications.length === 0) {
      notify.error('Please add at least one qualification');
      return;
    }

    setIsSubmitting(true);

    try {
      // Create FormData for multipart upload
      const formDataToSend = new FormData();
      formDataToSend.append('firstName', formData.firstName);
      formDataToSend.append('lastName', formData.lastName);
      formDataToSend.append('email', formData.email);
      formDataToSend.append('phone', formData.phone);
      formDataToSend.append('qualifications', JSON.stringify(formData.qualifications));

      if (formData.profileImage) {
        formDataToSend.append('profileImage', formData.profileImage);
      }

      formData.documents.forEach(doc => {
        formDataToSend.append('documents', doc);
      });

      const response = await api.post(
        '/api/trainer-management/trainers/register',
        formDataToSend,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          onUploadProgress: (progressEvent) => {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(percent);
          },
        }
      );

      notify.success('Registration successful! Your profile will be verified shortly.');
      router.push('/trainer/dashboard');
    } catch (error) {
      console.error('Registration error:', error);
      notify.error(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
      setUploadProgress(0);
    }
  };

  return (
    <main className={styles.container}>
      <div className={styles.content}>
        <h1 className={styles.title}>Trainer Registration</h1>
        <p className={styles.subtitle}>
          Join MBK as a certified trainer. Fill in your details and start training today.
        </p>

        <form onSubmit={handleSubmit} className={styles.form}>
          {/* Personal Information */}
          <section className={styles.section}>
            <h2>Personal Information</h2>

            <div className={styles.grid}>
              <div className={styles.formGroup}>
                <label htmlFor="firstName">First Name *</label>
                <input
                  id="firstName"
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  placeholder="Enter your first name"
                  required
                  aria-required="true"
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="lastName">Last Name *</label>
                <input
                  id="lastName"
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  placeholder="Enter your last name"
                  required
                  aria-required="true"
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="email">Email *</label>
                <input
                  id="email"
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="your@email.com"
                  required
                  aria-required="true"
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="phone">Phone *</label>
                <input
                  id="phone"
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="10-digit phone number"
                  pattern="\d{10}"
                  required
                  aria-required="true"
                />
              </div>
            </div>
          </section>

          {/* Qualifications */}
          <section className={styles.section}>
            <h2>Qualifications *</h2>

            <div className={styles.qualificationInput}>
              <input
                type="text"
                value={newQualification}
                onChange={(e) => setNewQualification(e.target.value)}
                placeholder="e.g., B.Tech in Computer Science"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddQualification();
                  }
                }}
              />
              <CTAButton
                type="button"
                variant="secondary"
                onClick={handleAddQualification}
              >
                Add Qualification
              </CTAButton>
            </div>

            <div className={styles.qualificationList}>
              {formData.qualifications.map((qual, index) => (
                <div key={index} className={styles.qualificationTag}>
                  {qual}
                  <button
                    type="button"
                    onClick={() => handleRemoveQualification(index)}
                    className={styles.removeBtn}
                    aria-label="Remove qualification"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </section>

          {/* Profile Image */}
          <section className={styles.section}>
            <h2>Profile Image</h2>

            <div className={styles.fileInput}>
              <input
                type="file"
                id="profileImage"
                accept="image/*"
                onChange={handleProfileImageChange}
                className={styles.hiddenInput}
              />
              <label htmlFor="profileImage" className={styles.fileLabel}>
                {formData.profileImage ? (
                  <span>✓ {formData.profileImage.name}</span>
                ) : (
                  <span>Click to upload profile image</span>
                )}
              </label>
            </div>
          </section>

          {/* Documents */}
          <section className={styles.section}>
            <h2>Documents (Certificates, Credentials, etc.)</h2>

            <div className={styles.fileInput}>
              <input
                type="file"
                id="documents"
                multiple
                accept=".pdf,.doc,.docx,.jpg,.png"
                onChange={handleDocumentsChange}
                className={styles.hiddenInput}
              />
              <label htmlFor="documents" className={styles.fileLabel}>
                {formData.documents.length > 0 ? (
                  <span>✓ {formData.documents.length} file(s) selected</span>
                ) : (
                  <span>Click to upload documents (PDF, DOC, Images)</span>
                )}
              </label>
            </div>

            {formData.documents.length > 0 && (
              <ul className={styles.documentList}>
                {formData.documents.map((doc, index) => (
                  <li key={index}>{doc.name}</li>
                ))}
              </ul>
            )}
          </section>

          {/* Progress Bar */}
          {uploadProgress > 0 && uploadProgress < 100 && (
            <div className={styles.progressContainer}>
              <div className={styles.progressLabel}>
                Uploading: {uploadProgress}%
              </div>
              <div className={styles.progressBar}>
                <div
                  className={styles.progressFill}
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Submit Buttons */}
          <div className={styles.buttonGroup}>
            <CTAButton
              type="submit"
              variant="brand"
              size="lg"
              fullWidth
              loading={isSubmitting}
              loadingText="Registering..."
              disabled={isSubmitting}
            >
              Submit Registration
            </CTAButton>
          </div>
        </form>
      </div>
    </main>
  );
}
