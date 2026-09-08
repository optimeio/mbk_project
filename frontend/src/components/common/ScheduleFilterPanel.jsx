'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, ChevronDown } from 'lucide-react';

/**
 * ScheduleFilterPanel
 * Provides three searchable dropdowns: Trainer, College, Course
 * - Click-outside to close dropdown
 * - Search within each dropdown
 * - Auto-updates when new data arrives (e.g., new trainer registers)
 */
const ScheduleFilterPanel = ({
  trainers = [],
  colleges = [],
  courses = [],
  onFilterChange = () => {},
  isOpen = true,
}) => {
  const [filters, setFilters] = useState({
    trainer: '',
    college: '',
    course: '',
  });

  const [searchTexts, setSearchTexts] = useState({
    trainer: '',
    college: '',
    course: '',
  });

  const [expandedDropdown, setExpandedDropdown] = useState(null);
  const panelRef = useRef(null);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        setExpandedDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = useCallback((filterType, value) => {
    setSearchTexts((prev) => ({ ...prev, [filterType]: value }));
    // If user is typing in the search, clear the selected filter for that type
    // so the dropdown shows all matching results
  }, []);

  const selectItem = useCallback((filterType, item) => {
    const itemId = String(item.id || item._id || '');
    const newFilters = { ...filters, [filterType]: itemId };
    setFilters(newFilters);
    setSearchTexts((prev) => ({ ...prev, [filterType]: '' }));
    setExpandedDropdown(null);
    onFilterChange(newFilters);
  }, [filters, onFilterChange]);

  const clearFilter = useCallback((filterType) => {
    const newFilters = { ...filters, [filterType]: '' };
    setFilters(newFilters);
    setSearchTexts((prev) => ({ ...prev, [filterType]: '' }));
    onFilterChange(newFilters);
  }, [filters, onFilterChange]);

  const clearAllFilters = useCallback(() => {
    const emptyFilters = { trainer: '', college: '', course: '' };
    setFilters(emptyFilters);
    setSearchTexts({ trainer: '', college: '', course: '' });
    onFilterChange(emptyFilters);
  }, [onFilterChange]);

  const toggleDropdown = useCallback((dropdownName) => {
    setExpandedDropdown((prev) => (prev === dropdownName ? null : dropdownName));
    // Clear search when opening a dropdown
    setSearchTexts((prev) => ({ ...prev, [dropdownName]: '' }));
  }, []);

  // Filter helpers
  const getFilteredTrainers = useCallback(() => {
    if (!Array.isArray(trainers)) return [];
    const query = (searchTexts.trainer || '').toLowerCase();
    if (!query) return trainers;
    return trainers.filter((trainer) => {
      const name = (trainer.name || trainer.firstName || '').toLowerCase();
      const lastName = (trainer.lastName || '').toLowerCase();
      const fullName = `${name} ${lastName}`.trim();
      return fullName.includes(query) || name.includes(query);
    });
  }, [trainers, searchTexts.trainer]);

  const getFilteredColleges = useCallback(() => {
    if (!Array.isArray(colleges)) return [];
    const query = (searchTexts.college || '').toLowerCase();
    if (!query) return colleges;
    return colleges.filter((college) => {
      const name = (college.name || '').toLowerCase();
      const city = (college.city || '').toLowerCase();
      return name.includes(query) || city.includes(query);
    });
  }, [colleges, searchTexts.college]);

  const getFilteredCourses = useCallback(() => {
    if (!Array.isArray(courses)) return [];
    const query = (searchTexts.course || '').toLowerCase();
    if (!query) return courses;
    return courses.filter((course) => {
      const name = (course.name || '').toLowerCase();
      const category = (course.category || '').toLowerCase();
      return name.includes(query) || category.includes(query);
    });
  }, [courses, searchTexts.course]);

  // Find selected items
  const selectedTrainer = Array.isArray(trainers)
    ? trainers.find((t) => String(t.id || t._id) === String(filters.trainer))
    : null;
  const selectedCollege = Array.isArray(colleges)
    ? colleges.find((c) => String(c.id || c._id) === String(filters.college))
    : null;
  const selectedCourse = Array.isArray(courses)
    ? courses.find((c) => String(c.id || c._id) === String(filters.course))
    : null;

  // Display name helpers
  const getTrainerDisplayName = (trainer) => {
    if (!trainer) return '';
    if (trainer.name) return trainer.name;
    return `${trainer.firstName || ''} ${trainer.lastName || ''}`.trim() || 'Unknown Trainer';
  };

  const getCollegeDisplayName = (college) => {
    if (!college) return '';
    return college.name || 'Unknown College';
  };

  const getCourseDisplayName = (course) => {
    if (!course) return '';
    return course.name || 'Unknown Course';
  };

  // Determine what to show in the input
  const getInputValue = (filterType) => {
    if (expandedDropdown === filterType) {
      return searchTexts[filterType];
    }
    if (filterType === 'trainer' && selectedTrainer) {
      return getTrainerDisplayName(selectedTrainer);
    }
    if (filterType === 'college' && selectedCollege) {
      return getCollegeDisplayName(selectedCollege);
    }
    if (filterType === 'course' && selectedCourse) {
      return getCourseDisplayName(selectedCourse);
    }
    return searchTexts[filterType] || '';
  };

  const hasActiveFilters = filters.trainer || filters.college || filters.course;

  if (!isOpen) return null;

  const filteredTrainers = getFilteredTrainers();
  const filteredColleges = getFilteredColleges();
  const filteredCourses = getFilteredCourses();

  return (
    <div className="schedule-filter-panel" ref={panelRef} style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.title}>
          <Search size={16} style={{ marginRight: 8, color: '#6366f1' }} />
          Filters
        </h3>
        {hasActiveFilters && (
          <button onClick={clearAllFilters} style={styles.clearAllBtn}>
            Clear All
          </button>
        )}
      </div>

      <div style={styles.filtersGrid}>
        {/* Trainer Filter */}
        <div style={styles.filterContainer}>
          <label style={styles.label}>Trainer</label>
          <div
            style={{
              ...styles.dropdownWrapper,
              ...(expandedDropdown === 'trainer' && styles.dropdownActive),
            }}
          >
            <div
              style={{
                ...styles.dropdownHeader,
                ...(expandedDropdown === 'trainer' && styles.dropdownHeaderFocused),
                ...(selectedTrainer && !expandedDropdown && styles.dropdownHeaderSelected),
              }}
              onClick={() => toggleDropdown('trainer')}
            >
              <Search size={14} style={styles.searchIcon} />
              <input
                type="text"
                placeholder={trainers.length === 0 ? 'No trainers available' : 'Search trainers...'}
                value={getInputValue('trainer')}
                onChange={(e) => handleSearch('trainer', e.target.value)}
                onClick={(e) => {
                  e.stopPropagation();
                  if (expandedDropdown !== 'trainer') {
                    toggleDropdown('trainer');
                  }
                }}
                style={styles.searchInput}
                readOnly={trainers.length === 0}
              />
              {filters.trainer ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    clearFilter('trainer');
                  }}
                  style={styles.clearBtn}
                  title="Clear trainer filter"
                >
                  <X size={14} />
                </button>
              ) : (
                <ChevronDown
                  size={14}
                  style={{
                    ...styles.chevronIcon,
                    transform: expandedDropdown === 'trainer' ? 'rotate(180deg)' : 'rotate(0deg)',
                  }}
                />
              )}
            </div>

            {expandedDropdown === 'trainer' && (
              <div style={styles.dropdownMenu}>
                {filteredTrainers.length > 0 ? (
                  filteredTrainers.slice(0, 50).map((trainer) => {
                    const trainerId = String(trainer.id || trainer._id || '');
                    const isSelected = filters.trainer === trainerId;
                    return (
                      <div
                        key={trainerId}
                        style={{
                          ...styles.dropdownItem,
                          ...(isSelected && styles.dropdownItemSelected),
                        }}
                        onClick={() => selectItem('trainer', trainer)}
                        onMouseEnter={(e) => {
                          if (!isSelected) e.currentTarget.style.backgroundColor = '#f5f3ff';
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        <div style={styles.itemMainText}>{getTrainerDisplayName(trainer)}</div>
                        {trainer.specialization && (
                          <div style={styles.itemSubText}>{trainer.specialization}</div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div style={styles.noResults}>
                    {searchTexts.trainer ? 'No trainers match your search' : 'No trainers available'}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* College Filter */}
        <div style={styles.filterContainer}>
          <label style={styles.label}>College</label>
          <div
            style={{
              ...styles.dropdownWrapper,
              ...(expandedDropdown === 'college' && styles.dropdownActive),
            }}
          >
            <div
              style={{
                ...styles.dropdownHeader,
                ...(expandedDropdown === 'college' && styles.dropdownHeaderFocused),
                ...(selectedCollege && !expandedDropdown && styles.dropdownHeaderSelected),
              }}
              onClick={() => toggleDropdown('college')}
            >
              <Search size={14} style={styles.searchIcon} />
              <input
                type="text"
                placeholder={colleges.length === 0 ? 'No colleges available' : 'Search colleges...'}
                value={getInputValue('college')}
                onChange={(e) => handleSearch('college', e.target.value)}
                onClick={(e) => {
                  e.stopPropagation();
                  if (expandedDropdown !== 'college') {
                    toggleDropdown('college');
                  }
                }}
                style={styles.searchInput}
                readOnly={colleges.length === 0}
              />
              {filters.college ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    clearFilter('college');
                  }}
                  style={styles.clearBtn}
                  title="Clear college filter"
                >
                  <X size={14} />
                </button>
              ) : (
                <ChevronDown
                  size={14}
                  style={{
                    ...styles.chevronIcon,
                    transform: expandedDropdown === 'college' ? 'rotate(180deg)' : 'rotate(0deg)',
                  }}
                />
              )}
            </div>

            {expandedDropdown === 'college' && (
              <div style={styles.dropdownMenu}>
                {filteredColleges.length > 0 ? (
                  filteredColleges.slice(0, 50).map((college) => {
                    const collegeId = String(college.id || college._id || '');
                    const isSelected = filters.college === collegeId;
                    return (
                      <div
                        key={collegeId}
                        style={{
                          ...styles.dropdownItem,
                          ...(isSelected && styles.dropdownItemSelected),
                        }}
                        onClick={() => selectItem('college', college)}
                        onMouseEnter={(e) => {
                          if (!isSelected) e.currentTarget.style.backgroundColor = '#f5f3ff';
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        <div style={styles.itemMainText}>{college.name}</div>
                        {college.city && (
                          <div style={styles.itemSubText}>{college.city}, {college.state || 'Tamil Nadu'}</div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div style={styles.noResults}>
                    {searchTexts.college ? 'No colleges match your search' : 'No colleges available'}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Course Filter */}
        <div style={styles.filterContainer}>
          <label style={styles.label}>Course</label>
          <div
            style={{
              ...styles.dropdownWrapper,
              ...(expandedDropdown === 'course' && styles.dropdownActive),
            }}
          >
            <div
              style={{
                ...styles.dropdownHeader,
                ...(expandedDropdown === 'course' && styles.dropdownHeaderFocused),
                ...(selectedCourse && !expandedDropdown && styles.dropdownHeaderSelected),
              }}
              onClick={() => toggleDropdown('course')}
            >
              <Search size={14} style={styles.searchIcon} />
              <input
                type="text"
                placeholder={courses.length === 0 ? 'No courses available' : 'Search courses...'}
                value={getInputValue('course')}
                onChange={(e) => handleSearch('course', e.target.value)}
                onClick={(e) => {
                  e.stopPropagation();
                  if (expandedDropdown !== 'course') {
                    toggleDropdown('course');
                  }
                }}
                style={styles.searchInput}
                readOnly={courses.length === 0}
              />
              {filters.course ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    clearFilter('course');
                  }}
                  style={styles.clearBtn}
                  title="Clear course filter"
                >
                  <X size={14} />
                </button>
              ) : (
                <ChevronDown
                  size={14}
                  style={{
                    ...styles.chevronIcon,
                    transform: expandedDropdown === 'course' ? 'rotate(180deg)' : 'rotate(0deg)',
                  }}
                />
              )}
            </div>

            {expandedDropdown === 'course' && (
              <div style={styles.dropdownMenu}>
                {filteredCourses.length > 0 ? (
                  filteredCourses.map((course) => {
                    const courseId = String(course.id || course._id || '');
                    const isSelected = filters.course === courseId;
                    return (
                      <div
                        key={courseId}
                        style={{
                          ...styles.dropdownItem,
                          ...(isSelected && styles.dropdownItemSelected),
                        }}
                        onClick={() => selectItem('course', course)}
                        onMouseEnter={(e) => {
                          if (!isSelected) e.currentTarget.style.backgroundColor = '#f5f3ff';
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        <div style={styles.itemMainText}>{course.name}</div>
                        {course.category && (
                          <div style={styles.itemSubText}>{course.category}</div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div style={styles.noResults}>
                    {searchTexts.course ? 'No courses match your search' : 'No courses available'}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    background: 'linear-gradient(135deg, #ffffff 0%, #f8faff 100%)',
    border: '1px solid rgba(99, 102, 241, 0.12)',
    borderRadius: '16px',
    padding: '20px 24px',
    marginBottom: '20px',
    width: '100%',
    boxShadow: '0 4px 24px rgba(99, 102, 241, 0.06), 0 1px 3px rgba(0,0,0,0.03)',
    backdropFilter: 'blur(8px)',
    position: 'relative',
    overflow: 'visible',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '18px',
    paddingBottom: '14px',
    borderBottom: '1px solid rgba(99, 102, 241, 0.08)',
  },
  title: {
    margin: 0,
    fontSize: '15px',
    fontWeight: '700',
    color: '#1e1b4b',
    display: 'flex',
    alignItems: 'center',
    letterSpacing: '-0.01em',
  },
  clearAllBtn: {
    background: 'linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%)',
    border: '1px solid rgba(99, 102, 241, 0.15)',
    color: '#4338ca',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '600',
    padding: '6px 14px',
    borderRadius: '8px',
    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
    letterSpacing: '0.01em',
  },
  filtersGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '16px',
  },
  filterContainer: {
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
  },
  label: {
    fontSize: '11px',
    fontWeight: '700',
    color: '#6366f1',
    marginBottom: '8px',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
  },
  dropdownWrapper: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
  },
  dropdownActive: {
    zIndex: 20,
  },
  dropdownHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 14px',
    border: '1.5px solid #e2e8f0',
    borderRadius: '10px',
    backgroundColor: '#ffffff',
    cursor: 'pointer',
    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
    minHeight: '44px',
    boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
  },
  dropdownHeaderFocused: {
    borderColor: '#818cf8',
    boxShadow: '0 0 0 3px rgba(129, 140, 248, 0.15), 0 4px 12px rgba(99, 102, 241, 0.1)',
    backgroundColor: '#fefeff',
  },
  dropdownHeaderSelected: {
    borderColor: '#a5b4fc',
    backgroundColor: '#f5f3ff',
    boxShadow: '0 0 0 1px rgba(165, 180, 252, 0.3), inset 0 1px 2px rgba(99, 102, 241, 0.05)',
  },
  searchIcon: {
    color: '#a5b4fc',
    flexShrink: 0,
  },
  chevronIcon: {
    color: '#a5b4fc',
    flexShrink: 0,
    transition: 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
  },
  searchInput: {
    flex: 1,
    border: 'none',
    outline: 'none',
    fontSize: '13px',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    fontWeight: '500',
    backgroundColor: 'transparent',
    color: '#1e1b4b',
    minWidth: 0,
    letterSpacing: '-0.005em',
  },
  clearBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#a5b4fc',
    padding: '3px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '6px',
    transition: 'all 0.2s ease',
  },
  dropdownMenu: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    border: '1px solid rgba(99, 102, 241, 0.12)',
    borderRadius: '12px',
    marginTop: '6px',
    maxHeight: '280px',
    overflowY: 'auto',
    boxShadow: '0 12px 40px rgba(99, 102, 241, 0.12), 0 4px 12px rgba(0,0,0,0.06)',
    zIndex: 100,
    animation: 'slideDown 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
  },
  dropdownItem: {
    padding: '11px 16px',
    borderBottom: '1px solid rgba(241, 245, 249, 0.8)',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    fontSize: '13px',
    color: '#334155',
    borderLeft: '3px solid transparent',
  },
  dropdownItemSelected: {
    background: 'linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%)',
    color: '#4338ca',
    fontWeight: '600',
    borderLeftColor: '#6366f1',
  },
  noResults: {
    padding: '18px',
    textAlign: 'center',
    color: '#a5b4fc',
    fontSize: '13px',
    fontStyle: 'italic',
    fontWeight: '500',
  },
  itemMainText: {
    fontWeight: '500',
    color: 'inherit',
    lineHeight: '1.4',
    letterSpacing: '-0.005em',
  },
  itemSubText: {
    fontSize: '11px',
    color: '#94a3b8',
    marginTop: '3px',
    fontWeight: '400',
  },
};

export default ScheduleFilterPanel;

