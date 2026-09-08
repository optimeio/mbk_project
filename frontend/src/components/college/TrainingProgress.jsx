const TrainingProgress = ({ days }) => {
  const completed = days.filter(d => d.status === "Completed").length;
  const percent = days.length ? Math.round((completed / days.length) * 100) : 0;

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm">
      <h3 className="text-lg font-semibold mb-3">Training Progress</h3>

      <div className="w-full bg-gray-200 rounded-full h-4">
        <div
          className="bg-indigo-600 h-4 rounded-full transition-all"
          style={{ width: `${percent}%` }}
        />
      </div>

      <p className="text-sm text-gray-600 mt-3">
        {completed} / {days.length} days completed
      </p>
    </div>
  );
};

export default TrainingProgress;
