# MBK CarrierZ Platform - Codebase Exploration Summary

## 1. TRAINER REGISTRATION & MANAGEMENT STRUCTURE

### Backend Controllers
- **[backend/controllers/trainerController.mjs](backend/controllers/trainerController.mjs)**
  - `registerTrainer()` - Creates new trainer record with validation
  - `getTrainerProfile()` - Fetches trainer profile and recent uploads
  - `getAllTrainers()` - Admin endpoint for paginated trainer list with search
  - Creates Google Drive folder structure automatically on registration

### Backend Routes
- **[backend/routes/trainerRoutes.js](backend/routes/trainerRoutes.js)** - Main trainer registration/management routes
  - POST `/api/trainers` - Register new trainer
  - GET `/api/trainers/:trainerId` - Fetch trainer profile
  - Handles NDA agreement generation and PDF upload to Google Drive
  - Manages trainer document verification workflow
  - Multi-step registration process (Steps 1-6)

- **[backend/routes/adminTrainerRoutes.js](backend/routes/adminTrainerRoutes.js)** - Admin approval/rejection
  - POST `/api/admin/trainers/approve/:id` - Approve trainer (sets status=APPROVED, registrationStatus=approved)
  - POST `/api/admin/trainers/reject/:id` - Reject trainer
  - Auto-creates Stream Chat channel between admin and trainer on approval
  - Sends login credentials email

### Backend Models
- **[backend/models/Trainer.mjs](backend/models/Trainer.mjs)** - Core trainer schema
  - Fields: firstName, lastName, email (unique), phone (unique), qualifications[]
  - **Registration Status**: 'pending' | 'approved' | 'rejected'
  - **Verification Status**: 'unverified' | 'verified'
  - **Colleges Array**: [{ collegeId, collegeName, googleDriveFolderId, assignedDate, status }]
  - **Documents**: profileImage, documents[], googleDriveFolderId
  - **Registration Steps**: Tracks current step (1-6) in multi-step process
  - Includes: lastLoginDate, createdAt, updatedAt, agreementAccepted, ndaAgreementPdf

- **[backend/models/College.mjs](backend/models/College.mjs)** - College information
  - Fields: name (unique), code (unique), city, state, country, totalTrainers, trainingDays (default: 12)
  - adminNotes, isActive (default: true)

- **[backend/models/TrainerAssignment.js](backend/models/TrainerAssignment.js)**
  - Links trainers to colleges with assignments
  - Fields: trainerName, trainer_id, collegeName, batchName, active (bool)

- **[backend/models/TrainerDocument.js](backend/models/TrainerDocument.js)**
  - Stores document metadata for trainer uploads
  - Fields: trainerId, documentType, fileName, filePath, driveFileId, verificationStatus

---

## 2. GOOGLE DRIVE INTEGRATION

### Core Services
- **[backend/services/googleDriveService.js](backend/services/googleDriveService.js)** - Low-level Google Drive operations
  - **Authentication Modes**: 
    - Service Account (preferred)
    - OAuth2 (client_id, client_secret, refresh_token)
  - **Key Functions**:
    - `uploadToDrive()` - Upload files to Drive with retry logic
    - `uploadToDriveWithRetry()` - Upload with automatic retry on failure
    - `deleteFromDrive()` - Delete files from Drive
    - `ensureDriveFolder()` - Create folders if don't exist
    - `listDriveFolderChildren()` - List folder contents
    - `mergeDuplicateDriveFolders()` - Merge duplicate folders
    - `cleanupDuplicateDriveFilesByName()` - Remove duplicate files

- **[backend/modules/drive/driveGateway.js](backend/modules/drive/driveGateway.js)** - Unified Drive access point
  - Re-exports functions from googleDriveService and hierarchy services
  - Provides single module access point for all Drive operations

- **[backend/modules/drive/driveFolderResolver.js](backend/modules/drive/driveFolderResolver.js)** - Folder structure management
  - Defines day-based subfolders: DRIVE_DAY_SUBFOLDERS
  - Resolves folder paths for training content

### Folder Structure Logic
```
NM Trainers/
├── {TrainerName}/
│   ├── documents/
│   │   ├── ProfilePicture.{jpg|png}
│   │   ├── NDA-Form.pdf
│   │   └── [other documents]
│   └── {CollegeName}/
│       ├── Day_1/
│       │   ├── attendance/
│       │   ├── geo_tag/
│       │   └── videos/
│       ├── Day_2/
│       ├── ... (Days 3-12)
└── {TrainerName2}/
    └── [similar structure]
```

