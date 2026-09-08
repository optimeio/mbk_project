import { api } from '@/services/api';

// Predefined training courses for trainers
export const TRAINING_COURSES = [
  {
    id: 1,
    name: "PCB",
    description: "Printed Circuit Board Design and Manufacturing",
    category: "Hardware"
  },
  {
    id: 2,
    name: "IoT",
    description: "Internet of Things - Connected Devices and Systems",
    category: "Hardware"
  },
  {
    id: 3,
    name: "Surface Modelling",
    description: "Advanced 3D Surface Modelling Techniques",
    category: "CAD/3D"
  },
  {
    id: 4,
    name: "NBFC",
    description: "Non-Banking Financial Companies Operations",
    category: "Finance"
  },
  {
    id: 5,
    name: "Foundation Skills of Employability",
    description: "Soft Skills and Professional Development",
    category: "Soft Skills"
  },
  {
    id: 6,
    name: "Advanced Tally with GST",
    description: "Accounting Software - Tally ERP with Goods and Services Tax",
    category: "Finance"
  },
  {
    id: 7,
    name: "Financial Modelling",
    description: "Financial Analysis and Valuation Techniques",
    category: "Finance"
  },
  {
    id: 8,
    name: "Food Safety and Quality Management",
    description: "FSSAI Compliance and Quality Standards",
    category: "Food & Safety"
  }
];

// Company courses API calls
export const getCourses = () => {
    return api.get('/courses');
};

export const createCourse = (data) => {
    return api.post('/courses', data);
};

export const updateCourse = (id, data) => {
    return api.put(`/courses/${id}`, data);
};

export const deleteCourse = (id) => {
    return api.delete(`/courses/${id}`);
};

// Training courses helper functions
export const getTrainingCourses = async () => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(TRAINING_COURSES);
    }, 100);
  });
};

export const searchTrainingCourses = (query) => {
  if (!query || query.trim().length === 0) {
    return TRAINING_COURSES;
  }

  const lowerQuery = query.toLowerCase();
  return TRAINING_COURSES.filter((course) =>
    course.name.toLowerCase().includes(lowerQuery) ||
    course.description.toLowerCase().includes(lowerQuery) ||
    course.category.toLowerCase().includes(lowerQuery)
  );
};

export const getTrainingCourseById = (id) => {
  return TRAINING_COURSES.find((course) => course.id === id);
};
