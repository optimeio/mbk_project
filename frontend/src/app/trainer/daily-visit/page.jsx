// File: c:/mbk_project/frontend/src/app/trainer/daily-visit/page.jsx

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

// Simple step indicator component
const Step = ({ number, title, active, completed }) => {
  const base = 'flex items-center gap-2 p-2 rounded-md';
  const activeStyle = active ? 'bg-primary-600 text-white' : '';
  const completedStyle = completed ? 'bg-success-600 text-white' : '';
  const style = `${base} ${activeStyle} ${completedStyle}`;
  return (
    <div className={style}>
      <span className="font-mono font-bold">{number}.</span>
      <span>{title}</span>
    </div>
  );
};

// Placeholder components for each workflow step (removed)



const VerifyLocation = ({ onNext }) => {
  const [status, setStatus] = useState('checking');
  useEffect(() => {
    if (!navigator.geolocation) {
      setStatus('unsupported');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        // In a real app, verify against allowed radius from backend
        setStatus('ok');
        setTimeout(onNext, 800);
      },
      () => setStatus('error')
    );




  }, []);
  return (
    <div className="flex flex-col items-center justify-center h-full">
      <h2 className="text-xl font-semibold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-600">Step 1 – Verify Current GPS Location</h2>
      {status === 'checking' && <p>Retrieving location…</p>}
      {status === 'ok' && <p className="text-success-600">Location verified.</p>}
      {status === 'error' && <p className="text-danger-600">Unable to get GPS.</p>}
      {status === 'unsupported' && <p className="text-warning-600">Geolocation not supported.</p>}
    </div>
  );
};


const ClockIn = ({ onNext }) => {
  const [image, setImage] = useState(null);
  const capture = async () => {
    // Placeholder – in a real app open camera & capture photo
    setImage('/placeholder-clockin.png');
    setTimeout(onNext, 800);
  };
  return (
    <div className="flex flex-col items-center justify-center h-full">
      <h2 className="text-xl font-semibold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-600">Step 2 – Clock‑In (Geo‑Tagged Image)</h2>
      {image ? (
        <Image src={image} alt="Clock‑In" width={200} height={200} />
      ) : (
        <button onClick={capture} className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition">
          Capture Image
        </button>
      )}
    </div>
  );
};

const StudentAttendance = ({ onNext }) => (
  <div className="flex flex-col items-center justify-center h-full">
    <h2 className="text-xl font-semibold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-600">Step 3 – Student Attendance</h2>
    <p>Upload attendance sheet or capture a photo.</p>
    <button onClick={onNext} className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition">
      Continue
    </button>
  </div>
);

const StudentActivities = ({ onNext }) => (
  <div className="flex flex-col items-center justify-center h-full">
    <h2 className="text-xl font-semibold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-600">Step 4 – Student Activities</h2>
    <p>Record activities for the day.</p>
    <button onClick={onNext} className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition">
      Continue
    </button>
  </div>
);

const ClockOut = ({ onFinish }) => {
  const [image, setImage] = useState(null);
  const capture = () => {
    setImage('/placeholder-clockout.png');
    setTimeout(onFinish, 800);
  };
  return (
    <div className="flex flex-col items-center justify-center h-full">
      <h2 className="text-xl font-semibold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-600">Step 5 – Clock‑Out (Geo‑Tagged Image)</h2>
      {image ? (
        <Image src={image} alt="Clock‑Out" width={200} height={200} />
      ) : (
        <button onClick={capture} className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition">
          Capture Image
        </button>
      )}
    </div>
  );
};
const Summary = () => (
  <div className="flex flex-col items-center justify-center h-full">
    <h2 className="text-xl font-semibold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-600">Summary</h2>
    <p>All steps completed. Thank you!</p>
    <button onClick={() => window.location.reload()} className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition">Restart</button>
  </div>
);


  

export default function DailyVisitPage() {
  const router = useRouter();
const steps = [
  { title: 'Verify Current GPS Location', component: VerifyLocation },
  { title: 'Clock‑In (Geo‑Tagged Image)', component: ClockIn },
  { title: 'Student Attendance', component: StudentAttendance },
  { title: 'Student Activities', component: StudentActivities },
  { title: 'Clock‑Out (Geo‑Tagged Image)', component: ClockOut },
  { title: 'Summary', component: Summary },
];
  const [currentStep, setCurrentStep] = useState(0);

  const CurrentComponent = steps[currentStep].component;

  const handleNext = () => setCurrentStep((i) => Math.min(i + 1, steps.length - 1));
  const handleFinish = () => {
    // After completing the workflow, redirect to dashboard or show summary
    router.push('/trainer/dashboard');
  };

  return (
    <div className="min-h-screen bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-gray-900 dark:text-gray-100 p-6">
      <div className="max-w-4xl mx-auto bg-white bg-opacity-30 backdrop-blur-lg rounded-lg shadow-lg overflow-hidden">
        <div className="flex flex-col md:flex-row">
          {/* Sidebar with step list */}
          <aside className="w-full md:w-1/4 bg-gray-50 dark:bg-gray-700 p-4">
            {steps.map((s, idx) => (
              <Step
                key={idx}
                number={idx + 1}
                title={s.title}
                active={idx === currentStep}
                completed={idx < currentStep}
              />
            ))}
          </aside>
          {/* Main content */}
          <main className="flex-1 p-6">
            <CurrentComponent
              onNext={handleNext}
              onFinish={handleFinish}
            />
          </main>
        </div>
      </div>
    </div>
  );
}