### Google Drive Integration Features
- **Automatic Folder Creation**: When trainer registers, folder structure auto-created
- **College Hierarchy**: When trainer assigned to college, college-specific folder created
- **Day-Based Subfolders**: Auto-created for training days (1-12 by default)
- **NDA PDF Generation**: NDA agreement automatically generated and uploaded
- **Document Upload**: Trainer documents uploaded with metadata tracking
- **Error Logging**: Failed uploads logged to ErrorLog collection with retry capability

### Related Models
- **[backend/models/ScheduleDocument.js](backend/models/ScheduleDocument.js)** - Document metadata for schedules
- **[backend/services/trainingFolderService.js](backend/services/trainingFolderService.js)** - Training folder creation/management

---

## 3. FRONTEND FORMS FOR TRAINER MANAGEMENT

### Trainer Registration
- **[frontend/src/features/auth/pages/TrainerRegistration.jsx](frontend/src/features/auth/pages/TrainerRegistration.jsx)** - Multi-step trainer registration
  - **Multi-Step Flow**:
    - Step 1: Email verification via OTP
    - Step 2: Basic info (firstName, lastName, email, phone)
    - Step 3: College & course selection with dropdown
    - Step 4: Document upload (qualifications, resume)
    - Step 5: Selfie capture
    - Step 6: NDA agreement with signature
  - **Features**:
    - Session storage for progress tracking (TRAINER_SIGNUP_SESSION_KEY)
    - OTP verification integration
    - Selfie capture component
    - Digital signature capture
    - NDA template display from backend
    - Document upload with validation
    - Error handling and retry logic

- **[frontend/src/features/auth/pages/TrainerSignup.jsx](frontend/src/features/auth/pages/TrainerSignup.jsx)** - Initial signup form
  - Basic trainer information collection
  - Email verification
  - Password setup

### College Management Forms
- **[frontend/src/portals/spoc/CollegeDetails.jsx](frontend/src/portals/spoc/CollegeDetails.jsx)** - College details with trainer assignment
  - Displays college information
  - Shows assigned trainers
  - Day-based schedule management with drag-and-drop
  - Trainer assignment modal
  - Course details and progress tracking
  - Manual attendance entry
  - Verification workflow (Approved/Pending)

### File Upload Component
- **[frontend/src/app/trainer/student-attendance/components/FileUploadCard.jsx](frontend/src/app/trainer/student-attendance/components/FileUploadCard.jsx)** - Reusable file upload card
  - **Features**:
    - File size validation (configurable max)
    - File type validation (accept patterns)
    - Image preview for images
    - Success/error/loading states
    - File icon display (Excel, PDF, etc)
    - Drag-and-drop support
    - Reset functionality

- **[frontend/src/app/trainer/student-attendance/page.jsx](frontend/src/app/trainer/student-attendance/page.jsx)** - Attendance upload page
  - Excel sheet upload
  - Live attendance evidence upload (image/PDF)
  - GPS-tagged photo upload
  - Form data construction with FormData API
  - Real-time validation and user feedback

---

## 4. DROPDOWN IMPLEMENTATIONS

### Trainer Dropdown
- **[frontend/src/services/trainerService.js](frontend/src/services/trainerService.js)** - Trainer data fetching
  - `getTrainers()` - Get all trainers
  - `fetchTrainersPage()` - Paginated trainer list with search
  - Normalizes varying backend response shapes
  - Returns: { data, total, page, limit, totalPages, hasNextPage, hasPrevPage }

### College Dropdown
- **[frontend/src/services/collegeService.js](frontend/src/services/collegeService.js)** - College data fetching
  - `getColleges()` - Get all colleges for logged-in company
  - `createCollege()` - Create new college
  - `updateCollege()` - Update college
  - `deleteCollege()` - Delete college
  - `assignTrainers()` - Assign trainers with schedules

### Training Colleges Dropdown
- **[frontend/src/services/trainingCollegeService.js](frontend/src/services/trainingCollegeService.js)** - Training-specific college data

### Course Dropdown
- **[frontend/src/services/courseService.js](frontend/src/services/courseService.js)** - Course data fetching
  - `getTrainingCourses()` - Fetch available courses
  - Supports filtering and pagination

### City Dropdown
- **[frontend/src/services/cityService.js](frontend/src/services/cityService.js)** - City selection
  - Integrates with City model
  - Used in trainer registration for location selection

---

## 5. FILE UPLOAD HANDLING

