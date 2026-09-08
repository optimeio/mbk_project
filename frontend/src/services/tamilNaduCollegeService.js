/**
 * Tamil Nadu colleges database service with search functionality
 */

export const TAMIL_NADU_COLLEGES = [
  { id: "ac_tech_cbe", name: "Anna University College of Technology, Coimbatore", city: "Coimbatore", district: "Coimbatore" },
  { id: "ac_tech_che", name: "Anna University College of Technology, Chennai", city: "Chennai", district: "Chennai" },
  { id: "iit_m", name: "Indian Institute of Technology Madras", city: "Chennai", district: "Chennai" },
  { id: "iit_t", name: "Indian Institute of Technology Tirupati", city: "Tirupati", district: "Chittoor" },
  { id: "mit_cbe", name: "Manipal Institute of Technology, Coimbatore", city: "Coimbatore", district: "Coimbatore" },
  { id: "srm_se", name: "SRM Institute of Science and Technology", city: "Kancheepuram", district: "Kancheepuram" },
  { id: "vit_ve", name: "Vellore Institute of Technology", city: "Vellore", district: "Vellore" },
  { id: "anna_uni", name: "Anna University, Chennai", city: "Chennai", district: "Chennai" },
  { id: "aastu", name: "AAA School of Technology", city: "Tiruppur", district: "Tiruppur" },
  { id: "kmit_cbe", name: "KMG Institute of Technology", city: "Coimbatore", district: "Coimbatore" },
  { id: "rkm_engg", name: "R.K.M. Engineering College", city: "Thiruvallur", district: "Thiruvallur" },
  { id: "psg_tech", name: "PSG College of Technology", city: "Coimbatore", district: "Coimbatore" },
  { id: "nit_tri", name: "National Institute of Technology, Tiruchirapalli", city: "Tiruchirapalli", district: "Tiruchirapalli" },
  { id: "ssn_cce", name: "SSN College of Engineering", city: "Kancheepuram", district: "Kancheepuram" },
  { id: "cit_cbe", name: "Coimbatore Institute of Technology", city: "Coimbatore", district: "Coimbatore" },
  { id: "beta_cbe", name: "Beta Engineering College", city: "Coimbatore", district: "Coimbatore" },
  { id: "saranathan", name: "Saranathan College of Engineering", city: "Tiruchirappalli", district: "Tiruchirappalli" },
  { id: "karpagam_engg", name: "Karpagam Institute of Technology", city: "Coimbatore", district: "Coimbatore" },
  { id: "bannari_engg", name: "Bannari Amman Institute of Technology", city: "Sathyamangalam", district: "Erode" },
  { id: "jeppiaar_engg", name: "Jeppiaar Engineering College", city: "Chennai", district: "Chennai" },
  { id: "st_josephs", name: "St. Joseph's College of Engineering", city: "Chennai", district: "Chennai" },
  { id: "ece_mdl", name: "Electronics and Communication Engineering College", city: "Madurai", district: "Madurai" },
  { id: "kmea_engg", name: "KMEA Engineering College", city: "Aluva", district: "Ernakulam" },
  { id: "vaagdevi", name: "Vaagdevi College of Engineering", city: "Tiruppur", district: "Tiruppur" },
  { id: "vel_engg", name: "VEL Tech High Tech Dr. Rangarajan Sakunthala Engineering College", city: "Avadi", district: "Avadi" },
];

/**
 * Get all Tamil Nadu colleges
 */
export const getAllColleges = () => TAMIL_NADU_COLLEGES;

/**
 * Filter colleges based on search query
 */
export const filterColleges = (query = "") => {
  const lowerQuery = query.toLowerCase().trim();
  if (!lowerQuery) return TAMIL_NADU_COLLEGES;
  
  return TAMIL_NADU_COLLEGES.filter(
    (college) =>
      college.name.toLowerCase().includes(lowerQuery) ||
      college.city.toLowerCase().includes(lowerQuery) ||
      college.district.toLowerCase().includes(lowerQuery)
  );
};

/**
 * Get college by ID
 */
export const getCollegeById = (collegeId) => {
  return TAMIL_NADU_COLLEGES.find((c) => c.id === collegeId);
};

/**
 * Get colleges by district
 */
export const getCollegesByDistrict = (district) => {
  return TAMIL_NADU_COLLEGES.filter(
    (c) => c.district.toLowerCase() === district.toLowerCase()
  );
};

/**
 * Get unique districts from colleges
 */
export const getAllDistricts = () => {
  const districts = new Set(TAMIL_NADU_COLLEGES.map((c) => c.district));
  return Array.from(districts).sort();
};
