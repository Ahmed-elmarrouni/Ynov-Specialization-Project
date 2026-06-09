import { useRouteError, useNavigate } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';

export default function ErrorPage() {
    const error = useRouteError();
    const navigate = useNavigate();

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 text-center">
            <AlertCircle className="w-16 h-16 text-error mb-4" />
            <h1 className="text-3xl font-bold text-secondary mb-2">Oops! Something went wrong.</h1>
            <p className="text-text-muted mb-6">{error.statusText || error.message}</p>
            <button
                onClick={() => navigate('/')}
                className="px-6 py-2 bg-primary text-white rounded-lg font-bold cursor-pointer"
            >
                Return to Dashboard
            </button>
        </div>
    );
}