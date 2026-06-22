/**
 * trainingCollegeService.js
 * List of all training colleges in Tamil Nadu with search functionality
 * Used for trainer registration and schedule filtering
 */

export const TAMIL_NADU_TRAINING_COLLEGES = [
  // Major Engineering Colleges
  { id: 1, name: "Anna University, Chennai", city: "Chennai", state: "Tamil Nadu" },
  { id: 2, name: "CEG - College of Engineering Guindy", city: "Chennai", state: "Tamil Nadu" },
  { id: 3, name: "ACE Engineering College", city: "Salem", state: "Tamil Nadu" },
  { id: 4, name: "Adhiparasakthi Engineering College", city: "Melmaruvathur", state: "Tamil Nadu" },
  { id: 5, name: "Alagappa Chettiar College of Engineering and Technology", city: "Karaikudi", state: "Tamil Nadu" },
  { id: 6, name: "Apollo Engineering College", city: "Chennai", state: "Tamil Nadu" },
  { id: 7, name: "B.S. Abdur Rahman Crescent Institute of Science and Technology", city: "Chennai", state: "Tamil Nadu" },
  { id: 8, name: "Bannari Amman Institute of Technology", city: "Erode", state: "Tamil Nadu" },
  { id: 9, name: "Bharath Institute of Higher Education and Research", city: "Chennai", state: "Tamil Nadu" },
  { id: 10, name: "Bharathiar University", city: "Coimbatore", state: "Tamil Nadu" },
  { id: 11, name: "B.I.T. Campus", city: "Salem", state: "Tamil Nadu" },
  { id: 12, name: "Chennai Institute of Technology", city: "Chennai", state: "Tamil Nadu" },
  { id: 13, name: "Chettinad Academy of Research and Education", city: "Kelambakkam", state: "Tamil Nadu" },
  { id: 14, name: "Coimbatore Institute of Technology", city: "Coimbatore", state: "Tamil Nadu" },
  { id: 15, name: "Dr. Mahalingam College of Engineering and Technology", city: "Pollachi", state: "Tamil Nadu" },
  { id: 16, name: "Easwari Engineering College", city: "Chennai", state: "Tamil Nadu" },
  { id: 17, name: "Erode Sengunthar Engineering College", city: "Erode", state: "Tamil Nadu" },
  { id: 18, name: "Hindustan Institute of Technology and Science", city: "Chennai", state: "Tamil Nadu" },
  { id: 19, name: "Jaya Engineering College", city: "Chennai", state: "Tamil Nadu" },
  { id: 20, name: "Karpagam Academy of Higher Education", city: "Coimbatore", state: "Tamil Nadu" },
  { id: 21, name: "Karpagam University", city: "Coimbatore", state: "Tamil Nadu" },
  { id: 22, name: "Kingston Engineering College", city: "Vellore", state: "Tamil Nadu" },
  { id: 23, name: "Kongu Engineering College", city: "Erode", state: "Tamil Nadu" },
  { id: 24, name: "K. Ramakrishnan College of Engineering", city: "Trichy", state: "Tamil Nadu" },
  { id: 25, name: "Madras Institute of Technology", city: "Chennai", state: "Tamil Nadu" },
  { id: 26, name: "Mepco Schlenk Engineering College", city: "Sivakasi", state: "Tamil Nadu" },
  { id: 27, name: "Meenakshi Academy of Higher Education and Research", city: "Chennai", state: "Tamil Nadu" },
  { id: 28, name: "National Institute of Technology, Trichy", city: "Trichy", state: "Tamil Nadu" },
  { id: 29, name: "National Institute of Technology, Tirunelveli", city: "Tirunelveli", state: "Tamil Nadu" },
  { id: 30, name: "PSG College of Technology", city: "Coimbatore", state: "Tamil Nadu" },
  { id: 31, name: "Sona College of Technology", city: "Salem", state: "Tamil Nadu" },
  { id: 32, name: "St. Joseph's College of Engineering", city: "Chennai", state: "Tamil Nadu" },
  { id: 33, name: "Thiagarajar College of Engineering", city: "Madurai", state: "Tamil Nadu" },
  { id: 34, name: "Vellore Institute of Technology", city: "Vellore", state: "Tamil Nadu" },
];

export const getTrainingColleges = async () => {
  // Simulate API call - in production, can fetch from backend
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(TAMIL_NADU_TRAINING_COLLEGES);
    }, 100);
  });
};

export const searchTrainingColleges = (query) => {
  if (!query || query.trim().length === 0) {
    return TAMIL_NADU_TRAINING_COLLEGES;
  }

  const lowerQuery = query.toLowerCase();
  return TAMIL_NADU_TRAINING_COLLEGES.filter((college) =>
    college.name.toLowerCase().includes(lowerQuery) ||
    college.city.toLowerCase().includes(lowerQuery)
  );
};

export default { getTrainingColleges, searchTrainingColleges };
