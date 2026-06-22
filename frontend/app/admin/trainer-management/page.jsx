'use client';

import { useState, useEffect } from 'react';
import api from '@/services/api';
import CTAButton from '@/components/common/CTAButton';
import notify from '@/lib/toast';
import getErrorMessage from '@/lib/getErrorMessage';
import styles from './AdminDashboard.module.css';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('trainers');
  const [trainers, setTrainers] = useState([]);
  const [errorLogs, setErrorLogs] = useState([]);
  const [errorStats, setErrorStats] = useState(null);
  const [selectedTrainer, setSelectedTrainer] = useState(null);
  const [collegeName, setCollegeName] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);
  const [page, setPage] = useState(1);

  // Load trainers
  useEffect(() => {
    if (activeTab === 'trainers') {
      loadTrainers();
    }
  }, [activeTab, page]);

  // Load error logs
  useEffect(() => {
    if (activeTab === 'errors') {
      loadErrorLogs();
      loadErrorStats();
    }
  }, [activeTab]);

  const loadTrainers = async () => {
    try {
      const response = await api.get('/api/trainer-management/trainers', {
        params: { page, limit: 20 },
      });
      setTrainers(response.data.data);
    } catch (error) {
      notify.error(getErrorMessage(error));
    }
  };

  const loadErrorLogs = async () => {
    try {
      const response = await api.get('/api/trainer-management/errors', {
        params: { page, limit: 20, resolved: 'false' },
      });
      setErrorLogs(response.data.data);
    } catch (error) {
      notify.error(getErrorMessage(error));
    }
  };

  const loadErrorStats = async () => {
    try {
      const response = await api.get('/api/trainer-management/errors/stats/overview');
      setErrorStats(response.data.data);
    } catch (error) {
      notify.error(getErrorMessage(error));
    }
  };

  const handleApproveTrainer = async (trainerId) => {
    try {
      await api.patch(`/api/trainer-management/trainers/${trainerId}/approve`);
      notify.success('Trainer approved successfully!');
      loadTrainers();
    } catch (error) {
      notify.error(getErrorMessage(error));
    }
  };

  const handleAssignCollege = async () => {
    if (!selectedTrainer || !collegeName) {
      notify.error('Please select trainer and enter college name');
      return;
    }

    setIsAssigning(true);
    try {
      await api.post('/api/trainer-management/trainers/assign-college', {
        trainerId: selectedTrainer._id,
        collegeId: '507f1f77bcf86cd799439011', // Replace with actual college selection
        collegeName,
      });
      notify.success('College assigned successfully!');
      setSelectedTrainer(null);
      setCollegeName('');
      loadTrainers();
    } catch (error) {
      notify.error(getErrorMessage(error));
    } finally {
      setIsAssigning(false);
    }
  };

  const handleResolveError = async (errorId, resolution) => {
    try {
      await api.patch(`/api/trainer-management/errors/${errorId}/resolve`, {
        resolution,
      });
      notify.success('Error marked as resolved!');
      loadErrorLogs();
    } catch (error) {
      notify.error(getErrorMessage(error));
    }
  };

  return (
    <main className={styles.container}>
      <div className={styles.header}>
        <h1>Admin Dashboard</h1>
        <p>Trainer Management & System Monitoring</p>
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'trainers' ? styles.active : ''}`}
          onClick={() => setActiveTab('trainers')}
        >
          👥 Trainers
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'errors' ? styles.active : ''}`}
          onClick={() => setActiveTab('errors')}
        >
          ⚠️ Error Logs
        </button>
      </div>

      {/* Trainers Tab */}
      {activeTab === 'trainers' && (
        <section className={styles.section}>
          <h2>Trainer Management</h2>

          {selectedTrainer ? (
            <div className={styles.assignPanel}>
              <h3>Assign College to {selectedTrainer.firstName} {selectedTrainer.lastName}</h3>

              <input
                type="text"
                value={collegeName}
                onChange={(e) => setCollegeName(e.target.value)}
                placeholder="Enter college name"
                className={styles.input}
              />

              <div className={styles.buttonGroup}>
                <CTAButton
                  onClick={handleAssignCollege}
                  variant="brand"
                  loading={isAssigning}
                  loadingText="Assigning..."
                >
                  Assign College
                </CTAButton>
                <CTAButton
                  onClick={() => {
                    setSelectedTrainer(null);
                    setCollegeName('');
                  }}
                  variant="outline"
                >
                  Cancel
                </CTAButton>
              </div>
            </div>
          ) : null}

          <div className={styles.table}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Status</th>
                <th>Colleges</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {trainers.map(trainer => (
                <tr key={trainer._id}>
                  <td>
                    <strong>{trainer.firstName} {trainer.lastName}</strong>
                  </td>
                  <td>{trainer.email}</td>
                  <td>{trainer.phone}</td>
                  <td>
                    <span className={`${styles.badge} ${styles[trainer.registrationStatus]}`}>
                      {trainer.registrationStatus}
                    </span>
                  </td>
                  <td>{trainer.colleges?.length || 0}</td>
                  <td>
                    <div className={styles.actions}>
                      {trainer.registrationStatus === 'pending' && (
                        <CTAButton
                          size="sm"
                          variant="brand"
                          onClick={() => handleApproveTrainer(trainer._id)}
                        >
                          Approve
                        </CTAButton>
                      )}
                      <CTAButton
                        size="sm"
                        variant="secondary"
                        onClick={() => setSelectedTrainer(trainer)}
                      >
                        Assign
                      </CTAButton>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </div>
        </section>
      )}

      {/* Error Logs Tab */}
      {activeTab === 'errors' && (
        <section className={styles.section}>
          <h2>System Error Logs</h2>

          {errorStats && (
            <div className={styles.statsGrid}>
              <div className={styles.stat}>
                <div className={styles.statValue}>{errorStats.total}</div>
                <div className={styles.statLabel}>Total Errors</div>
              </div>
              <div className={styles.stat} style={{ borderColor: '#ef4444' }}>
                <div className={styles.statValue} style={{ color: '#ef4444' }}>
                  {errorStats.bySeverity?.critical || 0}
                </div>
                <div className={styles.statLabel}>Critical</div>
              </div>
              <div className={styles.stat} style={{ borderColor: '#f59e0b' }}>
                <div className={styles.statValue} style={{ color: '#f59e0b' }}>
                  {errorStats.bySeverity?.high || 0}
                </div>
                <div className={styles.statLabel}>High</div>
              </div>
              <div className={styles.stat} style={{ borderColor: '#10b981' }}>
                <div className={styles.statValue} style={{ color: '#10b981' }}>
                  {errorStats.unresolved || 0}
                </div>
                <div className={styles.statLabel}>Unresolved</div>
              </div>
            </div>
          )}

          <div className={styles.table}>
            <thead>
              <tr>
                <th>Error Type</th>
                <th>Severity</th>
                <th>Message</th>
                <th>Trainer</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {errorLogs.map(error => (
                <tr key={error._id} className={`${styles.errorRow} ${styles[error.severity]}`}>
                  <td><strong>{error.errorType}</strong></td>
                  <td>
                    <span className={`${styles.severityBadge} ${styles[error.severity]}`}>
                      {error.severity}
                    </span>
                  </td>
                  <td className={styles.message}>{error.message}</td>
                  <td>
                    {error.trainerId?.firstName} {error.trainerId?.lastName}
                  </td>
                  <td>{new Date(error.createdAt).toLocaleDateString()}</td>
                  <td>
                    <CTAButton
                      size="sm"
                      variant="outline"
                      onClick={() => handleResolveError(error._id, 'Resolved by admin')}
                    >
                      Resolve
                    </CTAButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </div>
        </section>
      )}
    </main>
  );
}
