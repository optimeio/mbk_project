import Link from 'next/link';


const Unauthorized = () => {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8 text-center">
                <h2 className="mt-6 text-3xl font-extrabold text-gray-900">Unauthorized Access</h2>
                <p className="mt-2 text-sm text-gray-600">
                    You do not have permission to view this page.
                </p>
                <div className="mt-5">
                    <Link href="/redirect" className="text-indigo-600 hover:text-indigo-500 font-medium">
                        Go back to Dashboard
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default Unauthorized;