### Backend Upload Routes
- **[backend/routes/uploadRoutes.mjs](backend/routes/uploadRoutes.mjs)** - Media upload endpoint
  - POST `/upload` - Upload files via Cloudinary
  - Uses multer for file parsing
  - CloudinaryStorage for cloud storage

### Upload Controller
- **[backend/controllers/mediaController.mjs](backend/controllers/mediaController.mjs)** - Upload handling
  - `uploadMedia()` - Main upload handler
  - Supports: images, videos, audio, documents
  - Returns: { type, fileUrl, name, size, mimeType, duration }
  - Cloudinary integration for cloud storage

### Training Upload Service
- **[backend/services/trainingUploadService.js](backend/services/trainingUploadService.js)** - Training file uploads
  - **File Type Rules**:
    - Attendance: .pdf, .xls, .xlsx
    - Geo: .jpg, .jpeg, .png, .mp4
  - **Validation**: File extension and MIME type checking
  - **Google Drive Upload**: Uploads to appropriate day folder
  - **Deduplication**: Removes duplicate files from Drive
  - **Error Logging**: Tracks upload failures with metadata
  - **Role-Based Access**: Uses trainingPlatformRoles for permissions

### Attendance Upload Routes
- **[backend/routes/attendanceRoutes.js](backend/routes/attendanceRoutes.js)**
  - Integrates Google Drive upload with attendance records
  - Creates folder hierarchy on upload
  - Uploads with retry logic
  - Manages day-based subfolders

---

## 6. FOLDER STRUCTURE & HIERARCHY LOGIC

### Hierarchy Services
- **[backend/services/googleDriveTrainingHierarchyService.js](backend/services/googleDriveTrainingHierarchyService.js)**
  - `ensureTrainingRootFolder()` - Creates/ensures root "NM Training" folder
  - `ensureCompanyHierarchy()` - Creates company-level folders
  - `ensureCourseHierarchy()` - Creates course-level folders
  - `ensureCollegeHierarchy()` - Creates college-level folders
  - `ensureDepartmentHierarchy()` - Creates department subfolders
  - `createFullStructure()` - Creates complete hierarchy tree
  - `toDepartmentDayFolders()` - Maps departments to day folders

- **[backend/services/googleDriveTrainerDocumentHierarchyService.js](backend/services/googleDriveTrainerDocumentHierarchyService.js)**
  - `ensureTrainerDocumentHierarchy()` - Creates trainer document folder structure
  - `ensureTrainerCollegeHierarchy()` - Creates trainer→college subfolder
  - Syncs existing documents from uploads

### Trainer Document Workflow
- **[frontend/src/utils/trainerDocumentWorkflow.js](frontend/src/utils/trainerDocumentWorkflow.js)**
  - `evaluateTrainerDocumentWorkflow()` - Evaluates document completion status
  - `hasCompletedTrainerDetails()` - Checks if all required documents present
  - `resolveTrainerRegistrationStatus()` - Determines current registration state
  - `resolveTrainerResumeStep()` - Gets current step in resume process

### Training Folder Service
- **[backend/services/trainingFolderService.js](backend/services/trainingFolderService.js)**
  - `ensureScheduleFolderState()` - Creates folder structure for schedule
  - `buildDriveFolderLink()` - Generates shareable Drive links
  - Manages day-based folder creation

---

## 7. RELATED SUPPORTING SERVICES

### Cache Service
- **[backend/services/cacheService.js](backend/services/cacheService.js)**
  - Cache keys for:
    - `trainerList(page, filters)` - Trainer list cache
    - `trainerProfile(id)` - Individual trainer profile cache
    - `collegeList(companyId)` - College list cache
    - `scheduleList(trainerId, month)` - Trainer schedules cache
  - Used for performance optimization

### Authentication Services
- **[backend/services/auth/authLoginService.js](backend/services/auth/authLoginService.js)**
  - Trainer login validation
  - Checks email verification and approval status
  - Handles "trainer pending approval" message

- **[backend/services/auth/authEmailOtpService.js](backend/services/auth/authEmailOtpService.js)**
  - OTP types: TRAINER_REGISTRATION

### Notification Service
- **[backend/controllers/notificationController.js](backend/controllers/notificationController.js)**
  - Google Chat notifications for alerts
  - Multi-channel notifications (email, SMS, chat)
  - Role-based notification routing (Trainer, Admin, etc)

### Chat Service
- **[backend/services/streamChatService.js](backend/services/streamChatService.js)**
  - `autoCreateTrainerAdminChannels()` - Auto-creates chat channels
  - Called on trainer approval
  - Creates communication channel between trainer and approving admin

