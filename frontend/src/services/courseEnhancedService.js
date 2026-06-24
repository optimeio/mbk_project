/**
 * Enhanced course service with predefined curriculum
 */
export const TRAINING_COURSES = [
  {
    id: "pcb",
    name: "PCB",
    title: "PCB",
    description: "Printed Circuit Board Design and Manufacturing",
    category: "Hardware",
  },
  {
    id: "iot",
    name: "IoT",
    title: "IoT",
    description: "Internet of Things - Connected Devices and Systems",
    category: "Hardware",
  },
  {
    id: "surface_modelling",
    name: "Surface Modelling",
    title: "Surface Modelling",
    description: "Advanced 3D Surface Modelling Techniques",
    category: "CAD/3D",
  },
  {
    id: "nbfc",
    name: "NBFC",
    title: "NBFC",
    description: "Non-Banking Financial Companies Operations",
    category: "Finance",
  },
  {
    id: "employability",
    name: "Foundation Skills of Employability",
    title: "Foundation Skills of Employability",
    description: "Soft Skills and Professional Development",
    category: "Soft Skills",
  },
  {
    id: "advanced_tally",
    name: "Advanced Tally with GST",
    title: "Advanced Tally with GST",
    description: "Accounting Software - Tally ERP with Goods and Services Tax",
    category: "Finance",
  },
  {
    id: "financial_modelling",
    name: "Financial Modelling",
    title: "Financial Modelling",
    description: "Financial Analysis and Valuation Techniques",
    category: "Finance",
  },
  {
    id: "food_safety",
    name: "Food Safety and Quality Management",
    title: "Food Safety and Quality Management",
    description: "FSSAI Compliance and Quality Standards",
    category: "Food & Safety",
  },
];

/**
 * Filter courses based on search query
 */
export const filterCourses = (query = "") => {
  const lowerQuery = query.toLowerCase().trim();
  if (!lowerQuery) return TRAINING_COURSES;
  return TRAINING_COURSES.filter(
    (course) =>
      course.name.toLowerCase().includes(lowerQuery) ||
      course.title.toLowerCase().includes(lowerQuery) ||
      course.description.toLowerCase().includes(lowerQuery)
  );
};

/**
 * Get course by ID
 */
export const getCourseById = (courseId) => {
  return TRAINING_COURSES.find((c) => c.id === courseId);
};

/**
 * Get all courses
 */
export const getAllCourses = () => TRAINING_COURSES;
