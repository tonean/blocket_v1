import { createRoot } from 'react-dom/client';
import { requestExpandedMode } from '@devvit/client';
import '../index.css';

const Splash = () => {
  const handleStartDesigning = async (event: React.MouseEvent<HTMLButtonElement>) => {
    try {
      // Use requestExpandedMode to navigate to the 'game' entrypoint
      // This opens the game in an expanded modal view
      await requestExpandedMode(event.nativeEvent, 'game');
    } catch (error) {
      console.error('Failed to open game:', error);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-orange-50 to-orange-100">
      <div className="text-center space-y-6 p-8">
        <img 
          src="thumbnail.png" 
          alt="Room Design Game" 
          className="w-full max-w-2xl mx-auto rounded-lg shadow-xl"
        />
        <button
          onClick={handleStartDesigning}
          className="px-8 py-4 bg-orange-600 text-white text-lg font-bold rounded-lg hover:bg-orange-700 transition-colors shadow-lg"
        >
          Start Designing
        </button>
      </div>
    </div>
  );
};

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(<Splash />);
}