### Email Service
- **[backend/utils/emailService.js](backend/utils/emailService.js)**
  - `sendTrainerLogin()` - Sends login credentials to newly approved trainer
  - `sendAccountVerificationSuccessEmail()` - Verification success notification
  - `sendDocumentRejectionEmail()` - Rejection notifications

---

## 8. ASSIGNMENT & MANAGEMENT FLOW

### Trainer Assignment to College
**Process Flow** (from [backend/routes/collegeRoutes.js](backend/routes/collegeRoutes.js)):

1. Admin/SPOC calls: `POST /api/colleges/:id/assign-trainers`
2. Backend:
   - Validates college exists and user has access
   - For each trainer in request:
     - Adds trainer to college.trainers array
     - Updates Trainer.collegeId field
     - Creates TrainerAssignment record with names
     - **Auto-creates Google Drive hierarchy**:
     ```
     NM Trainers/{TrainerCode}/{CollegeName}/
     ├── Day_1 → Day_12/
     │   ├── attendance/
     │   ├── geo_tag/
     │   └── videos/
     ```
   - Invalidates trainer schedule caches
   - Sends notifications to trainer
   - Auto-creates Stream Chat channel

### Trainer Guard Component
- **[frontend/src/components/trainer/TrainerCollegeGuard.jsx](frontend/src/components/trainer/TrainerCollegeGuard.jsx)**
  - Checks if trainer has college assignment
  - Displays loading state while verifying
  - Shows error if assignment missing
  - Prevents access to portal until assigned

---

## 9. KEY DATA FLOWS

### Trainer Registration Flow
```
Frontend (TrainerRegistration.jsx)
  ↓ Step 1: Email verification
  ↓ POST /api/auth/verify-otp
  ↓ Step 2-5: Basic info, documents, selfie
  ↓ Step 6: NDA signature
  ↓ POST /api/trainers/submit-final
  ↓
Backend (trainerController.mjs)
  ├─ Validate all fields
  ├─ Generate NDA PDF
  ├─ Create Google Drive hierarchy
  │   └─ NM Trainers/{TrainerName}/documents/
  ├─ Upload NDA PDF and documents
  ├─ Create Trainer record with status='pending'
  └─ Return registration success
  ↓
Admin Dashboard
  └─ Admin approves/rejects (adminTrainerRoutes.js)
     ├─ Sets status='approved'
     ├─ Auto-creates Stream Chat channel
     └─ Sends login credentials email
```

### College Assignment Flow
```
Admin Portal (CollegeDetails.jsx or similar)
  ↓ Select trainers and schedules
  ↓ POST /api/colleges/:id/assign-trainers
  ↓
Backend (collegeRoutes.js)
  ├─ Validate college and trainer
  ├─ Add trainer to college.trainers[]
  ├─ Create TrainerAssignment record
  ├─ Auto-create Drive folders:
  │   └─ NM Trainers/{TrainerCode}/{CollegeName}/Day_1-12/...
  ├─ Invalidate caches
  └─ Notify trainer
  ↓
Trainer Portal
  └─ TrainerCollegeGuard checks assignment
     └─ Displays college portal if assigned
```

### File Upload Flow
```
Frontend (student-attendance/page.jsx)
  ↓ User selects file (Excel or image)
  ↓ FileUploadCard validates size/type
  ↓ FormData with file + trainer_id + metadata
  ↓ POST /student-activities/attendance/submit
  ↓
Backend (trainingUploadService.js)
  ├─ Validate file type (extension + MIME)
  ├─ Get trainer details
  ├─ Resolve Drive folder path:
  │   └─ NM Trainers/{TrainerCode}/{CollegeName}/Day_X/{fileType}/
  ├─ Upload to Google Drive
  ├─ Create ScheduleDocument record
  ├─ Log upload (success or error)
  └─ Return result to frontend
  ↓
Frontend
  └─ Display success/error toast
```

---

## 10. KEY ENVIRONMENT VARIABLES & CONFIGURATION

### Google Drive Configuration
```env
GOOGLE_DRIVE_AUTH_MODE=service_account|oauth2
GOOGLE_DRIVE_SERVICE_ACCOUNT_KEY_PATH=path/to/service-account.json
GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON={json_string}
GOOGLE_DRIVE_FOLDER_ID=root_training_folder_id
GOOGLE_DRIVE_TRAINER_DOCUMENTS_FOLDER_ID=trainer_docs_folder_id
GOOGLE_DRIVE_CLIENT_ID=oauth_client_id
GOOGLE_DRIVE_CLIENT_SECRET=oauth_secret
GOOGLE_DRIVE_REFRESH_TOKEN=oauth_refresh_token
GOOGLE_DRIVE_IMPERSONATE_USER_EMAIL=email@domain.com
```

### Cloud Storage (Cloudinary)
```env
CLOUDINARY_CLOUD_NAME=djayl5qxw
CLOUDINARY_API_KEY=api_key
CLOUDINARY_API_SECRET=api_secret
```

---

## 11. DATABASE MODELS OVERVIEW

| Model | Purpose | Key Fields |
|-------|---------|-----------|
| Trainer | Trainer profile & registration | firstName, lastName, email, phone, qualifications, registrationStatus, colleges[], googleDriveFolderId |
| College | College information | name, code, city, state, country, totalTrainers, trainingDays |
| TrainerAssignment | Links trainers to colleges | trainerName, trainer_id, collegeName, batchName, active |
| TrainerDocument | Document metadata | trainerId, documentType, fileName, driveFileId, verificationStatus |
| Schedule | Training schedule | trainerId, collegeId, dayOfWeek, startTime, endTime |
| Attendance | Attendance records | trainerId, scheduleId, collegeId, status, verificationStatus |
| ScheduleDocument | Documents for schedules | scheduleId, documentType, fileUrl, driveFileId |
| City | City lookup | name (used for trainer location) |
| NdaTemplate | NDA agreement template | title, content, acceptanceConditions, updatedBy |

---

## 12. API ENDPOINTS SUMMARY

### Trainer Management
- `POST /api/trainers` - Register new trainer
- `GET /api/trainers` - List trainers (paginated)
- `GET /api/trainers/:id` - Get trainer details
- `PUT /api/trainers/:id` - Update trainer
- `DELETE /api/trainers/:id` - Delete trainer

### Admin Functions
- `POST /api/admin/trainers/approve/:id` - Approve trainer
- `POST /api/admin/trainers/reject/:id` - Reject trainer

### College Management
- `GET /api/colleges` - List colleges
- `POST /api/colleges` - Create college
- `GET /api/colleges/:id` - Get college details
- `PUT /api/colleges/:id` - Update college
- `DELETE /api/colleges/:id` - Delete college
- `POST /api/colleges/:id/assign-trainers` - Assign trainers to college

### File Uploads
- `POST /upload` - Upload media (Cloudinary)
- `POST /student-activities/attendance/submit` - Submit attendance with files
- `POST /training-uploads` - Upload training materials

### Other
- `GET /cities` - List cities for registration
- `GET /training-colleges` - List training colleges
- `GET /training-courses` - List courses (pcb, iot, nbfc, etc)

---

## 13. CURRENT GAPS & OBSERVATIONS

✅ **Existing Functionality**:
- Multi-step trainer registration with document upload
- Google Drive integration for document storage
- College assignment with automatic folder creation
- NDA agreement generation and signature capture
- File upload with validation
- Role-based access control
- Admin approval workflow

⚠️ **Areas for Enhancement** (per task requirements):
- Trainer dropdown may need optimization for large datasets
- College dropdown could benefit from search/filtering
- Course dropdown needs standardized options (pcb, iot, surface modelling, etc)
- Auto-save to Google Drive for trainer details (in progress)
- Folder structure sync on every action
- Responsive forms across all devices
- Error handling improvements

---

## 14. FILE INDEX BY RESPONSIBILITY

### Backend
- Controllers: `backend/controllers/trainerController.mjs`, `mediaController.mjs`
- Routes: `backend/routes/trainerRoutes.js`, `collegeRoutes.js`, `adminTrainerRoutes.js`, `uploadRoutes.mjs`
- Services: `googleDriveService.js`, `trainingUploadService.js`, `trainingFolderService.js`
- Models: `Trainer.mjs`, `College.mjs`, `TrainerAssignment.js`, `TrainerDocument.js`
- Utilities: `emailService.js`, `trainerDocumentWorkflow.js`, `ndaTemplate.js`

### Frontend
- Pages: `TrainerRegistration.jsx`, `TrainerSignup.jsx`, `CollegeDetails.jsx`
- Components: `FileUploadCard.jsx`, `TrainerCollegeGuard.jsx`, `SelfieCapture.jsx`
- Services: `trainerService.js`, `collegeService.js`, `courseService.js`, `cityService.js`
- Portals: `trainer/`, `spoc/`, `admin/`

